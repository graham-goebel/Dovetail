/* Conversations as the panel lists them and the cloud keeps them
   (model/threads.js, cloud/threads.js against a stand-in client). */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { forCloud, metaOf, senderOf, titleOf } from "../../../assets/builder/model/threads.js";
import { listThreads, saveThread, shareThread, startThread } from "../../../assets/builder/cloud/threads.js";

const thread = [
  { id: "1", role: "user", text: "Make the pricing page calmer", by: { id: "u1", name: "amy@example.com" } },
  { id: "2", role: "assistant", text: "Practice mode, with the real tools: a quieter brand fill.", steps: [{ ok: true, text: "Looked at Hero", shot: "data:image/jpeg;base64,AAAA" }], changes: [{ label: "Fill" }, { label: "Shadow", undone: true }] },
];

test("a conversation's line in the list: its first ask, what was said last, and the changes still standing", () => {
  const m = metaOf(thread, { by: { id: "u1", name: "amy@example.com" }, updated: 5 });
  assert.equal(m.title, "Make the pricing page calmer");
  assert.equal(m.said, "a quieter brand fill.");
  assert.equal(m.changes, 1);
  assert.equal(m.updated, 5);
  assert.equal(m.shared, false);
  assert.equal(titleOf([], ""), "New conversation");
  assert.equal(titleOf(thread, "Pricing work"), "Pricing work", "a name it was given wins");
});

test("the cloud's copy leaves the pictures out, and says where one was", () => {
  const value = { thread, msgs: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "s", content: [{ type: "image", source: { data: "AAAA" } }, { type: "text", text: "Hero" }] }] }, { role: "user", content: "plain" }] };
  const out = forCloud(value);
  assert.equal(out.thread[1].steps[0].shot, undefined);
  assert.equal(out.thread[1].steps[0].text, "Looked at Hero");
  assert.match(out.msgs[0].content[0].content[0].text, /A picture of the canvas was here/);
  assert.equal(out.msgs[0].content[0].content[1].text, "Hero");
  assert.equal(out.msgs[1].content, "plain");
  assert.ok(!JSON.stringify(out).includes("AAAA"), "no picture data goes up");
  assert.equal(value.thread[1].steps[0].shot, "data:image/jpeg;base64,AAAA", "the browser's own copy keeps its pictures");
});

test("a shared conversation names the sender, except to themselves", () => {
  assert.equal(senderOf(thread[0], { id: "u2" }), "amy@example.com");
  assert.equal(senderOf(thread[0], { id: "u1" }), "");
  assert.equal(senderOf({ role: "user", text: "x" }, { id: "u2" }), "");
});

/* A stand-in for supabase-js's query builder: records each call and
   answers with what the test says the database would. */
function standIn(answer) {
  const calls = [];
  const q = (table) => {
    const rec = { table, ops: [] };
    calls.push(rec);
    const chain = new Proxy({}, { get: (_, op) => op === "then" ? (ok, bad) => Promise.resolve(answer(rec)).then(ok, bad) : (...args) => { rec.ops.push([op, ...args]); return chain; } });
    return chain;
  };
  return { sb: { from: q }, calls };
}

test("the cloud calls: list, start, save from a rev, share", async () => {
  const { sb, calls } = standIn((rec) => {
    const ops = rec.ops.map((o) => o[0]);
    if (ops.includes("update") && rec.ops.some((o) => o[0] === "eq" && o[1] === "rev" && o[2] === 1)) return { data: [] };
    if (ops.includes("update") && ops.includes("single")) return { data: { id: "t", shared: true } };
    if (ops.includes("update")) return { data: [{ id: "t", rev: 3 }] };
    if (ops.includes("insert")) return { data: { id: "t", rev: 0 } };
    return { data: [{ id: "t" }] };
  });
  assert.deepEqual(await listThreads(sb, "f"), [{ id: "t" }]);
  assert.deepEqual(calls[0].ops.find((o) => o[0] === "eq"), ["eq", "file_id", "f"]);
  await startThread(sb, "f", "Pricing", { thread, msgs: [] });
  const ins = calls[1].ops.find((o) => o[0] === "insert")[1];
  assert.equal(ins.file_id, "f");
  assert.ok(!("created_by" in ins), "the database fills in who started it");
  assert.equal(ins.body.thread[1].steps[0].shot, undefined, "pictures stay behind");
  assert.equal((await saveThread(sb, "t", 2, "Pricing", { thread, msgs: [] })).rev, 3);
  await assert.rejects(saveThread(sb, "t", 1, "Pricing", { thread, msgs: [] }), (err) => err.stale === true && /carried this conversation on/.test(err.message));
  assert.equal((await shareThread(sb, "t", true)).shared, true);
  const { sb: bad } = standIn(() => ({ error: { message: "new row violates row-level security policy" } }));
  await assert.rejects(listThreads(bad, "f"), /row-level security/);
});
