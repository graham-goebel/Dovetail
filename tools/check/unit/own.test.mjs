/* The assistant's tools for what the builder and the file already have:
   templates (insert_template) and the file's own components
   (list_components, insert_instance, make_component). Run with
   npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, locate, make } from "../../../assets/builder/model/tree.js";
import { TOOLS, runTool, systemPrompt } from "../../../assets/builder/model/agent.js";

function harness() {
  const doc = emptyDoc();
  const band = make("Section", {}, [make("Heading", { children: "Hello" })]);
  doc.frames[0].root.children.push(band);
  const card = make("Card", { title: "Kiln tour", description: "Saturdays at ten." }, null, { padding: "md", radius: "lg" });
  const library = { components: [{ id: "c1", name: "Tour card", node: card, tokens: ["--dt-space-md"], rev: 3 }] };
  let sel = [band.id];
  const api = {
    doc: () => doc, selection: () => sel, library: () => library,
    insert: (parent, index, nodes) => {
      const into = parent ? locate(doc, parent).node : doc.frames[0].root;
      into.children.splice(index == null ? into.children.length : index, 0, ...nodes);
      return nodes.map((n) => n.id);
    },
    replace: (id, nodes) => { const at = locate(doc, id); at.parent.children.splice(at.index, 1, ...nodes); return nodes.map((n) => n.id); },
    setProp: (ids, name, value) => { ids.forEach((id) => { locate(doc, id).node.props[name] = value; }); return true; },
    batch: (fn) => fn(),
  };
  return { doc, band, library, api, setSel: (s) => { sel = s; } };
}

test("the four tools are offered, and the brief says to reuse what the file has", () => {
  for (const n of ["insert_template", "list_components", "insert_instance", "make_component"]) assert.ok(TOOLS.some((t) => t.name === n), n);
  assert.ok(TOOLS.length <= 40, "the assistant function takes 40 tools at most");
  assert.match(systemPrompt(), /list_components/);
  assert.match(systemPrompt(), /insert_template/);
});

test("insert_template puts a template's sections at the end of the frame, or in a frame of its own", () => {
  const { doc, api } = harness();
  const r = runTool(api, { name: "insert_template", input: { id: "landing" } });
  assert.ok(r.ok, r.result);
  const kids = doc.frames[0].root.children.map((n) => n.type);
  assert.deepEqual(kids, ["Section", "HeroBlock", "FeatureGridBlock", "StatsBlock", "TestimonialBlock", "CtaBlock"]);
  assert.match(r.result, /sample copy/);
  assert.equal(runTool(api, { name: "insert_template", input: { id: "blank" } }).ok, false, "the blank frame isn't a template");
  assert.equal(runTool(api, { name: "insert_template", input: { id: "store", parent: "nope" } }).ok, false);
  const asked = [];
  api.addTemplate = (id) => { asked.push(id); return "f2"; };
  const own = runTool(api, { name: "insert_template", input: { id: "store", new_frame: true } });
  assert.ok(own.ok && /"frame":"f2"/.test(own.result));
  assert.deepEqual(asked, ["store"]);
  api.needsPlan = () => true;
  assert.match(runTool(api, { name: "insert_template", input: { id: "store", new_frame: true } }).result, /propose_plan/, "a new frame waits for a plan");
});

test("list_components names the file's own components and counts their instances here", () => {
  const { api } = harness();
  const r = runTool(api, { name: "list_components", input: {} });
  assert.ok(r.ok && /^c1 · Tour card · a Card/.test(r.result) && /not on this page/.test(r.result), r.result);
  runTool(api, { name: "insert_instance", input: { id: "c1", parent: "root" } });
  assert.match(runTool(api, { name: "list_components", input: {} }).result, /1 instance on this page/);
  const none = runTool({ doc: api.doc, library: () => ({}) }, { name: "list_components", input: {} });
  assert.match(none.result, /no components of its own yet/);
});

test("insert_instance puts down a linked instance, beside or in place of a layer, and never inside itself", () => {
  const { doc, band, api, setSel } = harness();
  const r = runTool(api, { name: "insert_instance", input: { id: "c1", parent: band.id } });
  assert.ok(r.ok, r.result);
  const inst = band.children.at(-1);
  assert.equal(inst.type, "Card");
  assert.deepEqual(inst.inst, { of: "c1", rev: 3 });
  assert.equal(inst.name, "Tour card");
  assert.equal(inst.props.title, "Kiln tour");
  assert.equal(inst.style.x, undefined);
  setSel([inst.id]);
  const inside = runTool(api, { name: "insert_instance", input: { id: "c1", parent: inst.id } });
  assert.equal(inside.ok, false, "a component can't hold itself");
  const swapped = runTool(api, { name: "insert_instance", input: { id: "c1", replace: band.children[0].id } });
  assert.ok(swapped.ok, swapped.result);
  assert.equal(band.children[0].inst.of, "c1");
  assert.equal(runTool(api, { name: "insert_instance", input: { id: "nope" } }).ok, false);
  const b = runTool(api, { name: "batch", input: { calls: [{ name: "insert_instance", input: { id: "c1", parent: "root" } }, { name: "set_text", input: { id: band.children[0].id, text: "Open studio" } }] } });
  assert.ok(b.ok, b.result);
  assert.equal(doc.frames[0].root.children.at(-1).inst.of, "c1");
});

test("make_component hands the layer to the app, and says what stops it", () => {
  const { band, api } = harness();
  assert.equal(runTool(api, { name: "make_component", input: { id: band.id, name: "Band" } }).ok, false, "without the app it can't");
  const asked = [];
  api.makeComponent = (id, name) => { asked.push([id, name]); return name === "Bad" ? { error: "It isn't built on any tokens yet." } : { id: "c2", name, tokens: ["--dt-space-lg"] }; };
  const r = runTool(api, { name: "make_component", input: { id: band.id, name: "Welcome band" } });
  assert.ok(r.ok && /"component":"c2"/.test(r.result), r.result);
  assert.deepEqual(asked, [[band.id, "Welcome band"]]);
  const bad = runTool(api, { name: "make_component", input: { id: band.id, name: "Bad" } });
  assert.ok(!bad.ok && /tokens/.test(bad.result));
  assert.equal(runTool(api, { name: "make_component", input: { id: band.id, name: "  " } }).ok, false);
});
