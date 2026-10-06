/* The Layers panel: every frame as a tree of its layers, a component's own
   parts shown under it, with folding, renaming, hiding, locking, dragging to
   reorder and a filter. Memoized: it redraws when the document, selection or
   its own state change, not when the canvas pans or the inspector edits. */

import { cx, e, frameSize, hasTitlePart, isContainer, isOwner, nameOf, nodeIsOpen, nodeLabel, typeIcon } from "../config.js";
import { locate } from "../model/tree.js";
import { Icon } from "../ui/icons.js";
import { Renamable } from "../ui/parts.js";

var PART_ICON = { Heading: "heading", Text: "type", Image: "image", Video: "video", Icon: "star", Button: "pointer", Link: "link", Field: "form", Select: "form", "Text area": "form", Label: "type", List: "listView", Item: "listView", Figure: "figure", Navigation: "compass" };

/* { doc, selection, partId, listDrop, hover, frameOn, hasSel, query, collapsed,
     openFrames, renaming, boxes, scalars, layersRef, justDragged,
     setCollapsed, setHover, setRenaming, setOpenFrames,
     pick(id, additive, deep, from, fid, part), openMenu(x, y, id, fid),
     startDrag(ev, payload), setName(id, name), flagLayer(id, fid, key),
     framePick(fid), frameRename(fid, name), anatomyOf(fid, id) } */
var Layers = React.memo(function Layers(p) {
  var doc = p.doc, q = p.query.trim().toLowerCase();
  var labelOf = function (n) { return nodeLabel(n, p.scalars); };
  var isOpen = function (n) { return nodeIsOpen(n, p.collapsed); };
  var frameIsOpen = function (f) { return p.openFrames[f.id] !== undefined ? p.openFrames[f.id] : f.id === doc.active; };
  var isRenaming = function (id, where) { return !!p.renaming && p.renaming.id === id && p.renaming.where === where; };
  var toggle = function (id) {
    var at = locate(doc, id);
    var owner = at && !isContainer(at.node.type);
    p.setCollapsed(function (c) { var n = Object.assign({}, c); if (owner) { if (n[id] === false) delete n[id]; else n[id] = false; } else if (n[id]) delete n[id]; else n[id] = true; return n; });
  };
  var rowsFor = function (f) {
    var keep = null;
    if (q) {
      keep = {};
      (function walk(n, path) {
        (n.children || []).forEach(function (c) {
          var hit = c.type.toLowerCase().indexOf(q) >= 0 || labelOf(c).toLowerCase().indexOf(q) >= 0;
          if (hit) { keep[c.id] = true; path.forEach(function (x) { keep[x] = true; }); }
          if (c.children) walk(c, path.concat([c.id]));
        });
      })(f.root, []);
    }
    var rows = [];
    var walk = function (n, depth) {
      (n.children || []).forEach(function (c) {
        if (keep && !keep[c.id]) return;
        rows.push({ n: c, depth: depth });
        if (!(q || isOpen(c))) return;
        if (isOwner(c) && !q) walkOwner(c, depth + 1);
        else if (c.children) walk(c, depth + 1);
      });
    };
    var walkOwner = function (c, depth) {
      var slots = (c.children || []).filter(function (k) { return k.type === "Slot"; });
      var placed = {};
      var tree = p.anatomyOf(f.id, c.id) || [];
      var seq0 = 0;
      (function parts(list, d) {
        list.forEach(function (it) {
          if (it.slot) {
            var sl = slots.filter(function (x) { return x.id === it.slot; })[0];
            if (!sl || placed[sl.id]) return;
            placed[sl.id] = true;
            rows.push({ n: sl, depth: d });
            if (isOpen(sl)) walk(sl, d + 1);
            return;
          }
          rows.push({ part: it, owner: c, depth: d, key: c.id + "-p" + (seq0++) });
          parts(it.children || [], d + 1);
        });
      })(tree, depth);
      slots.forEach(function (sl) { if (placed[sl.id]) return; rows.push({ n: sl, depth: depth }); if (isOpen(sl)) walk(sl, depth + 1); });
    };
    walk(f.root, 1);
    return rows;
  };
  var partRow = function (r, f) {
    var it = r.part;
    if (it.kind === "Heading" && hasTitlePart(r.owner.type) && f) {
      var onPart = p.partId != null && p.partId === r.owner.id && f.id === doc.active;
      return e("div", { key: r.key, className: cx("bd-layer is-part is-pickable", onPart && "is-current"), role: "treeitem", "aria-level": r.depth + 1, "aria-selected": String(!!onPart),
        style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" } },
        e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
        e("button", { type: "button", className: "bd-layer-main", title: "The title of " + r.owner.type + ": its words and size", onClick: function () { p.pick(r.owner.id, false, false, "layers", f.id, "title"); } },
          e(Icon, { name: "heading" }), e("span", { className: "bd-layer-name" }, "Title"), it.text ? e("span", { className: "bd-layer-text" }, it.text) : null));
    }
    return e("div", {
      key: r.key, className: "bd-layer is-part", role: "treeitem", "aria-level": r.depth + 1, "aria-disabled": "true",
      style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" },
      title: it.kind + " in " + r.owner.type + ": part of the component, set through its props in the inspector",
    },
      e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
      e("span", { className: "bd-layer-main is-static" },
        e(Icon, { name: PART_ICON[it.kind] || "component" }),
        e("span", { className: "bd-layer-name" }, it.kind),
        it.text ? e("span", { className: "bd-layer-text" }, it.text) : null));
  };
  var nodeRow = function (f, r) {
    if (r.part) return partRow(r, f);
    var n = r.n;
    var mine = f.id === doc.active;
    var text = labelOf(n);
    var on = mine && p.selection.indexOf(n.id) >= 0;
    var owner = isOwner(n);
    var open = isOpen(n) || (!!q && !owner);
    var folds = !!n.children || owner;
    var renameable = n.type !== "Slot";
    var listDrop = p.listDrop, hover = p.hover;
    return e("div", {
      key: n.id, className: cx("bd-layer", on && "is-current", n.hide && "is-hidden", n.lock && "is-locked", n.inst && "is-instance", listDrop && listDrop.inside === n.id && "is-drop-inside", hover && hover.f === f.id && hover.id === n.id && "is-hover"),
      "data-layer": mine ? n.id : undefined, "data-frame-row": mine ? undefined : f.id, "data-depth": r.depth, role: "treeitem", "aria-selected": String(on), "aria-level": r.depth + 1,
      "aria-expanded": folds ? String(open) : undefined,
      style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" },
      onPointerEnter: function () { p.setHover({ f: f.id, id: n.id }); },
      onPointerLeave: function () { p.setHover(null); },
      onContextMenu: function (ev) { if (n.type !== "Slot") { ev.preventDefault(); p.openMenu(ev.clientX, ev.clientY, n.id, f.id); } },
    },
      folds ? e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + nameOf(n), title: owner && !open ? "Show what " + n.type + " is made of" : undefined, onClick: function () { toggle(n.id); } }, e(Icon, { name: "right" }))
        : e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
      e("button", {
        type: "button", className: "bd-layer-main",
        onClick: function (ev) { if (!p.justDragged.current) p.pick(n.id, mine && (ev.shiftKey || ev.metaKey || ev.ctrlKey), false, "layers", f.id); },
        onDoubleClick: function () { if (renameable && mine) p.setRenaming({ id: n.id, where: "layer" }); },
        onPointerDown: function (ev) { if (mine && ev.pointerType === "mouse" && n.type !== "Slot" && !n.lock) p.startDrag(ev, { kind: "move", id: n.id, label: nameOf(n) }); },
      },
        e(Icon, { name: n.inst ? "component" : typeIcon(n.type) }),
        renameable && mine && isRenaming(n.id, "layer")
          ? e(Renamable, { value: n.name || n.type, label: "Layer name", startEditing: true, className: "bd-layer-name", onChange: function (v) { p.setRenaming(null); p.setName(n.id, v === n.type ? "" : v); } })
          : e("span", { className: "bd-layer-name" }, nameOf(n)),
        text && !n.name ? e("span", { className: "bd-layer-text" }, text) : null),
      /* Hiding lives in the inspector's Layer section; a hidden row keeps
         a quiet eye-off, which also shows it again. */
      n.type !== "Slot" ? e("span", { className: cx("bd-layer-flags", (n.hide || n.lock) && "is-set") },
        n.hide ? e("button", { type: "button", className: "bd-layer-flag is-hidden-mark", "aria-label": "Show " + nameOf(n), title: "Hidden: press to show (Ctrl+Shift+H)",
          onClick: function (ev) { ev.stopPropagation(); p.flagLayer(n.id, f.id, "hide"); } }, e(Icon, { name: "eyeOff" })) : null,
        e("button", { type: "button", className: cx("bd-layer-flag", n.lock && "is-on"), "aria-pressed": String(!!n.lock), "aria-label": (n.lock ? "Unlock " : "Lock ") + nameOf(n), title: n.lock ? "Locked: press to unlock (Ctrl+Shift+L)" : "Lock (Ctrl+Shift+L)",
          onClick: function (ev) { ev.stopPropagation(); p.flagLayer(n.id, f.id, "lock"); } }, e(Icon, { name: n.lock ? "lock" : "lockOpen" }))) : null);
  };
  var listDrop = p.listDrop;
  return e("div", { className: "bd-layers-panel" },
    e("div", { className: "bd-layers", ref: p.layersRef, role: "tree", "aria-label": "Layers", "aria-multiselectable": "true" },
      doc.frames.map(function (f) {
        var on = f.id === doc.active;
        var open = frameIsOpen(f) || !!q;
        var head = e("div", {
          key: "frame-" + f.id, className: cx("bd-layer bd-layer-frame", on && !p.hasSel && p.frameOn && "is-current", on && "is-active-frame", listDrop && listDrop.inside === "frame:" + f.id && "is-drop-inside"),
          "data-layer": on ? "root" : undefined, "data-frame-row": f.id, role: "treeitem", "aria-level": 1,
          "aria-selected": String(on && !p.hasSel && p.frameOn), "aria-expanded": String(open),
        },
          e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + f.name,
            onClick: function () { p.setOpenFrames(function (m) { var nx = Object.assign({}, m); nx[f.id] = !open; return nx; }); } }, e(Icon, { name: "right" })),
          e("button", {
            type: "button", className: "bd-layer-main", title: on ? "Double-click to rename" : "Show " + f.name,
            onClick: function () { p.framePick(f.id, true); },
            onDoubleClick: function () { p.setRenaming({ id: "frame:" + f.id, where: "layer" }); },
          },
            e(Icon, { name: f.bare ? "component" : "frame" }),
            isRenaming("frame:" + f.id, "layer")
              ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-layer-name", onChange: function (v) { p.frameRename(f.id, v); } })
              : e("span", { className: "bd-layer-name" }, f.name),
            e("span", { className: "bd-layer-text" }, f.bare ? "Loose on the canvas" : frameSize(f, p.boxes))));
        if (!open) return head;
        var rows = rowsFor(f);
        return e(React.Fragment, { key: "frame-" + f.id },
          head,
          rows.length ? rows.map(function (r) { return nodeRow(f, r); }) : e("p", { className: "bd-empty-note bd-empty-indent" }, q ? "No layers match." : "Empty. Add something from Assets."));
      }),
      listDrop && listDrop.indicator ? e("div", { className: "bd-layers-line", style: { top: listDrop.indicator.top + "px", left: listDrop.indicator.left + "px" }, "aria-hidden": true }) : null));
});

export { Layers };
