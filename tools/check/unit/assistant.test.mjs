/* The assistant's conversation (model/assistant.js): reading the relayed
   stream, putting a reply back together, and practice mode. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { collector, eventReader, practiceEvents, replyEvents } from "../../../assets/builder/model/assistant.js";

test("server-sent events are read whole, however the text is split", () => {
  const got = [];
  const feed = eventReader((e) => got.push(e));
  const text = 'data: {"type":"message_start"}\n\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n: comment\n\ndata: not json\n\n';
  for (let i = 0; i < text.length; i += 7) feed(text.slice(i, i + 7));
  assert.deepEqual(got.map((e) => e.type), ["message_start", "content_block_start"]);
});

test("a streamed reply is put back together: text, tool calls with parsed input, and how it stopped", () => {
  const c = collector();
  replyEvents("Making the fill brand-muted.", [{ name: "set_style", input: { ids: ["n1"], key: "surface", value: "brand-muted" } }]).forEach(c.add);
  const r = c.result();
  assert.equal(r.text, "Making the fill brand-muted.");
  assert.equal(r.tools.length, 1);
  assert.deepEqual(r.tools[0].input, { ids: ["n1"], key: "surface", value: "brand-muted" });
  assert.equal(r.stop, "tool_use");
  assert.deepEqual(r.content.map((b) => b.type), ["text", "tool_use"]);
});

test("a tool call whose input doesn't parse is marked bad, not run", () => {
  const c = collector();
  [{ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t", name: "set_style" } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"ids":["n1"' } },
    { type: "content_block_stop", index: 0 },
    { type: "error", error: { message: "Overloaded" } }].forEach(c.add);
  const r = c.result();
  assert.equal(r.tools[0].bad, true);
  assert.equal(r.tools[0].input, null);
  assert.equal(r.error, "Overloaded");
});

test("practice mode answers in the same events and sends nothing", () => {
  const c = collector();
  practiceEvents({ messages: [{ role: "user", content: "Make it premium" }] }).forEach(c.add);
  assert.match(c.result().text, /Practice mode/);
  assert.match(c.result().text, /Make it premium/);
  const scripted = collector();
  practiceEvents({ messages: [{ role: "user", content: "x" }] }, () => ({ text: "On it.", calls: [{ name: "select", input: { ids: ["a"] } }] })).forEach(scripted.add);
  assert.equal(scripted.result().tools[0].name, "select");
  const after = collector();
  practiceEvents({ messages: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "ok" }] }] }).forEach(after.add);
  assert.match(after.result().text, /Done/);
  assert.equal(after.result().stop, "end_turn");
});

test("thinking blocks keep their text and signature, and come back as notes", () => {
  const c = collector();
  [
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "Checking the hero." } },
    { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig" } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "t", name: "read_page", input: {} } },
    { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: "{}" } },
    { type: "content_block_stop", index: 1 },
    { type: "message_delta", delta: { stop_reason: "tool_use" } },
  ].forEach(c.add);
  const r = c.result();
  assert.deepEqual(r.notes, ["Checking the hero."]);
  assert.deepEqual(r.content[0], { type: "thinking", thinking: "Checking the hero.", signature: "sig" });
  assert.equal(r.content[1].type, "tool_use");
});

test("after a fallback mid-reply, the thinking and tool calls before it are left out", () => {
  const c = collector();
  [
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "x", signature: "s" } },
    { type: "content_block_start", index: 1, content_block: { type: "text", text: "Part" } },
    { type: "content_block_start", index: 2, content_block: { type: "tool_use", id: "a", name: "read_page", input: {} } },
    { type: "content_block_stop", index: 2 },
    { type: "content_block_start", index: 3, content_block: { type: "fallback", from: { model: "m1" }, to: { model: "m2" } } },
    { type: "content_block_start", index: 4, content_block: { type: "tool_use", id: "b", name: "read_selection", input: {} } },
    { type: "content_block_stop", index: 4 },
  ].forEach(c.add);
  const r = c.result();
  assert.deepEqual(r.content.map((b) => b.type), ["text", "fallback", "tool_use"]);
  assert.deepEqual(r.tools.map((t) => t.id), ["b"]);
});

test("a tool input that isn't an object is kept as an error", () => {
  const c = collector();
  [
    { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t", name: "select", input: {} } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: "[1]" } },
    { type: "content_block_stop", index: 0 },
  ].forEach(c.add);
  assert.equal(c.result().tools[0].bad, true);
});
