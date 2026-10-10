/* Conversations shared in a file (cloud/convos.js) against a stand-in
   client with assistant_threads. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { openShared, pullShared, pushSave, shareOff, shareOn } from "../../../assets/builder/cloud/convos.js";

function fakeClient() {
  let seq = 1;
  const db = { assistant_threads: [] };
  const from = (table) => {
    let op = "select", payload = null, single = false, maybe = false;
    const filters = [];
    const match = (r) => filters.every(([k, v]) => r[k] === v);
    const api = {
      select() { return api; }, order() { return api; },
      insert(p) { op = "insert"; payload = p; return api; },
      update(p) { op = "update"; payload = p; return api; },
      delete() { op = "delete"; return api; },
      eq(k, v) { filters.push([k, v]); return api; },
      single() { single = true; return api; }, maybeSingle() { maybe = true; return api; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    const run = () => {
      if (op === "insert") { const row = { id: "t" + seq++, created_by: "u1", shared: false, rev: 0, updated_at: "2026-01-01T00:00:00Z", ...payload }; db[table].push(row); return { data: single ? row : [row], error: null }; }
      if (op === "update") { const hit = db[table].filter(match); hit.forEach((r) => { Object.assign(r, payload); r.rev += 1; }); return { data: single ? hit[0] || null : hit, error: single && !hit[0] ? { message: "no rows" } : null }; }
      if (op === "delete") { db[table] = db[table].filter((r) => !match(r)); return { data: null, error: null }; }
      const rows = db[table].filter(match);
      if (single || maybe) return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    };
    return api;
  };
  return { db, from };
}

test("sharing makes the row and marks it shared; a save bumps the rev; an old rev is refused; unsharing keeps the row", async () => {
  const sb = fakeClient();
  const value = { thread: [{ id: "a", role: "user", text: "Hi" }], msgs: [{ role: "user", content: "Hi" }] };
  const got = await shareOn(sb, "f1", { id: "t-local" }, "Hi", value);
  assert.equal(sb.db.assistant_threads.length, 1);
  assert.deepEqual(got, { cloud: "t1", rev: 1, shared: true });
  const saved = await pushSave(sb, { cloud: "t1", rev: 1 }, "Hi", value);
  assert.equal(saved.rev, 2);
  await assert.rejects(pushSave(sb, { cloud: "t1", rev: 1 }, "Hi", value), (e) => e.stale === true, "a save from an old rev says so");
  const off = await shareOff(sb, { cloud: "t1", rev: 2 });
  assert.equal(off.shared, false);
  assert.equal(sb.db.assistant_threads.length, 1);
  assert.deepEqual(await shareOff(sb, { id: "never-shared" }), { shared: false });
});

test("others' shared conversations become lines named after their starter, and open with their body", async () => {
  const sb = fakeClient();
  sb.db.assistant_threads.push(
    { id: "t9", file_id: "f1", created_by: "u2", title: "Ben's", shared: true, rev: 3, updated_at: "2026-01-02T00:00:00Z", body: { thread: [{ id: "x", role: "user", text: "Hi", by: { id: "u2", name: "ben@example.com" } }], msgs: [] } },
    { id: "t8", file_id: "f1", created_by: "u2", title: "Private", shared: false, rev: 1, updated_at: "2026-01-02T00:00:00Z", body: {} },
    { id: "t7", file_id: "f1", created_by: "u1", title: "Mine", shared: true, rev: 1, updated_at: "2026-01-02T00:00:00Z", body: {} });
  const lines = await pullShared(sb, "f1", [{ user_id: "u2", email: "ben@example.com" }], "u1");
  assert.deepEqual(lines.map((l) => [l.id, l.cloud, l.title, l.by.name, l.shared, l.remote]), [["c:t9", "t9", "Ben's", "ben@example.com", true, true]]);
  const opened = await openShared(sb, "t9", { u2: "ben@example.com" });
  assert.equal(opened.thread.length, 1);
  assert.equal(opened.rev, 3);
  assert.equal(opened.by.name, "ben@example.com");
  assert.equal(await openShared(sb, "nope"), null);
});
