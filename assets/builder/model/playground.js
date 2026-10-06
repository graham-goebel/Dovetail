/* The Playground: a project on Home with a Start here file that walks
   through the builder, and example files to take apart. Every browser gets
   it once (a first visit opens Start here); New on Home adds a fresh copy.

   It's built here from the same make() a drop uses, so it stays valid as
   the components and tokens move; the unit test cleans every page of it and
   expects nothing left out. */

import { make, makeFrame, uid } from "./tree.js";
import { STARTERS } from "./starters.js";
import { pageOf } from "./store.js";
import { storage } from "../config.js";

var PLAYGROUND_KEY = "dovetail-builder-playground";
var PLAYGROUND_NAME = "Playground";

/* ------------------------------------------------------------ pieces */

function frame(name, preset, children, extra) {
  var f = makeFrame(name, preset, true);
  f.mode = "structured";
  Object.assign(f, extra || {});
  f.root.children = children;
  return f;
}
function doc() {
  var frames = Array.prototype.slice.call(arguments);
  return { frames: frames, active: frames[0].id };
}
function slot(name, children) { return { id: uid(), type: "Slot", props: { name: name }, style: {}, children: children }; }
function text(children, variant, extra) { return make("Text", Object.assign({ children: children, variant: variant || "body" }, extra)); }
function heading(children, size, extra) { return make("Heading", Object.assign({ children: children, size: size || "heading-md", level: 2 }, extra)); }
function button(children, variant, extra) { return make("Button", Object.assign({ children: children, variant: variant || "primary" }, extra)); }
function group(props, children, style) { return make("Group", Object.assign({ direction: "column", gap: "md" }, props), children, style); }

/* A guide page: a section with an eyebrow, a title, a lead, then the rest. */
function guide(eyebrow, title, lead, rest, tone) {
  return make("Section", { width: "default", tone: tone || "base" }, [
    make("Stack", { layer: "block" }, [
      make("Stack", { layer: "related" }, [
        text(eyebrow, "eyebrow"),
        heading(title, "display-sm", { level: 1 }),
        lead ? text(lead, "lead", { measure: "default" }) : null,
      ].filter(Boolean)),
    ].concat(rest)),
  ]);
}

/* ------------------------------------------------------------ Start here */

function welcome() {
  var n = 0;
  var step = function (title, description) { n++; return make("Card", { eyebrow: "Step " + n, title: title, description: "" }, [text(description, "small", { tone: "secondary" })]); };
  return doc(frame("Welcome", "desktop", [
    guide("Playground", "Welcome to the builder", "Arrange real Dovetail components into screens, styled only with the system's tokens. These pages walk you through it, and the example files beside this one are yours to take apart.", [
      make("Grid", { columns: 4, gap: "md" }, [
        step("Add", "Open Assets in the left rail. Drag a component onto a frame, or press it to drop it into what's selected."),
        step("Select", "Click anything on the canvas to select it, and double-click text to type. Layers shows the whole tree."),
        step("Style", "The inspector on the right offers tokens, not raw values, so whatever you make stays on the system."),
        step("Share", "Export gives you the React code, a picture, the layout as a file, or a link that opens it here."),
      ]),
      make("Callout", { tone: "tip", title: "Make it yours", children: "Everything in the Playground can be changed or deleted. For a fresh copy, choose New, then Playground, on Home." }),
    ]),
    make("Section", { width: "default", tone: "subtle" }, [
      make("Stack", { layer: "group" }, [
        heading("The pages in this file", "heading-md"),
        make("List", { divided: true, label: "Pages", items: [
          { title: "Style a card", description: "Change a fill, a variant and a type size" },
          { title: "Lay out a row", description: "Direction, gap and alignment on a Group" },
          { title: "Freeform and structured", description: "The two kinds of frame, side by side" },
          { title: "Light, dark and themes", description: "Each frame's own mode, and Configure for all of them" },
          { title: "Use the components", description: "Preview and Play, with Tabs, an Accordion, a Carousel" },
          { title: "Keys worth knowing", description: "The shortcuts that save the most time" },
        ] }),
      ]),
    ]),
  ]));
}

function styleCard() {
  return doc(frame("Style a card", "desktop", [
    guide("Try it", "Style a card", null, [
      make("Grid", { columns: 2, gap: "xl", align: "center" }, [
        make("Stepper", { orientation: "vertical", current: 0, label: "Steps", steps: [
          { label: "Select the card", description: "Click its edge on the canvas, or its row in Layers." },
          { label: "Change its fill", description: "Appearance, then Fill, then Brand muted. Only tokens are offered." },
          { label: "Make the button brand", description: "Select the button and pick the brand variant." },
          { label: "Step the heading", description: "Select the title and press Shift and Up to move up the type scale." },
        ] }),
        make("Card", { eyebrow: "New season", title: "Autumn collection", description: "Stoneware made slowly, for every day." }, [
          text("Four glazes, each fired twice.", "small", { tone: "secondary" }),
          slot("footer", [button("Shop now"), button("Our story", "ghost")]),
        ]),
      ]),
    ]),
  ]));
}

function layOutRow() {
  var stat = function (label, value, delta) { return make("Stat", { label: label, value: value, unit: "", delta: delta, deltaDirection: "up" }); };
  return doc(frame("Lay out a row", "desktop", [
    guide("Try it", "Lay out a row", "A Group lines up what's in it, in a row or a column. Select the Group below, then open Layout in the inspector and try its direction, gap and alignment. Drag a Stat's row in Layers to reorder it.", [
      group({ direction: "row", gap: "lg", justify: "space-between" }, [
        stat("Workshops", "12", "+2"), stat("Pieces a week", "4,800", "+6%"), stat("Free repairs", "5 yrs", "new"),
      ], { padding: "lg", border: "subtle", radius: "container" }),
      text("Tip: Ctrl+G groups what's selected, and Ctrl+Shift+G takes the group apart again.", "small", { tone: "secondary" }),
    ]),
  ]));
}

function freeAndStructured() {
  var free = makeFrame("Freeform", "laptop", false);
  free.mode = "free";
  free.surface = "subtle";
  free.root.children = [
    make("Shape", { shape: "ellipse" }, undefined, { x: 136, y: 28, fw: 80, fh: 80, surface: "brand-muted" }),
    make("Shape", { shape: "rectangle" }, undefined, { x: 168, y: 92, fw: 56, fh: 40, surface: "brand", radius: "container", rot: -8 }),
    make("Heading", { children: "Freeform", size: "display-sm", level: 2 }, undefined, { x: 16, y: 24 }),
    make("Text", { children: "Place anything anywhere. Drag a layer to move it, pull its handles to size it in 4px steps, and drag just outside a corner to turn it.", variant: "lead" }, undefined, { x: 16, y: 48, fw: 100 }),
    make("Button", { children: "I go anywhere", variant: "secondary" }, undefined, { x: 16, y: 120 }),
  ];
  var structured = frame("Structured", "laptop", [
    make("Section", { width: "default" }, [
      make("Stack", { layer: "group" }, [
        heading("Structured", "display-sm"),
        text("Everything sits in Groups and Sections, styled with tokens. Drop something in and it takes its place in the flow; drag it in Layers to move it.", "lead"),
        group({ direction: "row", gap: "sm" }, [button("Primary"), button("Secondary", "secondary"), button("Ghost", "ghost")]),
        make("Callout", { tone: "note", title: "Switch a frame's kind", children: "Select the frame, then Layout, then Kind. Turning a freeform frame structured lines its layers up in Groups." }),
      ]),
    ]),
  ]);
  return doc(free, structured);
}

function lightDark() {
  var sample = function () {
    return make("Section", { width: "narrow" }, [
      make("Stack", { layer: "group" }, [
        make("Inline", { gap: "xs" }, [make("Badge", { tone: "success", dot: true, children: "In stock" }), make("Badge", { tone: "brand", children: "New" })]),
        heading("Fired twice", "heading-lg"),
        text("A second firing makes the glaze hard enough for the dishwasher.", "body", { tone: "secondary" }),
        make("Input", { label: "Email" }),
        make("Switch", { label: "Tell me about new pieces", defaultChecked: true }),
        group({ direction: "row", gap: "sm" }, [button("Add to basket"), button("Save", "secondary")]),
      ]),
    ]);
  };
  var light = frame("Light", "tablet", [sample()]);
  var dark = frame("Dark", "tablet", [sample()], { dark: true });
  var note = frame("Light, dark and themes", "tablet", [
    guide("Try it", "Light, dark and themes", "Each frame has its own light or dark setting: select a frame and press the sun in the inspector's head. Configure, in the left rail, changes the theme for every frame at once, from colours and type to radius and density.", [
      make("Callout", { tone: "tip", title: "Dark inside a light page", children: "A Section can be dark on its own. Select one and turn on Dark in its Appearance." }),
    ]),
  ]);
  return doc(note, light, dark);
}

function useComponents() {
  return doc(frame("Use the components", "desktop", [
    guide("Try it", "Use the components", "Press Preview, the eye in the top bar, to use these as a visitor would, or Play to see the frame in a screen-sized window. Esc goes back to editing.", [
      make("Grid", { columns: 2, gap: "xl" }, [
        make("Stack", { layer: "group" }, [
          make("Tabs", { variant: "underline", value: "care", label: "About the piece", tabs: [{ id: "care", label: "Care" }, { id: "making", label: "Making" }, { id: "delivery", label: "Delivery" }] }),
          make("Slider", { label: "Glaze depth", defaultValue: 40 }),
          make("Switch", { label: "Gift wrap", defaultChecked: false }),
        ]),
        make("Accordion", { label: "Questions", items: [
          { title: "Is it dishwasher safe?", content: "Yes. A second firing makes the glaze hard enough." },
          { title: "Do you repair pieces?", content: "Chips and cracks are mended free for the first five years." },
          { title: "Where is it made?", content: "In small workshops within a day's drive." },
        ] }),
      ]),
      make("Carousel", { label: "Collections", layout: "coverflow" }),
    ]),
  ]));
}

function keys() {
  var list = function (label, items) { return make("List", { divided: true, label: label, items: items.map(function (it) { return { title: it[0], trailing: it[1] }; }) }); };
  return doc(frame("Keys worth knowing", "desktop", [
    guide("Reference", "Keys worth knowing", "Ctrl is Cmd on a Mac.", [
      make("Grid", { columns: 2, gap: "xl" }, [
        make("Stack", { layer: "related" }, [heading("Editing", "heading-sm"), list("Editing", [
          ["Undo, and redo", "Ctrl+Z, Ctrl+Shift+Z"], ["Duplicate", "Ctrl+D"], ["Copy, cut and paste", "Ctrl+C, X, V"],
          ["Copy and paste a style", "Ctrl+Alt+C, V"], ["Group, and ungroup", "Ctrl+G, Ctrl+Shift+G"], ["Delete", "Del"], ["Rename", "F2"],
        ])]),
        make("Stack", { layer: "related" }, [heading("Canvas", "heading-sm"), list("Canvas", [
          ["Select all", "Ctrl+A"], ["Bring forward, send back", "Ctrl+], Ctrl+["], ["Nudge, four steps", "Arrows, Shift+Arrows"],
          ["Zoom to fit, to the selection, to 100%", "Shift+1, 2, 0"], ["Step a heading's size", "Shift+Up, Down"], ["Hide the panels", "Tab"], ["Stop previewing", "Esc"],
        ])]),
      ]),
    ]),
  ]));
}

/* ------------------------------------------------------------ examples */

function starter(id) { return STARTERS.filter(function (s) { return s[0] === id; })[0][2](); }

function landing() {
  var d = starter("landing");
  var phone = makeFrame("Landing, phone", "phone", true);
  phone.root.children = [make("HeroBlock"), make("FeatureGridBlock", { tone: "subtle" }), make("CtaBlock", { tone: "brand" })];
  d.frames.push(phone);
  return d;
}

function social() {
  var post = function (name, preset, props) {
    var f = makeFrame(name, preset, false);
    f.typeScale = "social";
    f.root.children = [make("SocialPost", props)];
    return f;
  };
  return doc(
    post("Post", "post", { layout: "headline", format: "portrait", tone: "brand", eyebrow: "New season", title: "Made slowly. Used every day." }),
    post("Square", "square", { layout: "stat", format: "square", tone: "paper", eyebrow: "Since 2014", title: "4,800", body: "pieces a week, each one made by hand" }),
    post("Story", "story", { layout: "quote", format: "story", tone: "ink", title: "The mug I reach for every morning.", meta: "Sam, Leeds" })
  );
}

/* The builder's own screens, drawn in a freeform frame: every panel is a
   positioned Group, laid out inside with tokens. */
function builderScreens() {
  var at = function (x, y, w, h, props, children, style) {
    return make("Group", Object.assign({ direction: "column", gap: "sm" }, props), children,
      Object.assign({ x: Math.round(x / 4), y: Math.round(y / 4), fw: Math.round(w / 4), fh: Math.round(h / 4) }, style));
  };
  var row = function (props, children, style) { return make("Group", Object.assign({ direction: "row", gap: "sm", align: "center" }, props), children, style); };
  var col = function (props, children, style) { return make("Group", Object.assign({ direction: "column", gap: "sm" }, props), children, style); };
  var more = function (label, size) { return make("IconButton", { label: label, size: size || "sm" }); };
  var small = function (t, v) { return make("Button", { children: t, variant: v || "ghost", size: "sm" }); };
  var PANEL = { surface: "raised", border: "subtle", radius: "container" };
  var WELL = { surface: "sunken", border: "subtle", radius: "control", paddingTop: "xs", paddingBottom: "xs", paddingLeft: "sm", paddingRight: "sm" };
  var field = function (label, value, hint) {
    return col({ gap: "2xs" }, [text(label, "label"), row({ justify: "space-between" }, [text(value, "small"), text("⌄", "small", { tone: "tertiary" })], WELL)]
      .concat(hint ? [text(hint, "fine", { tone: "tertiary" })] : []));
  };
  var num = function (letter, value) { return row({ gap: "xs" }, [text(letter, "fine", { tone: "tertiary" }), text(value, "small")], WELL); };
  var search = function (placeholder) {
    return row({ gap: "xs" }, [text("⌕", "body", { tone: "tertiary" }), text(placeholder, "small", { tone: "tertiary" })],
      { paddingTop: "xs", paddingBottom: "xs", paddingLeft: "sm", paddingRight: "sm", surface: "sunken", border: "subtle", radius: "pill", h: "control-sm" });
  };
  var tile = function (title, blurb) {
    return col({ gap: "2xs", align: "center", justify: "center" }, [
      make("Shape", { shape: "rectangle" }, undefined, { w: "icon-lg", height: "icon-lg", surface: "subtle", radius: "control" }),
      text(title, "small", { weight: "semibold", align: "center" }),
      text(blurb, "fine", { tone: "tertiary", align: "center" }),
    ], { surface: "sunken", border: "subtle", radius: "container", paddingTop: "md", paddingBottom: "md", paddingLeft: "xs", paddingRight: "xs" });
  };
  var seg = function (label, value, names) { return make("Tabs", { variant: "pill", value: value, label: label, tabs: names.map(function (t) { return { id: t.toLowerCase(), label: t }; }) }); };
  var head = function (title) { return row({ justify: "space-between" }, [heading(title, "heading-xs", { level: 3 }), text("⌄", "small", { tone: "tertiary" })]); };

  var f = makeFrame("Workspace", "wide", false);
  f.dark = true;
  f.root.children = [
    at(0, 0, 1440, 56, { direction: "row", justify: "space-between", align: "center", gap: "md" }, [
      heading("Dovetail", "heading-sm", { level: 1 }),
      row({ gap: "xs" }, [text("Untitled"), more("File actions", "xs")]),
      row({ gap: "xs" }, [small("56%  ⌄", "secondary"), small("▷"), small("◉"), small("Export", "primary")]),
    ], { paddingLeft: "md", paddingRight: "md", borderBottom: "subtle" }),
    at(8, 64, 80, 828, { justify: "space-between", align: "stretch" }, [
      col({ gap: "xs", align: "stretch" }, ["Home", "Assets", "Pages", "Layers", "Content", "Configure"].map(function (l) { return small(l, l === "Assets" ? "secondary" : "ghost"); })),
      small("Account"),
    ], Object.assign({ padding: "xs" }, PANEL)),
    at(96, 64, 256, 828, { justify: "space-between" }, [
      make("Grid", { columns: 2, gap: "xs" }, [tile("Containers", "Frames and screen sizes"), tile("Primitives", "10 to add"), tile("Variables", "6 sets"), tile("Components", "81 to add"), tile("Blocks", "15 to add"), tile("Templates", "4 pages")]),
      search("Search all components"),
    ], Object.assign({ padding: "sm" }, PANEL)),
    at(384, 88, 728, 24, { direction: "row", gap: "xs", align: "center" }, [text("Landing", "small"), text("1280 × 2115", "fine", { tone: "tertiary" }), more("Frame actions", "xs")]),
    at(384, 112, 728, 780, { gap: "none" }, [make("Image", { placeholder: "Landing page", alt: "", radius: "none", ratio: "4:3" }, undefined, { height: "fill" })], { elevation: "2" }),
    at(596, 828, 304, 56, { direction: "row", gap: "2xs", align: "center", justify: "center" }, ["Select", "Text", "Heading", "Image"].map(function (t, i) { return small(t, i ? "ghost" : "secondary"); }),
      { padding: "xs", surface: "raised", radius: "pill", elevation: "3", border: "subtle" }),
    at(1128, 64, 304, 828, { gap: "none" }, [
      col({ gap: "sm" }, [
        row({ justify: "space-between" }, [heading("Landing", "heading-md"), row({ gap: "2xs" }, [small("☼"), more("Frame actions")])]),
        text("Hugs its content. Select something in it to change that instead.", "small", { tone: "secondary" }),
        field("Device", "Desktop"),
        row({ gap: "xs" }, [num("W", "1280"), num("H", "2115"), small("⛓"), small("⇄")]),
        field("Resizing", "Hug contents"),
      ], { padding: "sm", borderBottom: "subtle" }),
      col({ gap: "none" }, [seg("Inspector", "layout", ["Appearance", "Layout"])], { padding: "sm", borderBottom: "subtle" }),
      col({ gap: "xs" }, [head("Kind"), text("Frame kind", "label"), seg("Frame kind", "freeform", ["Freeform", "Structured"]), text("Place things anywhere, in any colour.", "fine", { tone: "tertiary" })], { padding: "sm", borderBottom: "subtle" }),
      col({ gap: "xs" }, [
        head("Page layout"),
        field("Layout character", "Page default", "Sets data-layout, which moves every layout layer token together."),
        field("Type scale", "Page", "The page's own sizes."),
        field("Page width", "Page", "The column every Section, block and page-width Group shares."),
      ], { padding: "sm" }),
    ], PANEL),
  ];
  return doc(f);
}

/* ------------------------------------------------------------ the project */

/* Its files, newest first on Home: Start here, then the examples. */
function playground() {
  return { name: PLAYGROUND_NAME, files: [
    { name: "Start here", pages: [
      { name: "Welcome", doc: welcome() }, { name: "Style a card", doc: styleCard() }, { name: "Lay out a row", doc: layOutRow() },
      { name: "Freeform and structured", doc: freeAndStructured() }, { name: "Light, dark and themes", doc: lightDark() },
      { name: "Use the components", doc: useComponents() }, { name: "Keys worth knowing", doc: keys() },
    ] },
    { name: "Example: Landing page", pages: [{ name: "Landing", doc: landing() }] },
    { name: "Example: Store", pages: [{ name: "Store", doc: starter("store") }] },
    { name: "Example: Settings form", pages: [{ name: "Settings", doc: starter("settings") }] },
    { name: "Example: Support chat", pages: [{ name: "Chat", doc: starter("chat") }] },
    { name: "Example: Social posts", pages: [{ name: "Posts", doc: social() }] },
    { name: "Example: Builder screens", pages: [{ name: "Workspace", doc: builderScreens() }] },
  ] };
}

/* The next millisecond, so files made one after another sort in that order. */
function tick() {
  var t = Date.now();
  return new Promise(function (done) { (function wait() { if (Date.now() > t) done(); else setTimeout(wait, 1); })(); });
}

/* Makes the project and its files in the store, the last file first so
   Start here is the most recent. Resolves to { group, first, doc }: the
   project, and Start here with its first page's document. */
function addPlayground(store) {
  var pg = playground();
  return store.createGroup(pg.name, { kind: "playground" }).then(function (g) {
    var steps = Promise.resolve(null);
    pg.files.slice().reverse().forEach(function (file) {
      steps = steps.then(tick).then(function () {
        return store.createProject(file.name, file.pages[0].doc, { group: g.id }).then(function (meta) {
          var more = store.renamePage(meta.id, pageOf(meta), file.pages[0].name);
          file.pages.slice(1).forEach(function (p) { more = more.then(function () { return store.addPage(meta.id, p.name, p.doc); }); });
          return more.then(function () { return store.getProject(meta.id); });
        });
      });
    });
    return steps.then(function (first) { return { group: g, first: first, doc: pg.files[0].pages[0].doc }; });
  });
}

/* Once per browser: the Playground, unless this browser has had it (or has
   one, from before its storage was cleared). Resolves to what addPlayground
   made, or null. */
function seedPlayground(store) {
  if (storage(function (s) { return s.getItem(PLAYGROUND_KEY); })) return Promise.resolve(null);
  return store.listGroups().then(function (groups) {
    return groups.some(function (g) { return g.kind === "playground"; }) ? null : addPlayground(store);
  }).then(function (made) {
    storage(function (s) { s.setItem(PLAYGROUND_KEY, "1"); });
    return made;
  }, function () {
    /* Storage that's full or refused: the builder still opens, and tries
       again next visit. */
    return null;
  });
}

export { PLAYGROUND_KEY, PLAYGROUND_NAME, addPlayground, playground, seedPlayground };
