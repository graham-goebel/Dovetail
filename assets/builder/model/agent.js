/* The assistant's hands: the tools it's given, run against the canvas. Every
   value is checked against the design system before it lands: a style must
   be one of its token family's options, a prop one of the component's, and
   inserted JSX is read the way pasted code is. The App passes in what can
   change the document (api), so this stays apart from React. */

import { DATA, META } from "../config.js";
import { jsxNodes, readJsxElements } from "./paste.js";
import { cleanNode, fresh, locate } from "./tree.js";

var FAMILIES = Object.keys(DATA.tokens);

var TOOLS = [
  { name: "read_selection", description: "The selected layers (or the frame when nothing is selected): each one's id, type, name, props and style tokens, and its children's ids and types.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_tokens", description: "The values a style family accepts. Families: " + FAMILIES.join(", ") + ".", input_schema: { type: "object", properties: { family: { type: "string", enum: FAMILIES } }, required: ["family"], additionalProperties: false } },
  { name: "set_style", description: "Set one style family to one of its token values on layers, or clear it with an empty value. Only token values from list_tokens are allowed.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, family: { type: "string", enum: FAMILIES }, value: { type: "string" } }, required: ["ids", "family", "value"], additionalProperties: false } },
  { name: "set_prop", description: "Set one of a component's own props on layers of that type: its text, or one of the values its enum allows.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, name: { type: "string" }, value: { type: ["string", "number", "boolean"] } }, required: ["ids", "name", "value"], additionalProperties: false } },
  { name: "insert_jsx", description: "Add new layers written as JSX with the design system's components (for example <Section><Heading>…</Heading></Section>) into a container, at an index, or after the selection when parent is omitted.", input_schema: { type: "object", properties: { jsx: { type: "string" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 } }, required: ["jsx"], additionalProperties: false } },
  { name: "remove", description: "Remove layers.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, required: ["ids"], additionalProperties: false } },
  { name: "select", description: "Select layers, so the person sees them.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"], additionalProperties: false } },
  { name: "read_skill", description: "Read a skill's files when a request fits its description: its SKILL.md, or another file by path.", input_schema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: ["name"], additionalProperties: false } },
];

var LABEL = { surface: "Fill", radius: "Corners", elevation: "Shadow", border: "Border", padding: "Padding", gap: "Gap", blur: "Blur", backdrop: "Behind", opacity: "Opacity", gradient: "Gradient" };
function familyWord(f) { return LABEL[f] || f.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }); }

/* A layer, as the assistant reads it. */
function describe(n) {
  return { id: n.id, type: n.type, name: n.name || undefined, props: n.props, style: n.style,
    children: (n.children || []).map(function (c) { return { id: c.id, type: c.type, name: c.name || undefined }; }) };
}

/* Runs one tool call. api: { doc(), selection(), setStyle(ids, key, value),
   setProp(ids, name, value), insert(parent, index, nodes), remove(ids),
   select(ids), skills() }. Returns { ok, result, change } where change, for
   one that edited the canvas, says what in a line for the change card. */
function runTool(api, call) {
  var input = call.input || {};
  var fail = function (msg) { return { ok: false, result: msg }; };
  var doc = api.doc();
  var known = function (ids) { return (ids || []).filter(function (id) { return typeof id === "string" && locate(doc, id); }); };
  var nameOf = function (id) { var at = locate(doc, id); return at ? at.node.name || at.node.type : id; };
  switch (call.name) {
    case "read_selection": {
      var sel = known(api.selection());
      var nodes = sel.length ? sel.map(function (id) { return locate(doc, id).node; }) : [locate(doc, "root") && locate(doc, "root").node].filter(Boolean);
      return { ok: true, result: JSON.stringify(nodes.map(describe)) };
    }
    case "list_tokens": {
      var fam = DATA.tokens[input.family];
      if (!fam) return fail("There's no style family called " + input.family + ".");
      return { ok: true, result: JSON.stringify(fam.options.map(function (o) { return { value: o.value, token: o.tokens && o.tokens[0] }; })) };
    }
    case "set_style": {
      var f = DATA.tokens[input.family];
      if (!f) return fail("There's no style family called " + input.family + ".");
      var v = String(input.value == null ? "" : input.value);
      if (v && !f.options.some(function (o) { return o.value === v; })) return fail(v + " isn't one of " + input.family + "'s tokens. Call list_tokens for the ones it has.");
      var ids = known(input.ids);
      if (!ids.length) return fail("None of those layers are on the canvas.");
      if (!api.setStyle(ids, input.family, v || undefined)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: ids, label: familyWord(input.family), value: v || "none", on: ids.map(nameOf).join(", ") } };
    }
    case "set_prop": {
      var pids = known(input.ids);
      if (!pids.length) return fail("None of those layers are on the canvas.");
      var types = pids.map(function (id) { return locate(doc, id).node.type; });
      var spec = META[types[0]] && META[types[0]].props.filter(function (p) { return p.name === input.name; })[0];
      var textProp = input.name === "children" || input.name === "title" || input.name === "label";
      if (!spec && !textProp) return fail(types[0] + " has no prop called " + input.name + ".");
      if (types.some(function (t) { return t !== types[0]; })) return fail("Set a prop on layers of one type at a time.");
      if (spec && spec.kind === "enum" && spec.options.indexOf(input.value) < 0) return fail(input.value + " isn't one of " + input.name + "'s options: " + spec.options.join(", ") + ".");
      if (!api.setProp(pids, input.name, input.value)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: pids, label: input.name === "children" ? "Text" : input.name.charAt(0).toUpperCase() + input.name.slice(1), value: String(input.value).slice(0, 60), on: pids.map(nameOf).join(", ") } };
    }
    case "insert_jsx": {
      var els = readJsxElements(String(input.jsx || ""));
      var raw = els.length ? jsxNodes(els, []) : [];
      var made = raw.map(function (n) { return cleanNode(n, null); }).filter(Boolean).map(fresh);
      if (!made.length) return fail("That JSX has no components the system knows.");
      var ids2 = api.insert(input.parent || null, typeof input.index === "number" ? input.index : null, made);
      if (!ids2 || !ids2.length) return fail("Those layers can't go there.");
      return { ok: true, result: JSON.stringify({ added: ids2 }), change: { ids: ids2, label: "Added", value: made.map(function (n) { return n.name || n.type; }).join(", "), on: "" } };
    }
    case "remove": {
      var rids = known(input.ids);
      if (!rids.length) return fail("None of those layers are on the canvas.");
      var names = rids.map(nameOf).join(", ");
      if (!api.remove(rids)) return fail("Those layers can't be removed.");
      return { ok: true, result: "Done.", change: { ids: [], label: "Removed", value: names, on: "" } };
    }
    case "select": {
      api.select(known(input.ids));
      return { ok: true, result: "Done." };
    }
    case "read_skill": {
      var skill = (api.skills() || []).filter(function (s) { return s.name === input.name; })[0];
      if (!skill) return fail("There's no skill called " + input.name + " here.");
      var path = input.path || "SKILL.md";
      var file = skill.files.filter(function (x) { return x.path === path; })[0];
      if (!file) return fail(input.name + " has no file " + path + ". It has: " + skill.files.map(function (x) { return x.path; }).join(", ") + ".");
      return { ok: true, result: file.body, skill: skill.name };
    }
    default:
      return fail("There's no tool called " + call.name + ".");
  }
}

/* The practice assistant's script: a few plain requests it can carry out
   with the real tools, so the panel and the canvas can be tried with
   nothing sent. sel: the selected layers. */
function practiceScript(sel) {
  return function (request) {
    var last = request.messages[request.messages.length - 1];
    var text = String(typeof last.content === "string" ? last.content : (last.content || []).map(function (b) { return b.text || ""; }).join(" ")).toLowerCase();
    var ids = sel.map(function (n) { return n.id; });
    var calls = [], said = [];
    var surface = DATA.tokens.surface.options.map(function (o) { return o.value; });
    if (!ids.length && !/add|insert|section|pricing/.test(text)) return { text: "Practice mode: select something on the canvas and ask me to restyle it, or ask me to add a section.", calls: [] };
    if (/premium|calm|quiet|muted|soft/.test(text) && surface.indexOf("brand-muted") >= 0) { calls.push({ name: "set_style", input: { ids: ids, family: "surface", value: "brand-muted" } }); said.push("a quieter brand fill"); }
    else if (/bold|brand|loud|vivid/.test(text) && surface.indexOf("brand") >= 0) { calls.push({ name: "set_style", input: { ids: ids, family: "surface", value: "brand" } }); said.push("the brand fill"); }
    if (/round|corner|soft/.test(text)) { var r = DATA.tokens.radius.options; calls.push({ name: "set_style", input: { ids: ids, family: "radius", value: (r[Math.min(2, r.length - 1)] || r[0]).value } }); said.push("rounder corners"); }
    if (/shadow|lift|float|premium/.test(text)) { var el = DATA.tokens.elevation.options; calls.push({ name: "set_style", input: { ids: ids, family: "elevation", value: (el[1] || el[0]).value } }); said.push("a soft shadow"); }
    var headings = sel.filter(function (n) { return n.type === "Heading"; });
    if (/bigger|larger|premium|bold/.test(text) && headings.length) { calls.push({ name: "set_prop", input: { ids: headings.map(function (n) { return n.id; }), name: "size", value: "display-md" } }); said.push("a display-size heading"); }
    if (/add|insert/.test(text) && /button|cta|action/.test(text)) { calls.push({ name: "insert_jsx", input: { jsx: "<Button variant=\"primary\">Get started</Button>" } }); said.push("a button"); }
    if (/add|insert/.test(text) && /section|pricing|hero/.test(text)) { calls.push({ name: "insert_jsx", input: { jsx: "<Section><Stack><Heading size=\"heading-lg\">Plans for every team</Heading><Text>Start free, upgrade when you need to.</Text><Button>See plans</Button></Stack></Section>" } }); said.push("a section"); }
    if (!calls.length) return { text: "Practice mode: I can try fills (premium, bold), corners, shadows, bigger headings, or adding a button or a section. Real requests go to the model once live mode is on.", calls: [] };
    return { text: "Practice mode, with the real tools: " + said.join(", ") + ".", calls: calls };
  };
}

export { TOOLS, describe, familyWord, practiceScript, runTool };
