/* Where the open file is kept, in words (cloud/status.js). Run with npm run
   check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { ago, fileCloud } from "../../../assets/builder/cloud/status.js";

const IN = { status: "in", account: { id: "u1", email: "a@b.co" } };
const NOW = 1_000_000_000;

test("with the cloud off there's nothing to say; signed out, the file is only here", () => {
  assert.equal(fileCloud({ account: { status: "off" }, meta: {} }), null);
  assert.equal(fileCloud({ account: { status: "out" }, meta: {} }).kind, "out");
});

test("a Playground file stays in this browser, and says how to change that", () => {
  const s = fileCloud({ account: IN, meta: { group: "g1" }, group: { id: "g1", kind: "playground" }, mirror: { status: "synced" } });
  assert.equal(s.kind, "local");
  assert.match(s.detail, /Move this one out of the Playground/);
});

test("a file not up yet is uploading, offline or failed", () => {
  assert.equal(fileCloud({ account: IN, meta: {}, mirror: { status: "syncing" } }).kind, "uploading");
  assert.equal(fileCloud({ account: IN, meta: {}, mirror: { status: "offline" } }).kind, "offline");
  const err = fileCloud({ account: IN, meta: {}, mirror: { status: "error", error: "Too big" } });
  assert.equal(err.kind, "error"); assert.match(err.detail, /Too big/);
});

test("a cloud file is synced, or pending while changes wait", () => {
  const meta = { cloud: "c1" };
  const ok = fileCloud({ account: IN, meta, mirror: { status: "synced", at: NOW - 120000 }, now: NOW });
  assert.equal(ok.kind, "synced"); assert.match(ok.detail, /2 min ago/);
  assert.equal(fileCloud({ account: IN, meta, mirror: { status: "synced", pending: 1 } }).kind, "pending");
  assert.equal(fileCloud({ account: IN, meta: { cloud: "c1", cloudDirty: { main: true } }, mirror: { status: "synced" } }).kind, "pending");
  assert.equal(fileCloud({ account: IN, meta, mirror: { status: "offline" } }).kind, "offline");
  assert.equal(fileCloud({ account: IN, meta, mirror: { status: "error" } }).kind, "error");
});

test("ago reads in words", () => {
  assert.equal(ago(NOW - 5000, NOW), "just now");
  assert.equal(ago(NOW - 3 * 3600000, NOW), "3 h ago");
  assert.equal(ago(NOW - 86400000, NOW), "1 day ago");
  assert.equal(ago(null, NOW), "");
});
