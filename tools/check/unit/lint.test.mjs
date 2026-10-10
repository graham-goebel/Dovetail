/* The assistant's checks (model/lint.js): the layers' own findings, and
   the rows the change card shows. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, emptyDoc } from "../../../assets/builder/model/tree.js";
import { checksFrom, checksText, lintFrame, needsWork } from "../../../assets/builder/model/lint.js";

function frameWith(children) {
  const d = emptyDoc();
  d.frames[0].mode = "structured";
  d.frames[0].root.children = children;
  return d.frames[0];
}

test("a tidy frame has no findings", () => {
  const f = frameWith([make("Section", {}, [make("Heading", { level: 1, children: "Made to last" }), make("Text", { children: "Stoneware from small workshops." }), make("Button", { children: "Shop" }), make("Button", { variant: "secondary", children: "Our story" })])]);
  assert.deepEqual(lintFrame(f), []);
});

test("labels, alt text and icon buttons", () => {
  const f = frameWith([make("Input", {}), make("Image", { src: "x.jpg" }), make("IconButton", {}), make("Input", { label: "Email" })]);
  const kinds = lintFrame(f).map((x) => x.level + ":" + x.text);
  assert.equal(kinds.filter((k) => /no label/.test(k)).length, 2, "the Input without a label and the IconButton");
  assert.ok(kinds.some((k) => k.startsWith("fail:") && /Input has no label/.test(k)));
  assert.ok(kinds.some((k) => k.startsWith("warn:") && /no alt text/.test(k)));
});

test("headings in order, and one primary button per section", () => {
  const f = frameWith([
    make("Section", {}, [make("Heading", { level: 1, children: "A" }), make("Heading", { level: 3, children: "B" }), make("Button", { children: "One" }), make("Button", { children: "Two" })]),
    make("Section", {}, [make("Heading", { level: 1, children: "C" }), make("Button", { children: "Three" })]),
  ]);
  const t = lintFrame(f).map((x) => x.text);
  assert.ok(t.some((x) => /jumps from level 1 to 3/.test(x)));
  assert.ok(t.some((x) => /second level 1 heading/.test(x)));
  assert.equal(t.filter((x) => /More than one primary button/.test(x)).length, 1, "only the section with two");
});

test("a block is a section of its own for the one-primary-button rule", () => {
  /* Blocks hold their actions in a slot; make() leaves blocks childless, so
     they're written out. */
  const block = (type, id, label) => ({ id, type, props: {}, style: {}, children: [{ id: id + "s", type: "Slot", props: { name: "actions" }, style: {}, children: [make("Button", { children: label })] }] });
  const f = frameWith([block("HeroBlock", "h1", "Start"), block("CtaBlock", "c1", "Shop")]);
  assert.equal(lintFrame(f).filter((x) => /More than one primary button/.test(x.text)).length, 0, "one primary in each block is fine");
});

test("placeholder and empty copy", () => {
  const f = frameWith([make("Text", { children: "Lorem ipsum dolor" }), make("Heading", { children: "  " }), make("Card", { title: "TODO" })]);
  assert.equal(lintFrame(f).filter((x) => x.kind === "copy").length, 3);
});

test("the rows put the drawn checks and the findings together", () => {
  const f = frameWith([make("Input", {})]);
  const found = lintFrame(f);
  const rows = checksFrom(f, found, {
    here: { contrast: [{ id: "a", ratio: 2.1, need: 4.5, text: "Faint" }], overflow: [] },
    narrow: { contrast: [], overflow: [], scrolls: false },
    dark: { contrast: [], overflow: [] },
  });
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by.contrast.status, "fail");
  assert.match(by.contrast.detail, /2\.1:1, needs 4\.5:1/);
  assert.deepEqual(by.contrast.ids, ["a"]);
  assert.equal(by.narrow.status, "pass");
  assert.equal(by.dark.status, "pass");
  assert.equal(by.a11y.status, "fail");
  assert.equal(by.copy.status, "pass");
  assert.equal(needsWork(rows), 2);
  assert.equal(by.usage.status, "pass");
  assert.match(checksText(f, rows), /- FAIL Text contrast is too low in 1 place: .* \[layers: a\]/);
});

test("a view that couldn't be drawn is skipped with its reason", () => {
  const f = frameWith([]);
  const rows = checksFrom(f, [], {}, { narrow: "A freeform frame places layers by position, so it isn't reflowed." });
  const narrow = rows.find((r) => r.id === "narrow");
  assert.equal(narrow.status, "skip");
  assert.match(narrow.detail, /freeform/);
  assert.equal(needsWork(rows), 0);
});

test("the components' own rules: danger only for destructive actions, no card in a card, no section in a section, one callout per section", () => {
  const f = frameWith([
    make("Section", {}, [
      make("Button", { variant: "danger", children: "Learn more" }),
      make("Button", { variant: "danger", children: "Delete project" }),
      make("Card", {}, [make("Card", {})]),
      make("Section", {}),
      make("Callout", {}), make("Callout", {}),
    ]),
  ]);
  const t = lintFrame(f).filter((x) => x.kind === "usage").map((x) => x.text);
  assert.equal(t.filter((x) => /isn't a destructive action/.test(x)).length, 1, "Delete project is fine");
  assert.ok(t.some((x) => /card inside a card/.test(x)));
  assert.ok(t.some((x) => /Section inside a Section/.test(x)));
  assert.ok(t.some((x) => /More than one Callout/.test(x)));
  const rows = checksFrom(f, lintFrame(f), {});
  assert.equal(rows.find((r) => r.id === "usage").status, "warn");
});

test("an overflow names the outermost layer that spills, with how far, and counts what it carries", () => {
  const tile = make("Group", {}, [make("Text", { children: "Rent" }), make("Text", { children: "$2,400" })]);
  tile.name = "Spending";
  const f = frameWith([make("Section", {}, [tile])]);
  const [rent, amount] = tile.children;
  const rows = checksFrom(f, [], { narrow: { contrast: [], overflow: [{ id: "root", by: 40 }, { id: tile.id, by: 40 }, { id: rent.id, by: 12 }, { id: amount.id, by: 40 }], scrolls: true } });
  const narrow = rows.find((r) => r.id === "narrow");
  assert.equal(narrow.status, "fail");
  assert.equal(narrow.detail, "Spending runs 40px past the edge (with 2 layers inside)");
  assert.deepEqual(narrow.ids, [tile.id, rent.id, amount.id], "the outermost first, and never the frame itself");
});

test("decoration over text warns, names the text and the shape, and says at which width", () => {
  const glow = make("Shape", { shape: "ellipse" });
  glow.name = "Glow";
  const h = make("Heading", { children: "$284,120" });
  const f = frameWith([make("Group", {}, [glow, h])]);
  const rows = checksFrom(f, [], {
    here: { contrast: [], overflow: [], covered: [] },
    narrow: { contrast: [], overflow: [], scrolls: false, covered: [{ id: h.id, by: glow.id, text: "$284,120" }] },
  });
  const row = rows.find((r) => r.id === "covered");
  assert.equal(row.status, "warn");
  assert.match(row.detail, /^“\$284,120” is under Glow at 390px\. Move the decoration clear/);
  assert.deepEqual(row.ids, [h.id, glow.id]);
  const clear = checksFrom(f, [], { here: { contrast: [], overflow: [], covered: [] } }).find((r) => r.id === "covered");
  assert.equal(clear.status, "pass");
  assert.equal(checksFrom(f, [], {}).find((r) => r.id === "covered"), undefined, "no row when nothing was drawn");
});
