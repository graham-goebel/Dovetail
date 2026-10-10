/* A frame as a spec another tool can build from: the system's components it
   uses (and the variants each is set to), the design tokens behind its
   styles, the file's own components it holds, and its layers in order. The
   assistant's frame_spec tool adds the frame's code to it; the Dovetail MCP
   server (tools/mcp/server.mjs) reads it from a .dovetail file. Nothing here
   touches the document. */

import { DATA, META } from "../config.js";

var SKIP = { Root: 1, Slot: 1 };

/* The CSS custom properties a style value stands for, by its family. */
function styleTokens(key, value) {
  var fam = DATA.tokens[key] || DATA.tokens[key.replace(/(Top|Right|Bottom|Left|TopLeft|TopRight|BottomLeft|BottomRight)$/, "")];
  if (!fam || value == null || value === "") return [];
  var o = (fam.options || []).filter(function (x) { return x.value === value; })[0];
  return o ? (o.tokens || []) : [];
}

/* { name, mode, width, layers, components: [{ type, count, variants: {prop: [values]} }],
     tokens: [{ token, families: [...] }], own: [{ name, count }] } */
function specOf(frame, library) {
  var comps = {}, toks = {}, own = {}, layers = 0;
  var names = {};
  ((library && library.components) || []).forEach(function (c) { names[c.id] = c.name; });
  (function walk(n) {
    (n.children || []).forEach(function (c) {
      if (!SKIP[c.type]) {
        layers++;
        var rec = comps[c.type] || (comps[c.type] = { type: c.type, count: 0, variants: {} });
        rec.count++;
        var specs = (META[c.type] && META[c.type].props) || [];
        specs.forEach(function (sp) {
          var v = c.props && c.props[sp.name];
          if (sp.kind !== "enum" || v == null || v === "" || v === sp.default) return;
          var list = rec.variants[sp.name] || (rec.variants[sp.name] = []);
          if (list.indexOf(String(v)) < 0) list.push(String(v));
        });
        Object.keys(c.style || {}).forEach(function (k) {
          styleTokens(k, c.style[k]).forEach(function (t) {
            var fams = toks[t] || (toks[t] = []);
            var fam = k.replace(/(Top|Right|Bottom|Left|TopLeft|TopRight|BottomLeft|BottomRight)$/, "");
            if (fams.indexOf(fam) < 0) fams.push(fam);
          });
        });
        if (c.type === "Group" && c.props && c.props.gap && c.props.gap !== "none") {
          var gt = "--dt-space-" + (c.props.direction === "row" ? "inline" : "stack") + "-" + c.props.gap;
          var gf = toks[gt] || (toks[gt] = []);
          if (gf.indexOf("gap") < 0) gf.push("gap");
        }
        if (c.inst && c.inst.of) { var nm = names[c.inst.of] || c.name || "A component"; own[nm] = (own[nm] || 0) + 1; }
      }
      walk(c);
    });
  })(frame.root || { children: [] });
  return {
    name: frame.name, mode: frame.mode || "free", width: frame.width, dark: !!frame.dark, layers: layers,
    components: Object.keys(comps).sort().map(function (k) { return comps[k]; }),
    tokens: Object.keys(toks).sort().map(function (t) { return { token: t, families: toks[t] }; }),
    own: Object.keys(own).sort().map(function (k) { return { name: k, count: own[k] }; }),
  };
}

/* The spec as Markdown, with the frame's outline and, when given, its code. */
function specText(spec, outlineText, code) {
  var out = ["# " + spec.name, "", spec.mode + " frame, " + spec.width + " wide" + (spec.dark ? ", dark" : "") + ", " + spec.layers + (spec.layers === 1 ? " layer" : " layers") + ". Built only from Dovetail components and tokens: use them as they are, and don't swap in raw values."];
  out.push("", "## Components");
  if (!spec.components.length) out.push("None yet.");
  spec.components.forEach(function (c) {
    var vs = Object.keys(c.variants).map(function (k) { return k + " " + c.variants[k].join("/"); });
    out.push("- " + c.type + " ×" + c.count + (vs.length ? ": " + vs.join(", ") : ""));
  });
  if (spec.own.length) {
    out.push("", "## The file's own components", "Each is written once as a function and called where it's used.");
    spec.own.forEach(function (o) { out.push("- " + o.name + " ×" + o.count); });
  }
  out.push("", "## Tokens");
  if (!spec.tokens.length) out.push("Only the components' own defaults.");
  spec.tokens.forEach(function (t) { out.push("- " + t.token + " (" + t.families.join(", ") + ")"); });
  if (outlineText) out.push("", "## Layers", "```", outlineText, "```");
  if (code) out.push("", "## Code", "```jsx", code, "```");
  return out.join("\n");
}

export { specOf, specText, styleTokens };
