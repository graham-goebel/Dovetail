/* A component's page in the Assets panel, opened by pressing its tile: a
   live preview, drawn by the system's own component, the examples built
   from it, and every property the builder can set, each change shown at
   once. Choosing an example starts from it; Insert adds it to the frame as
   set, and the preview or an example can be dragged onto a frame instead.
   Nothing touches the document until then. */

import { META, cx, e, isContainer, useEffect, useMemo, useRef, useState, words } from "../config.js";
import { exampleKids, galleryOf } from "../model/gallery.js";
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

/* A node and what's in it, drawn as the canvas draws it: each part from its
   specimen's props, then its own; what's in a slot goes into the prop it
   stands for. */
function drawNode(node, key) {
  var Comp = ds()[node.type];
  if (!Comp) return null;
  var props = Object.assign({ key: key }, baseProps(node.type));
  var own = node.props || {};
  Object.keys(own).forEach(function (k) { if (own[k] == null) delete props[k]; else props[k] = own[k]; });
  var kids = node.children || [];
  kids.forEach(function (c, i) {
    if (c.type === "Slot") props[c.props.name] = c.children && c.children.length ? c.children.map(function (k, j) { return drawNode(k, i + "." + j); }) : null;
  });
  var flow = kids.filter(function (c) { return c.type !== "Slot"; });
  if (isContainer(node.type)) {
    delete props.children;
    if (flow.length) return e(Comp, props, flow.map(function (c, i) { return drawNode(c, "f" + i); }));
  }
  return e(Comp, props);
}

/* The live preview, scaled down to the panel's width when it's wider. A
   block (or an example) is drawn at a set width and scaled to fit its box
   both ways, so all of it shows. */
function Preview(p) {
  var box = useRef(null), stage = useRef(null);
  var fixed = p.wide ? 1280 : p.width || 0;
  var fitState = useState({ s: 1, w: 0, h: 0 }), fit = fitState[0], setFit = fitState[1];
  useEffect(function () {
    var measure = function () {
      if (!box.current || !stage.current) return;
      var cs = getComputedStyle(box.current);
      var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var W = box.current.clientWidth - padX, H = (parseFloat(cs.maxHeight) || Infinity) - padY;
      var w = fixed || stage.current.scrollWidth, h = stage.current.offsetHeight;
      var s = w > 0 && W > 0 ? Math.min(1, W / w) : 1;
      if (fixed && h > 0 && isFinite(H) && h * s > H) s = H / h;
      setFit(function (f) { return f.s === s && f.w === w && f.h === h ? f : { s: s, w: w, h: h }; });
    };
    measure();
    var ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (ro) { ro.observe(box.current); ro.observe(stage.current); }
    return function () { if (ro) ro.disconnect(); };
  }, [fixed]);
  var s = fit.s;
  var node = { type: p.type, props: p.props, children: p.kids || [] };
  var drawn = e("div", { className: "bd-cd-stage", ref: stage, inert: "", "aria-hidden": "true",
    style: fixed ? { width: fixed, transform: "scale(" + s + ")", transformOrigin: "0 0" } : { transform: s < 1 ? "scale(" + s + ")" : undefined } },
    ds()[p.type] ? e(ThumbGuard, { key: JSON.stringify(p.props) + (p.kids ? p.kids.length : 0) }, drawNode(node, "root")) : null);
  return e("div", { className: cx("bd-cd-preview", p.className), ref: box, title: p.title == null ? "Drag onto a frame to place it as set" : p.title || undefined,
    onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.onDrag(ev, box.current); } },
    fixed ? e("div", { className: "bd-cd-fit", style: { width: Math.ceil(fixed * s), height: Math.ceil(fit.h * s) } }, drawn) : drawn);
}

/* What's built from it: each example live and small. Pressing one starts
   from it; dragging one places it. */
function Examples(p) {
  var list = p.list;
  if (!list.length) return null;
  return e("section", { className: "bd-cd-examples", "aria-label": "Examples" },
    e("h3", { className: "bd-cd-sub" }, "Examples"),
    e("ul", { className: cx("bd-cd-ex-list", p.wide && "is-wide"), role: "list" }, list.map(function (ex, i) {
      var on = p.picked === i;
      return e("li", { key: i },
        e("button", { type: "button", className: cx("bd-cd-ex", on && "is-on"), "aria-pressed": on, "data-example": ex.label,
          title: ex.label + ": press to start from it, or drag onto a frame",
          onPointerDown: function (ev) { if (ev.pointerType !== "touch") p.onDrag(ev, i, ev.currentTarget.firstChild); },
          onClick: function () { if (!p.justDragged.current) p.pick(on ? null : i); } },
          e(Preview, { type: p.type, props: Object.assign({}, p.base, ex.props), kids: ex.kids, wide: p.wide, width: 320, className: "is-example", title: "", onDrag: function () {} }),
          e("span", { className: "bd-cd-ex-name" }, ex.label)));
    })));
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

/* { type, frameName, justDragged, back(), insert(type, props, extra), startDrag(ev, payload) } */
function ComponentDetail(p) {
  var meta = META[p.type] || { props: [] };
  var base = useMemo(function () { return baseProps(p.type); }, [p.type]);
  var chosenState = useState({}), chosen = chosenState[0], setChosen = chosenState[1];
  var examples = useMemo(function () { return galleryOf(p.type); }, [p.type]);
  var pickedState = useState(null), picked = pickedState[0], setPicked = pickedState[1];
  var example = picked == null ? null : examples[picked];
  var pick = function (i) { setPicked(i); setChosen(i == null ? {} : Object.assign({}, examples[i].props)); };
  var set = function (k) { return function (v) { setChosen(function (c) { var n = Object.assign({}, c); if (v === undefined) delete n[k]; else n[k] = v; return n; }); }; };
  var live = Object.assign({}, base, chosen);
  var hasText = typeof base.children === "string";
  /* What can be set here: choices, switches, numbers, an icon, and words
     (a node prop only when it holds words). Pictures, lists, links and
     slots are set from the inspector once it's placed. */
  var specs = meta.props.filter(function (sp) { return sp.kind !== "media" && sp.kind !== "list" && sp.kind !== "url" && !(sp.kind === "node" && typeof live[sp.name] !== "string"); });
  var rows = (hasText ? [control({ name: "children", kind: "text" }, live.children, set("children"))] : [])
    .concat(specs.map(function (sp) { return control(sp, live[sp.name], set(sp.name)); })).filter(Boolean);
  /* What's placed: the props as set, and the chosen example's parts, made
     new each time. */
  var payload = function (thumb, ex, props) {
    var kids = exampleKids(ex);
    return { kind: "new", type: p.type, label: ex ? ex.label + " " + p.type : p.type, props: Object.assign({}, props), thumb: thumb, extra: kids ? { kids: kids } : undefined };
  };
  var wide = meta.group === "blocks";
  var changed = Object.keys(chosen).length || picked != null;
  return e("div", { className: "bd-cd" },
    e("div", { className: "bd-panel-head bd-gallery-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to the components", title: "Back", onClick: p.back }, e(Icon, { name: "left" })),
      e("h2", { className: "bd-panel-title" }, p.type),
      meta.href ? e("a", { className: "bd-act bd-act-ghost", href: meta.href, target: "_blank", rel: "noopener", "aria-label": p.type + " docs", title: "Open the docs" }, e(Icon, { name: "book" })) : null),
    meta.blurb ? e("p", { className: "bd-cd-blurb" }, meta.blurb + ".") : null,
    e(Preview, { type: p.type, props: live, kids: example && example.kids, wide: wide, onDrag: function (ev, el) { p.startDrag(ev, payload(el, example, chosen)); } }),
    e("div", { className: "bd-cd-props" },
      e(Examples, { type: p.type, list: examples, base: base, wide: wide, picked: picked, pick: pick, justDragged: p.justDragged,
        onDrag: function (ev, i, el) { p.startDrag(ev, payload(el, examples[i], examples[i].props)); } }),
      examples.length ? e("h3", { className: "bd-cd-sub" }, "Properties") : null,
      rows.length ? rows : e("p", { className: "bd-empty-note" }, "Nothing to set before it's placed. Change it from the inspector once it's on a frame.")),
    e("div", { className: "bd-cd-foot" },
      changed ? e("button", { type: "button", className: "bd-btn", onClick: function () { pick(null); } }, "Reset") : null,
      e("button", { type: "button", className: "bd-btn bd-btn-primary bd-cd-insert", title: "Add it to " + p.frameName + " as set", onClick: function () { if (!p.justDragged.current) { var pl = payload(null, example, chosen); p.insert(p.type, pl.props, pl.extra); } } },
        e(Icon, { name: "plus" }), "Insert")));
}

export { ComponentDetail, baseProps };
