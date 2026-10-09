/* Edits by layer name (model/nameedit.js): read as Markdown or JSON,
   matched by name, text or type, and turned into plain changes. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, emptyDoc } from "../../../assets/builder/model/tree.js";
import { countOf, opsOf, planEdit, readEdit, sourceOf } from "../../../assets/builder/model/nameedit.js";

function page() {
  const d = emptyDoc();
  const f = d.frames[0];
  f.name = "Ledger";
  const glow = make("Shape", { shape: "ellipse" }); glow.style = { blur: "lg" };
  const num = make("Heading", { children: "$284,120", size: "display-lg" });
  const hero = make("Group", {}, [glow, num]); hero.name = "Hero"; hero.style = { padding: "lg" };
  const chipA = make("Group", {}, [make("Text", { children: "Live" })]); chipA.name = "Chip";
  const chipB = make("Group", {}, [make("Text", { children: "Oct 9" })]); chipB.name = "Chip";
  const bar = make("Group", {}, [chipA]); bar.name = "Top bar";
  const spend = make("Group", {}, [make("Text", { children: "Rent" }), make("Text", { children: "$2,400" })]); spend.name = "Spending";
  const bento = make("Group", {}, []); bento.name = "Bento";
  hero.children.push(chipB);
  f.root.children = [bar, hero, spend, bento];
  return { d, f, glow, num, hero, chipA, chipB, spend, bento };
}

const MD = `## Edit Ledger
- Hero: padding xl
- Glow: z behind
- "$284,120": size display-2xl
- remove Spending
- add Heading "This week" to Bento, first
- Chip: radius pill`;

test("only an edit is read as one: a Markdown heading and list, or JSON with changes", () => {
  assert.equal(readEdit('{ "frames": [] }'), null);
  assert.equal(readEdit("<Section />"), null);
  assert.equal(readEdit("- Hero: padding xl"), null, "a list with no Edit heading isn't an edit");
  const e = readEdit(MD);
  assert.equal(e.frame, "Ledger");
  assert.equal(e.items.length, 6);
  assert.deepEqual(e.items[0], { layer: "Hero", byText: false, set: { padding: "xl" } });
  assert.equal(e.items[2].byText, true);
  assert.deepEqual(e.items[4].add, [{ type: "Heading", text: "This week" }]);
  assert.equal(e.items[4].at, 0);
  const j = readEdit(JSON.stringify({ edit: "Ledger", changes: [{ layer: "Hero", style: { padding: "xl" } }, { layer: "Spending", remove: true }] }));
  assert.equal(j.format, "json");
  assert.deepEqual(j.items[0].set, { padding: "xl" });
});

test("each change is matched by name, text or type, says what it does, and a shared name asks which one", () => {
  const { d, glow, num, hero, chipA, chipB, spend, bento } = page();
  const plan = planEdit(d, readEdit(MD));
  const [pad, z, size, del, add, chip] = plan.rows;
  assert.equal(pad.icon, "sliders"); assert.equal(pad.detail, "Padding lg → xl"); assert.equal(pad.via, "name");
  assert.equal(z.icon, "layers2"); assert.deepEqual(z.ids, [glow.id], "Glow is the name Layers works out for a blurred shape");
  assert.equal(size.icon, "fit"); assert.equal(size.via, "text"); assert.deepEqual(size.ids, [num.id]);
  assert.equal(size.detail, "Size display-lg → display-2xl");
  assert.equal(del.icon, "trash"); assert.match(del.detail, /^Removed, with the 2 layers inside$/);
  assert.equal(add.icon, "plus"); assert.equal(add.title, "“This week”"); assert.equal(add.detail, "New Heading, first in Bento");
  assert.equal(chip.icon, "ask"); assert.deepEqual(chip.choices.map((c) => c.id), [chipA.id, chipB.id]);
  assert.deepEqual(chip.choices.map((c) => c.path), ["Top bar › Chip", "Hero › Chip"]);
  assert.equal(chip.kindIcon, "sliders", "what it does once one is picked");
  assert.equal(countOf(plan, {}), 5, "the question unanswered isn't counted");
  const ops = opsOf(plan, { [chip.key]: chipB.id });
  assert.equal(countOf(plan, { [chip.key]: chipB.id }), 6);
  assert.deepEqual(ops.find((o) => o.id === hero.id), { op: "set", id: hero.id, group: "style", key: "padding", value: "xl" });
  assert.ok(ops.some((o) => o.op === "remove" && o.id === spend.id));
  assert.ok(ops.some((o) => o.op === "insert" && o.parent === bento.id && o.index === 0 && o.nodes[0].props.children === "This week"));
  assert.ok(ops.some((o) => o.id === chipB.id && o.key === "radius" && o.value === "pill"));
  assert.ok(!opsOf(plan, { [chip.key]: "skip" }).some((o) => o.key === "radius"), "Skip leaves both alone");
});

test("what can't be done says why, and changes nothing", () => {
  const { d } = page();
  const plan = planEdit(d, readEdit("## Edit Ledger\n- Hero: padding huge\n- Nowhere: padding xl\n- Hero: wibble 3\n- just words"));
  assert.deepEqual(plan.rows.map((r) => r.kind), ["none", "none", "none", "none"]);
  assert.match(plan.rows[0].detail, /huge isn't a padding token/);
  assert.match(plan.rows[1].detail, /No layer here/);
  assert.match(plan.rows[2].detail, /Group has no wibble/);
  assert.match(plan.rows[3].detail, /doesn't say which layer/);
  assert.deepEqual(opsOf(plan, {}), []);
});

test("text, cut-short names and enum props", () => {
  const { d, num } = page();
  const plan = planEdit(d, readEdit('## Edit\n- $284,1…: text "$290,000"\n- "$284,120": level 1'));
  assert.equal(plan.rows[0].kind, "text");
  assert.deepEqual(plan.rows[0].ops, [{ op: "set", id: num.id, group: "props", key: "children", value: "$290,000" }]);
  assert.deepEqual(plan.rows[1].ops[0].value, 1, "a number option stays a number");
});

test("the source reads back as Markdown or JSON, and either reads as the same edit", () => {
  const e = readEdit(MD);
  const md = sourceOf(e, "markdown");
  assert.match(md, /^## Edit Ledger\n- Hero: padding xl\n- Glow: z behind\n- "\$284,120": size display-2xl\n- remove Spending\n- add Heading "This week" to Bento, first\n- Chip: radius pill$/);
  const j = readEdit(sourceOf(e, "json"));
  assert.equal(j.items.length, 6);
  const { d } = page();
  assert.deepEqual(planEdit(d, j).rows.map((r) => r.icon), planEdit(d, e).rows.map((r) => r.icon));
});

test("the changes apply to a copy for the preview, and the original is left as it was", async () => {
  const { after } = await import("../../../assets/builder/model/nameedit.js");
  const { d, f, hero, spend, bento, chipB } = page();
  const plan = planEdit(d, readEdit(MD));
  const ops = opsOf(plan, { [plan.rows[5].key]: chipB.id });
  const out = after(d, f.id, ops);
  const kids = out.frame.root.children;
  assert.equal(kids.length, 3, "Spending is gone");
  assert.equal(kids.find((k) => k.id === hero.id).style.padding, "xl");
  assert.equal(kids.find((k) => k.id === bento.id).children[0].props.children, "This week");
  assert.equal(out.ids.length, 6);
  assert.equal(f.root.children.length, 4, "the document itself is untouched");
  assert.equal(hero.style.padding, "lg");
  assert.ok(f.root.children.includes(spend));
});

test("two of a name in the same place read apart by their order", () => {
  const d = emptyDoc();
  const glow = () => { const g = make("Shape", { shape: "ellipse" }); g.style = { blur: "lg" }; return g; };
  const box = make("Group", {}, [glow(), glow()]); box.name = "Hero";
  d.frames[0].root.children = [box];
  const row = planEdit(d, readEdit("## Edit\n- Glow: z behind")).rows[0];
  assert.deepEqual(row.choices.map((c) => c.path), ["Hero › Glow, 1 of 2", "Hero › Glow, 2 of 2"]);
});
