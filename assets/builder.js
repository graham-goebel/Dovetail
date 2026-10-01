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
   hug, dark, surface, spacing, gap, root }, where root is { id: "root", type:
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
  var PRESET_ICON = { phone: "phone", "phone-lg": "phone", tablet: "tablet", laptop: "desktop", desktop: "desktop", wide: "desktop" };
  var MIN_SIDE = 200, MAX_WIDTH = 3840, MAX_HEIGHT = 12000;
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
  /* Token families, and which suit what's selected, first. */
  var FAMILY_LABEL = {
    fit: "Fit", control: "Controls", icon: "Icons", avatar: "Avatars", media: "Media", container: "Containers",
    step: "Steps of control-lg", inset: "Inset", space: "Stack and inline", layout: "Layout layers",
  };
  var CONTROL_TYPES = { Badge: 1, Tag: 1, Pagination: 1, QuantityStepper: 1, PromoCode: 1, FulfilmentToggle: 1, VariantPicker: 1, Rating: 1 };
  var MEDIA_TYPES = { Image: 1, Video: 1, Cover: 1, Media: 1, Figure: 1, AspectRatio: 1, ProductGallery: 1, SocialPost: 1 };
  var BAND_TYPES = { Group: 1, Section: 1, Stack: 1, Inline: 1, Grid: 1, Card: 1, Prose: 1 };
  var TEXT_TYPES = { Text: 1, Heading: 1, Quote: 1, Code: 1, Link: 1 };
  function contextOf(types) {
    var t = types.length && types.every(function (x) { return x === types[0]; }) ? types[0] : null;
    var m = t && META[t];
    var name = t ? t : "these items";
    if (t === "Avatar" || t === "AvatarGroup") return { name: name, size: ["avatar", "fit", "step"], space: ["inset"] };
    if (t === "Shape") return { name: name, size: ["step", "icon", "avatar", "control"], space: ["inset", "space"] };
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
  var LIB_KINDS = ["images", "illustrations", "icons"];
  function loadLibrary() {
    var raw = storage(function (s) { return JSON.parse(s.getItem(LIB_KEY) || "null"); }) || {};
    var out = {};
    LIB_KINDS.forEach(function (k) {
      out[k] = (Array.isArray(raw[k]) ? raw[k] : []).filter(function (it) {
        return it && typeof it.id === "string" && typeof it.name === "string" && typeof it.src === "string" && /^data:image\//.test(it.src);
      }).map(function (it) { return { id: it.id, name: it.name.slice(0, 80), src: it.src, original: typeof it.original === "string" && /^data:image\//.test(it.original) ? it.original : undefined }; });
    });
    return out;
  }
  /* A photo is scaled to fit 1600px and kept as JPEG unless it has
     transparency; an illustration fits 1200px as PNG; an SVG stays as drawn. */
  function readForLibrary(file, kind) {
    return new Promise(function (resolve, reject) {
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
    ["assets", "Assets", "Components and blocks to add", "plus"],
    ["layers", "Layers", "Everything in each frame", "blocks"],
    ["content", "Content", "Images, illustrations and icons", "folder"],
    ["configure", "Configure", "The system's brand, colour, type and layout", "sliders"],
  ];

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
    return n;
  }

  function side(v, max, fallback) {
    var n = Math.round(Number(v));
    return isFinite(n) && n > 0 ? Math.max(MIN_SIDE, Math.min(max, n)) : fallback;
  }
  /* A frame is a size, from a preset or typed, and whether its height hugs
     what's in it. */
  function makeFrame(name, preset, hug) {
    var p = PRESET[preset] || PRESET.desktop;
    return { id: uid(), name: name || "Frame", width: p.width, height: p.height, hug: !!hug, dark: false, surface: "base", spacing: "", gap: "", root: { id: "root", type: "Root", props: {}, style: {}, children: [] } };
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

  var ops = {
    insert: function (doc, parentId, index, n, fid) {
      var p = locate(doc, parentId, fid);
      if (!canHold(p, n)) return null;
      p.node.children.splice(Math.max(0, Math.min(index, p.node.children.length)), 0, n);
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
      to.node.children.splice(Math.max(0, Math.min(index, to.node.children.length)), 0, from.node);
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
      base.width = side(f.width, MAX_WIDTH, base.width);
      base.height = side(f.height, MAX_HEIGHT, base.height);
      base.hug = f.hug === true;
      if (f.width !== undefined && base.width !== f.width) note(report, base.name + ": width " + JSON.stringify(f.width) + " became " + base.width + " (" + MIN_SIDE + " to " + MAX_WIDTH + ")");
      if (f.height !== undefined && base.height !== f.height) note(report, base.name + ": height " + JSON.stringify(f.height) + " became " + base.height + " (" + MIN_SIDE + " to " + MAX_HEIGHT + ")");
    }
    base.dark = f.dark === true;
    base.surface = tokenOption("surface", f.surface) ? f.surface : "base";
    if (f.surface !== undefined && base.surface !== f.surface) note(report, base.name + ": surface " + JSON.stringify(f.surface) + " isn't a token option, so it's base");
    /* The canvas may take one custom colour, as six-digit hex. */
    if (typeof f.canvas === "string" && /^#[0-9a-f]{6}$/i.test(f.canvas)) base.canvas = f.canvas.toLowerCase();
    else if (f.canvas !== undefined) note(report, base.name + ": canvas " + JSON.stringify(f.canvas) + " isn't a #rrggbb colour, so it was left out");
    base.spacing = SPACINGS.some(function (s) { return s[0] === f.spacing; }) ? f.spacing : "";
    base.gap = DATA.rootGaps.indexOf(f.gap) >= 0 ? f.gap : "";
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

  function initialDoc() {
    var m = /^#b=([\w-]+)$/.exec(location.hash);
    if (m) {
      var shared = decode(m[1]);
      if (shared) { var dropped = []; return { doc: clean(shared, dropped), from: "link", dropped: dropped }; }
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
      view: p.view === "list" ? "list" : "grid",
      tabs: p.tabs && typeof p.tabs === "object" ? p.tabs : {},
      closed: p.closed && typeof p.closed === "object" ? p.closed : {},
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
  };
  function Icon(props) {
    return e("svg", { className: cx("bd-ic", props.className), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" },
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
    var options = props.options;
    var selected = options.filter(function (o) { return o.value === props.value; })[0];

    var place = function () {
      var r = btn.current.getBoundingClientRect();
      var width = Math.max(r.width, props.narrow ? 140 : 200);
      var below = window.innerHeight - r.bottom - 12;
      var above = r.top - 12;
      var want = Math.min(340, options.length * 44 + 12);
      var up = below < want && above > below;
      var left = props.alignEnd ? r.right - width : r.left;
      setPos({
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)), width: width,
        top: up ? undefined : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : undefined,
        maxHeight: Math.max(96, Math.min(want, up ? above : below)),
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
        onClick: function () { if (open) close(false); else show(); },
        onKeyDown: function (ev) { if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); show(); } },
      },
        props.prefix ? e("span", { className: "bd-dd-prefix", "aria-hidden": true }, props.prefix) : null,
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
    return e("div", { className: "bd-search" },
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
    return e("label", { className: cx("bd-num", props.muted && "is-muted"), title: props.title },
      e("span", { className: "bd-num-l", "aria-hidden": true }, props.short),
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
  function layoutOf(doc, heights, resizing) {
    var x = 0, out = { boxes: {}, width: 0, height: 0 };
    doc.frames.forEach(function (f) {
      var r = resizing && resizing.fid === f.id ? resizing : null;
      var w = r ? r.w : f.width;
      var h = r && r.h != null ? r.h : f.hug ? Math.max(MIN_SIDE, heights[f.id] || f.height) : f.height;
      out.boxes[f.id] = { x: x, y: 0, w: w, h: h };
      out.height = Math.max(out.height, h);
      x += w + FRAME_GAP;
    });
    out.width = Math.max(0, x - FRAME_GAP);
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
    var categoryState = useState(prefs.category);
    var category = categoryState[0], setCategory = categoryState[1];
    var viewState = useState(prefs.view);
    var view = viewState[0], setView = viewState[1];
    var tabsState = useState(prefs.tabs);
    var tabByType = tabsState[0], setTabByType = tabsState[1];
    var pxState = useState({});
    var pxMap = pxState[0], setPxMap = pxState[1];
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
    var layout = layoutOf(doc, heights, resizing);
    var boxes = layout.boxes;

    var history = useRef({ past: [], future: [] });
    var docRef = useRef(doc); docRef.current = doc;
    var selRef = useRef(selection); selRef.current = selection;
    var camRef = useRef(cam); camRef.current = cam;
    var layoutRef = useRef(layout); layoutRef.current = layout;
    var boxRef = useRef(box); boxRef.current = box;
    var heightsRef = useRef(heights); heightsRef.current = heights;
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
    var slotTpl = useRef({});
    var dockRef = useRef(null);

    /* Configure lives in the left panel on this page, not over it. */
    useEffect(function () {
      document.documentElement.classList.add("bd-configure-docked");
      return function () { document.documentElement.classList.remove("bd-configure-docked"); };
    }, []);
    var libState = useState(loadLibrary);
    var library = libState[0], setLibrary = libState[1];
    var libTabState = useState("images");
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
      storage(function (s) { s.setItem(PREFS_KEY, JSON.stringify({ category: category, view: view, tabs: tabByType, closed: closedSecs, left: left })); });
    }, [category, view, tabByType, closedSecs, left]);
    var firstDoc = useRef(doc);
    useEffect(function () {
      if (doc !== firstDoc.current && /^#b=/.test(location.hash)) window.history.replaceState(null, "", location.pathname + location.search);
    }, [doc]);
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
    var zoomTo = function (z) { zoomAt(boxRef.current.w / 2, boxRef.current.h / 2, z); };
    var zoomStep = function (dir) {
      var z = camRef.current.z;
      var next = dir > 0 ? ZOOM_STEPS.filter(function (s) { return s > z + 0.001; })[0] : ZOOM_STEPS.filter(function (s) { return s < z - 0.001; }).pop();
      if (next) zoomTo(next);
    };
    var fitAll = function () {
      var L = layoutRef.current, W = boxRef.current.w, H = boxRef.current.h;
      if (!W || !L.width) return;
      var z = clampZoom(Math.min(1, (W - STAGE_PAD * 2) / L.width, (H - STAGE_PAD * 2 - LABEL_ROOM) / L.height));
      setCam({ x: (W - L.width * z) / 2, y: Math.max(STAGE_PAD + LABEL_ROOM, (H - L.height * z + LABEL_ROOM) / 2), z: z });
    };
    var fitWidth = function () {
      var L = layoutRef.current, W = boxRef.current.w;
      if (!W || !L.width) return;
      var z = clampZoom(Math.min(1, (W - STAGE_PAD * 2) / L.width));
      setCam({ x: (W - L.width * z) / 2, y: STAGE_PAD + LABEL_ROOM, z: z });
    };
    /* A frame across the stage's width, from its top (or centred when it's
       short enough to fit). keep: never zoom in to do it. */
    var showFrame = function (fid, keep) {
      var b = layoutRef.current.boxes[fid], W = boxRef.current.w, H = boxRef.current.h;
      if (!b || !W) return;
      var z = Math.min(1, (W - STAGE_PAD * 2) / b.w);
      if (keep) z = Math.min(camRef.current.z, z);
      z = clampZoom(z);
      /* A frame that hugs its content may still grow, so it starts at its top. */
      var f = frameById(docRef.current, fid);
      var fits = !(f && f.hug) && b.h * z <= H - STAGE_PAD * 2 - LABEL_ROOM;
      setCam({ x: (W - b.w * z) / 2 - b.x * z, y: (fits ? (H - b.h * z + LABEL_ROOM) / 2 : STAGE_PAD + LABEL_ROOM) - b.y * z, z: z });
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
      docRef.current.frames.forEach(function (f) {
        if (!f.hug) return;
        var a = api(f.id);
        if (!a || !a.height) return;
        var h = Math.max(MIN_SIDE, Math.min(MAX_HEIGHT, a.height() || 0));
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
      var f = at && api(at.fid);
      if (!f) return null;
      var z = camRef.current.z;
      var own = at.fid === docRef.current.active;
      var hit = f.drop((x - at.r.left) / z, (y - at.r.top) / z, own ? payload.id || null : null, 12 / z);
      if (!hit) return null;
      var out = { where: "canvas", frame: at.fid, parent: hit.parent, index: hit.index, line: hit.line, box: hit.box };
      var dragType = payload.kind === "move" && payload.id ? (locate(docRef.current, payload.id) || { node: {} }).node.type : payload.kind === "new" ? payload.type : payload.kind === "asset" ? "Image" : payload.kind === "tool" ? (/^comp:(\w+)$/.exec(payload.tool) || [0, payload.tool === "box" ? "Group" : null])[1] : null;
      var into = locate(docRef.current, hit.parent, at.fid);
      if (into && into.node.type === "Slot" && dragType) {
        var slotOwner = into.path[into.path.length - 2];
        if (!slotOwner || !slotAccepts(slotOwner.type, into.node.props.name, dragType)) return null;
      }
      /* On the frame's own canvas, outside any stack, it lands where it's let go. */
      var moving = payload.kind === "move" && payload.id ? locate(docRef.current, payload.id) : null;
      var type = moving ? moving.node.type : payload.kind === "new" ? payload.type : payload.kind === "asset" ? "Image" : payload.kind === "tool" ? (/^comp:(\w+)$/.exec(payload.tool) || [0, payload.tool === "box" ? "Group" : null])[1] : null;
      if (hit.parent === "root" && type && !joinsFlow(type)) {
        var unit = (f.measure && f.measure(["var(--dt-space-inset-2xs)"])[0]) || 4;
        var fx = (x - at.r.left) / z, fy = (y - at.r.top) / z;
        var w = 120, h = 40;
        var r0 = moving && own ? f.rect(payload.id) : null;
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
       middle of a container drops inside it, at the end. Another frame's row
       takes it at the end of that frame. */
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
      if (at.node.children && rel > 0.3 && rel < 0.7) return { where: "list", parent: id, index: at.node.children.length, inside: id };
      var after = rel >= 0.5;
      return { where: "list", parent: at.parent.id, index: at.index + (after ? 1 : 0), indicator: { top: row.offsetTop + (after ? row.offsetHeight : 0), left: 8 + depth * 14 } };
    };

    var show = function (hit) {
      setListDrop(hit && hit.where === "list" ? hit : null);
      setMarks(function (m) {
        return Object.assign({}, m, { drop: hit && hit.where === "canvas" ? { line: hit.line ? thick(toStage(hit.line, hit.frame)) : null, box: hit.box ? toStage(hit.box, hit.frame) : null } : null });
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
      setDrag({ label: dr.payload.label, x: x, y: y });
      var hit = resolve(x, y, dr.payload);
      dr.hit = hit;
      show(hit);
      autoscroll(x, y);
    };

    var dragEnd = function (commitIt) {
      var dr = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      show(null);
      if (!dr || !dr.active) return;
      justDragged.current = true;
      setTimeout(function () { justDragged.current = false; }, 60);
      var hit = dr.hit;
      /* A frame or page dragged from the tool bar lands anywhere on the canvas. */
      if (commitIt && dr.payload.kind === "tool" && (dr.payload.tool === "frame" || dr.payload.tool === "page")) {
        var sr = stageRef.current && stageRef.current.getBoundingClientRect();
        if (sr && dr.lastX >= sr.left && dr.lastX <= sr.right && dr.lastY >= sr.top && dr.lastY <= sr.bottom) frameOps.add(null, dr.payload.tool === "page");
        return;
      }
      if (!commitIt || !hit) return;
      var fid = hit.frame || docRef.current.active;
      if (dr.payload.kind === "tool") { placeTool(dr.payload.tool, hit); return; }
      if (dr.payload.kind === "asset") { add("Image", { parent: hit.parent, index: hit.index, frame: fid, free: hit.free }, { src: dr.payload.src, alt: dr.payload.label }); return; }
      if (dr.payload.kind === "new") { add(dr.payload.type, { parent: hit.parent, index: hit.index, frame: fid, free: hit.free }); return; }
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

    var startDrag = function (ev, payload) {
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.shiftKey || ev.metaKey || ev.ctrlKey) return;
      var target = ev.currentTarget;
      try { target.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      dragRef.current = { payload: payload, x: ev.clientX, y: ev.clientY, active: false, id: ev.pointerId };
      var move = function (mv) {
        var dr = dragRef.current;
        if (!dr || mv.pointerId !== dr.id) return;
        if (!dr.active) {
          if (Math.abs(mv.clientX - dr.x) + Math.abs(mv.clientY - dr.y) < 6) return;
          dr.active = true;
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
            pick: on(function (fid, id, additive, deep) { pickRef.current(id, additive, deep, "canvas", fid); }),
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
              dragRef.current = { payload: { kind: "move", id: id, label: nameOf(at.node) }, active: true };
              if (selRef.current.indexOf(id) < 0) select([id]);
            }),
            dragMove: on(function (fid, x, y) { if (!dragRef.current) return; var p = toPage(fid, x, y); dragMoveRef.current(p.x, p.y); }),
            dragEnd: function (commitIt) { dragEndRef.current(commitIt); },
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
        a.render({ page: { dark: f.dark, surface: f.surface, canvas: f.canvas, spacing: f.spacing, gap: f.gap }, root: f.root }, { preview: preview, hug: f.hug });
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
      var got = a.measure(values);
      var map = {};
      keys.forEach(function (k, i) { if (got[i] != null && got[i] >= 0) map[k] = got[i]; });
      setPxMap(map);
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
    var pick = function (id, additive, deep, from, fid) {
      if (from === "canvas") releaseFocus();
      if (fid && fid !== docRef.current.active) { activate(fid); additive = false; }
      if (!id || id === "root") { if (!additive) select([]); return; }
      var cur = selRef.current;
      if (additive) {
        select(cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]));
        return;
      }
      select([id]);
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
      if ((dialogRef.current && dialogRef.current.open) || (importRef.current && importRef.current.open) || (playRef.current && playRef.current.open)) return false;
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
      if (ev.key === "Escape") { select([]); return true; }
      if (ev.key === "F2") { actions.rename(); return true; }
      if (!selRef.current.length) return false;
      if (mod && key === "g") { (ev.shiftKey ? actions.ungroup : actions.group)(); return true; }
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
    var setSize = function (w, h) {
      change(function (d) {
        var f = active(d);
        if (w !== undefined) f.width = side(w, MAX_WIDTH, f.width);
        /* Typing a height fixes it. */
        if (h !== undefined) { f.height = side(h, MAX_HEIGHT, f.height); f.hug = false; }
        return undefined;
      });
    };
    var setPreset = function (id) {
      var p = PRESET[id];
      if (p) change(function (d) { var f = active(d); f.width = p.width; f.height = p.height; return undefined; }, frame.name + " is " + p.label + ", " + p.width + " by " + p.height);
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
      duplicate: function (id) {
        var made = null;
        change(function (d) {
          var src = frameById(d, id);
          if (!src) return null;
          var c = copy(src);
          c.id = uid();
          c.name = src.name + " copy";
          c.root = fresh(src.root);
          c.root.id = "root";
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

    var openCode = function () {
      var f = api();
      if (!f) return;
      var fr = active(docRef.current);
      setCode(f.jsx({ page: fr, root: fr.root }, fr.name));
      var dlg = dialogRef.current;
      if (dlg && dlg.showModal) dlg.showModal();
    };

    var share = function () {
      var out = withoutUploads(docRef.current);
      var url = location.origin + location.pathname + "#b=" + encode(out.doc);
      copyText(url).then(function () {
        announce(out.dropped ? "Link copied. Uploaded files aren't in it; they stay in this browser." : "Link copied. Anyone with it opens these frames.");
      }, function () { window.prompt("Copy this link", url); });
    };

    var startFrom = function (id) {
      if (id === "import") { openImport(); return; }
      var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
      if (!s) return;
      var has = docRef.current.frames.some(function (f) { return f.root.children.length; });
      if (has && !window.confirm("Replace every frame with the " + s[1].toLowerCase() + "? Undo brings your work back.")) return;
      storage(function (st) { st.setItem(BACKUP_KEY, JSON.stringify(docRef.current)); });
      var next = s[2]();
      commit(next, null, "Started from " + s[1] + ". Undo to go back.");
      setTimeout(function () { showFrameRef.current(next.active); }, 0);
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
      if (type === "Slot") return "blocks";
      if (type === "Group") return "group";
      if (type === "Shape") return "square";
      if (isContainer(type)) return "box";
      return "component";
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
          { value: "delete", label: "Delete frame", icon: "trash", disabled: doc.frames.length < 2, danger: true },
        ],
        onChange: function (v) {
          if (v === "duplicate") frameOps.duplicate(f.id);
          if (v === "rename") setRenaming({ id: "frame:" + f.id, where: where });
          if (v === "fit") { activate(f.id); showFrame(f.id); }
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
      if (order && list.some(function (o) { return o.family; })) {
        var rank = function (o) { var i = order.indexOf(o.family); return i < 0 ? order.length : i; };
        list = list.map(function (o, i) { return { o: o, i: i }; }).sort(function (a, b) { return rank(a.o) - rank(b.o) || a.i - b.i; }).map(function (x) { return x.o; });
      }
      var more = def.section === "size" ? "More sizes" : "More spacing";
      var options = [{ value: "", label: opts.noneLabel || "None", short: opts.noneShort }].concat(list.map(function (o) {
        var px = pxMap[key + "|" + o.value];
        var name = o.label || o.value;
        var group = order && o.family ? (order.indexOf(o.family) >= 0 ? FAMILY_LABEL[o.family] : more) : undefined;
        var short = opts.pxOnly && px != null ? String(Math.round(px)) : opts.short ? opts.short(o, px) : px != null ? Math.round(px) + " " + name : undefined;
        return { value: o.value, label: name, px: px != null ? Math.round(px) : null, group: group, short: short, hint: o.tokens.join(" · ") || "CSS keyword", tokens: o.tokens };
      }));
      return e(Dropdown, {
        labelledBy: id || undefined, label: opts.label || def.label, value: value, mixed: mixed, mixedLabel: opts.mixedLabel, options: options,
        preview: opts.noPreview ? null : def.preview, compact: opts.compact, narrow: opts.compact, prefix: opts.prefix, className: opts.className,
        title: (opts.label || def.label) + (order ? ": suggestions for " + ctx.name + " first" : ""),
        onChange: opts.onChange || function (v) { setStyle(nodes.map(function (n) { return n.id; }), key, v); },
      });
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
        return e("div", { key: key }, tokenDropdown(key, nodes, null, { prefix: prefix, short: shortSize, noneLabel: "Auto", noneShort: "Auto", noPreview: true, className: "bd-dd-field" }));
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
      if (p.kind === "enum") {
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
    var insertAsset = function (it) {
      add("Image", null, { src: it.src, alt: it.name });
      announce("Added " + it.name + " to " + frame.name);
    };
    var contentPanel = function () {
      var kind = libTab;
      var items = kind === "video" ? [] : library[kind];
      var fileId = "bd-lib-file";
      var lib = window.DovetailConfigurePanel && window.DovetailConfigurePanel.config ? window.DovetailConfigurePanel.config().iconLib : null;
      var icons = (window.DovetailConfigure && window.DovetailConfigure.icons) || {};
      return e("div", { className: "bd-content",
        onDragOver: function (ev) { if (kind !== "video") { ev.preventDefault(); ev.currentTarget.classList.add("is-drop"); } },
        onDragLeave: function (ev) { ev.currentTarget.classList.remove("is-drop"); },
        onDrop: function (ev) { ev.preventDefault(); ev.currentTarget.classList.remove("is-drop"); if (kind !== "video") addToLibrary(kind, ev.dataTransfer.files); } },
        e("div", { className: "bd-panel-head" }, e("h2", { className: "bd-panel-title" }, "Content")),
        e("div", { className: "bd-content-tabs" },
          e(Segmented, { label: "Kind of content", wide: true, value: kind, onChange: function (v) { if (v) setLibTab(v); },
            options: LIB_TABS.map(function (t) { return { value: t[0], label: t[1], title: t[0] === "video" ? "Video: coming soon" : t[1] }; }) })),
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
        kind === "video"
          ? e("div", { className: "bd-empty" }, e(Icon, { name: "video" }), e("p", null, "Video is coming soon. For now, add a Video component from Assets and give it a file or a URL."))
          : e("section", { className: "bd-content-sec", "aria-label": "Your " + kind },
              kind === "icons" ? e("h3", { className: "bd-content-h" }, "Your icons") : null,
              e("div", { className: "bd-content-add" },
                e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), "Upload " + (kind === "icons" ? "SVG icons" : kind)),
                e("input", { id: fileId, type: "file", multiple: true, className: "visually-hidden", accept: kind === "icons" ? "image/svg+xml,.svg" : "image/*",
                  onChange: function (ev) { var f = ev.target.files; addToLibrary(kind, f); ev.target.value = ""; } }),
                e("span", { className: "bd-content-note" }, "or drop files here")),
              libBusy ? e("p", { className: "bd-content-busy", role: "status" }, libBusy) : null,
              items.length ? e("ul", { className: cx("bd-lib", kind === "icons" && "is-icons"), role: "list" }, items.map(function (it) {
                return e("li", { key: it.id, className: "bd-lib-item" },
                  e("button", { type: "button", className: "bd-lib-thumb", title: it.name + ": drag onto a frame, or press to add",
                    onPointerDown: function (ev) { if (ev.pointerType !== "touch") startDrag(ev, { kind: "asset", src: it.src, label: it.name }); },
                    onClick: function () { if (!justDragged.current) insertAsset(it); } },
                    e("img", { src: it.src, alt: "", draggable: false })),
                  e("span", { className: "bd-lib-name" }, it.name),
                  e(Dropdown, { menu: true, label: "Actions for " + it.name, icon: "more", compact: true, narrow: true, className: "bd-dd-icon bd-lib-menu",
                    options: [{ value: "insert", label: "Add to " + frame.name, icon: "plus" }]
                      .concat(kind !== "icons" ? [{ value: "cut", label: "Remove background", icon: "wand" }] : [])
                      .concat(it.original ? [{ value: "restore", label: "Put the background back", icon: "undo" }] : [])
                      .concat([{ value: "delete", label: "Delete", icon: "trash", danger: true }]),
                    onChange: function (v) {
                      if (v === "insert") insertAsset(it);
                      else if (v === "cut") cutBackground(it.src).then(function (url) { if (url) libUpdate(kind, it.id, { src: url, original: it.original || it.src }); });
                      else if (v === "restore") libUpdate(kind, it.id, { src: it.original, original: undefined });
                      else if (v === "delete") libUpdate(kind, it.id, { removed: true });
                    } }));
              })) : e("div", { className: "bd-empty" }, e(Icon, { name: LIB_TABS.filter(function (t) { return t[0] === kind; })[0][2] }),
                e("p", null, kind === "icons" ? "Upload SVG icons to use as pictures on the canvas." : "Upload " + kind + " to reuse them: drag one onto a frame, or pick it for an Image."))));
    };

    var assetsPanel = function () {
      var q = query.trim().toLowerCase();
      var groups = DATA.groups;
      var usable = function (g) { return g.items.filter(function (n) { return !placeable || placeable[n]; }); };
      var items;
      if (q) {
        items = [];
        groups.forEach(function (g) {
          usable(g).forEach(function (n) {
            if (n.toLowerCase().indexOf(q) >= 0 || String(META[n].blurb || "").toLowerCase().indexOf(q) >= 0) items.push(n);
          });
        });
      } else {
        items = usable(groups.filter(function (x) { return x.id === category; })[0] || groups[0]);
      }
      var current = groups.filter(function (x) { return x.id === category; })[0] || groups[0];
      return e("div", { className: "bd-assets" },
        e(SearchField, { label: "Search components", placeholder: "Search all components", value: query, onChange: setQuery }),
        e("div", { className: cx("bd-cats", q && "is-muted"), role: "group", "aria-label": "Categories" },
          groups.map(function (g) {
            var on = !q && category === g.id;
            return e("button", {
              key: g.id, type: "button", className: "bd-cat", "aria-pressed": String(on), title: g.label + ": " + usable(g).length + " to add",
              onClick: function () { setCategory(g.id); setQuery(""); },
            }, e(Icon, { name: GROUP_ICON[g.id] || "box" }), e("span", { className: "bd-cat-label" }, g.label));
          })),
        e("div", { className: "bd-assets-head" },
          e("h3", { className: "bd-assets-title" }, q ? "Results" : current.label, e("span", { className: "bd-count" }, items.length)),
          e(Segmented, { label: "View", value: view, onChange: setView, options: [{ value: "grid", label: "Grid", icon: "gridView" }, { value: "list", label: "List", icon: "listView" }] })),
        items.length ? null : e("p", { className: "bd-empty-note" }, "Nothing matches."),
        e("ul", { className: cx("bd-tiles", view === "list" ? "is-list" : "is-grid") }, items.map(function (n) {
          var meta = META[n];
          return e("li", { key: n },
            e("button", {
              type: "button", className: "bd-tile", "data-type": n, "aria-label": "Add " + n, title: meta.blurb ? n + ": " + meta.blurb : n,
              onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n }); },
              onClick: function () { if (!justDragged.current) add(n); },
            },
              e(Thumb, { type: n, wide: meta.group === "blocks" }),
              e("span", { className: "bd-tile-text" },
                e("span", { className: "bd-tile-name" }, n),
                view === "list" && meta.blurb ? e("span", { className: "bd-tile-blurb" }, meta.blurb) : null)));
        })));
    };

    /* Containers start open in Layers; a component's slots start folded. */
    var isOpen = function (n) { return n.type === "Root" || isContainer(n.type) ? !collapsed[n.id] : collapsed[n.id] === false; };
    useEffect(function () {
      var opens = {};
      selection.forEach(function (id) {
        var at = locate(doc, id);
        if (at) at.path.slice(1, -1).forEach(function (n) { if (!isOpen(n)) opens[n.id] = isContainer(n.type) ? "del" : false; });
      });
      if (!Object.keys(opens).length) return;
      setCollapsed(function (c) { var n = Object.assign({}, c); Object.keys(opens).forEach(function (id) { if (opens[id] === "del") delete n[id]; else n[id] = false; }); return n; });
    }, [selection]);
    var isRenaming = function (id, where) { return !!renaming && renaming.id === id && renaming.where === where; };

    /* Every frame is a row; the active one opens onto its layers. */
    var layersPanel = function () {
      var q = layerQuery.trim().toLowerCase();
      var rows = [];
      var keep = null;
      if (q) {
        keep = {};
        (function walk(n, path) {
          (n.children || []).forEach(function (c) {
            var hit = c.type.toLowerCase().indexOf(q) >= 0 || labelOf(c).toLowerCase().indexOf(q) >= 0;
            if (hit) { keep[c.id] = true; path.forEach(function (p) { keep[p] = true; }); }
            if (c.children) walk(c, path.concat([c.id]));
          });
        })(frame.root, []);
      }
      (function walk(n, depth) {
        (n.children || []).forEach(function (c) {
          if (keep && !keep[c.id]) return;
          rows.push({ n: c, depth: depth });
          if (c.children && (q || isOpen(c))) walk(c, depth + 1);
        });
      })(frame.root, 1);
      var toggle = function (id) {
        var at = locate(doc, id);
        var owner = at && !isContainer(at.node.type);
        setCollapsed(function (c) { var n = Object.assign({}, c); if (owner) { if (n[id] === false) delete n[id]; else n[id] = false; } else if (n[id]) delete n[id]; else n[id] = true; return n; });
      };
      var nodeRow = function (r) {
        var n = r.n;
        var text = labelOf(n);
        var on = selection.indexOf(n.id) >= 0;
        var open = isOpen(n) || !!q;
        var renameable = n.type === "Group";
        return e("div", {
          key: n.id, className: cx("bd-layer", on && "is-current", listDrop && listDrop.inside === n.id && "is-drop-inside", hover && hover.f === frame.id && hover.id === n.id && "is-hover"),
          "data-layer": n.id, "data-depth": r.depth, role: "treeitem", "aria-selected": String(on), "aria-level": r.depth + 1,
          "aria-expanded": n.children ? String(open) : undefined,
          style: { paddingInlineStart: "calc(var(--dt-space-inset-2xs) + " + r.depth + " * 14px)" },
          onPointerEnter: function () { setHover({ f: frame.id, id: n.id }); },
          onPointerLeave: function () { setHover(null); },
        },
          n.children ? e("button", { type: "button", className: cx("bd-layer-twisty", open && "is-open"), "aria-label": (open ? "Collapse " : "Expand ") + n.type, onClick: function () { toggle(n.id); } }, e(Icon, { name: "right" }))
            : e("span", { className: "bd-layer-twisty", "aria-hidden": true }),
          e("button", {
            type: "button", className: "bd-layer-main",
            onClick: function (ev) { if (!justDragged.current) pick(n.id, ev.shiftKey || ev.metaKey || ev.ctrlKey, false, "layers"); },
            onDoubleClick: function () { if (renameable) setRenaming({ id: n.id, where: "layer" }); },
            onPointerDown: function (ev) { if (ev.pointerType === "mouse" && n.type !== "Slot") startDrag(ev, { kind: "move", id: n.id, label: nameOf(n) }); },
          },
            e(Icon, { name: typeIcon(n.type) }),
            renameable && isRenaming(n.id, "layer")
              ? e(Renamable, { value: n.name || "Group", label: "Group name", startEditing: true, className: "bd-layer-name", onChange: function (v) { setRenaming(null); setName(n.id, v === "Group" ? "" : v); } })
              : e("span", { className: "bd-layer-name" }, nameOf(n)),
            text && !n.name ? e("span", { className: "bd-layer-text" }, text) : null));
      };
      return e("div", { className: "bd-layers-panel" },
        e(SearchField, { label: "Filter layers", placeholder: "Filter layers", value: layerQuery, onChange: setLayerQuery }),
        e("div", { className: "bd-layers", ref: layersRef, role: "tree", "aria-label": "Layers", "aria-multiselectable": "true" },
          doc.frames.map(function (f) {
            var on = f.id === doc.active;
            var head = e("div", {
              key: "frame-" + f.id, className: cx("bd-layer bd-layer-frame", on && !sel && "is-current", on && "is-active-frame", listDrop && listDrop.inside === "frame:" + f.id && "is-drop-inside"),
              "data-layer": on ? "root" : undefined, "data-frame-row": f.id, role: "treeitem", "aria-level": 1,
              "aria-selected": String(on && !sel), "aria-expanded": String(on),
            },
              e("span", { className: cx("bd-layer-twisty", on && "is-open"), "aria-hidden": true }, e(Icon, { name: "right" })),
              e("button", {
                type: "button", className: "bd-layer-main", title: on ? "Double-click to rename" : "Show " + f.name,
                onClick: function () { frameOps.pick(f.id, true); },
                onDoubleClick: function () { setRenaming({ id: "frame:" + f.id, where: "layer" }); },
              },
                e(Icon, { name: "frame" }),
                isRenaming("frame:" + f.id, "layer")
                  ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-layer-name", onChange: function (v) { frameOps.rename(f.id, v); } })
                  : e("span", { className: "bd-layer-name" }, f.name),
                e("span", { className: "bd-layer-text" }, sizeText(f))));
            if (!on) return head;
            return e(React.Fragment, { key: "frame-" + f.id },
              head,
              rows.length ? rows.map(nodeRow) : e("p", { className: "bd-empty-note bd-empty-indent" }, q ? "No layers match." : "Empty. Add something from Assets."));
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
      var darkValues = nodes.map(function (n) { return !!n.style.dark; });
      var rid = "bd-radius-" + first.id, sid = "bd-shadow-" + first.id, mid = "bd-mode-" + first.id;
      return [
        sec("fill", "Fill", [extra || null, tokenDropdown("surface", nodes, null, { label: "Fill", noneLabel: "None", className: "bd-dd-field bd-dd-swatch" })], null, styled(nodes, ["surface"])),
        sec("border", "Border", hasBorder ? tokenControl("border", nodes, "bd-t-" + first.id + "-border", "Colour") : e("p", { className: "bd-sec-empty" }, "None"),
          hasBorder ? headAction("minus", "Remove the border", function () { var p = { border: undefined }; sidesOf.forEach(function (k) { p[k] = undefined; }); setStyles(ids, p); })
            : headAction("plusSm", "Add a border", function () { setStyle(ids, "border", "default"); }), hasBorder),
        sec("corners", "Corners and shadow", [
          e(Field, { key: "radius", id: rid, label: "Radius" },
            e(Segmented, { labelledBy: rid, wide: true, clearable: true, className: "bd-seg-pics", value: same(radiusValues) ? radiusValues[0] || undefined : null, onChange: function (v) { setStyle(ids, "radius", v); },
              options: DATA.tokens.radius.options.map(function (o) { return { value: o.value, label: o.value + " (" + o.tokens[0] + ")", picture: e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + o.tokens[0] + ")" } }) }; }) })),
          e(Field, { key: "shadow", id: sid, label: "Shadow" },
            e(Segmented, { labelledBy: sid, wide: true, clearable: true, className: "bd-seg-pics", value: same(shadowValues) ? shadowValues[0] || undefined : null, onChange: function (v) { setStyle(ids, "elevation", v); },
              options: DATA.tokens.elevation.options.map(function (o) { return { value: o.value, label: "Elevation " + o.value + " (" + o.tokens[0] + ")", picture: e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + o.tokens[0] + ")" } }) }; }) })),
        ], null, styled(nodes, ["radius", "elevation"])),
        sec("mode", "Mode", e(Field, { id: mid, label: "Colour mode", hint: darkValues[0] && same(darkValues) ? "Adds the dark class: everything inside resolves dark." : null },
          e(Segmented, { labelledBy: mid, wide: true, value: same(darkValues) ? (darkValues[0] ? "dark" : "inherit") : null, onChange: function (v) { setStyle(ids, "dark", v === "dark" ? true : undefined); },
            options: [{ value: "inherit", label: "Inherit" }, { value: "dark", label: "Dark band" }] })), null, styled(nodes, ["dark"])),
      ];
    };

    /* In the flow, or out of it: sticky as the frame scrolls, pinned to the
       frame, or floating over its parent, at a spot and a token offset. */
    var POSITION_DEFAULT_ANCHOR = { sticky: "", pinned: "bottom-right", floating: "top-right" };
    var positionRows = function (nodes) {
      var ids = nodes.map(function (n) { return n.id; });
      /* Placed freely on the frame: where, in pixels of the smallest inset step. */
      if (nodes.every(function (n) { return isFree(n.style); })) {
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
            e(Field, { key: "mode", id: "bd-fr-mode", label: "Mode" },
              e(Segmented, { labelledBy: "bd-fr-mode", wide: true, value: frame.dark ? "dark" : "light", onChange: function (v) { setFrame("dark", v === "dark"); },
                options: [{ value: "light", label: "Light", picture: e(React.Fragment, null, e(Icon, { name: "sun" }), "Light") }, { value: "dark", label: "Dark", picture: e(React.Fragment, null, e(Icon, { name: "moon" }), "Dark") }] })),
            e(Field, { key: "fill", id: "bd-pg-surface", label: "Canvas", hint: frame.canvas ? "A custom colour, outside the system's surfaces. Pick a surface to go back." : null },
              e("div", { className: "bd-canvas-row" },
                e(Dropdown, { labelledBy: "bd-pg-surface", value: frame.canvas ? "" : frame.surface, placeholder: "Custom", preview: "color", className: "bd-dd-field bd-dd-swatch",
                  onChange: function (v) { change(function (d) { var f = active(d); f.surface = v || "base"; delete f.canvas; return undefined; }); }, options: surfaceOptions }),
                e("label", { className: cx("bd-canvas-custom", frame.canvas && "is-on"), title: "A custom canvas colour" },
                  e("span", { className: "bd-canvas-chip", style: frame.canvas ? { background: frame.canvas } : undefined, "aria-hidden": true }),
                  e("span", { className: "visually-hidden" }, "Custom canvas colour"),
                  e("input", { type: "color", className: "bd-canvas-input", value: frame.canvas || "#ffffff",
                    onChange: function (ev) { var v = ev.target.value; if (/^#[0-9a-f]{6}$/i.test(v)) setFrame("canvas", v.toLowerCase()); } })))),
          ])]
        : [          sec("frame-flow", "Page layout", [
            e(Field, { key: "char", id: "bd-pg-char", label: "Layout character", hint: "Sets data-layout, which moves every layout layer token together." },
              e(Dropdown, { labelledBy: "bd-pg-char", value: frame.spacing, className: "bd-dd-field", onChange: function (v) { setFrame("spacing", v || ""); }, options: SPACINGS.map(function (s) { return { value: s[0], label: s[1] }; }) })),
            e(Field, { key: "gap", id: "bd-pg-gap", label: "Gap between sections", hint: frame.gap ? "--dt-layout-stack-" + frame.gap : "None: blocks keep their own rhythm." },
              e(Dropdown, { labelledBy: "bd-pg-gap", value: frame.gap, className: "bd-dd-field", onChange: function (v) { setFrame("gap", v || ""); },
                options: [{ value: "", label: "None" }].concat(DATA.rootGaps.map(function (g) { return { value: g, label: g, hint: "--dt-layout-stack-" + g }; })) })),
          ])];
      return e("div", { className: "bd-inspect" },
        e("div", { className: "bd-inspect-head" },
          e("div", { className: "bd-head-row" },
            e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "frame" }),
              e(Renamable, { value: frame.name, label: "Frame name", focusable: true, className: "bd-title-name", startEditing: isRenaming("frame:" + frame.id, "title"), onChange: function (v) { frameOps.rename(frame.id, v); } })),
            e("div", { className: "bd-head-actions" }, frameMenu(frame, "title"))),
          e("p", { className: "bd-inspect-sub" }, (frame.hug ? "Hugs its content" : "A fixed screen") + ". Select something in it to change that instead."),
          /* A frame's size is always in view: the first thing a frame or page needs. */
          e("div", { className: "bd-frame-size-head" },
            e(Dropdown, { label: "Device", prefix: "Device", value: preset, placeholder: "Custom", iconValue: true, className: "bd-dd-field", onChange: setPreset,
              options: PRESETS.map(function (p) { return { value: p.id, label: p.label, hint: p.width + " × " + p.height, icon: PRESET_ICON[p.id] || "desktop" }; }) }),
            e("div", { className: "bd-size-row" },
              e(NumberField, { short: "W", label: "Frame width", value: frame.width, onChange: function (v) { setSize(v, undefined); } }),
              e(NumberField, { short: "H", label: "Frame height", value: frame.hug ? Math.round(b.h) : frame.height, muted: frame.hug, title: frame.hug ? "Follows the content. Type a height to fix it." : undefined, onChange: function (v) { setSize(undefined, v); } }),
              e("button", { type: "button", className: "bd-act bd-act-sm", title: "Swap width and height", "aria-label": "Swap width and height", onClick: function () { setSize(frame.height, frame.width); } }, e(Icon, { name: "rotate" }))),
            e(Segmented, { label: "Height", wide: true, value: frame.hug ? "hug" : "fixed",
              onChange: function (v) { change(function (d) { var f = active(d); f.hug = v === "hug"; if (!f.hug) f.height = side(Math.round(b.h), MAX_HEIGHT, f.height); return undefined; }); },
              options: [{ value: "fixed", label: "Fixed height" }, { value: "hug", label: "Hug contents" }] }))),
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

    var nodeInspector = function (nodes) {
      var first = nodes[0];
      var many = nodes.length > 1;
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
              !many && detachable[first.type] ? headAction("detach", "Detach into primitives", actions.detach) : null)),
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
    var zoomText = Math.round(cam.z * 100) + "%";

    var toolbar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
      e(Dropdown, { menu: true, label: "Start from a layout", placeholder: "Start from", compact: true, className: "bd-start",
        options: STARTERS.map(function (s) { return { value: s[0], label: s[1] }; }).concat([{ value: "import", label: "Paste a layout…", icon: "upload", hint: "JSON or a builder link" }]), onChange: startFrom }),
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
      e("button", { type: "button", className: "bd-act", onClick: share, title: "Copy a share link", "aria-label": "Share" }, e(Icon, { name: "link" })),
      e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: openCode, disabled: !ready[frame.id] }, e(Icon, { name: "code" }), "Code"));

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
      var move = function (mv) {
        var dx = (mv.clientX - start.x) / z, dy = (mv.clientY - start.y) / z;
        var w = edge === "b" ? start.w : Math.max(MIN_SIDE, Math.min(MAX_WIDTH, snapSide(start.w + dx, VIEW_W, f.hug, 16 / z)));
        var h = edge === "r" ? null : Math.max(MIN_SIDE, Math.min(MAX_HEIGHT, snapSide(start.h + dy, VIEW_H, f.hug, 16 / z)));
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
    var sizeName = function (w, h) {
      var p = PRESETS.filter(function (x) { return x.width === w && (h == null || x.height === h); })[0];
      return w + " × " + (h == null ? "hug" : h) + (p ? " · " + p.label : "");
    };
    var resizers = e("div", { className: "bd-resizers", "aria-hidden": true },
      doc.frames.map(function (f) {
        var b = boxes[f.id];
        if (!b) return null;
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

    var stage = e("div", {
      className: cx("bd-stage", drag && "is-dragging", (space || panning || tool === "hand") && "is-panning", preview && "is-preview"), ref: stageRef,
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
        if (!moved && isBackground(ev.target) && !spaceRef.current) { select([]); if (editRef.current) editDone(true); }
      },
      onPointerCancel: function (ev) { if (gest.current.pts[ev.pointerId]) gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null); },
    },
      e("div", { className: "bd-world", style: { transform: "translate(" + cam.x + "px, " + cam.y + "px) scale(" + cam.z + ")" } },
        doc.frames.map(function (f) {
          var b = boxes[f.id];
          return e("iframe", {
            key: f.id, className: cx("bd-frame", f.id === doc.active && "is-active"),
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
          return e("div", {
            key: f.id, className: cx("bd-flabel", on && "is-current", on && !sel && "is-selected"),
            style: { left: cam.x + b.x * cam.z + "px", top: cam.y + b.y * cam.z + "px", maxWidth: Math.max(80, b.w * cam.z) + "px" },
          },
            isRenaming("frame:" + f.id, "label")
              ? e(Renamable, { value: f.name, label: "Frame name", startEditing: true, className: "bd-flabel-name", onChange: function (v) { frameOps.rename(f.id, v); } })
              : e("button", {
                type: "button", className: "bd-flabel-btn", title: f.name + ", " + sizeText(f) + ". Double-click to rename.",
                onClick: function () { frameOps.pick(f.id); },
                onDoubleClick: function () { setRenaming({ id: "frame:" + f.id, where: "label" }); },
              }, e("span", { className: "bd-flabel-name" }, f.name)),
            e("span", { className: "bd-flabel-size" }, sizeText(f)),
            on && !preview ? frameMenu(f, "label") : null);
        })),
      e("div", { className: "bd-marks", "aria-hidden": true },
        !preview && boxes[frame.id] ? e("div", { className: cx("bd-ring", !sel && "is-selected"), style: { left: cam.x + boxes[frame.id].x * cam.z, top: cam.y + boxes[frame.id].y * cam.z, width: boxes[frame.id].w * cam.z, height: boxes[frame.id].h * cam.z } }) : null,
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
            }, nameOf(at.node)) : null);
        }) : null,
        marks.drop && marks.drop.line ? e("div", { className: "bd-mark-line", style: marks.drop.line }) : null,
        marks.drop && marks.drop.box ? e("div", { className: "bd-mark-box", style: marks.drop.box }) : null),
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
      wide && bare && !preview ? e("button", { type: "button", className: "bd-float", onClick: actions.panels, title: "Show panels (Tab)" }, e(Icon, { name: "panels" }), "Show panels") : null,
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
      if (a && fr) a.render({ page: { dark: fr.dark, surface: fr.surface, canvas: fr.canvas, spacing: fr.spacing, gap: fr.gap }, root: fr.root }, { preview: true, hug: false });
    };
    var playDialog = function () {
      var fr = play && frameById(doc, play.fid);
      if (!fr) return null;
      var sc = playBox.w ? Math.min(1, (playBox.w - 32) / fr.width, (playBox.h - 32) / play.h) : 0.5;
      var hs = playHeights(fr.width);
      return e("dialog", { className: "bd-play", ref: playRef, "aria-labelledby": "bd-play-title", onClose: function () { setPlay(null); } },
        e("div", { className: "bd-play-head" },
          e("div", { className: "bd-play-intro" },
            e("h2", { id: "bd-play-title" }, "Play: " + fr.name),
            e("p", { className: "bd-inspect-sub" }, fr.width + " wide, seen " + play.h + " tall. Scroll inside it; pinned and sticky items stay put the way they would on the device.")),
          e(Segmented, { label: "Screen height", value: play.h, onChange: function (v) { if (v) setPlay(Object.assign({}, play, { h: v })); },
            options: hs.map(function (x) { return { value: x[0], label: String(x[0]), title: x[1] + ", " + x[0] + " tall" }; }) }),
          e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close (Esc)", onClick: function () { playRef.current.close(); } }, e(Icon, { name: "close" }))),
        e("div", { className: "bd-play-stage", ref: playStageRef },
          e("div", { className: "bd-play-device", style: { width: Math.round(fr.width * sc), height: Math.round(play.h * sc) } },
            e("iframe", { ref: playFrameRef, src: frameSrc, title: fr.name + ", " + fr.width + " by " + play.h, onLoad: renderPlay,
              style: { width: fr.width, height: play.h, transform: "scale(" + sc + ")" } }))));
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

    var inspector = selectedNodes.length === 1 && selectedNodes[0].type === "Slot" ? slotInspector(selectedNodes[0]) || frameInspector()
      : selectedNodes.length ? nodeInspector(selectedNodes.filter(function (n) { return n.type !== "Slot"; }).length ? selectedNodes.filter(function (n) { return n.type !== "Slot"; }) : selectedNodes) : frameInspector();
    var slot = wide ? document.getElementById("app-toolbar") : null;

    return e(React.Fragment, null,
      slot ? ReactDOM.createPortal(toolbar, slot) : null,
      e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
        [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
          return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
            t[1], t[0] === "edit" && selectedNodes.length ? e("span", { className: "bd-tab-note" }, " · " + (selectedNodes.length > 1 ? selectedNodes.length : selectedNodes[0].type)) : null);
        })),
      e("div", { className: cx("bd-shell", hidePanels && "is-bare"), "data-pane": pane },
        e("aside", { className: "bd-left", "aria-label": "Assets, layers, content and configure", hidden: hidePanels || undefined },
          e("div", { className: "bd-left-tabs bd-rail", role: "tablist", "aria-label": "Left panel", "aria-orientation": wide ? "vertical" : "horizontal" },
            RAIL.map(function (r) {
              return e("button", { key: r[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(left === r[0]), "aria-controls": "bd-left-body", title: r[2],
                onClick: function () { setLeft(r[0]); } }, e(Icon, { name: r[3] }), e("span", { className: "bd-rail-label" }, r[1]));
            })),
          e("div", { className: "bd-left-body", id: "bd-left-body", role: "tabpanel" },
            left === "assets" ? assetsPanel() : left === "layers" ? layersPanel() : left === "content" ? contentPanel()
              : e("div", { className: "bd-config-dock", ref: dockRef }))),
        e("div", { className: "bd-center" }, slot ? null : toolbar, stage),
        e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef, hidden: hidePanels || undefined }, inspector)),
      drag ? e("div", { className: "bd-ghost", style: { left: drag.x + "px", top: drag.y + "px" }, "aria-hidden": true }, drag.label) : null,
      e("dialog", { className: "bd-code", ref: dialogRef, "aria-labelledby": "bd-code-title" },
        e("div", { className: "bd-code-head" },
          e("div", { className: "bd-code-intro" },
            e("h2", { id: "bd-code-title" }, "Code: " + frame.name),
            e("p", { className: "bd-inspect-sub" }, "React with @dovetail-ds/react. Sample data from the specimens is included so it renders as you see it; replace it with your own.")),
          e("div", { className: "bd-code-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: function () { copyText(code).then(function () { announce("Code copied"); }); } }, e(Icon, { name: "copy" }), "Copy"),
            e("a", { className: "bd-btn", href: "data:text/plain;charset=utf-8," + encodeURIComponent(code), download: (frame.name.replace(/[^\w]+/g, "") || "Screen") + ".jsx" }, "Download"),
            e("button", { type: "button", className: "bd-btn", onClick: copyLayout, title: "Every frame as builder JSON, to paste back here or hand to Claude" }, "Copy layout JSON"),
            e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" })))),
        e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, code))),
      importDialog(),
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
