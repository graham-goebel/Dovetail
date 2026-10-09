/* What a layer is called when nobody has named it: a name read from what it
   holds or what it is, so Layers, the checks, the assistant and edits by
   name all have something better than "Group" to go on. The name is worked
   out each time, so it follows the content until the layer is renamed.

   - A container is called by what it is when that shows (Chips, Tiles, a
     Bar chart, a Ring), else by a heading or text of its own, else by a
     heading further in with its layout ("$284,120 grid"), else by what it
     holds ("Rent, Food, Travel" or "3 Buttons"). A wrapper round one
     container is that container's wrapper.
   - A shape is called by what it looks like: a Glow (a blurred shape), an
     Arrow or a Line, a Circle or an Ellipse, a Pill, a Bar or a Rectangle.
   - Anything else keeps its type. */

var TEXT_KEYS = ["children", "title", "label", "heading", "eyebrow", "alt", "brand", "name"];
var CONTAINERS = { Group: 1, Stack: 1, Inline: 1, Grid: 1, Section: 1, Card: 1, Carousel: 1 };

function short(t, n) {
  var s = String(t).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).trim() + "…" : s;
}

function ownText(n) {
  var p = (n && n.props) || {};
  for (var i = 0; i < TEXT_KEYS.length; i++) {
    var v = p[TEXT_KEYS[i]];
    if ((typeof v === "string" && v.trim()) || typeof v === "number") return String(v);
  }
  return "";
}

/* The first layer, depth first, that passes test. */
function find(n, test) {
  var kids = (n && n.children) || [];
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].hide) continue;
    if (test(kids[i])) return kids[i];
    var deep = find(kids[i], test);
    if (deep) return deep;
  }
  return null;
}

function plural(type) { return /s$/.test(type) ? type : /y$/.test(type) ? type.slice(0, -1) + "ies" : type + "s"; }

function shapeName(n) {
  var p = n.props || {}, st = n.style || {};
  if (st.blur) return "Glow";
  if (p.shape === "line") return p.end === "arrow" || p.start === "arrow" ? "Arrow" : "Line";
  if (p.shape === "ellipse") return st.w && st.w === st.height ? "Circle" : "Ellipse";
  if (st.radius === "pill") return "Pill";
  /* Tall or wide and thin reads as a bar, as in a chart. */
  if (st.w === "fill" || /^x\d+$/.test(st.height || "")) return "Bar";
  return "Rectangle";
}

function visibleKids(n) { return (n.children || []).filter(function (c) { return !c.hide && c.type !== "Slot"; }); }
function textOf(n) { return CONTAINERS[n.type] || n.type === "Shape" ? "" : ownText(n); }
function isPill(n) { return CONTAINERS[n.type] && n.style && n.style.radius === "pill"; }
function isTile(n) { var st = n.style || {}; return CONTAINERS[n.type] && !!(st.surface || st.gradient) && !!(st.radius || st.border); }
function count(n, test) { var k = 0; (function walk(m) { (m.children || []).forEach(function (c) { if (c.hide) return; if (test(c)) k++; walk(c); }); })(n); return k; }
var PLAIN = { Group: 1, Stack: 1, Inline: 1 };
var ROLE = { Grid: "grid", Section: "section", Card: "card", Stack: "stack", Inline: "row", Carousel: "carousel" };
function roleWord(n) { return n.type === "Group" ? ((n.props || {}).direction === "column" ? "column" : "row") : ROLE[n.type] || n.type.toLowerCase(); }

/* The words a container shows of its own: its heading, else the text
   directly in it, read with a label beside it ("Rent · $2,400"). */
function ownLine(n, kids) {
  var h = kids.filter(function (c) { return c.type === "Heading" && textOf(c); })[0];
  if (h) return textOf(h);
  if (!kids.some(function (c) { return textOf(c); })) return "";
  var said = [];
  kids.forEach(function (c) {
    if (said.length > 1) return;
    var t = textOf(c) || (CONTAINERS[c.type] && !c.name ? visibleKids(c).map(textOf).filter(Boolean)[0] : "");
    if (t) said.push(t);
  });
  /* A label beside it only when both are short, else just its own text. */
  if (said.length > 1 && said.every(function (t) { return t.length <= 20; })) return said.join(" · ");
  return kids.map(textOf).filter(Boolean)[0];
}

function containerName(n) {
  var kids = visibleKids(n);
  var st = n.style || {};
  /* What it is, when that shows: a ring, a run of chips or tiles, a chart. */
  if (st.radius === "pill" && st.w && st.w === st.height) return "Ring";
  if (kids.length > 1 && kids.every(isPill)) return "Chips";
  if (kids.length > 1 && kids.every(isTile)) return "Tiles";
  if (count(n, function (c) { return c.type === "Shape" && shapeName(c) === "Bar"; }) >= 3 && !find(n, function (c) { return c.type === "Heading"; })) return "Bar chart";
  /* A carousel's items are its slides, so it's called by what they are. */
  if (n.type === "Carousel") return kids.length && kids.every(function (c) { return c.type === kids[0].type; }) ? plural(kids[0].type) + " carousel" : "";
  /* What it says: a heading or text of its own. */
  var own = ownLine(n, kids);
  if (own) return short(own, 28);
  /* A plain wrapper round one container reads as that container's
     wrapper, so the two don't share a name. */
  if (kids.length === 1 && CONTAINERS[kids[0].type] && PLAIN[n.type]) {
    var inner = kids[0].name || autoName(kids[0]);
    var base = inner.replace(/ (grid|section|card|stack|row|column|carousel|wrapper)$/, "");
    return inner ? short(base, 22) + " wrapper" : "";
  }
  /* A heading further in, with its layout so a wrapper reads apart from
     what it wraps. */
  var heading = find(n, function (c) { return c.type === "Heading" && ownText(c); });
  if (heading) return short(ownText(heading), 22) + " " + roleWord(n);
  /* What it holds: a list of like containers by their short names, else a count
     of like components. */
  if (kids.length > 1 && kids.every(function (c) { return c.type === kids[0].type; })) {
    if (CONTAINERS[kids[0].type]) {
      var names = kids.map(function (c) { return (c.name || autoName(c)).split(" · ")[0]; });
      if (names.every(function (t) { return t && t.length <= 20; })) return short(names.join(", "), 28);
    }
    var one = kids[0].type === "Shape" ? shapeName(kids[0]) : kids[0].type;
    if (!CONTAINERS[one] && kids.every(function (c) { return (c.type === "Shape" ? shapeName(c) : c.type) === one; })) return kids.length + " " + plural(one);
  }
  var said = find(n, function (c) { return textOf(c); });
  if (said) return short(textOf(said), 22) + " " + roleWord(n);
  return "";
}

/* The name worked out for an unnamed layer, or "" when there's nothing to
   go on (the caller shows its type). Text components are left to their own
   words, which Layers shows beside the type. */
function autoName(n) {
  if (!n || n.name) return "";
  if (n.type === "Shape") return shapeName(n);
  if (CONTAINERS[n.type] && !(n.type === "Card" && ownText(n))) return containerName(n);
  return "";
}

/* What a layer is called anywhere a name is wanted: its own name, the one
   worked out for it, else its type. */
function layerName(n) {
  if (!n) return "a layer";
  return n.name || autoName(n) || n.type;
}

export { autoName, layerName };
