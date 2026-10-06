/* Linked instances of My components. A node added from My components
   carries inst: { of: <component id>, rev: <the component's revision> } on
   its root, and is otherwise an ordinary subtree: it renders, exports and
   syncs like anything else, and keeps working if the component is gone.

   The link is what lets a component change everywhere at once. An instance
   is edited in place; "Update component" makes it the component's new
   revision, and every other instance is rebuilt from that revision with its
   own differences (its overrides) put back. Overrides aren't stored: they
   are read off when needed, by comparing the instance with the revision it
   was made from, place by place in the tree.

   An override is one node's props, style and flags (name, hide, lock) that
   differ, or, where an instance's children differ in number or kind from
   the component's, that whole list of children. The root's own position
   (x, y), name and flags belong to the instance, never to the component. */

import { copy, uid } from "./tree.js";

var FLAGS = ["name", "hide", "lock"];

function same(a, b) { return a === b || JSON.stringify(a) === JSON.stringify(b); }

/* Keys of b that differ from a, with undefined for keys a has and b lacks. */
function diffObj(a, b, skip) {
  var out = null;
  a = a || {}; b = b || {};
  Object.keys(a).concat(Object.keys(b)).forEach(function (k) {
    if (skip && skip.indexOf(k) >= 0) return;
    if (out && k in out) return;
    if (!same(a[k], b[k])) { out = out || {}; out[k] = b[k]; }
  });
  return out;
}

/* Whether two lists of children line up: same length, same kinds (and for
   slots the same slot). */
function lined(as, bs) {
  if (as.length !== bs.length) return false;
  return as.every(function (c, i) { return c.type === bs[i].type && (c.type !== "Slot" || c.props.name === bs[i].props.name); });
}

/* The node at a path of child indexes ("" is the root). */
function at(node, path) {
  if (!path) return node;
  var n = node;
  var parts = path.split("/");
  for (var i = 0; i < parts.length; i++) {
    n = n && n.children ? n.children[Number(parts[i])] : null;
    if (!n) return null;
  }
  return n;
}

/* How inst differs from master: [{ path, props?, style?, flags?, children? }]. */
function overrides(inst, master) {
  var out = [];
  (function walk(a, b, path) {
    var o = { path: path };
    var props = diffObj(b.props, a.props);
    var style = diffObj(b.style, a.style, path === "" ? ["x", "y", "ch", "cv"] : null);
    if (props) o.props = props;
    if (style) o.style = style;
    if (path !== "") {
      var flags = null;
      FLAGS.forEach(function (k) { if (!same(a[k], b[k])) { flags = flags || {}; flags[k] = a[k]; } });
      if (flags) o.flags = flags;
    }
    var ak = a.children || [], bk = b.children || [];
    if (a.children && !lined(ak, bk)) o.children = copy(ak);
    else ak.forEach(function (c, i) { walk(c, bk[i], path ? path + "/" + i : String(i)); });
    if (o.props || o.style || o.flags || o.children) out.push(o);
  })(inst, master, "");
  return out;
}

/* A copy with new ids throughout. */
function reid(n) {
  var c = copy(n);
  (function walk(x) { x.id = uid(); (x.children || []).forEach(walk); })(c);
  return c;
}

function setKeys(target, patch) {
  Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete target[k]; else target[k] = patch[k]; });
}

/* A fresh copy of master with the overrides put back where their paths
   still exist. */
function applyOverrides(master, ovs) {
  var out = reid(master);
  ovs.forEach(function (o) {
    var n = at(out, o.path);
    if (!n) return;
    if (o.props) { n.props = n.props || {}; setKeys(n.props, o.props); }
    if (o.style) { n.style = n.style || {}; setKeys(n.style, o.style); }
    if (o.flags) setKeys(n, o.flags);
    if (o.children && n.children) n.children = copy(o.children);
  });
  return out;
}

/* inst, rebuilt on a new revision of its component: its differences from
   the revision it was made from (was) survive, and so do its own id,
   position, name and flags. */
function rebase(inst, was, next, rev) {
  var out = applyOverrides(next, overrides(inst, was || next));
  out.id = inst.id;
  FLAGS.forEach(function (k) { if (inst[k] !== undefined) out[k] = inst[k]; else delete out[k]; });
  out.style = out.style || {};
  if (inst.style && inst.style.x !== undefined) {
    out.style.x = inst.style.x; out.style.y = inst.style.y;
    ["ch", "cv"].forEach(function (k) { if (inst.style[k]) out.style[k] = inst.style[k]; else delete out.style[k]; });
  } else { delete out.style.x; delete out.style.y; delete out.style.ch; delete out.style.cv; }
  out.inst = { of: inst.inst.of, rev: rev };
  return out;
}

/* Every instance of a component in a document: [{ fid, parent, index, node }]. */
function instancesOf(doc, compId) {
  var out = [];
  doc.frames.forEach(function (f) {
    (function walk(n) {
      (n.children || []).forEach(function (c, i) {
        if (c.inst && c.inst.of === compId) out.push({ fid: f.id, parent: n, index: i, node: c });
        else walk(c);
      });
    })(f.root);
  });
  return out;
}

/* On a document (or a draft of one): rebuilds every instance of a component
   on its new revision, except the one it came from. Returns how many. */
function updateInstances(doc, compId, was, next, rev, exceptId) {
  var hits = instancesOf(doc, compId), n = 0;
  hits.forEach(function (h) {
    if (h.node.id === exceptId) { h.node.inst = { of: compId, rev: rev }; return; }
    h.parent.children[h.index] = rebase(h.node, was, next, rev);
    n++;
  });
  return n;
}

/* Takes the link off every instance of a component. Returns how many. */
function detachAll(doc, compId) {
  var hits = instancesOf(doc, compId);
  hits.forEach(function (h) { delete h.node.inst; });
  return hits.length;
}

/* The component a node's instance is made from, as the library has it. */
function masterOf(library, node) {
  if (!node || !node.inst || !library) return null;
  return (library.components || []).filter(function (c) { return c.id === node.inst.of; })[0] || null;
}

/* Whether an instance of a component sits anywhere below a node. A
   component can't hold itself: an instance added into one of its own
   instances goes beside it, and an instance holding one can't become the
   component's next revision. */
function holdsInstanceOf(node, compId) {
  return (node.children || []).some(function (c) { return (c.inst && c.inst.of === compId) || holdsInstanceOf(c, compId); });
}

export { applyOverrides, at, detachAll, holdsInstanceOf, instancesOf, masterOf, overrides, rebase, reid, updateInstances };
