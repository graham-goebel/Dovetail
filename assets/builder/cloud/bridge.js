/* The live canvas bridge's way through Supabase. startBridge makes a
   session (supabase/bridge.sql) with a random key it keeps here and stores
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

/* opts: { canEdit, askFirst, label, onCall(call) -> result | Promise,
   onStatus(text) }. Resolves { id, link, update(fields), end() }. */
function startBridge(opts) {
  var key = randomKey();
  var sb = null, id = null, channel = null, timer = null, ended = false;
  var seen = {}, queue = Promise.resolve();
  var status = opts.onStatus || function () {};

  var handle = function (row) {
    if (ended || !row || seen[row.id] || row.status === "done" || (row.session_id && row.session_id !== id)) return;
    seen[row.id] = true;
    queue = queue.then(function () {
      if (ended) return null;
      return Promise.resolve().then(function () { return opts.onCall(row.call || {}); }).catch(function (err) {
        return { ok: false, result: "The canvas couldn't run that step: " + String((err && err.message) || err) };
      }).then(function (result) {
        return sb.from("bridge_calls").update({ result: result }).eq("id", row.id).then(check);
      }).catch(function () { status("An answer couldn't be sent back. Claude will see the step time out."); });
    });
  };
  var look = function () {
    if (ended) return;
    sb.from("bridge_calls").select("id, call, status").eq("session_id", id).eq("status", "waiting").order("id", { ascending: true }).then(function (res) {
      (check(res) || []).forEach(handle);
    }).catch(function () {});
  };

  return getClient().then(function (client) {
    sb = client;
    return sb.auth.getSession();
  }).then(function (res) {
    if (!(res && res.data && res.data.session)) throw new Error("Sign in first: a session is tied to your account.");
    return sha256(key);
  }).then(function (hash) {
    return sb.from("bridge_sessions").insert({ key_hash: hash, can_edit: !!opts.canEdit, ask_first: !!opts.askFirst, label: String(opts.label || "").slice(0, 120) }).select("id").single();
  }).then(function (res) {
    id = check(res).id;
    channel = sb.channel("bridge:" + id).on("postgres_changes", { event: "INSERT", schema: "public", table: "bridge_calls", filter: "session_id=eq." + id }, function (m) { handle(m.new); });
    channel.subscribe(function (s) { if (s === "SUBSCRIBED") look(); });
    timer = setInterval(look, POLL_MS);
    return {
      id: id,
      link: cloudConfig().url + "/functions/v1/bridge?s=" + id + "&k=" + key,
      update: function (fields) {
        var row = {};
        if ("canEdit" in fields) row.can_edit = !!fields.canEdit;
        if ("askFirst" in fields) row.ask_first = !!fields.askFirst;
        if ("paused" in fields) row.paused = !!fields.paused;
        return sb.from("bridge_sessions").update(row).eq("id", id).then(check);
      },
      end: function () {
        if (ended) return Promise.resolve();
        ended = true;
        clearInterval(timer);
        if (channel) sb.removeChannel(channel);
        return sb.from("bridge_sessions").update({ ended_at: new Date().toISOString() }).eq("id", id).then(check);
      },
    };
  });
}

export { randomKey, sha256, startBridge };
