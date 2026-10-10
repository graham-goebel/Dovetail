/* How alike frames are, section by section: what compare_frames tells the
   assistant so variants that only changed a colour or two get caught. A
   section's signature is its type and the props that change how it reads
   (tone, dark, layout, variant, columns, sizes, fills), with the same for
   everything inside it, so swapping a layout or a band changes it and
   editing copy doesn't. */

var KEYS = ["tone", "dark", "layout", "variant", "columns", "reverse", "texture", "titleSize", "size", "align", "width", "spacing", "bleed", "orientation", "drive"];
var STYLE_KEYS = ["surface", "radius", "elevation", "gradient", "padding", "gap"];

function sig(n) {
  var p = n.props || {}, st = n.style || {};
  var own = n.type + "(" + KEYS.filter(function (k) { return p[k] != null && p[k] !== ""; }).map(function (k) { return k + "=" + p[k]; })
    .concat(STYLE_KEYS.filter(function (k) { return st[k]; }).map(function (k) { return k + ":" + st[k]; })).join(",") + ")";
  var kids = (n.children || []).map(sig);
  return kids.length ? own + "[" + kids.join(" ") + "]" : own;
}

/* The frame's sections: the root's children, or, when the root holds one
   group (a structured frame's Content), that group's children. */
function sections(frame) {
  var at = frame.root;
  while (at.children && at.children.length === 1 && at.children[0].type === "Group" && (at.children[0].children || []).length) at = at.children[0];
  return at.children || [];
}

/* How many of b's sections also appear, unchanged, in a: a share of the
   longer frame, and which sections they are. */
function likeness(a, b) {
  var sa = sections(a), sb = sections(b);
  var pool = sa.map(sig), shared = [];
  sb.forEach(function (n) { var i = pool.indexOf(sig(n)); if (i >= 0) { pool.splice(i, 1); shared.push(n); } });
  var total = Math.max(sa.length, sb.length) || 1;
  return { same: shared.length, total: total, ratio: shared.length / total, shared: shared };
}

/* Two frames this alike read as one direction. */
var TOO_ALIKE = 0.6;

/* Every pair of frames, the alike ones flagged, as lines for the tool's
   answer. name(node) names a section. */
function compareText(frames, name) {
  var lines = [], alike = [];
  for (var i = 0; i < frames.length; i++) for (var j = i + 1; j < frames.length; j++) {
    var l = likeness(frames[i], frames[j]);
    var line = frames[i].name + " and " + frames[j].name + ": " + l.same + " of " + l.total + " sections the same";
    if (l.ratio >= TOO_ALIKE) { line += " (too alike: " + l.shared.slice(0, 4).map(name).join(", ") + (l.shared.length > 4 ? "…" : "") + " unchanged)"; alike.push([frames[i], frames[j]]); }
    lines.push(line + ".");
  }
  return { lines: lines, alike: alike };
}

export { TOO_ALIKE, compareText, likeness, sections, sig };
