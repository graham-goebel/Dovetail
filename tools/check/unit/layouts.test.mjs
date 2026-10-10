/* The layouts library (model/layouts.js) and the assistant's tools for it:
   every layout reads back as known components, takes the content it's
   given, and lands through insert_layout. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { META } from "../../../assets/builder/config.js";
import { jsxNodes, readJsxElements } from "../../../assets/builder/model/paste.js";
import { emptyDoc, locate, make } from "../../../assets/builder/model/tree.js";
import { KINDS, LAYOUTS, findLayouts, layoutById } from "../../../assets/builder/model/layouts.js";
import { TOOLS, runTool, systemPrompt } from "../../../assets/builder/model/agent.js";

const read = (jsx) => jsxNodes(readJsxElements(jsx), []);
const types = (nodes, out = []) => { nodes.forEach((n) => { out.push(n.type); types(n.children || [], out); }); return out; };
const text = (nodes) => JSON.stringify(nodes);

test("every layout has an id, a kind, a mood, a when and its fields, and the ids are unique", () => {
  const ids = new Set();
  for (const l of LAYOUTS) {
    assert.ok(l.id && l.kind && l.name && l.mood && l.when && l.fields.length, l.id);
    assert.ok(!ids.has(l.id), "duplicate " + l.id);
    ids.add(l.id);
  }
  assert.ok(KINDS.includes("hero") && KINDS.includes("cta"));
});

test("every layout reads back as components the builder knows, with sample copy when given nothing", () => {
  for (const l of LAYOUTS) {
    const nodes = read(l.jsx({}));
    assert.equal(nodes.length, 1, l.id + " is one section");
    for (const t of types(nodes)) assert.ok(t === "Slot" || META[t], l.id + " uses " + t);
    assert.ok(/Stoneware|Fern|Fired|Workshops|kitchen|How long/.test(text(nodes)), l.id + " has sample copy");
  }
});

test("a layout takes the content it's given, quotes and all, and fills the rest", () => {
  const nodes = read(layoutById("hero-split").jsx({ title: "Say \"hello\" to <calm>", action: "Start" }));
  const hero = nodes[0];
  assert.equal(hero.props.title, "Say \"hello\" to <calm>");
  assert.equal(hero.props.eyebrow, "New season", "a field left out keeps its sample");
  assert.match(text(hero.children), /Start/);
  const stats = read(layoutById("stats-band").jsx({ stats: [{ value: "99%", label: "On time" }] }))[0];
  assert.deepEqual(stats.props.stats, [{ value: "99%", label: "On time" }]);
  const show = read(layoutById("showcase-coverflow").jsx({ slides: [{ title: "Oak" }, { title: "Ash" }] }))[0];
  assert.deepEqual(types([show]).filter((t) => t === "Cover").length, 2);
});

test("layouts can be found by kind and by words", () => {
  assert.ok(findLayouts("", "cta").every((l) => l.kind === "cta"));
  assert.ok(findLayouts("moving").some((l) => l.id === "showcase-marquee"));
  assert.equal(findLayouts("").length, LAYOUTS.length);
});

function harness() {
  const doc = emptyDoc();
  const band = make("Section", {}, [make("Heading", { children: "Hello" })]);
  doc.frames[0].root.children.push(band);
  const api = {
    doc: () => doc, selection: () => [band.id],
    insert: (parent, index, nodes) => { (parent ? locate(doc, parent).node : doc.frames[0].root).children.push(...nodes); return nodes.map((n) => n.id); },
    replace: (id, nodes) => { const kids = doc.frames[0].root.children; const i = kids.findIndex((n) => n.id === id); kids.splice(i, 1, ...nodes); return nodes.map((n) => n.id); },
    batch: (fn) => fn(),
  };
  return { doc, band, api };
}

test("search_layouts lists them with their fields; insert_layout adds or swaps one in", () => {
  assert.ok(TOOLS.some((t) => t.name === "search_layouts") && TOOLS.some((t) => t.name === "insert_layout"));
  const { doc, band, api } = harness();
  const found = runTool(api, { name: "search_layouts", input: { kind: "hero" } });
  assert.ok(found.ok && /hero-split/.test(found.result) && /Fields:/.test(found.result) && !/cta-brand/.test(found.result));
  const added = runTool(api, { name: "insert_layout", input: { id: "cta-dark", content: { title: "Come and see us" } } });
  assert.ok(added.ok, added.result);
  assert.equal(added.change.value, "Dark close");
  assert.equal(doc.frames[0].root.children.at(-1).type, "CtaBlock");
  const swapped = runTool(api, { name: "insert_layout", input: { id: "hero-brand", replace: band.id, content: { title: "Loud and proud" } } });
  assert.ok(swapped.ok, swapped.result);
  assert.equal(doc.frames[0].root.children[0].type, "HeroBlock");
  assert.equal(doc.frames[0].root.children[0].props.title, "Loud and proud");
  assert.equal(runTool(api, { name: "insert_layout", input: { id: "nope" } }).ok, false);
});

test("insert_layout runs in a batch, and the brief points at the library", () => {
  const { doc, api } = harness();
  const r = runTool(api, { name: "batch", input: { calls: [{ name: "insert_layout", input: { id: "features-cards" } }, { name: "insert_layout", input: { id: "faq" } }] } });
  assert.ok(r.ok, r.result);
  assert.deepEqual(doc.frames[0].root.children.slice(-2).map((n) => n.type), ["FeatureGridBlock", "FaqBlock"]);
  assert.match(systemPrompt(), /search_layouts/);
});
