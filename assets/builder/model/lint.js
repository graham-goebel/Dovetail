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
  var narrow = drawn.narrow;
  if (narrow) {
    var spill = narrow.overflow.length || narrow.scrolls;
    row("narrow", spill ? "Something overflows at 390px" : "Nothing overflows at 390px", spill ? "fail" : "pass",
      narrow.overflow.slice(0, 3).map(function (o) { return o.by + "px past the edge"; }).join("; "), narrow.overflow.map(function (o) { return o.id; }));
  } else row("narrow", "390px wide", "skip", skip.narrow || "Not checked.");
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
