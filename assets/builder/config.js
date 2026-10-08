/* Constants, the component data and the slot rules every other module reads. */

var mountEl = document.getElementById("builder");
var DATA = window.DovetailBuilderData || { components: {}, tokens: {}, frames: [], groups: [], columnWidths: [], rootGaps: [] };

var e = React.createElement;
/* ------------------------------------------------ nodes, as the panels read them */

/* What a layer is called in a list: its name, else its own words, else the
   sample's (scalars: each type's starting props). */
function nodeLabel(n, scalars) {
  if (n.name) return n.name;
  var base = (scalars || {})[n.type] || {};
  var text = n.props.children != null ? n.props.children : n.props.title != null ? n.props.title : n.props.label != null ? n.props.label : base.children || base.title || base.label || base.name || base.brand;
  return typeof text === "string" || typeof text === "number" ? String(text) : "";
}
/* The icon for a type: its own, its group's, else a box or a component. */
function typeIcon(type) {
  if (TYPE_ICON[type]) return TYPE_ICON[type];
  var g = META[type] && META[type].group;
  if (g && GROUP_TYPE_ICON[g]) return GROUP_TYPE_ICON[g];
  return isContainer(type) ? "box" : "component";
}
/* A component with parts of its own, shown in Layers: not a container and
   not one of the builder's primitives. */
function isOwner(n) { var m = META[n.type]; return !!m && !m.builder && !isContainer(n.type); }
/* Whether a type has a title part (its titleSize prop) to pick in Layers. */
function hasTitlePart(type) { var m = META[type]; return !!m && m.props.some(function (p) { return p.name === "titleSize"; }); }
/* Whether a layer's children show in Layers: containers open unless folded,
   components closed unless opened. */
function nodeIsOpen(n, collapsed) { return n.type === "Root" || isContainer(n.type) ? !collapsed[n.id] : collapsed[n.id] === false; }
/* A frame's size as a label; a hugging frame's height is as measured. */
function frameSize(f, boxes) { return f.width + " × " + (f.hug ? Math.round(((boxes || {})[f.id] || {}).h || f.height) : f.height); }

/* Whether every value in a list is the same (by its JSON). */
function allSame(values) { return values.every(function (v) { return JSON.stringify(v) === JSON.stringify(values[0]); }); }

/* A function whose identity never changes and calls the latest one given,
   so a handler made fresh each render can reach a memoized component. */
function useEvent(fn) {
  var ref = useRef(fn);
  ref.current = fn;
  return useCallback(function () { return ref.current.apply(null, arguments); }, []);
}
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
/* Big projects keep only frames near the view live: past VIRTUAL_AFTER
   frames, never more than LIVE_MAX at once. */
var VIRTUAL_AFTER = 6, LIVE_MAX = 8;
/* How wide the two floating panels go, in steps of 4. Drag an edge past its
   minimum and the panel folds away: the left one to its rail, the right one
   out of sight. */
var PANELS = { left: { min: 280, max: 520, def: 344 }, right: { min: 280, max: 480, def: 312 }, step: 4, fold: 72 };
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
function words(name) { return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, function (c) { return c.toUpperCase(); }); }
/* Bands run the width of the page, so they always join its flow. */
var BAND_ROOT = { Section: 1, AppShell: 1, Navbar: 1, Sidebar: 1, BottomNav: 1, Banner: 1, StoreHeader: 1 };
function joinsFlow(type) { return !type || !!BAND_ROOT[type] || !!(META[type] && META[type].group === "blocks"); }
function slotAccepts(ownerType, name, childType) {
  if (!slotSpec(ownerType, name) || childType === "Slot") return false;
  var list = slotTakes(ownerType, name);
  return list ? list.indexOf(childType) >= 0 : !joinsFlow(childType);
}
function hasSlots(n) { return !!(n && n.children && n.children.some(function (c) { return c.type === "Slot"; })); }
function nameOf(n) { return n.type === "Slot" ? words(n.props.name) : n.name || n.type; }
/* Shortcuts are written once, the Windows way ("Ctrl+Shift+G", "Shift 1",
   "Cmd-drag"), and shown the way this computer's keyboard says them: on a
   Mac as symbols in Apple's order (⇧⌘G), elsewhere with Ctrl for Cmd. kbd()
   finds every shortcut in a piece of text and rewrites it. */
var IS_MAC = /Mac|iPhone|iPad|iPod/.test((typeof navigator !== "undefined" && (navigator.platform || (navigator.userAgentData && navigator.userAgentData.platform))) || "");
var CHORD = /\b((?:(?:Ctrl|Cmd|Alt|Shift)(?:\+|-| (?=[A-Z0-9+\-−]\b|[+\-−]))){1,3})(F\d{1,2}\b|Up\b|Down\b|Left\b|Right\b|Arrows?\b|drag\b|click\b|[A-Z0-9](?![\w°])|[[\]\\=+\-−?/])/g;
var MAC_MOD = { Ctrl: "⌘", Cmd: "⌘", Alt: "⌥", Shift: "⇧" };
var MAC_KEY = { Up: "↑", Down: "↓", Left: "←", Right: "→" };
function kbd(text) {
  if (typeof text !== "string") return text;
  /* A modifier held on its own. */
  if (/^(Ctrl|Cmd|Alt|Shift)$/.test(text)) return IS_MAC ? MAC_MOD[text] : text === "Cmd" ? "Ctrl" : text;
  return text.replace(CHORD, function (all, mods, key) {
    var held = mods.split(/[+\- ]/).filter(Boolean);
    if (!IS_MAC) return all.replace(/\bCmd\b/g, "Ctrl");
    var sym = ["Alt", "Shift", "Ctrl"].filter(function (m) { return held.indexOf(m) >= 0 || (m === "Ctrl" && held.indexOf("Cmd") >= 0); }).map(function (m) { return MAC_MOD[m]; }).join("");
    return sym + (/^(drag|click)$/.test(key) ? "-" + key : /^Arrows?$/.test(key) ? " " + key : MAC_KEY[key] || key);
  });
}
/* Every shortcut, in groups, for the sheet ? opens. Written the Windows way;
   kbd() shows them as this keyboard says them. The tools' own keys are
   added from TOOL_INFO, so a new tool lists itself. */
var SHORTCUTS = [
  ["Edit", [["Undo", "Ctrl+Z"], ["Redo", "Ctrl+Shift+Z"], ["Cut, copy, paste", "Ctrl+X, Ctrl+C, Ctrl+V"], ["Paste a picture", "Ctrl+V"], ["Duplicate", "Ctrl+D"],
    ["Copy style, paste style", "Ctrl+Alt+C, Ctrl+Alt+V"], ["Delete", "Del"], ["Rename", "F2"], ["Create component", "Ctrl+Alt+K"]]],
  ["Select", [["Select all", "Ctrl+A"], ["Add to the selection", "Shift-click"], ["Into the selection", "Enter"], ["Out to its parent", "Shift+Enter"],
    ["Deselect", "Esc"], ["Menu for the selection", "Shift+F10"]]],
  ["View", [["Zoom in, zoom out", "Ctrl +, Ctrl −"], ["Zoom to fit", "Shift+1"], ["Zoom to the selection", "Shift+2"], ["Actual size", "Shift+0"],
    ["Pan", "Space-drag"], ["Rulers", "Shift+R"], ["Layout columns", "Shift+G"], ["Hide the panels", "Tab"], ["Measure the spacing, held", "Shift, Alt"], ["Search components", "/"], ["These shortcuts", "?"]]],
  ["Arrange", [["Bring forward, send backward", "Ctrl+], Ctrl+["], ["Bring to front, send to back", "Ctrl+Shift+], Ctrl+Shift+["], ["Group, ungroup", "Ctrl+G, Ctrl+Shift+G"],
    ["Hide, lock", "Ctrl+Shift+H, Ctrl+Shift+L"], ["Align left, centres, right", "Alt+A, Alt+H, Alt+D"], ["Align top, middles, bottom", "Alt+W, Alt+V, Alt+S"],
    ["Spread across, down", "Shift+Alt+H, Shift+Alt+V"], ["Tidy up", "Shift+Alt+T"]]],
  ["On a freeform canvas", [["Nudge, four steps", "Arrows, Shift+Arrows"], ["Opacity 10% to 90%, opaque", "1 to 9, 0"], ["Keep proportions while resizing", "Shift-drag"],
    ["Resize from the centre", "Alt-drag"], ["Keep to one axis, once moving", "Shift"], ["Drag a copy", "Alt-drag"], ["Turn in 15° steps, while turning", "Shift"],
    ["Move without snapping, held", "Ctrl"], ["Flip across, down", "Shift+H, Shift+V"]]],
  ["Components", [["Swap for another", "Cmd-drag"], ["Step a heading's size", "Shift+Up, Shift+Down"]]],
];
var STYLE_KEYS = Object.keys(DATA.tokens);
/* Properties first: everything a component has of its own. Appearance and
   Layout are the same for every layer. */
var TABS = [["content", "Properties"], ["appearance", "Appearance"], ["layout", "Layout"]];
/* The canvas tools, in a bar along the canvas's foot. Each draws one primitive where it's pressed, sized by
   the drag and snapped to the system's size steps. */
/* Select and Hand stand alone; the rest are groups. Pressing a group opens
   its tray along the bar, and the group shows the last tool picked from it.
   "comp:Name" places that component. A tool marked soon isn't built yet. */
var TOOLBAR = [
  { nav: true },
  null,
  { group: "layout", label: "Layout", items: [
    { id: "box", label: "Group", icon: "container", key: "B", hint: "A box that lays out what it holds in a row or a column (auto layout)" },
    { id: "comp:Section", label: "Section", icon: "layout", hint: "A band across the page" },
    { id: "frame", label: "Frame", icon: "frame", key: "F", hint: "A screen at a fixed device size" },
    { id: "page", label: "Tall frame", icon: "file", hint: "A frame that grows as tall as what's on it" },
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
/* No family is shared by every layer any more: scopeOf says which suit a
   selection, and optionAllowed which options of a style key it may take. */
var SHARED_FAMILY = {};
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
  fit: "Resizing", control: "Controls", icon: "Icons", avatar: "Avatars", media: "Media", artboard: "Artboards", container: "Page column",
  step: "Steps of the size grid", inset: "Inset", space: "Stack and inline", layout: "Layout layers", band: "Sections and page",
};
var CONTROL_TYPES = { Badge: 1, Tag: 1, Pagination: 1, QuantityStepper: 1, PromoCode: 1, FulfilmentToggle: 1, VariantPicker: 1, Rating: 1 };
var MEDIA_TYPES = { Image: 1, Video: 1, Cover: 1, Media: 1, Figure: 1, AspectRatio: 1, ProductGallery: 1, SocialPost: 1 };
var BAND_TYPES = { Group: 1, Section: 1, Stack: 1, Inline: 1, Grid: 1, Card: 1, Prose: 1 };
var TEXT_TYPES = { Text: 1, Heading: 1, Quote: 1, Code: 1, Link: 1 };
var PICTURE_TYPES = { Image: 1, Figure: 1, Cover: 1 };
/* What kind of layer a type is, for the tokens that suit it. A container
   at the top of a frame is a band, as a Section is. */
function roleOf(t, top) {
  var m = META[t];
  if (t === "Avatar" || t === "AvatarGroup") return "avatar";
  if (t === "Icon" || t === "IconButton") return "icon";
  if (t === "Shape") return "shape";
  if (CONTROL_TYPES[t] || (m && (m.group === "actions" || m.group === "forms"))) return "control";
  if (MEDIA_TYPES[t]) return "media";
  if (t === "Section" || (m && m.group === "blocks")) return "band";
  if (BAND_TYPES[t]) return top && t !== "Card" && t !== "Prose" ? "band" : "container";
  if (TEXT_TYPES[t]) return "text";
  return "element";
}
/* The families each role may use, most suited first. Control, icon and
   avatar sizes only reach their own components; section padding, the page
   gutter and the layout layers only reach containers and bands. */
var ROLE_FAMILIES = {
  avatar: { size: ["avatar", "fit", "step"], space: ["inset"] },
  icon: { size: ["icon", "control", "fit", "step"], space: ["inset", "space"] },
  shape: { size: ["step", "icon", "control", "fit"], space: ["inset", "space"] },
  control: { size: ["control", "fit", "step"], space: ["inset", "space"] },
  media: { size: ["media", "artboard", "container", "fit", "step"], space: ["inset", "space"] },
  band: { size: ["fit", "container", "media", "artboard", "step"], space: ["band", "layout", "inset", "space"] },
  container: { size: ["fit", "container", "media", "artboard", "step"], space: ["layout", "band", "inset", "space"] },
  text: { size: ["fit", "container", "step"], space: ["space", "inset"] },
  element: { size: ["fit", "container", "step"], space: ["inset", "space"] },
};
/* The families that suit a selection: what all its layers have in common.
   opts.top: every layer sits at the top of its frame. opts.social: the
   frame is a social artboard, the only place artboard sizes belong. */
function scopeOf(types, opts) {
  opts = opts || {};
  var one = types.length && types.every(function (x) { return x === types[0]; }) ? types[0] : null;
  var lists = types.map(function (t) { return ROLE_FAMILIES[roleOf(t, opts.top)]; });
  var common = function (axis) {
    if (!lists.length) return ROLE_FAMILIES.element[axis].slice();
    return lists[0][axis].filter(function (f) {
      return (f !== "artboard" || opts.social) && lists.every(function (l) { return l[axis].indexOf(f) >= 0; });
    });
  };
  return { name: one || "these items", role: one ? roleOf(one, opts.top) : null, size: common("size"), space: common("space") };
}
/* Whether a style key's option suits a scope. A page width never sizes a
   height, and a module padding step (the room above and below a band)
   never pads a side. Keys outside size and spacing take every option. */
var HEIGHT_KEYS = { height: 1, h: 1 };
var SIDE_KEYS = { paddingLeft: 1, paddingRight: 1, marginLeft: 1, marginRight: 1 };
function optionAllowed(key, o, scope) {
  var def = DATA.tokens[key];
  if (!def || (def.section !== "size" && def.section !== "spacing")) return true;
  if (!o.family) return true;
  if (HEIGHT_KEYS[key] && o.family === "container") return false;
  if (SIDE_KEYS[key] && /^module($|-(sm|lg|xl)$)/.test(o.value)) return false;
  var list = def.section === "size" ? scope.size : scope.space;
  return list.indexOf(o.family) >= 0;
}
/* The older name, for callers that only want the ordered families. */
function contextOf(types, opts) { return scopeOf(types, opts); }
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
  ["home", "Home", "All your projects", "home"],
  ["assets", "Assets", "Primitives, variables, components, blocks and templates", "plus"],
  ["pages", "Pages", "The project's pages, each its own canvas", "file"],
  ["layers", "Layers", "Everything in each frame", "layers2"],
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

export { IS_MAC, PANELS, SHORTCUTS, VIRTUAL_AFTER, LIVE_MAX, useEvent, allSame, nodeLabel, typeIcon, isOwner, hasTitlePart, nodeIsOpen, frameSize, kbd, HEIGHT_KEYS, ROLE_FAMILIES, SIDE_KEYS, optionAllowed, roleOf, scopeOf, BACKUP_KEY, BAND_ROOT, BAND_TYPES, BUILDER_SRC, CAROUSEL_ITEMS, CAROUSEL_STEPS, CONTROL_TYPES, DATA, FAMILY_LABEL, FRAME_GAP, GROUP_ICON, GROUP_TYPE_ICON, LABEL_ROOM, LIB_KEY, LIB_KINDS, MAX_HEIGHT, MAX_WIDTH, MAX_ZOOM, MEDIA_LIMIT, MEDIA_TYPES, MEDIA_URL, META, MIN_FREE, MIN_SIDE, MIN_ZOOM, PICTURE_TYPES, PREFS_KEY, PRESET, PRESETS, PRESET_ICON, RAIL, SHARED_FAMILY, SLOT_ACCEPTS, SPACINGS, STAGE_PAD, STORE_KEY, STYLE_KEYS, TABS, TEXT_PROPS, TEXT_STYLES, TEXT_TYPES, TONE_FILL, TONE_TEXT, TOOLBAR, TOOL_INFO, TOOL_KEY, TYPE_ICON, WRAPS, ZOOM_STEPS, contextOf, cx, e, hasSlots, isContainer, joinsFlow, minSide, mountEl, mql, nameOf, readForLibrary, remover, removerLoading, slotAccepts, slotSpec, slotTakes, smartTab, storage, useCallback, useEffect, useMemo, useRef, useState, words };
