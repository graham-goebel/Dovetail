/* What the code export makes of My components. An instance whose component
   is in the library is written as a call to that component, and the
   component once, as a function of its own, above the page:

     export function PromoCard({ title = "Card title" }) { return (...); }
     ... <PromoCard /> <PromoCard title="Second card" /> ...

   A text an instance changed (a Heading's words, a Card's title) becomes a
   prop of the component, its default the component's own text. Anything
   else an instance changed (its own padding, a layer added, a hidden part)
   isn't in the code: the call is the component as it is, and what was left
   out is listed so the Export dialog can say so.

   The frame writes the code (builder-frame.js); this decides what it
   writes, on copies, so nothing here touches the document. */

import { META } from "../config.js";
import { at, masterOf, overrides } from "./instances.js";
import { copy } from "./tree.js";

/* Kept by an instance, never by its component, so never a difference. */
var OWN_STYLE = ["x", "y", "ch", "cv", "fw", "fh", "rot", "rw", "rh"];

/* Whether a prop holds words a person types: children, or a prop the
   reader lists as text or as a node (a Card's title and description). */
function isText(type, key, value) {
  if (typeof value !== "string") return false;
  if (key === "children") return true;
  var meta = META[type];
  var spec = meta && (meta.props || []).filter(function (p) { return p.name === key; })[0];
  return !!spec && (spec.kind === "text" || spec.kind === "node");
}

/* A prop's name from what it holds: the layer's own name when it has one,
   else a word for its part ("title" for a heading's words, "label" for a
   button's), else the prop's own name. */
function propWord(node, key) {
  if (node.name) {
    var w = String(node.name).replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ""; });
    w = w.charAt(0).toLowerCase() + w.slice(1);
    if (/^[A-Za-z_$][\w$]*$/.test(w)) return w;
  }
  if (key !== "children") return key;
  if (node.type === "Heading") return "title";
  if (node.type === "Button" || node.type === "Link" || node.type === "Badge" || node.type === "Tag") return "label";
  if (node.type === "Quote") return "quote";
  return "text";
}

/* The function name for a component, kept clear of the system's own
   components and of each other: a component called Product card next to the
   system's ProductCard is MyProductCard. */
function functionName(name, taken) {
  var base = String(name || "Component").replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ""; })
    .replace(/^[a-z]/, function (c) { return c.toUpperCase(); }).replace(/^\d/, "C$&") || "Component";
  if (META[base] || base === "Root" || base === "Slot") base = "My" + base;
  var out = base, n = 2;
  while (taken[out]) out = base + n++;
  taken[out] = true;
  return out;
}

/* What an instance changed that the code leaves out, in a few words. */
function leftOut(ovs, master, textKeys) {
  var said = [];
  var add = function (s) { if (said.indexOf(s) < 0) said.push(s); };
  ovs.forEach(function (o) {
    var node = at(master, o.path);
    if (o.children) add("a different set of layers inside");
    if (o.style) {
      var keys = Object.keys(o.style).filter(function (k) { return o.path !== "" || OWN_STYLE.indexOf(k) < 0; });
      if (keys.length) add("its own " + keys.join(", ") + (o.path ? " on " + (node && (node.name || node.type) || "a layer") : ""));
    }
    if (o.flags && o.flags.hide !== undefined) add(o.flags.hide ? "a hidden layer" : "a layer shown that the component hides");
    if (o.props) {
      var other = Object.keys(o.props).filter(function (k) { return !textKeys[o.path + "\u0000" + k]; });
      if (other.length) add("its own " + other.join(", ") + (o.path ? " on " + (node && (node.name || node.type) || "a layer") : ""));
    }
  });
  return said;
}

/* roots: the layers being exported (a frame's root, or the picked layers).
   Returns { roots, components, leftOut }: the roots with each instance
   swapped for a call, the components those calls use (each with its node,
   its params and its function name, in the order first used), and per
   instance what the code doesn't carry. */
function codeWithComponents(roots, library) {
  var comps = {}, order = [], taken = {}, notes = [];

  /* Every instance of a component, here and inside other components. */
  var found = {};
  var collect = function (n) {
    var comp = n.inst ? masterOf(library, n) : null;
    if (comp) {
      (found[comp.id] = found[comp.id] || { comp: comp, instances: [] }).instances.push(n);
      if (!found[comp.id].seen) { found[comp.id].seen = true; (comp.node.children || []).forEach(collect); }
      return;
    }
    (n.children || []).forEach(collect);
  };
  roots.forEach(collect);

  /* A component's params: the texts any of its instances changed. */
  Object.keys(found).forEach(function (id) {
    var f = found[id], master = f.comp.node, params = [], keys = {}, words = {};
    f.instances.forEach(function (inst) {
      overrides(inst, master).forEach(function (o) {
        if (!o.props) return;
        Object.keys(o.props).forEach(function (k) {
          var node = at(master, o.path), v = o.props[k];
          if (!node || !isText(node.type, k, v)) return;
          var key = o.path + "\u0000" + k;
          if (keys[key]) return;
          var w = propWord(node, k), name = w, i = 2;
          while (words[name] || name === "style") name = w + i++;
          words[name] = true;
          keys[key] = name;
          params.push({ name: name, path: o.path, key: k, def: typeof (node.props || {})[k] === "string" ? node.props[k] : undefined });
        });
      });
    });
    params.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
    comps[id] = { id: id, comp: f.comp, params: params, keys: keys, instances: f.instances };
  });

  /* An instance as a call: its changed texts as props, its place kept. */
  var call = function (n) {
    var c = comps[n.inst.of];
    if (!c.fn) { c.fn = functionName(c.comp.name, taken); order.push(c); c.node = asComponent(c); }
    var ovs = overrides(n, c.comp.node), values = {};
    ovs.forEach(function (o) {
      Object.keys(o.props || {}).forEach(function (k) {
        var name = c.keys[o.path + "\u0000" + k];
        if (name) values[name] = o.props[k];
      });
    });
    var what = leftOut(ovs, c.comp.node, c.keys);
    if (what.length) notes.push({ id: n.id, name: n.name || c.comp.name, component: c.fn, what: what });
    var own = {};
    OWN_STYLE.forEach(function (k) { if (n.style && n.style[k] !== undefined) own[k] = n.style[k]; });
    var out = { id: n.id, type: "__Call", props: { name: c.fn, values: values }, style: own };
    if (n.hide) out.hide = true;
    return out;
  };
  var swap = function (n) {
    if (n.inst && comps[n.inst.of]) return call(n);
    if (!n.children) return n;
    return Object.assign({}, n, { children: n.children.map(swap) });
  };
  /* The component's own layers, its changed texts as its params, and any
     component inside it as a call of its own. */
  var asComponent = function (c) {
    var node = copy(c.comp.node);
    delete node.inst;
    OWN_STYLE.forEach(function (k) { if (node.style) delete node.style[k]; });
    c.params.forEach(function (p) {
      var t = at(node, p.path);
      if (t) { t.props = t.props || {}; t.props[p.key] = { __expr: p.name }; }
    });
    node.children = (node.children || []).map(swap);
    return node;
  };

  var out = roots.map(swap);
  return {
    roots: out,
    components: order.map(function (c) { return { name: c.fn, node: c.node, params: c.params.map(function (p) { return { name: p.name, def: p.def }; }) }; }),
    leftOut: notes,
  };
}

export { codeWithComponents, functionName, isText, propWord };
