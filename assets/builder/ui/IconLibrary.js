/* Dovetail Icons in the builder: the library the system ships (v1, drawn by
   the system's Icon component), as a searchable grid by category. The
   inspector's icon picker and the Content panel's Icons gallery both use it.
   The glyphs come from the system bundle the page already loads, so the
   builder draws exactly what a page will. */

import { cx, e, useEffect, useMemo, useRef, useState } from "../config.js";

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

/* A page's or folder's own icon, as the list shows it: a library icon, an
   emoji, or the plain icon it falls back to (drawn by fallback()). */
function ItemGlyph(p) {
  var icon = p.icon || "";
  if (/^lib:/.test(icon)) return e("span", { className: "bd-item-glyph" }, e(Glyph, { name: icon.slice(4), size: "sm" }));
  if (icon) return e("span", { className: "bd-item-glyph is-emoji", "aria-hidden": "true" }, icon);
  return p.fallback();
}

var EMOJI = ["📄", "📁", "🏠", "⭐", "❤️", "🔥", "✨", "🎨", "🖼️", "📷", "🎬", "🎵", "📚", "📝", "📌", "📎", "🗂️", "📊", "📈", "💡",
  "🔍", "⚙️", "🔒", "🔔", "💬", "✉️", "📅", "⏰", "🛒", "💳", "🎁", "🏷️", "🚀", "🌍", "🌱", "☀️", "🌙", "⚡", "✅", "❌",
  "⚠️", "❓", "👋", "👤", "👥", "🤝", "🧪", "🧩", "🛠️", "📦", "🏁", "🎯", "🍕", "☕", "🐾", "🌈"];

/* Pick a page's or folder's icon: one from the library, or an emoji (from
   the set, or typed or pasted). onPick(icon or null); onClose(). */
function IconChooser(p) {
  var tab = useState(/^lib:/.test(p.value || "") || !p.value ? "icons" : "emoji");
  var typed = useState("");
  var box = useRef(null);
  useEffect(function () {
    var away = function (ev) { if (box.current && !box.current.contains(ev.target)) p.onClose(); };
    var esc = function (ev) { if (ev.key === "Escape") { ev.stopPropagation(); p.onClose(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", esc, true);
    return function () { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", esc, true); };
  }, []);
  return e("div", { className: "bd-chooser", ref: box, role: "dialog", "aria-label": p.label },
    e("div", { className: "bd-chooser-head" },
      e("div", { className: "bd-chooser-tabs", role: "tablist" },
        [["icons", "Icons"], ["emoji", "Emoji"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-chooser-tab", "aria-selected": String(tab[0] === t[0]), onClick: function () { tab[1](t[0]); } }, t[1]);
        })),
      p.value ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { p.onPick(null); } }, "Reset") : null),
    tab[0] === "icons"
      ? e(IconGrid, { current: /^lib:/.test(p.value || "") ? p.value.slice(4) : null, autoFocus: true, onPick: function (n) { p.onPick("lib:" + n); } })
      : e("div", { className: "bd-chooser-emoji" },
        e("div", { className: "bd-emoji-cells", role: "list" }, EMOJI.map(function (em) {
          return e("button", { key: em, type: "button", role: "listitem", className: cx("bd-emoji-cell", p.value === em && "is-on"), "aria-label": em, onClick: function () { p.onPick(em); } }, em);
        })),
        e("form", { className: "bd-emoji-own", onSubmit: function (ev) { ev.preventDefault(); if (typed[0].trim()) p.onPick(typed[0].trim()); } },
          e("input", { className: "bd-input", type: "text", maxLength: 16, placeholder: "Or type or paste an emoji", "aria-label": "Your own emoji", value: typed[0], onChange: function (ev) { typed[1](ev.target.value); } }),
          e("button", { type: "submit", className: "bd-btn bd-btn-sm", disabled: !typed[0].trim() }, "Use"))));
}

export { Glyph, IconChooser, IconGrid, IconPicker, ItemGlyph, libGroups, libHas };
