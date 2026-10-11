/* Dovetail Icons in the builder: the library the system ships (v1, drawn by
   the system's Icon component), as a searchable grid by category. The
   inspector's icon picker and the Content panel's Icons gallery both use it.
   The glyphs come from the system bundle the page already loads, so the
   builder draws exactly what a page will. */

import { cx, e, useMemo, useState } from "../config.js";

function ds() { return window.BeamMobileDesignSystem_e33121 || {}; }
function libGroups() { var I = ds().Icon; return (I && I.groups) || []; }
function libHas(name) { return libGroups().some(function (g) { return g[1].indexOf(name) >= 0; }); }

/* One glyph, drawn by the system's Icon. */
function Glyph(p) {
  var I = ds().Icon;
  return I ? e(I, { name: p.name, size: p.size || "lg" }) : null;
}

function words(n) { return n.replace(/-/g, " "); }

/* The grid. onPick(name) on press; onDrag(ev, name) on a mouse or pen press
   that may turn into a drag. current marks the chosen one. */
function IconGrid(p) {
  var qState = useState("");
  var q = qState[0].trim().toLowerCase();
  var groups = useMemo(function () {
    var all = libGroups();
    if (!q) return all;
    return all.map(function (g) {
      var hit = g[0].toLowerCase().indexOf(q) >= 0;
      return [g[0], hit ? g[1] : g[1].filter(function (n) { return words(n).indexOf(q) >= 0; })];
    }).filter(function (g) { return g[1].length; });
  }, [q]);
  return e("div", { className: cx("bd-iconlib-grid", p.className) },
    e("input", { className: "bd-input bd-iconlib-q", type: "search", placeholder: "Search 320 icons", "aria-label": "Search icons", value: qState[0],
      autoFocus: !!p.autoFocus, onChange: function (ev) { qState[1](ev.target.value); } }),
    groups.length ? groups.map(function (g) {
      return e("section", { key: g[0], className: "bd-iconlib-group", "aria-label": g[0] },
        e("h4", { className: "bd-iconlib-cat" }, g[0]),
        e("div", { className: "bd-iconlib-cells", role: "list" }, g[1].map(function (n) {
          return e("button", { key: n, type: "button", role: "listitem", className: cx("bd-iconlib-cell", p.current === n && "is-on"), "data-icon-name": n,
            "aria-label": words(n), "aria-pressed": p.current != null ? String(p.current === n) : undefined, title: p.title ? p.title(n) : words(n),
            onPointerDown: p.onDrag ? function (ev) { if (ev.pointerType !== "touch") p.onDrag(ev, n); } : undefined,
            onClick: function () { p.onPick(n); } }, e(Glyph, { name: n }));
        })));
    }) : e("p", { className: "bd-empty-note" }, "No icons match."));
}

/* The inspector's control for an Icon's name: the chosen glyph and its name,
   pressed to open the grid in place. */
function IconPicker(p) {
  var open = useState(false);
  var name = p.value;
  return e("div", { className: "bd-iconpick" },
    e("button", { type: "button", className: "bd-iconpick-btn", id: p.id, "aria-expanded": String(open[0]), title: "Swap for another icon from the library",
      onClick: function () { open[1](!open[0]); } },
      e("span", { className: "bd-iconpick-glyph" }, p.mixed ? null : e(Glyph, { name: name || "star" })),
      e("span", { className: "bd-iconpick-name" }, p.mixed ? "Mixed" : words(name || "star")),
      e("span", { className: "bd-iconpick-act" }, open[0] ? "Done" : "Swap")),
    open[0] ? e(IconGrid, { current: p.mixed ? null : name, autoFocus: true, onPick: function (n) { p.onChange(n); } }) : null);
}

export { Glyph, IconGrid, IconPicker, libGroups, libHas };
