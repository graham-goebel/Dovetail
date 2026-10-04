/* Live editing (assets/builder/cloud/sync.js) over the in-memory transport:
   people on the same page get each other's edits once, in order, and never
   their own; another page hears nothing; edits made before joining wait;
   a change list too big to send is refused; presence lists everyone else.
   Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { STARTERS } from "../../../assets/builder/model/starters.js";
import { apply, diff } from "../../../assets/builder/model/edits.js";
import { createSync, memoryHub, topicFor, MAX_MESSAGE } from "../../../assets/builder/cloud/sync.js";
import { cloudReady } from "../../../assets/builder/cloud/config.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const PROJECT = "3f2b1c4d-0000-4000-8000-00000000abcd";

function person(hub, id, extra = {}) {
  const got = [], reloads = [];
  let peers = [];
  const sync = createSync({ transport: hub, clientId: id, onRemote: (ch, from) => got.push({ ch, from }), onReload: (from) => reloads.push(from), onPeers: (p) => { peers = p; }, ...extra });
  return { sync, got, reloads, peers: () => peers };
}

test("the cloud is off until it has an address and a key", () => {
  assert.equal(cloudReady(), false);
  window.DovetailCloud = { url: "https://abc.supabase.co", anonKey: "x".repeat(40) };
  assert.equal(cloudReady(), true);
  window.DovetailCloud = { url: "http://abc.supabase.co", anonKey: "x".repeat(40) };
  assert.equal(cloudReady(), false, "plain http is refused");
  delete window.DovetailCloud;
});

test("a topic is what schema.sql's can_use_topic allows", () => {
  const t = topicFor(PROJECT, "home");
  assert.match(t, /^project:[0-9a-f-]{36}(:[A-Za-z0-9_-]{1,40})?$/);
});

test("edits reach everyone else on the page, once and in order, and remake the same document", async () => {
  const hub = memoryHub();
  const ann = person(hub, "ann"), ben = person(hub, "ben"), cat = person(hub, "cat");
  const topic = topicFor(PROJECT, "home");
  ann.sync.join(topic, { name: "Ann" });
  ben.sync.join(topic, { name: "Ben" });
  cat.sync.join(topicFor(PROJECT, "about"), { name: "Cat" });
  await tick(); await tick();
  assert.ok(ann.sync.joined() && ben.sync.joined());

  let annDoc = STARTERS[0][2]();
  let benDoc = JSON.parse(JSON.stringify(annDoc));
  const steps = [
    (d) => { d.frames[0].root.children[0].props.title = "Kiln & Co"; },
    (d) => { d.frames[0].root.children[1].style.paddingTop = "lg"; },
    (d) => { d.frames[0].root.children.reverse(); },
  ];
  for (const step of steps) {
    const next = produce(annDoc, step);
    assert.equal(ann.sync.send(diff(annDoc, next)), true);
    annDoc = next;
  }
  await tick(); await tick();
  assert.equal(ben.got.length, 3, "Ben gets each step once");
  assert.equal(ann.got.length, 0, "Ann never gets her own");
  assert.equal(cat.got.length, 0, "another page hears nothing");
  for (const m of ben.got) { assert.equal(m.from, "ann"); benDoc = apply(benDoc, m.ch); }
  const plain = (d) => { const o = JSON.parse(JSON.stringify(d)); delete o.active; return o; };
  assert.deepEqual(plain(benDoc), plain(annDoc));
});

test("a repeated message is dropped", async () => {
  const ben = person({ open: (t, h) => { setTimeout(() => { h.onStatus("joined"); const m = { type: "changes", from: "ann", seq: 1, changes: [{ op: "x" }] }; h.onMessage(m); h.onMessage(m); h.onMessage({ ...m, seq: 2 }); h.onMessage({ type: "changes", from: "ann", seq: "3", changes: [] }); h.onMessage(null); }); return { send() {}, track() {}, close() {} }; } }, "ben");
  ben.sync.join("t");
  await tick();
  assert.deepEqual(ben.got.map((m) => m.ch.length), [1, 1], "seq 1 once, then seq 2; the malformed ones are ignored");
});

test("edits made before joining wait, then go", async () => {
  const hub = memoryHub();
  const ann = person(hub, "ann"), ben = person(hub, "ben");
  const topic = topicFor(PROJECT, "home");
  ben.sync.join(topic);
  await tick();
  ann.sync.join(topic);
  assert.equal(ann.sync.joined(), false);
  ann.sync.send([{ id: "a" }]);
  ann.sync.send([{ id: "b" }]);
  assert.equal(ben.got.length, 0);
  await tick(); await tick();
  assert.deepEqual(ben.got.map((m) => m.ch[0].id), ["a", "b"]);
});

test("too big to send is refused; reload asks the others to load the page", async () => {
  const hub = memoryHub();
  const ann = person(hub, "ann"), ben = person(hub, "ben");
  const topic = topicFor(PROJECT, "home");
  ann.sync.join(topic); ben.sync.join(topic);
  await tick(); await tick();
  assert.equal(ann.sync.send([{ src: "x".repeat(MAX_MESSAGE) }]), false);
  ann.sync.reload();
  ann.sync.send([{ id: "after" }]);
  await tick(); await tick();
  assert.deepEqual(ben.reloads, ["ann"]);
  assert.deepEqual(ben.got.map((m) => m.ch[0].id), ["after"], "the refused one never went, and the next still counts");
});

test("presence lists everyone else, follows what they track, and empties on leaving", async () => {
  const hub = memoryHub();
  const ann = person(hub, "ann"), ben = person(hub, "ben");
  const topic = topicFor(PROJECT, "home");
  ann.sync.join(topic, { name: "Ann" }); ben.sync.join(topic, { name: "Ben" });
  await tick(); await tick();
  assert.deepEqual(ann.peers().map((p) => p.name), ["Ben"]);
  ben.sync.track({ selection: ["n1"] });
  await tick();
  assert.deepEqual(ann.peers()[0].selection, ["n1"]);
  assert.equal(ann.peers()[0].name, "Ben", "tracking keeps the rest");
  ben.sync.leave();
  await tick();
  assert.deepEqual(ann.peers(), []);
  assert.deepEqual(ben.peers(), []);
  ann.sync.send([{ id: "gone" }]);
  await tick();
  assert.equal(ben.got.length, 0, "nothing reaches someone who left");
});
