/* How much the assistant uses, in tokens (model/tokens.js), and the
   collector keeping the counts the model reports. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { addUsage, estimateRequest, requestUsage, shortCount, threadUsage, totalOf, usageDetail, usageLabel } from "../../../assets/builder/model/tokens.js";
import { collector } from "../../../assets/builder/model/assistant.js";

test("the collector keeps what was sent from the start and what came back from the end", () => {
  const c = collector();
  c.add({ type: "message_start", message: { usage: { input_tokens: 1200, cache_read_input_tokens: 30000, cache_creation_input_tokens: 400, output_tokens: 1 } } });
  c.add({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 350 } });
  const u = c.result().usage;
  assert.deepEqual(u, { input_tokens: 1200, cache_read_input_tokens: 30000, cache_creation_input_tokens: 400, output_tokens: 350 });
  const r = requestUsage(u, null, []);
  assert.deepEqual(r, { input: 1200, cacheRead: 30000, cacheWrite: 400, output: 350, requests: 1, estimated: false });
  assert.equal(totalOf(r), 31950);
});

test("without reported counts it estimates: about four characters a token, and a picture by its size", () => {
  const req = { stable: "x".repeat(4000), tools: [], messages: [{ role: "user", content: [{ type: "image", source: { data: "AAAA" } }, { type: "text", text: "y".repeat(400) }] }] };
  const est = estimateRequest(req);
  assert.ok(est > 1000 + 100 + 1500 && est < 1000 + 100 + 1700, String(est));
  const r = requestUsage(null, req, [{ type: "text", text: "z".repeat(80) }]);
  assert.equal(r.estimated, true);
  assert.equal(r.output, 20);
  assert.equal(requestUsage({ output_tokens: 0 }, req, []).estimated, true, "practice mode's zero counts are estimated instead");
});

test("a reply adds up its requests and a conversation its replies, labelled and explained", () => {
  const a = { input: 1000, cacheRead: 20000, cacheWrite: 0, output: 500, requests: 1, estimated: false };
  const b = { input: 300, cacheRead: 21000, cacheWrite: 200, output: 900, requests: 1, estimated: false };
  const reply = addUsage(a, b);
  assert.equal(reply.requests, 2);
  assert.equal(totalOf(reply), 43900);
  assert.equal(usageLabel(reply), "43.9k tokens");
  assert.equal(usageLabel(reply, 5000), "≈ 48.9k tokens", "while working, the estimate of what's being sent is added and marked");
  assert.match(usageDetail(reply), /^Sent 42,500, 41,000 of them from the cache, 200 written to the cache, wrote back 1,400 in 2 requests\.$/);
  const t = threadUsage([{ role: "user" }, { role: "assistant", usage: reply }, { role: "assistant", usage: { input: 10, cacheRead: 0, cacheWrite: 0, output: 5, requests: 1, estimated: true } }, { role: "assistant" }]);
  assert.equal(t.replies, 2);
  assert.equal(t.estimated, true);
  assert.equal(threadUsage([{ role: "user" }]), null);
  assert.deepEqual([812, 12400, 124000, 1250000].map(shortCount), ["812", "12.4k", "124k", "1.3M"]);
});
