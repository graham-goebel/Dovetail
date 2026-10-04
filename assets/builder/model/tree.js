/* The document: nodes, frames, the operations on them, and the cleaning that decides what a save, a link or an import may hold. */

import { CAROUSEL_ITEMS, DATA, MAX_HEIGHT, MAX_WIDTH, MEDIA_URL, META, MIN_FREE, MIN_SIDE, PRESET, PRESETS, SPACINGS, isContainer, joinsFlow, slotAccepts, slotSpec } from "../config.js";

/* ------------------------------------------------------------ the tree */

var seq = 0;
function uid() { seq++; return "n" + Date.now().toString(36).slice(-5) + seq.toString(36); }

function make(type, props, children, style) {
  var n = { id: uid(), type: type, props: props || {}, style: style || {} };
  if (isContainer(type)) n.children = children || [];
  if (type === "Carousel" && !children) n.children = CAROUSEL_ITEMS.map(function (it) { return make("Cover", { ratio: "3:4", eyebrow: it[1], title: it[0], alt: it[0] + " collection" }); });
  return n;
}

function side(v, max, fallback, min) {
  var n = Math.round(Number(v));
  return isFinite(n) && n > 0 ? Math.max(min || MIN_SIDE, Math.min(max, n)) : fallback;
}
/* A frame is a size, from a preset or typed, and whether its height hugs
   what's in it. */
function makeFrame(name, preset, hug) {
  var p = PRESET[preset] || PRESET.desktop;
  return { id: uid(), name: name || "Frame", width: p.width, height: p.height, hug: !!hug, dark: false, surface: "base", spacing: "", gap: "", mode: "free", root: { id: "root", type: "Root", props: {}, style: {}, children: [] } };
}
function presetOf(f) {
  var hit = PRESETS.filter(function (p) { return p.width === f.width && (f.hug || p.height === f.height); })[0];
  return hit ? hit.id : "";
}
function emptyDoc() {
  var f = makeFrame("Frame 1", "desktop");
  return { frames: [f], active: f.id };
}
function active(doc) { return doc.frames.filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0]; }
function frameById(doc, fid) { return doc.frames.filter(function (f) { return f.id === fid; })[0] || null; }
function copy(doc) { return JSON.parse(JSON.stringify(doc)); }

/* A node in the active frame, or in the frame named. */
function locate(doc, id, fid) {
  var frame = (fid && frameById(doc, fid)) || active(doc);
  if (id === "root") return { node: frame.root, parent: null, index: -1, path: [frame.root] };
  var out = null;
  (function walk(n, path) {
    (n.children || []).forEach(function (c, i) {
      if (out) return;
      if (c.id === id) out = { node: c, parent: n, index: i, path: path.concat([c]) };
      else if (c.children) walk(c, path.concat([c]));
    });
  })(frame.root, [frame.root]);
  return out;
}

function fresh(n) {
  var c = { id: uid(), type: n.type, props: Object.assign({}, n.props), style: Object.assign({}, n.style) };
  if (n.name) c.name = n.name;
  if (n.children) c.children = n.children.map(fresh);
  return c;
}

/* Whether a spot can take a node: a container, or a slot that takes its kind. */
function canHold(p, child) {
  if (!p || !p.node.children || !child || child.type === "Slot") return false;
  if (p.node.type === "Slot") { var owner = p.path[p.path.length - 2]; return !!owner && slotAccepts(owner.type, p.node.props.name, child.type); }
  return p.node.type === "Root" || isContainer(p.node.type);
}
function parentSpot(at) { return { node: at.parent, path: at.path.slice(0, -1) }; }
function fixedSpot(at) { return !at || !at.parent || at.node.type === "Slot"; }
var fixed = fixedSpot;

/* A structured frame keeps everything in Groups: something that isn't a
   band or a container, put straight on its page, comes in a Group of its
   own, and nothing in it is placed freely. */
/* In a structured frame every Group lays out with flex as auto layout does:
   a direction, a gap and padding, from tokens, unless it has its own. */
function autoLayout(n) {
  (function walk(x) {
    if (x.type === "Group") {
      if (!x.props.direction) x.props.direction = "column";
      if (!x.props.gap) x.props.gap = "md";
      if (!x.style.padding && !["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].some(function (k) { return x.style[k]; })) x.style.padding = "md";
    }
    (x.children || []).forEach(walk);
  })(n);
  return n;
}
function settle(frame, parentId, n) {
  if (!frame || frame.mode !== "structured") return n;
  (function unfree(x) { if (x.style) { delete x.style.x; delete x.style.y; } (x.children || []).forEach(unfree); })(n);
  autoLayout(n);
  if (parentId !== "root" || joinsFlow(n.type) || isContainer(n.type)) return n;
  return make("Group", { direction: "column", gap: "md" }, [n], { padding: "md" });
}
/* The containers that turn into one another. */
var CONVERTS = ["Group", "Section", "Stack", "Inline", "Grid", "Card"];
var ops = {
  insert: function (doc, parentId, index, n, fid) {
    var p = locate(doc, parentId, fid);
    if (!canHold(p, n)) return null;
    var put = settle((fid && frameById(doc, fid)) || active(doc), parentId, n);
    p.node.children.splice(Math.max(0, Math.min(index, p.node.children.length)), 0, put);
    return n.id;
  },
  move: function (doc, id, parentId, index) {
    if (id === "root" || id === parentId) return null;
    var from = locate(doc, id);
    var to = locate(doc, parentId);
    if (fixed(from) || !canHold(to, from.node)) return null;
    if (to.path.some(function (x) { return x.id === id; })) return null;
    if (from.parent === to.node && (index === from.index || index === from.index + 1)) return null;
    from.parent.children.splice(from.index, 1);
    if (from.parent === to.node && from.index < index) index--;
    to.node.children.splice(Math.max(0, Math.min(index, to.node.children.length)), 0, settle(active(doc), parentId, from.node));
    return id;
  },
  /* "root" means nothing left to select; null means nothing happened. */
  remove: function (doc, ids) {
    var next = null, any = false;
    [].concat(ids).forEach(function (id) {
      var at = locate(doc, id);
      if (fixed(at)) return;
      at.parent.children.splice(at.index, 1);
      any = true;
      var n = at.parent.children[at.index] || at.parent.children[at.index - 1];
      next = n ? n.id : at.parent.id;
    });
    return any ? next || "root" : null;
  },
  duplicate: function (doc, id) {
    var at = locate(doc, id);
    if (fixed(at)) return null;
    var c = fresh(at.node);
    at.parent.children.splice(at.index + 1, 0, c);
    return c.id;
  },
  replace: function (doc, id, n) {
    var at = locate(doc, id);
    if (fixed(at) || !canHold(parentSpot(at), n)) return null;
    at.parent.children.splice(at.index, 1, n);
    return n.id;
  },
  wrap: function (doc, id, type) {
    var at = locate(doc, id);
    if (fixed(at)) return null;
    var box = make(type, {}, [at.node]);
    if (type === "Group" && active(doc).mode === "structured") autoLayout(box);
    if (!canHold(parentSpot(at), box)) return null;
    at.parent.children.splice(at.index, 1, box);
    return box.id;
  },
  /* Siblings into one Group, in their order, where the first one was. */
  group: function (doc, ids) {
    var spots = ids.map(function (id) { return locate(doc, id); }).filter(Boolean);
    if (!spots.length || spots.some(fixed)) return null;
    if (!canHold(parentSpot(spots[0]), { type: "Group" })) return null;
    var parent = spots[0].parent;
    if (!parent || spots.some(function (s) { return s.parent !== parent; })) return null;
    spots.sort(function (a, b) { return a.index - b.index; });
    var box = make("Group", {}, spots.map(function (s) { return s.node; }));
    /* In a structured frame a Group always lays out what it holds. */
    if (active(doc).mode === "structured") autoLayout(box);
    var at = spots[0].index;
    parent.children = parent.children.filter(function (c) { return ids.indexOf(c.id) < 0; });
    parent.children.splice(at, 0, box);
    return box.id;
  },
  ungroup: function (doc, id) {
    var at = locate(doc, id);
    if (fixed(at) || !at.node.children || !isContainer(at.node.type)) return null;
    var kids = at.node.children;
    if (kids.some(function (k) { return !canHold(parentSpot(at), k); })) return null;
    at.parent.children.splice.apply(at.parent.children, [at.index, 1].concat(kids));
    return kids.length ? kids[0].id : at.parent.id;
  },
  /* One container turned into another, keeping what's in it, its name and
     where it sits: a Section or a Stack into a Group, a Group into a
     Section, and so on. A Group comes laid out (a column, or a row from an
     Inline), with padding where a band had it. Keeps the node's id, so
     it stays selected. */
  convert: function (doc, id, type) {
    var at = locate(doc, id);
    if (fixed(at) || !at.node.children || at.node.type === type) return null;
    if (CONVERTS.indexOf(at.node.type) < 0 || CONVERTS.indexOf(type) < 0) return null;
    var from = at.node;
    var kids = from.children.filter(function (c) { return c.type !== "Slot"; });
    var n = type === "Group"
      ? make("Group", { direction: from.type === "Inline" ? "row" : "column", gap: "md" }, kids, from.type === "Section" || from.type === "Card" ? { padding: "lg" } : {})
      : make(type, {}, kids);
    n.id = from.id;
    if (from.name) n.name = from.name;
    ["x", "y"].forEach(function (k) { if (from.style && from.style[k] !== undefined) n.style[k] = from.style[k]; });
    if (!canHold(parentSpot(at), n)) return null;
    at.parent.children.splice(at.index, 1, n);
    return n.id;
  },
  nudge: function (doc, id, by) {
    var at = locate(doc, id);
    if (fixed(at)) return null;
    var to = at.index + by;
    if (to < 0 || to >= at.parent.children.length) return null;
    at.parent.children.splice(at.index, 1);
    at.parent.children.splice(to, 0, at.node);
    return id;
  },
  /* To the front (last among its siblings, drawn on top) or the back. */
  order: function (doc, id, where) {
    var at = locate(doc, id);
    if (fixed(at)) return null;
    var to = where === "front" ? at.parent.children.length - 1 : 0;
    if (to === at.index) return null;
    at.parent.children.splice(at.index, 1);
    at.parent.children.splice(to, 0, at.node);
    return id;
  },
  /* A free object moved by whole steps; stays within the canvas's range. */
  shift: function (doc, id, dx, dy) {
    var at = locate(doc, id);
    if (fixed(at) || at.node.lock || !isFree(at.node.style)) return null;
    var st = at.node.style;
    var x = Math.max(0, Math.min(FREE_MAX, st.x + dx)), y = Math.max(0, Math.min(FREE_MAX, st.y + dy));
    if (x === st.x && y === st.y) return null;
    st.x = x; st.y = y;
    return id;
  },
};

/* Only what the inspector could have set survives a save, a share link or
   an import: known components, their own scalar props, an uploaded image or
   a URL where a media prop takes one, and option names from the token lists. */
function tokenOption(key, v) {
  var def = DATA.tokens[key];
  return def ? def.options.filter(function (o) { return o.value === v; })[0] || null : null;
}
/* Each clean step can say what it left out, for a pasted layout or a link:
   report is an array of lines, or nothing. */
function note(report, line) { if (report && report.indexOf(line) < 0) report.push(line); }
/* A node placed freely on a frame's canvas: x and y in steps of the smallest
   inset. Anything inside a container stays in its flow. */
var FREE_MAX = 1200;
var HEX = /^#[0-9a-f]{6}$/i;
function isFree(st) { return !!st && typeof st.x === "number" && typeof st.y === "number"; }
/* A list prop: plain items with only the fields its type gives, each of
   the right kind; links that go somewhere safe; at most 60 items. */
var SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:|\.{0,2}\/?[\w-][\w./?=&%#-]*$)/;
function cleanList(spec, v) {
  if (!Array.isArray(v) || v.length > 60) return null;
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var it = v[i];
    if (spec.of === "text") { if (typeof it !== "string" && typeof it !== "number") return null; out.push(String(it).slice(0, 2000)); continue; }
    if (!it || typeof it !== "object" || Array.isArray(it)) return null;
    var o = {};
    for (var j = 0; j < spec.fields.length; j++) {
      var f = spec.fields[j], val = it[f.name];
      if (val === undefined || val === null || val === "") { if (!f.optional && f.kind !== "boolean") o[f.name] = f.kind === "number" ? 0 : ""; continue; }
      if (f.kind === "number") { if (typeof val !== "number" || !isFinite(val)) return null; o[f.name] = val; }
      else if (f.kind === "boolean") { if (typeof val !== "boolean") return null; o[f.name] = val; }
      else if (f.kind === "enum") { if (f.options.indexOf(val) < 0) return null; o[f.name] = val; }
      else if (f.kind === "url") { if (typeof val !== "string" || !SAFE_HREF.test(val)) return null; o[f.name] = val; }
      else if (f.kind === "media") { if (typeof val !== "string" || !MEDIA_URL.test(val)) return null; o[f.name] = val; }
      else { if (typeof val !== "string" && typeof val !== "number") return null; o[f.name] = String(val).slice(0, 2000); }
    }
    if (Object.keys(it).some(function (k) { return !spec.fields.some(function (f) { return f.name === k; }); })) return null;
    out.push(o);
  }
  return out;
}

/* A slot, under the component it belongs to: only the kinds it takes. */
function cleanSlot(c, owner, report) {
  var name = c.props.name;
  var kids = (Array.isArray(c.children) ? c.children : []).map(function (k) { return cleanNode(k, report); }).filter(Boolean).filter(function (k) {
    if (slotAccepts(owner, name, k.type)) return true;
    note(report, owner + ": " + name + " doesn't take " + k.type + ", so it was left out");
    return false;
  });
  return { id: typeof c.id === "string" && /^[\w-]{1,40}$/.test(c.id) ? c.id : uid(), type: "Slot", props: { name: name }, style: {}, children: kids };
}
function cleanNode(n, report) {
  if (!n || typeof n !== "object") return null;
  if (n.type === "Slot") { note(report, "A slot only lives inside the component it belongs to, so it was left out"); return null; }
  if (!META[n.type]) { note(report, (n.type ? "\"" + String(n.type).slice(0, 40) + "\"" : "A node with no type") + " isn't something the builder places, so it and anything inside it were left out"); return null; }
  var meta = META[n.type];
  var names = meta.props.map(function (p) { return p.name; });
  if (!meta.builder) names.push("children");
  if (n.type === "Grid") names.push("minColumnWidth");
  var props = {};
  var given = Object.assign({}, n.props || {});
  /* Text written straight into children, on something that holds no layers. */
  if (!isContainer(n.type) && !meta.builder && typeof n.children === "string" && given.children === undefined) given.children = n.children;
  Object.keys(given).forEach(function (k) {
    var v = given[k];
    if (names.indexOf(k) < 0) { note(report, n.type + ": " + k + " isn't a prop the builder sets"); return; }
    var spec = meta.props.filter(function (p) { return p.name === k; })[0];
    if (k === "minColumnWidth") { if (DATA.columnWidths.some(function (w) { return w.value === v; })) props[k] = v; else note(report, "Grid: minColumnWidth takes a multiple of --dt-size-control-lg, not " + JSON.stringify(v)); return; }
    if (spec && spec.kind === "media") { if (typeof v === "string" && MEDIA_URL.test(v)) props[k] = v; else note(report, n.type + ": " + k + " takes an https URL"); return; }
    if (spec && spec.kind === "url") { if (typeof v === "string" && SAFE_HREF.test(v)) props[k] = v; else note(report, n.type + ": " + k + " takes a page link (#page:id) or a safe address"); return; }
    if (spec && spec.kind === "list") { var lv = cleanList(spec, v); if (lv) props[k] = lv; else note(report, n.type + ": " + k + " takes a list of " + (spec.of === "text" ? "text" : "{ " + spec.fields.map(function (f) { return f.name; }).join(", ") + " }") + ", with nothing else in its items"); return; }
    if (spec && spec.kind === "enum" && spec.options.indexOf(v) < 0) { note(report, n.type + ": " + k + " " + JSON.stringify(v) + " isn't one of " + spec.options.join(", ")); return; }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
    else note(report, n.type + ": " + k + " takes text, a number or true/false, not an element or object");
  });
  var style = {};
  /* Older layouts stored two-sided margins. */
  var st = Object.assign({}, n.style || {});
  if (st.marginY) { st.marginTop = st.marginTop || st.marginY; st.marginBottom = st.marginBottom || st.marginY; delete st.marginY; }
  if (st.marginX) { st.marginLeft = st.marginLeft || st.marginX; st.marginRight = st.marginRight || st.marginX; delete st.marginX; }
  var freeOk = function (v) { return typeof v === "number" && v === Math.round(v) && v >= 0 && v <= FREE_MAX; };
  if (st.x !== undefined || st.y !== undefined) {
    if (freeOk(st.x) && freeOk(st.y)) { style.x = st.x; style.y = st.y; }
    else note(report, n.type + ": x and y are whole steps of --dt-space-inset-2xs from 0 to " + FREE_MAX + ", not " + JSON.stringify([st.x, st.y]));
  }
  Object.keys(st).forEach(function (k) {
    if (k === "x" || k === "y") return;
    if (k === "dark") { if (st.dark === true) style.dark = true; return; }
    if (k === "fill" || k === "color") { if (HEX.test(String(st[k]))) style[k] = String(st[k]).toLowerCase(); else note(report, n.type + ": " + k + " takes a #rrggbb colour, not " + JSON.stringify(st[k])); return; }
    if (tokenOption(k, st[k])) style[k] = st[k];
    else if (DATA.tokens[k]) note(report, n.type + ": " + k + " " + JSON.stringify(st[k]) + " isn't a token option (" + DATA.tokens[k].options.map(function (o) { return o.value; }).join(", ") + ")");
    else note(report, n.type + ": style " + k + " isn't one the builder sets");
  });
  var out = { id: typeof n.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : uid(), type: n.type, props: props, style: style };
  /* A Group can be named by hand; a detached component keeps its old name
     on whatever container it became. */
  if (isContainer(n.type) && typeof n.name === "string" && n.name.trim()) out.name = n.name.trim().slice(0, 60);
  /* Locked: left alone on the canvas. Hidden: not drawn, not exported. */
  if (n.lock === true) out.lock = true;
  if (n.hide === true) out.hide = true;
  /* An instance of one of My components: which, and the revision it's on. */
  if (n.inst && typeof n.inst === "object" && typeof n.inst.of === "string" && /^[\w-]{1,40}$/.test(n.inst.of)) {
    out.inst = { of: n.inst.of, rev: Number.isInteger(n.inst.rev) && n.inst.rev >= 0 ? n.inst.rev : 1 };
  }
  var seenSlot0 = {};
  var slotChild = function (c) {
    if (!c || c.type !== "Slot" || !c.props || !slotSpec(n.type, c.props.name) || seenSlot0[c.props.name]) return false;
    seenSlot0[c.props.name] = true;
    return true;
  };
  if (isContainer(n.type)) out.children = (Array.isArray(n.children) ? n.children : []).map(function (c) { return slotChild(c) ? cleanSlot(c, n.type, report) : cleanNode(c, report); }).filter(Boolean);
  else if (Array.isArray(n.children) && n.children.length) {
    var seenSlot = {};
    var slots = n.children.filter(function (c) {
      if (!c || c.type !== "Slot" || !c.props || !slotSpec(n.type, c.props.name) || seenSlot[c.props.name]) return false;
      seenSlot[c.props.name] = true;
      return true;
    });
    if (slots.length) out.children = slots.map(function (c) { return cleanSlot(c, n.type, report); });
    if (slots.length < n.children.length) note(report, n.type + " holds layers only in its slots (" + (META[n.type].props.filter(function (p) { return p.kind === "node" && p.name !== "children"; }).map(function (p) { return p.name; }).join(", ") || "none") + "), so what else was inside it was left out");
  }
  return out;
}
function cleanFrame(f, i, report) {
  var base = makeFrame("Frame " + (i + 1), "desktop");
  if (!f || typeof f !== "object") return base;
  if (typeof f.id === "string" && /^[\w-]{1,40}$/.test(f.id)) base.id = f.id;
  if (typeof f.name === "string" && f.name.trim()) base.name = f.name.trim().slice(0, 60);
  /* Older layouts named a preset ("size", or "viewport" before that) and
     showed the whole page, so they open hugging their content. */
  var legacy = PRESET[f.size || f.viewport];
  if (legacy && f.width === undefined) {
    base.width = legacy.width;
    base.height = legacy.height;
    base.hug = true;
  } else {
    var lo = f.mode === "structured" ? MIN_SIDE : MIN_FREE;
    base.width = side(f.width, MAX_WIDTH, base.width, lo);
    base.height = side(f.height, MAX_HEIGHT, base.height, lo);
    base.hug = f.hug === true;
    if (f.width !== undefined && base.width !== f.width) note(report, base.name + ": width " + JSON.stringify(f.width) + " became " + base.width + " (" + lo + " to " + MAX_WIDTH + ")");
    if (f.height !== undefined && base.height !== f.height) note(report, base.name + ": height " + JSON.stringify(f.height) + " became " + base.height + " (" + lo + " to " + MAX_HEIGHT + ")");
  }
  base.dark = f.dark === true;
  base.surface = tokenOption("surface", f.surface) ? f.surface : "base";
  if (f.surface !== undefined && base.surface !== f.surface) note(report, base.name + ": surface " + JSON.stringify(f.surface) + " isn't a token option, so it's base");
  /* The canvas may take one custom colour, as six-digit hex. */
  if (typeof f.canvas === "string" && /^#[0-9a-f]{6}$/i.test(f.canvas)) base.canvas = f.canvas.toLowerCase();
  else if (f.canvas !== undefined) note(report, base.name + ": canvas " + JSON.stringify(f.canvas) + " isn't a #rrggbb colour, so it was left out");
  base.mode = f.mode === "structured" ? "structured" : "free";
  if (f.lock === true) base.lock = true;
  var place = function (v) { return typeof v === "number" && isFinite(v) ? Math.max(-40000, Math.min(40000, Math.round(v))) : null; };
  if (place(f.x) !== null && place(f.y) !== null) { base.x = place(f.x); base.y = place(f.y); }
  /* A loose object is as wide as what it holds, unless it was given a width. */
  if (f.bare === true) { base.bare = true; base.hug = true; if (f.sized === true) base.sized = true; }
  base.spacing = SPACINGS.some(function (s) { return s[0] === f.spacing; }) ? f.spacing : "";
  base.gap = DATA.rootGaps.indexOf(f.gap) >= 0 ? f.gap : "";
  if (f.typeScale === "social") base.typeScale = "social";
  /* A frame may give its nodes as root.children or straight as children. */
  var kids = f.root && Array.isArray(f.root.children) ? f.root.children : Array.isArray(f.children) ? f.children : [];
  base.root.children = kids.map(function (c) { return cleanNode(c, report); }).filter(Boolean);
  var seen = {};
  (function dedupe(n) { (n.children || []).forEach(function (c) { if (seen[c.id]) c.id = uid(); seen[c.id] = true; dedupe(c); }); })(base.root);
  return base;
}
function clean(doc, report) {
  if (!doc || typeof doc !== "object") return emptyDoc();
  /* A layout saved before frames existed is one frame. */
  var frames = Array.isArray(doc.frames) && doc.frames.length ? doc.frames : [Object.assign({}, doc.page || {}, { root: doc.root })];
  if (frames.length > 24) note(report, "Only the first 24 frames were kept");
  var out = { frames: frames.slice(0, 24).map(function (f, i) { return cleanFrame(f, i, report); }), active: null };
  var ids = {};
  out.frames.forEach(function (f) { if (ids[f.id]) f.id = uid(); ids[f.id] = true; });
  out.active = ids[doc.active] ? doc.active : out.frames[0].id;
  return out;
}

export { CONVERTS, FREE_MAX, HEX, SAFE_HREF, active, autoLayout, canHold, clean, cleanFrame, cleanList, cleanNode, cleanSlot, copy, emptyDoc, fixed, fixedSpot, frameById, fresh, isFree, locate, make, makeFrame, note, ops, parentSpot, presetOf, seq, settle, side, tokenOption, uid };
