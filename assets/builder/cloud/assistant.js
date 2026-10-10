/* Where the assistant's requests go. Live mode sends them to the assistant
   function (supabase/functions/assistant) with the signed-in session: it is
   the mode once the cloud is connected and someone is signed in. Practice
   mode sends them nowhere: model/assistant.js answers from a script, so the
   panels can be tried with no account, no cloud and no cost; it is the mode
   signed out or without a cloud, and a choice otherwise (the panel's menu).
   The choice is kept as localStorage "dovetail-assistant" ("live" or
   "practice"); a page can also set window.DovetailAssistant = { mode } before
   the builder loads. */

import { cloudConfig, cloudReady } from "./config.js";
import { getClient } from "./client.js";
import { eventReader, practiceEvents } from "../model/assistant.js";

var MODE_KEY = "dovetail-assistant";

/* signedIn: whether someone is signed in; unknown counts as not. */
function assistantMode(signedIn) {
  var asked = null;
  try {
    var over = typeof window !== "undefined" && window.DovetailAssistant;
    asked = over && over.mode ? over.mode : window.localStorage.getItem(MODE_KEY);
  } catch (err) { /* no storage */ }
  if (!cloudReady()) return "practice";
  if (asked === "live" || asked === "practice") return asked;
  return signedIn ? "live" : "practice";
}

/* Keeps the choice of live or practice for this browser (the assistant
   panel's menu); the next request goes the new way. */
function setAssistantMode(mode) {
  try { window.localStorage.setItem(MODE_KEY, mode === "live" ? "live" : "practice"); } catch (err) { /* no storage */ }
}

/* Sends one request and hands each stream event to onEvent as it comes.
   request: { system, messages, tools, file_id }. Resolves when the stream
   ends; rejects with a message to show. opts.mode is the panel's mode (else
   the browser's choice, signed out); opts.script and opts.delay shape
   practice mode. */
function sendAssistant(request, onEvent, opts) {
  opts = opts || {};
  if ((opts.mode || assistantMode(false)) !== "live") {
    var events = practiceEvents(request, opts.script);
    var delay = opts.delay == null ? 18 : opts.delay;
    return new Promise(function (resolve, reject) {
      var i = 0;
      (function next() {
        if (opts.signal && opts.signal.aborted) { reject(new Error("Stopped.")); return; }
        if (i >= events.length) { resolve(); return; }
        onEvent(events[i++]);
        if (delay) setTimeout(next, delay); else next();
      })();
    });
  }
  return getClient().then(function (sb) { return sb.auth.getSession(); }).then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) throw new Error("Sign in to use the assistant.");
    var c = cloudConfig();
    return fetch(c.url + "/functions/v1/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: c.anonKey },
      body: JSON.stringify(request),
      signal: opts.signal,
    });
  }).then(function (resp) {
    if (!resp.ok) return resp.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.error || "The assistant couldn't be reached."); });
    var feed = eventReader(onEvent), reader = resp.body.getReader(), dec = new TextDecoder();
    return (function pump() {
      return reader.read().then(function (r) {
        if (r.done) { feed("\n\n"); return; }
        feed(dec.decode(r.value, { stream: true }));
        return pump();
      });
    })();
  });
}

export { MODE_KEY, assistantMode, sendAssistant, setAssistantMode };
