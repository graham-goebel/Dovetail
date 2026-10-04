/* Edits as small changes (assets/builder/model/edits.js): every kind of
   edit turns into changes that remake it exactly and take it back exactly,
   two people's changes to different things survive in either order, and
   undoing your own leaves theirs. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { make, makeFrame, locate, ops } from "../../../assets/builder/model/tree.js";
import { STARTERS } from "../../../assets/builder/model/starters.js";
import { apply, diff, invert } from "../../../assets/builder/model/edits.js";

const landing = () => STARTERS[0][2]();
/* Which frame is active is each viewer's own and never travels in a change. */
const plain = (d) => { const out = JSON.parse(JSON.stringify(d)); if (out && out.frames) { assert.ok(out.frames.some((f) => f.id === out.active), "the active frame is one of the frames"); delete out.active; } return out; };
const nodes = (f) => { const out = []; (function walk(n) { out.push(n); (n.children || []).forEach(walk); })(f.root); return out; };

/* The changes from prev to next remake next, and turned round, remake prev. */
function roundTrip(prev, next, label) {
  const ch = diff(prev, next);
  assert.deepEqual(plain(apply(prev, ch)), plain(next), `${label}: the changes remake the edit`);
  assert.deepEqual(plain(apply(next, invert(ch))), plain(prev), `${label}: turned round, they take it back`);
  const sent = JSON.parse(JSON.stringify(ch));
  assert.deepEqual(plain(apply(prev, sent)), plain(next), `${label}: sent as JSON, they still remake it`);
  assert.deepEqual(plain(apply(next, invert(sent))), plain(prev), `${label}: and still take it back`);
  return ch;
}

test("each kind of edit remakes and takes back exactly", () => {
  const start = landing();
  const f0 = start.frames[0];
  const [a, b] = f0.root.children;
  const edits = {
    "a prop": (d) => { d.frames[0].root.children[0].props.title = "Kiln & Co"; },
    "a style, then a style removed": (d) => { const n = d.frames[0].root.children[1]; n.style.paddingTop = "lg"; delete n.style.marginTop; },
    "a node added inside another": (d) => { ops.insert(d, "root", 1, make("Stack", {}, [make("Heading"), make("Text")])); },
    "a node moved into another": (d) => { const s = make("Stack"); ops.insert(d, "root", 0, s); ops.move(d, b.id, s.id, 0); },
    "a container added with things in it (and, taken back, removed with them)": (d) => { ops.insert(d, "root", 0, make("Stack", {}, [make("Heading"), make("Inline", {}, [make("Button")])])); },
    "a node removed": (d) => { ops.remove(d, [a.id]); },
    "a duplicate": (d) => { ops.duplicate(d, b.id); },
    "a wrap": (d) => { ops.wrap(d, a.id, "Stack"); },
    "a group and an ungroup": (d) => { const g = ops.group(d, [a.id, b.id]); ops.ungroup(d, g); },
    "a reorder": (d) => { ops.nudge(d, a.id, 1); },
    "a frame's fields": (d) => { d.frames[0].name = "Home page"; d.frames[0].width = 390; d.frames[0].dark = true; },
    "a frame added": (d) => { const f = makeFrame("Phone", "phone"); f.root.children = [make("Heading")]; d.frames.push(f); },
    
    "a node's style taken away whole": (d) => { delete d.frames[0].root.children[0].style; },
    "a list prop": (d) => { const faq = make("FaqBlock"); ops.insert(d, "root", 0, faq); },
  };
  for (const [label, fn] of Object.entries(edits)) roundTrip(start, produce(start, fn), label);
  const two = produce(start, (d) => { d.frames.push(makeFrame("Second", "phone")); });
  roundTrip(two, produce(two, (d) => { d.frames.reverse(); }), "frames reordered");
  roundTrip(two, produce(two, (d) => { d.frames.splice(0, 1); d.active = d.frames[0].id; }), "the first frame removed");
});

test("random edits, one after another, always remake and take back exactly", () => {
  let seed = 7;
  const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const types = ["Heading", "Text", "Button", "Stack", "Inline", "Card", "Image", "Badge"];
  let d = landing();
  for (let i = 0; i < 300; i++) {
    const f = d.frames[0];
    const all = nodes(f).filter((n) => n.id !== "root");
    const holders = nodes(f).filter((n) => Array.isArray(n.children) && n.type !== "Slot");
    const pick = (list) => list[rand(list.length)];
    const next = produce(d, (x) => {
      const kind = rand(7);
      const n = all.length ? pick(all) : null;
      if (kind === 0 || !n) ops.insert(x, pick(holders).id, rand(4), make(pick(types)));
      else if (kind === 1) ops.move(x, n.id, pick(holders).id, rand(4));
      else if (kind === 2 && all.length > 4) ops.remove(x, [n.id]);
      else if (kind === 3) ops.duplicate(x, n.id);
      else if (kind === 4) { const at = locate(x, n.id); at.node.props = Object.assign({}, at.node.props, { children: "Edit " + i }); }
      else if (kind === 5) { const at = locate(x, n.id); at.node.style = Object.assign({}, at.node.style, { paddingTop: pick(["sm", "md", "lg"]) }); }
      else ops.nudge(x, n.id, rand(2) ? 1 : -1);
    });
    roundTrip(d, next, `edit ${i}`);
    d = next;
  }
});

test("two people's changes to different things both survive, in either order", () => {
  const base = landing();
  const [a, b] = base.frames[0].root.children;
  const mine = diff(base, produce(base, (d) => { locate(d, a.id).node.props.title = "Mine"; }));
  const theirs = diff(base, produce(base, (d) => { assert.ok(ops.insert(d, "root", 0, make("Text", { children: "Theirs" }))); locate(d, b.id).node.style.paddingTop = "lg"; }));
  const one = apply(apply(base, mine), theirs), other = apply(apply(base, theirs), mine);
  assert.deepEqual(plain(one), plain(other), "the same canvas whichever order they arrive in");
  assert.equal(locate(one, a.id).node.props.title, "Mine");
  assert.equal(locate(one, b.id).node.style.paddingTop, "lg");
  assert.ok(JSON.stringify(one).includes('"Theirs"'));
});

test("a node moved by one person and edited by another keeps the edit where it went", () => {
  const base = landing();
  const [a, b] = base.frames[0].root.children;
  const withStack = produce(base, (d) => { ops.insert(d, "root", 0, make("Stack")); });
  const stack = withStack.frames[0].root.children[0];
  const move = diff(withStack, produce(withStack, (d) => { ops.move(d, b.id, stack.id, 0); }));
  const edit = diff(withStack, produce(withStack, (d) => { locate(d, b.id).node.props.title = "Edited"; }));
  for (const out of [apply(apply(withStack, move), edit), apply(apply(withStack, edit), move)]) {
    const at = locate(out, b.id);
    assert.equal(at.parent.id, stack.id, "it's in the Stack");
    assert.equal(at.node.props.title, "Edited", "with the edit");
    assert.equal(nodes(out.frames[0]).filter((n) => n.id === b.id).length, 1, "and only once");
  }
  assert.ok(locate(withStack, a.id));
});

test("undoing your own change leaves someone else's", () => {
  const base = landing();
  const [a, b] = base.frames[0].root.children;
  const afterMine = produce(base, (d) => { locate(d, a.id).node.props.title = "Mine"; });
  const mine = diff(base, afterMine);
  const theirs = diff(afterMine, produce(afterMine, (d) => { locate(d, b.id).node.style.paddingTop = "lg"; }));
  const now = apply(afterMine, theirs);
  const undone = apply(now, invert(mine));
  assert.equal(locate(undone, a.id).node.props.title, base.frames[0].root.children[0].props.title, "my title is back as it was");
  assert.equal(locate(undone, b.id).node.style.paddingTop, "lg", "their padding stays");
});

test("a change to something someone else removed is passed over", () => {
  const base = landing();
  const [a] = base.frames[0].root.children;
  const edit = diff(base, produce(base, (d) => { locate(d, a.id).node.props.title = "Too late"; }));
  const gone = apply(base, diff(base, produce(base, (d) => { ops.remove(d, [a.id]); })));
  const out = apply(gone, edit);
  assert.equal(locate(out, a.id), null);
  assert.ok(!JSON.stringify(out).includes("Too late"));
});

test("frames a change doesn't touch keep their identity", () => {
  const base = produce(landing(), (d) => { d.frames.push(makeFrame("Other", "phone")); });
  const out = apply(base, diff(base, produce(base, (d) => { d.frames[0].root.children[0].props.title = "Only here"; })));
  assert.equal(out.frames[1], base.frames[1], "the other frame is the same object");
  assert.notEqual(out.frames[0], base.frames[0]);
  assert.equal(apply(base, []), base, "no changes, the same document");
  assert.deepEqual(diff(base, base), []);
});

test("a copied frame whose nodes share ids with another frame stays its own", () => {
  const base = landing();
  const copy = produce(base, (d) => { const f = JSON.parse(JSON.stringify(d.frames[0])); f.id = "copy"; d.frames.push(f); });
  const ch = roundTrip(base, copy, "a copied frame");
  const edited = produce(copy, (d) => { d.frames[1].root.children[0].props.title = "Copy only"; });
  roundTrip(copy, edited, "an edit to the copy");
  const out = apply(copy, diff(copy, edited));
  assert.notEqual(out.frames[0].root.children[0].props.title, "Copy only", "the original frame is untouched");
  assert.ok(ch.every((c) => c.f === undefined || typeof c.f === "string"));
});
