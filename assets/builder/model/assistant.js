/* The assistant's conversation, apart from where it's sent: reading a
   server-sent event stream, putting a streamed reply back together, and a
   practice assistant that answers in the same events without sending
   anything anywhere. The events are the model's stream events, as the
   assistant function (supabase/functions/assistant) relays them. */

/* Server-sent events, fed in as text arrives: each complete "data:" line's
   JSON goes to onEvent. Returns a function to feed, which holds the part of
   a line still to come. */
function eventReader(onEvent) {
  var rest = "";
  return function feed(chunk) {
    rest += chunk;
    var parts = rest.split(/\r?\n\r?\n/);
    rest = parts.pop();
    parts.forEach(function (block) {
      var data = block.split(/\r?\n/).filter(function (l) { return l.indexOf("data:") === 0; }).map(function (l) { return l.slice(5).replace(/^ /, ""); }).join("\n");
      if (!data) return;
      try { onEvent(JSON.parse(data)); } catch (err) { /* not JSON: skipped */ }
    });
  };
}

/* A reply put back together from its events: its text and tool calls, in
   order, how it stopped, and any error. A tool call's input is parsed when
   its block ends; one that doesn't parse is kept as an error, not run. */
function collector() {
  var blocks = [], stop = null, error = null, usage = null;
  return {
    add: function (ev) {
      if (!ev || typeof ev.type !== "string") return;
      if (ev.type === "content_block_start") {
        var b = ev.content_block || {};
        blocks[ev.index] = b.type === "tool_use" ? { type: "tool_use", id: b.id, name: b.name, json: "", input: null }
          : b.type === "text" ? { type: "text", text: b.text || "" } : { type: b.type || "other" };
      } else if (ev.type === "content_block_delta") {
        var t = blocks[ev.index], d = ev.delta || {};
        if (!t) return;
        if (d.type === "text_delta") t.text += d.text;
        else if (d.type === "input_json_delta") t.json += d.partial_json;
      } else if (ev.type === "content_block_stop") {
        var u = blocks[ev.index];
        if (u && u.type === "tool_use") {
          try { u.input = u.json ? JSON.parse(u.json) : {}; } catch (err) { u.input = null; u.bad = true; }
        }
      } else if (ev.type === "message_delta") {
        if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        if (ev.usage) usage = ev.usage;
      } else if (ev.type === "error") {
        error = (ev.error && ev.error.message) || "The assistant stopped.";
      }
    },
    result: function () {
      var list = blocks.filter(Boolean);
      return {
        text: list.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join(""),
        tools: list.filter(function (b) { return b.type === "tool_use"; }),
        content: list.filter(function (b) { return b.type === "text" || b.type === "tool_use"; }).map(function (b) {
          return b.type === "text" ? { type: "text", text: b.text } : { type: "tool_use", id: b.id, name: b.name, input: b.input || {} };
        }),
        stop: stop, error: error, usage: usage,
      };
    },
  };
}

/* A reply as stream events: text, then tool calls. */
function replyEvents(text, calls, stop) {
  var events = [{ type: "message_start", message: { id: "practice", role: "assistant", model: "practice", content: [] } }];
  var i = 0;
  if (text) {
    events.push({ type: "content_block_start", index: i, content_block: { type: "text", text: "" } });
    String(text).match(/.{1,24}(\s|$)|.+/g).forEach(function (piece) { events.push({ type: "content_block_delta", index: i, delta: { type: "text_delta", text: piece } }); });
    events.push({ type: "content_block_stop", index: i });
    i++;
  }
  (calls || []).forEach(function (c, n) {
    var json = JSON.stringify(c.input || {});
    events.push({ type: "content_block_start", index: i, content_block: { type: "tool_use", id: "practice_" + n, name: c.name, input: {} } });
    for (var at = 0; at < json.length; at += 32) events.push({ type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: json.slice(at, at + 32) } });
    events.push({ type: "content_block_stop", index: i });
    i++;
  });
  events.push({ type: "message_delta", delta: { stop_reason: stop || ((calls || []).length ? "tool_use" : "end_turn") }, usage: { output_tokens: 0 } });
  events.push({ type: "message_stop" });
  return events;
}

/* The practice assistant: answers from a script without sending anything.
   script(request) returns { text, calls } for this turn; without one, it
   says what it would do and calls no tools. A turn that follows tool
   results says it's done. */
function practiceEvents(request, script) {
  var msgs = (request && request.messages) || [];
  var last = msgs[msgs.length - 1];
  var afterTools = last && Array.isArray(last.content) && last.content.some(function (b) { return b && b.type === "tool_result"; });
  if (afterTools) return replyEvents("Done. That's practice mode: nothing was sent to a model.", []);
  var turn = script ? script(request) : null;
  if (turn) return replyEvents(turn.text, turn.calls);
  var asked = last ? (typeof last.content === "string" ? last.content : (last.content || []).filter(function (b) { return b && b.type === "text"; }).map(function (b) { return b.text; }).join(" ")) : "";
  return replyEvents("Practice mode: nothing is sent to a model yet. You asked: “" + String(asked).slice(0, 200) + "”.", []);
}

export { collector, eventReader, practiceEvents, replyEvents };
