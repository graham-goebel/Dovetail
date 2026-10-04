/* Small controls the panels are built from: dropdowns, switches, fields, thumbnails. */

import { FRAME_GAP, MAX_ZOOM, MEDIA_URL, MIN_SIDE, MIN_ZOOM, cx, e, useEffect, useMemo, useRef, useState, words } from "../config.js";
import { SAFE_HREF } from "../model/tree.js";
import { Icon } from "./icons.js";

/* --------------------------------------------------------- small parts */

/* A custom colour: a colour picker that shows the colour once there is one. */
function ColorPick(props) {
  return e("label", { className: cx("bd-canvas-custom", props.on && "is-on"), title: props.label },
    props.value ? e("span", { className: "bd-canvas-chip", style: { background: props.value }, "aria-hidden": true }) : e(Icon, { name: "pipette", className: "bd-canvas-ic" }),
    e("span", { className: "visually-hidden" }, props.label),
    e("input", { type: "color", className: "bd-canvas-input", value: props.value || props.fallback || "#ffffff",
      onChange: function (ev) { var v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) props.onChange(v.toLowerCase()); } }));
}

/* A list prop, item by item: each folds open onto its fields, and moves,
   copies or goes. A new item starts as a copy of the last. */
var LONG_FIELD = /^(content|answer|description|quote|body|note|detail|caption|hint)$/;
var ID_FIELD = /^(id|key)$/;
var NAME_FIELD = /^(title|label|question|name|heading|quote|text)$/;
function ListEditor(props) {
  var spec = props.spec, items = props.value || [];
  var openState = useState(items.length ? 0 : -1);
  var open = openState[0], setOpen = openState[1];
  var text = spec.of === "text";
  var put = function (next) { props.onChange(next); };
  var setAt = function (i, v) { var n = items.slice(); n[i] = v; put(n); };
  var move = function (i, by) { var j = i + by; if (j < 0 || j >= items.length) return; var n = items.slice(); var t = n[i]; n[i] = n[j]; n[j] = t; put(n); setOpen(j); };
  /* What names an item: its title or question before any text, and never
     the id that only ties it to state. */
  /* value is an id when every item's reads like one ("tab-2"), and the
     figure on show when it doesn't ("4,000"). */
  var isId = function (f) {
    return ID_FIELD.test(f.name) || (f.name === "value" && items.length > 0 && items.every(function (x) { return /^[a-z][\w-]*$/.test(String(x[f.name])); }));
  };
  var fields = text ? [] : spec.fields.filter(function (f) { return !isId(f); }).concat(spec.fields.filter(isId));
  var summary = function (it, i) {
    if (text) return String(it || "") || "Empty";
    var named = fields.filter(function (x) { return x.kind === "text" && it[x.name] && !isId(x); });
    var f = named.filter(function (x) { return NAME_FIELD.test(x.name); })[0] || named[0];
    return f ? String(it[f.name]) : "Item " + (i + 1);
  };
  /* A copy keeps its look, but an id another item has would tie the two
     together, so it gets the next free one. */
  var unique = function (o) {
    fields.forEach(function (f) {
      if (!isId(f) || o[f.name] == null) return;
      if (f.kind === "number") { o[f.name] = Math.max.apply(null, items.map(function (x) { return Number(x[f.name]) || 0; })) + 1; return; }
      var taken = items.map(function (x) { return String(x[f.name]); });
      var base = String(o[f.name]).replace(/-\d+$/, ""), n = 2;
      while (taken.indexOf(base + "-" + n) >= 0) n++;
      o[f.name] = base + "-" + n;
    });
    return o;
  };
  var blank = function () {
    if (text) return items.length ? String(items[items.length - 1]) : "";
    if (items.length) return unique(JSON.parse(JSON.stringify(items[items.length - 1])));
    var o = {};
    fields.forEach(function (f) { if (!f.optional) o[f.name] = f.kind === "number" ? 0 : f.kind === "boolean" ? false : f.kind === "enum" ? f.options[0] : isId(f) ? "item-1" : ""; });
    return o;
  };
  var field = function (it, i, f) {
    var id = props.id + "-" + i + "-" + f.name;
    var val = it[f.name];
    var set = function (v) { var o = Object.assign({}, it); if (v === undefined || v === "") delete o[f.name]; else o[f.name] = v; setAt(i, o); };
    var control;
    if (f.kind === "boolean") return e("div", { key: f.name, className: "bd-list-field is-inline" }, e("span", { className: "bd-field-label", id: id }, words(f.name)), e(Switch, { labelledBy: id, value: !!val, onChange: set }));
    if (f.kind === "enum") control = e(Dropdown, { labelledBy: id, value: val, placeholder: f.optional ? "None" : "Choose", onChange: function (v) { set(v || undefined); }, options: (f.optional ? [{ value: "", label: "None" }] : []).concat(f.options.map(function (o) { return { value: o, label: String(o) }; })) });
    else if (f.kind === "number") control = e("input", { className: "bd-input", type: "number", "aria-labelledby": id, value: val == null ? "" : String(val), onChange: function (ev) { set(ev.target.value === "" ? undefined : Number(ev.target.value)); } });
    else if (LONG_FIELD.test(f.name)) control = e("textarea", { className: "bd-input bd-list-text", rows: 3, "aria-labelledby": id, value: val == null ? "" : String(val), onChange: function (ev) { set(ev.target.value); } });
    else if (f.kind === "url" || f.kind === "media") control = e(UrlInput, { labelledBy: id, value: val, placeholder: f.kind === "media" ? "https://" : f.optional ? "Optional" : "", ok: f.kind === "media" ? MEDIA_URL : SAFE_HREF, onChange: set });
    else control = e("input", { className: "bd-input", type: "text", "aria-labelledby": id, value: val == null ? "" : String(val), placeholder: f.optional ? "Optional" : "", onChange: function (ev) { set(ev.target.value); } });
    return e("div", { key: f.name, className: "bd-list-field" }, e("span", { className: "bd-field-label", id: id }, words(f.name)), control);
  };
  return e("div", { className: "bd-list", role: "group", "aria-labelledby": props.id },
    items.map(function (it, i) {
      var isOpen = open === i;
      return e("div", { key: i, className: cx("bd-list-item", isOpen && "is-open") },
        e("div", { className: "bd-list-head" },
          e("button", { type: "button", className: "bd-list-sum", "aria-expanded": String(isOpen), onClick: function () { setOpen(isOpen ? -1 : i); } },
            e(Icon, { name: "right", className: "bd-list-chev" }), e("span", { className: "bd-list-label" }, summary(it, i))),
          e("button", { type: "button", className: "bd-act bd-act-sm bd-act-ghost", "aria-label": "Move up", title: "Move up", disabled: i === 0, onClick: function () { move(i, -1); } }, e(Icon, { name: "up" })),
          e("button", { type: "button", className: "bd-act bd-act-sm bd-act-ghost", "aria-label": "Move down", title: "Move down", disabled: i === items.length - 1, onClick: function () { move(i, 1); } }, e(Icon, { name: "down" })),
          e("button", { type: "button", className: "bd-act bd-act-sm bd-act-ghost", "aria-label": "Remove " + summary(it, i), title: "Remove", onClick: function () { put(items.filter(function (x, k) { return k !== i; })); setOpen(-1); } }, e(Icon, { name: "close" }))),
        isOpen ? e("div", { className: "bd-list-body" },
          text ? e("input", { className: "bd-input", type: "text", "aria-label": props.label + " " + (i + 1), value: String(it == null ? "" : it), onChange: function (ev) { setAt(i, ev.target.value); } })
            : fields.map(function (f) { return field(it, i, f); })) : null);
    }),
    e("button", { type: "button", className: "bd-btn bd-list-add", disabled: items.length >= 60, onClick: function () { put(items.concat([blank()])); setOpen(items.length); } }, e(Icon, { name: "plus" }), "Add " + (text ? "a line" : "an item")));
}

/* A link typed a letter at a time isn't one until it's whole: the field
   keeps what's typed and only hands on a link that's safe. */
function UrlInput(props) {
  var draftState = useState(props.value == null ? "" : String(props.value));
  var draft = draftState[0], setDraft = draftState[1];
  useEffect(function () { setDraft(props.value == null ? "" : String(props.value)); }, [props.value]);
  var bad = !!draft && !props.ok.test(draft.trim());
  return e("input", { className: "bd-input", type: "url", "aria-labelledby": props.labelledBy, "aria-invalid": bad ? "true" : undefined, value: draft, placeholder: props.placeholder,
    onChange: function (ev) { var v = ev.target.value; setDraft(v); v = v.trim(); if (!v) props.onChange(undefined); else if (props.ok.test(v)) props.onChange(v); } });
}

/* One pressed, icons or pictures where they say it. clearable: pressing
   the pressed one again unsets it. */
function Segmented(props) {
  return e("div", { className: cx("bd-seg", props.wide && "bd-seg-wide", props.className), role: "group", "aria-labelledby": props.labelledBy, "aria-label": props.labelledBy ? undefined : props.label },
    props.options.map(function (o) {
      var pressed = props.value === o.value;
      var pictured = o.icon || o.picture;
      return e("button", {
        key: String(o.value), type: "button", className: "bd-seg-btn", "aria-pressed": String(pressed),
        title: o.title || (pictured ? o.label : undefined), "aria-label": pictured ? o.label : undefined,
        onClick: function () { props.onChange(pressed && props.clearable ? undefined : o.value); },
      }, o.picture || (o.icon ? e(Icon, { name: o.icon }) : o.label));
    }));
}

function Switch(props) {
  return e("button", {
    type: "button", role: "switch", className: cx("bd-switch", props.mixed && "is-mixed"), "aria-checked": props.mixed ? "mixed" : String(!!props.value), "aria-labelledby": props.labelledBy,
    onClick: function () { props.onChange(!props.value); },
  }, e("span", { className: "bd-switch-knob", "aria-hidden": true }));
}

/* What a token option looks like, drawn with the token itself. */
function Preview(props) {
  var o = props.option;
  if (!o || !o.tokens || !o.tokens.length) return null;
  var t = o.tokens[0];
  if (props.kind === "color") return e("span", { className: "bd-sw", style: { background: "var(" + t + ")" }, "aria-hidden": true });
  if (props.kind === "radius") return e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + t + ")" }, "aria-hidden": true });
  if (props.kind === "shadow") return e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + t + ")" }, "aria-hidden": true });
  if (props.kind === "space") return e("span", { className: "bd-pv-space", "aria-hidden": true }, e("span", { style: { width: "var(" + t + ")" } }));
  return null;
}

var ddSeq = 0;
/* A listbox of our own: swatches and previews in the options, the same look
   in every browser, and the keyboard of a native select (arrows, Home, End,
   type to jump, Enter, Escape). menu: true makes it a list of actions. */
function Dropdown(props) {
  var openState = useState(false);
  var open = openState[0], setOpen = openState[1];
  var activeState = useState(0);
  var activeI = activeState[0], setActive = activeState[1];
  var posState = useState(null);
  var pos = posState[0], setPos = posState[1];
  var btn = useRef(null);
  var list = useRef(null);
  var ids = useMemo(function () { ddSeq++; return { btn: "bd-dd-b" + ddSeq, list: "bd-dd-l" + ddSeq }; }, []);
  var typed = useRef({ text: "", at: 0 });
  var scrubbed = useRef(false);
  var options = props.options;
  var selected = options.filter(function (o) { return o.value === props.value; })[0];

  /* Scrubbing: press the prefix (W, H) and drag sideways to step through
     the sizes, smallest to largest, from the current one. */
  var scrubDown = function (ev) {
    if (ev.button !== 0) return;
    var steps = options.filter(function (o) { return o.px != null; }).slice().sort(function (a, b) { return a.px - b.px; });
    if (!steps.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    var at = steps.indexOf(selected);
    if (at < 0) {
      var from = props.scrubFrom ? props.scrubFrom() : null;
      at = 0;
      if (from != null) steps.forEach(function (o, i) { if (Math.abs(o.px - from) < Math.abs(steps[at].px - from)) at = i; });
    }
    var x0 = ev.clientX, last = steps.indexOf(selected), first = true;
    var el = ev.currentTarget;
    try { el.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    document.documentElement.classList.add("bd-scrubbing");
    var move = function (mv) {
      var moved = Math.round((mv.clientX - x0) / 12);
      if (!moved && last < 0) return;
      var i = Math.max(0, Math.min(steps.length - 1, at + moved));
      if (i === last) return;
      last = i;
      scrubbed.current = true;
      props.onScrub(steps[i].value, first);
      first = false;
    };
    var up = function () {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.classList.remove("bd-scrubbing");
      setTimeout(function () { scrubbed.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  var place = function () {
    var r = btn.current.getBoundingClientRect();
    var width = Math.max(r.width, props.narrow ? 188 : 248);
    var below = window.innerHeight - r.bottom - 12;
    var above = r.top - 12;
    var want = Math.min(480, options.length * 48 + 16);
    var up = below < want && above > below;
    var left = props.alignEnd ? r.right - width : r.left;
    setPos({
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), width: width,
      top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined,
      maxHeight: Math.max(160, Math.min(want, up ? above : below)),
    });
    return r;
  };
  var show = function () {
    place();
    var i = options.indexOf(selected);
    setActive(i < 0 ? 0 : i);
    setOpen(true);
  };
  var close = function (refocus) {
    setOpen(false);
    if (refocus && btn.current) btn.current.focus();
  };
  var choose = function (o) {
    close(true);
    if (o && !o.disabled) props.onChange(o.value);
  };

  useEffect(function () {
    if (!open) return;
    if (list.current) list.current.focus({ preventScroll: true });
    var away = function (ev) {
      if (list.current && list.current.contains(ev.target)) return;
      if (btn.current && btn.current.contains(ev.target)) return;
      close(false);
    };
    var reflow = function (ev) {
      if (ev && list.current && list.current.contains(ev.target)) return;
      if (!btn.current) return close(false);
      var r = place();
      if (r.bottom < 0 || r.top > window.innerHeight) close(false);
    };
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return function () {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open]);

  useEffect(function () {
    if (!open || !list.current) return;
    var l = list.current;
    var el = l.querySelector('[data-i="' + activeI + '"]');
    if (!el) return;
    if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight;
  }, [open, activeI]);

  var onListKey = function (ev) {
    var k = ev.key;
    if (k === "ArrowDown") { ev.preventDefault(); setActive(Math.min(options.length - 1, activeI + 1)); }
    else if (k === "ArrowUp") { ev.preventDefault(); setActive(Math.max(0, activeI - 1)); }
    else if (k === "Home") { ev.preventDefault(); setActive(0); }
    else if (k === "End") { ev.preventDefault(); setActive(options.length - 1); }
    else if (k === "Enter" || k === " ") { ev.preventDefault(); choose(options[activeI]); }
    else if (k === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(true); }
    else if (k === "Tab") close(false);
    else if (k.length === 1 && /\S/.test(k)) {
      var now = Date.now();
      typed.current.text = (now - typed.current.at > 600 ? "" : typed.current.text) + k.toLowerCase();
      typed.current.at = now;
      var hit = options.findIndex(function (o) { return String(o.label || o.value).toLowerCase().indexOf(typed.current.text) === 0; });
      if (hit >= 0) setActive(hit);
    }
  };

  var label = props.menu ? props.placeholder : props.mixed ? props.mixedLabel || "Mixed" : selected ? (selected.short != null ? selected.short : selected.label || String(selected.value)) : props.placeholder || "None";
  return e(React.Fragment, null,
    e("button", {
      ref: btn, id: ids.btn, type: "button", className: cx("bd-dd", props.compact && "bd-dd-compact", props.mixed && "is-mixed", props.className),
      "aria-haspopup": props.menu ? "menu" : "listbox", "aria-expanded": String(open), "aria-controls": open ? ids.list : undefined,
      "aria-labelledby": props.labelledBy ? props.labelledBy + " " + ids.btn : undefined, "aria-label": props.labelledBy ? undefined : props.label,
      title: props.title, disabled: props.disabled,
      onClick: function () { if (scrubbed.current) { scrubbed.current = false; return; } if (open) close(false); else show(); },
      onKeyDown: function (ev) { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); show(); } },
    },
      props.prefix ? e("span", { className: cx("bd-dd-prefix", props.onScrub && "is-scrub"), "aria-hidden": true, onPointerDown: props.onScrub ? scrubDown : undefined,
        title: props.onScrub ? "Drag sideways to step through the sizes" : undefined }, props.prefix) : null,
      props.icon ? e(Icon, { name: props.icon }) : selected && selected.icon && props.iconValue ? e(Icon, { name: selected.icon }) : null,
      !props.menu && selected && !props.mixed ? e(Preview, { option: selected, kind: props.preview }) : null,
      props.iconOnly ? e("span", { className: "visually-hidden" }, label) : e("span", { className: "bd-dd-label" }, label),
      e(Icon, { name: "down", className: "bd-dd-chev" })),
    open && pos ? ReactDOM.createPortal(e("ul", {
      ref: list, id: ids.list, role: props.menu ? "menu" : "listbox", tabIndex: -1, className: "bd-dd-list",
      "aria-labelledby": props.labelledBy || ids.btn, "aria-activedescendant": ids.list + "-" + activeI,
      style: { left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.maxHeight },
      onKeyDown: onListKey,
    }, options.map(function (o, i) {
      var isSel = !props.menu && !props.mixed && o.value === props.value;
      /* A heading where a group of options starts: not an option itself. */
      var head = o.group && (i === 0 || options[i - 1].group !== o.group)
        ? e("li", { key: "g-" + o.group, role: "presentation", className: "bd-dd-group" }, o.group) : null;
      return [head, e("li", {
        key: String(o.value), id: ids.list + "-" + i, "data-i": i, role: props.menu ? "menuitem" : "option",
        "aria-selected": props.menu ? undefined : String(isSel), "aria-disabled": o.disabled ? "true" : undefined,
        className: cx("bd-dd-opt", i === activeI && "is-active", isSel && "is-selected", o.disabled && "is-disabled", o.danger && "is-danger"),
        onPointerMove: function () { if (activeI !== i) setActive(i); },
        onClick: function () { choose(o); },
      },
        o.icon ? e(Icon, { name: o.icon }) : e(Preview, { option: o, kind: props.preview }),
        o.px != null ? e("span", { className: "bd-dd-px" }, o.px) : null,
        e("span", { className: "bd-dd-opt-text" },
          e("span", { className: "bd-dd-opt-label" }, o.label || String(o.value)),
          o.hint ? e("span", { className: "bd-dd-opt-hint" }, o.hint) : null),
        isSel ? e(Icon, { name: "check", className: "bd-dd-tick" }) : null)];
    })), document.body) : null);
}

function Field(props) {
  return e("div", { className: cx("bd-field", props.inline && "bd-field-inline") },
    e("span", { className: "bd-field-label", id: props.id, title: props.note || undefined }, props.label),
    props.children,
    props.hint ? e("span", { className: "bd-field-hint" }, props.hint) : null);
}

/* A titled group of controls that folds away. Its title row can carry an
   action on the right, like adding a border. */
function Section(props) {
  var bodyId = "bd-sec-" + String(props.id || props.title).replace(/\W+/g, "-");
  var open = !props.closed;
  /* A dot: something here is set on this item, not left to the default. */
  var dot = props.changed ? e("span", { className: "bd-sec-dot", title: "Changed from the default" }, e("span", { className: "visually-hidden" }, ", changed from the default")) : null;
  return e("section", { className: cx("bd-sec", !open && "is-closed"), "data-sec": props.id },
    e("div", { className: "bd-sec-head" },
      props.onToggle ? e("button", { type: "button", className: "bd-sec-h", "aria-expanded": String(open), "aria-controls": bodyId, onClick: props.onToggle },
        props.title, dot, e(Icon, { name: "down", className: "bd-sec-chev" }))
        : e("h3", { className: "bd-sec-h" }, props.title, dot),
      props.action || null),
    open ? e("div", { className: "bd-sec-body", id: bodyId }, props.children) : null);
}

/* A name that turns into a text field on double-click, Enter or F2. */
function Renamable(props) {
  var editState = useState(!!props.startEditing);
  var editing = editState[0], setEditing = editState[1];
  var input = useRef(null);
  useEffect(function () { if (editing && input.current) { input.current.focus(); input.current.select(); } }, [editing]);
  useEffect(function () { if (props.startEditing) setEditing(true); }, [props.startEditing]);
  if (editing) {
    return e("input", {
      ref: input, className: cx("bd-rename", props.className), type: "text", defaultValue: props.value, "aria-label": props.label, maxLength: 60,
      onBlur: function (ev) { setEditing(false); props.onChange(ev.target.value.trim()); },
      onKeyDown: function (ev) {
        ev.stopPropagation();
        if (ev.key === "Enter") { ev.preventDefault(); ev.target.blur(); }
        if (ev.key === "Escape") { ev.preventDefault(); ev.target.value = props.value; ev.target.blur(); }
      },
      onPointerDown: function (ev) { ev.stopPropagation(); },
    });
  }
  return e("span", {
    className: props.className, title: props.hint || "Double-click to rename", tabIndex: props.focusable ? 0 : undefined,
    onDoubleClick: function (ev) { ev.stopPropagation(); setEditing(true); },
    onKeyDown: props.focusable ? function (ev) { if (ev.key === "F2" || ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); setEditing(true); } } : undefined,
  }, props.value);
}

/* A live, scaled-down render of a component's specimen, made only once
   its tile scrolls into view. It is a picture: inert and hidden from
   assistive tech, since the tile's own name says what it is. */
class ThumbGuard extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
/* The builder's own primitives have no specimen; their tile shows an icon. */
var BUILDER_ICON = { Group: "group", Shape: "square" };
function Thumb(props) {
  var holder = useRef(null);
  useEffect(function () {
    var el = holder.current;
    var NS = window.BeamMobileDesignSystem_e33121;
    var specs = window.DovetailSpecimens;
    if (!el) return;
    el.setAttribute("inert", "");
    var build = specs && NS && !BUILDER_ICON[props.type] ? (specs.samples && specs.samples[props.type]) || specs.build[props.type] : null;
    if (!build) return;
    var root = null, stage = null, io = null, done = false;
    var fit = function () {
      if (!stage) return;
      var w = stage.scrollWidth || 1, h = stage.scrollHeight || 1;
      var W = el.clientWidth, H = el.clientHeight;
      var s = Math.min(props.wide ? 1 : 1.6, (W - 12) / w, (H - 12) / h);
      stage.style.transform = "translate(" + Math.max(0, (W - w * s) / 2) + "px, " + Math.max(0, (H - h * s) / 2) + "px) scale(" + s + ")";
      stage.style.opacity = "1";
    };
    var draw = function () {
      if (done) return;
      done = true;
      stage = document.createElement("div");
      stage.className = "bd-thumb-stage";
      if (props.wide) stage.style.width = "1280px";
      else { stage.style.width = "fit-content"; stage.style.maxWidth = "360px"; stage.style.minWidth = "120px"; }
      el.appendChild(stage);
      root = ReactDOM.createRoot(stage);
      try { root.render(e(ThumbGuard, null, build())); } catch (err) { return; }
      requestAnimationFrame(function () { requestAnimationFrame(fit); });
      setTimeout(fit, 400);
    };
    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) { if (entries.some(function (x) { return x.isIntersecting; })) { draw(); io.disconnect(); } }, { rootMargin: "120px" });
      io.observe(el);
    } else draw();
    return function () {
      if (io) io.disconnect();
      if (root) { var r = root; setTimeout(function () { r.unmount(); }, 0); }
      if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
    };
  }, [props.type]);
  return e("span", { className: "bd-thumb", ref: holder, "aria-hidden": true },
    BUILDER_ICON[props.type] ? e(Icon, { name: BUILDER_ICON[props.type], className: "bd-thumb-ic" }) : null);
}

/* A text field laid over the node whose text it edits, in the same type. */
function InlineEditor(props) {
  var ref = useRef(null);
  useEffect(function () {
    var el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);
  var box = props.box, font = props.font || {}, s = props.scale;
  var px = function (v) { var n = parseFloat(v); return isNaN(n) ? undefined : n * s + "px"; };
  return e("textarea", {
    ref: ref, className: "bd-inline", value: props.value, "aria-label": "Edit text", rows: 1, spellCheck: false,
    style: {
      left: box.left, top: box.top, width: Math.max(box.width, 80 * s), minHeight: box.height,
      fontFamily: font.fontFamily, fontSize: px(font.fontSize), fontWeight: font.fontWeight, lineHeight: px(font.lineHeight) || "normal",
      letterSpacing: px(font.letterSpacing), textAlign: font.textAlign, color: font.color, textTransform: font.textTransform,
    },
    onChange: function (ev) { props.onChange(ev.target.value); },
    onKeyDown: function (ev) {
      ev.stopPropagation();
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); props.onDone(true); }
      if (ev.key === "Escape") { ev.preventDefault(); props.onDone(false); }
    },
    onBlur: function () { props.onDone(true); },
    onPointerDown: function (ev) { ev.stopPropagation(); },
  });
}

/* A 3 × 3 pad for a flex container's alignment: across is the main axis in
   a row and the cross axis in a column. A pressed cell shows where the
   children sit; stretch or space between lights a whole line. */
var ALIGN_POS = ["flex-start", "center", "flex-end"];
var ALIGN_WORD = { "flex-start": "start", center: "center", "flex-end": "end" };
function AlignMatrix(props) {
  var cells = [];
  for (var r = 0; r < 3; r++) {
    for (var c = 0; c < 3; c++) {
      (function (r, c) {
        var j = ALIGN_POS[props.dir === "row" ? c : r], a = ALIGN_POS[props.dir === "row" ? r : c];
        var on = props.align !== undefined && props.justify !== undefined &&
          (props.justify === "space-between" || props.justify === j) && (props.align === "stretch" || props.align === a);
        cells.push(e("button", {
          key: r + "-" + c, type: "button", className: "bd-mx-cell", "aria-pressed": String(on),
          "aria-label": "Children at " + ALIGN_WORD[j] + " on the main axis, " + ALIGN_WORD[a] + " across",
          onClick: function () { props.onChange(a, j); },
        }, e("span", { className: "bd-mx-dot" })));
      })(r, c);
    }
  }
  return e("div", { className: cx("bd-mx", "is-" + props.dir), role: "group", "aria-label": "Alignment" }, cells);
}

/* Where a pinned or floating item sits: nine spots, and two that run the
   width of the top or bottom edge. */
var PIN_GRID = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
var PIN_WORD = { "top-left": "Top left", top: "Top", "top-right": "Top right", left: "Left", center: "Centre", right: "Right", "bottom-left": "Bottom left", bottom: "Bottom", "bottom-right": "Bottom right" };
function PinPad(props) {
  return e("div", { className: "bd-pin", role: "group", "aria-label": "Pin to" },
    e("div", { className: "bd-mx bd-pin-grid" }, PIN_GRID.map(function (v) {
      var on = props.value === v || (props.value === "top-stretch" && /^top/.test(v)) || (props.value === "bottom-stretch" && /^bottom/.test(v));
      return e("button", { key: v, type: "button", className: "bd-mx-cell", "aria-pressed": String(on), "aria-label": PIN_WORD[v], title: PIN_WORD[v], onClick: function () { props.onChange(v); } },
        e("span", { className: "bd-mx-dot" }));
    })),
    e("div", { className: "bd-flex-side" },
      e("button", { type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(props.value === "top-stretch"), onClick: function () { props.onChange("top-stretch"); }, title: "Pinned across the top edge, like a header" }, "Across the top"),
      e("button", { type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(props.value === "bottom-stretch"), onClick: function () { props.onChange("bottom-stretch"); }, title: "Pinned across the bottom edge, like a tab bar" }, "Across the bottom"),
      props.children));
}

/* A search box with a clear button. Escape clears it too. */
function SearchField(props) {
  var input = useRef(null);
  return e("div", { className: cx("bd-search", props.className) },
    e(Icon, { name: "search" }),
    e("input", {
      ref: input, type: "search", "aria-label": props.label, placeholder: props.placeholder, value: props.value,
      onChange: function (ev) { props.onChange(ev.target.value); },
      onKeyDown: function (ev) { if (ev.key === "Escape" && props.value) { ev.preventDefault(); ev.stopPropagation(); props.onChange(""); } },
    }),
    props.value ? e("button", {
      type: "button", className: "bd-search-clear", "aria-label": "Clear " + props.label.toLowerCase(), title: "Clear",
      onClick: function () { props.onChange(""); if (input.current) input.current.focus(); },
    }, e(Icon, { name: "close" })) : null);
}

/* A size typed in full before it applies: Enter or leaving the field
   commits it, Escape puts it back, the arrows step it (Shift by ten). */
function NumberField(props) {
  var textState = useState(String(props.value));
  var text = textState[0], setText = textState[1];
  useEffect(function () { setText(String(props.value)); }, [props.value]);
  var commit = function () {
    var n = Math.round(Number(text));
    if (!text.trim() || !isFinite(n) || n === props.value) { setText(String(props.value)); return; }
    props.onChange(n);
  };
  /* Press the letter and drag sideways: a pixel a step, ten with Shift. */
  var scrub = function (ev) {
    if (ev.button !== 0 || !props.onScrub) return;
    ev.preventDefault();
    var x0 = ev.clientX, v0 = Number(props.value) || 0, last = v0, first = true;
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    document.documentElement.classList.add("bd-scrubbing");
    var move = function (mv) {
      var v = Math.max(0, Math.round(v0 + (mv.clientX - x0) * (mv.shiftKey ? 10 : 1)));
      if (v === last) return;
      last = v;
      setText(String(v));
      props.onScrub(v, first);
      first = false;
    };
    var up = function () {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.classList.remove("bd-scrubbing");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return e("label", { className: cx("bd-num", props.muted && "is-muted"), title: props.title },
    e("span", { className: cx("bd-num-l", props.onScrub && "is-scrub"), "aria-hidden": true, onPointerDown: props.onScrub ? scrub : undefined }, props.short),
    e("input", {
      type: "text", inputMode: "numeric", "aria-label": props.label, value: text,
      onChange: function (ev) { setText(ev.target.value.replace(/[^\d]/g, "").slice(0, 5)); },
      onBlur: commit,
      onKeyDown: function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); commit(); }
        else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); setText(String(props.value)); }
        else if (ev.key === "ArrowUp" || ev.key === "ArrowDown") {
          ev.preventDefault();
          props.onChange((Number(text) || props.value) + (ev.shiftKey ? 10 : 1) * (ev.key === "ArrowUp" ? 1 : -1));
        }
      },
    }));
}

function clampZoom(z) { return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

/* Where each frame sits on the canvas: side by side, tops aligned. A frame
   that hugs its content is as tall as the content last measured. */
/* A frame with its own x and y sits there; the rest line up from the left.
   A loose object is as wide and tall as what it holds. left and top are
   where the whole layout starts, which a frame moved up or left can push. */
function layoutOf(doc, heights, resizing, widths, moving) {
  var x = 0, out = { boxes: {}, width: 0, height: 0, left: 0, top: 0 };
  var maxX = 0, maxY = 0, minX = 0, minY = 0;
  doc.frames.forEach(function (f) {
    var r = resizing && resizing.fid === f.id ? resizing : null;
    var w = r ? r.w : f.bare ? (f.sized ? f.width : Math.max(24, (widths && widths[f.id]) || 120)) : f.width;
    var h = r && r.h != null ? r.h : f.bare ? Math.max(16, heights[f.id] || 40) : f.hug ? Math.max(MIN_SIDE, heights[f.id] || f.height) : f.height;
    var m = moving && moving.fid === f.id ? moving : null;
    var b;
    if (m) b = { x: m.x, y: m.y, w: w, h: h };
    else if (typeof f.x === "number") b = { x: f.x, y: f.y, w: w, h: h };
    else { b = { x: x, y: 0, w: w, h: h }; x += w + FRAME_GAP; }
    out.boxes[f.id] = b;
    minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + w); maxY = Math.max(maxY, b.y + h);
  });
  out.left = minX; out.top = minY;
  out.width = Math.max(0, maxX - minX);
  out.height = Math.max(0, maxY - minY);
  return out;
}

/* Standard viewport sizes an edge snaps to: a page always lands on one, a
   frame when it comes close. */
var VIEW_W = [320, 360, 375, 390, 393, 414, 430, 768, 820, 834, 1024, 1280, 1366, 1440, 1536, 1920];
var VIEW_H = [568, 667, 740, 768, 800, 812, 844, 852, 896, 900, 932, 1024, 1080, 1112, 1180, 1366];
function snapSide(v, list, always, reach) {
  var best = list.reduce(function (b, x) { return Math.abs(x - v) < Math.abs(b - v) ? x : b; }, list[0]);
  if (always || Math.abs(best - v) <= reach) return best;
  return Math.round(v / 10) * 10;
}

/* Play: the screen heights a frame of each width is seen through. */
function playHeights(w) {
  if (w <= 500) return [[667, "Small phone"], [740, "Android"], [812, "Phone"], [844, "Phone"], [932, "Large phone"]];
  if (w <= 1100) return [[1024, "Tablet, landscape"], [1180, "Tablet"], [1366, "Large tablet"]];
  return [[768, "Small laptop"], [800, "Laptop"], [900, "Desktop"], [1080, "Full HD"]];
}
function playDefault(w) { return w <= 500 ? 812 : w <= 1100 ? 1180 : 900; }

export { ALIGN_POS, ALIGN_WORD, AlignMatrix, BUILDER_ICON, ColorPick, Dropdown, Field, ID_FIELD, InlineEditor, LONG_FIELD, ListEditor, NAME_FIELD, NumberField, PIN_GRID, PIN_WORD, PinPad, Preview, Renamable, SearchField, Section, Segmented, Switch, Thumb, ThumbGuard, UrlInput, VIEW_H, VIEW_W, clampZoom, ddSeq, distance, layoutOf, midpoint, playDefault, playHeights, snapSide };
