/* The Assets panel: five kinds (frames, primitives, variables, components,
   blocks, templates), each a gallery of tiles to press or drag onto the
   canvas, with your own components first and a search across them all.
   The App adds and swaps; Assets draws. Memoized. */

import { DATA, GROUP_ICON, META, PRESETS, TYPE_ICON, allSame, cx, e, kbd, nameOf, optionAllowed, useState } from "../config.js";
import { STARTERS } from "../model/starters.js";
import { usesToken } from "../model/usage.js";
import { Icon } from "../ui/icons.js";
import { BUILDER_ICON, Dropdown, Segmented, Thumb } from "../ui/parts.js";

/* Assets open on five kinds: primitives to build with, the system's
   variables, components, blocks and templates. A kind opens its own
   gallery; a search looks through every component at once. */
var ASSET_KINDS = [
  ["containers", "Containers", "frame", "Empty frames to build in: freeform, structured, tall, and every screen size"],
  ["primitives", "Primitives", "swatch", "Groups, stacks, grids, shapes and type to build with"],
  ["variables", "Variables", "variable", "The system's tokens: colour, spacing, radius, shadow and size"],
  ["components", "Components", "component", "Buttons, forms, navigation, feedback, commerce and chat"],
  ["blocks", "Blocks", "blocks", "Whole page sections, ready to fill"],
  ["templates", "Templates", "file", "Ready-made pages, as new frames or into one"],
];
var KIND_GROUPS = { primitives: ["layout", "typography"], blocks: ["blocks"] };
function groupsOf(kind) {
  if (KIND_GROUPS[kind]) return DATA.groups.filter(function (g) { return KIND_GROUPS[kind].indexOf(g.id) >= 0; });
  if (kind === "components") return DATA.groups.filter(function (g) { return g.id !== "blocks" && KIND_GROUPS.primitives.indexOf(g.id) < 0; });
  return [];
}
/* The types a group offers that this build can place. */
function usableIn(p, g) { return g.items.filter(function (n) { return !p.placeable || p.placeable[n]; }); }
/* Primitives show as their icon and name; components draw a preview. */
var PLAIN = {};
groupsOf("primitives").forEach(function (g) { g.items.forEach(function (n) { PLAIN[n] = true; }); });
function tileList(p, items) {
  return e("ul", { className: cx("bd-tiles", p.view === "list" ? "is-list" : "is-grid") }, items.map(function (n) {
    var meta = META[n];
    var plain = PLAIN[n];
    return e("li", { key: n },
      e("button", {
        type: "button", className: cx("bd-tile", plain && "is-icon"), "data-type": n, "aria-label": "Add " + n,
        title: (meta.blurb ? n + ": " + meta.blurb : n) + ". Cmd-drag onto a component to swap it.",
        onPointerDown: function (ev) { p.startDrag(ev, { kind: "new", type: n, label: n, thumb: ev.currentTarget.querySelector(".bd-thumb") }); },
        onClick: function (ev) {
          if (p.justDragged.current) return;
          p.addOrSwap(n, ev.metaKey || ev.ctrlKey);
        },
      },
        plain ? e("span", { className: "bd-thumb is-icon", "aria-hidden": true }, e(Icon, { name: TYPE_ICON[n] || BUILDER_ICON[n] || "box", className: "bd-thumb-ic" }))
          : e(Thumb, { type: n, wide: meta.group === "blocks" }),
        e("span", { className: "bd-tile-text" },
          e("span", { className: "bd-tile-name" }, n),
          p.view === "list" ? e("span", { className: "bd-tile-blurb" }, meta.blurb || "") : null)));
  }));
}
function viewToggle(p) {
  return e(Segmented, { label: "View", value: p.view, onChange: p.setView, options: [{ value: "grid", label: "Grid", icon: "gridView" }, { value: "list", label: "List", icon: "listView" }] });
}

/* Variables in Assets: everything the system has, or what this project
   uses already; one picked applies to the selection, where it fits. */
var VAR_SETS = [
  ["surface", "Fill", "color"], ["border", "Border", "color"], ["padding", "Padding", "space"],
  ["radius", "Radius", "radius"], ["elevation", "Shadow", "shadow"], ["w", "Width", "size"],
];
function variablesPanel(p, varScope, setVarScope) {
  var picked = p.picked;
  var sc = p.scope;
  var own = picked.length && picked.every(function (n) { return n.type === picked[0].type; }) && META[picked[0].type] ? META[picked[0].type].ownPadding : null;
  return e("div", { className: "bd-vars" },
    e("p", { className: "bd-content-note bd-vars-note" }, picked.length ? "Press one to apply it to " + (picked.length === 1 ? nameOf(picked[0]) : picked.length + " layers") + "." : "Select a layer on the canvas, then press one to apply it."),
    e(Segmented, { key: "scope", label: "Show", wide: true, className: "bd-vars-scope", value: varScope, onChange: function (v) { if (v) setVarScope(v); },
      options: [{ value: "used", label: "In this project" }, { value: "all", label: "Everything" }] }),
    VAR_SETS.map(function (vs) {
      var def = DATA.tokens[vs[0]];
      if (!def) return null;
      var keys = [vs[0]].concat(def.sides || []);
      /* With a selection, only what suits it, as in the inspector; and
         only what the project uses, when that's what's shown. */
      var opts = def.options.filter(function (o) { return (vs[0] !== "w" || (o.family !== "fit" && o.family !== "container")) && (!sc || optionAllowed(vs[0], o, sc)) && (varScope !== "used" || usesToken(p.used, keys, o.value)); });
      if (varScope === "used" && !opts.length) return e("section", { key: vs[0], className: "bd-vars-sec" }, e("h3", { className: "bd-content-h" }, vs[1]), e("p", { className: "bd-sec-empty" }, "None in this project yet."));
      var cur = picked.length && allSame(picked.map(function (n) { return n.style[vs[0]] || ""; })) ? picked[0].style[vs[0]] || "" : null;
      return e("section", { key: vs[0], className: "bd-vars-sec", "aria-labelledby": "bd-vars-" + vs[0] },
        e("h3", { className: "bd-content-h", id: "bd-vars-" + vs[0] }, vs[1]),
        e("div", { className: cx("bd-vars-list", "is-" + vs[2]) }, (vs[0] === "padding" && own ? [e("button", { key: "__own", type: "button", className: "bd-var bd-var-own", "aria-pressed": String(cur === ""),
          title: own.token + ": " + nameOf(picked[0]) + "'s own padding. Clears Padding so it applies",
          onClick: function () { var patch = { padding: undefined }; DATA.tokens.padding.sides.forEach(function (k) { patch[k] = undefined; }); p.setStyles(picked.map(function (n) { return n.id; }), patch); p.announce(nameOf(picked[0]) + " takes its own padding, " + own.label); } },
          e("span", { className: "bd-var-name" }, "Default: " + own.label))] : []).concat(opts.map(function (o) {
          var px = p.pxMap[vs[0] + "|" + o.value];
          var tok = o.tokens[0];
          return e("button", { key: o.value, type: "button", className: "bd-var", "aria-pressed": String(cur === o.value),
            title: (o.tokens.join(" · ") || o.value) + (picked.length ? ". Apply to the selection" : ""),
            onClick: function () { p.applyVar(vs[0], o.value, vs[1]); } },
            vs[2] === "color" && tok ? e("span", { className: "bd-sw", style: { background: "var(" + tok + ")" }, "aria-hidden": true })
              : vs[2] === "radius" && tok ? e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + tok + ")" }, "aria-hidden": true })
              : vs[2] === "shadow" && tok ? e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + tok + ")" }, "aria-hidden": true })
              : px != null ? e("span", { className: "bd-var-px" }, Math.round(px)) : null,
            e("span", { className: "bd-var-name" }, o.label || o.value));
        }))));
    }));
}

/* A frame drawn to its proportions, inside a box of maxW by maxH pixels. */
function framePic(w, h, kind, maxW, maxH) {
  var k = Math.min((maxW || 84) / w, (maxH || 52) / h);
  var box = { width: Math.round(w * k) + "px", height: Math.round(h * k) + "px" };
  return e("span", { key: w + "x" + h, className: cx("bd-mini-frame", kind && "is-" + kind), style: box, "aria-hidden": true },
    kind === "structured" ? [0, 1, 2].map(function (i) { return e("span", { key: i, className: "bd-mini-bar" }); })
      : kind === "free" ? [0, 1, 2].map(function (i) { return e("span", { key: i, className: "bd-mini-dot" }); }) : null);
}
/* The first level of Assets is an icon per kind, with its name and count;
   the pictures wait one level down, inside each kind. */
function kindPic(icon) {
  return e("span", { className: "bd-kind-pics is-asset", "aria-hidden": true }, e(Icon, { name: icon }));
}
/* Each template by its first block, so they look like what they are. */
var TEMPLATE_PIC = { landing: ["HeroBlock", true], store: ["ProductGridBlock", true], settings: ["Field", false], chat: ["ChatBlock", false] };

/* Containers: an empty frame to build in. Freeform, structured or tall, or
   one of the screen sizes. Press one to add it beside your frames; drag it
   onto the canvas to put it where you drop it. */
var CONTAINER_KINDS = [
  ["free", "Freeform frame", "frame", "Place anything anywhere, in any colour"],
  ["structured", "Structured frame", "layout", "Auto-layout Groups with tokens, ready for code"],
  ["page", "Tall frame", "file", "Grows as tall as what's on it"],
];
function containerCard(p, key, name, pic, note, payload, onAdd) {
  return e("li", { key: key },
    e("button", { type: "button", className: "bd-kind bd-container-card", "data-container": key, title: note + ". Press to add one beside your frames, or drag it onto the canvas.",
      onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.startDrag(ev, payload); },
      onClick: function () { if (!p.justDragged.current) onAdd(); } },
      pic,
      e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, name), e("span", { className: "bd-kind-note" }, note))));
}
function containersPanel(p) {
  return e(React.Fragment, null,
    e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Frames")),
    e("ul", { className: "bd-kinds bd-containers", role: "list" }, CONTAINER_KINDS.map(function (k) {
      var page = k[0] === "page", opts = page ? null : { mode: k[0] };
      var shape = page ? framePic(390, 900, "tall") : framePic(1280, 800, k[0]);
      return containerCard(p, k[0], k[1], e("span", { className: "bd-kind-pics is-preview is-frames" }, shape), k[3], { kind: "tool", tool: page ? "page" : "frame", label: k[1], opts: opts }, function () { p.frameAdd(null, page, null, opts); });
    })),
    e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Screen sizes")),
    e("ul", { className: "bd-kinds bd-containers", role: "list" }, PRESETS.map(function (p) {
      var opts = { preset: p.id, mode: "free" };
      return containerCard(p, p.id, p.label, e("span", { className: "bd-kind-pics is-preview is-frames" }, framePic(p.width, p.height)), p.width + " × " + p.height, { kind: "tool", tool: "frame", label: p.label, opts: opts }, function () { p.frameAdd(null, false, null, opts); });
    })));
}
function templatesPanel(p) {
  return e("ul", { className: "bd-kinds bd-templates", role: "list" }, STARTERS.filter(function (st) { return st[0] !== "blank"; }).map(function (st) {
    return e("li", { key: st[0] },
      e("div", { className: "bd-kind bd-tpl-card", "data-template": st[0] },
        TEMPLATE_PIC[st[0]] && META[TEMPLATE_PIC[st[0]][0]] ? e("span", { className: "bd-kind-pics is-preview" }, e(Thumb, { type: TEMPLATE_PIC[st[0]][0], wide: TEMPLATE_PIC[st[0]][1] })) : e("span", { className: "bd-kind-pics" }, e(Icon, { name: "file" })),
        e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, st[1])),
        e("span", { className: "bd-tpl-acts" },
          e("button", { type: "button", className: "bd-btn bd-btn-sm bd-tpl-new", onClick: function () { p.addTemplate(st[0]); }, title: "As a new frame beside yours" }, e(Icon, { name: "plus" }), "New frame"),
          e("button", { type: "button", className: "bd-btn bd-btn-sm bd-tpl-into", onClick: function () { p.addTemplate(st[0], true); }, title: "At the end of " + p.frameName }, "Into " + p.frameName))));
  }));
}

/* Your own components, with what each is built on. */
function mineList(p, list) {
  return e("ul", { className: "bd-mine", role: "list" }, list.map(function (c) {
    var layers = 0;
    (function walk(n) { layers++; (n.children || []).forEach(walk); })(c.node);
    return e("li", { key: c.id, className: "bd-mine-item" },
      e("button", { type: "button", className: "bd-mine-btn", "data-local": c.id, title: c.name + ": drag onto a frame, or press to add. Built on " + c.tokens.slice(0, 6).join(", ") + (c.tokens.length > 6 ? "…" : ""),
        onPointerDown: function (ev) { p.startDrag(ev, { kind: "local", comp: c, type: c.node.type, label: c.name }); },
        onClick: function () { if (!p.justDragged.current) p.addLocal(c); } },
        e("span", { className: "bd-sys-lead" }, e(Icon, { name: "component" })),
        e("span", { className: "bd-mine-text" }, e("span", { className: "bd-mine-name" }, c.name), e("span", { className: "bd-mine-meta" }, layers + (layers === 1 ? " layer" : " layers") + " · " + c.tokens.length + (c.tokens.length === 1 ? " token" : " tokens")))),
      e(Dropdown, { menu: true, label: "Actions for " + c.name, icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon",
        options: [{ value: "add", label: "Add to " + p.frameName, icon: "plus" }, { value: "rename", label: "Rename", icon: "pencil" }, { value: "delete", label: "Delete", icon: "trash", danger: true }],
        onChange: function (v) { if (v === "add") p.addLocal(c); else if (v === "rename") p.renameComponent(c.id); else if (v === "delete") p.removeComponent(c.id); } }));
  }));
}

/* { query, library, kind, category, view, placeable, picked, scope, pxMap, used,
     frameName, justDragged, setView, setAssetKind, setCategory, startDrag,
     addOrSwap(type, swap), addLocal(comp), renameComponent(id), removeComponent(id),
     applyVar(key, value, label), setStyles(ids, patch), announce, addTemplate(id, into),
     frameAdd(size, page, at, opts) } */
var Assets = React.memo(function Assets(p) {
  /* Variables: everything, or what this project uses; the panel's own. */
  var scopeState = useState("all");
  var varScope = scopeState[0], setVarScope = scopeState[1];
  var q = p.query.trim().toLowerCase();
  var head = null;
  if (q) {
    var found = [];
    DATA.groups.forEach(function (g) {
      usableIn(p, g).forEach(function (n) {
        if (n.toLowerCase().indexOf(q) >= 0 || String(META[n].blurb || "").toLowerCase().indexOf(q) >= 0) found.push(n);
      });
    });
    var foundMine = (p.library.components || []).filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; });
    return e("div", { className: "bd-assets" }, head,
      foundMine.length ? e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "My components", e("span", { className: "bd-count" }, foundMine.length))) : null,
      foundMine.length ? mineList(p, foundMine) : null,
      e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Results", e("span", { className: "bd-count" }, found.length)), viewToggle(p)),
      found.length || foundMine.length ? null : e("p", { className: "bd-empty-note" }, "Nothing matches."),
      tileList(p, found));
  }
  if (!p.kind) {
    return e("div", { className: "bd-assets is-cards" }, head,
      e("ul", { className: "bd-kinds bd-asset-kinds", role: "list" }, ASSET_KINDS.map(function (k) {
        var note = k[3];
        var count = k[0] === "containers" ? "Frames and screen sizes" : k[0] === "variables" ? VAR_SETS.length + " sets" : k[0] === "templates" ? (STARTERS.length - 1) + " pages" : groupsOf(k[0]).reduce(function (t, g) { return t + usableIn(p, g).length; }, 0) + " to add";
        return e("li", { key: k[0] }, e("button", { type: "button", className: "bd-kind", "data-asset-kind": k[0], title: note, onClick: function () { p.setAssetKind(k[0]); } },
          kindPic(k[2]),
          e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, k[1]), e("span", { className: "bd-kind-count" }, count))));
      })));
  }
  var kind = ASSET_KINDS.filter(function (k) { return k[0] === p.kind; })[0] || ASSET_KINDS[0];
  var back = e("div", { className: "bd-panel-head bd-gallery-head" },
    e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Assets", title: "Back to Assets", onClick: function () { p.setAssetKind(null); } }, e(Icon, { name: "left" })),
    e("h2", { className: "bd-panel-title" }, kind[1]));
  if (kind[0] === "variables") return e("div", { className: "bd-assets" }, head, back, variablesPanel(p, varScope, setVarScope));
  if (kind[0] === "templates") return e("div", { className: "bd-assets is-cards" }, head, back, templatesPanel(p));
  if (kind[0] === "containers") return e("div", { className: "bd-assets is-cards" }, head, back, containersPanel(p));
  var groups = groupsOf(kind[0]);
  /* Components open with yours, then the system's. */
  if (kind[0] === "components") groups = [{ id: "mine", label: "My components", items: [] }].concat(groups);
  var current = groups.filter(function (x) { return x.id === p.category; })[0] || groups[kind[0] === "components" && (p.library.components || []).length ? 0 : kind[0] === "components" ? 1 : 0];
  var items = usableIn(p, current);
  if (current.id === "mine") {
    var mine = p.library.components || [];
    return e("div", { className: "bd-assets" },
      head, back,
      e("div", { className: "bd-cats", role: "group", "aria-label": "Categories" }, groups.map(function (g) {
        return e("button", { key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(current.id === g.id), onClick: function () { p.setCategory(g.id); } },
          e(Icon, { name: g.id === "mine" ? "component" : GROUP_ICON[g.id] || "box" }), e("span", { className: "bd-cat-label" }, g.label));
      })),
      e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "My components", e("span", { className: "bd-count" }, mine.length))),
      mine.length ? mineList(p, mine) : e("div", { className: "bd-empty" }, e(Icon, { name: "component" }),
        e("p", null, kbd("Nothing here yet. Select layers on the canvas and press Create component in the inspector (Ctrl+Alt+K). It has to be built from tokens; the builder says what stops it if not."))));
  }
  return e("div", { className: "bd-assets" },
    head,
    back,
    groups.length > 1 ? e("div", { className: "bd-cats", role: "group", "aria-label": "Categories" },
      groups.map(function (g) {
        var on = current.id === g.id;
        return e("button", {
          key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(on), title: g.label + ": " + usableIn(p, g).length + " to add",
          onClick: function () { p.setCategory(g.id); },
        }, e(Icon, { name: GROUP_ICON[g.id] || "box" }), e("span", { className: "bd-cat-label" }, g.label));
      })) : null,
    e("div", { className: "bd-assets-head" },
      e("h3", { className: "bd-assets-title" }, current.label, e("span", { className: "bd-count" }, items.length)),
      viewToggle(p)),
    items.length ? null : e("p", { className: "bd-empty-note" }, "Nothing here yet."),
    tileList(p, items));
});

export { Assets };
