/* Linked component instances (assets/builder/model/instances.js): what an
   instance's overrides are, how an instance is rebuilt on a new revision of
   its component, and how a document's instances are updated or detached.
   Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { make, makeFrame, cleanNode, fresh } from "../../../assets/builder/model/tree.js";
import { applyOverrides, at, detachAll, instancesOf, masterOf, overrides, rebase, updateInstances } from "../../../assets/builder/model/instances.js";

/* A card-like component: a column with a heading, some text and a button. */
const master = () => make("Group", { direction: "column", gap: "md" }, [
  make("Heading", { children: "Title", level: 2 }),
  make("Text", { children: "Body" }),
  make("Button", { children: "Go", variant: "primary" }),
], { padding: "md", radius: "md" });

const instance = (m, id, extra) => Object.assign(fresh(m), { id, inst: { of: "c1", rev: 1 } }, extra);
const doc = (...children) => { const f = makeFrame("Home", "desktop"); f.root.children = children; return { frames: [f], active: f.id }; };
const texts = (n) => (n.children || []).map((c) => c.props.children);

test("an untouched instance has no overrides; edits inside it are read off by place", () => {
  const m = master();
  const i = instance(m, "i1");
  assert.deepEqual(overrides(i, m), []);
  i.children[0].props.children = "Hello";
  i.children[2].style.w = "lg";
  i.children[2].hide = true;
  i.style.x = 4; i.style.y = 8;
  const ovs = overrides(i, m);
  assert.deepEqual(ovs.map((o) => o.path), ["0", "2"]);
  assert.deepEqual(ovs[0].props, { children: "Hello" });
  assert.deepEqual(ovs[1].style, { w: "lg" });
  assert.deepEqual(ovs[1].flags, { hide: true });
  assert.equal(ovs.some((o) => o.path === ""), false, "the root's position is the instance's own, not an override");
});

test("a prop taken off, and children added or removed, are overrides too", () => {
  const m = master();
  const i = instance(m, "i1");
  delete i.children[2].props.variant;
  i.children.push(make("Text", { children: "Extra" }));
  const ovs = overrides(i, m);
  assert.equal(ovs.length, 1, "children that don't line up are one override on their parent");
  assert.equal(ovs[0].path, "");
  assert.equal(ovs[0].children.length, 4);
  const back = applyOverrides(m, ovs);
  assert.deepEqual(texts(back), ["Title", "Body", "Go", "Extra"]);
  assert.equal(back.children[2].props.variant, undefined, "the override's children are kept whole");
});

test("rebase keeps an instance's overrides, id, position and flags on the new revision", () => {
  const was = master();
  const i = instance(was, "i1", { lock: true, name: "Hero card" });
  i.children[0].props.children = "Hello";
  i.style.x = 12; i.style.y = 20;
  const next = fresh(was);
  next.style.padding = "lg";
  next.children[1].props.children = "New body";
  next.children.push(make("Badge", { children: "New" }));
  const out = rebase(i, was, next, 2);
  assert.equal(out.id, "i1");
  assert.equal(out.lock, true);
  assert.equal(out.name, "Hero card");
  assert.deepEqual([out.style.x, out.style.y], [12, 20]);
  assert.equal(out.style.padding, "lg", "the component's change comes through");
  assert.deepEqual(texts(out), ["Hello", "New body", "Go", "New"], "the override stays, the change comes, the new child arrives");
  assert.deepEqual(out.inst, { of: "c1", rev: 2 });
  const ids = new Set(); (function walk(n) { ids.add(n.id); (n.children || []).forEach(walk); })(out);
  assert.equal(ids.size, 5, "every node has its own id");
});

test("rebase against itself resets an instance to the component", () => {
  const m = master();
  const i = instance(m, "i1");
  i.children[0].props.children = "Hello";
  i.style.x = 4; i.style.y = 4;
  const out = rebase(i, i, m, 1);
  assert.deepEqual(texts(out), ["Title", "Body", "Go"]);
  assert.deepEqual([out.style.x, out.style.y], [4, 4]);
});

test("an override whose place is gone from the new revision is dropped", () => {
  const was = master();
  const i = instance(was, "i1");
  i.children[2].props.children = "Buy";
  const next = fresh(was);
  next.children.pop();
  const out = rebase(i, was, next, 2);
  assert.deepEqual(texts(out), ["Title", "Body"]);
});

test("updateInstances rebuilds every instance in a document but the source; detachAll takes the links off", () => {
  const was = master();
  const a = instance(was, "a"), b = instance(was, "b"), c = instance(was, "c");
  b.children[0].props.children = "B's title";
  const d = doc(a, make("Stack", {}, [b]), c);
  assert.deepEqual(instancesOf(d, "c1").map((h) => h.node.id), ["a", "b", "c"]);
  const next = fresh(was);
  next.children[1].props.children = "Fresh body";
  const after = produce(d, (draft) => { assert.equal(updateInstances(draft, "c1", was, next, 2, "a"), 2); });
  const root = after.frames[0].root;
  assert.equal(root.children[0].inst.rev, 2, "the source only takes the new revision number");
  assert.deepEqual(texts(root.children[0]), ["Title", "Body", "Go"]);
  assert.deepEqual(texts(root.children[1].children[0]), ["B's title", "Fresh body", "Go"]);
  assert.deepEqual(texts(root.children[2]), ["Title", "Fresh body", "Go"]);
  assert.equal(d.frames[0].root.children[2].children[1].props.children, "Body", "the document before is left alone");
  const loose = produce(after, (draft) => { assert.equal(detachAll(draft, "c1"), 3); });
  assert.equal(instancesOf(loose, "c1").length, 0);
});

test("cleanNode keeps a well-formed link and drops a broken one", () => {
  const ok = cleanNode(Object.assign(make("Group"), { inst: { of: "c1", rev: 3 } }), null);
  assert.deepEqual(ok.inst, { of: "c1", rev: 3 });
  assert.equal(cleanNode(Object.assign(make("Group"), { inst: { of: 5 } }), null).inst, undefined);
  assert.equal(cleanNode(Object.assign(make("Group"), { inst: "c1" }), null).inst, undefined);
  assert.equal(fresh(ok).inst, undefined, "a plain copy isn't linked");
});

test("masterOf finds the component in the library, or nothing", () => {
  const lib = { components: [{ id: "c1", name: "Card", node: master(), rev: 1 }] };
  assert.equal(masterOf(lib, { inst: { of: "c1", rev: 1 } }).name, "Card");
  assert.equal(masterOf(lib, { inst: { of: "zz", rev: 1 } }), null);
  assert.equal(masterOf(lib, make("Group")), null);
  assert.equal(at(master(), "1").type, "Text");
  assert.equal(at(master(), "9"), null);
});
