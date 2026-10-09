/* The assistant's hands: the tools it's given, run against the canvas. Every
   value is checked against the design system before it lands: a style must
   be one of its token family's options, a prop one of the component's, and
   inserted JSX is read the way pasted code is. The App passes in what can
   change the document (api), so this stays apart from React.

   It also writes the brief the assistant starts every conversation with
   (systemPrompt): the system's rules, its components and its tokens. That
   text depends only on the system, never on the page or the time, so the
   model's prompt cache keeps it from one request to the next. */

import { DATA, META } from "../config.js";
import { jsxNodes, readJsxElements } from "./paste.js";
import { cleanNode, fresh, locate } from "./tree.js";

var FAMILIES = Object.keys(DATA.tokens);

var TOOLS = [
  { name: "list_pages", description: "The file's pages (the current one marked), and the frames on the current page with their ids, sizes and layer counts.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "read_page", description: "An outline of every layer on a page: one line each, indented by depth, with its id, type, name, text, props and style tokens. Reads the current page unless page names another; frame narrows it to one frame. Read it before changing anything beyond the selection.", input_schema: { type: "object", properties: { page: { type: "string" }, frame: { type: "string" } }, additionalProperties: false } },
  { name: "read_selection", description: "The selected layers (or the frame when nothing is selected): each one's id, type, name, props and style tokens, and its children's ids and types.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "screenshot", description: "A picture of a frame or one layer on the current page, as it's drawn now. Look after visible changes and fix what looks wrong: overlaps, cramped spacing, weak contrast, text that wraps badly.", input_schema: { type: "object", properties: { id: { type: "string" } }, additionalProperties: false } },
  { name: "search_components", description: "Find components by what they're for: each match's name, group and one-line purpose. An empty query lists every component by group.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { name: "read_component", description: "A component's props (kinds, options, defaults and notes) and its documentation: when to use it, examples and accessibility.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { name: "list_tokens", description: "The values a style family accepts. Families: " + FAMILIES.join(", ") + ".", input_schema: { type: "object", properties: { family: { type: "string", enum: FAMILIES } }, required: ["family"], additionalProperties: false } },
  { name: "set_style", description: "Set one style family to one of its token values on layers, or clear it with an empty value. Only token values from list_tokens are allowed.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, family: { type: "string", enum: FAMILIES }, value: { type: "string" } }, required: ["ids", "family", "value"], additionalProperties: false } },
  { name: "set_prop", description: "Set one of a component's own props on layers of that type: its text, or one of the values its enum allows.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, name: { type: "string" }, value: { type: ["string", "number", "boolean"] } }, required: ["ids", "name", "value"], additionalProperties: false } },
  { name: "insert_jsx", description: "Add new layers written as JSX with the design system's components (for example <Section><Heading>…</Heading></Section>) into a container, at an index, or after the selection when parent is omitted.", input_schema: { type: "object", properties: { jsx: { type: "string" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 } }, required: ["jsx"], additionalProperties: false } },
  { name: "remove", description: "Remove layers.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, required: ["ids"], additionalProperties: false } },
  { name: "select", description: "Select layers, so the person sees them.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"], additionalProperties: false } },
  { name: "read_skill", description: "Read a skill's files when a request fits its description: its SKILL.md, or another file by path.", input_schema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: ["name"], additionalProperties: false } },
];

/* The tools for one conversation: screenshot only when the assistant may
   look at the canvas. The order never changes, so the cache holds. */
function toolsFor(opts) {
  var look = !opts || opts.look !== false;
  return TOOLS.filter(function (t) { return look || t.name !== "screenshot"; });
}

var LABEL = { surface: "Fill", radius: "Corners", elevation: "Shadow", border: "Border", padding: "Padding", gap: "Gap", blur: "Blur", backdrop: "Behind", opacity: "Opacity", gradient: "Gradient" };
function familyWord(f) { return LABEL[f] || f.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }); }

/* A layer, as the assistant reads it. */
function describe(n) {
  return { id: n.id, type: n.type, name: n.name || undefined, props: n.props, style: n.style,
    children: (n.children || []).map(function (c) { return { id: c.id, type: c.type, name: c.name || undefined }; }) };
}

var TEXT_KEYS = ["children", "title", "label", "text", "heading", "description", "alt"];
function short(v, n) { var t = String(v).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }

/* One layer as a line of the outline. */
function line(n, depth) {
  var bits = [n.type + (n.name && n.name !== n.type ? " \"" + short(n.name, 40) + "\"" : ""), n.id];
  var props = n.props || {};
  TEXT_KEYS.forEach(function (k) { if (typeof props[k] === "string" && props[k].trim()) bits.push(k === "children" ? "\"" + short(props[k], 80) + "\"" : k + "=\"" + short(props[k], 60) + "\""); });
  Object.keys(props).sort().forEach(function (k) {
    var v = props[k];
    if (TEXT_KEYS.indexOf(k) >= 0 || v == null || v === "" || typeof v === "object") return;
    bits.push(k + "=" + short(v, 40));
  });
  var st = n.style || {};
  var toks = Object.keys(st).sort().filter(function (k) { return st[k] != null && st[k] !== "" && typeof st[k] !== "object"; }).map(function (k) { return k + ":" + st[k]; });
  if (toks.length) bits.push("{" + toks.join(" ") + "}");
  if (n.hidden) bits.push("hidden");
  if (n.locked) bits.push("locked");
  return new Array(depth + 1).join("  ") + "- " + bits.join(" · ");
}

var OUTLINE_MAX = 400;
function count(n) { return 1 + (n.children || []).reduce(function (a, c) { return a + count(c); }, 0); }

/* A page's frames as an outline, the frame narrowed to one when fid names
   it. Long pages stop at OUTLINE_MAX lines and say how many are left. */
function outline(doc, fid) {
  var out = [], left = 0;
  (doc.frames || []).filter(function (f) { return !fid || f.id === fid; }).forEach(function (f) {
    out.push("Frame \"" + f.name + "\" " + f.id + " · " + (f.mode || "free") + " · " + f.width + (f.height ? "×" + f.height : "") + (f.id === doc.active ? " · active" : "") + (f.dark ? " · dark" : ""));
    (function walk(n, depth) {
      (n.children || []).forEach(function (c) {
        if (out.length >= OUTLINE_MAX) { left += count(c); return; }
        out.push(line(c, depth));
        walk(c, depth + 1);
      });
    })(f.root, 1);
  });
  if (left) out.push("… and " + left + " more layers. Read one frame at a time with frame.");
  return out.join("\n");
}

/* The brief: what the assistant is working with and how. Built from the
   system alone and the same on every request. */
var brief = null;
var SIDES = /^(padding|margin|border|radius)(Top|Right|Bottom|Left|TopLeft|TopRight|BottomLeft|BottomRight)$/;
function systemPrompt() {
  if (brief) return brief;
  var comps = (DATA.groups || []).map(function (g) {
    return "## " + g.label + "\n" + g.items.filter(function (t) { return META[t]; }).map(function (t) { return "- " + t + (META[t].container ? " (holds layers)" : "") + ": " + (META[t].blurb || ""); }).join("\n");
  }).join("\n\n");
  var fams = FAMILIES.filter(function (f) { return !SIDES.test(f); }).map(function (f) {
    return "- " + f + ": " + DATA.tokens[f].options.map(function (o) { return o.value; }).join(", ");
  }).join("\n");
  var sides = FAMILIES.filter(function (f) { return SIDES.test(f); });
  brief = [
    "# Working in the Dovetail Builder",
    "You design on a canvas made only of the Dovetail design system: its components, laid out in frames, styled only with its tokens. The tools are your hands. Changes land on the canvas as you make them, and the person can undo any of them.",
    "## How to work",
    "- Read before you change. read_selection for the selection; read_page before anything wider, or when you need ids.",
    "- Prefer a component that already does the job (search_components, read_component) over a styled Group or Shape.",
    "- Write real, short copy in the brand's voice. Never lorem ipsum.",
    "- After a visible change, look with screenshot when you have it, and fix what looks wrong before you finish.",
    "- If the request is unclear or would change a lot more than asked, say what you'd do and ask first.",
    "- Finish with a sentence or two on what you changed and anything the person should check.",
    "## The system's rules",
    "- Tokens only: every colour, size, space, radius and shadow is a token value from list_tokens. Never invent one.",
    "- Dark areas: use a Section's dark tone (or a frame's dark mode) rather than dark fills on light layers, so text and controls follow.",
    "- Every layout must work 390px wide, in dark mode, and with reduced motion.",
    "- Accessibility: headings in order, one primary action per view, labels on every field, alt text on informative images, and text contrast of at least 4.5:1.",
    "- Structured frames are auto layout: order matters, positions don't. Free frames place layers by x and y.",
    "# Components",
    comps,
    "# Style token families",
    "A layer's style maps a family to one value.",
    fams,
    sides.length ? "Per-side families take the same values as their base family: " + sides.join(", ") + "." : "",
  ].filter(Boolean).join("\n\n");
  return brief;
}

/* Runs one tool call. api: { doc(), selection(), setStyle(ids, key, value),
   setProp(ids, name, value), insert(parent, index, nodes), remove(ids),
   select(ids), skills(), pages(), loadPage(id), screenshot(fid, id),
   componentDoc(name) }. Returns { ok, result, change, step }, or a promise
   of one for the tools that wait (another page, a picture, a component's
   docs). change, for one that edited the canvas, says what in a line for
   the change card; step says what it read, for the thread. result is text,
   or for a picture the content blocks of an image and a line about it. */
function runTool(api, call) {
  var input = call.input || {};
  var fail = function (msg) { return { ok: false, result: msg }; };
  var doc = api.doc();
  var known = function (ids) { return (ids || []).filter(function (id) { return typeof id === "string" && locate(doc, id); }); };
  var nameOf = function (id) { var at = locate(doc, id); return at ? at.node.name || at.node.type : id; };
  switch (call.name) {
    case "list_pages": {
      var pages = api.pages ? api.pages() : [];
      var frames = (doc.frames || []).map(function (f) { return { id: f.id, name: f.name, mode: f.mode || "free", width: f.width, height: f.height || undefined, layers: count(f.root) - 1, active: f.id === doc.active || undefined }; });
      return { ok: true, result: JSON.stringify({ pages: pages, frames: frames }), step: "Listed " + pages.length + (pages.length === 1 ? " page" : " pages") };
    }
    case "read_page": {
      var pagesNow = api.pages ? api.pages() : [];
      var here = pagesNow.filter(function (pg) { return pg.current; })[0];
      var other = input.page && (!here || input.page !== here.id) ? pagesNow.filter(function (pg) { return pg.id === input.page || pg.name === input.page; })[0] : null;
      if (input.page && !other && !(here && (input.page === here.id || input.page === here.name))) return fail("There's no page called " + input.page + ". Call list_pages for them.");
      var from = function (d, label) {
        if (!d) return fail("That page couldn't be read.");
        if (input.frame && !(d.frames || []).some(function (f) { return f.id === input.frame; })) return fail("There's no frame " + input.frame + " on " + label + ".");
        var n = (d.frames || []).filter(function (f) { return !input.frame || f.id === input.frame; }).reduce(function (a, f) { return a + count(f.root) - 1; }, 0);
        return { ok: true, result: outline(d, input.frame || null), step: "Read " + label + " · " + n + (n === 1 ? " layer" : " layers") };
      };
      if (other) return Promise.resolve(api.loadPage(other.id)).then(function (d) { return from(d, other.name); }, function () { return fail("That page couldn't be read."); });
      return from(doc, here ? here.name : "the page");
    }
    case "screenshot": {
      if (!api.screenshot) return fail("Looking at the canvas is turned off for this file.");
      var frameOf = (doc.frames || []).filter(function (f) { return f.id === input.id; })[0];
      var inFrame = null, shotAt = null;
      if (input.id && !frameOf && input.id !== "root") (doc.frames || []).some(function (f) { var at = locate(doc, input.id, f.id); if (at) { inFrame = f; shotAt = at; } return !!at; });
      if (input.id && input.id !== "root" && !shotAt && !frameOf) return fail("There's no layer or frame " + input.id + " on this page.");
      var fr = frameOf || inFrame || (doc.frames || []).filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0];
      var what = shotAt ? shotAt.node.name || shotAt.node.type : fr.name;
      return Promise.resolve(api.screenshot(fr.id, shotAt ? input.id : null)).then(function (pic) {
        if (!pic || !pic.data) return fail("The picture couldn't be made.");
        return { ok: true, result: [{ type: "image", source: { type: "base64", media_type: pic.media_type, data: pic.data } }, { type: "text", text: what + ", " + pic.width + "×" + pic.height + " pixels." }], step: "Looked at " + what, shot: pic };
      }, function (err) { return fail((err && err.message) || "The picture couldn't be made."); });
    }
    case "search_components": {
      var q = String(input.query || "").toLowerCase().trim();
      var words = q.split(/[^a-z0-9]+/).filter(Boolean);
      var all = Object.keys(META).filter(function (t) { return !META[t].builder; });
      if (!words.length) {
        var byGroup = (DATA.groups || []).map(function (g) { return g.label + ": " + g.items.filter(function (t) { return META[t]; }).join(", "); }).join("\n");
        return { ok: true, result: byGroup, step: "Listed the components" };
      }
      var scored = all.map(function (t) {
        var hay = (t + " " + (META[t].blurb || "") + " " + (META[t].group || "")).toLowerCase();
        var sc = words.reduce(function (a, w) { return a + (t.toLowerCase() === w ? 5 : t.toLowerCase().indexOf(w) >= 0 ? 3 : hay.indexOf(w) >= 0 ? 1 : 0); }, 0);
        return { t: t, sc: sc };
      }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc || (a.t < b.t ? -1 : 1); }).slice(0, 12);
      if (!scored.length) return { ok: true, result: "No component matches " + JSON.stringify(input.query) + ". Try another word, or an empty query for the full list.", step: "Searched components for “" + short(input.query, 30) + "”" };
      return { ok: true, result: JSON.stringify(scored.map(function (x) { return { name: x.t, group: META[x.t].group, purpose: META[x.t].blurb, holdsLayers: !!META[x.t].container || undefined }; })), step: "Searched components for “" + short(input.query, 30) + "”" };
    }
    case "read_component": {
      var m = META[input.name];
      if (!m) return fail("There's no component called " + input.name + ". Call search_components to find one.");
      var spec2 = { name: input.name, purpose: m.blurb, group: m.group, holdsLayers: !!m.container, props: (m.props || []).map(function (pp) { return { name: pp.name, kind: pp.kind, options: pp.options, default: pp.default, note: pp.note }; }) };
      return Promise.resolve(api.componentDoc ? api.componentDoc(input.name) : null).then(function (md) {
        var text = JSON.stringify(spec2) + (md ? "\n\n# Documentation\n\n" + String(md).slice(0, 8000) : "");
        return { ok: true, result: text, step: "Read " + input.name + "'s docs" };
      }, function () { return { ok: true, result: JSON.stringify(spec2), step: "Read " + input.name + "'s props" }; });
    }
    case "read_selection": {
      var sel = known(api.selection());
      var nodes = sel.length ? sel.map(function (id) { return locate(doc, id).node; }) : [locate(doc, "root") && locate(doc, "root").node].filter(Boolean);
      return { ok: true, result: JSON.stringify(nodes.map(describe)), step: sel.length ? "Read " + sel.length + (sel.length === 1 ? " selected layer" : " selected layers") : "Read the frame" };
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
      return { ok: true, result: file.body, skill: skill.name, step: "Read the " + skill.name + " skill" };
    }
    default:
      return fail("There's no tool called " + call.name + ".");
  }
}

/* The practice assistant's answer once its reading tools have run: it says
   what they found, as a model would before going on. */
function practiceAnswer(request, results) {
  var prev = request.messages[request.messages.length - 2];
  var names = prev && Array.isArray(prev.content) ? prev.content.filter(function (b) { return b.type === "tool_use"; }).map(function (b) { return b.name; }) : [];
  var body = function (i) { var c = results[i] && results[i].content; return typeof c === "string" ? c : Array.isArray(c) ? c.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join(" ") : ""; };
  if (results.some(function (r) { return r.is_error; })) return { text: "Practice mode: " + body(0), calls: [] };
  if (names[0] === "read_page") {
    var lines = body(0).split("\n");
    var frames = lines.filter(function (l) { return /^Frame /.test(l); }).length;
    var layers = lines.filter(function (l) { return /^\s+- /.test(l); }).length;
    var top = lines.filter(function (l) { return /^  - /.test(l); }).map(function (l) { var m = /^  - (\w+)(?: "([^"]+)")?/.exec(l); return m ? (m[2] ? m[2] + " (" + m[1] + ")" : m[1]) : ""; }).filter(Boolean);
    return { text: "Practice mode: this page has " + frames + (frames === 1 ? " frame" : " frames") + " and " + layers + (layers === 1 ? " layer" : " layers") + (top.length ? ". At the top level: " + top.slice(0, 8).join(", ") + (top.length > 8 ? ", and " + (top.length - 8) + " more" : "") : "") + ".", calls: [] };
  }
  if (names[0] === "screenshot") return { text: "Practice mode: I looked at " + body(0).replace(/, \d+×\d+ pixels\.$/, "") + ". A model would now check it for overlaps, spacing and contrast, and fix what it finds.", calls: [] };
  if (names[0] === "search_components") {
    var found = [];
    try { found = JSON.parse(body(0)).map(function (x) { return x.name; }); } catch (err) { found = []; }
    return { text: found.length ? "Practice mode: these fit: " + found.slice(0, 5).join(", ") + "." : "Practice mode: " + body(0), calls: [] };
  }
  return null;
}

/* The practice assistant's script: a few plain requests it can carry out
   with the real tools, so the panel and the canvas can be tried with
   nothing sent. sel: the selected layers. */
function practiceScript(sel) {
  return function (request) {
    var last = request.messages[request.messages.length - 1];
    var results = Array.isArray(last.content) ? last.content.filter(function (b) { return b && b.type === "tool_result"; }) : [];
    if (results.length) return practiceAnswer(request, results);
    var text = String(typeof last.content === "string" ? last.content : (last.content || []).map(function (b) { return b.text || ""; }).join(" ")).toLowerCase();
    var ids = sel.map(function (n) { return n.id; });
    var calls = [], said = [];
    var offered = (request.tools || []).map(function (t) { return t.name; });
    if (/what'?s on|what is on|describe|outline|read the page|summari[sz]e/.test(text)) return { text: "", calls: [{ name: "read_page", input: {} }] };
    if (/\blook\b|screenshot|how does it look|check (it|how)/.test(text)) {
      if (offered.indexOf("screenshot") < 0) return { text: "Looking at the canvas is turned off for this file.", calls: [] };
      return { text: "", calls: [{ name: "screenshot", input: ids.length ? { id: ids[0] } : {} }] };
    }
    var forWhat = /component (?:for|to)\s+(.+)$/.exec(text) || /(?:which|find a|is there a) component\s+(?:for\s+)?(.+)$/.exec(text);
    if (forWhat) return { text: "", calls: [{ name: "search_components", input: { query: forWhat[1].replace(/[?.!]+$/, "") } }] };
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

export { TOOLS, describe, familyWord, outline, practiceScript, runTool, systemPrompt, toolsFor };
