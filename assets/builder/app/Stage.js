/* The stage: the canvas under the camera. The camera (where the canvas is
   and how far in) lives outside React, so a pan or zoom re-renders only the
   pieces here that read it through useCam, not the whole builder. Each
   piece draws from props the App hands it each render. */

import { LABEL_ROOM, LIVE_MAX, STAGE_PAD, VIRTUAL_AFTER, cx, e, nameOf } from "../config.js";
import { columnsOf, fixedSpot, frameById, isFree, locate } from "../model/tree.js";
import { Icon } from "../ui/icons.js";
import { InlineEditor, Renamable } from "../ui/parts.js";

/* ------------------------------------------------------------- camera */

var camNow = { x: STAGE_PAD, y: STAGE_PAD + LABEL_ROOM, z: 1 };
var camListeners = [];
var camera = {
  get: function () { return camNow; },
  set: function (c) { camNow = c; camListeners.slice().forEach(function (l) { l(); }); },
  subscribe: function (l) { camListeners.push(l); return function () { camListeners = camListeners.filter(function (x) { return x !== l; }); }; },
};
/* The camera as it is, re-rendering the caller when it moves. */
function useCam() { return React.useSyncExternalStore(camera.subscribe, camera.get); }

/* A rect in a frame's pixels, on the stage: through the frame's box and
   the camera. */
function onStage(r, b, c) {
  return { left: c.x + (b.x + r.left) * c.z, top: c.y + (b.y + r.top) * c.z, width: r.width * c.z, height: r.height * c.z };
}
/* The marks on the stage: what was measured (in each frame's own pixels),
   through each frame's box and the camera. */
function placeMarks(raw, boxes, cam) {
  var place = function (w) {
    var b = boxes[w.fid];
    if (!b) return null;
    var r = onStage(w.r, b, cam);
    if (!w.size) return { id: w.id, r: r };
    var z = cam.z, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { id: w.id, r: r, rot: w.rot, box: { left: cx - w.size.width * z / 2, top: cy - w.size.height * z / 2, width: w.size.width * z, height: w.size.height * z } };
  };
  var hv = raw.hover;
  return { sel: raw.sel.map(place).filter(Boolean), hover: hv && boxes[hv.fid] ? onStage(hv.r, boxes[hv.fid], cam) : null, drop: raw.drop,
    edited: (raw.edited || []).map(function (m) { var b = boxes[m.fid]; return b ? { id: m.id, icon: m.icon, label: m.label, r: onStage(m.r, b, cam) } : null; }).filter(Boolean) };
}

/* ------------------------------------------------------------- pieces */

/* Big projects keep only frames near the view live. A frame comes alive
   within half a screen of the view and is let go past a screen and a
   half, so panning doesn't make frames flicker in and out. The active
   frame is always live; up to VIRTUAL_AFTER frames, all are, and past
   that never more than LIVE_MAX. */
function World(p) {
  var cam = useCam();
  var liveNow = {};
  (function () {
    var many = p.doc.frames.length > VIRTUAL_AFTER;
    var keep = p.liveRef.current;
    var near = function (b, k) {
      if (!cam || !p.box.w || !b) return true;
      var vx = -cam.x / cam.z, vy = -cam.y / cam.z, vw = p.box.w / cam.z, vh = p.box.h / cam.z;
      return b.x < vx + vw * (1 + k) && b.x + b.w > vx - vw * k && b.y < vy + vh * (1 + k) && b.y + b.h > vy - vh * k;
    };
    var mid = { x: (p.box.w / 2 - cam.x) / cam.z, y: (p.box.h / 2 - cam.y) / cam.z };
    var gap = function (b) { return b ? Math.hypot(b.x + b.w / 2 - mid.x, b.y + b.h / 2 - mid.y) : Infinity; };
    var wanted = p.doc.frames.filter(function (f) {
      return !many || f.id === p.doc.active || near(p.boxes[f.id], keep[f.id] ? 1.5 : 0.5);
    });
    /* Zoomed far out, the nearest to the middle win: the active frame,
       then frames already live (so they don't reload), then by distance. */
    if (many && wanted.length > LIVE_MAX) {
      var rank = function (f) { return f.id === p.doc.active ? 0 : keep[f.id] ? 1 : 2; };
      wanted = wanted.slice().sort(function (x, y) { return rank(x) - rank(y) || gap(p.boxes[x.id]) - gap(p.boxes[y.id]); }).slice(0, LIVE_MAX);
    }
    wanted.forEach(function (f) { liveNow[f.id] = true; });
    p.liveRef.current = liveNow;
  })();
  return e("div", { className: "bd-world", style: { transform: "translate(" + cam.x + "px, " + cam.y + "px) scale(" + cam.z + ")" } },
      p.doc.frames.map(function (f) {
        var b = p.boxes[f.id];
        if (!liveNow[f.id]) {
          /* Far from view in a big project: a light stand-in until it's panned to. */
          return e("div", {
            key: f.id, className: cx("bd-frame", "bd-frame-ghost", f.bare && "is-bare"), "aria-hidden": "true",
            style: { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" },
          }, e("span", { className: "bd-frame-ghost-name" }, f.name));
        }
        return e("iframe", {
          key: f.id, className: cx("bd-frame", f.id === p.doc.active && "is-active", f.bare && "is-bare"),
          ref: function (el) { if (el) p.frameEls.current[f.id] = el; else delete p.frameEls.current[f.id]; },
          title: "Frame " + f.name + ", " + f.width + " by " + Math.round(b.h) + " pixels", src: p.frameSrc,
          onLoad: function () { p.frameReady(f.id); },
          style: { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" },
        });
      }));
}

/* Each frame's name and size, above it, with its menu when it's active. */
function Labels(p) {
  var cam = useCam();
  return e("div", { className: "bd-labels" },
    p.doc.frames.map(function (f) {
      var b = p.boxes[f.id];
      var on = f.id === p.doc.active;
      if (f.bare) return null;
      return e("div", {
        key: f.id, className: cx("bd-flabel", on && "is-current", on && !p.sel && p.frameOn && "is-selected"),
        style: { left: cam.x + b.x * cam.z + "px", top: cam.y + b.y * cam.z + "px", maxWidth: Math.max(80, b.w * cam.z) + "px" },
      },
        p.isRenaming("frame:" + f.id, "label")
          ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-flabel-name", onChange: function (v) { p.frameOps.rename(f.id, v); } })
          : e("button", {
            type: "button", className: "bd-flabel-btn", title: f.name + ", " + p.sizeText(f) + ". Drag to move it, Cmd-Shift-drag to drop a copy, double-click to rename.",
            onPointerDown: function (ev) { p.startFrameMove(ev, f); },
            onClick: function () { if (!p.justDragged.current) p.frameOps.pick(f.id); },
            onDoubleClick: function () { p.setRenaming({ id: "frame:" + f.id, where: "label" }); },
          }, e("span", { className: "bd-flabel-name" }, f.name)),
        e("span", { className: "bd-flabel-size" }, p.sizeText(f)),
        on && !p.preview ? p.frameMenu(f, "label") : null);
    }));
}

/* Layout columns over each frame, and the guides on it, under the
   selection's marks so its handles stay on top. */
function ViewMarks(p) {
  var cam = useCam();
  if (p.preview) return null;
  var z = cam.z, parts = [];
  if (p.canvasView.columns) p.doc.frames.forEach(function (f) {
    var b = p.boxes[f.id], m = p.colInfo[f.id];
    if (!b || f.bare || !m) return;
    var n = columnsOf(f), inner = Math.max(0, Math.min(m.pw, b.w - 2 * m.gut)), x0 = (b.w - inner) / 2, cw = (inner - (n - 1) * m.gap) / n;
    if (!(cw > 0)) return;
    var cols = [];
    for (var i = 0; i < n; i++) cols.push(e("span", { key: i, className: "bd-col", style: { left: (x0 + i * (cw + m.gap)) * z, width: cw * z } }));
    parts.push(e("div", { key: "cols-" + f.id, className: "bd-cols", "data-frame": f.id, style: { left: cam.x + b.x * z, top: cam.y + b.y * z, width: b.w * z, height: b.h * z } },
      e("span", { className: "bd-col-gut", style: { left: 0, width: x0 * z } }), e("span", { className: "bd-col-gut", style: { right: 0, width: (b.w - x0 - inner) * z } }), cols));
  });
  var line = function (key, f, axis, v, i, b, dragging) {
    var L = cam.x + b.x * z, T = cam.y + b.y * z;
    var style = axis === "x" ? { left: L + v * z, top: T, height: b.h * z } : { top: T + v * z, left: L, width: b.w * z };
    return e("div", { key: key, className: cx("bd-rguide", "is-" + axis, dragging && "is-dragging"), style: style, "data-guide": axis + v,
      title: dragging ? undefined : "Guide at " + axis + " " + v + ". Drag to move it, or onto a ruler to remove it",
      onPointerDown: dragging ? undefined : function (ev) { p.startGuide(ev, f.id, axis, i); } });
  };
  if (p.canvasView.guides || p.guideDrag) p.doc.frames.forEach(function (f) {
    var b = p.boxes[f.id];
    if (!b || !f.guides || !p.canvasView.guides) return;
    f.guides.forEach(function (g, i) {
      if (p.guideDrag && p.guideDrag.fid === f.id && p.guideDrag.i === i) return;
      parts.push(line(f.id + "-" + i, f, g.x !== undefined ? "x" : "y", g.x !== undefined ? g.x : g.y, i, b, false));
    });
  });
  if (p.guideDrag && !p.guideDrag.off && p.boxes[p.guideDrag.fid]) parts.push(line("drag", frameById(p.doc, p.guideDrag.fid), p.guideDrag.axis, p.guideDrag.v, -1, p.boxes[p.guideDrag.fid], true));
  return parts.length ? e("div", { className: "bd-view" }, parts) : null;
}

/* Rulers along the open canvas, numbered in the active frame's pixels,
   the selection's span lit; a press on one drags out a guide. */
function Rulers(p) {
  var cam = useCam();
  var marks = placeMarks(p.marksRaw, p.boxes, cam);
  var b = p.boxes[p.frame.id];
  if (p.preview || !p.canvasView.rulers || !p.wide || !b) return null;
  var ins = p.insets(), z = cam.z, X0 = cam.x + b.x * z, Y0 = cam.y + b.y * z;
  var w = Math.max(0, p.box.w - ins.l - ins.r - p.RULER), h = Math.max(0, p.box.h - p.RULER);
  var step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(function (n) { return n * z >= 56; })[0] || 5000;
  var ticks = function (from, len, origin) {
    var out = [];
    for (var v = Math.floor((from - origin) / z / step) * step; origin + v * z <= from + len; v += step) if (origin + v * z >= from) out.push(v);
    return out;
  };
  var span = null;
  marks.sel.forEach(function (m) {
    var r = m.r;
    if (!r) return;
    span = span ? { l: Math.min(span.l, r.left), t: Math.min(span.t, r.top), r: Math.max(span.r, r.left + r.width), b: Math.max(span.b, r.top + r.height) } : { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height };
  });
  var canGuide = !p.frame.bare;
  var x0 = ins.l + p.RULER;
  var dragAt = p.guideDrag && p.guideDrag.fid === p.frame.id && !p.guideDrag.off ? p.guideDrag : null;
  return e("div", { className: "bd-rulers" },
    e("div", { className: "bd-ruler-corner", style: { left: ins.l }, "aria-hidden": true }),
    e("div", { className: "bd-ruler is-top", style: { left: x0, width: w }, title: canGuide ? "Drag down for a guide across " + p.frame.name : undefined,
      onPointerDown: canGuide ? function (ev) { p.startGuide(ev, p.frame.id, "y", -1); } : undefined },
      span ? e("span", { className: "bd-ruler-span", style: { left: span.l - x0, width: span.r - span.l } }) : null,
      dragAt && dragAt.axis === "x" ? e("span", { className: "bd-ruler-at", style: { left: X0 + dragAt.v * z - x0 } }) : null,
      ticks(x0, w, X0).map(function (v) { return e("span", { key: v, className: "bd-ruler-tick", style: { left: X0 + v * z - x0 } }, e("span", { className: "bd-ruler-num" }, v)); })),
    e("div", { className: "bd-ruler is-left", style: { left: ins.l, height: h }, title: canGuide ? "Drag right for a guide down " + p.frame.name : undefined,
      onPointerDown: canGuide ? function (ev) { p.startGuide(ev, p.frame.id, "x", -1); } : undefined },
      span ? e("span", { className: "bd-ruler-span", style: { top: span.t - p.RULER, height: span.b - span.t } }) : null,
      dragAt && dragAt.axis === "y" ? e("span", { className: "bd-ruler-at", style: { top: Y0 + dragAt.v * z - p.RULER } }) : null,
      ticks(p.RULER, h, Y0).map(function (v) { return e("span", { key: v, className: "bd-ruler-tick", style: { top: Y0 + v * z - p.RULER } }, e("span", { className: "bd-ruler-num" }, v)); })));
}

/* The selection: its ring, marks, handles and tag; the hover; what a drag
   would do; a frame being copied. */
function Marks(p) {
  var cam = useCam();
  var marks = placeMarks(p.marksRaw, p.boxes, cam);
  return e("div", { className: "bd-marks", "aria-hidden": true },
    !p.preview && p.frameOn && p.boxes[p.frame.id] && !p.frame.bare ? e("div", { className: cx("bd-ring", !p.sel && "is-selected"), style: { left: cam.x + p.boxes[p.frame.id].x * cam.z, top: cam.y + p.boxes[p.frame.id].y * cam.z, width: p.boxes[p.frame.id].w * cam.z, height: p.boxes[p.frame.id].h * cam.z } }) : null,
    /* What an applied edit changed: a quiet label on each, until the next change. */
    !p.preview ? marks.edited.map(function (m) {
      return e("div", { key: "ed" + m.id, className: "bd-edit-on", style: { left: m.r.left, top: m.r.top, width: m.r.width, height: m.r.height } },
        e("span", { className: "bd-edit-on-tag" }, e(Icon, { name: m.icon }), m.label));
    }) : null,
    p.marquee ? e("div", { className: "bd-marquee", style: { left: p.marquee.left + "px", top: p.marquee.top + "px", width: p.marquee.width + "px", height: p.marquee.height + "px" } }) : null,
    !p.preview && marks.hover ? e("div", { className: "bd-mark bd-mark-hover", style: marks.hover }) : null,
    /* A selected free layer pinned to an edge: a dashed line to it. */
    !p.preview && p.sel && marks.sel.length === 1 && marks.sel[0].r && p.boxes[p.frame.id] && !p.frame.bare && p.frame.mode !== "structured" ? (function () {
      var at = locate(p.doc, p.sel), st = at && at.node.style;
      if (!st || !isFree(st) || (!st.ch && !st.cv)) return null;
      var m = marks.sel[0].r, fb = p.boxes[p.frame.id];
      var L = cam.x + fb.x * cam.z, T = cam.y + fb.y * cam.z, R = L + fb.w * cam.z, B = T + fb.h * cam.z;
      var mx = m.left + m.width / 2, my = m.top + m.height / 2, out = [];
      var across = function (k, x1, x2) { if (x2 - x1 > 1) out.push(e("div", { key: k, className: "bd-pin-mark is-x", style: { left: x1, top: my, width: x2 - x1 } })); };
      var down = function (k, y1, y2) { if (y2 - y1 > 1) out.push(e("div", { key: k, className: "bd-pin-mark is-y", style: { left: mx, top: y1, height: y2 - y1 } })); };
      if (st.ch === "right" || st.ch === "both") across("r", m.left + m.width, R);
      if (st.ch === "both") across("l", L, m.left);
      if (st.cv === "bottom" || st.cv === "both") down("b", m.top + m.height, B);
      if (st.cv === "both") down("t", T, m.top);
      return out;
    })() : null,
    !p.preview ? marks.sel.map(function (m) {
      var at = locate(p.doc, m.id);
      if (!at) return null;
      var isMain = m.id === p.sel && !p.edit;
      /* At the top of the stage, or of its frame (where the frame's name
         sits), the tag goes inside the box. */
      var frameTop = p.boxes[p.frame.id] ? cam.y + p.boxes[p.frame.id].y * cam.z : 0;
      var handles = isMain && !p.part && !fixedSpot(at) && at.node.type !== "Slot" && !at.node.lock ? (isFree(at.node.style) ? p.HANDLES_FREE : p.HANDLES_FLOW) : null;
      /* A line has a length and no height: its two ends are its handles. */
      if (handles && at.node.type === "Shape" && at.node.props && at.node.props.shape === "line") handles = ["w", "e"];
      var turnable = !!handles && isFree(at.node.style);
      var markStyle = m.rot ? Object.assign({}, m.box, { transform: "rotate(" + m.rot + "deg)" }) : m.r;
      /* Short or narrow on screen: the handles step outward (in CSS), so
         the body still takes a press to move it. */
      var short = (m.box || m.r).height < 28, narrow = (m.box || m.r).width < 28;
      return e("div", { key: m.id, className: cx("bd-mark bd-mark-sel", m.id !== p.sel && "is-extra", at.node.lock && "is-locked", at.node.inst && "is-instance", (m.r.top < 24 || m.r.top - frameTop < 24) && "is-top", p.sizing && p.sizing.id === m.id && "is-sizing", handles && short && "is-short", handles && narrow && "is-narrow"), style: markStyle },
        turnable ? ["nw", "ne", "se", "sw"].map(function (c) {
          return e("span", { key: "rot-" + c, className: "bd-rotate is-" + c, title: "Drag to turn; Shift snaps to 15°", onPointerDown: function (ev) { p.startRotate(ev, at.node.id); } });
        }) : null,
        isMain ? e("span", {
          className: "bd-mark-tag", title: "Drag to move",
          onPointerDown: function (ev) { ev.preventDefault(); ev.stopPropagation(); p.startDrag(ev, { kind: "move", id: at.node.id, label: at.node.type }); },
        }, nameOf(at.node) + (p.part && p.part.id === m.id ? " › Title" : ""),
          /* Its actions, the same as a right-click on it. Keyboard users
             have them on Shift+F10. */
          e("button", { type: "button", className: "bd-mark-more", tabIndex: -1, title: "Actions for " + nameOf(at.node), "aria-label": "Actions for " + nameOf(at.node),
            onPointerDown: function (ev) { ev.stopPropagation(); },
            onClick: function (ev) { ev.stopPropagation(); var r = ev.currentTarget.getBoundingClientRect(); p.openMenu(r.left, r.bottom + 4, at.node.id, p.frame.id); } },
            e(Icon, { name: "more" }))) : null,
        handles ? handles.map(function (dir) {
          return e("span", { key: dir, className: cx("bd-handle is-" + dir, p.sizing && p.sizing.id === m.id && p.sizing.dir === dir && "is-active"), title: "Drag to resize" + (dir.length === 2 ? "; Shift keeps the shape" : ""), onPointerDown: function (ev) { p.startNodeResize(ev, at.node.id, dir); } });
        }) : null);
    }) : null,
    marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
    marks.drop && marks.drop.guides ? marks.drop.guides.map(function (g, i) {
      return e("div", { key: i, className: cx("bd-guide", g.gap && "is-gap", g.v ? "is-v" : "is-h"), style: { left: g.left + "px", top: g.top + "px", width: g.width + "px", height: g.height + "px" } },
        g.label !== undefined ? e("span", { className: "bd-guide-label" }, g.label) : null);
    }) : null,
    marks.drop && marks.drop.box ? e("div", { className: cx("bd-mark-box", marks.drop.swap && "is-swap"), style: marks.drop.box }) : null,
    p.dupFrame ? e("div", { className: "bd-dup", style: { left: cam.x + p.dupFrame.x * cam.z, top: cam.y + p.dupFrame.y * cam.z, width: p.dupFrame.w * cam.z, height: p.dupFrame.h * cam.z } },
      e("span", { className: "bd-dup-tag" }, e(Icon, { name: "copy" }), p.dupFrame.name + " copy")) : null);
}

/* The spacing measured on Shift: lines and their token labels. */
function SpacingLines(p) {
  var cam = useCam();
  var atStage = function (r, fid) { var b = p.boxes[fid]; return b ? onStage(r, b, cam) : null; };
  return p.spacing ? e("div", { className: "bd-spacing" }, p.spacing.lines.map(function (l, i) {
    var r = atStage({ left: Math.min(l.x1, l.x2), top: Math.min(l.y1, l.y2), width: Math.abs(l.x2 - l.x1), height: Math.abs(l.y2 - l.y1) }, p.spacing.fid);
    if (!r) return null;
    var across = Math.abs(l.x2 - l.x1) >= Math.abs(l.y2 - l.y1);
    return e(React.Fragment, { key: i },
      e("div", { className: cx("bd-spacing-line", across ? "is-x" : "is-y"), style: across ? { left: r.left, top: r.top, width: r.width } : { left: r.left, top: r.top, height: r.height }, "aria-hidden": true }),
      e("button", { type: "button", className: "bd-spacing-tag", disabled: !l.owner, title: l.owner ? "Open this in the inspector" : "Not set by a token on either item",
        style: { left: r.left + (across ? r.width / 2 : 0), top: r.top + (across ? 0 : r.height / 2) },
        onPointerDown: function (ev) { ev.stopPropagation(); },
        onClick: function () { if (l.owner) p.openToken(l.owner, l.sec); } }, l.label));
  })) : null;
}

/* The text being edited in place, over its layer. */
function EditorAt(p) {
  var cam = useCam();
  var editBox = p.edit && p.edit.rect && p.boxes[p.edit.fid] ? onStage(p.edit.rect, p.boxes[p.edit.fid], cam) : null;
  return p.edit && editBox ? e(InlineEditor, { key: p.edit.id, value: p.edit.value, box: editBox, font: p.edit.font, scale: cam.z, onChange: p.editChange, onDone: p.editDone }) : null;
}

/* Each frame's edges and corner, to drag it to a size; the frame picked
   with nothing in it picked gets the same box and dots as a selection. */
function Resizers(p) {
  var cam = useCam();
  return e("div", { className: "bd-resizers", "aria-hidden": true },
    p.doc.frames.map(function (f) {
      var b = p.boxes[f.id];
      if (!b) return null;
      var X = cam.x + b.x * cam.z, Y = cam.y + b.y * cam.z, W = b.w * cam.z, H = b.h * cam.z;
      var r = p.resizing && p.resizing.fid === f.id ? p.resizing : null;
      /* A loose object takes a width (its height follows what it holds). */
      /* A frame's edge grips sit just outside it, so the handles of an
         object flush with the edge stay the ones that answer; the corner
         grip straddles the corner. */
      /* A loose object is its own frame: its grip straddles its edge. */
      if (f.bare) return e("div", { key: f.id, className: "bd-resize is-r", style: { left: X + W - 4, top: Y, height: H }, title: "Drag to set the width of " + f.name, onPointerDown: function (ev) { p.startResize(ev, f, "r"); } });
      /* The frame picked, with nothing in it picked: the same box as any
         selection, a dot at each corner and edges that take a drag. */
      var picked = f.id === p.doc.active && p.frameOn && !p.sel;
      var FRAME_EDGE = { nw: "lt", n: "t", ne: "rt", e: "r", se: "rb", s: "b", sw: "lb", w: "l" };
      return e(React.Fragment, { key: f.id },
        picked ? e("div", { className: "bd-frame-box", style: { left: X, top: Y, width: W, height: H } },
          p.HANDLES_FREE.map(function (dir) {
            return e("span", { key: dir, className: "bd-handle is-" + dir, title: "Drag to resize " + f.name, onPointerDown: function (ev) { p.startResize(ev, f, FRAME_EDGE[dir]); } });
          })) : null,
        e("div", { className: "bd-resize is-r", style: { left: X + W, top: Y, height: H }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { p.startResize(ev, f, "r"); } }),
        e("div", { className: "bd-resize is-b", style: { left: X, top: Y + H, width: W }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { p.startResize(ev, f, "b"); } }),
        e("div", { className: "bd-resize is-c", style: { left: X + W - 3, top: Y + H - 3 }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { p.startResize(ev, f, "c"); } }),
        r ? e("div", { className: "bd-resize-tag", style: { left: X + W, top: Y + H } }, p.sizeName(r.w, r.h != null ? r.h : f.hug ? null : f.height)) : null);
    }));
}

export { EditorAt, Labels, Marks, Resizers, Rulers, SpacingLines, ViewMarks, World, camera, onStage, placeMarks, useCam };
