/* What the person changed on the canvas since the assistant's last reply,
   in plain words, so the next message can tell the assistant (and the
   panel can show it first). It reads the same changes edits.js makes for
   history and sharing, and folds them into one line per thing touched:
   a layer added, removed, moved, renamed, hidden, or its text, props or
   tokens changed. */

import { diff } from "./edits.js";

var TEXT = ["children", "title", "label", "text", "heading", "description", "eyebrow", "alt"];

function short(v, n) { var t = String(v).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
function shown(v) {
  if (v === undefined || v === null || v === "") return "none";
  if (typeof v === "object") return "custom";
  return short(v, 32);
}

/* Each node of a document by frame and id, with its parent's id. */
function index(doc) {
  var m = {};
  (doc.frames || []).forEach(function (f) {
    (function walk(n, parent) {
      m[f.id + "/" + n.id] = { node: n, parent: parent, frame: f };
      (n.children || []).forEach(function (c) { walk(c, n.id); });
    })(f.root, null);
  });
  return m;
}

function nameOf(n, bare) {
  if (!n) return "a layer";
  if (n.id === "root") return "the frame";
  if (bare) return n.name || n.type;
  var p = n.props || {};
  var said = typeof p.children === "string" && p.children.trim() ? " “" + short(p.children, 24) + "”" : typeof p.title === "string" && p.title.trim() ? " “" + short(p.title, 24) + "”" : "";
  return n.name ? n.name : n.type + said;
}

/* { count, lines }: lines at most max (the rest counted), each a short
   sentence; count is every thing changed. */
function recentEdits(prev, next, max) {
  max = max || 12;
  if (!prev || !next || prev === next) return { count: 0, lines: [] };
  var changes = diff(prev, next);
  if (!changes.length) return { count: 0, lines: [] };
  var A = index(prev), B = index(next);
  var lines = [];
  var per = {}, order = [];
  var touch = function (key) { if (!per[key]) { per[key] = []; order.push(key); } return per[key]; };
  var frameName = function (fid, doc) { var f = (doc.frames || []).filter(function (x) { return x.id === fid; })[0]; return f ? f.name || "a frame" : "a frame"; };

  changes.forEach(function (c) {
    var key = c.f + "/" + c.n;
    if (c.t === "addF") lines.push("Added the frame " + frameName(c.f, next));
    else if (c.t === "delF") lines.push("Removed the frame " + frameName(c.f, prev));
    else if (c.t === "order") lines.push("Reordered the frames");
    else if (c.t === "set" && c.n === null) {
      if (c.k === "name") lines.push("Renamed the frame " + shown(c.old) + " to " + shown(c.value));
      else if (["x", "y", "width", "height"].indexOf(c.k) >= 0) touch("frame:" + c.f).push("size");
    }
    else if (c.t === "addN") {
      if (A[key]) return;
      var at = B[key];
      /* Only the top of what was added: its children came with it. */
      if (!at || (at.parent && !A[c.f + "/" + at.parent])) return;
      var into = at.parent ? B[c.f + "/" + at.parent] : null;
      lines.push("Added " + nameOf(at.node) + (into && into.parent ? " to " + nameOf(into.node) : ""));
    }
    else if (c.t === "delN") {
      var was = A[key];
      if (!was || B[key]) return;
      if (was.parent && !B[c.f + "/" + was.parent]) return;
      lines.push("Removed " + nameOf(was.node));
    }
    else if (c.t === "set" || c.t === "group") {
      var bits = touch(key);
      if (c.t === "group") {
        var keys = {};
        Object.keys(c.old || {}).concat(Object.keys(c.value || {})).forEach(function (k) { keys[k] = true; });
        Object.keys(keys).forEach(function (k) { bits.push({ g: c.g, k: k, old: (c.old || {})[k], value: (c.value || {})[k] }); });
      } else bits.push({ g: c.g, k: c.k, old: c.old, value: c.value });
    }
    else if (c.t === "kids") {
      /* A child that came from another parent is a move; the same
         children in another order is a reorder. */
      var oldKids = (c.old || []).filter(function (id) { return B[c.f + "/" + id]; });
      var newKids = (c.value || []).filter(function (id) { return A[c.f + "/" + id]; });
      newKids.forEach(function (id) {
        var from = A[c.f + "/" + id];
        if (from && from.parent !== c.n) lines.push("Moved " + nameOf(B[c.f + "/" + id].node) + " into " + nameOf(B[key] && B[key].node));
      });
      var stayed = newKids.filter(function (id) { return oldKids.indexOf(id) >= 0; });
      var before = oldKids.filter(function (id) { return stayed.indexOf(id) >= 0; });
      if (stayed.join() !== before.join()) {
        var moved = stayed.filter(function (id, i) { return before[i] !== id; })[0];
        var mn = moved && B[c.f + "/" + moved];
        lines.push(mn ? "Moved " + nameOf(mn.node) + " within " + nameOf(B[key] && B[key].node) : "Reordered layers in " + nameOf(B[key] && B[key].node));
      }
    }
  });

  order.forEach(function (key) {
    if (key.indexOf("frame:") === 0) { lines.push("Resized the frame " + frameName(key.slice(6), next)); return; }
    var at = B[key];
    if (!at) return;
    var retext = per[key].some(function (b) { return b.g === "p" && TEXT.indexOf(b.k) >= 0; });
    var label = nameOf(at.node, retext);
    var said = [];
    per[key].forEach(function (b) {
      if (b.g === "f" && b.k === "name") said.push("renamed from " + shown(b.old));
      else if (b.g === "f" && b.k === "hidden") said.push(b.value ? "hidden" : "shown");
      else if (b.g === "f" && b.k === "locked") said.push(b.value ? "locked" : "unlocked");
      else if (b.g === "p" && TEXT.indexOf(b.k) >= 0 && typeof (b.value || b.old) === "string") said.push((b.k === "children" ? "text" : b.k) + " “" + short(b.old || "", 30) + "” → “" + short(b.value || "", 30) + "”");
      else if (b.g === "f") return;
      else said.push(b.k + " " + shown(b.old) + " → " + shown(b.value));
    });
    if (!said.length) return;
    lines.push(label + ": " + said.slice(0, 3).join(", ") + (said.length > 3 ? ", and " + (said.length - 3) + " more" : ""));
  });

  return { count: lines.length, lines: lines.slice(0, max) };
}

/* The edits as the assistant reads them, at the head of a message. */
function editsText(ed) {
  if (!ed || !ed.count) return "";
  return "Since your last reply, the person changed the canvas themselves (keep these unless they ask otherwise):\n" +
    ed.lines.map(function (l) { return "- " + l; }).join("\n") + (ed.count > ed.lines.length ? "\n- and " + (ed.count - ed.lines.length) + " more" : "");
}

export { editsText, recentEdits };
