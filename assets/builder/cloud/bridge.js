/* The live canvas bridge's way through Supabase, and Connect Claude's
   lasting connector (below). startBridge makes a session
   (supabase/bridge.sql) with a random key it keeps here and stores
   only as a SHA-256 hash, and gives back the link Claude reads. Then it
   listens for the steps supabase/functions/bridge writes, hands each to
   onCall one at a time and in order, and writes the answer back for the
   function to pass on. It hears steps through Realtime and also looks every
   few seconds, so a dropped message only costs a moment.

   Only a signed-in person starts a session, and only they see or answer
   its steps. Nothing here runs a step: App.js does, on the canvas. */

import { cloudConfig } from "./config.js";
import { getClient } from "./client.js";

var POLL_MS = 4000;

function randomKey() {
  var bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sha256(text) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  });
}

function check(res) {
  if (res && res.error) throw new Error(res.error.message || "The cloud didn't answer. Try again.");
  return res ? res.data : null;
}

/* Steps for session id, heard through Realtime and looked for every few
   seconds, handed to opts.onCall one at a time and in order, each answer
   written back. Returns stop(). */
function listen(sb, id, opts) {
  var channel = null, timer = null, stopped = false;
  var seen = {}, queue = Promise.resolve();
  var status = opts.onStatus || function () {};
  var handle = function (row) {
    if (stopped || !row || seen[row.id] || row.status === "done" || (row.session_id && row.session_id !== id)) return;
    seen[row.id] = true;
    var runIt = function () {
      return Promise.resolve().then(function () { return opts.onCall(row.call || {}); }).catch(function (err) {
        return { ok: false, result: "The canvas couldn't run that step: " + String((err && err.message) || err) };
      }).then(function (result) {
        return sb.from("bridge_calls").update({ result: result }).eq("id", row.id).then(check);
      }).catch(function () { status("An answer couldn't be sent back. Claude will see the step time out."); });
    };
    queue = queue.then(function () {
      if (stopped) return null;
      /* A connector's step runs only in the tab that holds it: one another
         tab has just taken stays for that tab. */
      return Promise.resolve(opts.mine ? opts.mine() : true).then(function (ok) {
        if (!ok || stopped) { delete seen[row.id]; return null; }
        return runIt();
      });
    });
  };
  var look = function () {
    if (stopped) return;
    sb.from("bridge_calls").select("id, call, status").eq("session_id", id).eq("status", "waiting").order("id", { ascending: true }).then(function (res) {
      (check(res) || []).forEach(handle);
    }).catch(function () {});
  };
  channel = sb.channel("bridge:" + id).on("postgres_changes", { event: "INSERT", schema: "public", table: "bridge_calls", filter: "session_id=eq." + id }, function (m) {
    /* A step too big for a Realtime message (a picture) comes without its
       call: read it from the table instead. */
    if (m.new && m.new.call && typeof m.new.call.name === "string") handle(m.new); else look();
  });
  channel.subscribe(function (s) { if (s === "SUBSCRIBED") look(); });
  timer = setInterval(look, POLL_MS);
  return function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    if (channel) sb.removeChannel(channel);
  };
}

function signedIn() {
  var sb = null;
  return getClient().then(function (client) {
    sb = client;
    return sb.auth.getSession();
  }).then(function (res) {
    if (!(res && res.data && res.data.session)) throw new Error("Sign in first: a session is tied to your account.");
    return sb;
  });
}

function sessionRow(fields) {
  var row = {};
  if ("canEdit" in fields) row.can_edit = !!fields.canEdit;
  if ("askFirst" in fields) row.ask_first = !!fields.askFirst;
  if ("paused" in fields) row.paused = !!fields.paused;
  return row;
}

/* opts: { canEdit, askFirst, label, onCall(call) -> result | Promise,
   onStatus(text) }. Resolves { id, link, update(fields), end() }. */
function startBridge(opts) {
  var key = randomKey();
  var sb = null, id = null, stop = null, ended = false;
  return signedIn().then(function (client) {
    sb = client;
    return sha256(key);
  }).then(function (hash) {
    return sb.from("bridge_sessions").insert({ key_hash: hash, can_edit: !!opts.canEdit, ask_first: !!opts.askFirst, label: String(opts.label || "").slice(0, 120) }).select("id").single();
  }).then(function (res) {
    id = check(res).id;
    stop = listen(sb, id, opts);
    return {
      id: id,
      link: cloudConfig().url + "/functions/v1/bridge?s=" + id + "&k=" + key,
      update: function (fields) { return sb.from("bridge_sessions").update(sessionRow(fields)).eq("id", id).then(check); },
      end: function () {
        if (ended) return Promise.resolve();
        ended = true;
        stop();
        return sb.from("bridge_sessions").update({ ended_at: new Date().toISOString() }).eq("id", id).then(check);
      },
    };
  });
}

/* ------------------------------------------------------------ connector */

/* Connect Claude: one lasting session per person, a connector, whose
   address Claude keeps as a custom connector and speaks MCP to (the bridge
   function's /mcp/<id>.<key>). Its key is shown once, when it's made, and
   kept only as a hash. Whichever Builder tab claims it last (attach) runs
   Claude's steps; it says it's still there every 30 seconds and lets go
   when another tab takes over. */
var BEAT_MS = 30000;
var TAB_ID = randomKey().slice(0, 16);

function connectorUrl(id, key) { return cloudConfig().url + "/functions/v1/bridge/mcp/" + id + "." + key; }

/* The person's live connector, or null: { id, created_at, last_call, tab, tab_seen, here }. */
function findConnector() {
  return signedIn().then(function (sb) {
    return sb.from("bridge_sessions").select("id, created_at, last_call, tab, tab_seen, ended_at, connector").eq("connector", true).then(function (res) {
      var live = (check(res) || []).filter(function (r) { return !r.ended_at; })[0] || null;
      return live ? Object.assign({}, live, { here: live.tab === TAB_ID }) : null;
    });
  });
}

/* A new connector, the old one (if any) revoked: { id, url }. The url is
   the only time its key is seen. */
function makeConnector() {
  var key = randomKey(), sb = null;
  return signedIn().then(function (client) {
    sb = client;
    return findConnector();
  }).then(function (old) {
    return old ? sb.from("bridge_sessions").update({ ended_at: new Date().toISOString() }).eq("id", old.id).then(check) : null;
  }).then(function () {
    return sha256(key);
  }).then(function (hash) {
    return sb.from("bridge_sessions").insert({ key_hash: hash, connector: true, can_edit: true, ask_first: false, label: "Claude (connector)" }).select("id").single();
  }).then(function (res) {
    var id = check(res).id;
    return { id: id, url: connectorUrl(id, key) };
  });
}

function revokeConnector(id) {
  return signedIn().then(function (sb) {
    return sb.from("bridge_sessions").update({ ended_at: new Date().toISOString() }).eq("id", id).then(check);
  });
}

/* Claims connector id for this tab and runs its steps.
   opts: { tools, onCall, onStatus, onLost(why) }. Resolves
   { id, update(fields), end() }: end lets go of it without revoking it. */
function attachConnector(id, opts) {
  var sb = null, stop = null, beat = null, done = false;
  var lost = function (why) {
    if (done) return;
    done = true;
    clearInterval(beat);
    if (stop) stop();
    if (opts.onLost) opts.onLost(why);
  };
  return signedIn().then(function (client) {
    sb = client;
    return sb.from("bridge_sessions").update({ tab: TAB_ID, tab_seen: new Date().toISOString(), tools: opts.tools || null, paused: false }).eq("id", id).then(check);
  }).then(function () {
    stop = listen(sb, id, Object.assign({}, opts, {
      mine: function () {
        return sb.from("bridge_sessions").select("id, tab, ended_at").eq("id", id).maybeSingle().then(function (res) {
          var row = check(res);
          if (row && !row.ended_at && row.tab === TAB_ID) return true;
          lost(row && !row.ended_at ? "elsewhere" : "revoked");
          return false;
        }, function () { return true; });
      },
    }));
    beat = setInterval(function () {
      sb.from("bridge_sessions").select("id, tab, ended_at").eq("id", id).maybeSingle().then(function (res) {
        var row = check(res);
        if (!row || row.ended_at) { lost("revoked"); return null; }
        if (row.tab !== TAB_ID) { lost("elsewhere"); return null; }
        return sb.from("bridge_sessions").update({ tab_seen: new Date().toISOString() }).eq("id", id).then(check);
      }).catch(function () {});
    }, BEAT_MS);
    return {
      id: id,
      update: function (fields) { return sb.from("bridge_sessions").update(sessionRow(fields)).eq("id", id).then(check); },
      end: function () {
        if (done) return Promise.resolve();
        done = true;
        clearInterval(beat);
        stop();
        return sb.from("bridge_sessions").select("id, tab").eq("id", id).maybeSingle().then(function (res) {
          var row = check(res);
          return row && row.tab === TAB_ID ? sb.from("bridge_sessions").update({ tab: "", tab_seen: null }).eq("id", id).then(check) : null;
        });
      },
    };
  });
}

export { attachConnector, connectorUrl, findConnector, makeConnector, randomKey, revokeConnector, sha256, startBridge };
