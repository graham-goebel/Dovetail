/* The builder: a canvas to arrange Dovetail components and blocks into new
   screens, with an inspector that offers only tokens.

   This page owns the document, the selection, the history and every control.
   The canvas is an open surface that pans and zooms, with every frame laid
   out side by side. Each frame is a page of its own (assets/builder-frame.html),
   so a phone frame is really 390px wide; it renders its tree with the real
   components, answers geometry questions through window.BuilderFrame, and
   reports presses, drags, picks, gestures and double-clicks back through
   window.BuilderHost, bound to that frame. The frames share the docs site's
   origin, so the Configure panel's theme reaches them; this page's own chrome
   stays fixed (data-theme-fixed) so the tools look the same whatever is tried.

   What the builder may place, each component's props (read from its .d.ts),
   the frame sizes and the token options with the declarations each sets come
   from assets/builder-data.js, which the site build writes and checks: a token
   that doesn't exist fails the build.

   The document: { frames, active }. A frame is { id, name, width, height,
   hug, dark, surface, spacing, gap, mode, root } and maybe canvas, lock, x, y
   and bare. mode is "free" (place anything anywhere, custom colours) or
   "structured" (everything sits in Groups, tokens only); x and y put a frame
   anywhere on the canvas; a bare frame is a loose object with no page around
   it. root is { id: "root", type:
   "Root", children } and each node is { id, type, name?, props, style,
   children? }. props holds only what the reader changed, as plain strings,
   numbers and booleans (plus an uploaded image as a data URL); style holds
   token option names. Nothing else survives a save, a share link or an import
   (see clean()), so a link can't smuggle a value or a handler in. */

(function () {
  "use strict";

  var mountEl = document.getElementById("builder");
  var DATA = window.DovetailBuilderData;
  if (!mountEl || !DATA || !window.React || !window.ReactDOM) return;

  var e = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback, useMemo = React.useMemo;

  var STORE_KEY = "dovetail-builder";
  var BACKUP_KEY = "dovetail-builder-previous";
  var PREFS_KEY = "dovetail-builder-prefs";
  var PRESETS = DATA.frames;
  var PRESET = {};
  PRESETS.forEach(function (f) { PRESET[f.id] = f; });
  var PRESET_ICON = { phone: "phone", "phone-lg": "phone", tablet: "tablet", laptop: "desktop", desktop: "desktop", wide: "desktop", post: "image", square: "image", story: "phone" };
  var MIN_SIDE = 200, MAX_WIDTH = 3840, MAX_HEIGHT = 12000;
  /* A freeform canvas takes any size, down to a small swatch. */
  var MIN_FREE = 16;
  function minSide(f) { return f && f.mode === "structured" ? MIN_SIDE : MIN_FREE; }
  var SPACINGS = [["", "Page default"], ["tight", "Tight"], ["balanced", "Balanced"], ["open", "Open"]];
  var WRAPS = ["Group", "Stack", "Inline", "Grid", "Section", "Card"];
  /* The canvas: frames in a row this far apart, zoom between these. */
  var FRAME_GAP = 120, LABEL_ROOM = 28, STAGE_PAD = 32, MIN_ZOOM = 0.05, MAX_ZOOM = 4;
  var ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  var META = DATA.components;
  /* A slot: what a component holds in one of its element props (a hero's
     actions, its media), kept as nodes so each part can be picked. */
  META.Slot = { blurb: "A part of a component that holds other components", group: null, container: true, builder: true, href: null, props: [] };
  /* What a slot takes when the component's types don't say (@slot). */
  var SLOT_ACCEPTS = {
    actions: ["Button", "IconButton", "Link", "ButtonGroup", "Badge", "Tag", "Text", "Inline", "Stack", "Group"],
    media: ["Image", "Video", "Figure", "AspectRatio", "Cover", "Shape", "Avatar", "Inline", "Stack", "Group"],
  };
  function slotSpec(type, name) {
    var m = META[type];
    return m && !m.builder && name !== "trigger" ? m.props.filter(function (p) { return p.kind === "node" && p.name === name && !(p.accepts && p.accepts[0] === "none"); })[0] || null : null;
  }
  function slotTakes(type, name) { var p = slotSpec(type, name); return p ? p.accepts || SLOT_ACCEPTS[name] || null : null; }
  function slotAccepts(ownerType, name, childType) {
    if (!slotSpec(ownerType, name) || childType === "Slot") return false;
    var list = slotTakes(ownerType, name);
    return list ? list.indexOf(childType) >= 0 : !joinsFlow(childType);
  }
  function hasSlots(n) { return !!(n && n.children && n.children.some(function (c) { return c.type === "Slot"; })); }
  function nameOf(n) { return n.type === "Slot" ? words(n.props.name) : n.name || n.type; }
  var STYLE_KEYS = Object.keys(DATA.tokens);
  var TABS = [["appearance", "Appearance"], ["layout", "Layout"], ["content", "Content"]];
  /* The canvas tools, in a bar along the canvas's foot. Each draws one primitive where it's pressed, sized by
     the drag and snapped to the system's size steps. */
  /* Select and Hand stand alone; the rest are groups. Pressing a group opens
     its tray along the bar, and the group shows the last tool picked from it.
     "comp:Name" places that component. A tool marked soon isn't built yet. */
  var TOOLBAR = [
    { nav: true },
    null,
    { group: "layout", label: "Layout", items: [
      { id: "box", label: "Group", icon: "container", key: "B", hint: "A padded flex container" },
      { id: "comp:Section", label: "Section", icon: "layout", hint: "A band across the page" },
      { id: "frame", label: "Frame", icon: "frame", key: "F", hint: "A screen at a device size" },
      { id: "page", label: "Page", icon: "file", hint: "A frame that grows with its content" },
    ] },
    { group: "text", label: "Text", items: [
      { id: "comp:Text", label: "Text", icon: "type", key: "T", hint: "Body copy" },
      { id: "comp:Heading", label: "Heading", icon: "heading", hint: "A title" },
    ] },
    { group: "media", label: "Images and media", items: [
      { id: "comp:Image", label: "Image", icon: "image", key: "I" },
      { id: "comp:Video", label: "Video", icon: "video" },
      { id: "comp:Cover", label: "Cover", icon: "cover", hint: "Text over an image" },
      { id: "comp:Media", label: "Media", icon: "media", hint: "An image beside text" },
      { id: "comp:Figure", label: "Figure", icon: "figure", hint: "An image with a caption" },
      { id: "soon:icons", label: "Icons", icon: "star", soon: true },
      { id: "soon:illustrations", label: "Illustrations", icon: "squiggle", soon: true },
    ] },
  ];
  var TOOL_KEY = {}, TOOL_INFO = {};
  TOOL_INFO.select = { id: "select", label: "Select", icon: "pointer", key: "V" };
  TOOL_INFO.hand = { id: "hand", label: "Hand: drag to pan", icon: "hand", key: "H" };
  TOOL_KEY.v = "select";
  TOOL_KEY.h = "hand";
  TOOLBAR.forEach(function (t) {
    if (!t || t.nav) return;
    (t.items || [t]).forEach(function (it) {
      TOOL_INFO[it.id] = Object.assign({ group: t.group || null }, it);
      if (it.key) TOOL_KEY[it.key.toLowerCase()] = it.id;
    });
  });
  var TEXT_PROPS = ["children", "title", "label", "text", "name", "brand", "value"];
  /* Size families every layer may use; the rest (control, icon, avatar and
     media sizes) belong to the components they're named for, and only show
     when one of those is selected. */
  var SHARED_FAMILY = { fit: 1, container: 1, step: 1, inset: 1, space: 1, layout: 1 };
  /* A tone's colour, for its swatch: a surface for a fill, a text role for
     type. A tone with no colour of its own (inherit) has none. */
  var TONE_FILL = {
    base: "--dt-surface-base", subtle: "--dt-surface-subtle", raised: "--dt-surface-raised", sunken: "--dt-surface-sunken", neutral: "--dt-surface-sunken",
    brand: "--dt-surface-brand", "brand-muted": "--dt-surface-brand-muted", secondary: "--dt-surface-brand-secondary", "secondary-muted": "--dt-surface-brand-secondary-muted",
    "brand-secondary": "--dt-surface-brand-secondary", "brand-secondary-muted": "--dt-surface-brand-secondary-muted", primary: "--dt-surface-action",
    success: "--dt-surface-success", warning: "--dt-surface-warning", danger: "--dt-surface-danger", info: "--dt-surface-info",
    note: "--dt-surface-info", tip: "--dt-surface-success", important: "--dt-surface-brand", caution: "--dt-surface-warning",
  };
  var TONE_TEXT = {
    headline: "--dt-text-headline", primary: "--dt-text-primary", secondary: "--dt-text-secondary", tertiary: "--dt-text-tertiary", link: "--dt-text-link",
    brand: "--dt-text-brand", "brand-secondary": "--dt-text-brand-secondary", success: "--dt-text-success", warning: "--dt-text-warning", danger: "--dt-text-danger", info: "--dt-text-info",
  };
  /* Token families, and which suit what's selected, first. */
  var FAMILY_LABEL = {
    fit: "Resizing", control: "Controls", icon: "Icons", avatar: "Avatars", media: "Media", container: "Containers",
    step: "Steps of control-lg", inset: "Inset", space: "Stack and inline", layout: "Layout layers",
  };
  var CONTROL_TYPES = { Badge: 1, Tag: 1, Pagination: 1, QuantityStepper: 1, PromoCode: 1, FulfilmentToggle: 1, VariantPicker: 1, Rating: 1 };
  var MEDIA_TYPES = { Image: 1, Video: 1, Cover: 1, Media: 1, Figure: 1, AspectRatio: 1, ProductGallery: 1, SocialPost: 1 };
  var BAND_TYPES = { Group: 1, Section: 1, Stack: 1, Inline: 1, Grid: 1, Card: 1, Prose: 1 };
  var TEXT_TYPES = { Text: 1, Heading: 1, Quote: 1, Code: 1, Link: 1 };
  var PICTURE_TYPES = { Image: 1, Figure: 1, Cover: 1 };
  function contextOf(types) {
    var t = types.length && types.every(function (x) { return x === types[0]; }) ? types[0] : null;
    var m = t && META[t];
    var name = t ? t : "these items";
    if (t === "Avatar" || t === "AvatarGroup") return { name: name, size: ["avatar", "fit", "step"], space: ["inset"] };
    if (t === "Icon" || t === "IconButton") return { name: name, size: ["icon", "control", "fit", "step"], space: ["inset", "space"] };
    if (t === "Shape") return { name: name, size: ["step", "icon", "control"], space: ["inset", "space"] };
    if (t && (CONTROL_TYPES[t] || (m && (m.group === "actions" || m.group === "forms")))) return { name: name, size: ["control", "fit", "step"], space: ["inset", "space"] };
    if (t && MEDIA_TYPES[t]) return { name: name, size: ["media", "container", "fit", "step"], space: ["inset", "space"] };
    if (t && (BAND_TYPES[t] || (m && m.group === "blocks"))) return { name: name, size: ["fit", "container", "media", "step"], space: ["layout", "inset", "space"] };
    if (t && TEXT_TYPES[t]) return { name: name, size: ["fit", "container", "step"], space: ["inset", "space", "layout"] };
    return { name: name, size: ["fit", "container", "step", "control"], space: ["inset", "space", "layout"] };
  }
  /* The tab that suits a layer when it's selected: its words for text and
     media, its look for a shape, its layout for a container or a frame. */
  function smartTab(type) {
    if (type === "__frame" || type === "__mixed") return "layout";
    if (type === "Shape") return "appearance";
    if (type === "Group" || type === "Section" || type === "Stack" || type === "Inline" || type === "Grid") return "layout";
    return "content";
  }
  var MEDIA_URL = /^(https?:\/\/|data:(image|video)\/)/;
  var MEDIA_LIMIT = 1500000;

  /* The Content panel's library: images, illustrations and icons kept in this
     browser, to drag onto the canvas or pick for an image. */
  var LIB_KEY = "dovetail-builder-library";
  var LIB_KINDS = ["images", "illustrations", "icons", "video"];
  function loadLibrary() {
    var raw = storage(function (s) { return JSON.parse(s.getItem(LIB_KEY) || "null"); }) || {};
    var out = {};
    LIB_KINDS.forEach(function (k) {
      out[k] = (Array.isArray(raw[k]) ? raw[k] : []).filter(function (it) {
        return it && typeof it.id === "string" && typeof it.name === "string" && typeof it.src === "string" && (k === "video" ? /^data:video\//.test(it.src) : /^data:image\//.test(it.src));
      }).map(function (it) { return { id: it.id, name: it.name.slice(0, 80), src: it.src, original: typeof it.original === "string" && /^data:image\//.test(it.original) ? it.original : undefined }; });
    });
    /* Local components: layers kept to reuse, cleaned like anything else
       that comes in, with the tokens they're built on. */
    out.components = (Array.isArray(raw.components) ? raw.components : []).map(function (c) {
      if (!c || typeof c.id !== "string" || typeof c.name !== "string" || !c.node || typeof c.node !== "object") return null;
      var node = cleanNode(c.node, null);
      return node ? { id: c.id, name: c.name.slice(0, 60), node: node, tokens: Array.isArray(c.tokens) ? c.tokens.filter(function (t) { return typeof t === "string" && /^--dt-[\w-]+$/.test(t); }).slice(0, 300) : [], made: typeof c.made === "number" ? c.made : 0 } : null;
    }).filter(Boolean);
    return out;
  }
  /* A photo is scaled to fit 1600px and kept as JPEG unless it has
     transparency; an illustration fits 1200px as PNG; an SVG stays as drawn. */
  function readForLibrary(file, kind) {
    return new Promise(function (resolve, reject) {
      /* A clip is kept as it is, if it's small enough to stay in this browser. */
      if (kind === "video") {
        if (!/^video\//.test(file.type)) { reject(new Error(file.name + " isn't a video.")); return; }
        if (file.size > MEDIA_LIMIT) { reject(new Error(file.name + " is over 1.5 MB. Use a shorter or smaller clip, or a URL on a Video.")); return; }
        var vr = new FileReader();
        vr.onerror = function () { reject(new Error("Couldn't read " + file.name + ".")); };
        vr.onload = function () { resolve(String(vr.result)); };
        vr.readAsDataURL(file);
        return;
      }
      if (!/^image\//.test(file.type)) { reject(new Error(file.name + " isn't an image.")); return; }
      if (kind === "icons" && file.type !== "image/svg+xml") { reject(new Error("Icons are SVG files.")); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Couldn't read " + file.name + ".")); };
      reader.onload = function () {
        var url = String(reader.result);
        if (file.type === "image/svg+xml") {
          if (url.length > 400000) reject(new Error(file.name + " is too large for an icon or drawing."));
          else resolve(url);
          return;
        }
        var img = new Image();
        img.onerror = function () { reject(new Error("Couldn't open " + file.name + ".")); };
        img.onload = function () {
          var max = kind === "images" ? 1600 : 1200;
          var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.naturalWidth * k));
          c.height = Math.max(1, Math.round(img.naturalHeight * k));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          var png = kind !== "images" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
          resolve(png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86));
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }
  /* The background remover loads the first time it's asked for. */
  var BUILDER_SRC = (document.currentScript && document.currentScript.src) || "";
  var removerLoading = null;
  function remover() {
    if (window.DovetailRemoveBackground) return Promise.resolve(window.DovetailRemoveBackground);
    if (removerLoading) return removerLoading;
    removerLoading = new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = BUILDER_SRC ? BUILDER_SRC.replace(/builder\.js(\?.*)?$/, "remove-background.js") : "assets/remove-background.js";
      tag.onload = function () { if (window.DovetailRemoveBackground) resolve(window.DovetailRemoveBackground); else reject(new Error("The background remover didn't load.")); };
      tag.onerror = function () { removerLoading = null; reject(new Error("The background remover didn't load.")); };
      document.head.appendChild(tag);
    });
    return removerLoading;
  }

  /* The left panel's rail: what it shows, its short name, its tip, its icon. */
  var RAIL = [
    ["assets", "Assets", "Primitives, variables, components, blocks and templates", "plus"],
    ["layers", "Layers", "Everything in each frame", "blocks"],
    ["content", "Content", "Images, illustrations and icons", "folder"],
    ["configure", "Configure", "The system's brand, colour, type and layout", "sliders"],
  ];

  /* The system's text styles, largest first, for the inspector's Styles. */
  var TEXT_STYLES = [
    ["display-lg", "Display large"], ["display-md", "Display medium"], ["display-sm", "Display small"],
    ["heading-xl", "Heading XL"], ["heading-lg", "Heading large"], ["heading-md", "Heading medium"], ["heading-sm", "Heading small"], ["heading-xs", "Heading XS"],
    ["body-lg", "Body large"], ["body-md", "Body"], ["body-sm", "Body small"], ["label-md", "Label"], ["eyebrow", "Eyebrow"], ["code-md", "Code"],
  ];

  /* Each kind of layer's icon in Layers and the inspector; a kind with none
     of its own takes its category's. */
  var TYPE_ICON = {
    Slot: "slot", Group: "group", Stack: "column", Inline: "row", Grid: "gridView", Section: "layout", Card: "card", Divider: "minus", Shape: "square",
    Heading: "heading", Text: "type", Quote: "quote", Code: "code", Prose: "file", Link: "link",
    Image: "image", Video: "video", Cover: "cover", Media: "media", Figure: "figure", AspectRatio: "fit",
    Button: "cursor", IconButton: "cursor", ButtonGroup: "cursor",
    Avatar: "user", AvatarGroup: "user", Badge: "tag", Tag: "tag", Stat: "chart", Table: "table", List: "list", Accordion: "accordion",
    Alert: "megaphone", Banner: "megaphone", Callout: "megaphone", Progress: "chart", Spinner: "rotate", Thinking: "wand", Carousel: "rotate",
    Navbar: "nav", Tabs: "nav", Breadcrumbs: "nav", BottomNav: "nav", Sidebar: "panels", AppShell: "panels",
  };
  /* Carousel's dials as steps, rather than any number: the range that reads well. */
  var CAROUSEL_STEPS = {
    pace: [[0.5, "Slow"], [0.75, ""], [1, "Its own pace"], [1.5, ""], [2, "Fast"]],
    spread: [[0.6, "Tight"], [0.8, ""], [1, "Its own spread"], [1.2, ""], [1.4, "Wide"]],
    depth: [[0, "Flat"], [0.5, ""], [1, "Its own depth"], [1.5, "Deep"]],
    itemSize: [[0.75, "Smaller"], [1, "Its own size"], [1.25, ""], [1.5, "Larger"]],
  };
  /* A Carousel arrives with items to move: Covers waiting for a picture. */
  var CAROUSEL_ITEMS = [["Fern", "Spring"], ["Tide", "Summer"], ["Clay", "Autumn"], ["Ink", "Winter"], ["Moss", "All year"]];
  var GROUP_TYPE_ICON = { forms: "form", navigation: "nav", feedback: "bell", commerce: "bag", chat: "chat", blocks: "blocks", content: "file", display: "component", actions: "cursor" };

  /* Each category's icon in the assets panel. */
  var GROUP_ICON = {
    layout: "layout", typography: "type", actions: "pointer", forms: "form", display: "image", navigation: "compass",
    feedback: "bell", content: "file", commerce: "bag", chat: "chat", blocks: "blocks",
  };

  function storage(fn) { try { return fn(window.localStorage); } catch (err) { return null; } }
  function isContainer(type) { return type === "Root" || !!(META[type] && META[type].container); }
  function mql(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }

  /* ------------------------------------------------------------ the tree */

  var seq = 0;
  function uid() { seq++; return "n" + Date.now().toString(36).slice(-5) + seq.toString(36); }

  function make(type, props, children, style) {
    var n = { id: uid(), type: type, props: props || {}, style: style || {} };
    if (isContainer(type)) n.children = children || [];
    if (type === "Carousel" && !children) n.children = CAROUSEL_ITEMS.map(function (it) { return make("Cover", { ratio: "3:4", eyebrow: it[1], title: it[0], alt: it[0] + " collection" }); });
    return n;
  }

  function side(v, max, fallback, min) {
    var n = Math.round(Number(v));
    return isFinite(n) && n > 0 ? Math.max(min || MIN_SIDE, Math.min(max, n)) : fallback;
  }
  /* A frame is a size, from a preset or typed, and whether its height hugs
     what's in it. */
  function makeFrame(name, preset, hug) {
    var p = PRESET[preset] || PRESET.desktop;
    return { id: uid(), name: name || "Frame", width: p.width, height: p.height, hug: !!hug, dark: false, surface: "base", spacing: "", gap: "", mode: "free", root: { id: "root", type: "Root", props: {}, style: {}, children: [] } };
  }
  function presetOf(f) {
    var hit = PRESETS.filter(function (p) { return p.width === f.width && (f.hug || p.height === f.height); })[0];
    return hit ? hit.id : "";
  }
  function emptyDoc() {
    var f = makeFrame("Frame 1", "desktop");
    return { frames: [f], active: f.id };
  }
  function active(doc) { return doc.frames.filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0]; }
  function frameById(doc, fid) { return doc.frames.filter(function (f) { return f.id === fid; })[0] || null; }
  function copy(doc) { return JSON.parse(JSON.stringify(doc)); }

  /* A node in the active frame, or in the frame named. */
  function locate(doc, id, fid) {
    var frame = (fid && frameById(doc, fid)) || active(doc);
    if (id === "root") return { node: frame.root, parent: null, index: -1, path: [frame.root] };
    var out = null;
    (function walk(n, path) {
      (n.children || []).forEach(function (c, i) {
        if (out) return;
        if (c.id === id) out = { node: c, parent: n, index: i, path: path.concat([c]) };
        else if (c.children) walk(c, path.concat([c]));
      });
    })(frame.root, [frame.root]);
    return out;
  }

  function fresh(n) {
    var c = { id: uid(), type: n.type, props: Object.assign({}, n.props), style: Object.assign({}, n.style) };
    if (n.name) c.name = n.name;
    if (n.children) c.children = n.children.map(fresh);
    return c;
  }

  /* Whether a spot can take a node: a container, or a slot that takes its kind. */
  function canHold(p, child) {
    if (!p || !p.node.children || !child || child.type === "Slot") return false;
    if (p.node.type === "Slot") { var owner = p.path[p.path.length - 2]; return !!owner && slotAccepts(owner.type, p.node.props.name, child.type); }
    return p.node.type === "Root" || isContainer(p.node.type);
  }
  function parentSpot(at) { return { node: at.parent, path: at.path.slice(0, -1) }; }
  function fixedSpot(at) { return !at || !at.parent || at.node.type === "Slot"; }
  var fixed = fixedSpot;

  /* A structured frame keeps everything in Groups: something that isn't a
     band or a container, put straight on its page, comes in a Group of its
     own, and nothing in it is placed freely. */
  /* In a structured frame every Group lays out with flex as auto layout does:
     a direction, a gap and padding, from tokens, unless it has its own. */
  function autoLayout(n) {
    (function walk(x) {
      if (x.type === "Group") {
        if (!x.props.direction) x.props.direction = "column";
        if (!x.props.gap) x.props.gap = "md";
        if (!x.style.padding && !["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].some(function (k) { return x.style[k]; })) x.style.padding = "md";
      }
      (x.children || []).forEach(walk);
    })(n);
    return n;
  }
  function settle(frame, parentId, n) {
    if (!frame || frame.mode !== "structured") return n;
    (function unfree(x) { if (x.style) { delete x.style.x; delete x.style.y; } (x.children || []).forEach(unfree); })(n);
    autoLayout(n);
    if (parentId !== "root" || joinsFlow(n.type) || isContainer(n.type)) return n;
    return make("Group", { direction: "column", gap: "md" }, [n], { padding: "md" });
  }
  var ops = {
    insert: function (doc, parentId, index, n, fid) {
      var p = locate(doc, parentId, fid);
      if (!canHold(p, n)) return null;
      var put = settle((fid && frameById(doc, fid)) || active(doc), parentId, n);
      p.node.children.splice(Math.max(0, Math.min(index, p.node.children.length)), 0, put);
      return n.id;
    },
    move: function (doc, id, parentId, index) {
      if (id === "root" || id === parentId) return null;
      var from = locate(doc, id);
      var to = locate(doc, parentId);
      if (fixed(from) || !canHold(to, from.node)) return null;
      if (to.path.some(function (x) { return x.id === id; })) return null;
      if (from.parent === to.node && (index === from.index || index === from.index + 1)) return null;
      from.parent.children.splice(from.index, 1);
      if (from.parent === to.node && from.index < index) index--;
      to.node.children.splice(Math.max(0, Math.min(index, to.node.children.length)), 0, settle(active(doc), parentId, from.node));
      return id;
    },
    /* "root" means nothing left to select; null means nothing happened. */
    remove: function (doc, ids) {
      var next = null, any = false;
      [].concat(ids).forEach(function (id) {
        var at = locate(doc, id);
        if (fixed(at)) return;
        at.parent.children.splice(at.index, 1);
        any = true;
        var n = at.parent.children[at.index] || at.parent.children[at.index - 1];
        next = n ? n.id : at.parent.id;
      });
      return any ? next || "root" : null;
    },
    duplicate: function (doc, id) {
      var at = locate(doc, id);
      if (fixed(at)) return null;
      var c = fresh(at.node);
      at.parent.children.splice(at.index + 1, 0, c);
      return c.id;
    },
    replace: function (doc, id, n) {
      var at = locate(doc, id);
      if (fixed(at) || !canHold(parentSpot(at), n)) return null;
      at.parent.children.splice(at.index, 1, n);
      return n.id;
    },
    wrap: function (doc, id, type) {
      var at = locate(doc, id);
      if (fixed(at)) return null;
      var box = make(type, {}, [at.node]);
      if (!canHold(parentSpot(at), box)) return null;
      at.parent.children.splice(at.index, 1, box);
      return box.id;
    },
    /* Siblings into one Group, in their order, where the first one was. */
    group: function (doc, ids) {
      var spots = ids.map(function (id) { return locate(doc, id); }).filter(Boolean);
      if (!spots.length || spots.some(fixed)) return null;
      if (!canHold(parentSpot(spots[0]), { type: "Group" })) return null;
      var parent = spots[0].parent;
      if (!parent || spots.some(function (s) { return s.parent !== parent; })) return null;
      spots.sort(function (a, b) { return a.index - b.index; });
      var box = make("Group", {}, spots.map(function (s) { return s.node; }));
      var at = spots[0].index;
      parent.children = parent.children.filter(function (c) { return ids.indexOf(c.id) < 0; });
      parent.children.splice(at, 0, box);
      return box.id;
    },
    ungroup: function (doc, id) {
      var at = locate(doc, id);
      if (fixed(at) || !at.node.children || !isContainer(at.node.type)) return null;
      var kids = at.node.children;
      if (kids.some(function (k) { return !canHold(parentSpot(at), k); })) return null;
      at.parent.children.splice.apply(at.parent.children, [at.index, 1].concat(kids));
      return kids.length ? kids[0].id : at.parent.id;
    },
    nudge: function (doc, id, by) {
      var at = locate(doc, id);
      if (fixed(at)) return null;
      var to = at.index + by;
      if (to < 0 || to >= at.parent.children.length) return null;
      at.parent.children.splice(at.index, 1);
      at.parent.children.splice(to, 0, at.node);
      return id;
    },
  };

  /* Only what the inspector could have set survives a save, a share link or
     an import: known components, their own scalar props, an uploaded image or
     a URL where a media prop takes one, and option names from the token lists. */
  function tokenOption(key, v) {
    var def = DATA.tokens[key];
    return def ? def.options.filter(function (o) { return o.value === v; })[0] || null : null;
  }
  /* Each clean step can say what it left out, for a pasted layout or a link:
     report is an array of lines, or nothing. */
  function note(report, line) { if (report && report.indexOf(line) < 0) report.push(line); }
  /* A node placed freely on a frame's canvas: x and y in steps of the smallest
     inset. Anything inside a container stays in its flow. */
  var FREE_MAX = 1200;
  var HEX = /^#[0-9a-f]{6}$/i;
  function isFree(st) { return !!st && typeof st.x === "number" && typeof st.y === "number"; }
  /* Bands run the width of the page, so they always join its flow. */
  var BAND_ROOT = { Section: 1, AppShell: 1, Navbar: 1, Sidebar: 1, BottomNav: 1, Banner: 1, StoreHeader: 1 };
  function joinsFlow(type) { return !type || !!BAND_ROOT[type] || !!(META[type] && META[type].group === "blocks"); }
  /* A list prop: plain items with only the fields its type gives, each of
     the right kind; links that go somewhere safe; at most 60 items. */
  var SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:|\.{0,2}\/?[\w-][\w./?=&%#-]*$)/;
  function cleanList(spec, v) {
    if (!Array.isArray(v) || v.length > 60) return null;
    var out = [];
    for (var i = 0; i < v.length; i++) {
      var it = v[i];
      if (spec.of === "text") { if (typeof it !== "string" && typeof it !== "number") return null; out.push(String(it).slice(0, 2000)); continue; }
      if (!it || typeof it !== "object" || Array.isArray(it)) return null;
      var o = {};
      for (var j = 0; j < spec.fields.length; j++) {
        var f = spec.fields[j], val = it[f.name];
        if (val === undefined || val === null || val === "") { if (!f.optional && f.kind !== "boolean") o[f.name] = f.kind === "number" ? 0 : ""; continue; }
        if (f.kind === "number") { if (typeof val !== "number" || !isFinite(val)) return null; o[f.name] = val; }
        else if (f.kind === "boolean") { if (typeof val !== "boolean") return null; o[f.name] = val; }
        else if (f.kind === "enum") { if (f.options.indexOf(val) < 0) return null; o[f.name] = val; }
        else if (f.kind === "url") { if (typeof val !== "string" || !SAFE_HREF.test(val)) return null; o[f.name] = val; }
        else if (f.kind === "media") { if (typeof val !== "string" || !MEDIA_URL.test(val)) return null; o[f.name] = val; }
        else { if (typeof val !== "string" && typeof val !== "number") return null; o[f.name] = String(val).slice(0, 2000); }
      }
      if (Object.keys(it).some(function (k) { return !spec.fields.some(function (f) { return f.name === k; }); })) return null;
      out.push(o);
    }
    return out;
  }

  /* A slot, under the component it belongs to: only the kinds it takes. */
  function cleanSlot(c, owner, report) {
    var name = c.props.name;
    var kids = (Array.isArray(c.children) ? c.children : []).map(function (k) { return cleanNode(k, report); }).filter(Boolean).filter(function (k) {
      if (slotAccepts(owner, name, k.type)) return true;
      note(report, owner + ": " + name + " doesn't take " + k.type + ", so it was left out");
      return false;
    });
    return { id: typeof c.id === "string" && /^[\w-]{1,40}$/.test(c.id) ? c.id : uid(), type: "Slot", props: { name: name }, style: {}, children: kids };
  }
  function cleanNode(n, report) {
    if (!n || typeof n !== "object") return null;
    if (n.type === "Slot") { note(report, "A slot only lives inside the component it belongs to, so it was left out"); return null; }
    if (!META[n.type]) { note(report, (n.type ? "\"" + String(n.type).slice(0, 40) + "\"" : "A node with no type") + " isn't something the builder places, so it and anything inside it were left out"); return null; }
    var meta = META[n.type];
    var names = meta.props.map(function (p) { return p.name; });
    if (!meta.builder) names.push("children");
    if (n.type === "Grid") names.push("minColumnWidth");
    var props = {};
    var given = Object.assign({}, n.props || {});
    /* Text written straight into children, on something that holds no layers. */
    if (!isContainer(n.type) && !meta.builder && typeof n.children === "string" && given.children === undefined) given.children = n.children;
    Object.keys(given).forEach(function (k) {
      var v = given[k];
      if (names.indexOf(k) < 0) { note(report, n.type + ": " + k + " isn't a prop the builder sets"); return; }
      var spec = meta.props.filter(function (p) { return p.name === k; })[0];
      if (k === "minColumnWidth") { if (DATA.columnWidths.some(function (w) { return w.value === v; })) props[k] = v; else note(report, "Grid: minColumnWidth takes a multiple of --dt-size-control-lg, not " + JSON.stringify(v)); return; }
      if (spec && spec.kind === "media") { if (typeof v === "string" && MEDIA_URL.test(v)) props[k] = v; else note(report, n.type + ": " + k + " takes an https URL"); return; }
      if (spec && spec.kind === "list") { var lv = cleanList(spec, v); if (lv) props[k] = lv; else note(report, n.type + ": " + k + " takes a list of " + (spec.of === "text" ? "text" : "{ " + spec.fields.map(function (f) { return f.name; }).join(", ") + " }") + ", with nothing else in its items"); return; }
      if (spec && spec.kind === "enum" && spec.options.indexOf(v) < 0) { note(report, n.type + ": " + k + " " + JSON.stringify(v) + " isn't one of " + spec.options.join(", ")); return; }
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
      else note(report, n.type + ": " + k + " takes text, a number or true/false, not an element or object");
    });
    var style = {};
    /* Older layouts stored two-sided margins. */
    var st = Object.assign({}, n.style || {});
    if (st.marginY) { st.marginTop = st.marginTop || st.marginY; st.marginBottom = st.marginBottom || st.marginY; delete st.marginY; }
    if (st.marginX) { st.marginLeft = st.marginLeft || st.marginX; st.marginRight = st.marginRight || st.marginX; delete st.marginX; }
    var freeOk = function (v) { return typeof v === "number" && v === Math.round(v) && v >= 0 && v <= FREE_MAX; };
    if (st.x !== undefined || st.y !== undefined) {
      if (freeOk(st.x) && freeOk(st.y)) { style.x = st.x; style.y = st.y; }
      else note(report, n.type + ": x and y are whole steps of --dt-space-inset-2xs from 0 to " + FREE_MAX + ", not " + JSON.stringify([st.x, st.y]));
    }
    Object.keys(st).forEach(function (k) {
      if (k === "x" || k === "y") return;
      if (k === "dark") { if (st.dark === true) style.dark = true; return; }
      if (k === "fill" || k === "color") { if (HEX.test(String(st[k]))) style[k] = String(st[k]).toLowerCase(); else note(report, n.type + ": " + k + " takes a #rrggbb colour, not " + JSON.stringify(st[k])); return; }
      if (tokenOption(k, st[k])) style[k] = st[k];
      else if (DATA.tokens[k]) note(report, n.type + ": " + k + " " + JSON.stringify(st[k]) + " isn't a token option (" + DATA.tokens[k].options.map(function (o) { return o.value; }).join(", ") + ")");
      else note(report, n.type + ": style " + k + " isn't one the builder sets");
    });
    var out = { id: typeof n.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : uid(), type: n.type, props: props, style: style };
    /* A Group can be named by hand; a detached component keeps its old name
       on whatever container it became. */
    if (isContainer(n.type) && typeof n.name === "string" && n.name.trim()) out.name = n.name.trim().slice(0, 60);
    var seenSlot0 = {};
    var slotChild = function (c) {
      if (!c || c.type !== "Slot" || !c.props || !slotSpec(n.type, c.props.name) || seenSlot0[c.props.name]) return false;
      seenSlot0[c.props.name] = true;
      return true;
    };
    if (isContainer(n.type)) out.children = (Array.isArray(n.children) ? n.children : []).map(function (c) { return slotChild(c) ? cleanSlot(c, n.type, report) : cleanNode(c, report); }).filter(Boolean);
    else if (Array.isArray(n.children) && n.children.length) {
      var seenSlot = {};
      var slots = n.children.filter(function (c) {
        if (!c || c.type !== "Slot" || !c.props || !slotSpec(n.type, c.props.name) || seenSlot[c.props.name]) return false;
        seenSlot[c.props.name] = true;
        return true;
      });
      if (slots.length) out.children = slots.map(function (c) { return cleanSlot(c, n.type, report); });
      if (slots.length < n.children.length) note(report, n.type + " holds layers only in its slots (" + (META[n.type].props.filter(function (p) { return p.kind === "node" && p.name !== "children"; }).map(function (p) { return p.name; }).join(", ") || "none") + "), so what else was inside it was left out");
    }
    return out;
  }
  function cleanFrame(f, i, report) {
    var base = makeFrame("Frame " + (i + 1), "desktop");
    if (!f || typeof f !== "object") return base;
    if (typeof f.id === "string" && /^[\w-]{1,40}$/.test(f.id)) base.id = f.id;
    if (typeof f.name === "string" && f.name.trim()) base.name = f.name.trim().slice(0, 60);
    /* Older layouts named a preset ("size", or "viewport" before that) and
       showed the whole page, so they open hugging their content. */
    var legacy = PRESET[f.size || f.viewport];
    if (legacy && f.width === undefined) {
      base.width = legacy.width;
      base.height = legacy.height;
      base.hug = true;
    } else {
      var lo = f.mode === "structured" ? MIN_SIDE : MIN_FREE;
      base.width = side(f.width, MAX_WIDTH, base.width, lo);
      base.height = side(f.height, MAX_HEIGHT, base.height, lo);
      base.hug = f.hug === true;
      if (f.width !== undefined && base.width !== f.width) note(report, base.name + ": width " + JSON.stringify(f.width) + " became " + base.width + " (" + lo + " to " + MAX_WIDTH + ")");
      if (f.height !== undefined && base.height !== f.height) note(report, base.name + ": height " + JSON.stringify(f.height) + " became " + base.height + " (" + lo + " to " + MAX_HEIGHT + ")");
    }
    base.dark = f.dark === true;
    base.surface = tokenOption("surface", f.surface) ? f.surface : "base";
    if (f.surface !== undefined && base.surface !== f.surface) note(report, base.name + ": surface " + JSON.stringify(f.surface) + " isn't a token option, so it's base");
    /* The canvas may take one custom colour, as six-digit hex. */
    if (typeof f.canvas === "string" && /^#[0-9a-f]{6}$/i.test(f.canvas)) base.canvas = f.canvas.toLowerCase();
    else if (f.canvas !== undefined) note(report, base.name + ": canvas " + JSON.stringify(f.canvas) + " isn't a #rrggbb colour, so it was left out");
    base.mode = f.mode === "structured" ? "structured" : "free";
    if (f.lock === true) base.lock = true;
    var place = function (v) { return typeof v === "number" && isFinite(v) ? Math.max(-40000, Math.min(40000, Math.round(v))) : null; };
    if (place(f.x) !== null && place(f.y) !== null) { base.x = place(f.x); base.y = place(f.y); }
    if (f.bare === true) { base.bare = true; base.hug = true; }
    base.spacing = SPACINGS.some(function (s) { return s[0] === f.spacing; }) ? f.spacing : "";
    base.gap = DATA.rootGaps.indexOf(f.gap) >= 0 ? f.gap : "";
    if (f.typeScale === "social") base.typeScale = "social";
    /* A frame may give its nodes as root.children or straight as children. */
    var kids = f.root && Array.isArray(f.root.children) ? f.root.children : Array.isArray(f.children) ? f.children : [];
    base.root.children = kids.map(function (c) { return cleanNode(c, report); }).filter(Boolean);
    var seen = {};
    (function dedupe(n) { (n.children || []).forEach(function (c) { if (seen[c.id]) c.id = uid(); seen[c.id] = true; dedupe(c); }); })(base.root);
    return base;
  }
  function clean(doc, report) {
    if (!doc || typeof doc !== "object") return emptyDoc();
    /* A layout saved before frames existed is one frame. */
    var frames = Array.isArray(doc.frames) && doc.frames.length ? doc.frames : [Object.assign({}, doc.page || {}, { root: doc.root })];
    if (frames.length > 24) note(report, "Only the first 24 frames were kept");
    var out = { frames: frames.slice(0, 24).map(function (f, i) { return cleanFrame(f, i, report); }), active: null };
    var ids = {};
    out.frames.forEach(function (f) { if (ids[f.id]) f.id = uid(); ids[f.id] = true; });
    out.active = ids[doc.active] ? doc.active : out.frames[0].id;
    return out;
  }

  /* A pasted layout: a builder link, or JSON for a whole layout, one frame,
     one node or a list of nodes. Returns { doc, report } or { error }. */
  function readLayout(text) {
    var t = String(text || "").trim();
    if (!t) return null;
    var data = null;
    var m = /#b=([\w-]+)/.exec(t);
    if (m) {
      data = decode(m[1]);
      if (!data) return { error: "That link doesn't hold a layout the builder can read." };
    } else {
      try { data = JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch (err) { return { error: "That isn't JSON or a builder link. " + String(err.message || "").split("\n")[0] }; }
    }
    if (Array.isArray(data)) data = { frames: [{ name: "Pasted", hug: true, root: { children: data } }] };
    else if (data && typeof data === "object" && !Array.isArray(data.frames)) {
      if (data.type) data = { frames: [{ name: "Pasted", hug: true, root: { children: [data] } }] };
      else if (data.root || data.children) data = { frames: [data] };
    }
    if (!data || typeof data !== "object" || !Array.isArray(data.frames) || !data.frames.length) return { error: "No frames or nodes found. See the layout format for what the builder reads." };
    var report = [];
    var doc = clean(data, report);
    var layers = 0;
    doc.frames.forEach(function (f) { (function walk(n) { (n.children || []).forEach(function (c) { layers++; walk(c); }); })(f.root); });
    return { doc: doc, report: report, layers: layers };
  }

  /* ------------------------------------------------------------ starters */

  function one(name, preset, children, extra) {
    var f = makeFrame(name, preset, true);
    Object.assign(f, extra || {});
    f.root.children = children;
    return { frames: [f], active: f.id };
  }
  var STARTERS = [
    ["landing", "Landing page", function () {
      return one("Landing", "desktop", [
        make("HeroBlock"), make("FeatureGridBlock", { tone: "subtle" }), make("StatsBlock"),
        make("TestimonialBlock", { tone: "subtle" }), make("CtaBlock", { tone: "brand" }),
      ]);
    }],
    ["store", "Store page", function () {
      return one("Store", "desktop", [make("Navbar", { brand: "Kiln & Co." }), make("ProductGridBlock"), make("SplitBlock", { tone: "subtle" }), make("FaqBlock"), make("CtaBlock", { tone: "brand-muted" })]);
    }],
    ["settings", "Settings form", function () {
      return one("Settings", "desktop", [
        make("Section", { width: "narrow" }, [
          make("Stack", { layer: "block" }, [
            make("Heading", { children: "Workspace settings" }),
            make("Card", { eyebrow: "", title: "Profile", description: "How the workspace appears to its members." }, [
              make("Stack", { layer: "group" }, [make("Input"), make("Select"), make("Switch"), make("Checkbox")]),
            ]),
            make("Group", { justify: "flex-end", gap: "sm" }, [make("Button", { variant: "secondary", children: "Cancel" }), make("Button", { children: "Save changes" })]),
          ]),
        ]),
      ], { surface: "subtle" });
    }],
    ["chat", "Support chat (phone)", function () {
      return one("Support chat", "phone", [make("Stack", { gap: "md" }, [make("ChatBlock")], { padding: "md" })], { surface: "subtle", hug: false });
    }],
    ["blank", "Blank frame", function () { return emptyDoc(); }],
  ];

  /* ---------------------------------------------------- share and storage */

  function encode(doc) {
    var bytes = new TextEncoder().encode(JSON.stringify(doc));
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(s) {
    try {
      var bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (err) { return null; }
  }
  /* Uploaded files are too big for a link; they stay in this browser. */
  function withoutUploads(doc) {
    var d = copy(doc), dropped = 0;
    (function walk(n) {
      Object.keys(n.props || {}).forEach(function (k) { if (typeof n.props[k] === "string" && /^data:/.test(n.props[k])) { delete n.props[k]; dropped++; } });
      (n.children || []).forEach(walk);
    })({ children: d.frames.map(function (f) { return f.root; }) });
    return { doc: d, dropped: dropped };
  }

  /* A share link: #b= the layout, then maybe &f= the frame and &n= the
     layer it opens on. */
  function initialDoc() {
    var m = /^#b=([\w-]+)((?:&[fn]=[\w-]{1,40})*)$/.exec(location.hash);
    if (m) {
      var shared = decode(m[1]);
      if (shared) {
        var dropped = [];
        var d = clean(shared, dropped);
        var f = /&f=([\w-]+)/.exec(m[2]), n = /&n=([\w-]+)/.exec(m[2]);
        if (f && frameById(d, f[1])) d.active = f[1];
        return { doc: d, from: "link", dropped: dropped, focus: n ? n[1] : null };
      }
    }
    var saved = storage(function (s) { return s.getItem(STORE_KEY); });
    if (saved) {
      try { return { doc: clean(JSON.parse(saved)), from: "saved" }; } catch (err) { /* fall through */ }
    }
    var first = STARTERS[0][2]();
    if (mql("(max-width: 900px)")) first.frames[0].width = PRESET.phone.width;
    return { doc: first, from: "starter" };
  }

  function loadPrefs() {
    var p = storage(function (s) { return JSON.parse(s.getItem(PREFS_KEY) || "null"); }) || {};
    return {
      category: DATA.groups.some(function (g) { return g.id === p.category; }) ? p.category : DATA.groups[0].id,
      kind: ["primitives", "variables", "components", "blocks", "templates"].indexOf(p.kind) >= 0 ? p.kind : null,
      view: p.view === "list" ? "list" : "grid",
      tabs: p.tabs && typeof p.tabs === "object" ? p.tabs : {},
      closed: p.closed && typeof p.closed === "object" ? p.closed : {},
      stage: typeof p.stage === "string" && /^#[0-9a-f]{6}$/i.test(p.stage) ? p.stage.toLowerCase() : "",
    };
  }

  /* The site's copy helper (assets/site.js) falls back to a hidden textarea
     where the clipboard API isn't allowed. */
  function copyText(text) {
    return new Promise(function (resolve, reject) {
      if (window.DovetailCopy && window.DovetailCopy.write) {
        window.DovetailCopy.write(text, function (ok) { (ok ? resolve : reject)(); });
      } else if (navigator.clipboard) navigator.clipboard.writeText(text).then(resolve, reject);
      else reject(new Error("no clipboard"));
    });
  }

  /* An insertion line is a box with no height or no width; give it some. */
  function thick(r) {
    if (!r) return r;
    if (r.height < 1) return { left: r.left, top: r.top - 1.5, width: r.width, height: 3 };
    if (r.width < 1) return { left: r.left - 1.5, top: r.top, width: 3, height: r.height };
    return r;
  }

  /* --------------------------------------------------------------- icons */

  var PATHS = {
    undo: ["M9 14 4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
    redo: ["m15 14 5-5-5-5", "M20 9H9a5 5 0 0 0 0 10h3"],
    down: ["m6 9 6 6 6-6"],
    up: ["m6 15 6-6 6 6"],
    left: ["m15 6-6 6 6 6"],
    chain: ["M9 15 15 9", "M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5", "M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5"],
    layers2: ["m12 4 8 4-8 4-8-4z", "m4 12 8 4 8-4", "m4 16 8 4 8-4"],
    collapseAll: ["m7 9 5-5 5 5", "m7 15 5 5 5-5"],
    expandAll: ["m7 4 5 5 5-5", "m7 20 5-5 5 5"],
    right: ["m9 6 6 6-6 6"],
    copy: ["M8 8h12v12H8z", "M16 8V4H4v12h4"],
    trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
    code: ["m8 8-4 4 4 4", "M16 8l4 4-4 4"],
    link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
    eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    plus: ["M12 5v14", "M5 12h14"],
    close: ["M6 6l12 12", "M18 6 6 18"],
    search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"],
    check: ["m5 12 5 5 9-10"],
    alert: ["M12 8v5", "M12 16h.01", "M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
    phone: ["M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M11 18h2"],
    tablet: ["M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M11 18h2"],
    desktop: ["M3 4h18v12H3z", "M8 20h8", "M12 16v4"],
    sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "M4.9 4.9l1.4 1.4", "M17.7 17.7l1.4 1.4", "M2 12h2", "M20 12h2", "M4.9 19.1l1.4-1.4", "M17.7 6.3l1.4-1.4"],
    moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
    gridView: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
    listView: ["M4 6h3", "M10 6h10", "M4 12h3", "M10 12h10", "M4 18h3", "M10 18h10"],
    box: ["M4 5h16v14H4z"],
    component: ["M12 3 21 12l-9 9-9-9z"],
    group: ["M3 7V4h3", "M18 4h3v3", "M21 17v3h-3", "M6 20H3v-3", "M7 9h4v6H7z", "M13 9h4v6h-4z"],
    wrap: ["M4 4h16v16H4z", "M8 8h8v8H8z"],
    detach: ["M9 4H4v5", "M15 4h5v5", "M20 15v5h-5", "M4 15v5h5", "m10 10 4 4", "m14 10-4 4"],
    frame: ["M6 3v18", "M18 3v18", "M3 6h18", "M3 18h18"],
    more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
    zoomIn: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5", "M11 8v6", "M8 11h6"],
    sides: ["M4 4h16v16H4z", "M4 9h16", "M4 15h16", "M9 4v16", "M15 4v16"],
    upload: ["M12 16V4", "m7 9 5-5 5 5", "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"],
    pencil: ["M4 20h4l10.5-10.5a2 2 0 0 0-4-4L4 16z", "m13 7 4 4"],
    layout: ["M4 4h16v16H4z", "M4 10h16", "M10 10v10"],
    type: ["M5 6V4h14v2", "M12 4v16", "M9 20h6"],
    pointer: ["M5 3l14 7-6 2-2 6z"],
    form: ["M4 6h16v5H4z", "M4 15h4v4H4z", "M11 17h9"],
    image: ["M4 4h16v16H4z", "M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "m20 15-5-5-11 10"],
    compass: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m15.5 8.5-2 5-5 2 2-5z"],
    bell: ["M6 16V11a6 6 0 0 1 12 0v5l2 2H4z", "M10 20a2 2 0 0 0 4 0"],
    file: ["M6 3h9l4 4v14H6z", "M14 3v5h5", "M9 13h7", "M9 17h5"],
    bag: ["M5 8h14l-1 12H6z", "M9 8V6a3 3 0 0 1 6 0v2"],
    chat: ["M4 5h16v11H9l-5 4z"],
    blocks: ["M4 4h16v6H4z", "M4 14h16v6H4z"],
    alignStart: ["M4 4v16", "M8 7h10v4H8z", "M8 13h6v4H8z"],
    alignCenter: ["M12 4v16", "M7 7h10v4H7z", "M9 13h6v4H9z"],
    alignEnd: ["M20 4v16", "M6 7h10v4H6z", "M10 13h6v4h-6z"],
    alignStretch: ["M4 4v16", "M20 4v16", "M7 7h10v4H7z", "M7 13h10v4H7z"],
    justifyStart: ["M4 4v16", "M7 8h4v8H7z", "M13 8h4v8h-4z"],
    justifyCenter: ["M12 4v16", "M5 8h4v8H5z", "M15 8h4v8h-4z"],
    justifyEnd: ["M20 4v16", "M7 8h4v8H7z", "M13 8h4v8h-4z"],
    justifyBetween: ["M4 4v16", "M20 4v16", "M6 8h4v8H6z", "M14 8h4v8h-4z"],
    row: ["M4 8h5v8H4z", "M10 8h5v8h-5z", "M16 8h4v8h-4z"],
    column: ["M8 4h8v5H8z", "M8 10h8v5H8z", "M8 16h8v4H8z"],
    panels: ["M3 4h18v16H3z", "M9 4v16", "M15 4v16"],
    hand: ["M8 13V5.5a1.5 1.5 0 0 1 3 0V12", "M11 11V4.5a1.5 1.5 0 0 1 3 0V12", "M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 13.6a1.5 1.5 0 0 1 2.4-1.8L8 14"],
    square: ["M5 5h14v14H5z"],
    circle: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"],
    container: ["M4 4h16v16H4z", "M8 8h8", "M8 12h8", "M8 16h5"],
    wrapLines: ["M4 6h16", "M4 12h13a3 3 0 0 1 0 6h-4", "m15 16-2 2 2 2", "M4 18h5"],
    plusSm: ["M12 7v10", "M7 12h10"],
    minus: ["M6 12h12"],
    heading: ["M6 4v16", "M18 4v16", "M6 12h12"],
    video: ["M3 6h13v12H3z", "m16 10 5-3v10l-5-3"],
    cover: ["M3 4h18v16H3z", "M7 14h10", "M9 17h6"],
    media: ["M3 5h8v8H3z", "M14 6h7", "M14 10h5", "M3 17h18"],
    figure: ["M4 3h16v13H4z", "M8 20h8"],
    star: ["M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.1l5.8-.8z"],
    squiggle: ["M3 17c2.5-6 5-9 7.5-9s2.5 6 5 6 3.5-3 5.5-5", "M4 6h.01"],
    fit: ["M4 9V4h5", "M15 4h5v5", "M20 15v5h-5", "M9 20H4v-5"],
    rotate: ["M4 12a8 8 0 0 1 14-5.3L20 9", "M20 4v5h-5", "M20 12a8 8 0 0 1-14 5.3L4 15", "M4 20v-5h5"],
    sliders: ["M5 21v-6", "M5 11V3", "M12 21v-9", "M12 8V3", "M19 21v-4", "M19 13V3", "M2.5 15h5", "M9.5 8h5", "M16.5 17h5"],
    folder: ["M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"],
    play: ["M7 4.5v15l12-7.5z"],
    wand: ["M4 20 15 9", "M14 4v3", "M19 9h-3", "M17.5 5.5l-2 2", "M19 14v2", "M20 15h-2", "M8 3v2", "M9 4H7"],
    pipette: ["m3 21 1.5-1.5h2.5l8-8", "M4.5 19.5V17l8-8", "m14.5 6.5 2.8-2.8a2.1 2.1 0 1 1 3 3l-2.8 2.8", "m12 5 7 7"],
    exportOut: ["M12 15V3", "m7 8 5-5 5 5", "M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"],
    variable: ["M8 4c-2 2.5-3 5-3 8s1 5.5 3 8", "M16 4c2 2.5 3 5 3 8s-1 5.5-3 8", "m9.5 9 5 6", "m14.5 9-5 6"],
    shapes: ["M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M13 13h8v8h-8z", "M7 14l4 7H3z"],
    card: ["M4 5h16v14H4z", "M4 10h16", "M7 14h6"],
  };
  /* Heroicons outline, 24px, drawn at stroke 1.5 (MIT, Copyright (c) Tailwind Labs, Inc.;
     see assets/vendor/heroicons-LICENSE.txt). The builder's own drawings
     above fill the gaps: alignment, rows and columns, shapes and type. */
  var HERO = {
    undo: ["M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"],
    redo: ["m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"],
    down: ["m19.5 8.25-7.5 7.5-7.5-7.5"],
    up: ["m4.5 15.75 7.5-7.5 7.5 7.5"],
    left: ["M15.75 19.5 8.25 12l7.5-7.5"],
    right: ["m8.25 4.5 7.5 7.5-7.5 7.5"],
    chain: ["M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"],
    layers2: ["M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"],
    copy: ["M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"],
    trash: ["m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"],
    code: ["M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"],
    link: ["M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"],
    eye: ["M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z","M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],
    plus: ["M12 4.5v15m7.5-7.5h-15"],
    close: ["M6 18 18 6M6 6l12 12"],
    search: ["m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"],
    check: ["m4.5 12.75 6 6 9-13.5"],
    alert: ["M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"],
    phone: ["M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"],
    tablet: ["M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z"],
    desktop: ["M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"],
    sun: ["M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"],
    moon: ["M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"],
    gridView: ["M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"],
    listView: ["M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"],
    component: ["m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"],
    group: ["M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"],
    wrap: ["M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6"],
    detach: ["m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664"],
    more: ["M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"],
    zoomIn: ["m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"],
    upload: ["M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"],
    pencil: ["m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"],
    layout: ["M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6ZM7.5 6h.008v.008H7.5V6Zm2.25 0h.008v.008H9.75V6Z"],
    form: ["m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"],
    image: ["m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"],
    compass: ["M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"],
    bell: ["M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"],
    file: ["M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"],
    bag: ["M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"],
    chat: ["M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"],
    blocks: ["M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"],
    hand: ["M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002"],
    minus: ["M5 12h14"],
    heading: ["M2.243 4.493v7.5m0 0v7.502m0-7.501h10.5m0-7.5v7.5m0 0v7.501m4.501-8.627 2.25-1.5v10.126m0 0h-2.25m2.25 0h2.25"],
    video: ["m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"],
    star: ["M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"],
    fit: ["M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"],
    rotate: ["M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"],
    sliders: ["M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"],
    folder: ["M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"],
    play: ["M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"],
    wand: ["M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"],
    pipette: ["m15 11.25 1.5 1.5.75-.75V8.758l2.276-.61a3 3 0 1 0-3.675-3.675l-.61 2.277H12l-.75.75 1.5 1.5M15 11.25l-8.47 8.47c-.34.34-.8.53-1.28.53s-.94.19-1.28.53l-.97.97-.75-.75.97-.97c.34-.34.53-.8.53-1.28s.19-.94.53-1.28L12.75 9M15 11.25 12.75 9"],
    exportOut: ["M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"],
    variable: ["M4.745 3A23.933 23.933 0 0 0 3 12c0 3.183.62 6.22 1.745 9M19.5 3c.967 2.78 1.5 5.817 1.5 9s-.533 6.22-1.5 9M8.25 8.885l1.444-.89a.75.75 0 0 1 1.105.402l2.402 7.206a.75.75 0 0 0 1.104.401l1.445-.889m-8.25.75.213.09a1.687 1.687 0 0 0 2.062-.617l4.45-6.676a1.688 1.688 0 0 1 2.062-.618l.213.09"],
    panels: ["M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"],
    cursor: ["M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5"],
    list: ["M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"],
    table: ["M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"],
    nav: ["M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"],
    user: ["M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"],
    tag: ["M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z","M6 6h.008v.008H6V6Z"],
    chart: ["M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"],
    quote: ["M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"],
    megaphone: ["M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"],
    accordion: ["M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"],
    slot: ["M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"],
    swatch: ["M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"],
    brush: ["M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"],
    shapes: ["m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25"],
  };
  Object.keys(HERO).forEach(function (k) { PATHS[k] = HERO[k]; });
  function Icon(props) {
    return e("svg", { className: cx("bd-ic", props.className), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" },
      (PATHS[props.name] || PATHS.box).map(function (d, i) { return e("path", { key: i, d: d }); }));
  }

  var ENUM_ICONS = {
    align: { "flex-start": "alignStart", center: "alignCenter", "flex-end": "alignEnd", stretch: "alignStretch", start: "alignStart", end: "alignEnd" },
    justify: { "flex-start": "justifyStart", center: "justifyCenter", "flex-end": "justifyEnd", "space-between": "justifyBetween" },
    direction: { row: "row", column: "column" },
    orientation: { horizontal: "row", vertical: "column" },
  };
  var ENUM_LABEL = { "flex-start": "Start", "flex-end": "End", "space-between": "Space between", center: "Center", stretch: "Stretch", row: "Row", column: "Column" };
  /* A component's own prop that would read like one of the Size controls. */
  var PROP_LABEL = { width: "Content width", spacing: "Section spacing" };
  function words(name) { return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, function (c) { return c.toUpperCase(); }); }

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
      var w = r ? r.w : f.bare ? Math.max(24, (widths && widths[f.id]) || 120) : f.width;
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

  /* ------------------------------------------------------------ the app */

  function App() {
    var init = useMemo(initialDoc, []);
    var prefs = useMemo(loadPrefs, []);
    var docState = useState(init.doc);
    var doc = docState[0], setDoc = docState[1];
    var selState = useState([]);
    var selection = selState[0], setSelection = selState[1];
    /* A component's own part being changed, like a block's title: { id, part }. */
    var partState = useState(null);
    var part = partState[0], setPart = partState[1];
    var partRef = useRef(part); partRef.current = part;
    var hoverState = useState(null);
    var hover = hoverState[0], setHover = hoverState[1];
    var leftState = useState(prefs.left === "layers" || prefs.left === "content" || prefs.left === "configure" ? prefs.left : "assets");
    var left = leftState[0], setLeft = leftState[1];
    var paneState = useState("canvas");
    var pane = paneState[0], setPane = paneState[1];
    var previewState = useState(false);
    var preview = previewState[0], setPreview = previewState[1];
    var bareState = useState(false);
    var bare = bareState[0], setBare = bareState[1];
    var queryState = useState("");
    var query = queryState[0], setQuery = queryState[1];
    var layerQueryState = useState("");
    var layerQuery = layerQueryState[0], setLayerQuery = layerQueryState[1];
    var contentQueryState = useState("");
    var contentQuery = contentQueryState[0], setContentQuery = contentQueryState[1];
    var categoryState = useState(prefs.category);
    var category = categoryState[0], setCategory = categoryState[1];
    var assetKindState = useState(prefs.kind);
    var assetKind = assetKindState[0], setAssetKind = assetKindState[1];
    var viewState = useState(prefs.view);
    var view = viewState[0], setView = viewState[1];
    var tabsState = useState(prefs.tabs);
    var tabByType = tabsState[0], setTabByType = tabsState[1];
    var pxState = useState({});
    var pxMap = pxState[0], setPxMap = pxState[1];
    var tintState = useState({});
    var tints = tintState[0], setTints = tintState[1];
    var themeStampState = useState(0);
    var themeStamp = themeStampState[0], setThemeStamp = themeStampState[1];
    var closedState = useState(prefs.closed);
    var closedSecs = closedState[0], setClosedSecs = closedState[1];
    var toolState = useState("select");
    var tool = toolState[0], setToolState = toolState[1];
    var trayState = useState(null);
    var tray = trayState[0], setTrayOpen = trayState[1];
    /* The tray keeps its last group's tools while it closes, so it can
       animate away rather than vanish. */
    var trayShownState = useState(null);
    var trayShown = trayShownState[0], setTrayShown = trayShownState[1];
    var setTray = function (g) { setTrayOpen(g); if (g) setTrayShown(g); };
    var lastState = useState({});
    var lastTool = lastState[0], setLastTool = lastState[1];
    var pickToolRef = useRef(null);
    /* Picking a tool closes its tray and makes it its group's face. */
    var setTool = function (id) {
      setToolState(id);
      setTray(null);
      var info = TOOL_INFO[id];
      if (info && info.group) setLastTool(function (l) { var n = Object.assign({}, l); n[info.group] = id; return n; });
    };
    var collapsedState = useState({});
    var collapsed = collapsedState[0], setCollapsed = collapsedState[1];
    var readyState = useState({});
    var ready = readyState[0], setReady = readyState[1];
    var placeableState = useState(null);
    var placeable = placeableState[0], setPlaceable = placeableState[1];
    var scalarsState = useState({});
    var scalars = scalarsState[0], setScalars = scalarsState[1];
    var detachableState = useState({});
    var detachable = detachableState[0], setDetachable = detachableState[1];
    var importState = useState("");
    var importText = importState[0], setImportText = importState[1];
    var codeState = useState("");
    var code = codeState[0], setCode = codeState[1];
    var sayState = useState("");
    var say = sayState[0], setSay = sayState[1];
    var savedState = useState({ ok: true, at: null });
    var saved = savedState[0], setSaved = savedState[1];
    var boxState = useState({ w: 0, h: 0 });
    var box = boxState[0], setBox = boxState[1];
    var camState = useState(null);
    var cam = camState[0] || { x: STAGE_PAD, y: STAGE_PAD + LABEL_ROOM, z: 1 };
    var setCamState = camState[1];
    var heightsState = useState({});
    var heights = heightsState[0], setHeights = heightsState[1];
    var dragState = useState(null);
    var drag = dragState[0], setDrag = dragState[1];
    var marksState = useState({ sel: [], hover: null, drop: null });
    var marks = marksState[0], setMarks = marksState[1];
    var listDropState = useState(null);
    var listDrop = listDropState[0], setListDrop = listDropState[1];
    var editState = useState(null);
    var edit = editState[0], setEdit = editState[1];
    var wideState = useState(function () { return mql("(min-width: 901px)"); });
    var wide = wideState[0], setWide = wideState[1];
    var sidesState = useState({});
    var sidesOpen = sidesState[0], setSidesOpen = sidesState[1];
    /* What is being renamed, and where: { id, where }. */
    var renameState = useState(null);
    var renaming = renameState[0], setRenaming = renameState[1];
    var spaceState = useState(false);
    var space = spaceState[0], setSpace = spaceState[1];
    var panningState = useState(false);
    var panning = panningState[0], setPanning = panningState[1];

    var frame = active(doc);
    var sel = selection.length ? selection[selection.length - 1] : null;
    var resizeState = useState(null);
    var resizing = resizeState[0], setResizing = resizeState[1];
    var shiftState = useState(false);
    var shiftHeld = shiftState[0], setShiftHeld = shiftState[1];
    var spacingState = useState(null);
    var spacing = spacingState[0], setSpacing = spacingState[1];
    var focusSecState = useState(null);
    var focusSec = focusSecState[0], setFocusSec = focusSecState[1];
    var playState = useState(null);
    var play = playState[0], setPlay = playState[1];
    var playBoxState = useState({ w: 0, h: 0 });
    var playBox = playBoxState[0], setPlayBox = playBoxState[1];
    var playRef = useRef(null), playFrameRef = useRef(null), playStageRef = useRef(null);
    var widthsState = useState({});
    var widths = widthsState[0], setWidths = widthsState[1];
    var movingState = useState(null);
    var movingFrame = movingState[0], setMovingFrame = movingState[1];
    /* Where a copy of a frame would land, while it's Cmd-Shift-dragged. */
    var dupState = useState(null);
    var dupFrame = dupState[0], setDupFrame = dupState[1];
    /* Nothing picked at all, not even a frame: the inspector shows the
       builder's own settings. */
    var frameOnState = useState(true);
    var frameOn = frameOnState[0], setFrameOn = frameOnState[1];
    var frameOnRef = useRef(frameOn); frameOnRef.current = frameOn;
    var stageColorState = useState(prefs.stage || "");
    var stageColor = stageColorState[0], setStageColor = stageColorState[1];
    var openFramesState = useState({});
    var openFrames = openFramesState[0], setOpenFrames = openFramesState[1];
    var codeTitleState = useState("");
    var codeTitle = codeTitleState[0], setCodeTitle = codeTitleState[1];
    var newRef = useRef(null);
    var newBtnRef = useRef(null);
    var newOpenState = useState(null);
    var newOpen = newOpenState[0], setNewOpen = newOpenState[1];
    var newOpenRef = useRef(null); newOpenRef.current = newOpen;
    var clip = useRef(null);
    var layout = layoutOf(doc, heights, resizing, widths, movingFrame);
    var boxes = layout.boxes;

    var history = useRef({ past: [], future: [] });
    var docRef = useRef(doc); docRef.current = doc;
    var selRef = useRef(selection); selRef.current = selection;
    var camRef = useRef(cam); camRef.current = cam;
    var layoutRef = useRef(layout); layoutRef.current = layout;
    var boxRef = useRef(box); boxRef.current = box;
    var heightsRef = useRef(heights); heightsRef.current = heights;
    var widthsRef = useRef(widths); widthsRef.current = widths;
    var hoverRef = useRef(hover); hoverRef.current = hover;
    var editRef = useRef(edit); editRef.current = edit;
    var previewRef = useRef(preview); previewRef.current = preview;
    var spaceRef = useRef(false);
    var frameEls = useRef({});
    var rendered = useRef({});
    var grows = useRef({});
    var stageRef = useRef(null);
    var dialogRef = useRef(null);
    var importRef = useRef(null);
    var rightRef = useRef(null);
    var leftPanelRef = useRef(null);
    var hidePanelsRef = useRef(false);
    var slotTpl = useRef({});
    var dockRef = useRef(null);

    /* Configure lives in the left panel on this page, not over it. */
    useEffect(function () {
      document.documentElement.classList.add("bd-configure-docked");
      return function () { document.documentElement.classList.remove("bd-configure-docked"); };
    }, []);
    var libState = useState(loadLibrary);
    var library = libState[0], setLibrary = libState[1];
    var libTabState = useState(null);
    var libTab = libTabState[0], setLibTab = libTabState[1];
    var libBusyState = useState(null);
    var libBusy = libBusyState[0], setLibBusy = libBusyState[1];
    var libFirst = useRef(true);
    useEffect(function () {
      if (libFirst.current) { libFirst.current = false; return; }
      var ok = storage(function (s) { s.setItem(LIB_KEY, JSON.stringify(library)); return true; });
      if (!ok) announce("This browser is out of room for content. Remove something, or use smaller files.");
    }, [library]);
    var docked = left === "configure" && !(wide && (bare || preview)) && (wide || pane === "add");
    useEffect(function () {
      if (!docked) return undefined;
      var tryDock = function () { var P = window.DovetailConfigurePanel; if (P && P.dock && dockRef.current) P.dock(dockRef.current); };
      tryDock();
      window.addEventListener("dovetail:configure-ready", tryDock);
      return function () {
        window.removeEventListener("dovetail:configure-ready", tryDock);
        var P = window.DovetailConfigurePanel;
        if (P && P.undock) P.undock();
      };
    }, [docked]);
    var layersRef = useRef(null);
    var dragRef = useRef(null);
    var justDragged = useRef(false);
    var gest = useRef({ pts: {}, moved: false, start: null, pinch: null, fid: null });

    var api = function (fid) {
      var el = frameEls.current[fid || docRef.current.active];
      try { return el && el.contentWindow && el.contentWindow.BuilderFrame; } catch (err) { return null; }
    };

    var announce = useCallback(function (text) { setSay(""); setTimeout(function () { setSay(text); }, 30); }, []);
    var select = useCallback(function (ids) {
      var next = ids.filter(function (x) { return x && x !== "root"; });
      selRef.current = next;
      setSelection(next);
      setPart(function (p) { return p && next.length === 1 && next[0] === p.id ? p : null; });
      if (next.length) setFrameOn(true);
    }, []);

    var snapshot = useCallback(function () {
      history.current.past.push(JSON.stringify(docRef.current));
      if (history.current.past.length > 100) history.current.past.shift();
      history.current.future = [];
    }, []);
    var commit = useCallback(function (next, nextSel, message) {
      snapshot();
      docRef.current = next;
      setDoc(next);
      if (nextSel !== undefined) select(nextSel === null || nextSel === "root" ? [] : [].concat(nextSel));
      if (message) announce(message);
    }, [announce, select, snapshot]);

    /* A change that isn't an edit (filling a component's slots from its
       sample): no history step, no message. */
    var quiet = function (fn) {
      var next = copy(docRef.current);
      if (fn(next) === null) return false;
      docRef.current = next;
      setDoc(next);
      return true;
    };

    var change = useCallback(function (fn, message) {
      var next = copy(docRef.current);
      var nextSel = fn(next);
      if (nextSel === null) return false;
      /* A loose object with nothing left in it goes. */
      var kept = next.frames.filter(function (f) { return !(f.bare && !f.root.children.length); });
      if (kept.length && kept.length < next.frames.length) {
        next.frames = kept;
        if (!frameById(next, next.active)) next.active = kept[kept.length - 1].id;
      }
      commit(next, nextSel, message);
      return true;
    }, [commit]);

    var undo = useCallback(function () {
      var h = history.current;
      if (!h.past.length) return;
      h.future.push(JSON.stringify(docRef.current));
      var prev = JSON.parse(h.past.pop());
      docRef.current = prev;
      setDoc(prev);
      select(selRef.current.filter(function (id) { return locate(prev, id); }));
      announce("Undone");
    }, [announce, select]);
    var redo = useCallback(function () {
      var h = history.current;
      if (!h.future.length) return;
      h.past.push(JSON.stringify(docRef.current));
      var next = JSON.parse(h.future.pop());
      docRef.current = next;
      setDoc(next);
      select(selRef.current.filter(function (id) { return locate(next, id); }));
      announce("Redone");
    }, [announce, select]);

    /* Every change is written straight away. The toolbar says when it last
       saved, or that this browser won't keep it (a private window, blocked
       storage, or too many uploads), so work is never lost quietly. */
    useEffect(function () {
      var ok = storage(function (s) { s.setItem(STORE_KEY, JSON.stringify(doc)); return true; });
      setSaved({ ok: !!ok, at: new Date() });
    }, [doc]);
    useEffect(function () {
      storage(function (s) { s.setItem(PREFS_KEY, JSON.stringify({ category: category, kind: assetKind, view: view, tabs: tabByType, closed: closedSecs, left: left, stage: stageColor })); });
    }, [category, assetKind, view, tabByType, closedSecs, left, stageColor]);
    var firstDoc = useRef(doc);
    useEffect(function () {
      if (doc !== firstDoc.current && /^#b=/.test(location.hash)) window.history.replaceState(null, "", location.pathname + location.search);
    }, [doc]);
    /* A link to one layer opens with that layer selected and its frame in view. */
    var focused = useRef(false);
    useEffect(function () {
      if (focused.current || init.from !== "link" || !ready[doc.active] || !box.w) return;
      focused.current = true;
      showFrame(doc.active, true);
      if (init.focus && locate(docRef.current, init.focus)) { select([init.focus]); setLeft("layers"); }
    }, [ready, box.w]);
    useEffect(function () {
      if (init.from !== "link") return;
      announce(init.dropped.length ? "Opened a shared layout. " + init.dropped.length + (init.dropped.length === 1 ? " thing it carried was" : " things it carried were") + " left out: " + init.dropped.slice(0, 3).join("; ") : "Opened a shared layout");
    }, []);
    useEffect(function () {
      if (!window.matchMedia) return;
      var m = window.matchMedia("(min-width: 901px)");
      var on = function () { setWide(m.matches); };
      m.addEventListener("change", on);
      return function () { m.removeEventListener("change", on); };
    }, []);

    /* One frame is active: the selection, the layers and the inspector are
       its. Switching isn't an undo step. */
    var activate = function (fid) {
      var d = docRef.current;
      if (!frameById(d, fid)) return;
      select([]);
      setFrameOn(true);
      if (editRef.current) setEdit(null);
      if (d.active === fid) return;
      var next = Object.assign({}, d, { active: fid });
      docRef.current = next;
      setDoc(next);
    };
    var activateRef = useRef(activate); activateRef.current = activate;

    /* ------------------------------------------------- the camera */

    useEffect(function () {
      var el = stageRef.current;
      if (!el) return;
      var measure = function () { setBox({ w: el.clientWidth, h: el.clientHeight }); };
      measure();
      if (!window.ResizeObserver) { window.addEventListener("resize", measure); return function () { window.removeEventListener("resize", measure); }; }
      var ro = new ResizeObserver(measure);
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, [pane]);

    var setCam = function (c) {
      var next = { x: c.x, y: c.y, z: clampZoom(c.z) };
      camRef.current = next;
      setCamState(next);
    };
    var stageXY = function (clientX, clientY) {
      var el = stageRef.current;
      var r = el ? el.getBoundingClientRect() : { left: 0, top: 0 };
      return { x: clientX - r.left, y: clientY - r.top };
    };
    var panBy = function (dx, dy) { var c = camRef.current; setCam({ x: c.x + dx, y: c.y + dy, z: c.z }); };
    /* Zooming keeps the point under the pointer (or the middle) still. */
    var zoomAt = function (sx, sy, z) {
      var c = camRef.current;
      z = clampZoom(z);
      var wx = (sx - c.x) / c.z, wy = (sy - c.y) / c.z;
      setCam({ x: sx - wx * z, y: sy - wy * z, z: z });
    };
    /* The floating panels cover the canvas's edges; what's left open between
       them is where frames are fitted and centred. */
    var insets = function () {
      var st = stageRef.current, lp = leftPanelRef.current, rp = rightRef.current;
      if (!st || !wide || hidePanelsRef.current) return { l: 0, r: 0 };
      var sr = st.getBoundingClientRect();
      var l = lp && lp.offsetParent ? Math.max(0, lp.getBoundingClientRect().right - sr.left) : 0;
      var r = rp && rp.offsetParent ? Math.max(0, sr.right - rp.getBoundingClientRect().left) : 0;
      return { l: l, r: r };
    };
    var zoomTo = function (z) { var ins = insets(); zoomAt(ins.l + (boxRef.current.w - ins.l - ins.r) / 2, boxRef.current.h / 2, z); };
    var zoomStep = function (dir) {
      var z = camRef.current.z;
      var next = dir > 0 ? ZOOM_STEPS.filter(function (s) { return s > z + 0.001; })[0] : ZOOM_STEPS.filter(function (s) { return s < z - 0.001; }).pop();
      if (next) zoomTo(next);
    };
    var fitAll = function () {
      var L = layoutRef.current, ins = insets(), W = boxRef.current.w - ins.l - ins.r, H = boxRef.current.h;
      if (!W || !L.width) return;
      var z = clampZoom(Math.min(1, (W - STAGE_PAD * 2) / L.width, (H - STAGE_PAD * 2 - LABEL_ROOM) / L.height));
      setCam({ x: ins.l + (W - L.width * z) / 2 - L.left * z, y: Math.max(STAGE_PAD + LABEL_ROOM, (H - L.height * z + LABEL_ROOM) / 2) - L.top * z, z: z });
    };
    var fitWidth = function () {
      var L = layoutRef.current, ins = insets(), W = boxRef.current.w - ins.l - ins.r;
      if (!W || !L.width) return;
      var z = clampZoom(Math.min(1, (W - STAGE_PAD * 2) / L.width));
      setCam({ x: ins.l + (W - L.width * z) / 2 - L.left * z, y: STAGE_PAD + LABEL_ROOM - L.top * z, z: z });
    };
    /* A frame across the stage's width, from its top (or centred when it's
       short enough to fit). keep: never zoom in to do it. */
    var showFrame = function (fid, keep) {
      var b = layoutRef.current.boxes[fid], ins = insets(), W = boxRef.current.w - ins.l - ins.r, H = boxRef.current.h;
      if (!b || !W) return;
      var z = Math.min(1, (W - STAGE_PAD * 2) / b.w);
      if (keep) z = Math.min(camRef.current.z, z);
      z = clampZoom(z);
      /* A frame that hugs its content may still grow, so it starts at its top. */
      var f = frameById(docRef.current, fid);
      var fits = !(f && f.hug) && b.h * z <= H - STAGE_PAD * 2 - LABEL_ROOM;
      setCam({ x: ins.l + (W - b.w * z) / 2 - b.x * z, y: (fits ? (H - b.h * z + LABEL_ROOM) / 2 : STAGE_PAD + LABEL_ROOM) - b.y * z, z: z });
    };
    var showFrameRef = useRef(showFrame); showFrameRef.current = showFrame;

    /* The first view: the active frame on its own, or every frame across. */
    useEffect(function () {
      if (camState[0] || !box.w) return;
      if (doc.frames.length > 1 && wide) fitWidth(); else showFrame(doc.active);
    }, [box.w]);

    /* The wheel pans; with Ctrl or Cmd (and a trackpad pinch) it zooms at
       the pointer. Frames forward theirs here once they can't scroll. */
    var wheel = function (clientX, clientY, dx, dy, zoom, mode) {
      if (mode === 1) { dx *= 16; dy *= 16; } else if (mode === 2) { dx *= boxRef.current.w; dy *= boxRef.current.h; }
      if (zoom) {
        var p = stageXY(clientX, clientY);
        zoomAt(p.x, p.y, camRef.current.z * Math.exp(-Math.max(-50, Math.min(50, dy)) * 0.01));
        return;
      }
      panBy(-dx, -dy);
    };
    var wheelRef = useRef(wheel); wheelRef.current = wheel;
    useEffect(function () {
      var el = stageRef.current;
      if (!el) return;
      var onWheel = function (ev) {
        if (previewRef.current && !(ev.ctrlKey || ev.metaKey) && ev.target.tagName === "IFRAME") return;
        ev.preventDefault();
        wheelRef.current(ev.clientX, ev.clientY, ev.deltaX, ev.deltaY, ev.ctrlKey || ev.metaKey, ev.deltaMode);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return function () { el.removeEventListener("wheel", onWheel); };
    }, [pane]);

    /* A press that pans: one pointer drags the canvas, two pinch it. In a
       frame that scrolls, a finger scrolls the frame first. Returns whether
       the pointer moved, so the press doesn't also count as a click. */
    var gesture = function (phase, id, clientX, clientY, kind, fid) {
      var g = gest.current;
      var p = stageXY(clientX, clientY);
      var keys = Object.keys(g.pts);
      if (phase === "down") {
        if (!keys.length) { g.moved = false; g.start = p; g.fid = fid || null; setPanning(true); }
        g.pts[id] = p;
        keys = Object.keys(g.pts);
        g.pinch = null;
        if (keys.length >= 2) {
          var a0 = g.pts[keys[0]], b0 = g.pts[keys[1]];
          g.pinch = { d: Math.max(1, distance(a0, b0)), mid: midpoint(a0, b0), cam: Object.assign({}, camRef.current) };
          g.moved = true;
        }
        return false;
      }
      if (!g.pts[id]) return false;
      if (phase === "move") {
        var prev = g.pts[id];
        g.pts[id] = p;
        if (g.pinch && keys.length >= 2) {
          var a = g.pts[keys[0]], b = g.pts[keys[1]];
          var m = midpoint(a, b), c0 = g.pinch.cam;
          var z = clampZoom(c0.z * distance(a, b) / g.pinch.d);
          var wx = (g.pinch.mid.x - c0.x) / c0.z, wy = (g.pinch.mid.y - c0.y) / c0.z;
          setCam({ x: m.x - wx * z, y: m.y - wy * z, z: z });
          return true;
        }
        if (!g.moved && Math.abs(p.x - g.start.x) + Math.abs(p.y - g.start.y) < 5) return false;
        g.moved = true;
        var dx = p.x - prev.x, dy = p.y - prev.y;
        var fr = g.fid && frameById(docRef.current, g.fid);
        var f = fr && !fr.hug && kind === "touch" ? api(g.fid) : null;
        if (f && f.scrollBy) {
          var zc = camRef.current.z;
          var went = f.scrollBy(-dx / zc, -dy / zc);
          dx += went.x * zc;
          dy += went.y * zc;
        }
        if (dx || dy) panBy(dx, dy);
        return true;
      }
      delete g.pts[id];
      keys = Object.keys(g.pts);
      if (keys.length < 2) g.pinch = null;
      if (!keys.length) { g.fid = null; setPanning(false); }
      return g.moved;
    };
    var gestureRef = useRef(gesture); gestureRef.current = gesture;

    /* ------------------------------------------------- measuring */

    /* A node's box in stage coordinates, from its frame's own. */
    var toStage = useCallback(function (r, fid) {
      if (!r) return null;
      var b = layoutRef.current.boxes[fid || docRef.current.active];
      if (!b) return null;
      var c = camRef.current;
      return { left: c.x + (b.x + r.left) * c.z, top: c.y + (b.y + r.top) * c.z, width: r.width * c.z, height: r.height * c.z };
    }, []);

    var remeasure = useCallback(function () {
      var fid = docRef.current.active;
      var f = api(fid);
      var h = hoverRef.current;
      var hf = h ? api(h.f) : null;
      setMarks(function (m) {
        return {
          sel: f ? selRef.current.map(function (id) { var r = toStage(f.rect(id), fid); return r ? { id: id, r: r } : null; }).filter(Boolean) : [],
          hover: h && hf && h.id !== "root" && !(h.f === fid && selRef.current.indexOf(h.id) >= 0) ? toStage(hf.rect(h.id), h.f) : null,
          drop: m.drop,
        };
      });
      var ed = editRef.current;
      if (ed && f) {
        var t = f.textRect(ed.id, ed.value);
        if (t) setEdit(function (cur) { return cur && cur.id === ed.id ? Object.assign({}, cur, { box: toStage(t.rect, fid), font: t.font }) : cur; });
      }
    }, [toStage]);

    /* Shift and a hover: the space between the selection and what's under the
       pointer, or the padding of a container around it, with the token that
       makes it. A label opens that token in the inspector. */
    var SIDES = [["Top", "top"], ["Right", "right"], ["Bottom", "bottom"], ["Left", "left"]];
    var sideToken = function (node, base, side) {
      var key = base + side, v = node.style[key] || node.style[base];
      return v ? { key: v === node.style[key] ? key : base, value: v } : null;
    };
    var nearestSpace = function (px) {
      var r = Math.round(px), hit = null;
      DATA.tokens.margin.options.forEach(function (o) { var v = pxMap["margin|" + o.value]; if (!hit && v != null && Math.round(v) === r) hit = o.label || o.value; });
      return hit;
    };
    var computeSpacing = function (h, selId) {
      var d = docRef.current;
      if (!h || h.f !== d.active) return null;
      var f = api(h.f);
      if (!f) return null;
      var hr = f.rect(h.id);
      var hat = h.id === "root" ? locate(d, "root") : locate(d, h.id);
      if (!hr || !hat) return null;
      var out = [];
      var line = function (x1, y1, x2, y2, px, name, owner, sec) {
        if (px < 0.5) return;
        out.push({ x1: x1, y1: y1, x2: x2, y2: y2, label: Math.round(px) + (name ? " " + name : ""), owner: owner, sec: sec });
      };
      var sat = selId && selId !== h.id ? locate(d, selId) : null;
      var sr = sat ? f.rect(selId) : null;
      if (sat && sr) {
        var inside = sat.path.some(function (n) { return n.id === h.id; });
        if (inside) {
          /* The container around the selection: its padding, side by side. */
          var tok = function (side) { var t = sideToken(hat.node, "padding", side); return t ? t.value : null; };
          var cx0 = sr.left + sr.width / 2, cy0 = sr.top + sr.height / 2;
          line(cx0, hr.top, cx0, sr.top, sr.top - hr.top, tok("Top"), h.id, "spacing");
          line(cx0, sr.bottom, cx0, hr.bottom, hr.bottom - sr.bottom, tok("Bottom"), h.id, "spacing");
          line(hr.left, cy0, sr.left, cy0, sr.left - hr.left, tok("Left"), h.id, "spacing");
          line(sr.right, cy0, hr.right, cy0, hr.right - sr.right, tok("Right"), h.id, "spacing");
        } else {
          /* Two items: the gap between them, which their parent's gap makes when
             they share one. */
          var shared = sat.parent && hat.parent && sat.parent.id === hat.parent.id ? sat.parent : null;
          /* The parent's gap: its own, its specimen's, or the prop's default. */
          var gapProp = shared && META[shared.type] ? META[shared.type].props.filter(function (p) { return p.name === "gap"; })[0] : null;
          var gapVal = gapProp ? shared.props.gap || (scalars[shared.type] || {}).gap || gapProp.default : null;
          var gapName = function (px) { return gapVal ? "gap " + gapVal : nearestSpace(px); };
          var owner = gapProp ? shared.id : null;
          var midY = (Math.max(sr.top, hr.top) + Math.min(sr.bottom, hr.bottom)) / 2;
          var midX = (Math.max(sr.left, hr.left) + Math.min(sr.right, hr.right)) / 2;
          var yOver = Math.min(sr.bottom, hr.bottom) > Math.max(sr.top, hr.top);
          var xOver = Math.min(sr.right, hr.right) > Math.max(sr.left, hr.left);
          var yAt = yOver ? midY : sr.top + sr.height / 2, xAt = xOver ? midX : sr.left + sr.width / 2;
          if (sr.right <= hr.left) line(sr.right, yAt, hr.left, yAt, hr.left - sr.right, gapName(hr.left - sr.right), owner, "flex");
          else if (hr.right <= sr.left) line(hr.right, yAt, sr.left, yAt, sr.left - hr.right, gapName(sr.left - hr.right), owner, "flex");
          if (sr.bottom <= hr.top) line(xAt, sr.bottom, xAt, hr.top, hr.top - sr.bottom, gapName(hr.top - sr.bottom), owner, "flex");
          else if (hr.bottom <= sr.top) line(xAt, hr.bottom, xAt, sr.top, sr.top - hr.bottom, gapName(sr.top - hr.bottom), owner, "flex");
        }
      } else if (h.id !== "root") {
        /* One item: its own padding, inside its box. */
        SIDES.forEach(function (sd) {
          var t = sideToken(hat.node, "padding", sd[0]);
          if (!t) return;
          var px = pxMap[t.key + "|" + t.value];
          if (px == null) return;
          var cx1 = hr.left + hr.width / 2, cy1 = hr.top + hr.height / 2;
          if (sd[1] === "top") line(cx1, hr.top, cx1, hr.top + px, px, t.value, h.id, "spacing");
          if (sd[1] === "bottom") line(cx1, hr.bottom - px, cx1, hr.bottom, px, t.value, h.id, "spacing");
          if (sd[1] === "left") line(hr.left, cy1, hr.left + px, cy1, px, t.value, h.id, "spacing");
          if (sd[1] === "right") line(hr.right - px, cy1, hr.right, cy1, px, t.value, h.id, "spacing");
        });
      }
      return out.length ? { fid: h.f, lines: out } : null;
    };
    /* Open a token where it lives: select its owner and bring its section in. */
    var openToken = function (owner, sec) {
      var d = docRef.current;
      var at = owner && owner !== "root" ? locate(d, owner) : null;
      var key = at ? at.node.type : "__frame";
      select(at ? [owner] : []);
      setTabByType(function (m) { var n = Object.assign({}, m); n[key] = "layout"; return n; });
      setClosedSecs(function (c) { if (!c[sec]) return c; var n = Object.assign({}, c); delete n[sec]; return n; });
      setFocusSec(sec);
    };

    /* A frame that hugs its content follows the content's height. Something
       sized to the window keeps growing with the frame, so a frame stops
       after a few rounds of growth until its tree changes. */
    var measure = function () {
      var hs = heightsRef.current, next = null;
      var ws = widthsRef.current, nextW = null;
      docRef.current.frames.forEach(function (f) {
        if (!f.bare) return;
        var a = api(f.id);
        if (!a || !a.width) return;
        var w = Math.max(24, Math.min(MAX_WIDTH, a.width() || 0));
        if (Math.abs(w - (ws[f.id] || 0)) <= 1) return;
        nextW = nextW || Object.assign({}, ws);
        nextW[f.id] = w;
      });
      if (nextW) { widthsRef.current = nextW; setWidths(nextW); }
      docRef.current.frames.forEach(function (f) {
        if (!f.hug && !f.bare) return;
        var a = api(f.id);
        if (!a || !a.height) return;
        var h = Math.max(f.bare ? 16 : MIN_SIDE, Math.min(MAX_HEIGHT, a.height() || 0));
        var old = hs[f.id] || 0;
        if (Math.abs(h - old) <= 1) return;
        if (old && h > old) {
          grows.current[f.id] = (grows.current[f.id] || 0) + 1;
          if (grows.current[f.id] > 6) return;
        }
        next = next || Object.assign({}, hs);
        next[f.id] = h;
      });
      if (next) { heightsRef.current = next; setHeights(next); }
      remeasure();
    };
    var measureRef = useRef(measure); measureRef.current = measure;

    /* ------------------------------------------------- dragging */

    var frameAt = function (x, y) {
      var els = frameEls.current;
      for (var k in els) {
        if (!els[k]) continue;
        var r = els[k].getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { fid: k, r: r };
      }
      return null;
    };

    var resolve = function (x, y, payload) {
      var list = layersRef.current;
      var el = document.elementFromPoint(x, y);
      if (list && el && list.contains(el)) return listTarget(el, y, payload);
      var st = stageRef.current;
      if (!st) return null;
      var sr = st.getBoundingClientRect();
      if (x < sr.left || x > sr.right || y < sr.top || y > sr.bottom) return null;
      var at = frameAt(x, y);
      /* Off every frame: a loose object on the canvas, where it's let go. */
      if (!at) {
        var sp = stageXY(x, y), cz = camRef.current;
        return { where: "loose", x: (sp.x - cz.x) / cz.z, y: (sp.y - cz.y) / cz.z };
      }
      var f = api(at.fid);
      if (!f) return null;
      var z = camRef.current.z;
      var own = at.fid === docRef.current.active;
      var hit = f.drop((x - at.r.left) / z, (y - at.r.top) / z, own ? payload.id || null : null, 12 / z);
      if (!hit) return null;
      var out = { where: "canvas", frame: at.fid, parent: hit.parent, index: hit.index, line: hit.line, box: hit.box };
      var dragType = payload.kind === "move" && payload.id ? (locate(docRef.current, payload.id) || { node: {} }).node.type : payload.kind === "new" || payload.kind === "local" ? payload.type : payload.kind === "asset" ? "Image" : payload.kind === "tool" ? (/^comp:(\w+)$/.exec(payload.tool) || [0, payload.tool === "box" ? "Group" : null])[1] : null;
      var into = locate(docRef.current, hit.parent, at.fid);
      if (into && into.node.type === "Slot" && dragType) {
        var slotOwner = into.path[into.path.length - 2];
        if (!slotOwner || !slotAccepts(slotOwner.type, into.node.props.name, dragType)) return null;
      }
      /* On the frame's own canvas, outside any stack, it lands where it's let go. */
      var moving = payload.kind === "move" && payload.id ? locate(docRef.current, payload.id) : null;
      var type = moving ? moving.node.type : payload.kind === "new" || payload.kind === "local" ? payload.type : payload.kind === "asset" ? "Image" : payload.kind === "tool" ? (/^comp:(\w+)$/.exec(payload.tool) || [0, payload.tool === "box" ? "Group" : null])[1] : null;
      var hostFrame = frameById(docRef.current, at.fid);
      if (hit.parent === "root" && type && !joinsFlow(type) && hostFrame && hostFrame.mode !== "structured" && !hostFrame.bare) {
        var unit = (f.measure && f.measure(["var(--dt-space-inset-2xs)"])[0]) || 4;
        var fx = (x - at.r.left) / z, fy = (y - at.r.top) / z;
        var w = 120, h = 40;
        var r0 = moving && own ? (dragRef.current && dragRef.current.r0) || f.rect(payload.id) : null;
        if (r0) {
          w = r0.width; h = r0.height;
          var sx = (dragRef.current.x - at.r.left) / z, sy = (dragRef.current.y - at.r.top) / z;
          fx = r0.left + (fx - sx);
          fy = r0.top + (fy - sy);
        }
        fx = Math.max(0, fx); fy = Math.max(0, fy);
        var gx = Math.min(FREE_MAX, Math.round(fx / unit)), gy = Math.min(FREE_MAX, Math.round(fy / unit));
        out.free = { x: gx, y: gy };
        out.index = moving && moving.parent && moving.parent.id === "root" && own ? moving.index : (frameById(docRef.current, at.fid) || frame).root.children.length;
        out.line = null;
        out.box = { left: gx * unit, top: gy * unit, width: w, height: h };
      }
      return out;
    };

    /* A row's top third drops before it, the bottom third after it, and the
       middle of a container (or a slot that takes the kind) drops inside it,
       at the end. A component holding only its slots isn't one, so its
       middle splits before and after. Another frame's row takes it at the
       end of that frame. */
    var listTarget = function (el, y, payload) {
      var d = docRef.current;
      var frameRow = el.closest ? el.closest("[data-frame-row]") : null;
      if (frameRow && frameRow.getAttribute("data-frame-row") !== d.active) {
        var other = frameById(d, frameRow.getAttribute("data-frame-row"));
        return other ? { where: "list", frame: other.id, parent: "root", index: other.root.children.length, inside: "frame:" + other.id } : null;
      }
      var row = el.closest ? el.closest("[data-layer]") : null;
      var root = active(d).root;
      if (!row) return { where: "list", parent: "root", index: root.children.length, indicator: { top: layersRef.current.scrollHeight - 2, left: 8 } };
      var id = row.getAttribute("data-layer");
      if (id === "root") return { where: "list", parent: "root", index: 0, indicator: { top: row.offsetTop + row.offsetHeight, left: 22 } };
      var at = locate(d, id);
      if (!at) return null;
      if (payload.id && at.path.some(function (n) { return n.id === payload.id; })) return null;
      var r = row.getBoundingClientRect();
      var depth = Number(row.getAttribute("data-depth")) || 0;
      var rel = (y - r.top) / r.height;
      var probe = payload.id ? (locate(d, payload.id) || {}).node : { type: payload.kind === "asset" ? "Image" : payload.type || "Group" };
      if (rel > 0.3 && rel < 0.7 && canHold(at, probe)) return { where: "list", parent: id, index: at.node.children.length, inside: id };
      var after = rel >= 0.5;
      return { where: "list", parent: at.parent.id, index: at.index + (after ? 1 : 0), indicator: { top: row.offsetTop + (after ? row.offsetHeight : 0), left: 8 + depth * 14 } };
    };

    /* ghosted: the thing itself follows the pointer, so a free spot needs no
       outline of its own. */
    var show = function (hit, ghosted) {
      setListDrop(hit && hit.where === "list" ? hit : null);
      setMarks(function (m) {
        return Object.assign({}, m, { drop: hit && hit.where === "canvas" ? { line: hit.line ? thick(toStage(hit.line, hit.frame)) : null, box: hit.box && !(hit.free && ghosted) ? toStage(hit.box, hit.frame) : null } : null });
      });
    };

    /* Near the stage's edge the canvas pans; near a scrolling frame's top or
       bottom the frame scrolls; near the layers' ends the list does. */
    var autoscroll = function (x, y) {
      var st = stageRef.current;
      if (st) {
        var sr = st.getBoundingClientRect();
        if (x >= sr.left && x <= sr.right && y >= sr.top && y <= sr.bottom) {
          var px = x - sr.left < 32 ? 12 : sr.right - x < 32 ? -12 : 0;
          var py = y - sr.top < 32 ? 12 : sr.bottom - y < 32 ? -12 : 0;
          if (px || py) panBy(px, py);
          var at = frameAt(x, y);
          var fr = at && frameById(docRef.current, at.fid);
          if (fr && !fr.hug) {
            if (y - at.r.top < 48) frameEls.current[at.fid].contentWindow.scrollBy(0, -14);
            else if (at.r.bottom - y < 48) frameEls.current[at.fid].contentWindow.scrollBy(0, 14);
          }
        }
      }
      var list = layersRef.current;
      if (list) {
        var lr = list.getBoundingClientRect();
        if (x >= lr.left && x <= lr.right) {
          if (y - lr.top < 32) list.scrollTop -= 10;
          else if (lr.bottom - y < 32) list.scrollTop += 10;
        }
      }
    };

    var dragMove = function (x, y) {
      var dr = dragRef.current;
      if (!dr) return;
      /* A drag the frame started knows where it began from its first move. */
      if (dr.x === undefined) { dr.x = x; dr.y = y; }
      dr.lastX = x;
      dr.lastY = y;
      var g = dr.ghost;
      if (g && !g.grab) {
        /* Where the pointer holds it: under the pointer if it started on the
           element, just below and right of it otherwise. */
        var el0 = g.fid && frameEls.current[g.fid];
        var fr0 = el0 ? el0.getBoundingClientRect() : null;
        var zz = camRef.current.z;
        var gx = fr0 ? (dr.x - (fr0.left + g.fx * zz)) / zz : -12;
        var gy = fr0 ? (dr.y - (fr0.top + g.fy * zz)) / zz : -12;
        g.grab = gx >= 0 && gy >= 0 && gx <= g.w && gy <= g.h ? { x: gx, y: gy } : { x: -12 / zz, y: -12 / zz };
      }
      /* Cmd or Ctrl over a component: the one from the tile takes its place. */
      if (dr.payload.kind === "new") dr.payload.swap = !!(dr.mods && dr.mods.swap);
      if (dr.payload.swap) { dr.hit = swapTarget(x, y); setDrag({ label: "Swap for " + dr.payload.label, x: x, y: y, ghost: null, spot: null }); showSwap(dr.hit); return; }
      /* A picture or clip over something that shows one fills it instead. */
      if (dr.payload.kind === "asset") {
        var mt = mediaTarget(x, y, dr.payload.media);
        if (mt) { dr.hit = mt; setDrag({ label: "Fill " + mt.name, x: x, y: y, ghost: null, spot: null }); showSwap(mt); autoscroll(x, y); return; }
      }
      var hit = resolve(x, y, dr.payload);
      dr.hit = hit;
      var spot = null;
      if (hit && hit.where === "canvas" && hit.free && hit.box) {
        var sr0 = stageRef.current.getBoundingClientRect(), sb = toStage(hit.box, hit.frame);
        if (sb) spot = { x: sr0.left + sb.left, y: sr0.top + sb.top };
      }
      /* A layer moved inside its own frame moves itself, snapped to the spot
         it would land on when it's placed freely; off its frame it hides
         there and travels over the canvas. */
      var inside = false;
      if (g && g.live) {
        var la = api(g.fid);
        var on = frameAt(x, y);
        var list = layersRef.current;
        var overList = list && list.contains(document.elementFromPoint(x, y));
        inside = !!(on && on.fid === g.fid);
        if (la && la.lift) {
          if (inside) {
            var z0 = camRef.current.z;
            var dx = (x - dr.x) / z0, dy = (y - dr.y) / z0;
            if (hit && hit.free && hit.box && dr.r0) { dx = hit.box.left - dr.r0.left; dy = hit.box.top - dr.r0.top; }
            la.lift(dr.payload.id, Math.round(dx), Math.round(dy));
            la.hide(dr.payload.id, false);
          } else {
            la.lift(dr.payload.id, null);
            la.hide(dr.payload.id, !overList);
          }
          remeasure();
        }
        if (overList) g = null;
      }
      setDrag({ label: dr.payload.label, x: x, y: y, ghost: inside ? null : g || null, spot: spot, inside: inside });
      show(hit, !!g || inside);
      autoscroll(x, y);
    };

    var dragEnd = function (commitIt) {
      var dr = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      show(null);
      if (dr && dr.ghost && dr.ghost.live) { var ga = api(dr.ghost.fid); if (ga && ga.lift) { ga.lift(dr.payload.id, null); ga.hide(dr.payload.id, false); } }
      if (!dr || !dr.active) return;
      justDragged.current = true;
      setTimeout(function () { justDragged.current = false; }, 60);
      var hit = dr.hit;
      if (dr.payload.swap) { if (commitIt && hit) swapNode(hit.id, dr.payload.type, hit.fid); return; }
      if (hit && hit.where === "media") {
        if (!commitIt) return;
        var mp = hit;
        change(function (d) { d.active = mp.fid; var at = locate(d, mp.id); if (!at) return null; at.node.props[mp.prop] = dr.payload.src; return mp.id; }, mp.name + " shows " + dr.payload.label);
        return;
      }
      /* A frame or page dragged from the tool bar lands anywhere on the canvas. */
      if (commitIt && dr.payload.kind === "tool" && (dr.payload.tool === "frame" || dr.payload.tool === "page")) {
        var sr = stageRef.current && stageRef.current.getBoundingClientRect();
        if (sr && dr.lastX >= sr.left && dr.lastX <= sr.right && dr.lastY >= sr.top && dr.lastY <= sr.bottom) frameOps.add(null, dr.payload.tool === "page");
        return;
      }
      if (!commitIt || !hit) return;
      if (hit.where === "loose") { placeLoose(dr.payload, hit); return; }
      var fid = hit.frame || docRef.current.active;
      if (dr.payload.kind === "tool") { placeTool(dr.payload.tool, hit); return; }
      if (dr.payload.kind === "asset") {
        var where = { parent: hit.parent, index: hit.index, frame: fid, free: hit.free };
        if (dr.payload.media === "video") add("Video", where, { src: dr.payload.src }); else add("Image", where, { src: dr.payload.src, alt: dr.payload.label });
        return;
      }
      if (dr.payload.kind === "new") { add(dr.payload.type, { parent: hit.parent, index: hit.index, frame: fid, free: hit.free }); return; }
      if (dr.payload.kind === "local") { addLocal(dr.payload.comp, { parent: hit.parent, index: hit.index, frame: fid, free: hit.free }); return; }
      /* Moved on its frame's canvas: it keeps its place in the list and takes
         the new position; from inside a stack, it comes out onto the canvas. */
      if (hit.free) {
        var mid = dr.payload.id, pos = hit.free;
        change(function (d) {
          var from = locate(d, mid);
          var dest = frameById(d, fid);
          if (fixedSpot(from) || !dest) return null;
          var stays = fid === d.active && from.parent && from.parent.id === "root";
          if (!stays) {
            from.parent.children.splice(from.index, 1);
            dest.root.children.push(from.node);
          }
          from.node.style.x = pos.x;
          from.node.style.y = pos.y;
          delete from.node.style.position;
          delete from.node.style.anchor;
          delete from.node.style.offset;
          d.active = fid;
          return mid;
        }, "Placed " + dr.payload.label + " on the canvas");
        return;
      }
      /* Into a stack, it joins the flow again. */
      var into = locate(docRef.current, dr.payload.id);
      if (into && isFree(into.node.style)) {
        var lid = dr.payload.id;
        change(function (d) {
          var from = locate(d, lid);
          var to = locate(d, hit.parent, fid);
          if (!from || fixedSpot(from) || !canHold(to, from.node)) return null;
          delete from.node.style.x;
          delete from.node.style.y;
          from.parent.children.splice(from.index, 1);
          var idx = hit.index;
          if (to.node === from.parent && from.index < idx) idx--;
          to.node.children.splice(Math.min(idx, to.node.children.length), 0, from.node);
          d.active = fid;
          return lid;
        }, "Moved " + dr.payload.label + " into the flow");
        return;
      }
      if (fid !== docRef.current.active) {
        var moving = dr.payload.id;
        var dest = frameById(docRef.current, fid);
        change(function (d) {
          var from = locate(d, moving);
          var to = locate(d, hit.parent, fid);
          if (!from || fixedSpot(from) || !canHold(to, from.node)) return null;
          from.parent.children.splice(from.index, 1);
          to.node.children.splice(Math.min(hit.index, to.node.children.length), 0, from.node);
          d.active = fid;
          return moving;
        }, "Moved " + dr.payload.label + " to " + (dest ? dest.name : "another frame"));
        return;
      }
      if (change(function (d) { return ops.move(d, dr.payload.id, hit.parent, hit.index); }, "Moved " + dr.payload.label)) {
        if (hit.parent !== "root") setCollapsed(function (c) { var n = Object.assign({}, c); delete n[hit.parent]; return n; });
      }
    };

    /* What moves with the pointer: a layer itself (live: it's shifted in its
       frame, and its markup travels over the canvas once it leaves it), or a
       tile's own preview. */
    var ghostFor = function (payload) {
      if (payload.kind === "move" && payload.id) {
        var fid = docRef.current.active, a = api(fid);
        var o = a && a.outer ? a.outer(payload.id) : null;
        if (!o) return null;
        if (dragRef.current) dragRef.current.r0 = { left: o.left, top: o.top, width: o.width, height: o.height };
        return { html: o.html, w: o.width, h: o.height, fx: o.left, fy: o.top, fid: fid, live: true };
      }
      if (payload.thumb) {
        var t = payload.thumb;
        return { html: t.innerHTML, w: t.offsetWidth, h: t.offsetHeight, flat: true, grab: { x: t.offsetWidth / 2, y: t.offsetHeight / 2 } };
      }
      return null;
    };
    /* The layer a Cmd-drag from a tile would swap: the selection while the
       pointer is over it, else whatever component is under the pointer, else
       the selection. */
    var swapTarget = function (x, y) {
      var d = docRef.current;
      var s0 = selRef.current, last = s0.length ? s0[s0.length - 1] : null;
      var at = frameAt(x, y);
      if (at) {
        var f = api(at.fid), z = camRef.current.z;
        var fx = (x - at.r.left) / z, fy = (y - at.r.top) / z;
        var sr = last && at.fid === d.active && f && f.rect ? f.rect(last) : null;
        if (sr && fx >= sr.left && fx <= sr.right && fy >= sr.top && fy <= sr.bottom) return { id: last, fid: at.fid };
        var id = f && f.pick ? f.pick(fx, fy) : null;
        while (id && id !== "root") {
          var a = locate(d, id, at.fid);
          if (!a) break;
          if (!fixedSpot(a)) return { id: id, fid: at.fid };
          id = a.parent ? a.parent.id : null;
        }
      }
      return last ? { id: last, fid: d.active } : null;
    };
    /* Which media prop of a layer takes a picture or a clip: a Video's clip
       is its src and a picture its poster; everything else takes pictures. */
    var mediaPropFor = function (type, media) {
      var m = META[type];
      if (!m) return null;
      var props = m.props.filter(function (p) { return p.kind === "media"; }).map(function (p) { return p.name; });
      if (!props.length) return null;
      if (type === "Video") return media === "video" ? "src" : props.indexOf("poster") >= 0 ? "poster" : null;
      return media === "video" ? null : props[0];
    };
    /* The nearest layer under the pointer that shows a picture or clip. */
    var mediaTarget = function (x, y, media) {
      var at = frameAt(x, y);
      if (!at) return null;
      var d = docRef.current, f = api(at.fid), z = camRef.current.z;
      var id = f && f.pick ? f.pick((x - at.r.left) / z, (y - at.r.top) / z) : null;
      while (id && id !== "root") {
        var a = locate(d, id, at.fid);
        if (!a) break;
        var prop = mediaPropFor(a.node.type, media || "image");
        if (prop) return { where: "media", id: id, fid: at.fid, prop: prop, name: nameOf(a.node) };
        id = a.parent ? a.parent.id : null;
      }
      return null;
    };
    var showSwap = function (hit) {
      setListDrop(null);
      var a = hit && api(hit.fid);
      var r = a && a.rect ? a.rect(hit.id) : null;
      setMarks(function (m) { return Object.assign({}, m, { drop: r ? { line: null, box: toStage(r, hit.fid), swap: true } : null }); });
    };
    /* A size token near a measured size, from the fixed sizes: within a fifth
       of it, or nothing. fills: it spans its parent, so it fills. */
    var sizeNear = function (key, px, fills, any) {
      if (fills) return key === "w" || key === "height" ? "fill" : null;
      var best = null, gap = Infinity;
      DATA.tokens[key].options.forEach(function (o) {
        if (o.family === "fit" || o.family === "container") return;
        var v = pxMap[key + "|" + o.value];
        if (v == null) return;
        if (Math.abs(v - px) < gap) { gap = Math.abs(v - px); best = o.value; }
      });
      return best && (any || gap <= Math.max(4, px * 0.2)) ? best : null;
    };
    /* Swap a layer for another component: it takes the old one's place, its
       tokens and its size (a size set on it, or the nearest token to how big
       it was drawn), and a container keeps what was inside. */
    var swapNode = function (id, type, fid) {
      var d0 = docRef.current;
      var at0 = locate(d0, id, fid);
      if (!at0 || fixedSpot(at0)) { announce("Select a component first, then Cmd-drag another onto it"); return; }
      if (at0.node.type === type) { announce("That's already a " + type); return; }
      var a = api(fid);
      var r = a && a.rect ? a.rect(id) : null;
      var pr = a && a.rect && at0.parent && at0.parent.id !== "root" ? a.rect(at0.parent.id) : null;
      var n = make(type);
      if (type === "Inline") n.props.wrap = false;
      n.style = copy(at0.node.style);
      if (r && !n.style.w) { var w = sizeNear("w", r.width, !!pr && Math.abs(pr.width - r.width) < 2 && !isFree(n.style)); if (w) n.style.w = w; }
      if (r && !n.style.height) { var h = sizeNear("height", r.height, false); if (h) n.style.height = h; }
      if (n.children && at0.node.children) n.children = at0.node.children.filter(function (c) { return c.type !== "Slot"; }).map(copy);
      var was = nameOf(at0.node);
      var ok = change(function (d) { d.active = fid; return ops.replace(d, id, n); }, "Swapped " + was + " for " + type + ", the same size");
      if (!ok) announce(type + " can't go where " + was + " is");
    };
    /* A local component, put down: a fresh copy of what was kept, with new ids
       and no position of its own. */
    var instanceOf = function (comp) {
      var n = cleanNode(copy(comp.node), null);
      if (!n) return null;
      n = fresh(n);
      delete n.style.x; delete n.style.y;
      n.name = comp.name;
      return n;
    };
    var addLocal = function (comp, where) {
      var n = instanceOf(comp);
      if (!n) { announce(comp.name + " couldn't be read back"); return; }
      var t = where || target();
      var fid = t.frame || docRef.current.active;
      if (t.free) { n.style.x = t.free.x; n.style.y = t.free.y; }
      var fr = frameById(docRef.current, fid);
      if (!change(function (d) { d.active = fid; return ops.insert(d, t.parent, t.index, n, fid); }, "Added " + comp.name + " to " + (fr ? fr.name : "the frame"))) announce(comp.name + " can't go there");
    };
    /* Dropped off every frame: a loose object there, with no page around it.
       A band (a Section or a block) gets a page of its own instead. */
    var placeLoose = function (payload, hit) {
      var node = null, moving = null;
      if (payload.kind === "new") { node = make(payload.type); if (payload.type === "Inline") node.props.wrap = false; }
      else if (payload.kind === "asset") node = payload.media === "video" ? make("Video", { src: payload.src }) : make("Image", { src: payload.src, alt: payload.label });
      else if (payload.kind === "tool") node = toolNode(payload.tool, null);
      else if (payload.kind === "local") node = instanceOf(payload.comp);
      else if (payload.kind === "move") moving = payload.id;
      var made = null;
      change(function (d) {
        var n = node;
        if (moving) {
          var at = locate(d, moving);
          if (fixedSpot(at)) return null;
          at.parent.children.splice(at.index, 1);
          n = at.node;
          ["x", "y", "position", "anchor", "offset"].forEach(function (k) { delete n.style[k]; });
        }
        if (!n) return null;
        var band = joinsFlow(n.type);
        var f = makeFrame(band ? "Frame " + (d.frames.length + 1) : nameOf(n), "desktop", true);
        f.x = Math.round(hit.x);
        f.y = Math.round(hit.y);
        if (!band) f.bare = true;
        f.root.children = [n];
        d.frames.push(f);
        d.active = f.id;
        made = n.id;
        return n.id;
      }, (moving ? "Moved " : "Added ") + payload.label + " onto the canvas");
      return made;
    };

    var startDrag = function (ev, payload) {
      if (ev.button !== undefined && ev.button !== 0) return;
      var swaps = payload.kind === "new";
      if (ev.shiftKey || ((ev.metaKey || ev.ctrlKey) && !swaps)) return;
      var target = ev.currentTarget;
      try { target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      dragRef.current = { payload: payload, x: ev.clientX, y: ev.clientY, active: false, id: ev.pointerId, ghost: null, mods: { swap: swaps && (ev.metaKey || ev.ctrlKey) } };
      var move = function (mv) {
        var dr = dragRef.current;
        if (!dr || mv.pointerId !== dr.id) return;
        if (swaps) dr.mods.swap = mv.metaKey || mv.ctrlKey;
        if (!dr.active) {
          if (Math.abs(mv.clientX - dr.x) + Math.abs(mv.clientY - dr.y) < 6) return;
          dr.active = true;
          dr.ghost = ghostFor(dr.payload);
        }
        mv.preventDefault();
        dragMove(mv.clientX, mv.clientY);
      };
      var stop = function (commitIt) {
        return function (up) {
          var dr = dragRef.current;
          if (!dr || (up && up.pointerId !== undefined && up.pointerId !== dr.id)) return;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("keydown", esc, true);
          dragEnd(commitIt);
        };
      };
      var onUp = stop(true), onCancel = stop(false);
      var esc = function (k) { if (k.key === "Escape") { k.preventDefault(); onCancel({}); announce("Drag cancelled"); } };
      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", esc, true);
    };

    /* ------------------------------------------------- the frames call */

    /* Each frame binds the host to itself, so a pick, a hover or a gesture
       says which frame it came from. */
    useEffect(function () {
      var raf = 0;
      var fidOf = function (win) {
        var els = frameEls.current;
        for (var k in els) { try { if (els[k] && els[k].contentWindow === win) return k; } catch (err) { /* gone */ } }
        return null;
      };
      var toPage = function (fid, x, y) {
        var el = frameEls.current[fid];
        var r = el ? el.getBoundingClientRect() : { left: 0, top: 0 };
        var z = camRef.current.z;
        return { x: r.left + x * z, y: r.top + y * z };
      };
      window.BuilderHost = {
        bind: function (win) {
          var on = function (fn) { return function () { var fid = fidOf(win); return fid ? fn.apply(null, [fid].concat([].slice.call(arguments))) : undefined; }; };
          return {
            ready: on(function (fid) { readyRef.current(fid); }),
            selection: on(function (fid) { if (docRef.current.active !== fid) return null; var s = selRef.current; return s.length ? s[s.length - 1] : null; }),
            pick: on(function (fid, id, additive, deep, part) { pickRef.current(id, additive, deep, "canvas", fid, part); }),
            edit: on(function (fid, id) { if (docRef.current.active !== fid) activateRef.current(fid); beginEditRef.current(id); }),
            hover: on(function (fid, id) {
              var h = hoverRef.current;
              if (!id) { if (h && h.f === fid) setHover(null); return; }
              if (!h || h.f !== fid || h.id !== id) setHover({ f: fid, id: id });
            }),
            key: function (ev) { return keyRef.current(ev); },
            keyup: function (ev) { keyUpRef.current(ev); },
            moved: function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { measureRef.current(); }); },
            dragStart: on(function (fid, id) {
              if (docRef.current.active !== fid) activateRef.current(fid);
              var at = locate(docRef.current, id);
              if (!at) return;
              if (at.node.type === "Slot") return;
              var pl = { kind: "move", id: id, label: nameOf(at.node) };
              dragRef.current = { payload: pl, active: true, ghost: null };
              dragRef.current.ghost = ghostFor(pl);
              if (selRef.current.indexOf(id) < 0) select([id]);
            }),
            dragMove: on(function (fid, x, y) { if (!dragRef.current) return; var p = toPage(fid, x, y); dragMoveRef.current(p.x, p.y); }),
            dragEnd: function (commitIt) { dragEndRef.current(commitIt); },
            frameDrag: on(function (fid, phase, x, y) { var p = toPage(fid, x, y); frameDragRef.current(fid, phase, p.x, p.y); }),
            gesture: on(function (fid, phase, id, x, y, kind) { var p = toPage(fid, x, y); return gestureRef.current(phase, id, p.x, p.y, kind, fid); }),
            wheel: on(function (fid, x, y, dx, dy, zoom, mode) { var p = toPage(fid, x, y); wheelRef.current(p.x, p.y, dx, dy, zoom, mode); }),
            spaceHeld: function () { return spaceRef.current; },
          };
        },
      };
      return function () { delete window.BuilderHost; };
    }, []);
    var dragMoveRef = useRef(dragMove); dragMoveRef.current = dragMove;
    var dragEndRef = useRef(dragEnd); dragEndRef.current = dragEnd;

    /* A frame that (re)loads draws its tree again. */
    var frameReady = function (fid) {
      if (!api(fid)) return;
      delete rendered.current[fid];
      setReady(function (m) { var n = Object.assign({}, m); n[fid] = (m[fid] || 0) + 1; return n; });
    };
    var readyRef = useRef(frameReady); readyRef.current = frameReady;

    /* Each frame draws its own tree, and only when that tree (or preview)
       changed. */
    useEffect(function () {
      var any = null;
      /* A component's slots are filled from its sample once, the first time
         it's on a canvas, so its parts can be picked from then on. */
      var first = null;
      doc.frames.forEach(function (f) { if (!first && ready[f.id]) first = api(f.id); });
      if (first && first.slots) {
        var tpl = function (type) {
          if (slotTpl.current[type] === undefined) { try { slotTpl.current[type] = first.slots(type) || []; } catch (err) { slotTpl.current[type] = []; } }
          return slotTpl.current[type];
        };
        var wants = function (n) { var m = META[n.type]; return !!m && !m.builder && !hasSlots(n) && tpl(n.type).length > 0; };
        var missing = false;
        doc.frames.forEach(function (f) { (function walk(n) { (n.children || []).forEach(function (c) { if (wants(c)) missing = true; walk(c); }); })(f.root); });
        if (missing) {
          quiet(function (d) {
            d.frames.forEach(function (f) {
              (function walk(n) {
                (n.children || []).forEach(function (c) {
                  if (wants(c)) {
                    c.children = tpl(c.type).map(function (t) {
                      return { id: uid(), type: "Slot", props: { name: t.name }, style: {}, children: t.nodes.map(function (k) { return cleanNode(JSON.parse(JSON.stringify(k)), null); }).filter(function (k) { return k && slotAccepts(c.type, t.name, k.type); }) };
                    }).concat(c.children || []);
                  }
                  walk(c);
                });
              })(f.root);
            });
            return undefined;
          });
          return;
        }
      }
      doc.frames.forEach(function (f) {
        if (!ready[f.id]) return;
        var a = api(f.id);
        if (!a) return;
        any = any || a;
        var key = JSON.stringify(f) + "|" + preview;
        if (rendered.current[f.id] === key) return;
        rendered.current[f.id] = key;
        grows.current[f.id] = 0;
        a.render({ page: { dark: f.dark, surface: f.surface, canvas: f.canvas, spacing: f.spacing, gap: f.gap, typeScale: f.typeScale }, root: f.root }, { preview: preview, hug: f.hug || !!f.bare, bare: !!f.bare });
      });
      if (any && !placeable) {
        var ok = {}, sc = {}, det = {};
        Object.keys(META).forEach(function (n) { ok[n] = any.has(n) && (META[n].container || META[n].builder || any.hasStarter(n)); sc[n] = any.scalars(n); det[n] = any.canDetach(n); });
        setPlaceable(ok);
        setScalars(sc);
        setDetachable(det);
      }
    }, [ready, doc, preview]);

    /* Every token option's size in pixels, measured in the active frame, so
       the inspector can say "48 control-lg" rather than a name alone. Measured
       again when the frame, its layout character or the theme changes. */
    useEffect(function () {
      var a = api(doc.active);
      if (!a || !a.measure) return;
      var keys = [], values = [];
      Object.keys(DATA.tokens).forEach(function (k) {
        var sec = DATA.tokens[k].section;
        if (sec !== "size" && sec !== "spacing" && k !== "offset") return;
        DATA.tokens[k].options.forEach(function (o) {
          var v = null;
          Object.keys(o.css).some(function (prop) { var c = String(o.css[prop]); if (/var\(--dt-/.test(c)) { v = c; return true; } return false; });
          if (v) { keys.push(k + "|" + o.value); values.push(v); }
        });
      });
      TEXT_STYLES.forEach(function (t) { keys.push("text|" + t[0]); values.push("var(--dt-text-" + t[0] + "-size)"); });
      var got = a.measure(values);
      var map = {};
      keys.forEach(function (k, i) { if (got[i] != null && got[i] >= 0) map[k] = got[i]; });
      setPxMap(map);
      if (a.colors) {
        var toks = DATA.tokens.surface.options.map(function (o) { return o.tokens[0]; }).filter(Boolean);
        var cs = a.colors(toks), tm = {};
        toks.forEach(function (t, i) { tm[t] = cs[i]; });
        setTints(tm);
      }
    }, [ready[doc.active], doc.active, frame.spacing, frame.width, themeStamp]);
    useEffect(function () {
      var bump = function () { setThemeStamp(function (n) { return n + 1; }); };
      window.addEventListener("storage", bump);
      window.addEventListener("focus", bump);
      return function () { window.removeEventListener("storage", bump); window.removeEventListener("focus", bump); };
    }, []);

    useEffect(function () { remeasure(); }, [selection, hover, cam, layout.width, layout.height, doc.active, edit && edit.id]);
    useEffect(function () {
      if (!play) return undefined;
      if (playRef.current && !playRef.current.open) playRef.current.showModal();
      var size = function () { var el = playStageRef.current; if (el) setPlayBox({ w: el.clientWidth, h: el.clientHeight }); };
      size();
      window.addEventListener("resize", size);
      return function () { window.removeEventListener("resize", size); };
    }, [play && play.fid]);

    /* The spacing stays up while Shift is held, so its labels can be pressed. */
    useEffect(function () {
      if (!shiftHeld || drag || preview) { setSpacing(null); return; }
      if (!hover) return;
      setSpacing(computeSpacing(hover, sel));
    }, [shiftHeld, hover && hover.f, hover && hover.id, sel, cam, doc, drag, preview, pxMap]);
    useEffect(function () {
      if (!focusSec) return undefined;
      var t = setTimeout(function () {
        var el = rightRef.current && rightRef.current.querySelector('[data-sec="' + focusSec + '"]');
        if (el) {
          el.scrollIntoView({ block: "nearest" });
          el.classList.add("is-flash");
          setTimeout(function () { el.classList.remove("is-flash"); }, 1200);
          var first = el.querySelector("button, input, [tabindex]");
          if (first && first.focus) first.focus({ preventScroll: true });
        }
        setFocusSec(null);
      }, 60);
      return function () { clearTimeout(t); };
    }, [focusSec]);
    useEffect(function () { if (rightRef.current) rightRef.current.scrollTop = 0; }, [sel, doc.active]);

    /* ------------------------------------------------- selecting */

    var textPropOf = function (node) {
      var base = scalars[node.type] || {};
      for (var i = 0; i < TEXT_PROPS.length; i++) {
        var k = TEXT_PROPS[i];
        if (k === "children" && isContainer(node.type)) continue;
        if (typeof node.props[k] === "string" || typeof base[k] === "string") return k;
      }
      return null;
    };

    /* A press on the canvas hands the keyboard back to it, so Tab and the
       shortcuts work straight after. */
    var releaseFocus = function () {
      setTrayOpen(null);
      var a = document.activeElement;
      if (!a || a === document.body || a.classList.contains("bd-inline")) return;
      if (mountEl.contains(a) || (a.closest && a.closest("#app-toolbar"))) a.blur();
    };

    /* Shift adds to the selection; Cmd or Ctrl selects and goes straight to
       the text. A click on nothing clears it. A click in another frame makes
       that frame active first. */
    var pick = function (id, additive, deep, from, fid, part) {
      if (from === "canvas") releaseFocus();
      var other = fid && fid !== docRef.current.active;
      if (other) { activate(fid); additive = false; }
      /* A press on a frame's empty canvas lets go of whatever was selected,
         frame included; with nothing selected, it picks the frame. */
      if (!id || id === "root") {
        if (additive) return;
        var had = selRef.current.length > 0 || (frameOnRef.current && !other);
        select([]);
        setFrameOn(from === "canvas" ? !had : true);
        return;
      }
      var cur = selRef.current;
      if (additive) {
        select(cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]));
        return;
      }
      select([id]);
      var at0 = locate(docRef.current, id);
      setPart(part && at0 && hasTitlePart(at0.node.type) ? { id: id, part: part } : null);
      if (deep) { setTimeout(function () { beginEditRef.current(id); }, 0); return; }
      if (from === "canvas" && mql("(max-width: 900px)")) {
        var at = locate(docRef.current, id);
        announce((at ? at.node.type : "") + " selected. Open Edit to change it.");
      }
    };
    var pickRef = useRef(pick); pickRef.current = pick;

    /* Typing into the canvas: the text prop of the node, edited where it is.
       The whole edit is one undo step; Escape puts the old text back. */
    var beginEdit = function (id) {
      var at = locate(docRef.current, id);
      var f = api();
      if (!at || !f) return;
      var prop = textPropOf(at.node);
      if (!prop) { select([id]); return; }
      var base = scalars[at.node.type] || {};
      var value = typeof at.node.props[prop] === "string" ? at.node.props[prop] : String(base[prop] || "");
      var t = f.textRect(id, value);
      if (!t) return;
      select([id]);
      snapshot();
      setEdit({ id: id, prop: prop, value: value, before: value, box: toStage(t.rect), font: t.font });
      if (mql("(max-width: 900px)")) setPane("canvas");
    };
    var beginEditRef = useRef(beginEdit); beginEditRef.current = beginEdit;
    var editChange = function (value) {
      var ed = editRef.current;
      if (!ed) return;
      setEdit(Object.assign({}, ed, { value: value }));
      var next = copy(docRef.current);
      var at = locate(next, ed.id);
      if (!at) return;
      at.node.props[ed.prop] = value;
      docRef.current = next;
      setDoc(next);
    };
    var editDone = function (keep) {
      var ed = editRef.current;
      if (!ed) return;
      setEdit(null);
      if (!keep) {
        var prev = history.current.past.pop();
        if (prev) { docRef.current = JSON.parse(prev); setDoc(docRef.current); }
        announce("Edit cancelled");
      } else if (ed.value === ed.before) history.current.past.pop();
    };

    /* ------------------------------------------------- placing things */

    var target = function () {
      var d = docRef.current;
      var s = selRef.current;
      var id = s.length ? s[s.length - 1] : null;
      var at = id ? locate(d, id) : null;
      if (!at) return { parent: "root", index: active(d).root.children.length };
      if (isContainer(at.node.type)) return { parent: at.node.id, index: at.node.children.length };
      return { parent: at.parent.id, index: at.index + 1 };
    };

    var add = function (type, where, props) {
      var t = where || target();
      var fid = t.frame || docRef.current.active;
      /* A slot that doesn't take this kind: it goes after the component instead. */
      var pAt = locate(docRef.current, t.parent, fid);
      if (pAt && pAt.node.type === "Slot") {
        var ownerAt = pAt.path.length > 1 ? locate(docRef.current, pAt.path[pAt.path.length - 2].id, fid) : null;
        if (ownerAt && !slotAccepts(ownerAt.node.type, pAt.node.props.name, type)) {
          if (where) { announce(words(pAt.node.props.name) + " in " + ownerAt.node.type + " takes " + (slotTakes(ownerAt.node.type, pAt.node.props.name) || ["components"]).join(", ")); return; }
          t = { parent: ownerAt.parent.id, index: ownerAt.index + 1, frame: fid };
        }
      }
      var n = make(type);
      if (props) Object.assign(n.props, props);
      if (t.free) { n.style.x = t.free.x; n.style.y = t.free.y; }
      /* A row added here stays on one line until it's told to wrap. */
      if (type === "Inline") n.props.wrap = false;
      var parentAt = t.parent === "root" ? null : locate(docRef.current, t.parent, fid);
      var parentName = parentAt ? parentAt.node.type : (frameById(docRef.current, fid) || frame).name;
      change(function (d) { d.active = fid; return ops.insert(d, t.parent, t.index, n, fid); }, "Added " + type + " to " + parentName);
      if (mql("(max-width: 900px)")) setPane("canvas");
    };

    var actions = {
      remove: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        change(function (d) { return ops.remove(d, ids); }, ids.length > 1 ? "Deleted " + ids.length + " items" : "Deleted");
      },
      duplicate: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        var made = [];
        change(function (d) { ids.forEach(function (id) { var c = ops.duplicate(d, id); if (c) made.push(c); }); return made.length ? made : null; }, "Duplicated");
      },
      up: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, -1); }, "Moved up")) select([id]); },
      down: function () { var id = selRef.current[selRef.current.length - 1]; if (id && change(function (d) { return ops.nudge(d, id, 1); }, "Moved down")) select([id]); },
      /* Enter goes into the selection: a container's children, or a leaf's text. */
      into: function () {
        var d = docRef.current;
        var ids = selRef.current;
        if (!ids.length) { if (active(d).root.children.length) select(active(d).root.children.map(function (c) { return c.id; })); return; }
        var kids = [];
        ids.forEach(function (id) { var at = locate(d, id); if (at && at.node.children) kids.push.apply(kids, at.node.children.map(function (c) { return c.id; })); });
        if (kids.length) { select(kids); announce(kids.length + " selected"); return; }
        if (ids.length === 1) beginEdit(ids[0]);
      },
      /* Shift+Enter goes out to the parents. */
      out: function () {
        var d = docRef.current;
        var parents = [];
        selRef.current.forEach(function (id) { var at = locate(d, id); if (at && at.parent && at.parent.id !== "root" && parents.indexOf(at.parent.id) < 0) parents.push(at.parent.id); });
        select(parents);
      },
      wrap: function (type) { var id = selRef.current[selRef.current.length - 1]; if (id && type) change(function (d) { return ops.wrap(d, id, type); }, "Wrapped in " + type); },
      group: function () {
        var ids = selRef.current.slice();
        if (!ids.length) return;
        if (!change(function (d) { return ops.group(d, ids); }, "Grouped " + ids.length + (ids.length === 1 ? " item" : " items"))) announce("Only items side by side in the same parent can be grouped");
      },
      ungroup: function () {
        var id = selRef.current[selRef.current.length - 1];
        var at = id && locate(docRef.current, id);
        if (at && at.node.type === "Group") change(function (d) { return ops.ungroup(d, id); }, "Ungrouped");
      },
      /* The component rebuilt from primitives, where the canvas has a recipe. */
      detach: function () {
        var id = selRef.current[selRef.current.length - 1];
        var at = id && locate(docRef.current, id);
        var f = api();
        if (!at || !f) return;
        var built = f.detach(at.node);
        var node = built && cleanNode(built);
        if (!node) { announce(at.node.type + " has no primitive version yet"); return; }
        if (isContainer(node.type) && !node.name) node.name = at.node.type;
        change(function (d) { return ops.replace(d, id, node); }, at.node.type + " detached into primitives");
      },
      rename: function () {
        var id = selRef.current[selRef.current.length - 1];
        var where = wide && left === "layers" && !bare ? "layer" : "title";
        if (id) { var at = locate(docRef.current, id); if (at && at.node.type === "Group") setRenaming({ id: id, where: where }); }
        else setRenaming({ id: "frame:" + docRef.current.active, where: wide && !bare ? "title" : "label" });
      },
      /* Tab, or Ctrl/Cmd+\, hides the side panels to give the canvas the room. */
      panels: function () {
        setBare(function (b) {
          announce(b ? "Panels shown" : "Panels hidden. Press Tab to show them.");
          return !b;
        });
      },
      preview: function () {
        var on = !previewRef.current;
        setPreview(on);
        select([]);
        setHover(null);
        announce(on ? "Preview: the components respond to clicks and typing. Escape to edit." : "Editing");
      },
    };

    /* Keys the canvas and the page share. Tab and Space belong to the canvas
       only while nothing else has focus. */
    var keyRef = useRef(function () { return false; });
    keyRef.current = function (ev) {
      if ((dialogRef.current && dialogRef.current.open) || (importRef.current && importRef.current.open) || (playRef.current && playRef.current.open) || (compRef.current && compRef.current.open) || newOpenRef.current) return false;
      var t = ev.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (ev.key === "Shift" && !ev.repeat) setShiftHeld(true);
      if (typing || (t && t.closest && t.closest(".bd-dd-list"))) return false;
      var free = !t || t === document.body || t === document.documentElement || t.ownerDocument !== document || (t.classList && t.classList.contains("bd-stage"));
      var mod = ev.metaKey || ev.ctrlKey;
      var key = ev.key.toLowerCase();
      if (ev.key === "Escape" && previewRef.current) { actions.preview(); return true; }
      if (ev.key === "Tab" && free && !mod && !ev.altKey && !ev.shiftKey && wide) { actions.panels(); return true; }
      if (mod && ev.key === "\\") { actions.panels(); return true; }
      if (ev.key === " " && free && !mod) { if (!spaceRef.current) { spaceRef.current = true; setSpace(true); } return true; }
      if (previewRef.current) return false;
      if (ev.key === "Escape" && tray) { setTray(null); return true; }
      if (ev.key === "Escape" && tool !== "select") { setTool("select"); return true; }
      if (!mod && !ev.altKey && !ev.shiftKey && TOOL_KEY[key]) { pickToolRef.current(TOOL_INFO[TOOL_KEY[key]]); return true; }
      if (mod && key === "z") { (ev.shiftKey ? redo : undo)(); return true; }
      if (mod && key === "y") { redo(); return true; }
      if (mod && (ev.key === "=" || ev.key === "+")) { zoomStep(1); return true; }
      if (mod && ev.key === "-") { zoomStep(-1); return true; }
      if (mod && ev.key === "0") { fitAll(); return true; }
      if (ev.shiftKey && !mod && ev.code === "Digit0") { zoomTo(1); return true; }
      if (ev.shiftKey && !mod && ev.code === "Digit1") { fitAll(); return true; }
      if (ev.shiftKey && !mod && ev.code === "Digit2") { showFrame(docRef.current.active); return true; }
      if (ev.key === "Enter") { (ev.shiftKey ? actions.out : actions.into)(); return true; }
      if (ev.key === "Escape") { if (!selRef.current.length) setFrameOn(false); select([]); return true; }
      /* Paste: in this page, the paste event brings what the system clipboard
         holds; from a frame, the builder's own clipboard. */
      if (mod && key === "v" && !ev.shiftKey) {
        if (t && t.ownerDocument !== document) { if (clip.current) pasteNodes(clip.current.nodes); return true; }
        return false;
      }
      if (ev.key === "F2") { actions.rename(); return true; }
      if (!selRef.current.length) return false;
      if (mod && key === "g") { (ev.shiftKey ? actions.ungroup : actions.group)(); return true; }
      if (mod && ev.altKey && (key === "k" || ev.code === "KeyK")) { openComponent(); return true; }
      if (mod && (key === "c" || key === "x") && !ev.shiftKey) { copySelection(key === "x"); return true; }
      if (ev.shiftKey && !mod && !ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && stepType(ev.key === "ArrowUp" ? 1 : -1)) return true;
      if (ev.key === "Delete" || ev.key === "Backspace") { actions.remove(); return true; }
      if (mod && key === "d") { actions.duplicate(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowUp") { actions.up(); return true; }
      if ((ev.altKey || mod) && ev.key === "ArrowDown") { actions.down(); return true; }
      return false;
    };
    var keyUpRef = useRef(function () {});
    keyUpRef.current = function (ev) {
      if (ev.key === " " && spaceRef.current) { spaceRef.current = false; setSpace(false); }
      if (ev.key === "Shift") setShiftHeld(false);
    };
    useEffect(function () {
      var onKey = function (ev) {
        /* The toolbar renders into the site header, outside the builder's box. */
        var inside = mountEl.contains(ev.target) || ev.target === document.body || (ev.target.closest && ev.target.closest("#app-toolbar"));
        if (!inside) return;
        if (keyRef.current(ev)) ev.preventDefault();
      };
      var onUp = function (ev) { keyUpRef.current(ev); };
      var onBlur = function () { if (spaceRef.current) { spaceRef.current = false; setSpace(false); } setShiftHeld(false); };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onUp);
      window.addEventListener("blur", onBlur);
      return function () {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onUp);
        window.removeEventListener("blur", onBlur);
      };
    }, []);

    /* ------------------------------------------------- settings */

    var setFrame = function (key, value, message) { change(function (d) { active(d)[key] = value; return undefined; }, message); };
    var sizeOn = function (f, w, h) {
      var ratio = f.height / f.width, lo = minSide(f);
      if (w !== undefined) {
        f.width = side(w, MAX_WIDTH, f.width, lo);
        if (f.lock && h === undefined) { f.height = side(Math.round(f.width * ratio), MAX_HEIGHT, f.height, lo); f.hug = false; }
      }
      /* Typing a height fixes it. */
      if (h !== undefined) {
        f.height = side(h, MAX_HEIGHT, f.height, lo); f.hug = false;
        if (f.lock && w === undefined) f.width = side(Math.round(f.height / ratio), MAX_WIDTH, f.width, lo);
      }
    };
    var setSize = function (w, h) { change(function (d) { sizeOn(active(d), w, h); return undefined; }); };
    /* Scrubbing: the first step is the undo step, the rest follow it. */
    var setSizeLive = function (w, h, first) { if (first) setSize(w, h); else quiet(function (d) { sizeOn(active(d), w, h); }); };
    var scrubStyle = function (ids, key, v, first) {
      if (first) { setStyle(ids, key, v); return; }
      quiet(function (d) { ids.forEach(function (id) { var at = locate(d, id); if (at) at.node.style[key] = v; }); });
    };
    var setPreset = function (id) {
      var p = PRESET[id];
      if (p) change(function (d) { var f = active(d); f.width = p.width; f.height = p.height; if (p.typeScale) f.typeScale = p.typeScale; else delete f.typeScale; return undefined; }, frame.name + " is " + p.label + ", " + p.width + " by " + p.height + (p.typeScale ? ", with social type" : ""));
    };
    /* Props and styles apply to every selected node, so several of the same
       kind change together. */
    var setProp = function (ids, key, value) {
      change(function (d) {
        var any = false;
        [].concat(ids).forEach(function (id) { var at = locate(d, id); if (!at) return; any = true; if (value === undefined) delete at.node.props[key]; else at.node.props[key] = value; });
        return any ? undefined : null;
      });
    };
    var setStyle = function (ids, key, value) {
      change(function (d) {
        var any = false;
        [].concat(ids).forEach(function (id) { var at = locate(d, id); if (!at) return; any = true; if (value === undefined || value === "") delete at.node.style[key]; else at.node.style[key] = value; });
        return any ? undefined : null;
      });
    };
    /* Freeform to structured: what sat loose on the page goes into a Group,
       top to bottom, and keeps the system's colours only. */
    var setMode = function (mode) {
      change(function (d) {
        var f = active(d);
        if ((f.mode || "free") === mode) return null;
        f.mode = mode;
        if (mode !== "structured") return undefined;
        delete f.canvas;
        var loose = [];
        var kept = [];
        f.root.children.forEach(function (c) { if (joinsFlow(c.type) || isContainer(c.type)) kept.push(c); else loose.push(c); });
        loose.sort(function (a, b) { return ((a.style.y || 0) - (b.style.y || 0)) || ((a.style.x || 0) - (b.style.x || 0)); });
        (function unfree(n) { if (n.style) { delete n.style.x; delete n.style.y; delete n.style.fill; delete n.style.color; } (n.children || []).forEach(unfree); })(f.root);
        if (loose.length) { var g = make("Group", { direction: "column", gap: "md" }, loose, { padding: "lg" }); kept.push(g); }
        f.root.children = kept;
        if (!f.gap) f.gap = "block";
        autoLayout(f.root);
        return [];
      }, mode === "structured" ? "Structured: everything is in Groups now" : "Freeform: place things anywhere");
    };
    var setName = function (id, name) { change(function (d) { var at = locate(d, id); if (!at) return null; if (name) at.node.name = name; else delete at.node.name; return undefined; }); };

    var frameOps = {
      /* page: a frame that hugs its content, started with a Section to fill. */
      add: function (size, page) {
        var cur = active(docRef.current);
        var f = makeFrame((page ? "Page " : "Frame ") + (docRef.current.frames.length + 1), "desktop", !!page);
        f.width = size ? side(size.width, MAX_WIDTH, cur.width) : page ? PRESET.desktop.width : cur.width;
        f.height = size ? side(size.height, MAX_HEIGHT, cur.height) : page ? PRESET.desktop.height : cur.height;
        if (page) f.root.children = [make("Section")];
        change(function (d) { d.frames.push(f); d.active = f.id; return []; }, "Added " + f.name);
        setTimeout(function () { showFrameRef.current(f.id, true); }, 0);
      },
      /* at: where the copy goes on the canvas; otherwise it goes beside. */
      duplicate: function (id, at) {
        var made = null;
        var boxesNow = layoutRef.current.boxes;
        change(function (d) {
          var src = frameById(d, id);
          if (!src) return null;
          var c = copy(src);
          c.id = uid();
          c.name = src.name + " copy";
          c.root = fresh(src.root);
          c.root.id = "root";
          if (at) {
            d.frames.forEach(function (fr) { if (typeof fr.x !== "number" && boxesNow[fr.id]) { fr.x = Math.round(boxesNow[fr.id].x); fr.y = Math.round(boxesNow[fr.id].y); } });
            c.x = at.x; c.y = at.y;
          }
          d.frames.splice(d.frames.indexOf(src) + 1, 0, c);
          d.active = c.id;
          made = c.id;
          return [];
        }, "Duplicated frame");
        if (made) {
          var h = heightsRef.current[id];
          if (h) setHeights(function (hs) { var n = Object.assign({}, hs); n[made] = h; return n; });
          setTimeout(function () { showFrameRef.current(made, true); }, 0);
        }
      },
      remove: function (id) {
        if (docRef.current.frames.length < 2) return;
        var f = frameById(docRef.current, id);
        if (f && f.root.children.length && !window.confirm("Delete " + f.name + "? Undo brings it back.")) return;
        change(function (d) {
          var i = d.frames.findIndex(function (x) { return x.id === id; });
          if (i < 0) return null;
          d.frames.splice(i, 1);
          if (d.active === id) d.active = (d.frames[i] || d.frames[i - 1]).id;
          return [];
        }, "Deleted frame");
      },
      rename: function (id, name) { setRenaming(null); if (name) change(function (d) { var f = frameById(d, id); if (!f || f.name === name) return null; f.name = name; return undefined; }); },
      /* The frame picked as a whole: active, nothing inside selected. */
      pick: function (id, reveal) {
        releaseFocus();
        activate(id);
        if (reveal) {
          var b = layoutRef.current.boxes[id], c = camRef.current, W = boxRef.current.w, H = boxRef.current.h;
          var x = c.x + b.x * c.z, y = c.y + b.y * c.z;
          if (x > W - 40 || x + b.w * c.z < 40 || y > H - 40 || y + b.h * c.z < 40) showFrame(id, true);
        }
      },
    };

    /* The code for what's selected: one button is just that button, a
       frame (nothing inside it picked) is the whole screen. */
    var openCode = function () {
      var f = api();
      if (!f) return;
      var d = docRef.current;
      var fr = active(d);
      var picked = selRef.current.map(function (id) { return locate(d, id); }).filter(Boolean).map(function (a) { return a.node; });
      var parts = [];
      picked.forEach(function (n) { if (n.type === "Slot") parts = parts.concat(n.children); else parts.push(n); });
      if (parts.length && f.jsxNodes) {
        var title = parts.length === 1 ? nameOf(parts[0]) : parts.length + " layers";
        setCodeTitle(title);
        setCode(f.jsxNodes(parts, parts.length === 1 ? (parts[0].name || parts[0].type) : fr.name + " parts"));
      } else {
        setCodeTitle(fr.name);
        setCode(f.jsx({ page: Object.assign({}, fr, { bare: !!fr.bare }), root: fr.root }, fr.name));
      }
      var dlg = dialogRef.current;
      if (dlg && dlg.showModal) dlg.showModal();
    };

    /* A frame as a picture, downloaded: PNG keeps transparency, JPEG is
       smaller and fills it white. */
    var exportImage = function (fid, type) {
      var a = api(fid);
      var f = frameById(docRef.current, fid);
      if (!a || !a.snapshot || !f) return;
      announce("Making the " + (type === "jpeg" ? "JPG" : "PNG") + "…");
      a.snapshot(type).then(function (url) {
        var link = document.createElement("a");
        link.href = url;
        link.download = (f.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "frame") + (type === "jpeg" ? ".jpg" : ".png");
        document.body.appendChild(link);
        link.click();
        link.remove();
        announce("Downloaded " + link.download);
      }, function (err) { announce((err && err.message) || "Couldn't make the picture."); });
    };

    /* Copy, cut and paste: layers go onto the builder's own clipboard (and
       the system one, as JSON), and paste into whichever frame is active, into
       the selection or after it. */
    var CLIP_MARK = "dovetail-builder-nodes";
    var copySelection = function (cut) {
      var d = docRef.current;
      var spots = selRef.current.map(function (id) { return locate(d, id); }).filter(function (at) { return at && !fixedSpot(at); });
      if (!spots.length) return false;
      var nodes = spots.map(function (at) { return copy(at.node); });
      clip.current = { nodes: nodes, from: d.active };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(JSON.stringify({ kind: CLIP_MARK, nodes: withoutUploads({ frames: [{ root: { children: nodes } }] }).doc.frames[0].root.children })).catch(function () { /* the builder's own copy still works */ });
      var what = nodes.length === 1 ? nameOf(nodes[0]) : nodes.length + " layers";
      if (cut) change(function (dd) { return ops.remove(dd, spots.map(function (at) { return at.node.id; })); }, "Cut " + what);
      else announce("Copied " + what);
      return true;
    };
    var pasteNodes = function (raw) {
      var nodes = (raw || []).map(function (n) { return cleanNode(JSON.parse(JSON.stringify(n)), null); }).filter(Boolean).map(fresh);
      if (!nodes.length) return false;
      var d = docRef.current;
      var t = target();
      var fid = d.active;
      var fr = active(d);
      var same = clip.current && clip.current.from === fid;
      var made = [];
      change(function (dd) {
        var at = t.index;
        nodes.forEach(function (n) {
          if (t.parent !== "root" || fr.mode === "structured" || fr.bare) { delete n.style.x; delete n.style.y; }
          else if (same && isFree(n.style)) { n.style.x = Math.min(FREE_MAX, n.style.x + 4); n.style.y = Math.min(FREE_MAX, n.style.y + 4); }
          if (ops.insert(dd, t.parent, at, n, fid)) { made.push(n.id); at++; }
        });
        return made.length ? made : null;
      }, "Pasted " + (nodes.length === 1 ? nameOf(nodes[0]) : nodes.length + " layers") + " into " + fr.name);
      if (same && clip.current) clip.current = { nodes: clip.current.nodes.map(function (n) { var c = copy(n); if (isFree(c.style)) { c.style.x += 4; c.style.y += 4; } return c; }), from: fid };
      return made.length > 0;
    };
    /* Text pasted from elsewhere: the builder's own JSON for layers. */
    useEffect(function () {
      var onPaste = function (ev) {
        var t = ev.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        if (!(mountEl.contains(t) || t === document.body)) return;
        var text = ev.clipboardData ? ev.clipboardData.getData("text/plain") : "";
        var data = null;
        try { data = JSON.parse(text); } catch (err) { data = null; }
        if (data && data.kind === CLIP_MARK && Array.isArray(data.nodes)) { ev.preventDefault(); pasteRef.current(data.nodes); }
        else if (clip.current) { ev.preventDefault(); pasteRef.current(clip.current.nodes); }
      };
      document.addEventListener("paste", onPaste);
      return function () { document.removeEventListener("paste", onPaste); };
    }, []);
    var pasteRef = useRef(pasteNodes); pasteRef.current = pasteNodes;

    /* Text one step up or down its type scale: a Heading through its sizes
       into display, a Text through its variants. */
    /* A block's title: its text and its size, set through the block's props. */
    var TITLE_STEPS = ["heading-md", "heading-lg", "heading-xl", "display-sm", "display-md", "display-lg"];
    var hasTitlePart = function (type) { var m = META[type]; return !!m && m.props.some(function (p) { return p.name === "titleSize"; }); };
    var TYPE_SCALE = {
      Heading: { prop: "size", steps: ["heading-xs", "heading-sm", "heading-md", "heading-lg", "heading-xl", "display-sm", "display-md", "display-lg"] },
      Text: { prop: "variant", steps: ["fine", "small", "body", "lead"] },
    };
    var HEADING_DEFAULT = { 1: "heading-xl", 2: "heading-lg", 3: "heading-md", 4: "heading-sm", 5: "heading-xs", 6: "heading-xs" };
    var stepType = function (by) {
      var d = docRef.current;
      var pt = partRef.current;
      if (pt && selRef.current.length === 1 && selRef.current[0] === pt.id) {
        var pat = locate(d, pt.id);
        if (!pat) return false;
        var tdef = META[pat.node.type].props.filter(function (p) { return p.name === "titleSize"; })[0];
        var tcur = pat.node.props.titleSize || (tdef && tdef.default) || "heading-lg";
        var ti = TITLE_STEPS.indexOf(tcur), tj = Math.max(0, Math.min(TITLE_STEPS.length - 1, (ti < 0 ? 1 : ti) + by));
        if (tj === ti) { announce(by > 0 ? "Already the largest size" : "Already the smallest size"); return true; }
        setProp([pt.id], "titleSize", TITLE_STEPS[tj]);
        announce("Title " + tcur.replace(/-/g, " ") + " to " + TITLE_STEPS[tj].replace(/-/g, " "));
        return true;
      }
      var nodes = selRef.current.map(function (id) { return locate(d, id); }).filter(Boolean).map(function (a) { return a.node; });
      if (!nodes.length || !nodes.every(function (n) { return TYPE_SCALE[n.type]; })) return false;
      var said = null;
      change(function (dd) {
        var any = false;
        nodes.forEach(function (n0) {
          var at = locate(dd, n0.id);
          var sc = TYPE_SCALE[n0.type];
          var base = scalars[n0.type] || {};
          var cur = at.node.props[sc.prop] || base[sc.prop];
          if (!cur && n0.type === "Heading") cur = HEADING_DEFAULT[Number(at.node.props.level || base.level || 2)] || "heading-lg";
          var i = sc.steps.indexOf(cur);
          if (i < 0) i = sc.steps.indexOf(n0.type === "Text" ? "body" : "heading-lg");
          var j = Math.max(0, Math.min(sc.steps.length - 1, i + by));
          if (j === i) return;
          at.node.props[sc.prop] = sc.steps[j];
          any = true;
          said = said || words(cur || "") + " to " + words(sc.steps[j]).replace(/-/g, " ");
        });
        return any ? undefined : null;
      }, null);
      announce(said ? said.replace(/-/g, " ") : by > 0 ? "Already the largest size" : "Already the smallest size");
      return true;
    };

    /* A link to these frames that opens on one layer: the one given, or the
       selection; with none, on the frame given or the active one. */
    var share = function (nodeId, frameId) {
      var d = docRef.current;
      var out = withoutUploads(d);
      var s0 = selRef.current;
      var nid = nodeId !== undefined ? nodeId : s0.length ? s0[s0.length - 1] : null;
      var fid = frameId || d.active;
      var at = nid ? locate(d, nid, fid) : null;
      var fr = frameById(d, fid);
      var url = location.origin + location.pathname + "#b=" + encode(out.doc) + "&f=" + fid + (at ? "&n=" + nid : "");
      var where = at ? nameOf(at.node) + " in " + (fr ? fr.name : "its frame") : fr ? fr.name : "these frames";
      copyText(url).then(function () {
        announce("Link to " + where + " copied." + (out.dropped ? " Uploaded files aren't in it; they stay in this browser." : ""));
      }, function () { window.prompt("Copy this link", url); });
    };

    /* New: a menu under the + button, not a dialog over the work. A free
       canvas, a structured page, a template (as new frames or into the
       active one), a pasted layout, or starting over. */
    var openNew = function (from) {
      var b = (from && from.getBoundingClientRect ? from : newBtnRef.current);
      var r = b ? b.getBoundingClientRect() : { left: 16, bottom: 56 };
      setNewOpen({ left: Math.max(8, Math.min(r.left, window.innerWidth - 408)), top: r.bottom + 6 });
    };
    var closeNew = function () { setNewOpen(null); };
    useEffect(function () {
      if (!newOpen) return undefined;
      var first = newRef.current && newRef.current.querySelector("button");
      if (first) first.focus({ preventScroll: true });
      var away = function (ev) {
        if (newRef.current && newRef.current.contains(ev.target)) return;
        if (newBtnRef.current && newBtnRef.current.contains(ev.target)) return;
        setNewOpen(null);
      };
      var key = function (ev) { if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); setNewOpen(null); if (newBtnRef.current) newBtnRef.current.focus(); } };
      document.addEventListener("pointerdown", away, true);
      document.addEventListener("keydown", key, true);
      return function () { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key, true); };
    }, [!!newOpen]);
    var newFrame = function (mode) {
      closeNew();
      var d = docRef.current;
      var structured = mode === "structured";
      var f = makeFrame((structured ? "Page " : "Canvas ") + (d.frames.length + 1), "desktop", structured);
      f.mode = structured ? "structured" : "free";
      /* A structured page starts with a Group to put things in, and its blocks
         sit a block's gap apart. */
      if (structured) { var g = make("Group", { direction: "column", gap: "md" }, [], { padding: "lg", w: "fill" }); g.name = "Content"; f.root.children = [g]; f.gap = "block"; }
      change(function (dd) { dd.frames.push(f); dd.active = f.id; return []; }, "Added " + f.name + (structured ? ": a structured page. Everything goes in Groups." : ": a free canvas. Place things anywhere."));
      setTimeout(function () { showFrameRef.current(f.id, true); }, 0);
    };

    /* Starting over, or a pasted layout. Templates add; only this replaces. */
    var startFrom = function (id) {
      closeNew();
      if (id === "import") { openImport(); return; }
      var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!s) return;
      var has = docRef.current.frames.some(function (f) { return f.root.children.length; });
      if (has && !window.confirm("Start over with a blank frame? Every frame goes; undo brings your work back.")) return;
      storage(function (st) { st.setItem(BACKUP_KEY, JSON.stringify(docRef.current)); });
      var next = s[2]();
      commit(next, null, "Started from " + s[1] + ". Undo to go back.");
      setTimeout(function () { showFrameRef.current(next.active); }, 0);
    };

    /* Local components. A selection becomes one when everything in it comes
       from the system: tokens for every style, layers in the flow, nothing
       only this browser holds. What stops it is listed, with a fix where
       there is one; what's merely worth knowing is a warning. */
    var compRef = useRef(null);
    var compState = useState(null);
    var compDraft = compState[0], setCompDraft = compState[1];
    var componentCheck = function (node) {
      var issues = [], tokens = {}, count = 0;
      (function walk(n, depth) {
        count++;
        var label = nameOf(n);
        if (n.type === "Slot") issues.push({ level: "error", text: "A slot only lives inside its component. Select the component instead." });
        Object.keys(n.style || {}).forEach(function (k) {
          var v = n.style[k];
          if (k === "x" || k === "y") {
            if (depth > 0 && k === "x") issues.push({ level: "error", id: n.id, fix: "flow", text: label + " is placed by position. A component's layers sit in its flow." });
            return;
          }
          if (k === "fill" || k === "color") { issues.push({ level: "error", id: n.id, key: k, fix: "token", text: label + " has a custom " + (k === "fill" ? "fill" : "text colour") + " (" + v + "), not a token." }); return; }
          var def = DATA.tokens[k];
          var o = def ? def.options.filter(function (x) { return x.value === v; })[0] : null;
          if (o) o.tokens.forEach(function (t) { tokens[t] = 1; });
        });
        if (n.type === "Group" && n.props.gap && n.props.gap !== "none") tokens["--dt-space-" + (n.props.direction === "row" ? "inline" : "stack") + "-" + n.props.gap] = 1;
        Object.keys(n.props || {}).forEach(function (k) {
          if (typeof n.props[k] === "string" && /^data:/.test(n.props[k])) issues.push({ level: "warn", text: label + " carries an uploaded file. It stays in this browser and isn't in share links." });
        });
        (n.children || []).forEach(function (c) { walk(c, depth + 1); });
      })(node, 0);
      var list = Object.keys(tokens);
      if (count > 300) issues.push({ level: "error", text: "It has " + count + " layers; a component takes up to 300." });
      if (!list.length) issues.push({ level: "error", text: "It isn't built on any tokens yet. Give it spacing, a fill, a radius or a gap from the system first." });
      if (count === 1 && !isContainer(node.type)) issues.push({ level: "warn", text: "It's a single " + node.type + ". As a component it saves its settings, nothing more." });
      return { issues: issues, tokens: list, count: count };
    };
    /* The selection as one node: itself, or several side by side in a Group. */
    var componentSource = function () {
      var d = docRef.current;
      var at = selRef.current.map(function (id) { return locate(d, id); }).filter(Boolean);
      if (!at.length) return null;
      if (at.length === 1) return copy(at[0].node);
      return make("Group", { direction: "column", gap: "md" }, at.map(function (a) { return copy(a.node); }));
    };
    var openComponent = function () {
      var node = componentSource();
      if (!node) { announce("Select layers to make a component of"); return; }
      setCompDraft({ name: node.name || (node.type === "Group" ? "My component" : node.type), ids: selRef.current.slice() });
      setTimeout(function () { var dlg = compRef.current; if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }, 0);
    };
    var fixComponent = function () {
      var ids = compDraft ? compDraft.ids : [];
      change(function (d) {
        var any = false;
        ids.forEach(function (id) {
          var at = locate(d, id);
          if (!at) return;
          (function walk(n, depth) {
            ["fill", "color"].forEach(function (k) { if (n.style[k]) { delete n.style[k]; any = true; } });
            if (depth > 0 && (n.style.x !== undefined || n.style.y !== undefined)) { delete n.style.x; delete n.style.y; any = true; }
            (n.children || []).forEach(function (c) { walk(c, depth + 1); });
          })(at.node, 0);
        });
        return any ? undefined : null;
      }, "Custom colours and positions taken out; it uses the system's now");
    };
    var saveComponent = function () {
      var node = componentSource();
      if (!node || !compDraft) return;
      var check = componentCheck(node);
      if (check.issues.some(function (i) { return i.level === "error"; })) return;
      var name = (compDraft.name || "").trim().slice(0, 60) || "My component";
      var kept = cleanNode(copy(node), null);
      if (!kept) return;
      delete kept.style.x; delete kept.style.y;
      setLibrary(function (l) { var n = Object.assign({}, l); n.components = [{ id: uid(), name: name, node: kept, tokens: check.tokens, made: Date.now() }].concat(l.components || []); return n; });
      if (compDraft.ids.length === 1) setName(compDraft.ids[0], name);
      var dlg = compRef.current;
      if (dlg && dlg.open) dlg.close();
      setCompDraft(null);
      announce(name + " is in My components, built on " + check.tokens.length + (check.tokens.length === 1 ? " token" : " tokens"));
    };
    var componentDialog = function () {
      var node = compDraft ? componentSource() : null;
      var check = node ? componentCheck(node) : null;
      var errors = check ? check.issues.filter(function (i) { return i.level === "error"; }) : [];
      var warns = check ? check.issues.filter(function (i) { return i.level === "warn"; }) : [];
      var fixable = errors.some(function (i) { return i.fix; });
      return e("dialog", { className: "bd-code bd-comp-dlg", ref: compRef, "aria-labelledby": "bd-comp-title", onClose: function () { setCompDraft(null); } },
        e("div", { className: "bd-code-head" },
          e("div", { className: "bd-code-intro" },
            e("h2", { id: "bd-comp-title" }, "Create component"),
            e("p", { className: "bd-inspect-sub" }, "It goes in Assets, under Components › My components, to use again in any frame. A component is built from the system's tokens, so it follows the theme wherever it goes.")),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { compRef.current.close(); } }, e(Icon, { name: "close" })))),
        check ? e("div", { className: "bd-comp-body" },
          e("label", { className: "bd-field" }, e("span", { className: "bd-field-label" }, "Name"),
            e("input", { className: "bd-input bd-comp-name", type: "text", maxLength: 60, value: compDraft.name, onChange: function (ev) { var v = ev.target.value; setCompDraft(function (c) { return c ? Object.assign({}, c, { name: v }) : c; }); } })),
          e("div", { className: cx("bd-comp-status", errors.length ? "is-blocked" : "is-ready"), role: "status" },
            e(Icon, { name: errors.length ? "alert" : "check" }),
            errors.length ? errors.length + (errors.length === 1 ? " thing stops" : " things stop") + " it becoming a component" : "Ready: " + check.count + (check.count === 1 ? " layer" : " layers") + " on " + check.tokens.length + (check.tokens.length === 1 ? " token" : " tokens")),
          errors.length || warns.length ? e("ul", { className: "bd-comp-issues" }, errors.concat(warns).map(function (i, k) {
            return e("li", { key: k, className: "is-" + i.level }, e(Icon, { name: i.level === "error" ? "alert" : "bell" }), e("span", null, i.text));
          })) : null,
          check.tokens.length ? e("details", { className: "bd-comp-tokens" }, e("summary", null, "The tokens it's built on (" + check.tokens.length + ")"),
            e("ul", null, check.tokens.map(function (t) { return e("li", { key: t }, e("code", null, t)); }))) : null,
          e("div", { className: "bd-import-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: !!errors.length, onClick: saveComponent }, e(Icon, { name: "component" }), "Create component"),
            fixable ? e("button", { type: "button", className: "bd-btn", onClick: fixComponent, title: "Takes out custom colours and positions inside it, so it uses the system's" }, "Use the system's instead") : null)) : null);
    };
    var removeComponent = function (id) { setLibrary(function (l) { var n = Object.assign({}, l); n.components = (l.components || []).filter(function (c) { return c.id !== id; }); return n; }); };
    var renameComponent = function (id) {
      var c = (library.components || []).filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      var name = window.prompt("Rename " + c.name, c.name);
      if (name && name.trim()) setLibrary(function (l) { var n = Object.assign({}, l); n.components = l.components.map(function (x) { return x.id === id ? Object.assign({}, x, { name: name.trim().slice(0, 60) }) : x; }); return n; });
    };

    /* A layout written elsewhere (by hand, or by Claude) comes in through the
       same cleaning as a link, and the dialog says what it left out. */
    var openImport = function () {
      setImportText("");
      var dlg = importRef.current;
      if (dlg && dlg.showModal) dlg.showModal();
    };
    var importLayout = function (mode) {
      var read = readLayout(importText);
      if (!read || read.error) return;
      var incoming = read.doc.frames;
      var dlg = importRef.current;
      if (dlg) dlg.close();
      var dropped = read.report.length ? " " + read.report.length + (read.report.length === 1 ? " thing was" : " things were") + " left out." : "";
      if (mode === "replace") {
        storage(function (st) { st.setItem(BACKUP_KEY, JSON.stringify(docRef.current)); });
        commit(read.doc, null, "Opened the pasted layout. Undo to go back." + dropped);
        setTimeout(function () { showFrameRef.current(read.doc.active); }, 0);
        return;
      }
      var firstId = null;
      change(function (d) {
        incoming.forEach(function (f) {
          var c = copy(f);
          c.id = uid();
          if (!firstId) firstId = c.id;
          d.frames.push(c);
        });
        d.frames = d.frames.slice(0, 24);
        if (firstId && frameById(d, firstId)) d.active = firstId;
        return [];
      }, "Added " + incoming.length + (incoming.length === 1 ? " frame" : " frames") + " from the pasted layout." + dropped);
      setTimeout(function () { if (firstId) showFrameRef.current(firstId, true); }, 0);
    };
    var copyLayout = function () {
      var out = withoutUploads(docRef.current);
      copyText(JSON.stringify(out.doc, null, 2)).then(function () {
        announce("Layout JSON copied" + (out.dropped ? ". Uploaded files aren't in it." : "."));
      }, function () { announce("This browser didn't allow copying."); });
    };

    /* ------------------------------------------------- rendering helpers */

    var labelOf = function (n) {
      if (n.name) return n.name;
      var base = scalars[n.type] || {};
      var text = n.props.children != null ? n.props.children : n.props.title != null ? n.props.title : n.props.label != null ? n.props.label : base.children || base.title || base.label || base.name || base.brand;
      return typeof text === "string" || typeof text === "number" ? String(text) : "";
    };
    var typeIcon = function (type) {
      if (TYPE_ICON[type]) return TYPE_ICON[type];
      var g = META[type] && META[type].group;
      if (g && GROUP_TYPE_ICON[g]) return GROUP_TYPE_ICON[g];
      return isContainer(type) ? "box" : "component";
    };
    var nodesOf = function (ids) { return ids.map(function (id) { return locate(doc, id); }).filter(Boolean).map(function (a) { return a.node; }); };
    var same = function (values) { return values.every(function (v) { return JSON.stringify(v) === JSON.stringify(values[0]); }); };
    /* A frame's actions, behind its ellipsis. */
    var frameMenu = function (f, where) {
      return e(Dropdown, { menu: true, label: "Actions for " + f.name, placeholder: "Frame actions", icon: "more", iconOnly: true, compact: true, alignEnd: true, className: "bd-dd-icon bd-frame-menu",
        options: [
          { value: "duplicate", label: "Duplicate frame", icon: "copy" },
          { value: "rename", label: "Rename", icon: "pencil" },
          { value: "fit", label: "Zoom to frame", icon: "fit" },
          { value: "link", label: "Copy link to frame", icon: "link" },
          { value: "png", label: "Export as PNG", icon: "image" },
          { value: "jpeg", label: "Export as JPG", icon: "image" },
          { value: "delete", label: "Delete frame", icon: "trash", disabled: doc.frames.length < 2, danger: true },
        ],
        onChange: function (v) {
          if (v === "duplicate") frameOps.duplicate(f.id);
          if (v === "rename") setRenaming({ id: "frame:" + f.id, where: where });
          if (v === "fit") { activate(f.id); showFrame(f.id); }
          if (v === "link") share(null, f.id);
          if (v === "png" || v === "jpeg") exportImage(f.id, v);
          if (v === "delete") frameOps.remove(f.id);
        } });
    };
    var sizeText = function (f) { return f.width + " × " + (f.hug ? Math.round((boxes[f.id] || {}).h || f.height) : f.height); };

    /* ------------------------------------------------- inspector controls */

    /* A token's dropdown. opts: label, prefix, compact, className, noPreview,
       noneLabel and noneShort (the unset choice, in the list and on the button),
       short (a shorter name for the button), mixedLabel, onChange. */
    /* A token's dropdown. opts: label, prefix, compact, className, noPreview,
       noneLabel and noneShort (the unset choice, in the list and on the button),
       short (a shorter name for the button), mixedLabel, onChange, pxOnly (the
       button shows just the pixels). Options carry their size in pixels and,
       for size and spacing, sit in families: those that suit the selection
       first, the rest after under More. */
    var tokenDropdown = function (key, nodes, id, opts) {
      opts = opts || {};
      var def = DATA.tokens[key];
      var values = nodes.map(function (n) { return n.style[key] || ""; });
      var mixed = !same(values);
      var value = mixed ? "" : values[0];
      var ctx = contextOf(nodes.map(function (n) { return n.type; }));
      var order = def.section === "size" ? ctx.size : def.section === "spacing" ? ctx.space : null;
      var list = def.options.slice();
      if (order) list = list.filter(function (o) { return !o.family || SHARED_FAMILY[o.family] || order.indexOf(o.family) >= 0 || o.value === value; });
      if (order && list.some(function (o) { return o.family; })) {
        var rank = function (o) { var i = order.indexOf(o.family); return i < 0 ? order.length : i; };
        list = list.map(function (o, i) { return { o: o, i: i }; }).sort(function (a, b) { return rank(a.o) - rank(b.o) || a.i - b.i; }).map(function (x) { return x.o; });
      }
      var more = def.section === "size" ? "More sizes" : "More spacing";
      var options = [{ value: "", label: opts.noneLabel || "None", short: opts.noneShort }].concat(list.map(function (o) {
        var px = pxMap[key + "|" + o.value];
        var name = o.value === "fill" && def.section === "size" ? "Fill container" : o.label || o.value;
        var group = order && o.family ? (order.indexOf(o.family) >= 0 ? FAMILY_LABEL[o.family] : more) : undefined;
        var short = opts.pxOnly && px != null ? String(Math.round(px)) : opts.short ? opts.short(o, px) : px != null ? Math.round(px) + " " + name : undefined;
        return { value: o.value, label: name, px: px != null ? Math.round(px) : null, group: group, short: short, hint: o.tokens.join(" · ") || (o.value === "hug" ? "As big as what's in it" : o.value === "fill" ? "As big as its parent allows" : "CSS keyword"), tokens: o.tokens };
      }));
      /* Fixed: its size as drawn now, held by the nearest size token. */
      if (opts.fixed) {
        var lastFit = -1;
        options.forEach(function (o, i) { if (o.value === "hug" || o.value === "fill") lastFit = i; });
        options.splice(lastFit + 1, 0, { value: "__fixed", label: "Fixed", group: options[lastFit] ? options[lastFit].group : undefined, hint: "Its size now, as the nearest size token" });
      }
      var measureFor = function () {
        var a = api(), r = a && nodes[0] ? a.rect(nodes[0].id) : null;
        return r ? (key === "w" || key === "minW" ? r.width : r.height) : null;
      };
      var ids0 = nodes.map(function (n) { return n.id; });
      return e(Dropdown, {
        labelledBy: id || undefined, label: opts.label || def.label, value: value, mixed: mixed, mixedLabel: opts.mixedLabel, options: options,
        preview: opts.noPreview ? null : def.preview, compact: opts.compact, narrow: opts.compact, prefix: opts.prefix, className: opts.className, icon: opts.icon, iconOnly: opts.iconOnly, alignEnd: opts.alignEnd,
        title: (opts.label || def.label) + (order ? ": suggestions for " + ctx.name + " first" : ""),
        onScrub: opts.scrub ? function (v, first) { scrubStyle(ids0, key, v, first); } : undefined, scrubFrom: opts.scrub ? measureFor : undefined,
        onChange: opts.onChange || function (v) { if (v === "__fixed") fixSize(key, nodes); else setStyle(ids0, key, v); },
      });
    };
    /* Fixed: each item keeps the size it's drawn at, as the nearest token. */
    var fixSize = function (key, nodes) {
      var a = api();
      if (!a) return;
      var wide = key === "w" || key === "minW";
      var picks = nodes.map(function (n) { var r = a.rect(n.id); return r ? sizeNear(key, wide ? r.width : r.height, false, true) : null; });
      if (!picks.some(Boolean)) { announce("No size token to hold it at"); return; }
      change(function (d) {
        nodes.forEach(function (n, i) { var at = locate(d, n.id); if (at && picks[i]) at.node.style[key] = picks[i]; });
        return undefined;
      }, (wide ? "Width" : "Height") + " fixed at " + picks.filter(Boolean)[0]);
    };
    /* A size on a small button: its pixels, then a short name. */
    var shortSize = function (o, px) {
      var name = o.value === "hug" ? "Hug" : o.value === "fill" ? "Fill" : /^x(\d+)$/.test(o.value) ? "×" + o.value.slice(1) : String(o.label || o.value).replace(/^container /, "").replace(/^(control|icon|avatar)-/, "");
      return px != null && o.value !== "hug" && o.value !== "fill" ? Math.round(px) + " " + name : name;
    };

    /* A token with one value for every side, or one per side behind a toggle. */
    var tokenControl = function (key, nodes, id, label) {
      var def = DATA.tokens[key];
      var cur = !nodes.some(function (n) { return n.style[key] !== nodes[0].style[key]; }) ? tokenOption(key, nodes[0].style[key]) : null;
      var sides = def.sides;
      var anySide = sides && nodes.some(function (n) { return sides.some(function (k) { return n.style[k]; }); });
      var open = !!sidesOpen[key] || anySide;
      return e(Field, { key: key, id: id, label: label || def.label, hint: cur ? cur.tokens.join(" · ") || null : null },
        e("div", { className: "bd-sides-row" },
          tokenDropdown(key, nodes, id, { className: "bd-dd-field" }),
          sides ? e("button", {
            type: "button", className: "bd-act bd-act-sm", "aria-pressed": String(open), title: "Each side on its own", "aria-label": def.label + ", each side",
            onClick: function () { setSidesOpen(function (s) { var n = Object.assign({}, s); n[key] = !open; return n; }); },
          }, e(Icon, { name: "sides" })) : null),
        sides && open ? e("div", { className: "bd-sides" }, sides.map(function (k) {
          var sdef = DATA.tokens[k];
          return e("span", { key: k, className: "bd-side" },
            tokenDropdown(k, nodes, null, { compact: true, prefix: sdef.side[0].toUpperCase(), className: "bd-dd-field" }));
        })) : null);
    };

    /* Several styles at once, in one undo step. */
    var setStyles = function (ids, patch) {
      change(function (d) {
        var any = false;
        ids.forEach(function (id) {
          var at = locate(d, id);
          if (!at) return;
          any = true;
          Object.keys(patch).forEach(function (k) { if (patch[k] === undefined || patch[k] === "") delete at.node.style[k]; else at.node.style[k] = patch[k]; });
        });
        return any ? undefined : null;
      });
    };
    var setProps = function (ids, patch) {
      change(function (d) {
        var any = false;
        ids.forEach(function (id) {
          var at = locate(d, id);
          if (!at) return;
          any = true;
          Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete at.node.props[k]; else at.node.props[k] = patch[k]; });
        });
        return any ? undefined : null;
      });
    };

    /* Margin around padding around the item, each side its own token, the way
       a box model reads. The name in each ring sets every side at once. */
    var boxModel = function (nodes) {
      var ids = nodes.map(function (n) { return n.id; });
      var side = function (key, all, where) {
        var allValues = nodes.map(function (n) { return n.style[all] || ""; });
        var inherited = same(allValues) ? allValues[0] : "";
        var own = nodes.some(function (n) { return n.style[key]; });
        return e("div", { key: key, className: "bd-box-cell is-" + where },
          tokenDropdown(key, nodes, null, {
            compact: true, noPreview: true, mixedLabel: "~", pxOnly: true, className: cx("bd-box-val", !own && "is-inherited"),
            noneLabel: inherited ? "Same as every side (" + inherited + ")" : "None",
            noneShort: inherited ? (pxMap[all + "|" + inherited] != null ? String(Math.round(pxMap[all + "|" + inherited])) : inherited) : "–",
          }));
      };
      var ring = function (key, title) {
        return tokenDropdown(key, nodes, null, {
          compact: true, noPreview: true, label: title + ", every side", prefix: title, mixedLabel: "", noneShort: "", short: function () { return ""; }, className: "bd-box-all",
          onChange: function (v) {
            var patch = {};
            patch[key] = v || undefined;
            DATA.tokens[key].sides.forEach(function (k) { patch[k] = undefined; });
            setStyles(ids, patch);
          },
        });
      };
      return e("div", { className: "bd-box", role: "group", "aria-label": "Margin and padding" },
        e("div", { className: "bd-box-ring bd-box-m" },
          ring("margin", "Margin"),
          side("marginTop", "margin", "top"), side("marginRight", "margin", "right"), side("marginBottom", "margin", "bottom"), side("marginLeft", "margin", "left"),
          e("div", { className: "bd-box-ring bd-box-p" },
            ring("padding", "Padding"),
            side("paddingTop", "padding", "top"), side("paddingRight", "padding", "right"), side("paddingBottom", "padding", "bottom"), side("paddingLeft", "padding", "left"),
            e("div", { className: "bd-box-core", "aria-hidden": true }))));
    };

    /* Width, height and their minimums, two by two. */
    var sizeGrid = function (nodes) {
      var field = function (key, prefix) {
        return e("div", { key: key }, tokenDropdown(key, nodes, null, { prefix: prefix, short: shortSize, noneLabel: "Auto", noneShort: "Auto", noPreview: true, className: "bd-dd-field", scrub: true, fixed: key === "w" || key === "height" }));
      };
      return e("div", { className: "bd-grid2" }, field("w", "W"), field("height", "H"), field("minW", "Min W"), field("h", "Min H"));
    };

    var selfRow = function (nodes) {
      var ids = nodes.map(function (n) { return n.id; });
      var values = nodes.map(function (n) { return n.style.self || ""; });
      var id = "bd-self-" + nodes[0].id;
      return e(Field, { key: "self", id: id, label: "Align self", note: "Where it sits across its parent's flow" },
        e(Segmented, { labelledBy: id, wide: true, clearable: true, value: same(values) ? values[0] || undefined : null, onChange: function (v) { setStyle(ids, "self", v); },
          options: [["start", "Start", "alignStart"], ["center", "Center", "alignCenter"], ["end", "End", "alignEnd"], ["stretch", "Stretch", "alignStretch"]].map(function (o) { return { value: o[0], label: o[1], icon: o[2] }; }) }));
    };

    /* Direction, wrap, a 3 × 3 alignment pad and the gap, for anything that
       lays its children out with flex. */
    var flexSection = function (nodes, meta) {
      var first = nodes[0];
      var ids = nodes.map(function (n) { return n.id; });
      var base = scalars[first.type] || {};
      var spec = function (name) { return meta.props.filter(function (p) { return p.name === name; })[0]; };
      var dflt = function (p) { return p && p.default != null ? (p.kind === "boolean" ? p.default === "true" : p.default) : undefined; };
      var val = function (name) {
        var p = spec(name);
        var vs = nodes.map(function (n) { return n.props[name] !== undefined ? n.props[name] : base[name] !== undefined ? base[name] : dflt(p); });
        return same(vs) ? vs[0] : undefined;
      };
      var align = spec("align"), justify = spec("justify"), gap = spec("gap");
      var dir = first.type === "Stack" ? "column" : first.type === "Inline" ? "row" : spec("direction") ? val("direction") || "row" : "column";
      var pad = align && justify && ["flex-start", "center", "flex-end"].every(function (v) { return align.options.indexOf(v) >= 0 && justify.options.indexOf(v) >= 0; });
      var a = val("align"), j = val("justify");
      var head = [];
      if (spec("direction")) head.push(e(Segmented, { key: "dir", label: "Direction", value: val("direction"), onChange: function (v) { setProp(ids, "direction", v); },
        options: [{ value: "row", label: "Row", icon: "row" }, { value: "column", label: "Column", icon: "column" }] }));
      if (spec("wrap")) head.push(e("button", { key: "wrap", type: "button", className: "bd-act", "aria-pressed": String(!!val("wrap")), title: val("wrap") ? "Wraps onto new lines" : "Stays on one line", "aria-label": "Wrap onto new lines",
        onClick: function () { setProp(ids, "wrap", !val("wrap")); } }, e(Icon, { name: "wrapLines" })));
      var side = [];
      if (gap) side.push(e(Dropdown, { key: "gap", label: "Gap", prefix: "Gap", value: val("gap"), className: "bd-dd-field", narrow: true,
        options: gap.options.map(function (o) { return { value: o, label: o === "none" ? "None" : o, hint: first.type === "Group" && o !== "none" ? (dir === "row" ? "--dt-space-inline-" : "--dt-space-stack-") + o : undefined }; }),
        onChange: function (v) { setProp(ids, "gap", v); } }));
      if (pad && align.options.indexOf("stretch") >= 0) side.push(e("button", { key: "stretch", type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(a === "stretch"), title: "Children fill the cross axis",
        onClick: function () { setProp(ids, "align", a === "stretch" ? "flex-start" : "stretch"); } }, e(Icon, { name: "alignStretch" }), "Stretch"));
      if (pad && justify.options.indexOf("space-between") >= 0) side.push(e("button", { key: "between", type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(j === "space-between"), title: "Spread children along the main axis",
        onClick: function () { setProp(ids, "justify", j === "space-between" ? "flex-start" : "space-between"); } }, e(Icon, { name: "justifyBetween" }), "Space between"));
      var rest = meta.props.filter(function (p) { return (p.tab || "content") === "layout" && ["direction", "wrap", "gap"].indexOf(p.name) < 0 && !(pad && (p.name === "align" || p.name === "justify")); })
        .map(function (p) { return propControl(p, nodes); }).filter(Boolean);
      if (!head.length && !pad && !side.length && !rest.length) return null;
      return [
        head.length ? e("div", { key: "head", className: "bd-flex-head" }, head) : null,
        pad || side.length ? e("div", { key: "pad", className: "bd-flex-grid" },
          pad ? e(AlignMatrix, { dir: dir, align: a, justify: j, onChange: function (na, nj) { setProps(ids, { align: na, justify: nj }); } }) : null,
          side.length ? e("div", { className: "bd-flex-side" }, side) : null) : null,
      ].concat(rest);
    };

    var libPicks = library.images.map(function (it) { return Object.assign({ kind: "Image" }, it); })
      .concat(library.illustrations.map(function (it) { return Object.assign({ kind: "Illustration" }, it); }));
    var propControl = function (p, nodes) {
      var first = nodes[0];
      var id = "bd-p-" + first.id + "-" + p.name;
      var base = scalars[first.type] || {};
      var dflt = p.default != null ? (p.kind === "boolean" ? p.default === "true" : p.kind === "number" ? Number(p.default) : p.default) : undefined;
      var values = nodes.map(function (n) { var own = n.props[p.name]; return own !== undefined ? own : base[p.name] !== undefined ? base[p.name] : dflt; });
      var mixed = !same(values);
      var current = mixed ? undefined : values[0];
      var ids = nodes.map(function (n) { return n.id; });
      var set = function (v) { setProp(ids, p.name, v); };
      var label = PROP_LABEL[p.name] || words(p.name);
      var control;
      if (p.kind === "list") {
        var fa = api(docRef.current.active);
        var own = first.props[p.name];
        var sample = own !== undefined ? own : fa && fa.listSample ? fa.listSample(first.type, p.name) : null;
        var count = Array.isArray(sample) ? sample.length : 0;
        if (nodes.length > 1) return e(Field, { key: p.name, id: id, label: label, note: p.note, hint: "Select one " + first.type + " to edit its " + label.toLowerCase() + "." }, null);
        if (!Array.isArray(sample)) return e(Field, { key: p.name, id: id, label: label, note: p.note, hint: "Its sample has parts the builder can't edit here (pictures or elements), so it keeps them." }, null);
        return e(Field, { key: p.name, id: id, label: label + (count ? " (" + count + ")" : ""), note: p.note },
          e(ListEditor, { key: first.id + p.name, id: id, label: label, spec: p, value: sample, onChange: function (v) { setProp([first.id], p.name, v); } }));
      }
      if (p.kind === "media") {
        var src = typeof current === "string" ? current : "";
        var fileId = id + "-file";
        var isVideo = /^data:video|\.(mp4|webm|mov)(\?|$)/i.test(src);
        control = e("div", { className: "bd-media" },
          src ? e("span", { className: "bd-media-thumb", style: isVideo ? undefined : { backgroundImage: "url(" + JSON.stringify(src) + ")" }, "aria-hidden": true }, isVideo ? e(Icon, { name: "file" }) : null) : null,
          e("div", { className: "bd-media-actions" },
            e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), "Upload"),
            e("input", { id: fileId, type: "file", className: "visually-hidden", accept: p.name === "poster" || first.type !== "Video" ? "image/*" : "video/*,image/*",
              onChange: function (ev) {
                var file = ev.target.files && ev.target.files[0];
                ev.target.value = "";
                if (!file) return;
                if (file.size > MEDIA_LIMIT) { announce("That file is over 1.5 MB. Paste a URL instead, or use a smaller file."); return; }
                var reader = new FileReader();
                reader.onload = function () { set(String(reader.result)); announce("Uploaded " + file.name + ". It stays in this browser and isn't in share links."); };
                reader.readAsDataURL(file);
              } }),
            src ? e("button", { type: "button", className: "bd-btn", onClick: function () { set(undefined); } }, e(Icon, { name: "close" }), "Clear") : null,
            libPicks.length && !(first.type === "Video" && p.name === "src") ? e(Dropdown, { menu: true, label: "Pick from Content", placeholder: "From Content", compact: true, className: "bd-media-pick",
              options: libPicks.map(function (it) { return { value: it.id, label: it.name, hint: it.kind }; }),
              onChange: function (v) { var it = libPicks.filter(function (x) { return x.id === v; })[0]; if (it) { set(it.src); announce("Picked " + it.name); } } }) : null,
            src && !isVideo && !mixed ? e("button", { type: "button", className: "bd-btn", disabled: !!libBusy, title: "Cut a plain backdrop out of this picture",
              onClick: function () { cutBackground(src).then(function (url) { if (url) set(url); }); } }, e(Icon, { name: "wand" }), "Remove background") : null),
          e("input", { className: "bd-input", type: "url", "aria-label": label + " URL", placeholder: mixed ? "Mixed" : "or paste a URL", value: /^data:/.test(src) ? "" : src,
            onChange: function (ev) { var v = ev.target.value.trim(); set(v && MEDIA_URL.test(v) ? v : undefined); } }));
        return e(Field, { key: p.name, id: id, label: label, note: p.note, hint: /^data:/.test(src) ? "Uploaded file" : null }, control);
      }
      if (p.kind === "enum" && p.name === "tone") {
        var toneMap = TEXT_TYPES[first.type] ? TONE_TEXT : TONE_FILL;
        control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, placeholder: "Default", preview: "color", className: "bd-dd-field bd-dd-swatch",
          options: p.options.map(function (o) { var t = toneMap[o]; return { value: o, label: ENUM_LABEL[o] || String(o), hint: t || "Takes its colour from around it", tokens: t ? [t] : [] }; }) });
      } else if (p.kind === "enum") {
        var icons = ENUM_ICONS[p.name];
        if (icons && p.options.every(function (o) { return icons[o]; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || words(o), icon: icons[o] }; }) });
        } else if (p.options.length <= 3 && p.options.every(function (o) { return String(o).length <= 9; })) {
          control = e(Segmented, { labelledBy: id, value: current, onChange: set, wide: true, options: p.options.map(function (o) { return { value: o, label: String(o) }; }) });
        } else {
          control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, placeholder: "Default",
            options: p.options.map(function (o) { return { value: o, label: ENUM_LABEL[o] || String(o) }; }) });
        }
      } else if (p.kind === "boolean") {
        return e(Field, { key: p.name, id: id, label: label, note: p.note, inline: true }, e(Switch, { labelledBy: id, value: !!current, mixed: mixed, onChange: set }));
      } else if (p.kind === "number" && first.type === "Grid" && p.name === "columns") {
        control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, options: [1, 2, 3, 4, 5, 6].map(function (n) { return { value: n, label: n + (n === 1 ? " column" : " columns") }; }) });
      } else if (p.kind === "number" && first.type === "Carousel" && p.name === "defaultIndex") {
        var count0 = Math.max(1, Math.min.apply(null, nodes.map(function (n) { return (n.children || []).filter(function (c) { return c.type !== "Slot"; }).length || 1; })));
        control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, options: Array.from({ length: count0 }, function (_, i) { return { value: i, label: "Item " + (i + 1) }; }) });
      } else if (p.kind === "number" && first.type === "Carousel" && CAROUSEL_STEPS[p.name]) {
        control = e(Dropdown, { labelledBy: id, value: current, mixed: mixed, onChange: set, placeholder: "Default",
          options: CAROUSEL_STEPS[p.name].map(function (st) { return { value: st[0], label: st[0] + "×", hint: st[1] }; }) });
      } else if (p.kind === "number") {
        control = e("input", { className: "bd-input", type: "number", "aria-labelledby": id, placeholder: mixed ? "Mixed" : "", value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : Number(ev.target.value)); } });
      } else if (p.kind === "text" || (p.kind === "node" && typeof base[p.name] === "string")) {
        control = e("input", { className: "bd-input", type: "text", "aria-labelledby": id, placeholder: mixed ? "Mixed" : "", value: current == null ? "" : String(current), onChange: function (ev) { set(ev.target.value === "" ? undefined : ev.target.value); } });
      } else return null;
      return e(Field, { key: p.name, id: id, label: label, note: p.note }, control);
    };


    /* ------------------------------------------------- the panels */

    /* Content: images, illustrations and icons to reuse, and the icon library
       the system draws with. Video comes later. */
    var LIB_TABS = [["images", "Images", "image"], ["illustrations", "Illustrations", "squiggle"], ["icons", "Icons", "star"], ["video", "Video", "video"]];
    var addToLibrary = function (kind, files) {
      var list = Array.prototype.slice.call(files || []);
      if (!list.length) return;
      setLibBusy("Adding " + (list.length > 1 ? list.length + " files" : list[0].name) + "…");
      Promise.all(list.map(function (f) {
        return readForLibrary(f, kind).then(function (src) { return { id: uid(), name: f.name.replace(/\.[a-z0-9]+$/i, ""), src: src }; }, function (err) { announce(err.message); return null; });
      })).then(function (made) {
        made = made.filter(Boolean);
        setLibBusy(null);
        if (!made.length) return;
        setLibrary(function (l) { var n = Object.assign({}, l); n[kind] = made.concat(l[kind]); return n; });
        announce("Added " + made.length + " to " + kind + ". They stay in this browser.");
      });
    };
    var libUpdate = function (kind, id, patch) {
      setLibrary(function (l) {
        var n = Object.assign({}, l);
        n[kind] = l[kind].map(function (it) { return it.id === id ? Object.assign({}, it, patch) : it; }).filter(function (it) { return !it.removed; });
        return n;
      });
    };
    /* Cuts a plain backdrop out of an image, in place; the original is kept to
       put back. */
    var cutBackground = function (src) {
      setLibBusy("Removing the background…");
      return remover().then(function (R) { return R.remove(src, {}); }).then(function (res) {
        setLibBusy(null);
        announce("Background removed: " + Math.round(res.removed * 100) + "% of the picture is now see-through.");
        return res.dataUrl;
      }, function (err) {
        setLibBusy(null);
        announce(err.message || "Couldn't remove the background.");
        return null;
      });
    };
    var insertAsset = function (it, clip) {
      if (clip) add("Video", null, { src: it.src });
      else add("Image", null, { src: it.src, alt: it.name });
      announce("Added " + it.name + " to " + frame.name);
    };
    /* Content opens on a card for each kind; a card opens its gallery. */
    var contentPanel = function () {
      var q0 = contentQuery.trim().toLowerCase();
      if (!libTab && q0) {
        var hits = [];
        LIB_KINDS.forEach(function (k) { library[k].forEach(function (it) { if (it.name.toLowerCase().indexOf(q0) >= 0) hits.push({ kind: k, it: it }); }); });
        return e("div", { className: "bd-content" },
          e("div", { className: "bd-panel-head" }, e("h2", { className: "bd-panel-title" }, "Results"), e("span", { className: "bd-count" }, hits.length)),
          hits.length ? e("ul", { className: "bd-lib", role: "list" }, hits.map(function (h) {
            var clip = h.kind === "video";
            return e("li", { key: h.it.id, className: "bd-lib-item" },
              e("button", { type: "button", className: "bd-lib-thumb", title: h.it.name + ": drag onto a frame, or press to add",
                onPointerDown: function (ev) { if (ev.pointerType !== "touch") startDrag(ev, { kind: "asset", src: h.it.src, label: h.it.name, media: clip ? "video" : "image" }); },
                onClick: function () { if (!justDragged.current) insertAsset(h.it, clip); } },
                clip ? e("video", { src: h.it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { src: h.it.src, alt: "", draggable: false })),
              e("span", { className: "bd-lib-name" }, h.it.name));
          })) : e("p", { className: "bd-empty-note" }, "Nothing in your content matches."));
      }
      if (!libTab) {
        return e("div", { className: "bd-content" },
          e("div", { className: "bd-panel-head" }, e("h2", { className: "bd-panel-title" }, "Content")),
          e("ul", { className: "bd-kinds", role: "list" }, LIB_TABS.map(function (t) {
            var items = library[t[0]];
            var note = t[0] === "icons" ? (items.length ? items.length + " of yours, and the icon library" : "The icon library, and yours") : items.length ? items.length + (items.length === 1 ? " item" : " items") : "Nothing yet";
            return e("li", { key: t[0] }, e("button", { type: "button", className: "bd-kind", "data-kind": t[0], onClick: function () { setLibTab(t[0]); } },
              e("span", { className: cx("bd-kind-pics", t[0] === "icons" && "is-icons") }, items.length
                ? items.slice(0, 3).map(function (it) { return t[0] === "video" ? e("video", { key: it.id, src: it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { key: it.id, src: it.src, alt: "", draggable: false }); })
                : e(Icon, { name: t[2] })),
              e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, t[1]), e("span", { className: "bd-kind-note" }, note)),
              e(Icon, { name: "right", className: "bd-kind-chev" })));
          })));
      }
      var kind = libTab;
      var cq = contentQuery.trim().toLowerCase();
      var items = library[kind].filter(function (it) { return !cq || it.name.toLowerCase().indexOf(cq) >= 0; });
      var fileId = "bd-lib-file";
      var lib = window.DovetailConfigurePanel && window.DovetailConfigurePanel.config ? window.DovetailConfigurePanel.config().iconLib : null;
      var icons = (window.DovetailConfigure && window.DovetailConfigure.icons) || {};
      return e("div", { className: "bd-content",
        onDragOver: function (ev) { ev.preventDefault(); ev.currentTarget.classList.add("is-drop"); },
        onDragLeave: function (ev) { ev.currentTarget.classList.remove("is-drop"); },
        onDrop: function (ev) { ev.preventDefault(); ev.currentTarget.classList.remove("is-drop"); addToLibrary(kind, ev.dataTransfer.files); } },
        e("div", { className: "bd-panel-head bd-gallery-head" },
          e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Content", title: "Back to Content", onClick: function () { setLibTab(null); } }, e(Icon, { name: "left" })),
          e("h2", { className: "bd-panel-title" }, LIB_TABS.filter(function (t) { return t[0] === kind; })[0][1])),
        kind === "icons" ? e("section", { className: "bd-content-sec", "aria-labelledby": "bd-iconlib" },
          e("h3", { className: "bd-content-h", id: "bd-iconlib" }, "Icon library"),
          e("p", { className: "bd-content-note" }, "The set every component draws its icons from, here and on every page."),
          e("div", { className: "bd-iconlibs", role: "radiogroup", "aria-labelledby": "bd-iconlib" },
            Object.keys(icons).concat(["custom"]).map(function (k) {
              var info = icons[k] || { label: "Custom", note: "Your own set, named in Configure's Media group." };
              return e("button", { key: k, type: "button", role: "radio", className: "bd-iconlib", "aria-checked": String(lib === k),
                onClick: function () { if (window.DovetailConfigurePanel && window.DovetailConfigurePanel.setIconLib) { window.DovetailConfigurePanel.setIconLib(k); setThemeStamp(function (n) { return n + 1; }); } } },
                e("span", { className: "bd-iconlib-name" }, info.label), e("span", { className: "bd-iconlib-note" }, info.note));
            }))) : null,
        e("section", { className: "bd-content-sec", "aria-label": "Your " + kind },
              kind === "icons" ? e("h3", { className: "bd-content-h" }, "Your icons") : null,
              e("div", { className: "bd-content-add" },
                e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), "Upload " + (kind === "icons" ? "SVG icons" : kind === "video" ? "clips" : kind)),
                e("input", { id: fileId, type: "file", multiple: true, className: "visually-hidden", accept: kind === "icons" ? "image/svg+xml,.svg" : kind === "video" ? "video/*" : "image/*",
                  onChange: function (ev) { var f = ev.target.files; addToLibrary(kind, f); ev.target.value = ""; } }),
                e("span", { className: "bd-content-note" }, "or drop files here")),
              libBusy ? e("p", { className: "bd-content-busy", role: "status" }, libBusy) : null,
              items.length ? e("ul", { className: cx("bd-lib", kind === "icons" && "is-icons"), role: "list" }, items.map(function (it) {
                return e("li", { key: it.id, className: "bd-lib-item" },
                  e("button", { type: "button", className: "bd-lib-thumb", title: it.name + ": drag onto a frame, or onto a picture or video to fill it; press to add",
                    onPointerDown: function (ev) { if (ev.pointerType !== "touch") startDrag(ev, { kind: "asset", src: it.src, label: it.name, media: kind === "video" ? "video" : "image" }); },
                    onClick: function () { if (!justDragged.current) insertAsset(it, kind === "video"); } },
                    kind === "video" ? e("video", { src: it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { src: it.src, alt: "", draggable: false })),
                  e("span", { className: "bd-lib-name" }, it.name),
                  e(Dropdown, { menu: true, label: "Actions for " + it.name, icon: "more", compact: true, narrow: true, className: "bd-dd-icon bd-lib-menu",
                    options: [{ value: "insert", label: "Add to " + frame.name, icon: "plus" }]
                      .concat(kind !== "icons" && kind !== "video" ? [{ value: "cut", label: "Remove background", icon: "wand" }] : [])
                      .concat(it.original ? [{ value: "restore", label: "Put the background back", icon: "undo" }] : [])
                      .concat([{ value: "delete", label: "Delete", icon: "trash", danger: true }]),
                    onChange: function (v) {
                      if (v === "insert") insertAsset(it, kind === "video");
                      else if (v === "cut") cutBackground(it.src).then(function (url) { if (url) libUpdate(kind, it.id, { src: url, original: it.original || it.src }); });
                      else if (v === "restore") libUpdate(kind, it.id, { src: it.original, original: undefined });
                      else if (v === "delete") libUpdate(kind, it.id, { removed: true });
                    } }));
              })) : e("div", { className: "bd-empty" }, e(Icon, { name: LIB_TABS.filter(function (t) { return t[0] === kind; })[0][2] }),
                e("p", null, kind === "icons" ? "Upload SVG icons to use as pictures on the canvas." : kind === "video" ? "Upload clips up to 1.5 MB to reuse them: drag one onto a frame, or onto a Video to fill it." : "Upload " + kind + " to reuse them: drag one onto a frame, or onto a picture to fill it."))));
    };

    /* Assets open on five kinds: primitives to build with, the system's
       variables, components, blocks and templates. A kind opens its own
       gallery; a search looks through every component at once. */
    var ASSET_KINDS = [
      ["primitives", "Primitives", "shapes", "Groups, stacks, grids, shapes and type to build with"],
      ["variables", "Variables", "variable", "The system's tokens: colour, spacing, radius, shadow and size"],
      ["components", "Components", "component", "Buttons, forms, navigation, feedback, commerce and chat"],
      ["blocks", "Blocks", "blocks", "Whole page sections, ready to fill"],
      ["templates", "Templates", "file", "Ready-made pages, as new frames or into one"],
    ];
    var KIND_GROUPS = { primitives: ["layout", "typography"], blocks: ["blocks"] };
    var groupsOf = function (kind) {
      if (KIND_GROUPS[kind]) return DATA.groups.filter(function (g) { return KIND_GROUPS[kind].indexOf(g.id) >= 0; });
      if (kind === "components") return DATA.groups.filter(function (g) { return g.id !== "blocks" && KIND_GROUPS.primitives.indexOf(g.id) < 0; });
      return [];
    };
    var usableIn = function (g) { return g.items.filter(function (n) { return !placeable || placeable[n]; }); };
    /* Primitives show as their icon and name; components draw a preview. */
    var PLAIN = {};
    groupsOf("primitives").forEach(function (g) { g.items.forEach(function (n) { PLAIN[n] = true; }); });
    var tileList = function (items) {
      return e("ul", { className: cx("bd-tiles", view === "list" ? "is-list" : "is-grid") }, items.map(function (n) {
        var meta = META[n];
        var plain = PLAIN[n];
        return e("li", { key: n },
          e("button", {
            type: "button", className: cx("bd-tile", plain && "is-icon"), "data-type": n, "aria-label": "Add " + n,
            title: (meta.blurb ? n + ": " + meta.blurb : n) + ". Cmd-drag onto a component to swap it.",
            onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n, thumb: ev.currentTarget.querySelector(".bd-thumb") }); },
            onClick: function (ev) {
              if (justDragged.current) return;
              var s0 = selRef.current;
              if ((ev.metaKey || ev.ctrlKey) && s0.length) { swapNode(s0[s0.length - 1], n, docRef.current.active); return; }
              add(n);
            },
          },
            plain ? e("span", { className: "bd-thumb is-icon", "aria-hidden": true }, e(Icon, { name: TYPE_ICON[n] || BUILDER_ICON[n] || "box", className: "bd-thumb-ic" }))
              : e(Thumb, { type: n, wide: meta.group === "blocks" }),
            e("span", { className: "bd-tile-text" },
              e("span", { className: "bd-tile-name" }, n),
              view === "list" ? e("span", { className: "bd-tile-blurb" }, meta.blurb || "") : null)));
      }));
    };
    var viewToggle = function () {
      return e(Segmented, { label: "View", value: view, onChange: setView, options: [{ value: "grid", label: "Grid", icon: "gridView" }, { value: "list", label: "List", icon: "listView" }] });
    };

    /* A variable picked applies to the selection, where it fits. */
    var VAR_SETS = [
      ["surface", "Fill", "color"], ["border", "Border", "color"], ["padding", "Padding", "space"],
      ["radius", "Radius", "radius"], ["elevation", "Shadow", "shadow"], ["w", "Width", "size"],
    ];
    var applyVar = function (key, value, label) {
      var ids = selRef.current.filter(function (id) { var at = locate(docRef.current, id); return at && at.node.type !== "Slot"; });
      if (!ids.length) { announce("Select a layer on the canvas, then pick a variable to apply it"); return; }
      var patch = {};
      patch[key] = value;
      if (key === "surface") patch.fill = undefined;
      setStyles(ids, patch);
      announce(label + " is " + value + " on " + (ids.length === 1 ? nameOf(locate(docRef.current, ids[0]).node) : ids.length + " layers"));
    };
    var variablesPanel = function () {
      var picked = nodesOf(selection).filter(function (n) { return n.type !== "Slot"; });
      return e("div", { className: "bd-vars" },
        e("p", { className: "bd-content-note bd-vars-note" }, picked.length ? "Press one to apply it to " + (picked.length === 1 ? nameOf(picked[0]) : picked.length + " layers") + "." : "Select a layer on the canvas, then press one to apply it."),
        VAR_SETS.map(function (vs) {
          var def = DATA.tokens[vs[0]];
          if (!def) return null;
          var opts = def.options.filter(function (o) { return vs[0] !== "w" || (o.family !== "fit" && o.family !== "container"); });
          var cur = picked.length && same(picked.map(function (n) { return n.style[vs[0]] || ""; })) ? picked[0].style[vs[0]] || "" : null;
          return e("section", { key: vs[0], className: "bd-vars-sec", "aria-labelledby": "bd-vars-" + vs[0] },
            e("h3", { className: "bd-content-h", id: "bd-vars-" + vs[0] }, vs[1]),
            e("div", { className: cx("bd-vars-list", "is-" + vs[2]) }, opts.map(function (o) {
              var px = pxMap[vs[0] + "|" + o.value];
              var tok = o.tokens[0];
              return e("button", { key: o.value, type: "button", className: "bd-var", "aria-pressed": String(cur === o.value),
                title: (o.tokens.join(" · ") || o.value) + (picked.length ? ". Apply to the selection" : ""),
                onClick: function () { applyVar(vs[0], o.value, vs[1]); } },
                vs[2] === "color" && tok ? e("span", { className: "bd-sw", style: { background: "var(" + tok + ")" }, "aria-hidden": true })
                  : vs[2] === "radius" && tok ? e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + tok + ")" }, "aria-hidden": true })
                  : vs[2] === "shadow" && tok ? e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + tok + ")" }, "aria-hidden": true })
                  : px != null ? e("span", { className: "bd-var-px" }, Math.round(px)) : null,
                e("span", { className: "bd-var-name" }, o.label || o.value));
            })));
        }));
    };

    /* A template never replaces anything: its frames go beside yours, or
       (into) what's on its page goes at the end of the active frame. */
    var addTemplate = function (id, into) {
      var st = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!st) return;
      closeNew();
      var incoming = st[2]().frames;
      if (into) {
        var fid = docRef.current.active;
        var dest = frameById(docRef.current, fid);
        var made = [];
        change(function (d) {
          var f = frameById(d, fid);
          if (!f) return null;
          incoming.forEach(function (src) {
            (src.root.children || []).forEach(function (c) {
              var n = fresh(c);
              if (f.bare || f.mode === "structured" || !joinsFlow(n.type)) { delete n.style.x; delete n.style.y; }
              if (ops.insert(d, "root", f.root.children.length, n, fid)) made.push(n.id);
            });
          });
          d.active = fid;
          return made.length ? made : null;
        }, "Added the " + st[1].toLowerCase() + " to " + (dest ? dest.name : "the frame"));
        return;
      }
      var first = null;
      change(function (d) {
        incoming.forEach(function (f) {
          var c = copy(f);
          c.id = uid();
          c.root = fresh(c.root);
          c.root.id = "root";
          delete c.x; delete c.y;
          if (!first) first = c.id;
          d.frames.push(c);
        });
        d.frames = d.frames.slice(0, 24);
        if (first && frameById(d, first)) d.active = first;
        return [];
      }, "Added the " + st[1].toLowerCase() + " beside your frames");
      setTimeout(function () { if (first) showFrameRef.current(first, true); }, 0);
    };
    var templatesPanel = function () {
      return e("ul", { className: "bd-kinds bd-templates", role: "list" }, STARTERS.filter(function (st) { return st[0] !== "blank"; }).map(function (st) {
        return e("li", { key: st[0] },
          e("div", { className: "bd-kind bd-tpl-card", "data-template": st[0] },
            e("span", { className: "bd-kind-pics" }, e(Icon, { name: "file" })),
            e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, st[1])),
            e("span", { className: "bd-tpl-acts" },
              e("button", { type: "button", className: "bd-btn bd-btn-sm bd-tpl-new", onClick: function () { addTemplate(st[0]); }, title: "As a new frame beside yours" }, e(Icon, { name: "plus" }), "New frame"),
              e("button", { type: "button", className: "bd-btn bd-btn-sm bd-tpl-into", onClick: function () { addTemplate(st[0], true); }, title: "At the end of " + frame.name }, "Into " + frame.name))));
      }));
    };

    var mineList = function (list) {
      return e("ul", { className: "bd-mine", role: "list" }, list.map(function (c) {
        var layers = 0;
        (function walk(n) { layers++; (n.children || []).forEach(walk); })(c.node);
        return e("li", { key: c.id, className: "bd-mine-item" },
          e("button", { type: "button", className: "bd-mine-btn", "data-local": c.id, title: c.name + ": drag onto a frame, or press to add. Built on " + c.tokens.slice(0, 6).join(", ") + (c.tokens.length > 6 ? "…" : ""),
            onPointerDown: function (ev) { startDrag(ev, { kind: "local", comp: c, type: c.node.type, label: c.name }); },
            onClick: function () { if (!justDragged.current) addLocal(c); } },
            e("span", { className: "bd-sys-lead" }, e(Icon, { name: "component" })),
            e("span", { className: "bd-mine-text" }, e("span", { className: "bd-mine-name" }, c.name), e("span", { className: "bd-mine-meta" }, layers + (layers === 1 ? " layer" : " layers") + " · " + c.tokens.length + (c.tokens.length === 1 ? " token" : " tokens")))),
          e(Dropdown, { menu: true, label: "Actions for " + c.name, icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon",
            options: [{ value: "add", label: "Add to " + frame.name, icon: "plus" }, { value: "rename", label: "Rename", icon: "pencil" }, { value: "delete", label: "Delete", icon: "trash", danger: true }],
            onChange: function (v) { if (v === "add") addLocal(c); else if (v === "rename") renameComponent(c.id); else if (v === "delete") removeComponent(c.id); } }));
      }));
    };

    var assetsPanel = function () {
      var q = query.trim().toLowerCase();
      var head = null;
      if (q) {
        var found = [];
        DATA.groups.forEach(function (g) {
          usableIn(g).forEach(function (n) {
            if (n.toLowerCase().indexOf(q) >= 0 || String(META[n].blurb || "").toLowerCase().indexOf(q) >= 0) found.push(n);
          });
        });
        var foundMine = (library.components || []).filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; });
        return e("div", { className: "bd-assets" }, head,
          foundMine.length ? e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "My components", e("span", { className: "bd-count" }, foundMine.length))) : null,
          foundMine.length ? mineList(foundMine) : null,
          e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Results", e("span", { className: "bd-count" }, found.length)), viewToggle()),
          found.length || foundMine.length ? null : e("p", { className: "bd-empty-note" }, "Nothing matches."),
          tileList(found));
      }
      if (!assetKind) {
        return e("div", { className: "bd-assets is-cards" }, head,
          e("ul", { className: "bd-kinds bd-asset-kinds", role: "list" }, ASSET_KINDS.map(function (k) {
            var note = k[3];
            var count = k[0] === "variables" ? VAR_SETS.length + " sets" : k[0] === "templates" ? (STARTERS.length - 1) + " pages" : groupsOf(k[0]).reduce(function (t, g) { return t + usableIn(g).length; }, 0) + " to add";
            return e("li", { key: k[0] }, e("button", { type: "button", className: "bd-kind", "data-asset-kind": k[0], title: note, onClick: function () { setAssetKind(k[0]); } },
              e("span", { className: "bd-kind-pics is-asset" },
                k[0] === "variables" ? e("span", { className: "bd-kind-swatches", "aria-hidden": true }, ["--dt-surface-brand", "--dt-surface-brand-secondary", "--dt-surface-action", "--dt-surface-inverse"].map(function (t) { return e("span", { key: t, style: { background: "var(" + t + ")" } }); }))
                  : e(Icon, { name: k[2] })),
              e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, k[1]), e("span", { className: "bd-kind-count" }, count))));
          })));
      }
      var kind = ASSET_KINDS.filter(function (k) { return k[0] === assetKind; })[0] || ASSET_KINDS[0];
      var back = e("div", { className: "bd-panel-head bd-gallery-head" },
        e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Assets", title: "Back to Assets", onClick: function () { setAssetKind(null); } }, e(Icon, { name: "left" })),
        e("h2", { className: "bd-panel-title" }, kind[1]));
      if (kind[0] === "variables") return e("div", { className: "bd-assets" }, head, back, variablesPanel());
      if (kind[0] === "templates") return e("div", { className: "bd-assets is-cards" }, head, back, templatesPanel());
      var groups = groupsOf(kind[0]);
      /* Components open with yours, then the system's. */
      if (kind[0] === "components") groups = [{ id: "mine", label: "My components", items: [] }].concat(groups);
      var current = groups.filter(function (x) { return x.id === category; })[0] || groups[kind[0] === "components" && (library.components || []).length ? 0 : kind[0] === "components" ? 1 : 0];
      var items = usableIn(current);
      if (current.id === "mine") {
        var mine = library.components || [];
        return e("div", { className: "bd-assets" },
          head, back,
          e("div", { className: "bd-cats", role: "group", "aria-label": "Categories" }, groups.map(function (g) {
            return e("button", { key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(current.id === g.id), onClick: function () { setCategory(g.id); } },
              e(Icon, { name: g.id === "mine" ? "component" : GROUP_ICON[g.id] || "box" }), e("span", { className: "bd-cat-label" }, g.label));
          })),
          e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "My components", e("span", { className: "bd-count" }, mine.length))),
          mine.length ? mineList(mine) : e("div", { className: "bd-empty" }, e(Icon, { name: "component" }),
            e("p", null, "Nothing here yet. Select layers on the canvas and press Create component in the inspector (Ctrl+Alt+K). It has to be built from tokens; the builder says what stops it if not.")));
      }
      return e("div", { className: "bd-assets" },
        head,
        back,
        groups.length > 1 ? e("div", { className: "bd-cats", role: "group", "aria-label": "Categories" },
          groups.map(function (g) {
            var on = current.id === g.id;
            return e("button", {
              key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(on), title: g.label + ": " + usableIn(g).length + " to add",
              onClick: function () { setCategory(g.id); },
            }, e(Icon, { name: GROUP_ICON[g.id] || "box" }), e("span", { className: "bd-cat-label" }, g.label));
          })) : null,
        e("div", { className: "bd-assets-head" },
          e("h3", { className: "bd-assets-title" }, current.label, e("span", { className: "bd-count" }, items.length)),
          viewToggle()),
        items.length ? null : e("p", { className: "bd-empty-note" }, "Nothing here yet."),
        tileList(items));
    };

    /* Containers start open in Layers; a component's slots start folded. */
    var isOpen = function (n) { return n.type === "Root" || isContainer(n.type) ? !collapsed[n.id] : collapsed[n.id] === false; };
    useEffect(function () {
      var opens = {};
      selection.forEach(function (id) {
        var at = locate(doc, id);
        if (at) at.path.slice(1, -1).forEach(function (n) { if (!isOpen(n)) opens[n.id] = isContainer(n.type) ? "del" : false; });
      });
      if (selection.length && openFrames[doc.active] === false) setOpenFrames(function (m) { var nx = Object.assign({}, m); nx[doc.active] = true; return nx; });
      if (!Object.keys(opens).length) return;
      setCollapsed(function (c) { var n = Object.assign({}, c); Object.keys(opens).forEach(function (id) { if (opens[id] === "del") delete n[id]; else n[id] = false; }); return n; });
    }, [selection]);
    var isRenaming = function (id, where) { return !!renaming && renaming.id === id && renaming.where === where; };

    /* Every frame is a row that folds open onto its layers; the active one
       starts open. A component folds open onto what it's made of: its slots,
       which hold real layers, and its own parts, which are set through its
       props and so are shown but can't be picked. */
    var frameIsOpen = function (f) { return openFrames[f.id] !== undefined ? openFrames[f.id] : f.id === doc.active; };
    var isOwner = function (n) { var m = META[n.type]; return !!m && !m.builder && !isContainer(n.type); };
    var PART_ICON = { Heading: "heading", Text: "type", Image: "image", Video: "video", Icon: "star", Button: "pointer", Link: "link", Field: "form", Select: "form", "Text area": "form", Label: "type", List: "listView", Item: "listView", Figure: "figure", Navigation: "compass" };
    var anatomyOf = function (fid, id) { try { var a = api(fid); return a && a.anatomy ? a.anatomy(id) : null; } catch (err) { return null; } };
    var everyNode = function (fn) { doc.frames.forEach(function (f) { (function walk(n) { (n.children || []).forEach(function (c) { fn(c); walk(c); }); })(f.root); }); };
    var layersPanel = function () {
      var q = layerQuery.trim().toLowerCase();
      var toggle = function (id) {
        var at = locate(doc, id);
        var owner = at && !isContainer(at.node.type);
        setCollapsed(function (c) { var n = Object.assign({}, c); if (owner) { if (n[id] === false) delete n[id]; else n[id] = false; } else if (n[id]) delete n[id]; else n[id] = true; return n; });
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
          var tree = anatomyOf(f.id, c.id) || [];
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
          var onPart = part && part.id === r.owner.id && f.id === doc.active;
          return e("div", { key: r.key, className: cx("bd-layer is-part is-pickable", onPart && "is-current"), role: "treeitem", "aria-level": r.depth + 1, "aria-selected": String(!!onPart),
            style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" } },
            e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
            e("button", { type: "button", className: "bd-layer-main", title: "The title of " + r.owner.type + ": its words and size", onClick: function () { pick(r.owner.id, false, false, "layers", f.id, "title"); } },
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
        var on = mine && selection.indexOf(n.id) >= 0;
        var owner = isOwner(n);
        var open = isOpen(n) || (!!q && !owner);
        var folds = !!n.children || owner;
        var renameable = n.type === "Group";
        return e("div", {
          key: n.id, className: cx("bd-layer", on && "is-current", listDrop && listDrop.inside === n.id && "is-drop-inside", hover && hover.f === f.id && hover.id === n.id && "is-hover"),
          "data-layer": mine ? n.id : undefined, "data-frame-row": mine ? undefined : f.id, "data-depth": r.depth, role: "treeitem", "aria-selected": String(on), "aria-level": r.depth + 1,
          "aria-expanded": folds ? String(open) : undefined,
          style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" },
          onPointerEnter: function () { setHover({ f: f.id, id: n.id }); },
          onPointerLeave: function () { setHover(null); },
        },
          folds ? e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + nameOf(n), title: owner && !open ? "Show what " + n.type + " is made of" : undefined, onClick: function () { toggle(n.id); } }, e(Icon, { name: "right" }))
            : e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
          e("button", {
            type: "button", className: "bd-layer-main",
            onClick: function (ev) { if (!justDragged.current) pick(n.id, mine && (ev.shiftKey || ev.metaKey || ev.ctrlKey), false, "layers", f.id); },
            onDoubleClick: function () { if (renameable && mine) setRenaming({ id: n.id, where: "layer" }); },
            onPointerDown: function (ev) { if (mine && ev.pointerType === "mouse" && n.type !== "Slot") startDrag(ev, { kind: "move", id: n.id, label: nameOf(n) }); },
          },
            e(Icon, { name: typeIcon(n.type) }),
            renameable && mine && isRenaming(n.id, "layer")
              ? e(Renamable, { value: n.name || "Group", label: "Group name", startEditing: true, className: "bd-layer-name", onChange: function (v) { setRenaming(null); setName(n.id, v === "Group" ? "" : v); } })
              : e("span", { className: "bd-layer-name" }, nameOf(n)),
            text && !n.name ? e("span", { className: "bd-layer-text" }, text) : null));
      };
      return e("div", { className: "bd-layers-panel" },
        e("div", { className: "bd-layers", ref: layersRef, role: "tree", "aria-label": "Layers", "aria-multiselectable": "true" },
          doc.frames.map(function (f) {
            var on = f.id === doc.active;
            var open = frameIsOpen(f) || !!q;
            var head = e("div", {
              key: "frame-" + f.id, className: cx("bd-layer bd-layer-frame", on && !sel && frameOn && "is-current", on && "is-active-frame", listDrop && listDrop.inside === "frame:" + f.id && "is-drop-inside"),
              "data-layer": on ? "root" : undefined, "data-frame-row": f.id, role: "treeitem", "aria-level": 1,
              "aria-selected": String(on && !sel && frameOn), "aria-expanded": String(open),
            },
              e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + f.name,
                onClick: function () { setOpenFrames(function (m) { var nx = Object.assign({}, m); nx[f.id] = !open; return nx; }); } }, e(Icon, { name: "right" })),
              e("button", {
                type: "button", className: "bd-layer-main", title: on ? "Double-click to rename" : "Show " + f.name,
                onClick: function () { frameOps.pick(f.id, true); },
                onDoubleClick: function () { setRenaming({ id: "frame:" + f.id, where: "layer" }); },
              },
                e(Icon, { name: f.bare ? "component" : "frame" }),
                isRenaming("frame:" + f.id, "layer")
                  ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-layer-name", onChange: function (v) { frameOps.rename(f.id, v); } })
                  : e("span", { className: "bd-layer-name" }, f.name),
                e("span", { className: "bd-layer-text" }, f.bare ? "Loose on the canvas" : sizeText(f))));
            if (!open) return head;
            var rows = rowsFor(f);
            return e(React.Fragment, { key: "frame-" + f.id },
              head,
              rows.length ? rows.map(function (r) { return nodeRow(f, r); }) : e("p", { className: "bd-empty-note bd-empty-indent" }, q ? "No layers match." : "Empty. Add something from Assets."));
          }),
          listDrop && listDrop.indicator ? e("div", { className: "bd-layers-line", style: { top: listDrop.indicator.top + "px", left: listDrop.indicator.left + "px" }, "aria-hidden": true }) : null));
    };

    /* The inspector's tabs. One with nothing to set for this selection is off,
       and the inspector shows Layout instead. */
    var tabBar = function (have, current) {
      return e("div", { className: "bd-itabs", role: "tablist", "aria-label": "Inspector" },
        TABS.filter(function (t) { return have[t[0]] !== undefined; }).map(function (t) {
          var on = current === t[0];
          return e("button", {
            key: t[0], type: "button", role: "tab", id: "bd-itab-" + t[0], className: "bd-itab", "aria-selected": String(on), "aria-controls": "bd-ipanel",
            disabled: !have[t[0]], tabIndex: on ? 0 : -1,
            onClick: function () { setTab(t[0]); },
            onKeyDown: function (ev) {
              if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
              ev.preventDefault();
              var list = TABS.filter(function (x) { return have[x[0]]; }).map(function (x) { return x[0]; });
              var i = list.indexOf(current) + (ev.key === "ArrowRight" ? 1 : -1);
              var next = list[(i + list.length) % list.length];
              setTab(next);
              setTimeout(function () { var b = document.getElementById("bd-itab-" + next); if (b) b.focus(); }, 0);
            },
          }, t[1]);
        }));
    };
    var tabPanel = function (current, children) {
      return e("div", { id: "bd-ipanel", role: "tabpanel", className: "bd-ipanel", "aria-labelledby": "bd-itab-" + current }, children);
    };
    /* The tab follows the kind of layer: what suits it the first time, then
       whatever was last chosen for that kind. */
    var tabKey = function () {
      var ns = nodesOf(selection);
      if (!ns.length) return "__frame";
      return ns.every(function (n) { return n.type === ns[0].type; }) ? ns[0].type : "__mixed";
    };
    var setTab = function (t) { var k = tabKey(); setTabByType(function (m) { var n = Object.assign({}, m); n[k] = t; return n; }); };
    var pickTab = function (have) {
      var k = tabKey();
      var want = tabByType[k] || smartTab(k);
      return have[want] ? want : have.layout ? "layout" : TABS.filter(function (t) { return have[t[0]]; }).map(function (t) { return t[0]; })[0];
    };

    /* A section that remembers whether it's folded, per title. */
    var sec = function (key, title, children, action, changed) {
      return e(Section, { key: key, id: key, title: title, action: action, changed: changed, closed: !!closedSecs[key],
        onToggle: function () { setClosedSecs(function (c) { var n = Object.assign({}, c); if (n[key]) delete n[key]; else n[key] = true; return n; }); } }, children);
    };
    /* Whether a section holds anything set on these items, for its dot. */
    var SPACING_KEYS = Object.keys(DATA.tokens).filter(function (k) { return DATA.tokens[k].section === "spacing"; });
    var styled = function (nodes, keys) { return nodes.some(function (n) { return keys.some(function (k) { return n.style[k] !== undefined; }); }); };
    var propsSet = function (nodes, names) {
      return nodes.some(function (n) {
        var base = scalars[n.type] || {};
        return names.some(function (k) { var v = n.props[k]; return v !== undefined && v !== base[k]; });
      });
    };
    var headAction = function (icon, label, onClick, pressed) {
      return e("button", { type: "button", className: "bd-act bd-act-ghost", title: label, "aria-label": label, "aria-pressed": pressed === undefined ? undefined : String(pressed), onClick: onClick }, e(Icon, { name: icon }));
    };

    /* Fill, border, radius, shadow and mode: pictures to pick from, all tokens. */
    var lookSections = function (nodes, extra) {
      var ids = nodes.map(function (n) { return n.id; });
      var first = nodes[0];
      var sidesOf = DATA.tokens.border.sides;
      var hasBorder = nodes.some(function (n) { return n.style.border || sidesOf.some(function (k) { return n.style[k]; }); });
      var radiusValues = nodes.map(function (n) { return n.style.radius || ""; });
      var shadowValues = nodes.map(function (n) { return n.style.elevation || ""; });
      var hasRadius = nodes.some(function (n) { return n.style.radius; });
      var hasShadow = nodes.some(function (n) { return n.style.elevation; });
      var darkValues = nodes.map(function (n) { return !!n.style.dark; });
      var rid = "bd-radius-" + first.id, sid = "bd-shadow-" + first.id, mid = "bd-mode-" + first.id;
      var free = frame.mode !== "structured";
      var fills = nodes.map(function (n) { return n.style.fill || ""; }), inks = nodes.map(function (n) { return n.style.color || ""; });
      var fillHex = same(fills) ? fills[0] : "", inkHex = same(inks) ? inks[0] : "";
      /* A custom colour, in a free frame only: a swatch that opens the picker. */
      var picker = function (key, value, label, clears) {
        return e(ColorPick, { value: value, on: !!value, label: label,
          onChange: function (v) { var patch = {}; patch[key] = v; if (clears) patch[clears] = undefined; setStyles(ids, patch); } });
      };
      var blendValues = nodes.map(function (n) { return n.style.blend || ""; });
      var invValues = nodes.map(function (n) { return n.style.invert === "on"; });
      var lid = "bd-layer-" + first.id;
      /* Text colour is for text; inverting is for pictures. */
      var textOnly = nodes.every(function (n) { return TEXT_TYPES[n.type]; });
      var picturesOnly = nodes.every(function (n) { return PICTURE_TYPES[n.type]; });
      var blendNow = same(blendValues) ? blendValues[0] : null;
      var blendOpt = blendNow ? DATA.tokens.blend.options.filter(function (o) { return o.value === blendNow; })[0] : null;
      var darkOn = same(darkValues) && darkValues[0];
      var darkToggle = headAction("moon", darkOn ? "Dark band: everything inside resolves dark. Press for inherit." : "Make this a dark band", function () { setStyle(ids, "dark", darkOn ? undefined : true); }, !!darkOn);
      return [
        sec("fill", "Fill", [extra || null,
          free ? e("div", { key: "fillrow", className: "bd-canvas-row" },
            tokenDropdown("surface", nodes, null, { label: "Fill", noneLabel: fillHex ? "Custom colour" : "None", className: "bd-dd-field bd-dd-swatch", onChange: function (v) { setStyles(ids, { surface: v || undefined, fill: undefined }); } }),
            picker("fill", fillHex, "Custom fill colour", "surface"))
            : tokenDropdown("surface", nodes, null, { label: "Fill", noneLabel: "None", className: "bd-dd-field bd-dd-swatch" }),
          free && textOnly ? e(Field, { key: "ink", id: "bd-ink-" + first.id, label: "Text colour", hint: inkHex ? "A custom colour, outside the system's text roles." : "From the system's text roles." },
            e("div", { className: "bd-canvas-row" },
              picker("color", inkHex, "Custom text colour"),
              inkHex ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setStyle(ids, "color", undefined); } }, "Use the system's") : null)) : null,
        ], darkToggle, styled(nodes, ["surface", "fill", "color", "dark"])),
        sec("layer", "Layer", [
          e("div", { key: "blend", className: "bd-blend-row" },
            e("span", { className: "bd-field-label", id: lid }, "Blend"),
            e("span", { className: "bd-blend-now" }, blendNow === null ? "Mixed" : blendOpt ? blendOpt.label || blendOpt.value : "Normal"),
            tokenDropdown("blend", nodes, lid, { label: "Blend mode", noneLabel: "Normal", className: "bd-dd-icon bd-blend-dd", noPreview: true, icon: "swatch", iconOnly: true, compact: true, alignEnd: true })),
          picturesOnly ? e(Field, { key: "invert", id: lid + "-inv", label: "Invert colours", inline: true, note: "Flips the picture to its negative" },
            e(Switch, { labelledBy: lid + "-inv", value: !!invValues[0], mixed: !same(invValues), onChange: function (v) { setStyle(ids, "invert", v ? "on" : undefined); } })) : null,
        ], null, styled(nodes, ["blend", "invert"])),
        sec("border", "Border", hasBorder ? tokenControl("border", nodes, "bd-t-" + first.id + "-border", "Colour") : e("p", { className: "bd-sec-empty" }, "None"),
          hasBorder ? headAction("minus", "Remove the border", function () { var p = { border: undefined }; sidesOf.forEach(function (k) { p[k] = undefined; }); setStyles(ids, p); })
            : headAction("plusSm", "Add a border", function () { setStyle(ids, "border", "default"); }), hasBorder),
        /* Corners and shadow stay out of the way until they're added, as a
           border is. */
        sec("corners", "Corners", hasRadius
          ? e(Field, { key: "radius", id: rid, label: "Radius" },
              e(Segmented, { labelledBy: rid, wide: true, className: "bd-seg-pics", value: same(radiusValues) ? radiusValues[0] || undefined : null, onChange: function (v) { if (v) setStyle(ids, "radius", v); },
                options: DATA.tokens.radius.options.map(function (o) { return { value: o.value, label: o.value + " (" + o.tokens[0] + ")", picture: e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + o.tokens[0] + ")" } }) }; }) }))
          : e("p", { className: "bd-sec-empty" }, "None"),
          hasRadius ? headAction("minus", "Remove the corners", function () { setStyle(ids, "radius", undefined); })
            : headAction("plusSm", "Add corners", function () { setStyle(ids, "radius", DATA.tokens.radius.options.some(function (o) { return o.value === "container"; }) ? "container" : DATA.tokens.radius.options[1].value); }), hasRadius),
        sec("shadow", "Shadow", hasShadow
          ? e(Field, { key: "shadow", id: sid, label: "Elevation" },
              e(Segmented, { labelledBy: sid, wide: true, className: "bd-seg-pics", value: same(shadowValues) ? shadowValues[0] || undefined : null, onChange: function (v) { if (v) setStyle(ids, "elevation", v); },
                options: DATA.tokens.elevation.options.map(function (o) { return { value: o.value, label: "Elevation " + o.value + " (" + o.tokens[0] + ")", picture: e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + o.tokens[0] + ")" } }) }; }) }))
          : e("p", { className: "bd-sec-empty" }, "None"),
          hasShadow ? headAction("minus", "Remove the shadow", function () { setStyle(ids, "elevation", undefined); })
            : headAction("plusSm", "Add a shadow", function () { var opts = DATA.tokens.elevation.options; setStyle(ids, "elevation", (opts[1] || opts[0]).value); }), hasShadow),
      ];
    };

    /* In the flow, or out of it: sticky as the frame scrolls, pinned to the
       frame, or floating over its parent, at a spot and a token offset. */
    var POSITION_DEFAULT_ANCHOR = { sticky: "", pinned: "bottom-right", floating: "top-right" };
    var positionRows = function (nodes) {
      var ids = nodes.map(function (n) { return n.id; });
      /* Placed freely on the frame: where, in pixels of the smallest inset step. */
      if (frame.mode !== "structured" && nodes.every(function (n) { return isFree(n.style); })) {
        var unit = pxMap["padding|2xs"] || 4;
        var xs = nodes.map(function (n) { return n.style.x; }), ys = nodes.map(function (n) { return n.style.y; });
        var fid2 = "bd-free-" + nodes[0].id;
        return [
          e(Field, { key: "free", id: fid2, label: "On the canvas", hint: "Placed where it was dropped, in steps of --dt-space-inset-2xs (" + Math.round(unit) + "px). Drag it to move it, or drop it into a stack to join the flow." },
            e("div", { className: "bd-size-row" },
              e(NumberField, { short: "X", label: "X position", value: same(xs) ? Math.round(xs[0] * unit) : "", onChange: function (v) { setStyles(ids, { x: Math.max(0, Math.min(FREE_MAX, Math.round(v / unit))) }); } }),
              e(NumberField, { short: "Y", label: "Y position", value: same(ys) ? Math.round(ys[0] * unit) : "", onChange: function (v) { setStyles(ids, { y: Math.max(0, Math.min(FREE_MAX, Math.round(v / unit))) }); } }))),
          e("button", { key: "flow", type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setStyles(ids, { x: undefined, y: undefined }); } }, "Put it in the flow"),
        ];
      }
      var pv = nodes.map(function (n) { return n.style.position || ""; });
      var av = nodes.map(function (n) { return n.style.anchor || ""; });
      var position = same(pv) ? pv[0] : null;
      var anchor = same(av) ? av[0] : null;
      var pid = "bd-pos-" + nodes[0].id;
      return [
        e(Field, { key: "pos", id: pid, label: "Position", hint: position === "pinned" ? "Stays put on the frame while it scrolls." : position === "floating" ? "Floats over its parent, out of the flow." : position === "sticky" ? "Scrolls with the page until it reaches its edge, then sticks." : null },
          e(Segmented, { labelledBy: pid, wide: true, value: position === null ? null : position,
            onChange: function (v) {
              v = v || "";
              /* Back in flow, the pin and offset go too; between positions they stay. */
              setStyles(ids, v ? { position: v, anchor: anchor || POSITION_DEFAULT_ANCHOR[v] } : { position: undefined, anchor: undefined, offset: undefined });
            },
            options: [{ value: "", label: "In flow" }, { value: "sticky", label: "Sticky" }, { value: "pinned", label: "Pinned" }, { value: "floating", label: "Floating" }] })),
        position ? e("div", { key: "pin", className: "bd-field" },
          e("span", { className: "bd-field-label" }, "Pin to"),
          e(PinPad, { value: anchor, onChange: function (v) { setStyle(ids, "anchor", v); } },
            tokenDropdown("offset", nodes, null, { label: "Offset from the edge", prefix: "Offset", noneLabel: "Flush to the edge", noneShort: "0", className: "bd-dd-field", noPreview: true }))) : null,
      ];
    };

    var frameInspector = function () {
      var surfaceOptions = DATA.tokens.surface.options.map(function (o) { return { value: o.value, label: o.value, hint: o.tokens[0], tokens: o.tokens }; });
      var b = boxes[frame.id] || { h: frame.height };
      var preset = presetOf(frame);
      var have = { appearance: true, layout: true };
      var current = pickTab(have);
      var body = current === "appearance"
        ? [sec("frame-look", "Frame", [
            e(Field, { key: "fill", id: "bd-pg-surface", label: "Canvas", hint: frame.canvas ? "A custom colour, outside the system's surfaces. Pick a surface to go back." : frame.mode === "structured" ? "A structured page takes the system's surfaces only." : null },
              e("div", { className: "bd-canvas-row" + (frame.mode === "structured" && !frame.canvas ? " is-tokens" : "") },
                e(Dropdown, { labelledBy: "bd-pg-surface", value: frame.canvas ? "" : frame.surface, placeholder: "Custom", preview: "color", className: "bd-dd-field bd-dd-swatch",
                  onChange: function (v) { change(function (d) { var f = active(d); f.surface = v || "base"; delete f.canvas; return undefined; }); }, options: surfaceOptions }),
                e(ColorPick, { value: frame.canvas, on: !!frame.canvas, label: "Custom canvas colour", onChange: function (v) { setFrame("canvas", v); } }))),
          ])]
        : [          sec("frame-mode", "Kind", e(Field, { key: "mode", id: "bd-fr-kind", label: "Frame kind", hint: frame.mode === "structured" ? "Everything sits in Groups, in the flow, with tokens only." : "Place things anywhere, in any colour." },
            e(Segmented, { labelledBy: "bd-fr-kind", wide: true, value: frame.mode === "structured" ? "structured" : "free", onChange: function (v) { if (v) setMode(v); },
              options: [{ value: "free", label: "Freeform" }, { value: "structured", label: "Structured" }] }))),
          sec("frame-flow", "Page layout", [
            e(Field, { key: "char", id: "bd-pg-char", label: "Layout character", hint: "Sets data-layout, which moves every layout layer token together." },
              e(Dropdown, { labelledBy: "bd-pg-char", value: frame.spacing, className: "bd-dd-field", onChange: function (v) { setFrame("spacing", v || ""); }, options: SPACINGS.map(function (s) { return { value: s[0], label: s[1] }; }) })),
            e(Field, { key: "type", id: "bd-pg-type", label: "Type scale", hint: frame.typeScale === "social" ? "data-type-scale=\"social\": body 2.5x, headings 2.75x, display 3x, for a 1080 post read in a feed." : "The page's own sizes." },
              e(Dropdown, { labelledBy: "bd-pg-type", value: frame.typeScale || "", className: "bd-dd-field", onChange: function (v) { setFrame("typeScale", v || undefined, v ? frame.name + " has social type" : frame.name + " has page type"); },
                options: [{ value: "", label: "Page", hint: "The system's sizes" }, { value: "social", label: "Social", hint: "Larger body, steeper headlines, for a 1080 artboard" }] })),
            e(Field, { key: "gap", id: "bd-pg-gap", label: "Gap between sections", hint: frame.gap ? "--dt-layout-stack-" + frame.gap : "None: blocks keep their own rhythm." },
              e(Dropdown, { labelledBy: "bd-pg-gap", value: frame.gap, className: "bd-dd-field", onChange: function (v) { setFrame("gap", v || ""); },
                options: [{ value: "", label: "None" }].concat(DATA.rootGaps.map(function (g) { return { value: g, label: g, hint: "--dt-layout-stack-" + g }; })) })),
          ])];
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("div", { className: "bd-head-row" },
            e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "frame" }),
              e(Renamable, { value: frame.name, label: "Frame name", focusable: true, className: "bd-title-name", startEditing: isRenaming("frame:" + frame.id, "title"), onChange: function (v) { frameOps.rename(frame.id, v); } })),
            e("div", { className: "bd-head-actions" },
              e("button", { type: "button", className: "bd-act bd-act-ghost bd-mode-toggle", "aria-pressed": String(!!frame.dark), "aria-label": "Dark mode",
                title: frame.dark ? "Dark: press for light" : "Light: press for dark", onClick: function () { setFrame("dark", !frame.dark, frame.name + (frame.dark ? " is light" : " is dark")); } },
                e(Icon, { name: frame.dark ? "moon" : "sun" })),
              frameMenu(frame, "title"))),
          e("p", { className: "bd-inspect-sub" }, (frame.hug ? "Hugs its content" : "A fixed screen") + ". Select something in it to change that instead."),
          /* A frame's size is always in view: the first thing a frame or page needs. */
          e("div", { className: "bd-frame-size-head" },
            e(Dropdown, { label: "Device", prefix: "Device", value: preset, placeholder: "Custom", iconValue: true, className: "bd-dd-field", onChange: setPreset,
              options: PRESETS.map(function (p) { return { value: p.id, label: p.label, hint: p.width + " × " + p.height, icon: PRESET_ICON[p.id] || "desktop" }; }) }),
            e("div", { className: "bd-size-row" },
              e(NumberField, { short: "W", label: "Frame width", value: frame.width, onChange: function (v) { setSize(v, undefined); }, onScrub: function (v, first) { setSizeLive(v, undefined, first); } }),
              e(NumberField, { short: "H", label: "Frame height", value: frame.hug ? Math.round(b.h) : frame.height, muted: frame.hug, title: frame.hug ? "Follows the content. Type a height to fix it." : undefined, onChange: function (v) { setSize(undefined, v); }, onScrub: function (v, first) { setSizeLive(undefined, v, first); } }),
              e("button", { type: "button", className: "bd-act bd-act-sm", "aria-pressed": String(!!frame.lock), title: frame.lock ? "Proportions kept: width and height change together" : "Constrain proportions", "aria-label": "Constrain proportions",
                onClick: function () { change(function (d) { var f = active(d); if (f.lock) delete f.lock; else { f.lock = true; if (f.hug) { f.height = side(Math.round(b.h), MAX_HEIGHT, f.height); f.hug = false; } } return undefined; }, frame.lock ? "Width and height change on their own" : "Width and height keep their proportions"); } }, e(Icon, { name: "chain" })),
              e("button", { type: "button", className: "bd-act bd-act-sm", title: "Swap width and height", "aria-label": "Swap width and height", onClick: function () { setSize(frame.height, frame.width); } }, e(Icon, { name: "rotate" }))),
            e(Dropdown, { label: "Resizing", prefix: "Resizing", value: frame.hug ? "hug" : "fixed", className: "bd-dd-field",
              onChange: function (v) { change(function (d) { var f = active(d); f.hug = v === "hug"; if (!f.hug) f.height = side(Math.round(b.h), MAX_HEIGHT, f.height); return undefined; }, v === "hug" ? frame.name + " hugs its contents" : frame.name + " has a fixed height"); },
              options: [{ value: "fixed", label: "Fixed width and height", short: "Fixed", hint: "Stays the size you set, like a device screen", icon: "fit" }, { value: "hug", label: "Hug contents", short: "Hug contents", hint: "Fixed width; the height grows with what's in it", icon: "column" }] }))),
        tabBar(have, current),
        tabPanel(current, body));
    };

    /* One node, or several: the same kind edits every prop together; a mix
       of kinds edits size, spacing and appearance together. */
    /* A slot: what it takes, what's in it, and a way back to the sample. */
    var slotInspector = function (node) {
      var at = locate(doc, node.id);
      var owner = at && at.path.length > 1 ? at.path[at.path.length - 2] : null;
      if (!owner) return null;
      var takes = slotTakes(owner.type, node.props.name);
      var spec = slotSpec(owner.type, node.props.name);
      var refill = function () {
        var tpl = (slotTpl.current[owner.type] || []).filter(function (t) { return t.name === node.props.name; })[0];
        change(function (d) {
          var s2 = locate(d, node.id);
          if (!s2) return null;
          s2.node.children = tpl ? tpl.nodes.map(function (k) { return cleanNode(JSON.parse(JSON.stringify(k)), null); }).filter(function (k) { return k && slotAccepts(owner.type, node.props.name, k.type); }) : [];
          return node.id;
        }, words(node.props.name) + " is back to the sample");
      };
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            at.path.map(function (n, i) {
              var last = i === at.path.length - 1;
              return e(React.Fragment, { key: n.id },
                i ? e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›") : null,
                last ? e("span", { className: "bd-crumb is-current", "aria-current": "true" }, nameOf(n))
                  : e("button", { type: "button", className: "bd-crumb", onClick: function () { select(n.type === "Root" ? [] : [n.id]); } }, n.type === "Root" ? frame.name : nameOf(n)));
            })),
          e("div", { className: "bd-head-row" },
            e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "blocks" }), words(node.props.name))),
          e("p", { className: "bd-inspect-sub" }, "A slot in " + owner.type + (spec && spec.note ? ": " + spec.note : "") + ". It takes " + (takes ? takes.join(", ") : "most components") + ". What you add from Assets now goes in here.")),
        sec("slot-items", "In this slot", node.children.length
          ? e("ul", { className: "bd-slot-items", role: "list" }, node.children.map(function (c) {
              return e("li", { key: c.id }, e("button", { type: "button", className: "bd-btn bd-slot-item", onClick: function () { select([c.id]); } }, e(Icon, { name: typeIcon(c.type) }), nameOf(c), labelOf(c) ? e("span", { className: "bd-layer-text" }, labelOf(c)) : null));
            }))
          : e("p", { className: "bd-sec-empty" }, "Empty: the component shows nothing here.")),
        sec("slot-acts", "Slot", e("div", { className: "bd-media-actions" },
          e("button", { type: "button", className: "bd-btn", onClick: refill }, e(Icon, { name: "undo" }), "Put the sample back"),
          node.children.length ? e("button", { type: "button", className: "bd-btn", onClick: function () { change(function (d) { var s2 = locate(d, node.id); if (!s2) return null; s2.node.children = []; return node.id; }, words(node.props.name) + " emptied"); } }, e(Icon, { name: "trash" }), "Empty it") : null)));
    };

    /* A block's title, picked on the canvas or in Layers: its text and its
       size, which are the block's own props. */
    var partInspector = function (node) {
      var at = locate(doc, node.id);
      var spec = META[node.type].props.filter(function (p) { return p.name === "titleSize"; })[0];
      var base = scalars[node.type] || {};
      var cur = node.props.titleSize || spec.default;
      var text = typeof node.props.title === "string" ? node.props.title : typeof base.title === "string" ? base.title : "";
      var tid = "bd-part-text-" + node.id, sid = "bd-part-size-" + node.id;
      var styleName = function (v) { var t = TEXT_STYLES.filter(function (x) { return x[0] === v; })[0]; return t ? t[1] : v; };
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          at ? e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            at.path.map(function (n) {
              return e(React.Fragment, { key: n.id },
                n.type === "Root" ? null : e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›"),
                e("button", { type: "button", className: "bd-crumb", onClick: function () { setPart(null); select(n.id === "root" ? [] : [n.id]); } }, n.type === "Root" ? frame.name : nameOf(n)));
            }),
            e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›"),
            e("span", { className: "bd-crumb", "aria-current": "true" }, "Title")) : null,
          e("div", { className: "bd-head-row" },
            e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "heading" }), "Title"),
            e("div", { className: "bd-head-actions" }, headAction("left", "Back to " + nameOf(node), function () { setPart(null); }))),
          e("p", { className: "bd-inspect-sub" }, "The heading " + nameOf(node) + " draws. Its words and size are the block's own props; Shift+Up and Shift+Down step the size.")),
        e("div", { className: "bd-ipanel" },
          sec("part-title", "Text style", [
            e(Field, { key: "size", id: sid, label: "Size", hint: "--dt-text-" + cur + "-size" },
              e(Dropdown, { labelledBy: sid, value: cur, className: "bd-dd-field", onChange: function (v) { setProp([node.id], "titleSize", v === spec.default ? undefined : v); },
                options: spec.options.map(function (o) { var px = pxMap["text|" + o]; return { value: o, label: styleName(o), px: px != null ? Math.round(px) : null, short: (px != null ? Math.round(px) + " " : "") + styleName(o), hint: o + (o === spec.default ? " · the default" : "") }; }) })),
            e(Field, { key: "text", id: tid, label: "Words", hint: "Double-click it on the canvas to type in place" },
              e("input", { className: "bd-input", type: "text", "aria-labelledby": tid, value: text, onChange: function (ev) { setProp([node.id], "title", ev.target.value); } })),
          ], null, node.props.titleSize !== undefined)));
    };

    var nodeInspector = function (nodes) {
      var first = nodes[0];
      var many = nodes.length > 1;
      if (!many && part && part.id === first.id && hasTitlePart(first.type)) return partInspector(first);
      var sameType = nodes.every(function (n) { return n.type === first.type; });
      var meta = sameType ? META[first.type] || { props: [] } : { props: [] };
      var base = scalars[first.type] || {};
      var byTab = function (t) { return meta.props.filter(function (p) { return (p.tab || "content") === t; }); };
      var textId = "bd-text-" + first.id;
      var hasText = sameType && !meta.container && !meta.builder && (typeof base.children === "string" || typeof first.props.children === "string");
      var columnsId = "bd-cols-" + first.id;
      var ids = nodes.map(function (n) { return n.id; });
      var selected = !many ? locate(doc, first.id) : null;
      var textValues = nodes.map(function (n) { return n.props.children != null ? String(n.props.children) : String(base.children || ""); });
      var contentRows = (hasText ? [e(Field, { key: "text", id: textId, label: "Text", hint: many ? null : "Double-click it on the canvas to type in place" },
        e("input", { className: "bd-input", type: "text", "aria-labelledby": textId, placeholder: same(textValues) ? "" : "Mixed", value: same(textValues) ? textValues[0] : "",
          onChange: function (ev) { setProp(ids, "children", ev.target.value); } }))] : [])
        .concat(byTab("content").map(function (p) { return propControl(p, nodes); }).filter(Boolean));
      var flex = sameType ? flexSection(nodes, meta) : null;
      if (sameType && first.type === "Grid") flex = (flex || []).concat([e(Field, { key: "cols", id: columnsId, label: "Responsive columns", hint: first.props.minColumnWidth ? "Fits columns at least this wide; ignores columns." : "Off: uses columns." },
        e(Dropdown, { labelledBy: columnsId, value: first.props.minColumnWidth || "", className: "bd-dd-field", onChange: function (v) { setProp(ids, "minColumnWidth", v || undefined); },
          options: [{ value: "", label: "Off" }].concat(DATA.columnWidths.map(function (w) { return { value: w.value, label: w.label, hint: w.token }; })) }))]);
      var styleRows = byTab("appearance").map(function (p) { return propControl(p, nodes); }).filter(Boolean);
      var toned = meta.props.some(function (p) { return p.name === "tone"; });
      var have = { appearance: true, layout: true, content: contentRows.length > 0 };
      var current = pickTab(have);
      var body;
      var propNames = function (t) { return byTab(t).map(function (p) { return p.name; }).concat(t === "content" && hasText ? ["children"] : []).concat(t === "layout" && first.type === "Grid" ? ["minColumnWidth"] : []); };
      if (current === "content") body = [sec("content", "Content", contentRows, null, propsSet(nodes, propNames("content")))];
      else if (current === "layout") {
        body = [
          flex && flex.filter(Boolean).length ? sec("flex", first.type === "Grid" ? "Grid layout" : flex[0] || flex[1] ? "Flex layout" : "Arrangement", flex, null, propsSet(nodes, propNames("layout"))) : null,
          sec("size", "Size", [sizeGrid(nodes), selfRow(nodes)], null, styled(nodes, ["w", "minW", "height", "h", "self"])),
          sec("spacing", "Spacing", boxModel(nodes), null, styled(nodes, SPACING_KEYS)),
          sec("position", "Position", positionRows(nodes), null, styled(nodes, ["position", "anchor", "offset", "x", "y"])),
        ];
      } else {
        body = [styleRows.length ? sec("style", "Style", styleRows, null, propsSet(nodes, propNames("appearance"))) : null]
          .concat(lookSections(nodes, toned ? e("p", { key: "note", className: "bd-note" }, "Tone, under Style, paints this one's own background. Fill sits underneath it.") : null));
      }
      var title = many ? nodes.length + " " + (sameType ? first.type + (first.type.endsWith("s") ? "" : "s") : "items") : null;
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          selected ? e("nav", { className: "bd-crumbs", "aria-label": "Selection path" },
            selected.path.map(function (n, i) {
              var isLast = i === selected.path.length - 1;
              var name = n.type === "Root" ? frame.name : nameOf(n);
              return e(React.Fragment, { key: n.id },
                i ? e("span", { className: "bd-crumb-sep", "aria-hidden": true }, "›") : null,
                isLast ? e("span", { className: "bd-crumb", "aria-current": "true" }, name)
                  : e("button", { type: "button", className: "bd-crumb", onClick: function () { select(n.id === "root" ? [] : [n.id]); } }, name));
            })) : null,
          e("div", { className: "bd-head-row" },
            e("h2", { className: "bd-inspect-title" }, e(Icon, { name: sameType ? typeIcon(first.type) : "component" }),
              many ? title : isContainer(first.type) && first.type === "Group"
                ? e(Renamable, { value: first.name || "Group", label: "Group name", focusable: true, className: "bd-title-name", startEditing: isRenaming(first.id, "title"), onChange: function (v) { setRenaming(null); setName(first.id, v === "Group" ? "" : v); } })
                : nameOf(first)),
            e("div", { className: "bd-head-actions", role: "toolbar", "aria-label": "Selection" },
              e(Dropdown, { menu: true, label: "Wrap in", placeholder: "Wrap in", icon: "wrap", iconOnly: true, compact: true, alignEnd: true, className: "bd-dd-icon", title: "Wrap in a container",
                options: WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return { value: w, label: "Wrap in " + w, icon: typeIcon(w) }; }),
                onChange: actions.wrap }),
              !many && first.type === "Group"
                ? headAction("group", "Ungroup (Ctrl+Shift+G)", actions.ungroup)
                : headAction("group", "Group (Ctrl+G)", actions.group),
              !many && detachable[first.type] ? headAction("detach", "Detach into primitives", actions.detach) : null,
              !many ? headAction("link", "Copy a link to this layer", function () { share(first.id); }) : null,
              headAction("component", "Create component (Ctrl+Alt+K)", openComponent))),
          many ? e("p", { className: "bd-inspect-sub" }, sameType ? "Changes apply to all of them. Mixed means they differ." : "Different components: size, spacing and appearance apply to all of them.")
            : meta.blurb ? e("p", { className: "bd-inspect-sub" }, meta.blurb + ".", meta.href ? e(React.Fragment, null, " ", e("a", { href: meta.href }, "Docs")) : null) : null),
        tabBar(have, current),
        tabPanel(current, body));
    };

    /* ------------------------------------------------- layout */

    var canUndo = history.current.past.length > 0;
    var canRedo = history.current.future.length > 0;
    var selectedNodes = nodesOf(selection);
    var savedText = saved.ok ? "Saved" : "Not saved";
    var savedTitle = saved.ok
      ? "Saved in this browser" + (saved.at ? " at " + saved.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "") + ". It stays when you reload or come back."
      : "This browser won't keep your work (a private window, blocked storage, or too many uploads). Use Share or Code to keep it.";
    var hidePanels = wide && (bare || preview);
    hidePanelsRef.current = hidePanels;
    var zoomText = Math.round(cam.z * 100) + "%";

    var toolbar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
      e("button", { type: "button", ref: newBtnRef, className: "bd-act bd-start", title: "New: a free canvas, a structured page or a template", "aria-label": "New", "aria-haspopup": "dialog", "aria-expanded": String(!!newOpen), onClick: function (ev) { if (newOpen) closeNew(); else openNew(ev.currentTarget); } }, e(Icon, { name: "plus" })),
      e("span", { className: "bd-tool-group" },
        e("button", { type: "button", className: "bd-act", onClick: undo, disabled: !canUndo, title: "Undo (Ctrl+Z)", "aria-label": "Undo" }, e(Icon, { name: "undo" })),
        e("button", { type: "button", className: "bd-act", onClick: redo, disabled: !canRedo, title: "Redo (Ctrl+Shift+Z)", "aria-label": "Redo" }, e(Icon, { name: "redo" }))),
      e(Dropdown, { menu: true, label: "Zoom, " + zoomText, placeholder: zoomText, compact: true, narrow: true, className: "bd-zoom", icon: "zoomIn",
        options: [
          { value: "in", label: "Zoom in", hint: "Ctrl +" }, { value: "out", label: "Zoom out", hint: "Ctrl −" },
          { value: "all", label: "Zoom to fit", hint: "Shift 1" }, { value: "frame", label: "Zoom to " + frame.name, hint: "Shift 2" },
          { value: 0.5, label: "50%" }, { value: 1, label: "100%", hint: "Shift 0" }, { value: 2, label: "200%" },
        ],
        onChange: function (v) {
          if (v === "in") zoomStep(1); else if (v === "out") zoomStep(-1); else if (v === "all") fitAll(); else if (v === "frame") showFrame(frame.id); else zoomTo(v);
        } }),
      e("span", { className: "bd-tool-spacer" }),
      e("span", { className: cx("bd-saved", !saved.ok && "is-error"), title: savedTitle, role: "status" }, e(Icon, { name: saved.ok ? "check" : "alert" }), e("span", { className: "bd-saved-text" }, savedText)),
      wide ? e("button", { type: "button", className: "bd-act", "aria-pressed": String(bare), title: (bare ? "Show" : "Hide") + " panels (Tab)", "aria-label": "Hide panels", onClick: actions.panels }, e(Icon, { name: "panels" })) : null,
      e("button", { type: "button", className: "bd-act", title: "Play: see " + frame.name + " in a screen-sized window, scrolling like a device", "aria-label": "Play", disabled: !ready[frame.id], onClick: function () { openPlay(); } }, e(Icon, { name: "play" })),
      e("button", { type: "button", className: "bd-act", "aria-pressed": String(preview), title: "Preview: use the components (Esc to stop)", "aria-label": "Preview", onClick: actions.preview }, e(Icon, { name: "eye" })),
      e("button", { type: "button", className: "bd-act", onClick: function () { share(); }, title: sel ? "Copy a link to the selected layer" : "Copy a link to " + frame.name, "aria-label": "Copy link" }, e(Icon, { name: "link" })),
      e("button", { type: "button", className: "bd-btn bd-btn-primary bd-export", onClick: openCode, disabled: !ready[frame.id], title: "Export: code, a picture or the layout" }, e(Icon, { name: "exportOut" }), "Export"));

    /* ------------------------------------------------- drawing */

    /* What each tool puts down. */
    var toolNode = function (kind, size) {
      if (kind === "box") {
        var box = make("Group", { direction: "column", gap: "sm" }, [], { padding: "md", border: "subtle", radius: "container" });
        if (size) { box.style.w = size.w; box.style.h = size.h; }
        return box;
      }
      var m = /^comp:(\w+)$/.exec(kind);
      if (m && META[m[1]]) {
        if (m[1] === "Text") return make("Text", { children: "Text" });
        if (m[1] === "Heading") return make("Heading", { children: "Heading" });
        return make(m[1]);
      }
      return null;
    };
    /* A tool dropped at a point a drag resolved, in that frame; with no
       point, a click on the bar, into the selection or the active frame. */
    var placeTool = function (kind, hit) {
      if (kind === "frame" || kind === "page") { frameOps.add(null, kind === "page"); return; }
      var node = toolNode(kind, null);
      if (!node) return;
      if (!hit) hit = target();
      if (hit.free) node.style.x = hit.free.x, node.style.y = hit.free.y;
      var fid = hit.frame || docRef.current.active;
      var fr = frameById(docRef.current, fid);
      change(function (d) { d.active = fid; return ops.insert(d, hit.parent, hit.index, node, fid); }, "Added " + (node.type === "Shape" ? node.props.shape : node.type) + (fr ? " to " + fr.name : ""));
      if (kind === "comp:Text" || kind === "comp:Heading") setTimeout(function () { beginEditRef.current(node.id); }, 350);
    };
    /* Hand: a drag anywhere on the canvas pans it. */
    var handHandlers = {
      onPointerDown: function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        releaseFocus();
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
        gesture("down", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
      },
      onPointerMove: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("move", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
      onPointerUp: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
      onPointerCancel: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
    };
    var usable = function (it) { var m = /^comp:(\w+)$/.exec(it.id); return !m || !placeable || placeable[m[1]]; };
    /* Select and Hand are modes; everything else goes straight in. Drag one
       from the bar to put it exactly where it should go. */
    var pickTool = function (it) {
      if (it.soon) { announce(it.label + " are coming soon."); return; }
      if (it.id === "select" || it.id === "hand") { setTool(it.id); announce(it.label); return; }
      setLastTool(function (m) { var n = Object.assign({}, m); n[it.group || TOOL_INFO[it.id].group] = it.id; return n; });
      setTray(null);
      placeTool(it.id, null);
    };
    pickToolRef.current = pickTool;
    var shownGroup = TOOLBAR.filter(function (t) { return t && t.group === trayShown; })[0];
    /* Press to pick; press and drag to drop the thing itself on the canvas. */
    var toolDrag = function (it) {
      return function (ev) {
        if (it.soon || it.id === "select" || it.id === "hand" || ev.pointerType === "touch") return;
        startDrag(ev, { kind: "tool", tool: it.id, label: it.label });
      };
    };
    var navTool = tool === "hand" ? "hand" : "select";
    var tools = e("div", { className: "bd-tools", role: "toolbar", "aria-label": "Tools" },
      shownGroup ? e("div", { className: cx("bd-tray", tray && "is-open"), id: "bd-tray", role: "group", "aria-label": shownGroup.label, "aria-hidden": tray ? undefined : "true", inert: tray ? undefined : "" },
        shownGroup.items.filter(usable).map(function (it) {
          return e("button", {
            key: it.id, type: "button", className: cx("bd-tray-item", it.soon && "is-soon"), "aria-pressed": String(tool === it.id), "aria-disabled": it.soon ? "true" : undefined, tabIndex: tray ? undefined : -1,
            title: it.soon ? it.label + ": coming soon" : (it.hint ? it.label + ": " + it.hint : it.label) + (it.key ? " (" + it.key + ")" : "") + ". Drag it onto the canvas, or press then click.",
            onPointerDown: toolDrag(it),
            onClick: function () { if (!justDragged.current) pickTool(it); },
          }, e(Icon, { name: it.icon }), e("span", { className: "bd-tray-label" }, it.label), it.soon ? e("span", { className: "bd-tray-soon" }, "Soon") : null);
        })) : null,
      e("div", { className: "bd-tools-row" },
        TOOLBAR.map(function (t, i) {
          if (!t) return e("span", { key: "sep" + i, className: "bd-tools-sep", "aria-hidden": true });
          if (t.nav) {
            var on = tool === "select" || tool === "hand";
            return e("button", {
              key: "nav", type: "button", className: cx("bd-tool bd-tool-nav", navTool === "hand" && "is-hand"), "aria-pressed": String(on),
              "aria-label": navTool === "hand" ? "Hand. Press for Select" : "Select. Press for Hand",
              title: navTool === "hand" ? "Hand (H): drag to pan. Press for Select (V)" : "Select (V). Press for Hand (H)",
              onClick: function () { pickTool(TOOL_INFO[tool === "select" ? "hand" : "select"]); },
            }, e("span", { className: "bd-nav-icons", "aria-hidden": true }, e(Icon, { name: "pointer", className: "bd-nav-pointer" }), e(Icon, { name: "hand", className: "bd-nav-hand" })));
          }
          var face = TOOL_INFO[TOOL_INFO[tool] && TOOL_INFO[tool].group === t.group ? tool : lastTool[t.group] || t.items[0].id];
          var on2 = !!(TOOL_INFO[tool] && TOOL_INFO[tool].group === t.group);
          return e("button", {
            key: t.group, type: "button", className: cx("bd-tool bd-tool-group", tray === t.group && "is-expanded"), "aria-pressed": String(on2),
            "aria-expanded": String(tray === t.group), "aria-controls": tray === t.group ? "bd-tray" : undefined,
            "aria-label": t.label + ", " + face.label, title: t.label + ": " + t.items.filter(function (x) { return !x.soon; }).map(function (x) { return x.label; }).join(", "),
            onPointerDown: toolDrag(face),
            onClick: function () { if (!justDragged.current) setTray(tray === t.group ? null : t.group); },
          }, e(Icon, { name: face.icon }), e("span", { className: "bd-tool-caret", "aria-hidden": true }));
        })));

    /* A frame's right and bottom edges, and its corner, drag to resize it. A
       page lands on a standard viewport size; a frame snaps to one nearby. */
    var startResize = function (ev, f, edge) {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      releaseFocus();
      /* Captured, so the pointer stays with the handle over the frames. */
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      var b = layoutRef.current.boxes[f.id];
      var z = camRef.current.z;
      var start = { x: ev.clientX, y: ev.clientY, w: f.width, h: b.h };
      var cur = null;
      /* A structured page lands on a viewport size; a freeform canvas takes any. */
      var lo = minSide(f), snaps = f.mode === "structured";
      var fit = function (v, list) { return snaps ? snapSide(v, list, f.hug, 16 / z) : Math.round(v); };
      var move = function (mv) {
        var dx = (mv.clientX - start.x) / z, dy = (mv.clientY - start.y) / z;
        var w = edge === "b" ? start.w : Math.max(lo, Math.min(MAX_WIDTH, fit(start.w + dx, VIEW_W)));
        var h = edge === "r" ? null : Math.max(lo, Math.min(MAX_HEIGHT, fit(start.h + dy, VIEW_H)));
        /* Proportions kept: the edge pulled leads, the other side follows. */
        if (f.lock) {
          var k = start.h / start.w;
          if (edge === "b") w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(h / k)));
          else if (edge === "r") h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(w * k)));
          else if (Math.abs(dx) >= Math.abs(dy)) { w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(start.w + dx))); h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(w * k))); }
          else { h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(start.h + dy))); w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(h / k))); }
        }
        cur = { fid: f.id, w: w, h: h };
        setResizing(cur);
      };
      var up = function (ok) {
        return function () {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          setResizing(null);
          if (!ok || !cur) return;
          var done = cur;
          change(function (d) {
            var fr = frameById(d, f.id);
            if (!fr) return null;
            fr.width = done.w;
            if (done.h != null) { fr.height = done.h; fr.hug = false; }
            d.active = f.id;
            return undefined;
          }, f.name + " is " + done.w + " by " + (done.h != null ? done.h : "its content"));
        };
      };
      var onUp = up(true), onCancel = up(false);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    };
    /* A frame's name drags it anywhere on the canvas. It keeps its spot from
       then on, and so do the others, so moving one doesn't shuffle the rest.
       With Cmd or Ctrl and Shift held (on its name or anywhere on it), the
       drag leaves the frame where it is and drops a copy. */
    var frameDrag = useRef(null);
    var beginFrameDrag = function (f, x0, y0, dup) {
      var b = layoutRef.current.boxes[f.id];
      if (!b) return null;
      var z = camRef.current.z;
      var start = { x: x0, y: y0, bx: b.x, by: b.y };
      var cur = null, moved = false;
      return {
        move: function (x, y) {
          var dx = (x - start.x) / z, dy = (y - start.y) / z;
          if (!moved && Math.abs(dx) + Math.abs(dy) < 4 / z) return;
          moved = true;
          cur = { fid: f.id, x: Math.round(start.bx + dx), y: Math.round(start.by + dy), w: b.w, h: b.h, name: f.name };
          if (dup) setDupFrame(cur); else setMovingFrame(cur);
        },
        end: function (ok) {
          setMovingFrame(null);
          setDupFrame(null);
          if (!ok || !cur) return;
          justDragged.current = true;
          setTimeout(function () { justDragged.current = false; }, 60);
          if (dup) { frameOps.duplicate(f.id, { x: cur.x, y: cur.y }); return; }
          var done = cur;
          var boxesNow = layoutRef.current.boxes;
          change(function (d) {
            d.frames.forEach(function (fr) { if (typeof fr.x !== "number" && boxesNow[fr.id]) { fr.x = Math.round(boxesNow[fr.id].x); fr.y = Math.round(boxesNow[fr.id].y); } });
            var fr2 = frameById(d, done.fid);
            if (!fr2) return null;
            fr2.x = done.x; fr2.y = done.y;
            d.active = done.fid;
            return undefined;
          }, "Moved " + f.name);
        },
      };
    };
    var startFrameMove = function (ev, f) {
      if (ev.button !== 0 || ev.pointerType === "touch") return;
      var dr = beginFrameDrag(f, ev.clientX, ev.clientY, ev.shiftKey && (ev.metaKey || ev.ctrlKey));
      if (!dr) return;
      /* No text selection or native drag starts from the name, and the
         pointer stays with it over the frames. */
      ev.preventDefault();
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      var move = function (mv) { dr.move(mv.clientX, mv.clientY); };
      var up = function (ok) {
        return function () {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          dr.end(ok);
        };
      };
      var onUp = up(true), onCancel = up(false);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    };
    var frameDragFrom = function (fid, phase, x, y) {
      if (phase === "down") {
        var f = frameById(docRef.current, fid);
        frameDrag.current = f ? beginFrameDrag(f, x, y, true) : null;
        return;
      }
      var dr = frameDrag.current;
      if (!dr) return;
      if (phase === "move") { dr.move(x, y); return; }
      frameDrag.current = null;
      dr.end(phase === "up");
    };
    var frameDragRef = useRef(frameDragFrom); frameDragRef.current = frameDragFrom;
    var sizeName = function (w, h) {
      var p = PRESETS.filter(function (x) { return x.width === w && (h == null || x.height === h); })[0];
      return w + " × " + (h == null ? "hug" : h) + (p ? " · " + p.label : "");
    };
    var resizers = e("div", { className: "bd-resizers", "aria-hidden": true },
      doc.frames.map(function (f) {
        var b = boxes[f.id];
        if (!b || f.bare) return null;
        var X = cam.x + b.x * cam.z, Y = cam.y + b.y * cam.z, W = b.w * cam.z, H = b.h * cam.z;
        var r = resizing && resizing.fid === f.id ? resizing : null;
        return e(React.Fragment, { key: f.id },
          e("div", { className: "bd-resize is-r", style: { left: X + W - 4, top: Y, height: H }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { startResize(ev, f, "r"); } }),
          e("div", { className: "bd-resize is-b", style: { left: X, top: Y + H - 4, width: W }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { startResize(ev, f, "b"); } }),
          e("div", { className: "bd-resize is-c", style: { left: X + W - 7, top: Y + H - 7 }, title: "Drag to resize " + f.name, onPointerDown: function (ev) { startResize(ev, f, "c"); } }),
          r ? e("div", { className: "bd-resize-tag", style: { left: X + W, top: Y + H } }, sizeName(r.w, r.h != null ? r.h : f.hug ? null : f.height)) : null);
      }));

    var isBackground = function (t) { return t === stageRef.current || (t.classList && (t.classList.contains("bd-world") || t.classList.contains("bd-labels"))); };
    var frameSrc = mountEl.getAttribute("data-frame");
    var anyReady = doc.frames.some(function (f) { return ready[f.id]; });

    var stageDark = stageColor && (function (h) { var r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b2 = parseInt(h.slice(5, 7), 16); return (0.2126 * r + 0.7152 * g + 0.0722 * b2) / 255 < 0.5; })(stageColor);
    var stage = e("div", {
      className: cx("bd-stage", drag && "is-dragging", (space || panning || tool === "hand") && "is-panning", preview && "is-preview", stageDark && "is-dark"), ref: stageRef,
      style: stageColor ? { backgroundColor: stageColor } : undefined,
      onPointerDown: function (ev) {
        if (!isBackground(ev.target) && !spaceRef.current && ev.button !== 1) return;
        if (ev.button === 2) return;
        ev.preventDefault();
        releaseFocus();
        try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
        gesture("down", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
      },
      onPointerMove: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("move", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
      onPointerUp: function (ev) {
        if (!gest.current.pts[ev.pointerId]) return;
        var moved = gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
        if (!moved && isBackground(ev.target) && !spaceRef.current) { select([]); setFrameOn(false); if (editRef.current) editDone(true); }
      },
      onPointerCancel: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
    },
      e("div", { className: "bd-world", style: { transform: "translate(" + cam.x + "px, " + cam.y + "px) scale(" + cam.z + ")" } },
        doc.frames.map(function (f) {
          var b = boxes[f.id];
          return e("iframe", {
            key: f.id, className: cx("bd-frame", f.id === doc.active && "is-active", f.bare && "is-bare"),
            ref: function (el) { if (el) frameEls.current[f.id] = el; else delete frameEls.current[f.id]; },
            title: "Frame " + f.name + ", " + f.width + " by " + Math.round(b.h) + " pixels", src: frameSrc,
            onLoad: function () { frameReady(f.id); },
            style: { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" },
          });
        })),
      e("div", { className: "bd-labels" },
        doc.frames.map(function (f) {
          var b = boxes[f.id];
          var on = f.id === doc.active;
          if (f.bare) return null;
          return e("div", {
            key: f.id, className: cx("bd-flabel", on && "is-current", on && !sel && frameOn && "is-selected"),
            style: { left: cam.x + b.x * cam.z + "px", top: cam.y + b.y * cam.z + "px", maxWidth: Math.max(80, b.w * cam.z) + "px" },
          },
            isRenaming("frame:" + f.id, "label")
              ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-flabel-name", onChange: function (v) { frameOps.rename(f.id, v); } })
              : e("button", {
                type: "button", className: "bd-flabel-btn", title: f.name + ", " + sizeText(f) + ". Drag to move it, Cmd-Shift-drag to drop a copy, double-click to rename.",
                onPointerDown: function (ev) { startFrameMove(ev, f); },
                onClick: function () { if (!justDragged.current) frameOps.pick(f.id); },
                onDoubleClick: function () { setRenaming({ id: "frame:" + f.id, where: "label" }); },
              }, e("span", { className: "bd-flabel-name" }, f.name)),
            e("span", { className: "bd-flabel-size" }, sizeText(f)),
            on && !preview ? frameMenu(f, "label") : null);
        })),
      e("div", { className: "bd-marks", "aria-hidden": true },
        !preview && frameOn && boxes[frame.id] && !frame.bare ? e("div", { className: cx("bd-ring", !sel && "is-selected"), style: { left: cam.x + boxes[frame.id].x * cam.z, top: cam.y + boxes[frame.id].y * cam.z, width: boxes[frame.id].w * cam.z, height: boxes[frame.id].h * cam.z } }) : null,
        !preview && marks.hover ? e("div", { className: "bd-mark bd-mark-hover", style: marks.hover }) : null,
        !preview ? marks.sel.map(function (m) {
          var at = locate(doc, m.id);
          if (!at) return null;
          var isMain = m.id === sel && !edit;
          /* At the top of the stage, or of its frame (where the frame's name
             sits), the tag goes inside the box. */
          var frameTop = boxes[frame.id] ? cam.y + boxes[frame.id].y * cam.z : 0;
          return e("div", { key: m.id, className: cx("bd-mark bd-mark-sel", m.id !== sel && "is-extra", (m.r.top < 24 || m.r.top - frameTop < 24) && "is-top"), style: m.r },
            isMain ? e("span", {
              className: "bd-mark-tag", title: "Drag to move",
              onPointerDown: function (ev) { ev.preventDefault(); ev.stopPropagation(); startDrag(ev, { kind: "move", id: at.node.id, label: at.node.type }); },
            }, nameOf(at.node) + (part && part.id === m.id ? " › Title" : "")) : null);
        }) : null,
        marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
        marks.drop && marks.drop.box ? e("div", { className: cx("bd-mark-box", marks.drop.swap && "is-swap"), style: marks.drop.box }) : null,
        dupFrame ? e("div", { className: "bd-dup", style: { left: cam.x + dupFrame.x * cam.z, top: cam.y + dupFrame.y * cam.z, width: dupFrame.w * cam.z, height: dupFrame.h * cam.z } },
          e("span", { className: "bd-dup-tag" }, e(Icon, { name: "copy" }), dupFrame.name + " copy")) : null),
      spacing ? e("div", { className: "bd-spacing" }, spacing.lines.map(function (l, i) {
        var r = toStage({ left: Math.min(l.x1, l.x2), top: Math.min(l.y1, l.y2), width: Math.abs(l.x2 - l.x1), height: Math.abs(l.y2 - l.y1) }, spacing.fid);
        if (!r) return null;
        var across = Math.abs(l.x2 - l.x1) >= Math.abs(l.y2 - l.y1);
        return e(React.Fragment, { key: i },
          e("div", { className: cx("bd-spacing-line", across ? "is-x" : "is-y"), style: across ? { left: r.left, top: r.top, width: r.width } : { left: r.left, top: r.top, height: r.height }, "aria-hidden": true }),
          e("button", { type: "button", className: "bd-spacing-tag", disabled: !l.owner, title: l.owner ? "Open this in the inspector" : "Not set by a token on either item",
            style: { left: r.left + (across ? r.width / 2 : 0), top: r.top + (across ? 0 : r.height / 2) },
            onPointerDown: function (ev) { ev.stopPropagation(); },
            onClick: function () { if (l.owner) openToken(l.owner, l.sec); } }, l.label));
      })) : null,
      !preview && tool === "hand" ? e("div", Object.assign({ className: "bd-draw is-hand" }, handHandlers)) : null,
      !preview ? resizers : null,
      !preview ? tools : null,
      edit && edit.box ? e(InlineEditor, { key: edit.id, value: edit.value, box: edit.box, font: edit.font, scale: cam.z, onChange: editChange, onDone: editDone }) : null,
      preview ? e("button", { type: "button", className: "bd-float bd-float-center", onClick: actions.preview, title: "Back to editing (Esc)" }, e(Icon, { name: "eye" }), "Previewing", e("span", { className: "bd-float-sep", "aria-hidden": true }), "Edit") : null,
      anyReady ? null : e("p", { className: "bd-stage-loading" }, "Loading the canvas…"));

    /* Play: the frame through a screen-sized window. It scrolls inside, so
       sticky, pinned and floating items behave as they would on a device. */
    var openPlay = function () { setPlay({ fid: frame.id, h: playDefault(frame.width) }); };
    var renderPlay = function () {
      var el = playFrameRef.current;
      var fr = play && frameById(docRef.current, play.fid);
      var a = null;
      try { a = el && el.contentWindow && el.contentWindow.BuilderFrame; } catch (err) { a = null; }
      if (a && fr) a.render({ page: { dark: fr.dark, surface: fr.surface, canvas: fr.canvas, spacing: fr.spacing, gap: fr.gap, typeScale: fr.typeScale }, root: fr.root }, { preview: true, hug: false });
    };
    var playDialog = function () {
      var fr = play && frameById(doc, play.fid);
      if (!fr) return null;
      var sc = playBox.w ? Math.min(1, (playBox.w - 32) / fr.width, playBox.h / play.h) : 0.5;
      var hs = playHeights(fr.width);
      /* A theater: the screen alone on a dark stage, its name and Close at
         the top, and the screen sizes in a bar along the foot where the
         canvas keeps its tools. */
      return e("dialog", { className: "bd-play", ref: playRef, "aria-labelledby": "bd-play-title", onClose: function () { setPlay(null); } },
        e("div", { className: "bd-play-head" },
          e("div", { className: "bd-play-intro" },
            e("h2", { id: "bd-play-title" }, fr.name),
            e("p", { className: "bd-play-sub" }, fr.width + " × " + play.h + ". Scroll inside it; pinned and sticky items behave as on the device.")),
          e("button", { type: "button", className: "bd-act bd-play-close", "aria-label": "Close", title: "Close (Esc)", onClick: function () { playRef.current.close(); } }, e(Icon, { name: "close" }))),
        e("div", { className: "bd-play-stage", ref: playStageRef },
          e("div", { className: "bd-play-device", style: { width: Math.round(fr.width * sc), height: Math.round(play.h * sc) } },
            e("iframe", { ref: playFrameRef, src: frameSrc, title: fr.name + ", " + fr.width + " by " + play.h, onLoad: renderPlay,
              style: { width: fr.width, height: play.h, transform: "scale(" + sc + ")" } }))),
        e("div", { className: "bd-play-bar", role: "toolbar", "aria-label": "Screen height" },
          e(Segmented, { label: "Screen height", value: play.h, onChange: function (v) { if (v) setPlay(Object.assign({}, play, { h: v })); },
            options: hs.map(function (x) { return { value: x[0], label: String(x[0]), title: x[1] + ", " + x[0] + " tall" }; }) })));
    };

    var NEW_KINDS = [
      ["free", "Freeform canvas", "frame", "Anything anywhere, any colour"],
      ["structured", "Structured page", "layout", "Groups and tokens, ready for code"],
    ];
    var newMenu = function () {
      if (!newOpen) return null;
      return ReactDOM.createPortal(e("div", { className: "bd-newmenu", ref: newRef, role: "dialog", "aria-label": "New", style: { left: newOpen.left, top: newOpen.top } },
        e("p", { className: "bd-newmenu-h" }, "New"),
        e("div", { className: "bd-newmenu-kinds" }, NEW_KINDS.map(function (k) {
          return e("button", { key: k[0], type: "button", className: "bd-new-kind", "data-kind": k[0], onClick: function () { newFrame(k[0]); } },
            e("span", { className: "bd-new-pic", "aria-hidden": true }, e(Icon, { name: k[2] })),
            e("span", { className: "bd-new-text" }, e("span", { className: "bd-new-name" }, k[1]), e("span", { className: "bd-new-note" }, k[3])));
        })),
        e("p", { className: "bd-newmenu-h" }, "Templates"),
        e("ul", { className: "bd-new-list", role: "list" }, STARTERS.filter(function (st) { return st[0] !== "blank"; }).map(function (st) {
          return e("li", { key: st[0], className: "bd-new-tpl", "data-template": st[0] },
            e(Icon, { name: "file" }),
            e("span", { className: "bd-new-tpl-name" }, st[1]),
            e("button", { type: "button", className: "bd-new-add", title: "As a new frame beside yours", onClick: function () { addTemplate(st[0]); } }, "New frame"),
            e("button", { type: "button", className: "bd-new-into", title: "At the end of " + frame.name, onClick: function () { addTemplate(st[0], true); } }, "Into frame"));
        })),
        e("div", { className: "bd-newmenu-foot" },
          e("button", { type: "button", className: "bd-new-item", "data-new": "import", onClick: function () { startFrom("import"); } }, e(Icon, { name: "upload" }), e("span", null, "Paste a layout…")),
          e("button", { type: "button", className: "bd-new-item is-danger", "data-new": "blank", onClick: function () { startFrom("blank"); } }, e(Icon, { name: "trash" }), e("span", null, "Start over with a blank frame")))), document.body);
    };

    var importDialog = function () {
      var read = readLayout(importText);
      var ok = read && !read.error;
      var formatHref = mountEl.getAttribute("data-format") || "assets/builder-layouts.md";
      return e("dialog", { className: "bd-code bd-import", ref: importRef, "aria-labelledby": "bd-import-title" },
        e("div", { className: "bd-code-head" },
          e("div", { className: "bd-code-intro" },
            e("h2", { id: "bd-import-title" }, "Paste a layout"),
            e("p", { className: "bd-inspect-sub" }, "Paste builder JSON (from Claude, a teammate or Copy layout JSON) or a builder link. Only the components, props and tokens the builder can set come in. ",
              e("a", { href: formatHref, target: "_blank", rel: "noopener" }, "The layout format"), ".")),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { importRef.current.close(); } }, e(Icon, { name: "close" })))),
        e("div", { className: "bd-import-body" },
          e("textarea", { className: "bd-import-text", "aria-label": "Layout JSON or link", spellCheck: false, value: importText, placeholder: '{ "frames": [ { "name": "Home", "width": 1280, "hug": true, "root": { "children": [ { "type": "HeroBlock" } ] } } ] }',
            onChange: function (ev) { setImportText(ev.target.value); } }),
          e("div", { className: "bd-import-report", role: "status", "aria-live": "polite" },
            !read ? e("p", { className: "bd-sec-empty" }, "Nothing pasted yet.")
              : read.error ? e("p", { className: "bd-import-error" }, e(Icon, { name: "alert" }), read.error)
              : e(React.Fragment, null,
                e("p", { className: "bd-import-ok" }, e(Icon, { name: "check" }),
                  read.doc.frames.length + (read.doc.frames.length === 1 ? " frame, " : " frames, ") + read.layers + (read.layers === 1 ? " layer" : " layers") + ": " + read.doc.frames.map(function (f) { return f.name + " (" + f.width + (f.hug ? " wide, hugging" : " × " + f.height) + ")"; }).join(", ")),
                read.report.length ? e("div", { className: "bd-import-dropped" },
                  e("p", null, read.report.length + (read.report.length === 1 ? " thing will be left out:" : " things will be left out:")),
                  e("ul", null, read.report.slice(0, 12).map(function (line, i) { return e("li", { key: i }, line); })),
                  read.report.length > 12 ? e("p", null, "and " + (read.report.length - 12) + " more.") : null) : e("p", { className: "bd-sec-empty" }, "Everything in it comes in."))),
          e("div", { className: "bd-import-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", disabled: !ok, onClick: function () { importLayout("add"); } }, e(Icon, { name: "plus" }), ok ? "Add " + (read.doc.frames.length === 1 ? "the frame" : read.doc.frames.length + " frames") : "Add"),
            e("button", { type: "button", className: "bd-btn", disabled: !ok, onClick: function () { importLayout("replace"); } }, "Replace all frames"))));
    };

    /* Nothing picked, not even a frame: the builder's own settings. */
    var STAGE_SWATCHES = [["", "Default"], ["#ffffff", "White"], ["#e7e7ea", "Light grey"], ["#3a3a40", "Dark grey"], ["#141416", "Black"]];
    var builderInspector = function () {
      var bid = "bd-stage-bg";
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("div", { className: "bd-head-row" }, e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "panels" }), "Canvas")),
          e("p", { className: "bd-inspect-sub" }, "The builder's own settings. Select a frame, or something in one, to change that instead.")),
        e("div", { className: "bd-ipanel" },
          sec("builder-canvas", "Canvas", [
            e(Field, { key: "bg", id: bid, label: "Background", hint: stageColor ? "Behind every frame. It isn't part of any design." : "The builder's default, behind every frame." },
              e("div", { className: "bd-canvas-row" },
                e(Segmented, { labelledBy: bid, className: "bd-seg-pics bd-stage-swatches", value: STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }) ? stageColor : null,
                  onChange: function (v) { setStageColor(v || ""); },
                  options: STAGE_SWATCHES.map(function (x) { return { value: x[0], label: x[1], picture: e("span", { className: cx("bd-stage-chip", !x[0] && "is-default"), style: x[0] ? { background: x[0] } : undefined }) }; }) }),
                e(ColorPick, { value: STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }) ? "" : stageColor, on: !!stageColor && !STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }), label: "Custom background colour", fallback: stageColor || "#e7e7ea", onChange: setStageColor }))),
          ]),
          /* Nothing selected: what the system offers, rather than a list of
             frames (Layers has those). */
          sec("builder-vars", "Variables", [
            sysGroup("colour", "Colour", DATA.tokens.surface.options.slice(0, 16).map(function (o) {
              return sysRow(o.value, e("span", { className: "bd-sw bd-sys-sw", style: { background: tints[o.tokens[0]] || "var(" + o.tokens[0] + ")" } }), o.value, o.tokens[0]);
            })),
            sysGroup("space", "Spacing", DATA.tokens.padding.options.filter(function (o) { return !o.family || o.family === "inset"; }).slice(0, 8).map(function (o) {
              var px = pxMap["padding|" + o.value];
              return sysRow(o.value, e("span", { className: "bd-sys-bar", style: { width: px != null ? Math.min(28, Math.round(px)) + "px" : "8px" } }), o.value, px != null ? Math.round(px) + "px" : o.tokens[0]);
            })),
            sysGroup("radius", "Radius", DATA.tokens.radius.options.map(function (o) {
              return sysRow(o.value, e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + o.tokens[0] + ")" } }), o.value, o.tokens[0]);
            })),
            e("div", { key: "acts", className: "bd-media-actions" },
              e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setLeft("assets"); setAssetKind("variables"); } }, e(Icon, { name: "variable" }), "Apply from Assets"),
              e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setLeft("configure"); } }, e(Icon, { name: "sliders" }), "Change in Configure")),
          ]),
          sec("builder-prims", "Primitives", [
            e("p", { key: "n", className: "bd-sec-empty" }, "Press one to add it to " + frame.name + ", or drag it onto the canvas."),
            e("ul", { key: "list", className: "bd-sys-list", role: "list" }, DATA.groups.filter(function (g) { return g.id === "layout" || g.id === "typography"; }).reduce(function (a, g) { return a.concat(g.items); }, []).filter(function (n) { return !placeable || placeable[n]; }).map(function (n) {
              return e("li", { key: n }, e("button", { type: "button", className: "bd-sys-item bd-sys-prim", "data-type": n, title: META[n].blurb ? n + ": " + META[n].blurb : n,
                onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n }); },
                onClick: function () { if (!justDragged.current) add(n); } },
                e("span", { className: "bd-sys-lead" }, e(Icon, { name: typeIcon(n) })),
                e("span", { className: "bd-sys-name" }, n),
                e("span", { className: "bd-sys-meta" }, META[n].blurb || "")));
            })),
          ]),
          sec("builder-styles", "Styles", [
            sysGroup("text", "Text", TEXT_STYLES.map(function (t) {
              var px = pxMap["text|" + t[0]];
              return sysRow(t[0], e("span", { className: "bd-sys-ag", style: { fontFamily: "var(--dt-text-" + t[0] + "-family)", fontWeight: "var(--dt-text-" + t[0] + "-weight)" } }, "Ag"), t[1], px != null ? Math.round(px) + "px" : "", "--dt-text-" + t[0] + "-size");
            })),
            sysGroup("fx", "Shadow", DATA.tokens.elevation.options.map(function (o) {
              return sysRow(o.value, e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + o.tokens[0] + ")" } }), "Elevation " + o.value, o.tokens[0]);
            })),
          ])));
    };
    /* The system at rest, as list rows: what it shows, its name, its detail. */
    var sysRow = function (key, lead, name, meta, title) {
      return e("li", { key: key, className: "bd-sys-item", title: title || meta },
        e("span", { className: "bd-sys-lead", "aria-hidden": true }, lead),
        e("span", { className: "bd-sys-name" }, name),
        e("span", { className: "bd-sys-meta" }, meta));
    };
    var sysGroup = function (key, label, rows) {
      return e("div", { key: key, className: "bd-sys-row" },
        e("span", { className: "bd-sys-label" }, label),
        e("ul", { className: "bd-sys-list", role: "list" }, rows));
    };
    var inspector = selectedNodes.length === 1 && selectedNodes[0].type === "Slot" ? slotInspector(selectedNodes[0]) || frameInspector()
      : selectedNodes.length ? nodeInspector(selectedNodes.filter(function (n) { return n.type !== "Slot"; }).length ? selectedNodes.filter(function (n) { return n.type !== "Slot"; }) : selectedNodes)
      : frameOn ? frameInspector() : builderInspector();
    var slot = wide ? document.getElementById("app-toolbar") : null;

    return e(React.Fragment, null,
      slot ? ReactDOM.createPortal(toolbar, slot) : null,
      e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
        [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
            t[1], t[0] === "edit" && selectedNodes.length ? e("span", { className: "bd-tab-note" }, " · " + (selectedNodes.length > 1 ? selectedNodes.length : selectedNodes[0].type)) : null);
        })),
      e("div", { className: cx("bd-shell", hidePanels && "is-bare"), "data-pane": pane },
        e("aside", { className: "bd-left", ref: leftPanelRef, "aria-label": "Assets, layers, content and configure", hidden: hidePanels || undefined },
          e("div", { className: "bd-left-tabs bd-rail", role: "tablist", "aria-label": "Left panel", "aria-orientation": wide ? "vertical" : "horizontal" },
            RAIL.map(function (r) {
              return e("button", { key: r[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === r[0]), "aria-controls": "bd-left-body", title: r[2],
                onClick: function () { setLeft(r[0]); } }, e(Icon, { name: r[3] }), e("span", { className: "bd-rail-label" }, r[1]));
            })),
          e("div", { className: "bd-left-body", id: "bd-left-body", role: "tabpanel" },
            left === "configure" ? e("div", { className: "bd-config-dock", ref: dockRef })
              : e(React.Fragment, null,
                e("div", { className: "bd-left-main" }, left === "assets" ? assetsPanel() : left === "layers" ? layersPanel() : contentPanel()),
                left === "assets" ? e(SearchField, { className: "bd-search-dock", label: "Search components", placeholder: "Search all components", value: query, onChange: setQuery })
                  : left === "layers" ? e(SearchField, { className: "bd-search-dock", label: "Filter layers", placeholder: "Filter layers", value: layerQuery, onChange: setLayerQuery })
                  : e(SearchField, { className: "bd-search-dock", label: "Search content", placeholder: "Search your content", value: contentQuery, onChange: setContentQuery })))),
        e("div", { className: "bd-center" }, slot ? null : toolbar, stage),
        e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef, hidden: hidePanels || undefined }, inspector)),
      drag && drag.ghost ? (function () {
        var g = drag.ghost, z = g.flat ? 1 : cam.z, grab = g.grab || { x: 0, y: 0 };
        var x = drag.spot ? drag.spot.x : drag.x - grab.x * z, y = drag.spot ? drag.spot.y : drag.y - grab.y * z;
        return e("div", { className: cx("bd-ghost-el", g.flat && "is-flat"), style: { left: x + "px", top: y + "px", width: g.w * z + "px", height: g.h * z + "px" }, "aria-hidden": true },
          e("div", { className: "bd-ghost-inner", style: { width: g.w + "px", height: g.h + "px", transform: "scale(" + z + ")" }, dangerouslySetInnerHTML: { __html: g.html } }));
      })() : drag && !drag.inside ? e("div", { className: "bd-ghost", style: { left: drag.x + "px", top: drag.y + "px" }, "aria-hidden": true }, drag.label) : null,
      e("dialog", { className: "bd-code", ref: dialogRef, "aria-labelledby": "bd-code-title" },
        e("div", { className: "bd-code-head" },
          e("div", { className: "bd-code-intro" },
            e("h2", { id: "bd-code-title" }, "Export: " + (codeTitle || frame.name)),
            e("p", { className: "bd-inspect-sub" }, "React with @dovetail-ds/react. Sample data from the specimens is included so it renders as you see it; replace it with your own. Or take " + frame.name + " as a picture, or every frame as layout JSON.")),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: function () { copyText(code).then(function () { announce("Code copied"); }); } }, e(Icon, { name: "copy" }), "Copy code"),
            e("a", { className: "bd-btn", href: "data:text/plain;charset=utf-8," + encodeURIComponent(code), download: ((codeTitle || frame.name).replace(/[^\w]+/g, "") || "Screen") + ".jsx" }, "Download .jsx"),
            e("button", { type: "button", className: "bd-btn", onClick: function () { exportImage(frame.id, "png"); }, title: frame.name + " as a PNG, at twice its size" }, e(Icon, { name: "image" }), "PNG"),
            e("button", { type: "button", className: "bd-btn", onClick: function () { exportImage(frame.id, "jpeg"); }, title: frame.name + " as a JPG, at twice its size" }, "JPG"),
            e("button", { type: "button", className: "bd-btn", onClick: copyLayout, title: "Every frame as builder JSON, to paste back here or hand to Claude" }, "Copy layout JSON"),
            e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" })))),
        e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, code))),
      newMenu(),
      importDialog(),
      componentDialog(),
      playDialog(),
      e("div", { className: "visually-hidden", role: "status", "aria-live": "polite" }, say));
  }

  /* Tooltips: a resting pointer on anything with a title shows it after a
     beat, in the builder's own style. The title moves to data-tip so the
     browser's own tip doesn't show as well; an element named only by its
     title keeps that name as its aria-label. Touch never shows one. */
  (function installTips() {
    var DELAY = 650;
    var tip = null, timer = 0, owner = null;
    var inScope = function (el) { return mountEl.contains(el) || (el.closest && el.closest("#app-toolbar, .bd-dd-list")); };
    var target = function (el) {
      while (el && el.nodeType === 1) {
        if (el.tagName === "IFRAME") return null;
        if (el.hasAttribute("title") || el.hasAttribute("data-tip")) return el;
        if (el === mountEl || el === document.body) return null;
        el = el.parentElement;
      }
      return null;
    };
    var claim = function (el) {
      var t = el.getAttribute("title");
      if (t) {
        el.setAttribute("data-tip", t);
        el.removeAttribute("title");
        if (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && !el.textContent.trim()) el.setAttribute("aria-label", t);
      }
      return el.getAttribute("data-tip");
    };
    var hide = function () {
      clearTimeout(timer);
      timer = 0;
      owner = null;
      if (tip) { tip.remove(); tip = null; }
    };
    var show = function (el) {
      var text = el.isConnected ? el.getAttribute("data-tip") : null;
      if (!text) return;
      tip = document.createElement("div");
      tip.className = "bd-tip";
      tip.setAttribute("role", "tooltip");
      tip.textContent = text;
      (el.closest("dialog[open]") || document.body).appendChild(tip);
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, gap = 8;
      var top = r.top - h - gap < 8 ? r.bottom + gap : r.top - h - gap;
      var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      tip.style.top = Math.round(top) + "px";
      tip.style.left = Math.round(left) + "px";
      tip.classList.add(top > r.top ? "is-below" : "is-above");
    };
    document.addEventListener("pointerover", function (ev) {
      if (ev.pointerType === "touch") return;
      var el = target(ev.target);
      if (el === owner) return;
      hide();
      if (!el || !inScope(el) || !claim(el)) return;
      owner = el;
      timer = setTimeout(function () { timer = 0; if (owner === el) show(el); }, DELAY);
    }, true);
    document.addEventListener("pointerout", function (ev) {
      if (owner && (!ev.relatedTarget || !owner.contains(ev.relatedTarget))) hide();
    }, true);
    ["pointerdown", "keydown", "wheel", "scroll", "blur"].forEach(function (type) {
      (type === "blur" ? window : document).addEventListener(type, hide, true);
    });
  })();

  mountEl.textContent = "";
  ReactDOM.createRoot(mountEl).render(e(App));
})();
