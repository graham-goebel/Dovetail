/* A component's page in the Assets panel, opened by pressing its tile: a
   live preview, drawn by the system's own component, and every property the
   builder can set, each change shown at once. Insert adds it to the frame as
   set; the preview can be dragged onto a frame instead. Nothing touches the
   document until then. */

import { META, cx, e, useEffect, useMemo, useRef, useState, words } from "../config.js";
import { Icon, PROP_LABEL } from "../ui/icons.js";
import { Dropdown, Segmented, Switch, ThumbGuard } from "../ui/parts.js";
import { IconPicker } from "../ui/IconLibrary.js";

function ds() { return window.BeamMobileDesignSystem_e33121 || {}; }

/* The first element of a type in a specimen's tree. */
function findElement(node, type) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) { var hit = findElement(node[i], type); if (hit) return hit; }
    return null;
  }
  if (node.type === type) return node;
  return node.props ? findElement(node.props.children, type) : null;
}

/* What a new one starts with, as the canvas draws it: its specimen's props,
   then its own defaults (null removes one). */
function baseProps(type) {
  var Comp = ds()[type], specs = window.DovetailSpecimens;
  var props = {};
  var build = specs && ((specs.samples && specs.samples[type]) || (specs.build && specs.build[type]));
  if (Comp && build) {
    try { var el = findElement(build(), Comp); if (el) props = Object.assign({}, el.props); } catch (err) { props = {}; }
  }
  var own = specs && specs.defaults && specs.defaults[type];
  if (own) Object.keys(own).forEach(function (k) { if (own[k] === null) delete props[k]; else props[k] = own[k]; });
  return props;
}

/* The live preview, scaled down to the panel's width when it's wider. */
function Preview(p) {
  var box = useRef(null), stage = useRef(null);
  var scaleState = useState(1);
  useEffect(function () {
    var fit = function () {
      if (!box.current || !stage.current) return;
      var W = box.current.clientWidth - 24, w = stage.current.scrollWidth;
      scaleState[1](w > 0 && W > 0 ? Math.min(1, W / w) : 1);
    };
    fit();
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
    if (ro) { ro.observe(box.current); ro.observe(stage.current); }
    return function () { if (ro) ro.disconnect(); };
  }, [p.wide]);
  var Comp = ds()[p.type];
  var s = scaleState[0];
  return e("div", { className: "bd-cd-preview", ref: box, title: "Drag onto a frame to place it as set",
    onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.onDrag(ev, box.current); } },
    e("div", { className: "bd-cd-stage", ref: stage, inert: "", "aria-hidden": "true", style: { width: p.wide ? 1280 : undefined, transform: s < 1 ? "scale(" + s + ")" : undefined } },
      Comp ? e(ThumbGuard, { key: JSON.stringify(p.props) }, e(Comp, p.props)) : null));
}

/* One property's control. */
function control(spec, value, set) {
  var id = "bd-cd-" + spec.name;
  var label = spec.name === "children" ? "Text" : PROP_LABEL[spec.name] || words(spec.name);
  var row = function (inline, body) {
    return e("div", { key: spec.name, className: cx("bd-field", inline && "is-inline") },
      e("span", { className: "bd-field-label", id: id }, label), body);
  };
  if (spec.kind === "boolean") return row(true, e(Switch, { labelledBy: id, value: !!value, onChange: function (v) { set(v || undefined); } }));
  if (spec.kind === "enum") {
    var opts = spec.options || [];
    var short = opts.length <= 4 && opts.every(function (o) { return String(o).length <= 9; });
    return row(false, short
      ? e(Segmented, { labelledBy: id, value: value == null ? spec.default : value, onChange: function (v) { set(v); }, options: opts.map(function (o) { return { value: o, label: String(o) }; }) })
      : e(Dropdown, { labelledBy: id, value: value == null ? spec.default : value, className: "bd-dd-field", onChange: function (v) { set(v); }, options: opts.map(function (o) { return { value: o, label: String(o) }; }) }));
  }
  if (spec.kind === "icon") return row(false, e(IconPicker, { id: id, value: value || spec.default, onChange: set }));
  if (spec.kind === "number") return row(false, e("input", { className: "bd-input", type: "number", "aria-labelledby": id, value: value == null ? "" : value, placeholder: spec.default == null ? "" : String(spec.default),
    onChange: function (ev) { var n = ev.target.value === "" ? undefined : Number(ev.target.value); set(isNaN(n) ? undefined : n); } }));
  if ((spec.kind === "text" || spec.kind === "node") && (value == null || typeof value === "string")) return row(false, e("input", { className: "bd-input", type: "text", "aria-labelledby": id, value: value || "",
    onChange: function (ev) { set(ev.target.value); } }));
  return null;
}

/* { type, frameName, justDragged, back(), insert(type, props), startDrag(ev, payload) } */
function ComponentDetail(p) {
  var meta = META[p.type] || { props: [] };
  var base = useMemo(function () { return baseProps(p.type); }, [p.type]);
  var chosenState = useState({}), chosen = chosenState[0], setChosen = chosenState[1];
  var set = function (k) { return function (v) { setChosen(function (c) { var n = Object.assign({}, c); if (v === undefined) delete n[k]; else n[k] = v; return n; }); }; };
  var live = Object.assign({}, base, chosen);
  var hasText = typeof base.children === "string";
  /* What can be set here: choices, switches, numbers, an icon, and words
     (a node prop only when it holds words). Pictures, lists, links and
     slots are set from the inspector once it's placed. */
  var specs = meta.props.filter(function (sp) { return sp.kind !== "media" && sp.kind !== "list" && sp.kind !== "url" && !(sp.kind === "node" && typeof live[sp.name] !== "string"); });
  var rows = (hasText ? [control({ name: "children", kind: "text" }, live.children, set("children"))] : [])
    .concat(specs.map(function (sp) { return control(sp, live[sp.name], set(sp.name)); })).filter(Boolean);
  var payload = function (thumb) { return { kind: "new", type: p.type, label: p.type, props: Object.assign({}, chosen), thumb: thumb }; };
  var changed = Object.keys(chosen).length;
  return e("div", { className: "bd-cd" },
    e("div", { className: "bd-panel-head bd-gallery-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to the components", title: "Back", onClick: p.back }, e(Icon, { name: "left" })),
      e("h2", { className: "bd-panel-title" }, p.type),
      meta.href ? e("a", { className: "bd-act bd-act-ghost", href: meta.href, target: "_blank", rel: "noopener", "aria-label": p.type + " docs", title: "Open the docs" }, e(Icon, { name: "book" })) : null),
    meta.blurb ? e("p", { className: "bd-cd-blurb" }, meta.blurb + ".") : null,
    e(Preview, { type: p.type, props: live, wide: meta.group === "blocks", onDrag: function (ev, el) { p.startDrag(ev, payload(el)); } }),
    e("div", { className: "bd-cd-props" },
      rows.length ? rows : e("p", { className: "bd-empty-note" }, "Nothing to set before it's placed. Change it from the inspector once it's on a frame.")),
    e("div", { className: "bd-cd-foot" },
      changed ? e("button", { type: "button", className: "bd-btn", onClick: function () { setChosen({}); } }, "Reset") : null,
      e("button", { type: "button", className: "bd-btn bd-btn-primary bd-cd-insert", title: "Add it to " + p.frameName + " as set", onClick: function () { if (!p.justDragged.current) p.insert(p.type, Object.assign({}, chosen)); } },
        e(Icon, { name: "plus" }), "Insert")));
}

export { ComponentDetail, baseProps };
