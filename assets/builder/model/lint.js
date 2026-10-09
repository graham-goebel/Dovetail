/* The assistant's checks: what a design should get right, read from the
   frame and from the page as drawn. lintFrame reads the layers alone (the
   accessibility basics and the copy); checksFrom puts that together with
   what the frame reported when drawn (contrast, and anything spilling past
   the edge at its own width, at 390 wide and in dark mode) and the
   components' own usage rules as the rows the
   change card shows, each passing, warning or failing, with the layers it
   names. */

var FIELD_TYPES = ["Input", "Select", "Textarea", "Field", "Combobox", "Slider"];
var PLACEHOLDER = /\b(lorem|ipsum|dolor sit|placeholder|todo|tbd|xxx+)\b/i;
var TEXT_KEYS = ["children", "title", "label", "text", "description", "heading", "eyebrow"];
/* What a destructive action says, for the danger variant's rule. */
var DESTRUCTIVE = /\b(delete|remove|discard|erase|revoke|cancel (my |your |the )?(account|subscription|plan|order)|close (my |your |the )?account|leave|reset|destroy|unsubscribe|deactivate|disconnect|uninstall|clear all|empty trash)\b/i;

function label(n) { return n.name || n.type; }

/* A layer as a check names it: its own name, or its type and the start of
   its text. */
function said(n) {
  if (!n) return "a layer";
  if (n.name) return n.name;
  var p = n.props || {};
  var t = typeof p.children === "string" && p.children.trim() ? p.children : typeof p.title === "string" && p.title.trim() ? p.title : typeof p.label === "string" && p.label.trim() ? p.label : "";
  t = t.replace(/\s+/g, " ").trim();
  return n.type + (t ? " “" + (t.length > 24 ? t.slice(0, 23) + "…" : t) + "”" : "");
}

/* Each layer of a frame by id, with its parent's id. */
function layers(frame) {
  var m = {};
  (function walk(n, parent) {
    m[n.id] = { node: n, parent: parent };
    (n.children || []).forEach(function (c) { walk(c, n.id); });
  })(frame.root, null);
  return m;
}

/* Of the layers that spill, the outermost ones: a layer whose parent
   spills too is only carried along. */
function outermost(ids, at) {
  var set = {};
  ids.forEach(function (id) { set[id] = true; });
  return ids.filter(function (id) {
    for (var p = at[id] && at[id].parent; p && p !== "root"; p = at[p] && at[p].parent) if (set[p]) return false;
    return id !== "root";
  });
}

/* The layers' own findings: { kind, level, id, text }. */
function lintFrame(frame) {
  var found = [];
  var add = function (kind, level, n, text) { found.push({ kind: kind, level: level, id: n.id, text: text }); };
  var headings = [];
  var bands = {};
  var callouts = {};
  (function walk(n, band, inCard, inSection) {
    (n.children || []).forEach(function (c) {
      if (c.hidden) return;
      var p = c.props || {};
      var here = band || (c.type === "Section" ? c.id : null);
      /* The components' own rules, where a machine can tell. */
      if (c.type === "Button" && p.variant === "danger" && typeof p.children === "string" && !DESTRUCTIVE.test(p.children)) add("usage", "warn", c, "“" + p.children.slice(0, 30) + "” isn't a destructive action, so it shouldn't be a danger button.");
      if (c.type === "Card" && inCard) add("usage", "warn", c, label(c) + " is a card inside a card; use a Stack and a Divider instead.");
      if (c.type === "Section" && inSection) add("usage", "warn", c, label(c) + " is a Section inside a Section; Sections are top-level bands.");
      if (c.type === "Callout") { var k = here || "root"; callouts[k] = (callouts[k] || 0) + 1; if (callouts[k] === 2) add("usage", "warn", c, "More than one Callout in a section; keep one and let the text do the rest."); }
      if (c.type === "Heading") headings.push(c);
      if (c.type === "Button" && (p.variant || "primary") === "primary") (bands[here || "root"] = bands[here || "root"] || []).push(c);
      if (c.type === "Image" && !(p.alt && String(p.alt).trim())) add("a11y", "warn", c, label(c) + " has no alt text.");
      if (FIELD_TYPES.indexOf(c.type) >= 0 && !(p.label && String(p.label).trim())) add("a11y", "fail", c, label(c) + " has no label.");
      if (c.type === "IconButton" && !(p.label && String(p.label).trim())) add("a11y", "fail", c, label(c) + " has no label for screen readers.");
      if ((c.type === "Heading" || c.type === "Button" || c.type === "Text") && typeof p.children === "string" && !p.children.trim()) add("copy", "warn", c, label(c) + " is empty.");
      TEXT_KEYS.forEach(function (k) { if (typeof p[k] === "string" && PLACEHOLDER.test(p[k])) add("copy", "warn", c, label(c) + " has placeholder copy: “" + p[k].slice(0, 40) + "”."); });
      walk(c, here, inCard || c.type === "Card", inSection || c.type === "Section");
    });
  })(frame.root, null, false, false);
  /* Headings in order: one level 1 at most, and no level skipped going down. */
  var lv = function (h) { var l = Number(h.props && h.props.level); return l >= 1 && l <= 6 ? l : 2; };
  var ones = headings.filter(function (h) { return lv(h) === 1; });
  if (ones.length > 1) ones.slice(1).forEach(function (h) { add("a11y", "warn", h, label(h) + " is a second level 1 heading."); });
  headings.forEach(function (h, i) {
    if (i && lv(h) > lv(headings[i - 1]) + 1) add("a11y", "warn", h, label(h) + " jumps from level " + lv(headings[i - 1]) + " to " + lv(h) + ".");
  });
  Object.keys(bands).forEach(function (k) {
    var list = bands[k];
    if (list.length > 1) list.slice(1).forEach(function (b) { add("a11y", "warn", b, "More than one primary button in one section: make " + label(b) + " secondary."); });
  });
  return found;
}

/* The rows of the change card. drawn: { here, narrow, dark }, each what the
   frame reported from audit() (or null when that view couldn't be drawn or
   doesn't apply, with a reason in skip). */
function checksFrom(frame, found, drawn, skip) {
  drawn = drawn || {};
  skip = skip || {};
  var rows = [];
  var row = function (id, title, status, detail, ids) { rows.push({ id: id, title: title, status: status, detail: detail || "", ids: ids || [] }); };
  var contrastOf = function (a) { return a ? a.contrast : null; };
  var here = contrastOf(drawn.here);
  if (here) row("contrast", here.length ? "Text contrast is too low in " + here.length + (here.length === 1 ? " place" : " places") : "Text contrast meets AA everywhere", here.length ? "fail" : "pass",
    here.slice(0, 3).map(function (c) { return "“" + c.text + "” is " + c.ratio + ":1, needs " + c.need + ":1"; }).join("; "), here.map(function (c) { return c.id; }));
  else row("contrast", "Text contrast", "skip", skip.here || "The frame wasn't drawn.");
  var at = layers(frame);
  var narrow = drawn.narrow;
  if (narrow) {
    var spill = narrow.overflow.length || narrow.scrolls;
    var by = {};
    narrow.overflow.forEach(function (o) { by[o.id] = o.by; });
    var tops = outermost(narrow.overflow.map(function (o) { return o.id; }), at);
    var inside = narrow.overflow.length - tops.length - (by.root != null ? 1 : 0);
    row("narrow", spill ? "Something overflows at 390px" : "Nothing overflows at 390px", spill ? "fail" : "pass",
      tops.slice(0, 3).map(function (id) { return said(at[id] && at[id].node) + " runs " + by[id] + "px past the edge"; }).join("; ") + (inside > 0 ? " (with " + inside + (inside === 1 ? " layer" : " layers") + " inside)" : ""),
      tops.concat(narrow.overflow.map(function (o) { return o.id; }).filter(function (id) { return id !== "root" && tops.indexOf(id) < 0; })));
  } else row("narrow", "390px wide", "skip", skip.narrow || "Not checked.");
  /* Decoration painted over text, at the frame's width or at 390: a glow or
     shape floating above copy, which contrast alone can't see. */
  if (drawn.here || drawn.narrow) {
    var covered = [], seenText = {};
    [drawn.here, drawn.narrow].forEach(function (a, i) {
      ((a && a.covered) || []).forEach(function (c) {
        if (seenText[c.id]) return;
        seenText[c.id] = true;
        covered.push(Object.assign({ narrow: i === 1 }, c));
      });
    });
    row("covered", covered.length ? "Decoration covers text in " + covered.length + (covered.length === 1 ? " place" : " places") : "No decoration covers text", covered.length ? "warn" : "pass",
      covered.slice(0, 3).map(function (c) { return "“" + c.text + "” is under " + said(at[c.by] && at[c.by].node) + (c.narrow ? " at 390px" : ""); }).join("; ") + (covered.length ? ". Move the decoration clear of the copy, or set the copy's z above it." : ""),
      covered.map(function (c) { return c.id; }).concat(covered.map(function (c) { return c.by; })));
  }
  var dark = contrastOf(drawn.dark);
  if (dark) row("dark", dark.length ? "Text is too faint in dark mode in " + dark.length + (dark.length === 1 ? " place" : " places") : (frame.dark ? "Light mode keeps text readable" : "Dark mode keeps text readable"), dark.length ? "fail" : "pass",
    dark.slice(0, 3).map(function (c) { return "“" + c.text + "” is " + c.ratio + ":1"; }).join("; "), dark.map(function (c) { return c.id; }));
  else row("dark", "Dark mode", "skip", skip.dark || "Not checked.");
  var a11y = found.filter(function (f) { return f.kind === "a11y"; });
  row("a11y", a11y.length ? a11y.length + (a11y.length === 1 ? " accessibility issue" : " accessibility issues") : "Labels, alt text and headings are in order",
    a11y.some(function (f) { return f.level === "fail"; }) ? "fail" : a11y.length ? "warn" : "pass", a11y.slice(0, 3).map(function (f) { return f.text; }).join(" "), a11y.map(function (f) { return f.id; }));
  var usage = found.filter(function (f) { return f.kind === "usage"; });
  row("usage", usage.length ? usage.length + (usage.length === 1 ? " component used against its docs" : " components used against their docs") : "Components are used as their docs say", usage.length ? "warn" : "pass",
    usage.slice(0, 3).map(function (f) { return f.text; }).join(" "), usage.map(function (f) { return f.id; }));
  var copy = found.filter(function (f) { return f.kind === "copy"; });
  row("copy", copy.length ? (copy.length === 1 ? "1 layer needs real copy" : copy.length + " layers need real copy") : "No placeholder copy", copy.length ? "warn" : "pass",
    copy.slice(0, 3).map(function (f) { return f.text; }).join(" "), copy.map(function (f) { return f.id; }));
  return rows;
}

/* The rows as the assistant reads them, from the lint tool. */
function checksText(frame, rows) {
  return "Checks on " + frame.name + ":\n" + rows.map(function (r) {
    return "- " + r.status.toUpperCase() + " " + r.title + (r.detail ? ": " + r.detail : "") + (r.ids.length ? " [layers: " + r.ids.slice(0, 12).join(", ") + "]" : "");
  }).join("\n");
}

/* How many rows want attention. */
function needsWork(rows) { return (rows || []).filter(function (r) { return r.status === "fail" || r.status === "warn"; }).length; }

export { checksFrom, checksText, lintFrame, needsWork };
