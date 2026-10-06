/* The builder's canvas. Runs inside assets/builder-frame.html and exposes
   window.BuilderFrame to the builder page (assets/builder.js), which owns the
   document tree, the selection and every control. This side only does what
   needs the canvas's own React and the real component elements:

   - render(tree, options): draws the tree with the bundle's components;
   - rect(id) and drop(x, y, dragId): geometry, in this frame's coordinates;
   - jsx(tree, name): the code for the tree, with each component's full props;
   - detach(node): the same thing built from primitives, where a recipe exists;
   - textRect(id, text): where a node's text sits, for editing it in place;
   - height() and scrollBy(dx, dy): how tall the content is, and scrolling
     that hands back what it couldn't use, so the builder pans the rest.

   The builder shows several frames side by side, each its own copy of this
   page. Every call back to it goes through host(), which the builder binds to
   this frame.

   A node is { id, type, props, style, children }. `props` holds only what the
   reader changed; everything else comes from the component's specimen
   (assets/specimens.js), the same starting point the component pages use, so
   a dropped component looks like a real use of it rather than an empty shell.
   `style` holds token names, never values. Each name is looked up in the
   builder data (assets/builder-data.js, generated and checked by the site
   build), whose declarations are the only way a value reaches the canvas.
   Group is the builder's own flex container: a div whose gap is a token, on
   one line unless it's told to wrap. Shape is the builder's own rectangle or
   ellipse: a div painted and sized only by tokens. */

(function () {
  "use strict";

  var NS = window.BeamMobileDesignSystem_e33121;
  var specs = window.DovetailSpecimens || { build: {}, notes: {}, samples: {} };
  var mount = document.getElementById("bf-mount");
  if (!NS || !window.React || !window.ReactDOM || !mount) return;

  var e = React.createElement;
  var root = ReactDOM.createRoot(mount);
  var html = document.documentElement;

  /* Components whose children the reader arranges. Their specimen's own
     children are dropped; the tree supplies new ones. */
  var CONTAINERS = { Root: true, Group: true, Section: true, Stack: true, Inline: true, Grid: true, Card: true, Slot: true, Carousel: true };

  var DATA = window.DovetailBuilderData || { tokens: {} };
  var STYLE_KEYS = Object.keys(DATA.tokens);

  /* Group's gap: the inline scale in a row, the stack scale in a column. */
  var GROUP_GAP = { row: "--dt-space-inline-", column: "--dt-space-stack-" };
  var GROUP_LAYERS = { related: 1, group: 1, block: 1, section: 1 };
  function groupStyle(p) {
    var dir = p.direction === "column" ? "column" : "row";
    /* Relative, so anything floating inside it floats over the group. */
    var st = { position: "relative", display: "flex", flexDirection: dir, flexWrap: p.wrap === true ? "wrap" : "nowrap", alignItems: p.align || "stretch", justifyContent: p.justify || "flex-start" };
    var gap = p.gap || "sm";
    /* A layout layer moves with the layout's character; a step of the space
       scale stays put. */
    if (GROUP_LAYERS[gap]) st.gap = "var(--dt-layout-" + (dir === "row" ? "inline" : "stack") + "-" + gap + ")";
    else if (gap !== "none") st.gap = "var(" + GROUP_GAP[dir] + gap + ")";
    return st;
  }

  /* A shape with no size of its own is one large control square; an ellipse
     rounds whatever box it has. */
  var SHAPE_SIZE = "var(--dt-size-control-lg)";
  function shapeStyle(node) {
    var st = Object.assign({ boxSizing: "border-box", flex: "none" }, styleFor(node.style) || {});
    if (!st.width) st.width = SHAPE_SIZE;
    if (!st.height) st.height = SHAPE_SIZE;
    if (!st.background) st.background = "var(--dt-surface-sunken)";
    if ((node.props || {}).shape === "ellipse") st.borderRadius = "50%";
    return st;
  }

  /* The page root's gap reads a layout layer, so it follows the layout's
     character with everything else. */
  var ROOT_GAP = { related: "--dt-layout-stack-related", group: "--dt-layout-stack-group", block: "--dt-layout-stack-block", section: "--dt-layout-stack-section" };

  /* Something placed freely on a frame sits at x and y steps of the smallest
     inset, over the flow, instead of in it. */
  var FREE_UNIT = "var(--dt-space-inset-2xs)";
  var HEX = /^#[0-9a-f]{6}$/i;
  /* The page's fill: a surface option's own declarations, so a brand fill
     brings the text roles that read on it; or a custom colour. */
  /* A frame's own auto layout, as declarations on its root: a Group's flex,
     and a padding option's own. */
  function flowStyle(fl) {
    if (!fl) return null;
    var gs = groupStyle({ direction: fl.direction || "column", gap: fl.gap || "none", align: fl.align, justify: fl.justify, wrap: fl.wrap });
    var st = { flexDirection: gs.flexDirection, flexWrap: gs.flexWrap, alignItems: gs.alignItems, justifyContent: gs.justifyContent };
    if (gs.gap) st.gap = gs.gap;
    var po = fl.padding && DATA.tokens.padding ? DATA.tokens.padding.options.filter(function (o) { return o.value === fl.padding; })[0] : null;
    if (po) Object.assign(st, po.css);
    return st;
  }
  /* What spills past a fixed frame: clipped, or scrolled one way. */
  function overflowStyle(page) {
    if (!page.clip && !page.scroll) return null;
    return { height: "100vh", minHeight: "0", overflowX: page.scroll === "x" ? "auto" : "hidden", overflowY: page.scroll === "y" ? "auto" : "hidden" };
  }
  var PAGE_WIDTHS = { narrow: "var(--dt-layout-page-width-narrow)", wide: "var(--dt-layout-page-width-wide)" };
  var PAGE_GUTTERS = { wide: "var(--dt-space-gutter-wide)", none: "0" };
  function pageStyle(page) {
    var o = (DATA.tokens.surface ? DATA.tokens.surface.options : []).filter(function (x) { return x.value === (page.surface || "base"); })[0];
    var st = Object.assign({ color: "var(--dt-text-primary)" }, o ? o.css : { background: "var(--dt-surface-base)" });
    if (HEX.test(page.canvas || "")) st.background = page.canvas;
    /* This page's column and gutter, re-pointed for everything inside it:
       Sections, blocks, and Groups set to the page width. */
    if (PAGE_WIDTHS[page.pageWidth]) st["--dt-layout-page-width"] = PAGE_WIDTHS[page.pageWidth];
    if (PAGE_GUTTERS[page.gutter]) st["--dt-layout-page-gutter"] = PAGE_GUTTERS[page.gutter];
    return st;
  }
  function isFree(st) { return !!st && typeof st.x === "number" && typeof st.y === "number"; }
  /* A size relative to the parent, or to the screen. On the canvas a frame
     that hugs its content has no screen height of its own, so vw and vh read
     the frame's size from the root; the export writes them as they are. */
  var REL_SIZE = /^([1-9]\d{0,2})(%|vw|vh)$/;
  var SCREEN_UNIT = /calc\(var\(--bf-v([wh]), 1v[wh]\) \* (\d+)\)/g;
  function relCss(v) {
    var m = typeof v === "string" ? REL_SIZE.exec(v) : null;
    if (!m) return null;
    return m[2] === "%" ? m[1] + "%" : "calc(var(--bf-" + m[2] + ", 1" + m[2] + ") * " + m[1] + ")";
  }
  function styleFor(st) {
    if (!st) return null;
    var out = null;
    STYLE_KEYS.forEach(function (k) {
      if (!st[k]) return;
      var o = DATA.tokens[k].options.filter(function (x) { return x.value === st[k]; })[0];
      if (o) out = Object.assign(out || {}, o.css);
    });
    /* A free frame may give a layer its own colours, as six-digit hex. */
    if (HEX.test(st.fill || "")) out = Object.assign(out || {}, { background: st.fill });
    if (HEX.test(st.color || "")) out = Object.assign(out || {}, { color: st.color, "--dt-text-primary": st.color, "--dt-text-headline": st.color });
    /* And its own opacity, in whole percents. */
    if (typeof st.alpha === "number" && st.alpha >= 0 && st.alpha < 100) out = Object.assign(out || {}, { opacity: st.alpha / 100 });
    if (isFree(st)) {
      out = Object.assign(out || {}, { position: "absolute", left: "calc(" + FREE_UNIT + " * " + st.x + ")", top: "calc(" + FREE_UNIT + " * " + st.y + ")", margin: "0" });
      delete out.right;
      delete out.bottom;
      delete out.transform;
      /* Its own size in 4px steps, in place of a size token, and its turn
         about its centre. */
      if (st.fw) out.width = "calc(" + FREE_UNIT + " * " + st.fw + ")";
      if (st.fh) out.height = "calc(" + FREE_UNIT + " * " + st.fh + ")";
      if (st.rot) out.transform = "rotate(" + st.rot + "deg)";
    }
    var rw = relCss(st.rw), rh = relCss(st.rh);
    if (rw) { out = out || {}; out.width = rw; }
    if (rh) { out = out || {}; out.height = rh; }
    return out;
  }

  /* The component's own element inside a specimen, which may wrap it. */
  function findElement(node, type) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var hit = findElement(node[i], type);
        if (hit) return hit;
      }
      return null;
    }
    if (node.type === type) return node;
    return node.props ? findElement(node.props.children, type) : null;
  }

  /* Layout containers start clean: their specimens show off a variant (a
     photo band, a wide gap) that would be a surprising default for an empty
     box. Card keeps its specimen's title and copy. */
  var CLEAN = { Group: true, Section: true, Stack: true, Inline: true, Grid: true, Slot: true };

  var baseCache = {};
  function base(type) {
    if (baseCache[type]) return baseCache[type];
    if (CLEAN[type]) return (baseCache[type] = {});
    var Comp = NS[type];
    var build = (specs.samples && specs.samples[type]) || specs.build[type];
    var props = {};
    if (Comp && build) {
      try {
        var el = findElement(build(), Comp);
        if (el) props = Object.assign({}, el.props);
      } catch (err) { props = {}; }
    }
    if (CONTAINERS[type]) delete props.children;
    baseCache[type] = props;
    return props;
  }

  /* The props a node renders with: the specimen's, then the reader's. */
  function propsOf(node) {
    var p = Object.assign({}, base(node.type));
    var own = node.props || {};
    Object.keys(own).forEach(function (k) {
      if (own[k] === null || own[k] === undefined) delete p[k];
      else p[k] = own[k];
    });
    var st = styleFor(node.style);
    if (st) p.style = Object.assign({}, p.style || {}, st);
    if (node.style && node.style.dark) p.className = ((p.className || "") + " dark").trim();
    return p;
  }

  /* A prop combination a component rejects shows a note on that node only. */
  class Guard extends React.Component {
    constructor(p) { super(p); this.state = { error: null }; }
    static getDerivedStateFromError(error) { return { error: error }; }
    componentDidUpdate(prev) { if (prev.stamp !== this.props.stamp && this.state.error) this.setState({ error: null }); }
    render() {
      return this.state.error
        ? e("div", { className: "bf-error" }, this.props.name + " doesn't render with these props: " + String(this.state.error.message || this.state.error))
        : this.props.children;
    }
  }

  /* ------------------------------------------------------------ slots */

  /* A component's element props (a hero's actions, its media) are slots: the
     builder holds what's in them as nodes, so each part can be picked and
     changed, and renders them back into the prop. They are found from the
     types, never listed by hand: a React.ReactNode prop whose sample is an
     element, or one with nothing in it yet. */
  function slotsOf(node) { return (node.children || []).filter(function (c) { return c && c.type === "Slot"; }); }
  /* A container's own children, without its slots. */
  function flowOf(node) { return (node.children || []).filter(function (c) { return c && c.type !== "Slot"; }); }
  function slotProps(type) {
    var m = DATA.components && DATA.components[type];
    /* A prop the component clones (a popover's trigger) has to stay one
       element, so it isn't a slot; @slot none opts any other out. */
    return m && !m.builder ? m.props.filter(function (p) { return p.kind === "node" && p.name !== "children" && p.name !== "trigger" && !(p.accepts && p.accepts[0] === "none"); }) : [];
  }
  var keepLayout = false;
  var OPEN_SLOT = /^(actions|media|footer|aside|extra|start|end|leading|trailing)$/;
  /* What starts in each slot: the sample's own elements, as nodes. A sample
     that can't come apart cleanly (an icon, an SVG) stays as it is. */
  function slotTemplate(type) {
    var b = base(type), out = [];
    slotProps(type).forEach(function (p) {
      var v = b[p.name];
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return;
      if (v === null || v === undefined) { if (p.accepts || OPEN_SLOT.test(p.name)) out.push({ name: p.name, nodes: [] }); return; }
      var parts = [];
      (function flat(x) {
        if (Array.isArray(x)) x.forEach(flat);
        else if (isElement(x) && x.type === React.Fragment) flat(x.props.children);
        else if (x !== null && x !== undefined && x !== false) parts.push(x);
      })(v);
      var nodes = [], whole = parts.length > 0;
      keepLayout = true;
      parts.forEach(function (x) {
        var made = fromElement(x);
        if (!made || (Array.isArray(made) && !made.length)) whole = false;
        else nodes = nodes.concat(made);
      });
      keepLayout = false;
      if (whole) out.push({ name: p.name, nodes: nodes });
    });
    return out;
  }

  /* A list prop's sample, as the builder edits it: only when every item fits
     the fields the item's type gives, so editing never drops what's there. */
  function listSample(type, name) {
    var m = DATA.components && DATA.components[type];
    var spec = m && m.props.filter(function (p) { return p.kind === "list" && p.name === name; })[0];
    if (!spec) return null;
    var v = base(type)[name];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) return null;
    var out = [];
    for (var i = 0; i < v.length; i++) {
      var item = v[i];
      if (spec.of === "text") {
        if (typeof item !== "string" && typeof item !== "number") return null;
        out.push(String(item));
        continue;
      }
      if (!item || typeof item !== "object" || isElement(item) || Array.isArray(item)) return null;
      var o = {};
      var keys = Object.keys(item);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k], val = item[key];
        if (val === undefined || val === null) continue;
        var f = spec.fields.filter(function (x) { return x.name === key; })[0];
        if (!f) return null;
        if (f.kind === "number") { if (typeof val !== "number") return null; }
        else if (f.kind === "boolean") { if (typeof val !== "boolean") return null; }
        else if (f.kind === "enum") { if (f.options.indexOf(val) < 0) return null; }
        else if (typeof val !== "string" && typeof val !== "number") return null;
        o[key] = f.kind === "text" || f.kind === "url" || f.kind === "media" ? String(val) : val;
      }
      out.push(o);
    }
    return out;
  }

  var stamp = 0;
  var index = {};

  function empty(id) {
    return e("div", { className: "bf-empty", "data-bf-slot": id, key: "empty" }, "Drop components here");
  }

  function renderNode(node, parentId) {
    index[node.id] = { node: node, parent: parentId };
    /* Hidden: known to the index (so Layers can find it) but not drawn. */
    if (node.hide) return null;
    var lock = node.lock ? "" : undefined;
    if (node.type === "Group") {
      var gp = node.props || {};
      var gkids = (node.children || []).length ? node.children.map(function (c) { return renderNode(c, node.id); }) : empty(node.id);
      return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": "Group", "data-bf-free": isFree(node.style) ? "" : undefined, "data-bf-locked": lock, style: { display: "contents" } },
        e("div", { className: node.style && node.style.dark ? "dark" : undefined, style: Object.assign(groupStyle(gp), styleFor(node.style) || {}) }, gkids));
    }
    if (node.type === "Shape") {
      return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": "Shape", "data-bf-free": isFree(node.style) ? "" : undefined, "data-bf-locked": lock, style: { display: "contents" } },
        e("div", { className: node.style && node.style.dark ? "dark" : undefined, style: shapeStyle(node), role: "presentation" }));
    }
    if (node.type === "Carousel" && !opts.preview) return carouselBoard(node);
    var Comp = NS[node.type];
    if (!Comp) return e("div", { key: node.id, className: "bf-error", "data-bf-id": node.id }, "Unknown component " + node.type);
    var p = propsOf(node);
    /* Its slots, rendered into the props they stand for. */
    slotsOf(node).forEach(function (sl) {
      index[sl.id] = { node: sl, parent: node.id };
      /* An empty slot draws nothing, as the component would. */
      p[sl.props.name] = sl.children.length
        ? e("div", { key: sl.id, "data-bf-id": sl.id, "data-bf-type": "Slot", style: { display: "contents" } }, sl.children.map(function (c) { return renderNode(c, sl.id); }))
        : null;
    });
    var kids;
    if (CONTAINERS[node.type]) {
      var own = flowOf(node);
      kids = own.length ? own.map(function (c) { return renderNode(c, node.id); }) : empty(node.id);
    }
    var el = kids === undefined ? e(Comp, p) : e(Comp, p, kids);
    return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": node.type, "data-bf-free": isFree(node.style) ? "" : undefined, "data-bf-locked": lock, style: { display: "contents" } },
      e(Guard, { stamp: stamp, name: node.type }, el));
  }

  /* A Carousel while editing: its items flat, in frames of its item shape, so
     each can be selected and dropped between. Play renders the real one. */
  var ITEM_SHAPE = { square: "1 / 1", portrait: "3 / 4", landscape: "4 / 3" };
  function carouselBoard(node) {
    var p = propsOf(node);
    var items = flowOf(node);
    var shape = typeof p.itemRatio === "number" && p.itemRatio > 0 ? String(p.itemRatio) : ITEM_SHAPE[p.itemRatio] || ITEM_SHAPE.square;
    var size = typeof p.itemSize === "number" && p.itemSize > 0 ? Math.max(0.5, Math.min(2, p.itemSize)) : 1;
    var dark = node.style && node.style.dark;
    return e("div", { key: node.id, "data-bf-id": node.id, "data-bf-type": "Carousel", "data-bf-free": isFree(node.style) ? "" : undefined, style: { display: "contents" } },
      e("div", { className: "bf-carousel-board" + (dark ? " dark" : ""), style: Object.assign({ "--bf-carousel-size": size }, styleFor(node.style) || {}), role: "group", "aria-label": (p.label || "Carousel") + ", laid flat while editing" },
        e("div", { className: "bf-carousel-head" },
          e("strong", null, p.label || "Carousel"),
          e("span", null, (p.layout || "ring") + " · " + items.length + (items.length === 1 ? " item" : " items")),
          e("span", { className: "bf-carousel-hint" }, "Moves in Play")),
        e("div", { className: "bf-carousel-items", "data-bf-items": node.id },
          items.length
            ? items.map(function (c) { return e("div", { key: c.id, className: "bf-carousel-item", style: { aspectRatio: shape } }, renderNode(c, node.id)); })
            : empty(node.id))));
  }

  var current = null;
  var opts = {};

  /* React commits on its own schedule, so the builder hears about a new
     layout from here, after the canvas has really changed. */
  function Painted(props) {
    React.useLayoutEffect(function () {
      /* Free items don't push a hugging frame open, so it grows to them here. */
      var rootEl = mount.firstElementChild;
      if (rootEl) {
        var need = 0;
        if (opts.hug) {
          var top = rootEl.getBoundingClientRect().top;
          Array.prototype.forEach.call(rootEl.querySelectorAll("[data-bf-free] > *"), function (el) { need = Math.max(need, el.getBoundingClientRect().bottom - top); });
        }
        rootEl.style.minHeight = need ? Math.ceil(need) + "px" : "";
      }
      if (host()) host().moved();
    });
    return props.children;
  }

  function render(tree, options) {
    current = tree;
    opts = options || {};
    stamp++;
    index = {};
    var page = tree.page || {};
    index.root = { node: tree.root, parent: null };
    var cls = ["bf-root"];
    if (page.dark) cls.push("dark");
    if (opts.preview) cls.push("bf-preview");
    else cls.push("bf-editing");
    /* A frame that hugs its content grows to it, so nothing here may fill the
       window, and nothing scrolls. */
    if (opts.hug) cls.push("bf-hug");
    var screen = opts.screen && opts.screen.w > 0 && opts.screen.h > 0 ? opts.screen : null;
    html.style.overflow = opts.hug ? "hidden" : "";
    /* While editing, a finger pans and pinches the builder's canvas. */
    html.style.touchAction = opts.preview ? "" : "none";
    /* A custom canvas colour is the one raw value a frame takes: the page's own
       backdrop, outside the system. */
    var style = pageStyle(page);
    if (screen) { style["--bf-vw"] = screen.w / 100 + "px"; style["--bf-vh"] = screen.h / 100 + "px"; }
    /* A loose object on the builder's canvas: no page around it, as wide as
       what it holds. */
    if (opts.bare) { cls.push("bf-bare"); style.background = "transparent"; if (opts.sized) cls.push("bf-sized"); }
    html.classList.toggle("bf-bare-doc", !!opts.bare);
    if (page.gap && ROOT_GAP[page.gap]) style.gap = "calc(var(" + ROOT_GAP[page.gap] + ") * var(--dt-layout-scale, 1))";
    if (!opts.bare && page.flow) Object.assign(style, flowStyle(page.flow));
    /* Clipped or scrolling, the root is the screen and the document itself
       stays still. A frame that hugs its content grows instead. */
    var over = !opts.hug && !opts.bare ? overflowStyle(page) : null;
    if (over) { Object.assign(style, over); html.style.overflow = "hidden"; }
    var kids = tree.root.children.length ? tree.root.children.map(function (c) { return renderNode(c, "root"); }) : empty("root");
    root.render(e(Painted, null, e("div", { className: cls.join(" "), "data-layout": page.spacing || undefined, "data-type-scale": page.typeScale === "social" ? "social" : undefined, "data-bf-id": "root", style: style }, kids)));
  }

  /* ---------------------------------------------------------- geometry */

  function wrapper(id) {
    return document.querySelector('[data-bf-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }

  /* A node's box. Its wrapper is display: contents, so the box is the union of
     what it renders. */
  function rect(id) {
    var w = wrapper(id);
    if (!w) return null;
    var r;
    if (id === "root") r = w.getBoundingClientRect();
    else {
      var range = document.createRange();
      range.selectNodeContents(w);
      r = range.getBoundingClientRect();
    }
    if (!r || (!r.width && !r.height)) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  }

  function contains(ancestorId, id) {
    var cur = index[id];
    while (cur) {
      if (cur.node.id === ancestorId) return true;
      cur = cur.parent ? index[cur.parent] : null;
    }
    return false;
  }

  /* The element that lays a container's children out: the parent of its first
     child's box, which is not always the component's root (Section and Card
     wrap their children in an inner column). */
  function layoutBox(id) {
    var entry = index[id];
    if (!entry) return null;
    var w = wrapper(id);
    if (!w) return null;
    if (entry.node.type === "Carousel" && !opts.preview) return w.querySelector('[data-bf-items="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    var kids0 = entry.node.type === "Slot" ? entry.node.children || [] : flowOf(entry.node);
    var first = kids0.length ? wrapper(kids0[0].id) : w.querySelector('[data-bf-slot="' + id + '"]');
    if (!first) return null;
    var box = first.parentElement;
    while (box && getComputedStyle(box).display === "contents") box = box.parentElement;
    return box;
  }

  function axisOf(id) {
    var box = layoutBox(id);
    if (!box) return "y";
    var cs = getComputedStyle(box);
    if (cs.display.indexOf("grid") >= 0) return "grid";
    if (cs.display.indexOf("flex") >= 0 && cs.flexDirection.indexOf("row") === 0) return "x";
    return "y";
  }

  function childRects(id, skip) {
    var entry = index[id];
    return (entry.node.children || []).map(function (c, i) { return { id: c.id, i: i, r: c.id === skip || (c.type === "Slot" && entry.node.type !== "Slot") ? null : rect(c.id) }; })
      .filter(function (c) { return c.r; });
  }

  /* Where in a container a point lands, in reading order. */
  function indexIn(id, x, y, axis, skip) {
    var kids = childRects(id, skip);
    for (var k = 0; k < kids.length; k++) {
      var r = kids[k].r;
      if (axis === "y") {
        if (y < r.top + r.height / 2) return kids[k].i;
      } else {
        if (y < r.top) return kids[k].i;
        if (y <= r.bottom && x < r.left + r.width / 2) return kids[k].i;
      }
    }
    return (index[id].node.children || []).length;
  }

  /* The line that shows an insertion point, in frame coordinates. */
  function lineFor(id, at, axis, skip) {
    var node = index[id].node;
    /* A container's slots sit elsewhere in it, so they're not insertion points. */
    var counts = function (c) { return c.id !== skip && (node.type === "Slot" || c.type !== "Slot"); };
    var kids = (node.children || []).filter(counts);
    var before = node.children[at] && counts(node.children[at]) ? node.children[at] : null;
    if (!before) {
      for (var j = at; j < node.children.length; j++) if (counts(node.children[j])) { before = node.children[j]; break; }
    }
    if (!kids.length) {
      var slot = document.querySelector('[data-bf-slot="' + id + '"]');
      var sr = slot ? slot.getBoundingClientRect() : rect(id);
      return sr ? { box: { left: sr.left, top: sr.top, width: sr.width, height: sr.height } } : null;
    }
    var r, edge;
    if (before) { r = rect(before.id); edge = "start"; }
    else { r = rect(kids[kids.length - 1].id); edge = "end"; }
    if (!r) return null;
    if (axis === "y") return { line: { left: r.left, top: edge === "start" ? r.top : r.bottom, width: r.width, height: 0 } };
    return { line: { left: edge === "start" ? r.left : r.right, top: r.top, width: 0, height: r.height } };
  }

  /* Where a dragged component would land at (x, y): { parent, index, line }
     or null. dragId is the node being moved, if any; it can't land inside
     itself. */
  function drop(x, y, dragId, edgePx) {
    if (!current) return null;
    var el = document.elementFromPoint(x, y);
    var w = el && el.closest ? el.closest("[data-bf-id]") : null;
    var id = w ? w.getAttribute("data-bf-id") : "root";
    if (!index[id]) id = "root";
    if (dragId && dragId !== "root" && contains(dragId, id)) {
      /* Over the dragged node itself: treat it as its own slot in its parent. */
      id = dragId;
    }
    while (id) {
      var entry = index[id];
      var node = entry.node;
      var r = rect(id);
      var parentId = entry.parent;
      if (CONTAINERS[node.type] && id !== dragId) {
        var edge = parentId ? Math.min(edgePx || 10, r ? r.height / 4 : 0, r ? r.width / 4 : 0) : 0;
        var pAxis = parentId ? axisOf(parentId) : "y";
        var nearStart = r && (pAxis === "y" ? y - r.top < edge : x - r.left < edge);
        var nearEnd = r && (pAxis === "y" ? r.bottom - y < edge : r.right - x < edge);
        if (!parentId || !(nearStart || nearEnd)) {
          var axis = axisOf(id);
          var at = indexIn(id, x, y, axis, dragId);
          var shown = lineFor(id, at, axis, dragId);
          return { parent: id, index: at, line: shown && shown.line, box: shown && shown.box };
        }
      }
      if (!parentId) return null;
      /* A leaf, or the edge of a container: before or after it, in its parent. */
      var siblings = index[parentId].node.children;
      var mine = siblings.indexOf(node);
      var ax = axisOf(parentId);
      var after = r ? (ax === "y" ? y > r.top + r.height / 2 : (y > r.bottom ? true : y < r.top ? false : x > r.left + r.width / 2)) : true;
      var at2 = mine + (after ? 1 : 0);
      if (dragId && siblings[mine] && siblings[mine].id === dragId) at2 = mine;
      var shown2 = lineFor(parentId, at2, ax, dragId);
      return { parent: parentId, index: at2, line: shown2 && shown2.line, box: shown2 && shown2.box };
    }
    return null;
  }

  /* The layer an element belongs to; a locked one passes the press up to
     the first unlocked layer around it. */
  function layerOf(el) {
    var w = el && el.closest ? el.closest("[data-bf-id]") : null;
    while (w && w.hasAttribute("data-bf-locked")) w = w.parentElement && w.parentElement.closest ? w.parentElement.closest("[data-bf-id]") : null;
    return w;
  }
  function pick(x, y) {
    var w = layerOf(document.elementFromPoint(x, y));
    return w ? w.getAttribute("data-bf-id") : null;
  }

  /* ------------------------------------------------------------- events */

  /* While editing, a click selects instead of following a link, submitting a
     form or opening a menu. Preview mode hands the canvas back. */
  function editing() { return current && !opts.preview; }
  var bound = null;
  function host() {
    var h = window.parent && window.parent !== window ? window.parent.BuilderHost : null;
    if (!h) return null;
    if (!bound || bound.host !== h) bound = { host: h, api: h.bind ? h.bind(window) : h };
    return bound.api;
  }

  /* The text node under a point, inside the node's own wrapper. */
  function textAt(x, y, within) {
    var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    var node = range ? range.startContainer : null;
    if (!node && document.caretPositionFromPoint) { var pos = document.caretPositionFromPoint(x, y); node = pos ? pos.offsetNode : null; }
    if (!node || node.nodeType !== 3 || (within && !within.contains(node))) return null;
    var t = node.textContent.trim();
    return t || null;
  }

  /* Press on any part of a node and drag to move it. Inside the selection,
     the selection moves; elsewhere, the node under the pointer does. Touch
     scrolls instead, and moves with the selection's tag. */
  var press = null;
  var swallowClick = false;

  ["click", "submit", "auxclick", "dblclick"].forEach(function (type) {
    document.addEventListener(type, function (ev) {
      /* In Play, a link to one of the project's pages goes there. */
      if (opts.preview && type === "click") {
        var link = ev.target.closest ? ev.target.closest("a[href]") : null;
        var to = link && /^#page:([\w-]+)$/.exec(link.getAttribute("href") || "");
        if (to) { ev.preventDefault(); var hh = host(); if (hh && hh.goPage) hh.goPage(to[1]); }
        return;
      }
      if (!editing()) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (!host()) return;
      var w = layerOf(ev.target);
      var id = w ? w.getAttribute("data-bf-id") : "root";
      /* The text right under the pointer, so that piece of it is what's typed into. */
      if (type === "dblclick") { host().edit(id, textAt(ev.clientX, ev.clientY, w)); return; }
      if (type !== "click") return;
      if (swallowClick) { swallowClick = false; return; }
      /* A component's own heading, pressed: the component, with its title
         as the part to change. */
      var hd = w && ev.target.closest ? ev.target.closest("h1, h2, h3, h4, h5, h6") : null;
      var part = hd && w.contains(hd) && hd.closest("[data-bf-id]") === w ? "title" : null;
      /* Shift adds to the selection; Cmd or Ctrl goes straight to the text. */
      host().pick(id, ev.shiftKey, ev.metaKey || ev.ctrlKey, part);
    }, true);
  });
  /* A right-click: the builder's own menu, for the layer under the pointer
     (or the frame). */
  document.addEventListener("contextmenu", function (ev) {
    if (!editing() || !host() || !host().menu) return;
    ev.preventDefault();
    var w = layerOf(ev.target);
    host().menu(w ? w.getAttribute("data-bf-id") : "root", ev.clientX, ev.clientY);
  }, true);
  /* A pan or a pinch: every finger while editing, the middle button, or any
     drag while the builder holds Space. The builder moves the canvas and says
     whether the pointer moved, so a pan doesn't end in a click. */
  var pans = {};
  var framing = null;
  /* A finger held still on the frame's own background picks the frame up. */
  var hold = null;
  var HOLD_MS = 450;
  function onBackground(ev) {
    var w = layerOf(ev.target);
    return !w || w.getAttribute("data-bf-id") === "root";
  }
  function panning(ev) {
    if (!host()) return false;
    if (ev.pointerType === "touch") return true;
    return ev.button === 1 || !!(host().spaceHeld && host().spaceHeld());
  }
  function startFraming(ev, dup) {
    framing = ev.pointerId;
    try { ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    host().frameDrag("down", ev.clientX, ev.clientY, dup);
  }
  document.addEventListener("pointerdown", function (ev) {
    if (!editing()) return;
    /* No focus, no text selection, no native drag of an image. */
    if (ev.pointerType === "mouse") ev.preventDefault();
    /* Cmd or Ctrl with Shift: the whole frame is dragged, to drop a copy. */
    if (ev.button === 0 && ev.shiftKey && (ev.metaKey || ev.ctrlKey) && host() && host().frameDrag) {
      startFraming(ev, true);
      return;
    }
    if (panning(ev)) {
      pans[ev.pointerId] = true;
      try { ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      host().gesture("down", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType);
      /* A finger that stays put on the background long enough stops panning
         and moves the frame instead. */
      if (ev.pointerType === "touch" && onBackground(ev) && host().frameDrag) {
        var down = ev;
        clearTimeout(hold && hold.timer);
        hold = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, timer: setTimeout(function () {
          if (!hold || hold.id !== down.pointerId || !pans[down.pointerId]) return;
          delete pans[down.pointerId];
          host().gesture("cancel", down.pointerId, hold.x, hold.y, "touch");
          hold = null;
          startFraming(down, false);
        }, HOLD_MS) };
      }
      return;
    }
    /* A drag on the frame's own background moves the frame on the canvas. */
    if (ev.button === 0 && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey && onBackground(ev) && host() && host().frameDrag) {
      startFraming(ev, false);
      return;
    }
    if (ev.button !== 0 || ev.pointerType === "touch" || ev.shiftKey || ev.metaKey || ev.ctrlKey || !host()) return;
    var w = layerOf(ev.target);
    var id = w ? w.getAttribute("data-bf-id") : null;
    if (!id || id === "root" || !index[id]) return;
    var sel = host().selection();
    var dragId = sel && sel !== "root" && index[sel] && contains(sel, id) ? sel : id;
    press = { id: dragId, x: ev.clientX, y: ev.clientY, pointer: ev.pointerId, active: false, alt: !!ev.altKey };
    try { ev.target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
  }, true);
  document.addEventListener("pointermove", function (ev) {
    if (!editing() || !host()) return;
    if (framing === ev.pointerId) { host().frameDrag("move", ev.clientX, ev.clientY); return; }
    if (hold && hold.id === ev.pointerId && Math.abs(ev.clientX - hold.x) + Math.abs(ev.clientY - hold.y) > 8) { clearTimeout(hold.timer); hold = null; }
    if (pans[ev.pointerId]) { host().gesture("move", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType); return; }
    if (press && ev.pointerId === press.pointer) {
      if (!press.active && Math.abs(ev.clientX - press.x) + Math.abs(ev.clientY - press.y) > 5) {
        press.active = true;
        /* With Alt (Option) held, a copy is what's dragged. */
        host().dragStart(press.id, press.alt || !!ev.altKey);
      }
      if (press.active) { host().dragMove(ev.clientX, ev.clientY, ev.shiftKey); return; }
    }
    if (ev.pointerType === "mouse") host().hover(pick(ev.clientX, ev.clientY));
  }, true);
  function release(commit) {
    return function (ev) {
      if (hold && hold.id === ev.pointerId) { clearTimeout(hold.timer); hold = null; }
      if (framing === ev.pointerId) {
        framing = null;
        /* A press that didn't move is a click on the frame, which selects it. */
        if (host() && host().frameDrag(commit ? "up" : "cancel", ev.clientX, ev.clientY)) {
          swallowClick = true;
          setTimeout(function () { swallowClick = false; }, 0);
        }
        return;
      }
      if (pans[ev.pointerId]) {
        delete pans[ev.pointerId];
        if (host() && host().gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType)) {
          swallowClick = true;
          setTimeout(function () { swallowClick = false; }, 0);
        }
        return;
      }
      if (!press || ev.pointerId !== press.pointer) return;
      if (press.active && host()) {
        host().dragEnd(commit);
        /* The click that follows this release is the drag's, not a pick. */
        swallowClick = true;
        setTimeout(function () { swallowClick = false; }, 0);
      }
      press = null;
    };
  }
  document.addEventListener("pointerup", release(true), true);
  document.addEventListener("pointercancel", release(false), true);
  document.addEventListener("pointerleave", function () { if (host()) host().hover(null); });
  document.addEventListener("keydown", function (ev) {
    if (!host()) return;
    /* In Play the screen has the focus once a link is followed, so Escape
       and Back still reach the theater. */
    if (opts.preview) { if (current && host().playKey && host().playKey(ev.key, ev.altKey)) ev.preventDefault(); return; }
    if (!editing()) return;
    if (host().key(ev)) ev.preventDefault();
  }, true);
  document.addEventListener("keyup", function (ev) { if (host() && host().keyup) host().keyup(ev); }, true);
  /* A paste while this frame has the focus goes to the builder, which knows
     what to make of a picture or of layers; typing in place keeps its own. */
  document.addEventListener("paste", function (ev) {
    if (!editing() || !host() || !host().paste) return;
    var t = ev.target;
    if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (host().paste(ev.clipboardData)) ev.preventDefault();
  });

  /* The wheel scrolls this frame while it can, then pans the canvas; with
     Ctrl or Cmd (a trackpad pinch) it zooms the canvas at the pointer. */
  function room(dx, dy) {
    var se = document.scrollingElement || html;
    if (dy > 0 && se.scrollTop + se.clientHeight < se.scrollHeight - 1) return true;
    if (dy < 0 && se.scrollTop > 0) return true;
    if (dx > 0 && se.scrollLeft + se.clientWidth < se.scrollWidth - 1) return true;
    if (dx < 0 && se.scrollLeft > 0) return true;
    return false;
  }
  window.addEventListener("wheel", function (ev) {
    if (!host() || !host().wheel) return;
    if (!(ev.ctrlKey || ev.metaKey) && room(ev.deltaX, ev.deltaY)) return;
    ev.preventDefault();
    host().wheel(ev.clientX, ev.clientY, ev.deltaX, ev.deltaY, ev.ctrlKey || ev.metaKey, ev.deltaMode);
  }, { passive: false });
  window.addEventListener("scroll", function () { if (host()) host().moved(); }, { passive: true });
  window.addEventListener("resize", function () { if (host()) host().moved(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (host()) host().moved(); }).observe(mount);

  /* The site's Configure panel themes every same-origin frame, its context
  included. Dark mode here belongs to each frame's own setting, on the canvas
  root, so it's taken back off <html>. */
  function keepHtmlNeutral() {
    if (html.classList.contains("dark")) html.classList.remove("dark");
  }
  keepHtmlNeutral();
  new MutationObserver(keepHtmlNeutral).observe(html, { attributes: true, attributeFilter: ["class"] });

  /* ---------------------------------------------------------------- code */

  var names = new Map();
  Object.keys(NS).forEach(function (k) { if (typeof NS[k] === "function" || typeof NS[k] === "object") names.set(NS[k], k); });

  function isElement(v) { return v && typeof v === "object" && v.$$typeof && v.props !== undefined; }
  function tagOf(type, used) {
    if (typeof type === "string") return type;
    if (type === React.Fragment) return "";
    var n = names.get(type);
    if (n) { used.add(n); return n; }
    return "Component";
  }
  function attrName(k) { return k === "className" ? "className" : k; }

  function value(v, used, depth) {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return JSON.stringify(v.replace(SCREEN_UNIT, "$2v$1"));
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "function") return "() => {}";
    if (isElement(v)) return inline(v, used);
    if (Array.isArray(v)) return "[" + v.map(function (x) { return value(x, used, depth + 1); }).join(", ") + "]";
    if (typeof v === "object") {
      var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined; });
      if (!keys.length) return "{}";
      return "{ " + keys.map(function (k) { return (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ": " + value(v[k], used, depth + 1); }).join(", ") + " }";
    }
    return "undefined";
  }

  function attrs(props, used) {
    return Object.keys(props).filter(function (k) {
      return k !== "children" && k !== "key" && k !== "ref" && props[k] !== undefined && !/^data-bf-/.test(k);
    }).map(function (k) {
      var v = props[k];
      if (v === true) return attrName(k);
      if (typeof v === "string" && !/["\n{}<>]/.test(v)) return attrName(k) + '="' + v + '"';
      return attrName(k) + "={" + value(v, used, 0) + "}";
    });
  }

  function childText(c, used) {
    if (c === null || c === undefined || c === false || c === true) return "";
    if (Array.isArray(c)) return c.map(function (x) { return childText(x, used); }).join("");
    if (isElement(c)) return inline(c, used);
    var s = String(c);
    return /[{}<>]/.test(s) ? "{" + JSON.stringify(s) + "}" : s;
  }

  /* An element on one line, for a prop value or a specimen's own children. */
  function inline(el, used) {
    var tag = tagOf(el.type, used);
    var a = attrs(el.props || {}, used);
    var kids = childText(el.props ? el.props.children : null, used);
    var open = "<" + tag + (a.length ? " " + a.join(" ") : "");
    return kids ? open + ">" + kids + "</" + tag + ">" : (tag ? open + " />" : "<></>");
  }

  function block(node, used, pad) {
    if (node.type === "Shape") return pad + "<div" + (node.style && node.style.dark ? ' className="dark"' : "") + ' role="presentation" style={' + value(shapeStyle(node), used, 0) + "} />";
    if (node.type === "Group") {
      var gs = Object.assign(groupStyle(node.props || {}), styleFor(node.style) || {});
      var gattrs = (node.style && node.style.dark ? ' className="dark"' : "") + " style={" + value(gs, used, 0) + "}";
      var gopen = pad + "<div" + gattrs;
      if (!(node.children || []).length) return gopen + " />";
      return gopen + ">\n" + node.children.map(function (c) { return block(c, used, pad + "  "); }).join("\n") + "\n" + pad + "</div>";
    }
    var tag = node.type;
    used.add(tag);
    var p = propsOf(node);
    var slots = slotsOf(node);
    slots.forEach(function (sl) { delete p[sl.props.name]; });
    var a = attrs(p, used);
    /* A slot is written as the elements in it, so the export is the same
       component with the same parts the canvas shows. */
    slots.forEach(function (sl) {
      if (!sl.children.length) return;
      var inner = sl.children.map(function (c) { return block(c, used, pad + "    "); }).join("\n");
      a.push(attrName(sl.props.name) + "={<>\n" + inner + "\n" + pad + "  </>}");
    });
    var open = pad + "<" + tag + (a.length ? " " + a.join(" ") : "");
    if (CONTAINERS[node.type]) {
      var flow = flowOf(node);
      if (!flow.length) return open + " />";
      return open + ">\n" + flow.map(function (c) { return block(c, used, pad + "  "); }).join("\n") + "\n" + pad + "</" + tag + ">";
    }
    var kids = childText(p.children, used);
    return kids ? open + ">" + kids + "</" + tag + ">" : open + " />";
  }

  /* Hidden layers, and what's in them, stay out of the code. */
  function shown(node) {
    if (!node || node.hide) return null;
    if (!node.children) return node;
    return Object.assign({}, node, { children: node.children.map(shown).filter(Boolean) });
  }
  function jsx(tree, name) {
    var used = new Set();
    tree = Object.assign({}, tree, { root: shown(tree.root) || tree.root });
    var fn = String(name || "Screen").replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ""; }).replace(/^[a-z]/, function (c) { return c.toUpperCase(); }).replace(/^\d/, "S$&") || "Screen";
    var page = tree.page || {};
    if (page.bare) return jsxNodes(tree.root.children, name);
    var kids = tree.root.children.map(function (c) { return block(c, used, "      "); });
    var ps = pageStyle(page);
    delete ps.color;
    var rootStyle = Object.keys(ps).map(function (k) { return (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ": " + JSON.stringify(ps[k]); });
    if (tree.root.children.some(function (c) { return isFree(c.style); })) rootStyle.push("position: \"relative\"");
    if (page.gap && ROOT_GAP[page.gap] && !(page.flow && page.flow.gap)) rootStyle.push("display: \"flex\"", "flexDirection: \"column\"", "gap: \"var(" + ROOT_GAP[page.gap] + ")\"");
    var extra = Object.assign({}, page.flow ? Object.assign({ display: "flex" }, flowStyle(page.flow)) : null, !page.hug ? overflowStyle(page) : null);
    if (page.flow && page.gap && ROOT_GAP[page.gap] && !page.flow.gap) extra.gap = "var(" + ROOT_GAP[page.gap] + ")";
    Object.keys(extra).forEach(function (k) {
      rootStyle = rootStyle.filter(function (s) { return s.indexOf(k + ":") !== 0; });
      rootStyle.push(k + ": " + JSON.stringify(extra[k]));
    });
    var cls = page.dark ? "dark" : "";
    var rootAttrs = (cls ? ' className="' + cls + '"' : "") + (page.spacing ? ' data-layout="' + page.spacing + '"' : "") + (page.typeScale === "social" ? ' data-type-scale="social"' : "") + " style={{ " + rootStyle.join(", ") + " }}";
    var names = Array.from(used).filter(function (n) { return n !== "Root" && NS[n]; }).sort();
    return (names.length ? "import { " + names.join(", ") + ' } from "@dovetail-ds/react";\n\n' : "") +
      "export function " + fn + "() {\n  return (\n    <div" + rootAttrs + ">\n" + kids.join("\n") + (kids.length ? "\n" : "") + "    </div>\n  );\n}\n";
  }

  /* Just these layers, as a component of their own: a selection's code. A
     layer placed freely keeps its spot only on its frame, so here it sits in
     the flow. */
  function jsxNodes(nodes, name) {
    var used = new Set();
    var fn = String(name || "Part").replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ""; }).replace(/^[a-z]/, function (c) { return c.toUpperCase(); }).replace(/^\d/, "P$&") || "Part";
    var unfree = function (c) { var o = Object.assign({}, c, { style: Object.assign({}, c.style) }); delete o.style.x; delete o.style.y; return o; };
    nodes = nodes.map(shown).filter(Boolean);
    var many = nodes.length !== 1;
    var kids = nodes.map(function (c) { return block(unfree(c), used, many ? "      " : "    "); });
    var names = Array.from(used).filter(function (n) { return n !== "Root" && NS[n]; }).sort();
    var body = many ? "    <>\n" + kids.join("\n") + "\n    </>" : kids.join("\n");
    return (names.length ? "import { " + names.join(", ") + ' } from "@dovetail-ds/react";\n\n' : "") +
      "export function " + fn + "() {\n  return (\n" + body + "\n  );\n}\n";
  }

  /* ------------------------------------------------------------ detach */

  /* A component rebuilt from primitives, so its parts can be moved and
     restyled. Each recipe reads the props the node renders with (its specimen's
     and the reader's) and lays out Groups, Headings, Text and the smaller
     components the same way. Nodes come back without ids; the builder assigns
     them. Where no recipe exists, detach returns null and the button is off. */
  function n(type, props, children, style) {
    var node = { type: type, props: props || {}, style: style || {} };
    if (children) node.children = children.filter(Boolean);
    return node;
  }
  var str = function (v) { return typeof v === "string" || typeof v === "number" ? String(v) : null; };
  var text = function (v, props) { var t = str(v); return t ? n("Text", Object.assign({ children: t }, props || {})) : null; };
  var heading = function (v, size) { var t = str(v); return t ? n("Heading", { children: t, size: size }) : null; };
  var plain = function (props) {
    var out = {};
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k !== "children" && k !== "style" && k !== "className" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) out[k] = v;
    });
    return out;
  };
  /* A React element from a specimen (a row of Buttons, an img) as nodes. */
  function fromElement(el) {
    if (el === null || el === undefined || el === false) return null;
    if (el.__node) return (function bare(c) { var o = { type: c.type, props: Object.assign({}, c.props), style: Object.assign({}, c.style || {}) }; if (c.children) o.children = c.children.map(bare); return o; })(el.__node);
    if (typeof el === "string" || typeof el === "number") return text(el);
    if (Array.isArray(el)) return el.map(fromElement).filter(Boolean);
    if (!isElement(el)) return null;
    if (el.type === React.Fragment) return fromElement(el.props.children);
    if (el.type === "img") {
      /* A sample's own aspect ratio, where the Image has it as a named ratio. */
      var ar = el.props.style && String(el.props.style.aspectRatio || "").replace(/\s+/g, "");
      var named = ar ? (ar === "1/1" ? "square" : ar.replace("/", ":")) : null;
      var ratios = ((DATA.components.Image || { props: [] }).props.filter(function (p) { return p.name === "ratio"; })[0] || {}).options || [];
      return n("Image", Object.assign({ src: el.props.src, alt: el.props.alt || "" }, named && ratios.indexOf(named) >= 0 ? { ratio: named } : {}));
    }
    if (typeof el.type === "string") return fromElement(el.props.children);
    var name = names.get(el.type);
    if (!name) return null;
    var kids = [].concat(fromElement(el.props.children) || []);
    /* Detach takes layout apart into Groups; a slot keeps the component the sample used. */
    if ((name === "Inline" || name === "Stack") && !keepLayout) return n("Group", { direction: name === "Inline" ? "row" : "column", gap: (GROUP_LAYERS[el.props.layer] && el.props.layer) || el.props.gap || "sm", align: el.props.align, justify: el.props.justify }, kids);
    var props = plain(el.props);
    if (typeof el.props.children === "string") props.children = el.props.children;
    return CONTAINERS[name] ? n(name, props, kids) : n(name, props);
  }
  var section = function (b, kids) { return n("Section", plain({ tone: b.tone, dark: b.dark, texture: b.texture, spacing: b.spacing, width: b.width }), kids); };
  var header = function (b, size) { return [text(b.eyebrow, { variant: "eyebrow" }), heading(b.title, size || "display-sm"), text(b.lead, { variant: "lead", tone: "secondary" })]; };
  var RECIPES = {
    Stack: function (b, node) { return n("Group", { direction: "column", gap: (GROUP_LAYERS[b.layer] && b.layer) || b.gap || "md", align: b.align, justify: b.justify }, node.children, node.style); },
    Inline: function (b, node) { return n("Group", { direction: "row", gap: (GROUP_LAYERS[b.layer] && b.layer) || b.gap || "sm", align: b.align || "center", justify: b.justify, wrap: b.wrap !== false }, node.children, node.style); },
    Card: function (b, node) {
      return n("Group", { direction: "column", gap: "xs" },
        [text(b.eyebrow, { variant: "eyebrow" }), heading(b.title, "heading-md"), text(b.description, { tone: "secondary" })].concat(node.children || [], [].concat(fromElement(b.footer) || [])),
        Object.assign({ padding: "md", surface: "raised", border: "default", radius: "container" }, node.style));
    },
    BlockHeader: function (b) { return n("Group", { direction: "column", gap: "xs", align: b.align === "center" ? "center" : "flex-start" }, header(b, b.size).concat([].concat(fromElement(b.actions) || []))); },
    HeroBlock: function (b) {
      var copy = n("Group", { direction: "column", gap: "sm", align: b.layout === "centered" ? "center" : "flex-start" }, header(b, "display-lg").concat([].concat(fromElement(b.actions) || [])));
      var media = fromElement(b.media);
      /* Copy beside media as two equal columns, the way the block lays them out. */
      if (b.layout === "centered" || !media) return section(b, [n("Group", { direction: "column", gap: "lg", align: b.layout === "centered" ? "center" : "flex-start" }, [copy].concat(media ? [media] : []))]);
      return section(b, [n("Grid", { columns: 2, gap: "xl", align: "center" }, [copy, media])]);
    },
    SplitBlock: function (b) {
      var points = Array.isArray(b.points) ? n("Group", { direction: "column", gap: "2xs" }, b.points.map(function (p) { return text(p); })) : null;
      var copy = n("Group", { direction: "column", gap: "sm" }, header(b).concat([text(b.body, { tone: "secondary" }), points].concat([].concat(fromElement(b.actions) || []))));
      var media = fromElement(b.media);
      if (!media) return section(b, [copy]);
      return section(b, [n("Grid", { columns: 2, gap: "xl", align: b.align === "top" ? "start" : "center" }, b.reverse ? [media, copy] : [copy, media])]);
    },
    CtaBlock: function (b) { return section(b, [n("Group", { direction: "column", gap: "sm", align: "center" }, header(b).concat([].concat(fromElement(b.actions) || [])))]); },
    FeatureGridBlock: function (b) {
      var items = (b.items || []).map(function (it) { return n("Card", plain({ title: it.title, description: it.description }), []); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: b.columns || 3 }, items)])]);
    },
    StatsBlock: function (b) {
      var stats = (b.stats || []).map(function (it) { return n("Stat", plain({ label: it.label, value: it.value, caption: it.caption })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: Math.min(4, stats.length || 3) }, stats)])]);
    },
    TestimonialBlock: function (b) {
      var quotes = (b.quotes || []).map(function (q) { return n("Quote", plain({ children: q.quote, attribution: q.name, role: q.role })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: Math.min(2, quotes.length || 2) }, quotes)])]);
    },
    FaqBlock: function (b) {
      var items = (b.items || []).map(function (it) { return n("Card", plain({ title: it.question, description: it.answer }), []); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Group", { direction: "column", gap: "sm" }, items)])]);
    },
    ProductGridBlock: function (b) {
      var cards = (b.products || []).map(function (pr) { return n("ProductCard", plain({ name: pr.name, price: pr.price, compareAt: pr.compareAt, href: pr.href, locale: pr.locale, currency: pr.currency })); });
      return section(b, [n("Group", { direction: "column", gap: "lg" }, [n("Group", { direction: "column", gap: "xs" }, header(b)), n("Grid", { columns: b.columns || 3 }, cards)])]);
    },
  };
  function detach(node) {
    var recipe = RECIPES[node.type];
    if (!recipe) return null;
    var b = propsOf(node);
    /* What's in its slots comes out as the nodes they hold. */
    slotsOf(node).forEach(function (sl) { b[sl.props.name] = sl.children.map(function (c) { return { __node: c }; }); });
    try { return recipe(b, Object.assign({}, node, { children: node.children ? flowOf(node) : node.children })); } catch (err) { return null; }
  }

  /* Where a node's text is drawn: the box of the element holding it, and the
     type it's set in, so an editor laid over it reads the same. */
  function textRect(id, want) {
    var w = wrapper(id);
    if (!w) return null;
    var target = String(want == null ? "" : want).trim();
    var walker = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
    var node, hit = null;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim() && (!target || node.textContent.trim() === target)) { hit = node; break; }
    }
    var el = hit ? hit.parentElement : null;
    var r = el ? el.getBoundingClientRect() : rect(id);
    if (!r) return null;
    var cs = el ? getComputedStyle(el) : null;
    return {
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      font: cs ? { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign, color: cs.color, textTransform: cs.textTransform } : null,
    };
  }

  /* A node as it's drawn, to carry under the pointer while it's dragged:
     the markup it renders (styled inline from tokens) and its size. */
  function outer(id) {
    var w = wrapper(id);
    var r = rect(id);
    if (!w || !r) return null;
    var htmlOut = "";
    Array.prototype.forEach.call(w.children, function (c) { htmlOut += c.outerHTML; });
    return { html: htmlOut.length > 400000 ? "" : htmlOut, width: r.width, height: r.height, left: r.left, top: r.top };
  }

  /* What a component is made of, for the layers: its headings, copy,
     pictures and controls in drawing order. They're its own parts, set
     through its props, so they're for reading, not picking; a slot inside it
     is marked where it sits, since that one holds real layers. */
  var PART = { H1: "Heading", H2: "Heading", H3: "Heading", H4: "Heading", H5: "Heading", H6: "Heading", P: "Text", IMG: "Image", PICTURE: "Image", VIDEO: "Video", svg: "Icon", SVG: "Icon",
    BUTTON: "Button", A: "Link", INPUT: "Field", SELECT: "Select", TEXTAREA: "Text area", LABEL: "Label", UL: "List", OL: "List", LI: "Item", TABLE: "Table", BLOCKQUOTE: "Quote", FIGURE: "Figure", NAV: "Navigation", FORM: "Form", HEADER: "Header", FOOTER: "Footer" };
  function anatomy(id) {
    var w = wrapper(id);
    if (!w) return null;
    var count = 0;
    var walk = function (el) {
      var out = [];
      Array.prototype.forEach.call(el.children, function (c) {
        if (count > 60) return;
        var bfId = c.getAttribute && c.getAttribute("data-bf-id");
        if (bfId) {
          if (c.getAttribute("data-bf-type") === "Slot") { count++; out.push({ slot: bfId }); }
          return;
        }
        var kind = PART[c.tagName];
        if (c.getAttribute && c.getAttribute("aria-hidden") === "true" && kind !== "Icon") return;
        var role = c.getAttribute && c.getAttribute("role");
        if (!kind && role && /^(img|button|link|tab|tablist|list|listitem|radiogroup|group|heading|progressbar|status|separator)$/.test(role)) kind = role.charAt(0).toUpperCase() + role.slice(1);
        var inner = kind === "Icon" || kind === "Image" ? [] : walk(c);
        if (!kind) { out = out.concat(inner); return; }
        count++;
        var text = (c.getAttribute("aria-label") || c.getAttribute("alt") || (kind === "Icon" ? "" : c.textContent) || "").replace(/\s+/g, " ").trim().slice(0, 40);
        out.push({ kind: kind, text: text, children: inner });
      });
      return out;
    };
    return walk(w);
  }

  /* The canvas as a picture, PNG or JPEG, at twice its size unless asked
     otherwise. The image
     library loads the first time it's asked for. */
  var imaging = null;
  /* opts.fonts false: skip fetching web fonts into the picture. It's quick
     and quiet (the exporter otherwise reads every stylesheet the page has),
     at the cost of text in a fallback face: right for a small project
     picture, not for an export. */
  function snapshot(type, opts) {
    if (!imaging) {
      imaging = new Promise(function (resolve, reject) {
        if (window.htmlToImage) { resolve(window.htmlToImage); return; }
        var tag = document.createElement("script");
        tag.src = "vendor/html-to-image.js";
        tag.onload = function () { if (window.htmlToImage) resolve(window.htmlToImage); else reject(new Error("The image exporter didn't load.")); };
        tag.onerror = function () { imaging = null; reject(new Error("The image exporter didn't load.")); };
        document.head.appendChild(tag);
      });
    }
    /* opts.id: just that layer, what it draws; opts.scale: 1 to 3 times. */
    var held = opts && opts.id ? wrapper(opts.id) : null;
    var target = held ? held.firstElementChild : mount.firstElementChild;
    if (!target) return Promise.reject(new Error("Nothing to export."));
    var bg = getComputedStyle(target).backgroundColor;
    var options = { pixelRatio: Math.max(1, Math.min(3, (opts && opts.scale) || 2)), cacheBust: false, skipFonts: !!(opts && opts.fonts === false), backgroundColor: type === "jpeg" && (!bg || bg === "rgba(0, 0, 0, 0)") ? "#ffffff" : undefined,
      filter: function (node) { return !(node.classList && node.classList.contains("bf-empty")); } };
    /* A web font it can't fetch (offline, or blocked) leaves the picture in
       the fallback face; the library says so on the console, which is noise
       here, so those lines are kept to the export. */
    var said = console.error;
    var quiet = function () { var t = String(arguments[0] || ""); if (/^Error (inlining remote css|loading remote stylesheet|while reading CSS rules|inlining remote)/.test(t)) return; said.apply(console, arguments); };
    console.error = quiet;
    var done = function (v) { if (console.error === quiet) console.error = said; return v; };
    return imaging.then(function (lib) { return type === "jpeg" ? lib.toJpeg(target, Object.assign({ quality: 0.92 }, options)) : lib.toPng(target, options); })
      .then(done, function (err) { done(); throw err; });
  }

  window.BuilderFrame = {
    render: render,
    detach: detach,
    textRect: textRect,
    canDetach: function (type) { return !!RECIPES[type]; },
    slots: slotTemplate,
    listSample: listSample,
    rect: rect,
    drop: drop,
    pick: pick,
    jsx: jsx,
    jsxNodes: jsxNodes,
    outer: outer,
    /* The node being dragged moves itself: shifted by (dx, dy) and let
       through to the pointer, so what's under it can take the drop. Null
       puts it back where it was. */
    lift: function (id, dx, dy) {
      var w = wrapper(id);
      if (!w) return;
      Array.prototype.forEach.call(w.children, function (c) {
        var on = dx != null;
        /* A turned layer keeps its turn while it travels. */
        if (on && c.dataset.bfTurn === undefined) c.dataset.bfTurn = c.style.transform || "";
        var turn = c.dataset.bfTurn || "";
        c.style.transform = on ? ("translate(" + dx + "px, " + dy + "px) " + turn).trim() : turn;
        if (!on) delete c.dataset.bfTurn;
        c.style.pointerEvents = on ? "none" : "";
        c.style.willChange = on ? "transform" : "";
      });
    },
    /* Out of the frame, it travels with the pointer on the canvas instead. */
    hide: function (id, on) {
      var w = wrapper(id);
      if (w) Array.prototype.forEach.call(w.children, function (c) { c.style.visibility = on ? "hidden" : ""; });
    },
    anatomy: anatomy,
    snapshot: snapshot,
    /* The padding and margin a node has as drawn, in pixels: what it was
       given, what its component brings, or what it picks up around it. Its
       wrapper is display: contents, so that's its first element. */
    /* A node's own box, before any turn: its first element's layout size. */
    /* How a fill looks on this frame: the background and text colour an
       element with these styles takes here, light or dark, for swatches. */
    look: function (css) {
      var host = document.querySelector(".bf-root") || document.body;
      var el = document.createElement("div");
      el.style.color = "var(--dt-text-primary)";
      Object.keys(css || {}).forEach(function (k) { el.style.setProperty(k.indexOf("--") === 0 ? k : k.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }), css[k]); });
      host.appendChild(el);
      var c = getComputedStyle(el);
      var out = { bg: c.backgroundColor, fg: c.color };
      el.remove();
      return out;
    },
    size: function (id) {
      var w = wrapper(id);
      var el = w && w.firstElementChild;
      while (el && getComputedStyle(el).display === "contents") el = el.firstElementChild;
      return el ? { width: el.offsetWidth, height: el.offsetHeight } : null;
    },
    spacing: function (id) {
      var w = wrapper(id);
      var el = w && w.firstElementChild;
      while (el && getComputedStyle(el).display === "contents") el = el.firstElementChild;
      if (!el) return null;
      var cs = getComputedStyle(el), out = {};
      ["padding", "margin"].forEach(function (k) {
        ["Top", "Right", "Bottom", "Left"].forEach(function (s) { out[k + s] = Math.round(parseFloat(cs[k + s]) || 0); });
      });
      return out;
    },
    width: function () {
      var r = mount.firstElementChild;
      return r ? Math.ceil(r.getBoundingClientRect().width) : 0;
    },
    has: function (type) { return type === "Group" || type === "Shape" || !!NS[type]; },
    /* What each CSS value comes to in pixels here, in this frame's context,
       layout character and theme: a width-shaped probe inside the canvas
       root. A value that isn't a length gives null. */
    measure: function (values) {
      var where = mount.firstElementChild || document.body;
      /* One probe per value, all read in a single layout: a reused probe
         can keep a width it was given before. */
      var box = document.createElement("div");
      box.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
      var probes = values.map(function (v) {
        var p = document.createElement("div");
        p.style.cssText = "position:absolute;left:0;top:0;height:0";
        p.style.width = v;
        box.appendChild(p);
        return p.style.width ? p : null;
      });
      where.appendChild(box);
      var out = probes.map(function (p) { return p ? Math.round(p.getBoundingClientRect().width * 10) / 10 : null; });
      box.remove();
      return out;
    },
    /* What each colour token comes to here, in this frame's theme, so the
       builder's fixed chrome can show the configured colours. */
    colors: function (tokens) {
      var where = mount.firstElementChild || document.body;
      var probes = tokens.map(function (t) {
        var p = document.createElement("div");
        p.style.cssText = "position:absolute;width:0;height:0;visibility:hidden;pointer-events:none";
        p.style.backgroundColor = "var(" + t + ")";
        where.appendChild(p);
        return p;
      });
      var out = probes.map(function (p) { return getComputedStyle(p).backgroundColor; });
      probes.forEach(function (p) { p.remove(); });
      return out;
    },
    /* The large control size in pixels, which drawn shapes snap to. */
    unit: function () {
      var probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;width:var(--dt-size-control-lg)";
      document.body.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w || 48;
    },
    /* A component's starting props that are plain values, so the inspector
       can show what a control is set to before the reader touches it. */
    scalars: function (type) {
      var b = base(type), out = {};
      Object.keys(b).forEach(function (k) {
        var v = b[k];
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
      });
      return out;
    },
    hasStarter: function (type) { return !!((specs.samples && specs.samples[type]) || specs.build[type]); },
    /* How tall the content is, for a frame that hugs it. */
    height: function () {
      var r = mount.firstElementChild;
      return r ? Math.ceil(r.getBoundingClientRect().height) : 0;
    },
    /* Scrolls by (dx, dy) and returns how far it really went. */
    scrollBy: function (dx, dy) {
      var x = window.scrollX, y = window.scrollY;
      window.scrollBy(dx, dy);
      return { x: window.scrollX - x, y: window.scrollY - y };
    },
  };
  if (host()) host().ready();
})();
