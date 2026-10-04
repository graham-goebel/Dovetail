/* What a project uses of the system: the components and primitives placed,
   the token options its styles name, the surfaces its frames take, and the
   text styles its components are set in (a component's own default
   included). The inspector shows these when nothing is selected, so a
   project's variables, primitives and styles are the ones it has. */

import { DATA, META, TEXT_STYLES } from "../config.js";

var TEXT_KEYS = {};
TEXT_STYLES.forEach(function (t) { TEXT_KEYS[t[0]] = true; });

function emptyUsage() { return { types: {}, tokens: {}, text: {} }; }

function note(use, key, value) {
  if (typeof value !== "string" || !value) return;
  (use.tokens[key] = use.tokens[key] || {})[value] = true;
}

/* Every node in every frame of the documents given. */
function usageOf(docs, into) {
  var use = into || emptyUsage();
  (docs || []).forEach(function (doc) {
    if (!doc || !Array.isArray(doc.frames)) return;
    doc.frames.forEach(function (f) {
      note(use, "surface", f.surface || "base");
      (function walk(n) {
        if (n.type !== "Root" && n.type !== "Slot") use.types[n.type] = true;
        var st = n.style || {};
        Object.keys(st).forEach(function (k) { if (DATA.tokens[k]) note(use, k, st[k]); });
        var meta = META[n.type];
        var props = n.props || {};
        Object.keys(props).forEach(function (k) { if (typeof props[k] === "string" && TEXT_KEYS[props[k]]) use.text[props[k]] = true; });
        /* A prop that takes a text style, left at its default, uses that default. */
        if (meta) meta.props.forEach(function (p) {
          if (props[p.name] === undefined && typeof p.default === "string" && TEXT_KEYS[p.default] && Array.isArray(p.options) && p.options.some(function (o) { return TEXT_KEYS[o]; })) use.text[p.default] = true;
        });
        (n.children || []).forEach(walk);
      })(f.root);
    });
  });
  return use;
}

/* Two usages as one. */
function mergeUsage(a, b) {
  var out = emptyUsage();
  [a, b].forEach(function (u) {
    if (!u) return;
    Object.keys(u.types).forEach(function (t) { out.types[t] = true; });
    Object.keys(u.text).forEach(function (t) { out.text[t] = true; });
    Object.keys(u.tokens).forEach(function (k) { Object.keys(u.tokens[k]).forEach(function (v) { note(out, k, v); }); });
  });
  return out;
}

/* Whether a token option is used: under its own key, or any of the keys
   that take the same options (padding and its sides). */
function usesToken(use, keys, value) {
  return [].concat(keys).some(function (k) { return !!(use.tokens[k] && use.tokens[k][value]); });
}

export { emptyUsage, mergeUsage, usageOf, usesToken };
