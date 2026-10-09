/* Where the assistant's requests go. In practice mode, the default, they go
   nowhere: model/assistant.js answers from a script, so the panels can be
   tried with no account, no cloud and no cost. Live mode sends them to the
   assistant function (supabase/functions/assistant) with the signed-in
   session, and only when the cloud is connected and live mode has been
   turned on: window.DovetailAssistant = { mode: "live" } before the builder
   loads, or localStorage "dovetail-assistant" set to "live". */

import { cloudConfig, cloudReady } from "./config.js";
import { getClient } from "./client.js";
import { eventReader, practiceEvents } from "../model/assistant.js";

var MODE_KEY = "dovetail-assistant";

function assistantMode() {
  var asked = null;
  try {
    var over = typeof window !== "undefined" && window.DovetailAssistant;
    asked = over && over.mode ? over.mode : window.localStorage.getItem(MODE_KEY);
  } catch (err) { /* no storage */ }
  return asked === "live" && cloudReady() ? "live" : "practice";
}

/* Sends one request and hands each stream event to onEvent as it comes.
   request: { system, messages, tools, file_id }. Resolves when the stream
   ends; rejects with a message to show. opts.script and opts.delay shape
   practice mode. */
function sendAssistant(request, onEvent, opts) {
  opts = opts || {};
  if (assistantMode() !== "live") {
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

export { MODE_KEY, assistantMode, sendAssistant };
