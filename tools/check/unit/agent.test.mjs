/* The assistant's tools (model/agent.js): every value checked against the
   system before it lands, and the practice script's calls. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, emptyDoc, locate } from "../../../assets/builder/model/tree.js";
import { TOOLS, practiceScript, runTool } from "../../../assets/builder/model/agent.js";

function harness() {
  const doc = emptyDoc();
  const hero = make("Section", {}, [make("Heading", { children: "Hello" })]);
  doc.frames[0].root.children.push(hero);
  const log = [];
  const api = {
    doc: () => doc,
    selection: () => [hero.id],
    setStyle: (ids, key, value) => { ids.forEach((id) => { locate(doc, id).node.style[key] = value; }); log.push(["style", key, value]); return true; },
    setProp: (ids, name, value) => { ids.forEach((id) => { locate(doc, id).node.props[name] = value; }); log.push(["prop", name, value]); return true; },
    insert: (parent, index, nodes) => { (parent ? locate(doc, parent).node : hero).children.push(...nodes); return nodes.map((n) => n.id); },
    remove: (ids) => { log.push(["remove", ids]); return true; },
    select: (ids) => log.push(["select", ids]),
    skills: () => [{ name: "brand-review", files: [{ path: "SKILL.md", body: "# Rules" }] }],
  };
  return { doc, hero, api, log };
}

test("the tools each have a name, a description and a schema", () => {
  for (const t of TOOLS) assert.ok(t.name && t.description && t.input_schema && t.input_schema.type === "object", t.name);
});

test("a style must be one of its family's tokens", () => {
  const { hero, api, log } = harness();
  assert.equal(runTool(api, { name: "set_style", input: { ids: [hero.id], family: "surface", value: "#ff0000" } }).ok, false);
  const r = runTool(api, { name: "set_style", input: { ids: [hero.id], family: "surface", value: "brand-muted" } });
  assert.equal(r.ok, true);
  assert.equal(r.change.label, "Fill");
  assert.deepEqual(log[0], ["style", "surface", "brand-muted"]);
  assert.equal(runTool(api, { name: "set_style", input: { ids: ["nope"], family: "surface", value: "brand" } }).ok, false, "unknown layers are refused");
});

test("a prop must be the component's own, and an enum one of its options", () => {
  const { hero, api } = harness();
  const h = hero.children[0].id;
  assert.equal(runTool(api, { name: "set_prop", input: { ids: [h], name: "size", value: "huge" } }).ok, false);
  assert.equal(runTool(api, { name: "set_prop", input: { ids: [h], name: "size", value: "display-md" } }).ok, true);
  assert.equal(runTool(api, { name: "set_prop", input: { ids: [h], name: "children", value: "Made to last." } }).change.label, "Text");
  assert.equal(runTool(api, { name: "set_prop", input: { ids: [h], name: "onClick", value: "x" } }).ok, false);
});

test("inserted JSX is read as pasted code; unknown tags add nothing", () => {
  const { hero, api } = harness();
  const r = runTool(api, { name: "insert_jsx", input: { jsx: "<Button>Go</Button>" } });
  assert.equal(r.ok, true);
  assert.equal(hero.children[hero.children.length - 1].type, "Button");
  assert.equal(runTool(api, { name: "insert_jsx", input: { jsx: "not jsx" } }).ok, false);
});

test("reading the selection, the tokens and a skill", () => {
  const { hero, api } = harness();
  assert.equal(JSON.parse(runTool(api, { name: "read_selection", input: {} }).result)[0].id, hero.id);
  assert.ok(JSON.parse(runTool(api, { name: "list_tokens", input: { family: "radius" } }).result).length > 0);
  assert.equal(runTool(api, { name: "read_skill", input: { name: "brand-review" } }).result, "# Rules");
  assert.equal(runTool(api, { name: "read_skill", input: { name: "brand-review", path: "missing.md" } }).ok, false);
});

test("the practice script turns plain requests into real tool calls", () => {
  const { hero } = harness();
  const script = practiceScript([hero, hero.children[0]]);
  const turn = script({ messages: [{ role: "user", content: "Make it more premium" }] });
  assert.ok(turn.calls.some((c) => c.name === "set_style" && c.input.value === "brand-muted"));
  assert.ok(turn.calls.some((c) => c.name === "set_prop" && c.input.name === "size"));
  assert.equal(practiceScript([])({ messages: [{ role: "user", content: "make it pop" }] }).calls.length, 0);
});
