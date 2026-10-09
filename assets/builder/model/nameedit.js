/* Edits by layer name: a short list of changes, written in Markdown or
   JSON by a person or by Claude, that names the layers it changes the way
   Layers does, rather than by id. Pasted into Paste a layout, it's read
   here, matched against a frame, and shown as a list to check before it's
   applied in one step.

     ## Edit Ledger AI · Bold
     - Hero: padding xl
     - Glow: z behind
     - "$284,120": size display-2xl
     - Rent · $2,400: text "Rent and bills"
     - remove Spending
     - add Heading "This week" to Bento, first

   The same as JSON:

     { "edit": "Ledger AI · Bold", "changes": [
       { "layer": "Hero", "style": { "padding": "xl" } },
       { "layer": "$284,120", "props": { "size": "display-2xl" } },
       { "layer": "Spending", "remove": true },
       { "into": "Bento", "at": 0, "add": [{ "type": "Heading", "props": { "children": "This week" } }] } ] }

   A layer is found by its name (its own, or the one Layers works out for
   it), else by its text, else by its type when only one layer has it. A
   name two layers share is asked about: which one, or skip. A key that's
   a style family sets that family's token; "text" sets its words; any
   other key sets one of the component's props. */

import { DATA, META, TEXT_PROPS } from "../config.js";
import { produce } from "immer";
import { canHold, cleanNode, fresh, locate, make } from "./tree.js";
import { autoName, layerName } from "./names.js";

var TEXT_KEYS = ["children", "title", "label", "heading", "eyebrow", "alt", "brand", "name"];

function norm(t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim().toLowerCase(); }
function unquote(t) { var s = String(t).trim(); var m = /^["“'](.*)["”']$/.exec(s); return m ? { text: m[1], quoted: true } : { text: s, quoted: false }; }

/* A value as written: a number, true or false, or words. */
function value(v) {
  if (typeof v !== "string") return v;
  var s = unquote(v).text;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === "true" || s === "false") return s === "true";
  return s;
}

/* ------------------------------------------------------------- reading */

/* "key value, key value" into { key: value }. A quoted value keeps its
   commas. */
function pairs(text) {
  var out = {}, re = /\s*([A-Za-z][\w-]*)\s*(?::\s*)?("[^"]*"|“[^”]*”|[^,]+)\s*(?:,|$)/g, m;
  while ((m = re.exec(text))) { out[m[1]] = m[2].trim(); if (re.lastIndex >= text.length) break; }
  return out;
}

/* The layer an item names, read off its front: quoted words, or everything
   up to the colon. */
function target(line) {
  var q = /^\s*(["“])(.*?)["”]\s*:\s*(.*)$/.exec(line);
  if (q) return { layer: q[2], byText: true, rest: q[3] };
  var i = line.indexOf(": ");
  if (i < 0 && /:$/.test(line)) i = line.length - 1;
  if (i < 0) return null;
  return { layer: line.slice(0, i).trim(), byText: false, rest: line.slice(i + 1).trim() };
}

function readMarkdownItem(line) {
  var m = /^remove\s+(.+)$/i.exec(line);
  if (m) { var r = unquote(m[1]); return { layer: r.text, byText: r.quoted, remove: true }; }
  m = /^add\s+([A-Z]\w*)(?:\s+(["“][^"”]*["”]))?\s+(?:to|into|in)\s+(.+?)(?:,\s*(first|last|at\s+\d+))?$/i.exec(line);
  if (m) {
    var into = unquote(m[3]);
    var where = (m[4] || "last").toLowerCase();
    return { add: [{ type: m[1], text: m[2] ? unquote(m[2]).text : "" }], into: into.text, byText: into.quoted, at: where === "first" ? 0 : where === "last" ? null : Number(where.replace(/\D/g, "")) };
  }
  var t = target(line);
  if (!t) return { bad: "“" + line + "” doesn't say which layer and what to change. Write it as Layer: key value." };
  var set = pairs(t.rest);
  if (!Object.keys(set).length) return { bad: "“" + line + "” names " + t.layer + " but no change." };
  return { layer: t.layer, byText: t.byText, set: set };
}

/* An edit pasted as Markdown (a "## Edit <frame>" heading and a list) or
   JSON ({ edit, changes }). Null when the text isn't an edit, so it's read
   as a layout instead. */
function readEdit(text) {
  var t = String(text || "").trim().replace(/^```[\w-]*\s*|\s*```$/g, "");
  if (!t) return null;
  if (/^\{/.test(t)) {
    var data;
    try { data = JSON.parse(t); } catch (err) { return null; }
    if (!data || !Array.isArray(data.changes)) return null;
    return { frame: typeof data.edit === "string" ? data.edit : "", format: "json", items: data.changes.slice(0, 60).map(readJsonItem) };
  }
  var lines = t.split(/\r?\n/);
  var head = /^#{1,3}\s*edit\b\s*(.*)$/i.exec(lines[0].trim());
  if (!head) return null;
  var items = [];
  lines.slice(1).forEach(function (l) {
    var m = /^\s*[-*]\s+(.+?)\s*$/.exec(l);
    if (m) items.push(readMarkdownItem(m[1]));
  });
  return { frame: head[1].trim(), format: "markdown", items: items.slice(0, 60) };
}

function readJsonItem(c) {
  if (!c || typeof c !== "object") return { bad: "A change isn't an object." };
  if (Array.isArray(c.add)) return { add: c.add, into: String(c.into || ""), byText: false, at: typeof c.at === "number" ? c.at : null, json: true };
  if (typeof c.layer !== "string" || !c.layer.trim()) return { bad: "A change has no layer named." };
  if (c.remove) return { layer: c.layer, remove: true };
  var set = {};
  Object.keys(c.style || {}).forEach(function (k) { set[k] = c.style[k]; });
  Object.keys(c.props || {}).forEach(function (k) { set[k] = c.props[k]; });
  if (c.text != null) set.text = c.text;
  if (!Object.keys(set).length) return { bad: c.layer + " has no change." };
  return { layer: c.layer, set: set };
}

/* ------------------------------------------------------------ matching */

function walk(root, fn) {
  (function go(n, trail) { (n.children || []).forEach(function (c) { if (c.type === "Slot") return; fn(c, trail); go(c, trail.concat(c)); }); })(root, []);
}

function ownText(n) {
  var p = n.props || {};
  for (var i = 0; i < TEXT_KEYS.length; i++) if (typeof p[TEXT_KEYS[i]] === "string" && p[TEXT_KEYS[i]].trim()) return p[TEXT_KEYS[i]];
  return "";
}

/* A name as written against a name Layers shows: equal, or the front of a
   name it cut short with "…" (in either). */
function same(written, shown) {
  var a = norm(written), b = norm(shown);
  if (!a || !b) return false;
  if (a === b) return true;
  if (/…$/.test(b)) return a.indexOf(b.slice(0, -1)) === 0 && b.length > 4;
  if (/…$/.test(a)) return b.indexOf(a.slice(0, -1)) === 0 && a.length > 4;
  return false;
}

/* Where a layer is, for telling two of a name apart: its two nearest
   named containers and itself. */
function pathOf(n, trail) { return trail.slice(-2).map(layerName).concat(layerName(n)).join(" › "); }

/* The layers a name stands for, and how they were found. */
function find(frame, name, textOnly) {
  var byName = [], byText = [], byType = [];
  walk(frame.root, function (n, trail) {
    var hit = { node: n, path: pathOf(n, trail) };
    if (!textOnly && same(name, n.name || autoName(n))) byName.push(hit);
    if (same(name, ownText(n))) byText.push(hit);
    if (!textOnly && norm(name) === norm(n.type)) byType.push(hit);
  });
  if (byName.length) return { hits: byName, via: "name" };
  if (byText.length) return { hits: byText, via: "text" };
  if (byType.length === 1) return { hits: byType, via: "type" };
  return { hits: [], via: "" };
}

/* --------------------------------------------------------------- plans */

var KIND_ICON = { style: "sliders", order: "layers2", size: "fit", text: "type", prop: "sliders", remove: "trash", add: "plus", ask: "ask", none: "alert" };
var ORDER_KEYS = { z: 1 };
var SIZE_KEYS = { size: 1, w: 1, h: 1, height: 1, minW: 1 };
var ALIAS = { order: "z", "layer-order": "z", width: "w" };

function word(k) {
  if (k === "z") return "Layer order";
  if (k === "children" || k === "text") return "Text";
  var f = DATA.tokens[k];
  var t = f && f.label ? f.label : k.replace(/([A-Z])/g, " $1");
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function textKey(n) {
  var specs = (META[n.type] && META[n.type].props) || [];
  return TEXT_PROPS.filter(function (k) { return typeof (n.props || {})[k] === "string"; })[0] ||
    TEXT_PROPS.filter(function (k) { return specs.some(function (sp) { return sp.name === k; }); })[0] || "";
}

/* One key on one layer: the change to make, or why it can't be made. */
function setting(n, key, raw) {
  key = ALIAS[key] || key;
  var v = value(raw);
  if (key === "text") {
    var tk = textKey(n);
    if (!tk) return { error: n.type + " has no text of its own." };
    return { group: "props", key: tk, value: String(raw == null ? "" : unquote(String(raw)).text), was: n.props[tk], kind: "text", label: "Text" };
  }
  var fam = DATA.tokens[key];
  if (fam) {
    var s = String(v);
    if (!fam.options.some(function (o) { return o.value === s; })) return { error: s + " isn't a " + word(key).toLowerCase() + " token. It takes " + fam.options.slice(0, 8).map(function (o) { return o.value; }).join(", ") + (fam.options.length > 8 ? "…" : "") + "." };
    return { group: "style", key: key, value: s, was: (n.style || {})[key], kind: ORDER_KEYS[key] ? "order" : SIZE_KEYS[key] ? "size" : "style", label: word(key) };
  }
  var spec = META[n.type] && META[n.type].props.filter(function (p) { return p.name === key; })[0];
  if (!spec) return { error: n.type + " has no " + key + " to set." };
  if (spec.kind === "enum") {
    var opt = spec.options.filter(function (o) { return String(o) === String(v); })[0];
    if (opt === undefined) return { error: v + " isn't one of " + key + "'s options: " + spec.options.join(", ") + "." };
    v = opt;
  }
  return { group: "props", key: key, value: v, was: n.props[key], kind: SIZE_KEYS[key] ? "size" : "prop", label: word(key) };
}

function what(n) {
  var t = ownText(n);
  return n.name || autoName(n) ? layerName(n) : t ? "“" + t.slice(0, 40) + "”" : n.type;
}

function countIn(n) { var k = 0; walk(n, function () { k++; }); return k; }

/* A row per change, each with what it does in a sentence, the icon for its
   kind, the layers it found and how, and the plain changes to make.
   { frame, rows: [{ kind, icon, title, detail, via, ids, choices, ops }] } */
function planEdit(doc, edit) {
  var frames = doc.frames || [];
  var frame = (edit.frame && frames.filter(function (f) { return norm(f.name) === norm(edit.frame); })[0]) || frames.filter(function (f) { return f.id === doc.active; })[0] || frames[0];
  var rows = [];
  (edit.items || []).forEach(function (it, i) {
    var key = "r" + i;
    if (it.bad) { rows.push({ key: key, kind: "none", icon: KIND_ICON.none, title: "Can't read this line", detail: it.bad, ops: [] }); return; }
    var name = it.add ? it.into : it.layer;
    var found = find(frame, name, it.byText);
    if (!found.hits.length) { rows.push({ key: key, kind: "none", icon: KIND_ICON.none, title: name, detail: "No layer here is called that, or says it.", ops: [] }); return; }
    var row = { key: key, via: found.via, ids: found.hits.map(function (h) { return h.node.id; }) };
    if (found.hits.length > 1) {
      /* Two in the same place read apart by their order there. */
      row.choices = found.hits.map(function (h) {
        var twins = found.hits.filter(function (o) { return o.path === h.path; });
        return { id: h.node.id, path: twins.length > 1 ? h.path + ", " + (twins.indexOf(h) + 1) + " of " + twins.length : h.path };
      });
    }
    row.opsFor = function (n) { return opsFor(n, it); };
    var n0 = found.hits[0].node;
    var first = row.opsFor(n0);
    if (first.error) { rows.push(Object.assign(row, { kind: "none", icon: KIND_ICON.none, title: what(n0), detail: first.error, ops: [] })); return; }
    Object.assign(row, first);
    row.icon = row.kindIcon = KIND_ICON[row.kind];
    if (row.choices) { row.ask = row.kind; row.icon = KIND_ICON.ask; row.detail = row.choices.length + " layers have this name. Which one?"; }
    rows.push(row);
  });
  return { frame: frame, rows: rows };
}

function opsFor(n, it) {
  if (it.remove) {
    var inside = countIn(n);
    return { kind: "remove", title: what(n), detail: "Removed" + (inside ? ", with the " + inside + (inside === 1 ? " layer" : " layers") + " inside" : ""), ops: [{ op: "remove", id: n.id }] };
  }
  if (it.add) {
    var nodes = it.json ? it.add.map(function (a) { return cleanNode(a, null); }).filter(Boolean).map(fresh) : it.add.map(function (a) {
      if (!META[a.type]) return null;
      var m = make(a.type);
      if (a.text) { var tk = textKey(m) || "children"; m.props[tk] = a.text; }
      return m;
    }).filter(Boolean);
    if (!nodes.length) return { error: "Nothing in it is a component the system has." };
    var firstNode = nodes[0], words = ownText(firstNode);
    var where = it.at === 0 ? "first in " : it.at == null ? "last in " : "at " + (it.at + 1) + " in ";
    return { kind: "add", title: words ? "“" + words.slice(0, 40) + "”" : firstNode.type, detail: "New " + firstNode.type + (nodes.length > 1 ? " and " + (nodes.length - 1) + " more" : "") + ", " + where + what(n), ops: [{ op: "insert", parent: n.id, index: it.at, nodes: nodes }] };
  }
  var keys = Object.keys(it.set);
  var changes = [];
  for (var i = 0; i < keys.length; i++) {
    var s = setting(n, keys[i], it.set[keys[i]]);
    if (s.error) return { error: s.error };
    changes.push(s);
  }
  return {
    kind: changes.length === 1 ? changes[0].kind : "style",
    title: what(n),
    detail: changes.map(function (c) { return c.label + (c.was != null && c.was !== "" ? " " + String(c.was).slice(0, 30) : "") + " → " + String(c.value).slice(0, 40); }).join(", "),
    was: changes.map(function (c) { return c.was; }),
    changes: changes.map(function (c) { return { label: c.label, was: c.was == null ? "" : String(c.was), value: String(c.value) }; }),
    ops: changes.map(function (c) { return { op: "set", id: n.id, group: c.group, key: c.key, value: c.value }; }),
  };
}

/* The plain changes to make, once the which-one questions are answered:
   choice[row.key] is the id picked, or "skip". */
function opsOf(plan, choice) {
  var out = [];
  plan.rows.forEach(function (r) {
    if (r.kind === "none") return;
    if (!r.choices) { out = out.concat(r.ops); return; }
    var id = choice && choice[r.key];
    if (!id || id === "skip") return;
    var n = null;
    walk(plan.frame.root, function (m) { if (m.id === id) n = m; });
    var o = n && r.opsFor(n);
    if (o && !o.error) out = out.concat(o.ops);
  });
  return out;
}

/* How many changes would be made, with the questions answered so. */
function countOf(plan, choice) {
  return plan.rows.filter(function (r) { return r.kind !== "none" && (!r.choices || (choice && choice[r.key] && choice[r.key] !== "skip")); }).length;
}

/* -------------------------------------------------------------- source */

function md(v) { return /[,"“]/.test(String(v)) || /^\s|\s$/.test(String(v)) ? JSON.stringify(String(v)) : String(v); }

/* The edit written out again, as Markdown or JSON, from what was read. */
function sourceOf(edit, as) {
  var items = (edit.items || []).filter(function (it) { return !it.bad; });
  if (as === "json") {
    return JSON.stringify({ edit: edit.frame || undefined, changes: items.map(function (it) {
      if (it.remove) return { layer: it.layer, remove: true };
      if (it.add) return { into: it.into, at: it.at == null ? undefined : it.at, add: it.json ? it.add : it.add.map(function (a) { return { type: a.type, props: a.text ? { children: a.text } : {} }; }) };
      var style = {}, props = {};
      Object.keys(it.set).forEach(function (k) { var kk = ALIAS[k] || k; if (DATA.tokens[kk]) style[kk] = it.set[k]; else props[k] = value(it.set[k]); });
      var o = { layer: it.layer };
      if (Object.keys(style).length) o.style = style;
      if (Object.keys(props).length) { if (props.text != null) { o.text = props.text; delete props.text; } if (Object.keys(props).length) o.props = props; }
      return o;
    }) }, null, 2);
  }
  var lines = ["## Edit" + (edit.frame ? " " + edit.frame : "")];
  items.forEach(function (it) {
    var who = it.byText ? JSON.stringify(it.add ? it.into : it.layer) : (it.add ? it.into : it.layer);
    if (it.remove) lines.push("- remove " + who);
    else if (it.add) {
      var a = it.add[0] || {};
      var words = it.json ? ownText(a) : a.text;
      lines.push("- add " + (a.type || "Group") + (words ? " " + JSON.stringify(words) : "") + " to " + who + (it.at === 0 ? ", first" : it.at == null ? "" : ", at " + it.at));
    } else lines.push("- " + who + ": " + Object.keys(it.set).map(function (k) { return k + " " + md(unquote(String(it.set[k])).text); }).join(", "));
  });
  return lines.join("\n");
}

/* -------------------------------------------------------------- apply */

/* Makes the changes on a document (an immer draft, or one about to be
   thrown away) in frame fid; the ids it touched, added first. */
function applyOps(d, fid, ops) {
  var touched = [];
  ops.forEach(function (o) {
    if (o.op === "set") {
      var at = locate(d, o.id, fid);
      if (!at) return;
      var g = at.node[o.group] || (at.node[o.group] = {});
      if (g[o.key] === o.value) return;
      g[o.key] = o.value;
      touched.push(o.id);
    } else if (o.op === "remove") {
      var r = locate(d, o.id, fid);
      if (!r || !r.parent) return;
      r.parent.children.splice(r.index, 1);
      touched.push(o.id);
    } else if (o.op === "insert") {
      var p = locate(d, o.parent, fid);
      if (!p) return;
      var at2 = o.index == null ? p.node.children.length : Math.max(0, Math.min(o.index, p.node.children.length));
      o.nodes.forEach(function (n) {
        if (!canHold(p, n)) return;
        var c = fresh(n);
        p.node.children.splice(at2++, 0, c);
        touched.push(c.id);
      });
    }
  });
  return touched;
}

/* The frame as it would be after the changes, for a preview, and the ids
   it would touch there. */
function after(doc, fid, ops) {
  var ids = [];
  var next = produce(doc, function (d) { ids = applyOps(d, fid, ops); });
  return { frame: next.frames.filter(function (f) { return f.id === fid; })[0], ids: ids };
}

export { after, applyOps, countOf, opsOf, planEdit, readEdit, sourceOf };
