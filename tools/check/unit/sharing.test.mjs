/* Sharing a file (cloud/sharing.js) against a stand-in client with the two
   tables. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { invite, listPeople, removeMember, withdraw } from "../../../assets/builder/cloud/sharing.js";

function fakeClient() {
  const db = { project_members: [{ project_id: "f1", user_id: "u1", role: "owner", email: "ann@example.com", added_at: "2026-01-01" }], project_invites: [] };
  const from = (table) => {
    let op = "select", payload = null, single = false;
    const filters = [];
    const match = (r) => filters.every(([k, v]) => r[k] === v);
    const api = {
      select() { return api; }, order() { return api; },
      insert(p) { op = "insert"; payload = p; return api; },
      delete() { op = "delete"; return api; },
      eq(k, v) { filters.push([k, v]); return api; },
      single() { single = true; return api; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    const run = () => {
      if (op === "insert") {
        if (table === "project_invites" && db.project_invites.some((r) => r.project_id === payload.project_id && r.email === payload.email)) return { data: null, error: { message: 'duplicate key value violates unique constraint "project_invites_pkey"' } };
        const row = { created_at: "now", ...payload };
        db[table].push(row);
        return { data: single ? row : [row], error: null };
      }
      if (op === "delete") { db[table] = db[table].filter((r) => !match(r)); return { data: null, error: null }; }
      return { data: db[table].filter(match), error: null };
    };
    return api;
  };
  return { db, from };
}

test("the people on a file and the invites waiting, then an invite, a withdrawal and a removal", async () => {
  const sb = fakeClient();
  let got = await listPeople(sb, "f1");
  assert.equal(got.members.length, 1); assert.equal(got.invites.length, 0);
  const made = await invite(sb, "f1", "  Ben@Example.com ", got.members);
  assert.equal(made.email, "ben@example.com", "the address is tidied");
  await assert.rejects(invite(sb, "f1", "ben@example.com"), /already invited/, "twice says so in words");
  await assert.rejects(invite(sb, "f1", "ann@example.com", got.members), /already on this file/);
  await assert.rejects(invite(sb, "f1", "not an address"), /isn't an email/);
  got = await listPeople(sb, "f1");
  assert.equal(got.invites.length, 1);
  await withdraw(sb, "f1", "ben@example.com");
  assert.equal((await listPeople(sb, "f1")).invites.length, 0);
  sb.db.project_members.push({ project_id: "f1", user_id: "u2", role: "editor", email: "cat@example.com", added_at: "2026-01-02" });
  await removeMember(sb, "f1", "u2");
  assert.deepEqual((await listPeople(sb, "f1")).members.map((m) => m.user_id), ["u1"]);
});
