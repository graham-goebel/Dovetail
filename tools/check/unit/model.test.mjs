/* The builder's document model on its own: building nodes, the operations
   on a tree, the cleaning that guards saves, links and imports, and pasted
   JSON and JSX. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { make, makeFrame, locate, ops, cleanNode, clean, constrain } from "../../../assets/builder/model/tree.js";
import { readLayout, readLiteral, readJsxElements } from "../../../assets/builder/model/paste.js";
import { encode, decode, cleanPanels } from "../../../assets/builder/model/share.js";

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

test("any layer keeps the name it was given, trimmed and at most 60 characters", () => {
  assert.equal(cleanNode({ type: "Button", name: "  Primary CTA ", props: {} }, []).name, "Primary CTA");
  assert.equal(cleanNode({ type: "Image", name: "Logo", props: {} }, []).name, "Logo");
  assert.equal(cleanNode({ type: "Group", name: "x".repeat(80), props: {}, children: [] }, []).name.length, 60);
  assert.equal(cleanNode({ type: "Text", name: "   ", props: {} }, []).name, undefined, "a blank name goes");
  assert.equal(cleanNode({ type: "Text", name: 42, props: {} }, []).name, undefined, "a name is text");
});

test("a frame keeps its guides, each across or down at a whole pixel, and a column count from 1 to 24", () => {
  const f = clean({ frames: [{ name: "A", width: 800, height: 600, guides: [{ x: 120.4 }, { y: 40 }, { x: 1, y: 2 }, { x: "no" }, null, { y: -5 }], columns: 6 }] }, []).frames[0];
  assert.deepEqual(f.guides, [{ x: 120 }, { y: 40 }, { y: 0 }]);
  assert.equal(f.columns, 6);
  const g = clean({ frames: [{ name: "B", width: 800, height: 600, guides: Array.from({ length: 80 }, (_, i) => ({ x: i })), columns: 30 }] }, []).frames[0];
  assert.equal(g.guides.length, 60, "at most sixty guides");
  assert.equal(g.columns, undefined, "more than 24 columns isn't kept");
});

test("constraints: kept on a free layer, one of the set, never the default", () => {
  const report = [];
  const free = (style) => cleanNode({ type: "Button", props: {}, style: Object.assign({ x: 10, y: 10 }, style) }, report).style;
  assert.equal(free({ ch: "right", cv: "bottom" }).ch, "right");
  assert.equal(free({ ch: "scale", cv: "center" }).cv, "center");
  assert.equal(free({ ch: "left" }).ch, undefined, "left is the default, so it isn't stored");
  assert.equal(free({ cv: "sideways" }).cv, undefined);
  assert.ok(report.some((l) => /cv is one of bottom, both, center, scale/.test(l)));
  assert.equal(cleanNode({ type: "Button", props: {}, style: { ch: "right" } }, []).style.ch, undefined, "a layer in the flow has none");
});

test("constrain moves and sizes free layers from where they were, by their constraints", () => {
  const node = (id, style) => ({ id, type: "Button", props: {}, style });
  const base = { width: 400, height: 400, mode: "free", root: { id: "root", children: [
    node("l", { x: 10, y: 10, fw: 20, fh: 10 }), node("r", { x: 70, y: 80, fw: 20, fh: 10, ch: "right", cv: "bottom" }),
    node("c", { x: 40, y: 45, fw: 20, fh: 10, ch: "center", cv: "center" }), node("b", { x: 10, y: 10, fw: 80, fh: 10, ch: "both" }),
    node("s", { x: 20, y: 20, fw: 40, fh: 20, ch: "scale", cv: "scale" }), node("a", { x: 50, y: 10, ch: "right" })] } };
  const frame = JSON.parse(JSON.stringify(base));
  frame.width = 800; frame.height = 600;
  const moved = constrain(frame, base, 4, (id) => (id === "a" ? { width: 60, height: 40 } : null));
  const at = (id) => frame.root.children.find((c) => c.id === id).style;
  assert.equal(moved, 5, "the default layer isn't touched");
  assert.deepEqual([at("l").x, at("l").y], [10, 10]);
  assert.deepEqual([at("r").x, at("r").y], [170, 130], "right and bottom keep their distance to those edges");
  assert.deepEqual([at("c").x, at("c").y], [90, 70], "centre keeps its offset from the middle");
  assert.deepEqual([at("b").x, at("b").fw], [10, 180], "left and right stretch with the width");
  assert.deepEqual([at("s").x, at("s").y, at("s").fw, at("s").fh], [40, 30, 80, 30], "scale moves and grows in proportion");
  assert.equal(at("a").x, 150, "a layer with no size of its own still keeps to the right");
  /* Many small steps land where one does: each works from base. */
  const step = JSON.parse(JSON.stringify(base));
  for (let w = 401; w <= 800; w++) { step.width = w; constrain(step, base, 4, () => null); }
  assert.equal(step.root.children.find((c) => c.id === "r").style.x, 170);
  assert.equal(constrain(Object.assign({}, frame, { mode: "structured" }), base, 4), 0, "a structured frame has no free layers to keep");
});

test("a free layer's own opacity is a whole percent below 100", () => {
  const report = [];
  assert.equal(cleanNode({ type: "Text", props: { children: "Hi" }, style: { alpha: 37 } }, report).style.alpha, 37);
  assert.equal(cleanNode({ type: "Text", props: { children: "Hi" }, style: { alpha: 0 } }, report).style.alpha, 0, "0% is allowed");
  for (const bad of [100, -1, 12.5, "50"]) assert.equal(cleanNode({ type: "Text", style: { alpha: bad } }, report).style.alpha, undefined, `alpha ${JSON.stringify(bad)} goes`);
  assert.ok(report.some((l) => /alpha is a whole percent from 0 to 99/.test(l)));
});

test("a free layer's own size is whole 4px steps, and its turn whole degrees", () => {
  const report = [];
  const n = cleanNode({ type: "Button", props: { children: "Go" }, style: { x: 2, y: 3, fw: 30, fh: 12, rot: -45 } }, report);
  assert.deepEqual([n.style.fw, n.style.fh, n.style.rot], [30, 12, -45]);
  assert.equal(cleanNode({ type: "Button", style: { rot: 180 } }, report).style.rot, 180, "a half turn is 180");
  for (const bad of [{ fw: 0 }, { fh: 2.5 }, { fw: "30" }, { rot: -180 }, { rot: 12.5 }, { rot: 400 }]) {
    const out = cleanNode({ type: "Button", style: bad }, report).style;
    assert.ok(out.fw === undefined && out.fh === undefined && out.rot === undefined, `${JSON.stringify(bad)} goes`);
  }
  assert.equal(cleanNode({ type: "Button", style: { rot: 0 } }, []).style.rot, undefined, "no turn stores nothing");
  assert.ok(report.some((l) => /fw is a whole number of --dt-space-inset-2xs steps/.test(l)) && report.some((l) => /rot is whole degrees/.test(l)));
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

test("a frame keeps its auto layout, clip and scroll, and drops what they don't take", () => {
  const f = makeFrame("Home", "desktop");
  f.flow = { direction: "row", gap: "group", align: "center", justify: "space-between", wrap: true, padding: "md", colour: "red" };
  f.clip = true;
  f.scroll = "y";
  const report = [];
  const out = clean({ frames: [f], active: f.id }, report).frames[0];
  assert.deepEqual(out.flow, { direction: "row", gap: "group", align: "center", justify: "space-between", wrap: true, padding: "md" });
  assert.equal(out.clip, true);
  assert.equal(out.scroll, "y");
  const bad = makeFrame("Bad", "desktop");
  bad.flow = { direction: "diagonal", gap: "huge", padding: "12px" };
  bad.clip = "yes";
  bad.scroll = "both";
  const out2 = clean({ frames: [bad], active: bad.id }).frames[0];
  assert.equal(out2.flow, undefined, "nothing valid, no flow");
  assert.equal(out2.clip, undefined);
  assert.equal(out2.scroll, undefined);
});

test("a width or height relative to the parent or the screen is kept; anything else is dropped", () => {
  const n = make("Heading", {}, undefined, { rw: "50%", rh: "40vh" });
  const report = [];
  const out = cleanNode(n, report);
  assert.equal(out.style.rw, "50%");
  assert.equal(out.style.rh, "40vh");
  assert.equal(report.length, 0);
  for (const bad of ["0%", "50px", "1000vw", "12.5vw", 50, "vw"]) {
    const r = [];
    const o = cleanNode(make("Heading", {}, undefined, { rw: bad }), r);
    assert.equal(o.style.rw, undefined, JSON.stringify(bad) + " is dropped");
    assert.equal(r.length, 1, JSON.stringify(bad) + " is reported");
  }
});

test("saved panel widths are kept in range, in steps of 4, with the defaults for anything else", () => {
  assert.deepEqual(cleanPanels(undefined), { left: 344, right: 312, leftClosed: false, rightClosed: false });
  assert.deepEqual(cleanPanels({ left: 401, right: 9999, leftClosed: true, rightClosed: "yes" }), { left: 400, right: 480, leftClosed: true, rightClosed: false });
  assert.deepEqual(cleanPanels({ left: 10, right: NaN }), { left: 280, right: 312, leftClosed: false, rightClosed: false });
  assert.deepEqual(cleanPanels({ left: "500" }), { left: 344, right: 312, leftClosed: false, rightClosed: false });
});

/* ------------------------------------------------- components that travel */

test("loadLibrary keeps a component's revision and the one before, cleaned", async () => {
  const { loadLibrary } = await import("../../../assets/builder/model/share.js");
  const node = make("Group", { direction: "column" }, [make("Button", { children: "Go" })], { padding: "md" });
  const prev = make("Group", { direction: "column" }, [make("Button", { children: "Old" })], { padding: "md" });
  const lib = loadLibrary({ components: [
    { id: "c1", name: "Card", node, prev, tokens: ["--dt-space-inset-md", "not-a-token"], rev: 3, made: 5 },
    { id: "c2", name: "Loose", node, rev: "two" },
    { id: "bad id!", name: "Nope", node },
    { id: "c3", name: "Empty", node: { type: "NotAComponent" } },
  ] });
  assert.deepEqual(lib.components.map((c) => [c.id, c.rev, c.tokens, !!c.prev]), [["c1", 3, ["--dt-space-inset-md"], true], ["c2", 1, [], false]]);
  assert.equal(lib.components[0].prev.children[0].props.children, "Old");
});

test("componentsFor picks the components a document's instances use, at the current revision and without uploads", async () => {
  const { componentsFor } = await import("../../../assets/builder/model/share.js");
  const node = make("Group", { direction: "column" }, [make("Image", { src: "data:image/png;base64,AAAA", alt: "x" }), make("Button", { children: "Go" })], { padding: "md" });
  const library = { components: [
    { id: "c1", name: "Card", node, prev: node, tokens: ["--dt-space-inset-md"], rev: 2, made: 1 },
    { id: "c2", name: "Unused", node, tokens: [], rev: 1, made: 1 },
  ] };
  const f = makeFrame("Home", "desktop");
  f.root.children = [make("Section", {}, [Object.assign(make("Group", { direction: "column" }), { inst: { of: "c1", rev: 1 } })])];
  const got = componentsFor([{ frames: [f], active: f.id }, null], library);
  assert.deepEqual(got.map((c) => [c.id, c.rev, "prev" in c]), [["c1", 2, false]]);
  assert.equal(got[0].node.children[0].props.src, undefined, "an uploaded picture stays behind");
  assert.equal(library.components[0].node.children[0].props.src.slice(0, 5), "data:", "the library's own copy is untouched");
  assert.deepEqual(componentsFor([{ frames: [f] }], null), []);
});

test("absorbComponents merges a file's components into a library and keeps what was there", async () => {
  const { absorbComponents } = await import("../../../assets/builder/model/share.js");
  const { makeStore, localBackend } = await import("../../../assets/builder/model/store.js");
  window.localStorage.removeItem("dovetail-builder-store");
  const store = makeStore(localBackend());
  const node = make("Group", { direction: "column" }, [make("Button", { children: "Go" })], { padding: "md" });
  await store.saveLibrary({ images: [{ id: "p1", name: "Pic", src: "data:image/png;base64,AAAA" }], components: [{ id: "c1", name: "Mine", node, tokens: [], rev: 2, made: 1 }] }, "f:a");
  const merged = await absorbComponents(store, "f:a", [{ id: "c1", name: "Theirs", node, rev: 1 }, { id: "c2", name: "New", node, rev: 1 }, { id: "bad!", name: "x", node }]);
  assert.deepEqual(merged.components.map((c) => [c.id, c.name, c.rev]), [["c1", "Mine", 2], ["c2", "New", 1]]);
  assert.equal(merged.images.length, 1, "the pictures already there stay");
  assert.deepEqual((await store.loadLibrary("f:a")).components.map((c) => c.id), ["c1", "c2"], "and it's saved");
  assert.equal((await absorbComponents(store, "f:b", [])), null, "nothing to take in reads the library as it is");
});
