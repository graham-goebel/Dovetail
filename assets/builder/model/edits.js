/* Edits as small changes. Any edit, however it was made, comes down to a
   list of changes that each name one thing: a field of a frame, a prop or
   style of one node, the order of a node's children, a node or frame added
   or removed. Each change carries what it replaced, so the list can be
   turned round to take the edit back.

   Changes name nodes by frame and id (node ids are unique within a frame,
   and every frame's root is "root"), never by position, so two lists made
   apart, by two people editing different parts of a canvas, can both be
   applied, in either order, and both survive. Where two lists change the
   same thing, the one applied last wins.

   diff(prev, next) gives the changes from one document to the next, and
   apply(doc, changes) makes them on any document, including one that has
   changed since. invert(changes) takes them back. Changes are plain data,
   so they can be saved or sent as JSON. Which frame is active is the
   viewer's own, so it never travels in a change. */

import { produce } from "immer";

/* -------------------------------------------------------------- records */

var GROUPS = { p: "props", s: "style" };

function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/* A node on its own: its fields, props and style, and its children's ids.
   A group the node doesn't have (no style, a leaf's children) stays
   undefined, so a node comes back exactly as it was. */
function nodeRecord(n) {
  var fields = {};
  Object.keys(n).forEach(function (k) {
    if (k !== "id" && k !== "children" && k !== "props" && k !== "style") fields[k] = n[k];
  });
  return {
    fields: fields,
    p: n.props === undefined ? undefined : Object.assign({}, n.props),
    s: n.style === undefined ? undefined : Object.assign({}, n.style),
    kids: Array.isArray(n.children) ? n.children.map(function (c) { return c.id; }) : undefined,
  };
}
function frameRecord(f) {
  var fields = {};
  Object.keys(f).forEach(function (k) { if (k !== "id" && k !== "root") fields[k] = f[k]; });
  return { fields: fields, root: f.root.id };
}
/* Every node in a frame, by id, parents before children. */
function nodesOf(f) {
  var out = [];
  (function walk(n) { out.push(n); (n.children || []).forEach(walk); })(f.root);
  return out;
}
function byId(list) {
  var m = new Map();
  list.forEach(function (x) { m.set(x.id, x); });
  return m;
}

/* ----------------------------------------------------------------- diff */

function diffFields(out, fid, nid, g, a, b) {
  var keys = {};
  Object.keys(a || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(b || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(keys).forEach(function (k) {
    var was = a ? a[k] : undefined, now = b ? b[k] : undefined;
    if (!same(was, now)) out.push({ t: "set", f: fid, n: nid, g: g, k: k, value: now, old: was });
  });
}

function diffNode(out, fid, a, b) {
  var ra = nodeRecord(a), rb = nodeRecord(b);
  diffFields(out, fid, a.id, "f", ra.fields, rb.fields);
  ["p", "s"].forEach(function (g) {
    if ((ra[g] === undefined) !== (rb[g] === undefined)) out.push({ t: "group", f: fid, n: a.id, g: g, value: rb[g], old: ra[g] });
    else diffFields(out, fid, a.id, g, ra[g], rb[g]);
  });
  if (!same(ra.kids, rb.kids)) out.push({ t: "kids", f: fid, n: a.id, value: rb.kids, old: ra.kids });
}

function addFrame(out, f) {
  out.push({ t: "addF", f: f.id, rec: frameRecord(f) });
  nodesOf(f).forEach(function (n) { out.push({ t: "addN", f: f.id, n: n.id, rec: nodeRecord(n) }); });
}
function delFrame(out, f) {
  out.push({ t: "delF", f: f.id, rec: frameRecord(f) });
  nodesOf(f).forEach(function (n) { out.push({ t: "delN", f: f.id, n: n.id, rec: nodeRecord(n) }); });
}

/* The changes that turn prev into next. A frame (or node) that's the same
   object in both, as immer leaves anything an edit didn't touch, is passed
   over without being looked into. */
function diff(prev, next) {
  var out = [];
  if (prev === next) return out;
  var pf = byId(prev.frames), nf = byId(next.frames);
  var po = prev.frames.map(function (f) { return f.id; }), no = next.frames.map(function (f) { return f.id; });
  next.frames.forEach(function (f) {
    var was = pf.get(f.id);
    if (!was) { addFrame(out, f); return; }
    if (was === f) return;
    diffFields(out, f.id, null, "f", frameRecord(was).fields, frameRecord(f).fields);
    if (was.root === f.root) return;
    var a = byId(nodesOf(was)), b = byId(nodesOf(f));
    b.forEach(function (n, id) {
      var old = a.get(id);
      if (!old) out.push({ t: "addN", f: f.id, n: id, rec: nodeRecord(n) });
      else if (old !== n) diffNode(out, f.id, old, n);
    });
    a.forEach(function (n, id) { if (!b.has(id)) out.push({ t: "delN", f: f.id, n: id, rec: nodeRecord(n) }); });
  });
  prev.frames.forEach(function (f) { if (!nf.has(f.id)) delFrame(out, f); });
  if (!same(po, no)) out.push({ t: "order", value: no, old: po });
  return out;
}

/* --------------------------------------------------------------- invert */

var OPPOSITE = { addF: "delF", delF: "addF", addN: "delN", delN: "addN" };

function invert(changes) {
  return changes.slice().reverse().map(function (c) {
    if (OPPOSITE[c.t]) return Object.assign({}, c, { t: OPPOSITE[c.t] });
    return Object.assign({}, c, { value: c.old, old: c.value });
  });
}

/* ---------------------------------------------------------------- apply */

function build(nid, rec) {
  var n = Object.assign({ id: nid }, rec.fields);
  if (rec.p !== undefined) n.props = Object.assign({}, rec.p);
  if (rec.s !== undefined) n.style = Object.assign({}, rec.s);
  if (rec.kids !== undefined) n.children = [];
  return n;
}
function put(obj, k, v) { if (v === undefined) delete obj[k]; else obj[k] = v; }

/* Makes the changes on doc, giving a new document (doc itself is left as
   it was). Changes are made in a fixed order, whatever order they come in:
   new frames and nodes first, then fields, then children, then removals,
   then the order of frames. A change to something that's no longer there
   (removed by someone else meanwhile) is passed over. */
function apply(doc, changes) {
  if (!changes || !changes.length) return doc;
  return produce(doc, function (d) {
    var frames = byId(d.frames);
    var made = {}, madeFrames = {}, rootOf = {};
    var index = {};
    /* Each frame's nodes and their parents, read once, before anything moves. */
    var look = function (fid) {
      if (index[fid]) return index[fid];
      var f = frames.get(fid);
      var nodes = new Map(), parent = new Map();
      if (f) (function walk(n, p) { nodes.set(n.id, n); if (p) parent.set(n.id, p); (n.children || []).forEach(function (c) { walk(c, n); }); })(f.root, null);
      index[fid] = { nodes: nodes, parent: parent };
      return index[fid];
    };
    var node = function (fid, nid) { return (made[fid] && made[fid][nid]) || look(fid).nodes.get(nid) || null; };
    var frame = function (fid) { return madeFrames[fid] || frames.get(fid) || null; };
    changes.forEach(function (c) { if (c.f && !madeFrames[c.f]) look(c.f); });

    changes.forEach(function (c) {
      if (c.t !== "addF" || frames.has(c.f)) return;
      madeFrames[c.f] = Object.assign({ id: c.f }, c.rec.fields);
      rootOf[c.f] = c.rec.root;
    });
    changes.forEach(function (c) {
      if (c.t !== "addN" || node(c.f, c.n)) return;
      (made[c.f] = made[c.f] || {})[c.n] = build(c.n, c.rec);
    });

    changes.forEach(function (c) {
      if (c.t === "set") {
        var on = c.n === null ? frame(c.f) : node(c.f, c.n);
        if (!on) return;
        if (c.g === "f") put(on, c.k, c.value);
        else { if (!on[GROUPS[c.g]]) on[GROUPS[c.g]] = {}; put(on[GROUPS[c.g]], c.k, c.value); }
      } else if (c.t === "group") {
        var gn = node(c.f, c.n);
        if (gn) put(gn, GROUPS[c.g], c.value === undefined ? undefined : Object.assign({}, c.value));
      }
    });

    /* Children: a new node's own, then every reordering. A node taken into
       a new parent leaves its old one, even when the old parent's own
       reordering isn't among these changes. */
    var orders = [];
    changes.forEach(function (c) {
      if (c.t === "addN" && c.rec.kids && made[c.f] && made[c.f][c.n]) orders.push({ f: c.f, n: c.n, value: c.rec.kids });
      else if (c.t === "kids") orders.push({ f: c.f, n: c.n, value: c.value });
    });
    var reordered = {};
    orders.forEach(function (o) { reordered[o.f + "\n" + o.n] = true; });
    var resolved = orders.map(function (o) {
      var seen = {};
      return { o: o, kids: (o.value || []).filter(function (id) { if (seen[id]) return false; seen[id] = true; return true; }).map(function (id) { return node(o.f, id); }).filter(Boolean) };
    });
    resolved.forEach(function (r) {
      var p = node(r.o.f, r.o.n);
      if (!p) return;
      if (r.o.value === undefined) { delete p.children; return; }
      r.kids.forEach(function (k) {
        var old = look(r.o.f).parent.get(k.id);
        if (old && old !== p && !reordered[r.o.f + "\n" + old.id] && old.children) old.children = old.children.filter(function (x) { return x.id !== k.id; });
      });
      p.children = r.kids;
    });

    changes.forEach(function (c) {
      if (c.t !== "delN") return;
      var p = look(c.f).parent.get(c.n);
      if (p && p.children) p.children = p.children.filter(function (x) { return x.id !== c.n; });
    });

    Object.keys(madeFrames).forEach(function (fid) { madeFrames[fid].root = node(fid, rootOf[fid]); });
    var gone = {};
    changes.forEach(function (c) { if (c.t === "delF") gone[c.f] = true; });
    var list = d.frames.filter(function (f) { return !gone[f.id]; });
    Object.keys(madeFrames).forEach(function (fid) { if (madeFrames[fid].root && !gone[fid]) list.push(madeFrames[fid]); });
    var order = null;
    changes.forEach(function (c) { if (c.t === "order") order = c.value; });
    if (order) {
      var pos = {};
      order.forEach(function (id, i) { pos[id] = i; });
      list = list.map(function (f, i) { return { f: f, i: i }; }).sort(function (x, y) {
        var a = pos[x.f.id] === undefined ? order.length + x.i : pos[x.f.id];
        var b = pos[y.f.id] === undefined ? order.length + y.i : pos[y.f.id];
        return a - b;
      }).map(function (x) { return x.f; });
    }
    if (!list.length) return;
    if (list.length !== d.frames.length || list.some(function (f, i) { return f !== d.frames[i]; })) d.frames = list;
    if (!list.some(function (f) { return f.id === d.active; })) d.active = list[list.length - 1].id;
  });
}

export { apply, diff, invert };
