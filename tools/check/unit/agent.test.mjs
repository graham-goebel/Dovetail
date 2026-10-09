/* The assistant's tools (model/agent.js): every value checked against the
   system before it lands, and the practice script's calls. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, emptyDoc, locate } from "../../../assets/builder/model/tree.js";
import { TOOLS, outline, practiceScript, runTool, systemPrompt, toolsFor } from "../../../assets/builder/model/agent.js";

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
    pages: () => [{ id: "main", name: "Home", current: true }, { id: "p2", name: "Pricing" }],
    loadPage: (id) => Promise.resolve(id === "p2" ? other : null),
    screenshot: (fid, id) => { log.push(["shot", fid, id]); return Promise.resolve({ media_type: "image/jpeg", data: "AAAA", width: 640, height: 900, url: "data:image/jpeg;base64,AAAA" }); },
    componentDoc: (name) => Promise.resolve(name === "Button" ? "# Button\n\nUse one primary button per view." : null),
  };
  const other = emptyDoc();
  other.frames[0].name = "Pricing";
  other.frames[0].root.children.push(make("Section", {}, [make("Heading", { children: "Plans" }), make("Button", { children: "Start" })]));
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

test("the tool list keeps one order, and leaves out screenshot when looking is off", () => {
  const names = TOOLS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, "no tool twice");
  assert.ok(names.length <= 32, "within what the assistant function takes");
  assert.deepEqual(toolsFor({ look: true }).map((t) => t.name), names);
  assert.ok(!toolsFor({ look: false }).some((t) => t.name === "screenshot"));
});

test("the brief is built from the system alone, the same every time", () => {
  const a = systemPrompt(), b = systemPrompt();
  assert.equal(a, b);
  assert.match(a, /Tokens only/);
  assert.match(a, /- Button: /, "lists the components with their purpose");
  assert.match(a, /- surface: base/, "lists each token family's values");
  assert.doesNotMatch(a, /\d{4}-\d{2}-\d{2}T/, "no timestamps to break the cache");
});

test("read_page outlines the page: ids, types, text and tokens, by depth", () => {
  const { doc, hero, api } = harness();
  hero.style.surface = "brand";
  const r = runTool(api, { name: "read_page", input: {} });
  assert.equal(r.ok, true);
  assert.match(r.step, /^Read Home · 2 layers$/);
  const lines = r.result.split("\n");
  assert.match(lines[0], /^Frame ".+" \S+ · free · \d+/);
  assert.match(lines[1], new RegExp("^  - Section · " + hero.id + " · \\{surface:brand\\}$"));
  assert.match(lines[2], /^    - Heading · \S+ · "Hello"/);
  assert.equal(outline(doc, "nope"), "", "a frame that isn't there outlines nothing");
});

test("read_page reads another page, and says when one isn't there", async () => {
  const { api } = harness();
  const r = await runTool(api, { name: "read_page", input: { page: "Pricing" } });
  assert.equal(r.ok, true);
  assert.match(r.result, /Heading · \S+ · "Plans"/);
  assert.match(r.step, /^Read Pricing · 3 layers$/);
  assert.equal(runTool(api, { name: "read_page", input: { page: "Nowhere" } }).ok, false);
});

test("list_pages names the pages and this page's frames", () => {
  const { api } = harness();
  const r = JSON.parse(runTool(api, { name: "list_pages", input: {} }).result);
  assert.deepEqual(r.pages.map((p) => p.name), ["Home", "Pricing"]);
  assert.equal(r.frames[0].layers, 2);
});

test("screenshot returns the picture as an image block, and refuses when looking is off", async () => {
  const { hero, api, log } = harness();
  const r = await runTool(api, { name: "screenshot", input: { id: hero.id } });
  assert.equal(r.ok, true);
  assert.equal(r.result[0].type, "image");
  assert.equal(r.result[0].source.media_type, "image/jpeg");
  assert.match(r.result[1].text, /640×900/);
  assert.equal(log.at(-1)[2], hero.id, "just that layer");
  assert.equal(runTool(api, { name: "screenshot", input: { id: "nope" } }).ok, false);
  assert.equal(runTool({ ...api, screenshot: null }, { name: "screenshot", input: {} }).ok, false);
});

test("components can be searched and read, docs and all", async () => {
  const { api } = harness();
  const found = JSON.parse(runTool(api, { name: "search_components", input: { query: "button" } }).result);
  assert.equal(found[0].name, "Button");
  assert.match(runTool(api, { name: "search_components", input: { query: "" } }).result, /Actions: /);
  const read = await runTool(api, { name: "read_component", input: { name: "Button" } });
  assert.match(read.result, /"name":"variant"/);
  assert.match(read.result, /one primary button per view/);
  assert.equal(runTool(api, { name: "read_component", input: { name: "Blink" } }).ok, false);
});

test("the practice script reads the page and says what's on it", () => {
  const { hero, api } = harness();
  const script = practiceScript([hero]);
  const ask = { messages: [{ role: "user", content: "What's on this page?" }], tools: TOOLS };
  const turn = script(ask);
  assert.equal(turn.calls[0].name, "read_page");
  const read = runTool(api, turn.calls[0]);
  const after = script({ tools: TOOLS, messages: ask.messages.concat([
    { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "read_page", input: {} }] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: read.result }] },
  ]) });
  assert.match(after.text, /1 frame and 2 layers/);
  assert.equal(after.calls.length, 0);
  assert.equal(script({ messages: [{ role: "user", content: "take a look" }], tools: toolsFor({ look: false }) }).calls.length, 0, "no screenshot when looking is off");
});

/* The build tools, against the real tree operations. */
import { ops } from "../../../assets/builder/model/tree.js";
function builder() {
  const h = harness();
  const { doc, api } = h;
  let steps = 0;
  const edit = (fn) => { const r = fn(); if (r !== null && r !== undefined && r !== false) steps++; return r; };
  Object.assign(api, {
    replace: (id, nodes) => edit(() => { const at = locate(doc, id); if (!ops.replace(doc, id, nodes[0])) return null; nodes.slice(1).forEach((n, i) => ops.insert(doc, at.parent.id, at.index + 1 + i, n)); return nodes.map((n) => n.id); }) || [],
    move: (ids, parent, index) => edit(() => { const out = []; ids.forEach((id) => { const to = locate(doc, parent); if (ops.move(doc, id, parent, index == null ? to.node.children.length : index + out.length)) out.push(id); }); return out.length ? out : null; }) || [],
    wrap: (id, type) => edit(() => ops.wrap(doc, id, type)),
    group: (ids) => edit(() => ops.group(doc, ids)),
    duplicate: (ids) => edit(() => { const out = ids.map((id) => ops.duplicate(doc, id)).filter(Boolean); return out.length ? out : null; }) || [],
    rename: (id, name) => !!edit(() => { locate(doc, id).node.name = name; return true; }),
    setProp: (ids, name, value) => !!edit(() => { ids.forEach((id) => { locate(doc, id).node.props[name] = value; }); return true; }),
    createFrame: (opts) => { const f = { id: "f2", name: opts.name, width: 1280, mode: opts.mode, root: { id: "root", type: "Root", props: {}, style: {}, children: [{ id: "content", type: "Group", props: {}, style: {}, children: [] }] } }; doc.frames.push(f); doc.active = f.id; return { frame: f.id, content: "content" }; },
    useFrame: (fid) => { doc.active = fid; },
    batch: (fn) => { const from = steps; fn(); if (steps - from > 1) steps = from + 1; },
  });
  return { ...h, steps: () => steps };
}

test("replace_jsx rebuilds a layer in its place", () => {
  const { doc, hero, api } = builder();
  const r = runTool(api, { name: "replace_jsx", input: { id: hero.id, jsx: "<Section><Heading>New</Heading></Section><Section />" } });
  assert.equal(r.ok, true);
  const kids = doc.frames[0].root.children;
  assert.equal(kids.length, 2, "both new sections land where the old one was");
  assert.ok(!kids.some((k) => k.id === hero.id));
  assert.equal(r.change.label, "Rebuilt");
  assert.equal(runTool(api, { name: "replace_jsx", input: { id: "nope", jsx: "<Section />" } }).ok, false);
});

test("set_text finds the layer's own text prop", () => {
  const { hero, api } = builder();
  const h = hero.children[0];
  assert.equal(runTool(api, { name: "set_text", input: { id: h.id, text: "Made to last." } }).ok, true);
  assert.equal(h.props.children, "Made to last.");
  assert.equal(runTool(api, { name: "set_text", input: { id: hero.id, text: "x" } }).ok, false, "a Section has no text of its own");
});

test("move, wrap, duplicate and rename", () => {
  const { doc, hero, api } = builder();
  const root = doc.frames[0].root;
  const card = make("Card", { title: "A" });
  root.children.push(card);
  assert.equal(runTool(api, { name: "move", input: { ids: [card.id], parent: hero.id, index: 0 } }).ok, true);
  assert.equal(hero.children[0].id, card.id);
  const w = runTool(api, { name: "wrap", input: { ids: [card.id], type: "Stack" } });
  assert.equal(w.ok, true);
  assert.equal(hero.children[0].type, "Stack");
  assert.equal(runTool(api, { name: "wrap", input: { ids: [card.id, hero.children[1].id], type: "Card" } }).ok, false, "several layers only go into a Group");
  const d = runTool(api, { name: "duplicate", input: { ids: [hero.id] } });
  assert.equal(root.children.length, 2);
  assert.notEqual(JSON.parse(d.result).copies[0], hero.id);
  assert.equal(runTool(api, { name: "rename", input: { id: hero.id, name: "Hero" } }).ok, true);
  assert.equal(hero.name, "Hero");
});

test("create_frame makes a structured frame to work in, and use_frame moves between frames", () => {
  const { doc, api } = builder();
  const r = runTool(api, { name: "create_frame", input: { name: "Pricing", preset: "desktop", mode: "structured" } });
  assert.equal(r.ok, true);
  assert.equal(JSON.parse(r.result).content, "content");
  assert.equal(doc.active, "f2");
  assert.equal(runTool(api, { name: "create_frame", input: { name: "X", preset: "billboard", mode: "free" } }).ok, false);
  const first = doc.frames[0].id;
  assert.equal(runTool(api, { name: "use_frame", input: { id: first } }).ok, true);
  assert.equal(doc.active, first);
  assert.equal(runTool(api, { name: "use_frame", input: { id: "nope" } }).ok, false);
});

test("batch runs edits in order as one step, and stops at the first that fails", () => {
  const { hero, api, steps } = builder();
  const h = hero.children[0];
  const r = runTool(api, { name: "batch", input: { calls: [
    { name: "set_text", input: { id: h.id, text: "One" } },
    { name: "rename", input: { id: hero.id, name: "Hero" } },
    { name: "insert_jsx", input: { parent: hero.id, jsx: "<Button>Go</Button>" } },
  ] } });
  assert.equal(r.ok, true);
  assert.equal(r.changes.length, 3);
  assert.equal(steps(), 1, "three edits, one history step");
  const s = runTool(api, { name: "batch", input: { calls: [
    { name: "set_text", input: { id: h.id, text: "Two" } },
    { name: "set_style", input: { ids: [hero.id], family: "surface", value: "#f00" } },
    { name: "set_text", input: { id: h.id, text: "Three" } },
  ] } });
  assert.match(s.result, /Call 2 \(set_style\) failed/);
  assert.equal(h.props.children, "Two", "the call after the failure never runs");
  assert.equal(runTool(api, { name: "batch", input: { calls: [{ name: "screenshot", input: {} }] } }).ok, false, "only edits run in a batch");
});

test("the practice script builds a page in two rounds: a frame, then its sections as one batch", () => {
  const { api } = builder();
  const script = practiceScript([]);
  const ask = [{ role: "user", content: "Build a pricing page" }];
  const t1 = script({ messages: ask, tools: TOOLS });
  assert.equal(t1.calls[0].name, "create_frame");
  const r1 = runTool(api, t1.calls[0]);
  const msgs = ask.concat([{ role: "assistant", content: [{ type: "tool_use", id: "a", name: "create_frame", input: t1.calls[0].input }] }, { role: "user", content: [{ type: "tool_result", tool_use_id: "a", content: r1.result }] }]);
  const t2 = script({ messages: msgs, tools: TOOLS });
  assert.equal(t2.calls[0].name, "batch");
  const r2 = runTool(api, t2.calls[0]);
  assert.equal(r2.ok, true, r2.result);
  assert.equal(api.doc().frames[1].root.children[0].children.length, 3, "three sections in the new frame's Content group");
});

test("lint and measure hand back what the builder reports", async () => {
  const { hero, api } = harness();
  api.runChecks = () => Promise.resolve({ rows: [{ id: "contrast", status: "pass", title: "ok", detail: "", ids: [] }], text: "Checks on Frame:\n- PASS ok" });
  api.measure = () => ({ across: { px: 0, overlap: true }, down: { px: 24, token: "--dt-space-inset-lg", tokenPx: 24 } });
  const l = await runTool(api, { name: "lint", input: {} });
  assert.equal(l.ok, true);
  assert.match(l.result, /PASS ok/);
  assert.equal(l.checks.length, 1);
  assert.equal(runTool(api, { name: "lint", input: { frame: "nope" } }).ok, false);
  const m = await runTool(api, { name: "measure", input: { a: hero.id, b: hero.children[0].id } });
  assert.equal(JSON.parse(m.result).down.token, "--dt-space-inset-lg");
  assert.equal(runTool(api, { name: "measure", input: { a: hero.id, b: "nope" } }).ok, false);
});
