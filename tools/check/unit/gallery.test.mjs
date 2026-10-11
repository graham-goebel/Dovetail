/* The examples on a component's page in Assets (model/gallery.js): each
   one is made of known components, sets only props they have, with values
   they take, and puts in each slot only what that slot takes; a component
   with none written gets one per option of its main choice. Run with npm
   run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { META, slotAccepts, slotSpec } from "../../../assets/builder/config.js";
import { GALLERY, galleryOf, exampleKids } from "../../../assets/builder/model/gallery.js";

const TEXT = new Set(["children"]);
function checkProps(type, props, where) {
  const specs = META[type].props;
  for (const [k, v] of Object.entries(props)) {
    if (TEXT.has(k)) { assert.equal(typeof v, "string", `${where}: ${k} is words`); continue; }
    const spec = specs.find((p) => p.name === k);
    assert.ok(spec, `${where}: ${type} has no ${k}`);
    if (spec.kind === "enum") assert.ok(spec.options.includes(v), `${where}: ${type} ${k} doesn't take ${v}`);
    if (spec.kind === "boolean") assert.equal(typeof v, "boolean", `${where}: ${k} is a switch`);
  }
}
function checkNode(node, where, owner) {
  if (node.type === "Slot") {
    assert.ok(owner && slotSpec(owner, node.props.name), `${where}: ${owner} has no ${node.props.name} slot`);
    for (const c of node.children) {
      assert.ok(slotAccepts(owner, node.props.name, c.type), `${where}: ${owner}'s ${node.props.name} doesn't take ${c.type}`);
      checkNode(c, where, null);
    }
    return;
  }
  assert.ok(META[node.type] && !META[node.type].builder, `${where}: ${node.type} is a component`);
  checkProps(node.type, node.props, where);
  for (const c of node.children || []) {
    if (c.type !== "Slot") assert.ok(META[node.type].container, `${where}: only a container holds ${c.type} outside a slot`);
    checkNode(c, where, node.type);
  }
}

test("every written example is made of known components, with props and slot contents they take", () => {
  for (const [type, list] of Object.entries(GALLERY)) {
    assert.ok(META[type], `${type} is a component`);
    assert.ok(list.length >= 2, `${type} has at least two examples`);
    const labels = new Set();
    for (const ex of list) {
      const where = `${type} / ${ex.label}`;
      assert.ok(ex.label && !labels.has(ex.label), `${where}: a label of its own`);
      labels.add(ex.label);
      checkNode({ type, props: ex.props, children: exampleKids(ex) || [] }, where, null);
    }
  }
});

test("every block has written examples", () => {
  const blocks = Object.keys(META).filter((t) => META[t].group === "blocks");
  assert.ok(blocks.length > 5);
  for (const t of blocks) assert.ok(GALLERY[t], `${t} has examples`);
});

test("an example's parts are made new each time it's placed", () => {
  const ex = GALLERY.Card.find((x) => x.label === "Plan");
  const a = exampleKids(ex), b = exampleKids(ex);
  assert.equal(a[0].type, "Slot");
  assert.equal(a[0].children[0].props.children, "Choose");
  assert.notEqual(a[0].id, b[0].id);
  assert.notEqual(a[0].children[0].id, b[0].children[0].id);
  assert.equal(exampleKids(GALLERY.HeroBlock[0]), null, "a props-only example brings no parts");
});

test("a component with none written gets one example per option of its main choice", () => {
  const callout = galleryOf("Callout");
  assert.equal(callout.map((x) => x.props.tone).join(), "note,tip,important,caution,brand");
  assert.equal(callout[0].label, "Note");
  const avatar = galleryOf("Avatar");
  assert.ok(avatar.length >= 2 && avatar.every((x) => x.props.shape || x.props.size));
  assert.equal(galleryOf("Divider").map((x) => x.props.tone).join(), "subtle,default,strong");
  assert.equal(galleryOf("Slot").length, 0, "a builder part has none");
  for (const t of Object.keys(META)) for (const ex of galleryOf(t)) checkNode({ type: t, props: ex.props, children: exampleKids(ex) || [] }, `${t} / ${ex.label}`, null);
});
