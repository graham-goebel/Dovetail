/* The builder's document model on its own: building nodes, the operations
   on a tree, the cleaning that guards saves, links and imports, and pasted
   JSON and JSX. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { make, makeFrame, locate, ops, cleanNode, clean } from "../../../assets/builder/model/tree.js";
import { readLayout, readLiteral, readJsxElements } from "../../../assets/builder/model/paste.js";
import { encode, decode } from "../../../assets/builder/model/share.js";

const doc = (...children) => { const f = makeFrame("Home", "desktop"); f.root.children = children; return { frames: [f], active: f.id }; };
const shape = (n) => { const kids = (n.children || []).filter((c) => c.type !== "Slot" || (c.children || []).length); return n.type + (kids.length ? "(" + kids.map(shape).join(",") + ")" : ""); };

test("make gives containers children, and a Carousel its five Covers", () => {
  assert.deepEqual(make("Stack").children, []);
  assert.equal(make("Button").children, undefined);
  const c = make("Carousel");
  assert.equal(c.children.length, 5);
  assert.ok(c.children.every((k) => k.type === "Cover" && k.props.ratio === "3:4"));
});

test("insert, move and remove keep the tree whole", () => {
  const stack = make("Stack"), a = make("Heading"), b = make("Text");
  const d = doc(stack);
  assert.ok(ops.insert(d, stack.id, 0, a));
  assert.ok(ops.insert(d, stack.id, 1, b));
  assert.equal(shape(d.frames[0].root), "Root(Stack(Heading,Text))");
  ops.move(d, b.id, stack.id, 0);
  assert.equal(locate(d, stack.id).node.children[0].id, b.id);
  ops.remove(d, [a.id]);
  assert.equal(locate(d, a.id), null);
  assert.equal(ops.insert(d, b.id, 0, make("Button")), null, "a leaf holds nothing");
});

test("an edit made with immer shares every frame it didn't touch", () => {
  const one = doc(make("Stack")), two = makeFrame("Other", "phone");
  const start = { frames: [one.frames[0], two], active: one.active };
  const next = produce(start, (d) => { ops.insert(d, d.frames[0].root.children[0].id, 0, make("Text")); });
  assert.notEqual(next.frames[0], start.frames[0], "the edited frame is new");
  assert.equal(next.frames[1], start.frames[1], "the other frame is the same object");
  assert.equal(start.frames[0].root.children[0].children.length, 0, "the old document is untouched");
});

test("cleaning keeps only known components, real props and token styles", () => {
  const report = [];
  const n = cleanNode({ type: "Group", props: { direction: "row", gap: "md", onClick: "alert(1)" }, style: { padding: "lg", w: "320px" }, children: [{ type: "Sparkle" }, { type: "Text", children: "Hi" }] }, report);
  assert.deepEqual(n.props, { direction: "row", gap: "md" });
  assert.deepEqual(n.style, { padding: "lg" });
  assert.equal(shape(n), "Group(Text)");
  assert.equal(n.children[0].props.children, "Hi");
  assert.ok(report.some((l) => /onClick isn't a prop/.test(l)));
  assert.ok(report.some((l) => /"320px" isn't a token option/.test(l)));
  assert.ok(report.some((l) => /"Sparkle" isn't something the builder places/.test(l)));
  assert.equal(cleanNode({ type: "Button", props: { variant: "nope" } }, []).props.variant, undefined, "an unknown enum value goes");
});

test("a link round-trips a layout, and cleaning a saved one keeps it", () => {
  const d = doc(make("Heading", { children: "Café ✓" }));
  const back = decode(encode(d));
  assert.equal(back.frames[0].root.children[0].props.children, "Café ✓");
  const again = clean(back, []);
  assert.equal(shape(again.frames[0].root), "Root(Heading)");
});

test("readLiteral reads literals and refuses code", () => {
  assert.deepEqual(readLiteral('{ a: 1, "b": [true, null, "x"], c: -2.5 }').value, { a: 1, b: [true, null, "x"], c: -2.5 });
  assert.equal(readLiteral("`plain`").value, "plain");
  for (const code of ["count", "a + 1", "`x ${y}`", "{ ...rest }", "() => 1"]) assert.equal(readLiteral(code).ok, false, code);
});

test("the JSX reader handles fragments, comments, entities and nesting", () => {
  const els = readJsxElements(`// a comment
<>{/* note */}<Card title="A &amp; B">x {"y"} <b>z</b></Card><Badge /></>`);
  assert.equal(els.length, 1);
  assert.equal(els[0].tag, "");
  const card = els[0].children.find((c) => c.tag === "Card");
  assert.equal(card.attrs[0].str, "A & B");
  assert.throws(() => readJsxElements("<Section><Stack></Section>"), /closed by <\/Section>/);
});

test("pasting JSX gives the tree, slots, sample items and a report", () => {
  const read = readLayout(`import { Section } from "@dovetail-ds/react";
<Section tone="subtle">
  <div style={{ display: "flex", flexDirection: "row", gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)" }}>
    <Button variant="brand" onClick={() => go()}>Book</Button>
    <img src="https://example.com/a.jpg" alt="Kiln" style={{ aspectRatio: "16/9" }} />
  </div>
  <HeroBlock title="Kiln days" actions={<><Button>Shop</Button></>} />
  <Carousel label="Glazes">{glazes.map((g) => <Cover key={g.id} title={g.name} />)}</Carousel>
</Section>`);
  assert.ok(read && read.doc, read && read.error);
  const sec = read.doc.frames[0].root.children[0];
  assert.equal(shape(sec), "Section(Group(Button,Image),HeroBlock(Slot(Button)),Carousel(Cover,Cover,Cover,Cover,Cover))");
  const group = sec.children[0];
  assert.deepEqual([group.props.direction, group.props.gap, group.style.padding], ["row", "sm", "md"]);
  assert.equal(group.children[1].props.ratio, "16:9");
  assert.ok(read.report.some((l) => /onClick is a handler/.test(l)));
  assert.ok(read.report.some((l) => /came in as 5 sample Cover/.test(l)));
});

test("pasting tells JSON, JSX and nonsense apart", () => {
  assert.equal(readLayout('[{ "type": "Heading", "props": { "children": "Hi" } }]').doc.frames[0].root.children[0].type, "Heading");
  assert.equal(readLayout("{/* lead */} <Badge>New</Badge>").doc.frames[0].root.children[0].type, "Badge");
  assert.match(readLayout("not a layout").error, /isn't JSON, JSX or a builder link/);
  assert.match(readLayout("<Card><Stack></Card>").error, /can't be read/);
});

test("convert turns one container into another, keeping what's in it, its name, place and id", () => {
  const h = make("Heading"), t = make("Text");
  const section = make("Section", {}, [h, t]);
  section.name = "Intro";
  const d = doc(section);
  assert.equal(ops.convert(d, section.id, "Group"), section.id);
  const g = locate(d, section.id).node;
  assert.equal(g.type, "Group");
  assert.equal(g.name, "Intro");
  assert.deepEqual(g.children.map((c) => c.id), [h.id, t.id]);
  assert.equal(g.props.direction, "column", "a Group comes laid out");
  assert.equal(g.style.padding, "lg", "with the padding a band had");
  assert.equal(ops.convert(d, section.id, "Section"), section.id);
  assert.equal(locate(d, section.id).node.type, "Section");
  const row = make("Inline", {}, [make("Button")]);
  const d2 = doc(row);
  ops.convert(d2, row.id, "Group");
  assert.equal(locate(d2, row.id).node.props.direction, "row", "an Inline becomes a row");
  assert.equal(ops.convert(d2, row.id, "Heading"), null, "only containers turn into containers");
  assert.equal(ops.convert(d2, h.id, "Group"), null, "something not there turns into nothing");
});

test("in a structured frame, grouping or wrapping gives a Group auto layout", () => {
  const a = make("Heading"), b = make("Text");
  const d = doc(make("Group", { direction: "column", gap: "md" }, [a, b], { padding: "md" }));
  d.frames[0].mode = "structured";
  const g = ops.group(d, [a.id, b.id]);
  const box = locate(d, g).node;
  assert.ok(box.props.direction && box.props.gap && box.style.padding, `a new Group in a structured frame is laid out, got ${JSON.stringify([box.props, box.style])}`);
  const w = ops.wrap(d, a.id, "Group");
  assert.ok(locate(d, w).node.props.direction, "and so is a wrap in a Group");
  const free = doc(make("Heading"));
  const g2 = ops.group(free, [free.frames[0].root.children[0].id]);
  assert.equal(locate(free, g2).node.props.direction, undefined, "a freeform frame's Group is left to the person");
});
