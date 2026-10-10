/* The people a channel's presence list becomes (cloud/live.js). Run with
   npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { TAB, othersFrom } from "../../../assets/builder/cloud/live.js";

test("presence becomes one entry per other person, your own tabs left out, in the order first seen", () => {
  const peers = [
    { key: "u1:" + TAB, id: "u1", name: "ann@example.com" },
    { key: "u2:a", id: "u2", name: "ben@example.com" },
    { key: "u1:other", id: "u1", name: "ann@example.com" },
    { key: "u3:a", id: "u3", name: "cat@example.com", color: "red" },
    { key: "u2:b", id: "u2", name: "ben@example.com" },
    { key: "nobody" },
  ];
  const got = othersFrom(peers, "u1");
  assert.deepEqual(got.map((o) => o.id), ["u2", "u3"]);
  assert.equal(got[1].color, "red", "a colour they track is kept");
  assert.ok(got[0].color, "and one is made up otherwise");
  assert.deepEqual(othersFrom(null, "u1"), []);
});
