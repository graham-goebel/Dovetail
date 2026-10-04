/* The builder itself: the canvas, the panels, the inspector, history and every action. */

import { CAROUSEL_STEPS, DATA, FAMILY_LABEL, FRAME_GAP, GROUP_ICON, GROUP_TYPE_ICON, LABEL_ROOM, LIB_KINDS, MAX_HEIGHT, MAX_WIDTH, MEDIA_LIMIT, MEDIA_URL, META, MIN_FREE, MIN_SIDE, PICTURE_TYPES, PREFS_KEY, PRESET, PRESETS, PRESET_ICON, RAIL, SHARED_FAMILY, SPACINGS, STAGE_PAD, STORE_KEY, TABS, TEXT_PROPS, TEXT_STYLES, TEXT_TYPES, TONE_FILL, TONE_TEXT, TOOLBAR, TOOL_INFO, TOOL_KEY, TYPE_ICON, WRAPS, ZOOM_STEPS, contextOf, cx, e, hasSlots, isContainer, joinsFlow, minSide, mountEl, mql, nameOf, readForLibrary, remover, slotAccepts, slotSpec, slotTakes, smartTab, storage, useCallback, useEffect, useMemo, useRef, useState, words } from "../config.js";
import { produce, freeze, setAutoFreeze } from "immer";
import { apply as applyChanges, diff as diffDocs, invert } from "../model/edits.js";
import { readLayout } from "../model/paste.js";
import { mergeUsage, usageOf, usesToken } from "../model/usage.js";
import { copyText, encode, loadPrefs, starterDoc, thick, withoutUploads } from "../model/share.js";
import { ago, foldersOf, itemsOf, pageOf, pagesOf, VERSIONS_MAX } from "../model/store.js";
import { STARTERS } from "../model/starters.js";
import { CONVERTS, FREE_MAX, active, autoLayout, canHold, clean, cleanNode, copy, emptyDoc, fixedSpot, frameById, fresh, isFree, locate, make, makeFrame, ops, presetOf, side, tokenOption, uid } from "../model/tree.js";
import { ENUM_ICONS, ENUM_LABEL, Icon, PROP_LABEL } from "../ui/icons.js";
import { AlignMatrix, BUILDER_ICON, ColorPick, Dropdown, Field, InlineEditor, ListEditor, NumberField, PinPad, Renamable, SearchField, Section, Segmented, Switch, Thumb, VIEW_H, VIEW_W, clampZoom, distance, layoutOf, midpoint, playDefault, playHeights, snapSide } from "../ui/parts.js";

/* Past this many frames, only frames near the view stay live. */
var VIRTUAL_AFTER = 6;
/* However far out the view is zoomed, at most this many frames are live. */
var LIVE_MAX = 8;
/* How many steps undo goes back. A step holds only what changed. */
var HISTORY_MAX = 200;
/* Documents are frozen: a write outside change() fails loudly instead of
   quietly rewriting history. */
setAutoFreeze(true);

/* ------------------------------------------------------------ the app */

function App(props) {
  var init = props.init;
  var store = props.store;
  var prefs = useMemo(loadPrefs, []);
  var docState = useState(function () { return freeze(init.doc, true); });
  var doc = docState[0], setDoc = docState[1];
  /* The project on screen: { id, name, createdAt, updatedAt, frames, thumb }. */
  var projectState = useState(init.project);
  var project = projectState[0], setProject = projectState[1];
  var projectRef = useRef(project); projectRef.current = project;
  /* The document last written for the project, so opening one isn't saved
     back as an edit (which would change its edited time). */
  var lastSaved = useRef(init.from === "saved" ? doc : null);

  var selState = useState([]);
  var selection = selState[0], setSelection = selState[1];
  /* A component's own part being changed, like a block's title: { id, part }. */
  var partState = useState(null);
  var part = partState[0], setPart = partState[1];
  var partRef = useRef(part); partRef.current = part;
  var hoverState = useState(null);
  var hover = hoverState[0], setHover = hoverState[1];
  var leftState = useState(["pages", "layers", "content", "configure"].indexOf(prefs.left) >= 0 ? prefs.left : "assets");
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
  var savedRef = useRef(saved); savedRef.current = saved;
  /* Home: every project, as a page over the canvas. */
  var homeState = useState(false);
  var home = homeState[0], setHome = homeState[1];
  var homeRef = useRef(false); homeRef.current = home;
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
  /* The colour behind the frames is the project's own (older saves kept one
     for every project, which the first project to open takes on). */
  var stageColorState = useState(typeof init.project.stage === "string" ? init.project.stage : (prefs.stage || ""));
  var stageColor = stageColorState[0], setStageColor = stageColorState[1];
  var openFramesState = useState({});
  var openFrames = openFramesState[0], setOpenFrames = openFramesState[1];
  var codeTitleState = useState("");
  var codeTitle = codeTitleState[0], setCodeTitle = codeTitleState[1];
  var clip = useRef(null);
  var layout = layoutOf(doc, heights, resizing, widths, movingFrame);
  var boxes = layout.boxes;

  var history = useRef({ past: [], future: [] });
  /* The page on screen, and each page's history while the project is open,
     so going back to a page brings its undo back too. */
  var pageState = useState(init.page || pageOf(init.project));
  var pageId = pageState[0], setPageId = pageState[1];
  var pageRef = useRef(pageId); pageRef.current = pageId;
  var histories = useRef({});
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
  /* Frames already looked at for components whose slots need filling. */
  var scanned = useRef(new WeakSet());
  /* Which frames are live on the canvas (see liveNow). */
  var liveRef = useRef({});
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
  var libState = useState(init.library);
  var library = libState[0], setLibrary = libState[1];
  var libRef = useRef(library); libRef.current = library;
  var libTabState = useState(null);
  var libTab = libTabState[0], setLibTab = libTabState[1];
  var libBusyState = useState(null);
  var libBusy = libBusyState[0], setLibBusy = libBusyState[1];
  /* The brand lives in the theme; this ticks when it changes, so Content's
     Brand gallery shows the new one. */
  var brandTickState = useState(0);
  var setBrandTick = brandTickState[1];
  var brandErrState = useState(null);
  var brandErr = brandErrState[0], setBrandErr = brandErrState[1];
  var libFirst = useRef(true);
  useEffect(function () {
    if (libFirst.current) { libFirst.current = false; return; }
    store.saveLibrary(library).catch(function () { announce("This browser is out of room for content. Remove something, or use smaller files."); });
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

  /* History keeps each step as the small changes it made (model/edits.js),
     with how to take them back. Undo makes the taking-back on the canvas as
     it is now, so a change that came from elsewhere since stays: undo only
     ever undoes your own steps. Every change is made with immer, so a frame
     nobody edited keeps its identity (the canvas skips re-rendering it),
     and documents are frozen, so nothing can change one behind history's
     back. */
  var remember = useCallback(function (prev, next) {
    var redo = diffDocs(prev, next);
    if (!redo.length) return;
    history.current.past.push({ redo: redo, undo: invert(redo) });
    if (history.current.past.length > HISTORY_MAX) history.current.past.shift();
    history.current.future = [];
  }, []);
  var commit = useCallback(function (next, nextSel, message) {
    next = freeze(next, true);
    remember(docRef.current, next);
    docRef.current = next;
    setDoc(next);
    if (nextSel !== undefined) select(nextSel === null || nextSel === "root" ? [] : [].concat(nextSel));
    if (message) announce(message);
  }, [announce, remember, select]);

  /* Runs fn on a draft of the document; returns the new document, or null
     when fn returns null (nothing to do). */
  var draft = function (fn, tidy) {
    var result;
    var next = produce(docRef.current, function (d) {
      result = fn(d);
      if (result === null || !tidy) return;
      /* A loose object with nothing left in it goes. */
      var kept = d.frames.filter(function (f) { return !(f.bare && !f.root.children.length); });
      if (kept.length && kept.length < d.frames.length) {
        d.frames = kept;
        if (!frameById(d, d.active)) d.active = kept[kept.length - 1].id;
      }
    });
    return result === null ? null : { doc: next, result: result };
  };

  /* A change that isn't an edit (filling a component's slots from its
     sample): no history step, no message. */
  var quiet = function (fn) {
    var out = draft(fn, false);
    if (!out) return false;
    docRef.current = out.doc;
    setDoc(out.doc);
    return true;
  };

  var change = useCallback(function (fn, message) {
    var out = draft(fn, true);
    if (!out) return false;
    commit(out.doc, out.result, message);
    return true;
  }, [commit]);

  /* Makes changes on the canvas as it is now, without a history step. */
  var place = useCallback(function (changes) {
    var next = applyChanges(docRef.current, changes);
    if (next === docRef.current) return next;
    docRef.current = next;
    setDoc(next);
    select(selRef.current.filter(function (id) { return locate(next, id); }));
    return next;
  }, [select]);
  var undo = useCallback(function () {
    var h = history.current;
    if (!h.past.length) return;
    var step = h.past.pop();
    h.future.push(step);
    place(step.undo);
    announce("Undone");
  }, [announce, place]);
  var redo = useCallback(function () {
    var h = history.current;
    if (!h.future.length) return;
    var step = h.future.pop();
    h.past.push(step);
    place(step.redo);
    announce("Redone");
  }, [announce, place]);
  /* Changes made somewhere else (later, by someone sharing the canvas):
     they land on the canvas, and your own history is left as it is. */
  var receive = useCallback(function (changes) { place(changes); }, [place]);

  /* Every change is saved to its project straight away, in order: while one
     save is being written the latest document waits, and only the newest is
     written next. The toolbar says when it last saved, or that it couldn't,
     so work is never lost quietly. */
  var saving = useRef({ busy: false, next: null, done: Promise.resolve() });
  var persist = useCallback(function (pid, d, pg) {
    var q = saving.current;
    q.next = { pid: pid, page: pg, doc: d };
    if (q.busy) return q.done;
    q.busy = true;
    var loop = function () {
      var job = q.next;
      q.next = null;
      if (!job) { q.busy = false; return Promise.resolve(); }
      return store.saveDoc(job.pid, job.doc, job.page).then(function () {
        setSaved({ ok: true, at: new Date() });
      }, function () {
        setSaved({ ok: false, at: null });
      }).then(loop);
    };
    q.done = loop();
    return q.done;
  }, []);
  /* Writes to the project itself (its page, colour and theme) wait their
     turn too, so a flush has everything on disk. */
  var metaWrites = useRef(Promise.resolve());
  var noteMeta = function (p) {
    var settle = function () { return p.then(null, function () { return null; }); };
    metaWrites.current = metaWrites.current.then(settle, settle);
    return p;
  };
  var flush = function () { return saving.current.done.then(function () { return metaWrites.current; }); };
  useEffect(function () {
    if (doc === lastSaved.current) return;
    persist(projectRef.current.id, doc, pageRef.current);
  }, [doc]);
  /* For the checks: the document and project on screen, and a way to wait
     for the save. */
  useEffect(function () {
    window.__builder = { doc: function () { return docRef.current; }, project: function () { return projectRef.current; }, library: function () { return libRef.current; }, flush: flush, store: store,
      /* One prop on one layer, through the same undoable change a control makes. */
      edit: function (id, key, value) { return change(function (d) { var at = locate(d, id); if (!at) return null; at.node.props[key] = value; return undefined; }); },
      /* Changes as someone else would send them, and the changes an edit makes. */
      receive: receive, diff: diffDocs,
      /* How many steps there are to undo and redo, and whether the project saved. */
      history: function () { return { past: history.current.past.length, future: history.current.future.length }; },
      saved: function () { return savedRef.current; } };
  }, []);
  useEffect(function () {
    storage(function (s) { s.setItem(PREFS_KEY, JSON.stringify({ category: category, kind: assetKind, view: view, tabs: tabByType, closed: closedSecs, left: left })); });
  }, [category, assetKind, view, tabByType, closedSecs, left]);
  useEffect(function () {
    var meta = projectRef.current;
    if (meta.stage === stageColor) return;
    meta.stage = stageColor;
    noteMeta(store.setSettings(meta.id, { stage: stageColor }));
  }, [stageColor]);

  /* The Configure theme is the project's own too. A project saved before
     that keeps the theme on screen when it first opens. Every change to the
     theme is saved to the project on screen. */
  var themeLoaded = useRef(false);
  var applyTheme = function (meta) {
    var P = window.DovetailConfigurePanel;
    if (!P || !P.loadTheme) return false;
    if (meta.theme) P.loadTheme(meta.theme);
    else { meta.theme = P.theme(); noteMeta(store.setSettings(meta.id, { theme: meta.theme })); }
    themeLoaded.current = true;
    return true;
  };
  var applyThemeRef = useRef(applyTheme); applyThemeRef.current = applyTheme;
  useEffect(function () {
    var ready = function () { applyThemeRef.current(projectRef.current); };
    if (!applyThemeRef.current(projectRef.current)) window.addEventListener("dovetail:configure-ready", ready, { once: true });
    var timer = null;
    var changed = function () {
      var P = window.DovetailConfigurePanel;
      setBrandTick(function (n) { return n + 1; });
      if (!themeLoaded.current || !P || !P.theme) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var meta = projectRef.current;
        meta.theme = P.theme();
        noteMeta(store.setSettings(meta.id, { theme: meta.theme }));
      }, 250);
    };
    window.addEventListener("dovetail:theme-change", changed);
    return function () { window.removeEventListener("dovetail:configure-ready", ready); window.removeEventListener("dovetail:theme-change", changed); clearTimeout(timer); };
  }, []);
  var firstDoc = useRef(doc);
  useEffect(function () {
    if (doc !== firstDoc.current && /^#(b|jsx)=/.test(location.hash)) window.history.replaceState(null, "", location.pathname + location.search);
  }, [doc]);
  /* A link to one layer opens with that layer selected and its frame in view. */
  var focused = useRef(false);
  useEffect(function () {
    if (focused.current || (init.from !== "link" && init.from !== "jsx") || !ready[doc.active] || !box.w) return;
    focused.current = true;
    showFrame(doc.active, true);
    if (init.focus && locate(docRef.current, init.focus)) { select([init.focus]); setLeft("layers"); }
  }, [ready, box.w]);
  useEffect(function () {
    if (init.from === "jsx") {
      if (init.error) announce("The example didn't open: " + init.error);
      else announce("Added the example as a new frame." + (init.dropped.length ? " " + init.dropped.length + (init.dropped.length === 1 ? " thing" : " things") + " didn't come in as written: " + init.dropped.slice(0, 3).join("; ") : ""));
      return;
    }
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
    if (editRef.current) editDone(true);
    if (d.active === fid) return;
    var next = freeze(Object.assign({}, d, { active: fid }));
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
    /* A big project opens on its active frame, not the whole board. */
    if (doc.frames.length > 1 && doc.frames.length <= VIRTUAL_AFTER && wide) fitWidth(); else showFrame(doc.active);
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
      if (!f.bare || f.sized) return;
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
      if (sr && dr.lastX >= sr.left && dr.lastX <= sr.right && dr.lastY >= sr.top && dr.lastY <= sr.bottom) {
        var cz = camRef.current;
        frameOps.add(null, dr.payload.tool === "page", { x: (dr.lastX - sr.left - cz.x) / cz.z, y: (dr.lastY - sr.top - cz.y) / cz.z }, dr.payload.opts);
      }
      return;
    }
    if (!commitIt || !hit) return;
    if (hit.where === "loose") { placeLoose(dr.payload, hit); return; }
    var fid = hit.frame || docRef.current.active;
    if (dr.payload.kind === "tool") { placeTool(dr.payload.tool, hit, dr.payload.opts); return; }
    if (dr.payload.kind === "asset") {
      var where = { parent: hit.parent, index: hit.index, frame: fid, free: hit.free };
      if (dr.payload.media === "video") add("Video", where, { src: dr.payload.src }); else add("Image", where, Object.assign({ src: dr.payload.src, alt: dr.payload.label }, dr.payload.props), dr.payload.extra);
      return;
    }
    if (dr.payload.kind === "new") { add(dr.payload.type, { parent: hit.parent, index: hit.index, frame: fid, free: hit.free }, dr.payload.props, dr.payload.extra); return; }
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
    if (payload.kind === "new") { node = make(payload.type, Object.assign({}, payload.props), null, Object.assign({}, payload.extra && payload.extra.style)); if (payload.type === "Inline") node.props.wrap = false; }
    else if (payload.kind === "asset") node = payload.media === "video" ? make("Video", { src: payload.src }) : make("Image", Object.assign({ src: payload.src, alt: payload.label }, payload.props), null, Object.assign({}, payload.extra && payload.extra.style));
    else if (payload.kind === "tool") node = toolNode(payload.tool, null);
    else if (payload.kind === "local") node = instanceOf(payload.comp);
    else if (payload.kind === "move") moving = payload.id;
    if (node && payload.extra && payload.extra.name) node.name = payload.extra.name;
    /* Something dragged off a frame keeps the width it had there. */
    var had = null;
    if (moving) {
      var src = api(docRef.current.active);
      var r0 = src && src.rect ? src.rect(moving) : null;
      if (r0 && r0.width) had = Math.round(r0.width);
    }
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
      if (band && had) f.width = Math.max(MIN_SIDE, Math.min(MAX_WIDTH, had));
      if (!band) {
        f.bare = true;
        if (had) { f.width = Math.max(MIN_FREE, Math.min(MAX_WIDTH, had)); f.sized = true; }
      }
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
          edit: on(function (fid, id, text) { if (docRef.current.active !== fid) activateRef.current(fid); beginEditRef.current(id, text); }),
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
          frameDrag: on(function (fid, phase, x, y, dup) { var p = toPage(fid, x, y); return frameDragRef.current(fid, phase, p.x, p.y, dup); }),
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

  /* A component's sample slot contents, asked of any frame that's ready and
     kept once known. */
  var slotFrame = function () {
    var a = null;
    doc.frames.forEach(function (f) { if (!a && ready[f.id]) a = api(f.id); });
    return a && a.slots ? a : null;
  };
  var slotSample = function (type) {
    if (slotTpl.current[type] === undefined) {
      var a = slotFrame();
      if (!a) return [];
      try { slotTpl.current[type] = a.slots(type) || []; } catch (err) { slotTpl.current[type] = []; }
    }
    return slotTpl.current[type];
  };

  /* Each frame draws its own tree, and only when that tree (or preview)
     changed. */
  useEffect(function () {
    var any = null;
    /* A component's slots are filled from its sample once, the first time
       it's on a canvas, so its parts can be picked from then on. */
    var first = slotFrame();
    if (first) {
      var tpl = slotSample;
      var wants = function (n) { var m = META[n.type]; return !!m && !m.builder && !hasSlots(n) && tpl(n.type).length > 0; };
      /* Only frames that changed since the last look need looking at. */
      var missing = false;
      doc.frames.forEach(function (f) {
        if (scanned.current.has(f)) return;
        var here = false;
        (function walk(n) { (n.children || []).forEach(function (c) { if (wants(c)) here = true; walk(c); }); })(f.root);
        if (here) missing = true; else scanned.current.add(f);
      });
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
      /* Documents are immutable, so a frame nobody edited is the same object:
         comparing identity costs nothing, where serialising the frame cost
         its whole size on every edit. */
      var last = rendered.current[f.id];
      if (last && last.frame === f && last.preview === preview) return;
      rendered.current[f.id] = { frame: f, preview: preview };
      grows.current[f.id] = 0;
      a.render({ page: { dark: f.dark, surface: f.surface, canvas: f.canvas, spacing: f.spacing, gap: f.gap, typeScale: f.typeScale }, root: f.root }, { preview: preview, hug: f.hug || !!f.bare, bare: !!f.bare, sized: !!(f.bare && f.sized) });
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
  /* Where a piece of a component's text comes from: one of its text props
     (set, or the sample's), or one item of a list it shows (a question in
     an FAQ, a link in a nav), as the field of that item. */
  var textSource = function (node, text, f) {
    var want = String(text || "").trim();
    if (!want) return null;
    var base = scalars[node.type] || {};
    var keys = Object.keys(node.props).concat(Object.keys(base));
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === "children" && isContainer(node.type)) continue;
      var v = typeof node.props[k] === "string" ? node.props[k] : node.props[k] === undefined && typeof base[k] === "string" ? base[k] : null;
      if (v !== null && v.trim() === want) return { prop: k, value: v };
    }
    var meta = META[node.type];
    var lists = meta ? meta.props.filter(function (p) { return p.kind === "list"; }) : [];
    for (var j = 0; j < lists.length; j++) {
      var spec = lists[j];
      var own = Array.isArray(node.props[spec.name]) ? node.props[spec.name] : null;
      var items = own || (f && f.listSample ? f.listSample(node.type, spec.name) : null);
      if (!Array.isArray(items)) continue;
      for (var n = 0; n < items.length; n++) {
        var item = items[n];
        if (spec.of === "text") {
          if (String(item).trim() === want) return { prop: spec.name, index: n, value: String(item), sample: own ? null : items };
          continue;
        }
        var fields = (spec.fields || []).filter(function (x) { return x.kind === "text"; });
        for (var q = 0; q < fields.length; q++) {
          var fv = item && item[fields[q].name];
          if (typeof fv === "string" && fv.trim() === want) return { prop: spec.name, index: n, field: fields[q].name, value: fv, sample: own ? null : items };
        }
      }
    }
    return null;
  };
  /* Double-click: type in place. On a piece of text, that piece; otherwise
     the layer's own main text. */
  var beginEdit = function (id, text) {
    var at = locate(docRef.current, id);
    var f = api();
    if (!at || !f) return;
    var src = text ? textSource(at.node, text, f) : null;
    if (!src) {
      var prop = textPropOf(at.node);
      if (!prop) { select([id]); return; }
      var base = scalars[at.node.type] || {};
      src = { prop: prop, value: typeof at.node.props[prop] === "string" ? at.node.props[prop] : String(base[prop] || "") };
    }
    var t = f.textRect(id, src.value);
    if (!t) return;
    select([id]);
    setEdit(Object.assign({ id: id, before: src.value, base: docRef.current, box: toStage(t.rect), font: t.font }, src));
    if (mql("(max-width: 900px)")) setPane("canvas");
  };
  var beginEditRef = useRef(beginEdit); beginEditRef.current = beginEdit;
  var editChange = function (value) {
    var ed = editRef.current;
    if (!ed) return;
    setEdit(Object.assign({}, ed, { value: value }));
    quiet(function (d) {
      var at = locate(d, ed.id);
      if (!at) return null;
      if (ed.index === undefined) { at.node.props[ed.prop] = value; return undefined; }
      /* A list still showing its sample becomes the layer's own first. */
      if (!Array.isArray(at.node.props[ed.prop])) at.node.props[ed.prop] = JSON.parse(JSON.stringify(ed.sample || []));
      var list = at.node.props[ed.prop];
      if (ed.index >= list.length) return null;
      if (ed.field) list[ed.index][ed.field] = value;
      else list[ed.index] = value;
      return undefined;
    });
  };
  var editDone = function (keep) {
    var ed = editRef.current;
    if (!ed) return;
    setEdit(null);
    /* The typing was made quietly; it becomes one step when it's done, or is
       taken back when it's cancelled. */
    if (!keep) {
      place(invert(diffDocs(ed.base, docRef.current)));
      announce("Edit cancelled");
    } else if (ed.value !== ed.before) remember(ed.base, docRef.current);
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

  var add = function (type, where, props, extra) {
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
    if (extra && extra.name) n.name = extra.name;
    if (extra && extra.style) Object.assign(n.style, extra.style);
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
    /* One container into another (a Section into a Group, say), or onto
       the canvas as a frame of its own. */
    convert: function (type) {
      var id = selRef.current[selRef.current.length - 1];
      if (!id || !type) return;
      if (type === "frame") { layerToFrame(id); return; }
      if (!change(function (d) { return ops.convert(d, id, type); }, "Now a " + type)) announce("That can't be a " + type + " where it is");
    },
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
    if (homeRef.current) { if (ev.key === "Escape") { closeProjects(); return true; } return false; }
    if ((dialogRef.current && dialogRef.current.open) || (importRef.current && importRef.current.open) || (versionsRef.current && versionsRef.current.open) || (playRef.current && playRef.current.open) || (compRef.current && compRef.current.open)) return false;
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
    if (mode !== "structured") return;
    /* The auto layout is the point of it: the Layout tab opens, on the
       one Group everything went into when there is one. */
    var f = active(docRef.current);
    var g = f.root.children.length === 1 && f.root.children[0].type === "Group" ? f.root.children[0] : null;
    setTabByType(function (m) { var n = Object.assign({}, m); n.Group = "layout"; n[tabKey()] = "layout"; return n; });
    if (g) select([g.id]);
  };
  var setName = function (id, name) { change(function (d) { var at = locate(d, id); if (!at) return null; if (name) at.node.name = name; else delete at.node.name; return undefined; }); };

  /* Between frames and what's in them. A layer can become a frame of its
     own, beside the one it was in; a frame can become a Group, loose on the
     canvas where the frame was, to be dropped into another; and a loose
     object can become a frame. */
  var pinFrames = function (d) {
    var boxesNow = layoutRef.current.boxes;
    d.frames.forEach(function (fr) { if (typeof fr.x !== "number" && boxesNow[fr.id]) { fr.x = Math.round(boxesNow[fr.id].x); fr.y = Math.round(boxesNow[fr.id].y); } });
  };
  var layerToFrame = function (id) {
    var fid = docRef.current.active;
    var src = frameById(docRef.current, fid);
    var at0 = locate(docRef.current, id, fid);
    if (!src || fixedSpot(at0)) return;
    var a = api(fid), r = a && a.rect ? a.rect(id) : null;
    var b = layoutRef.current.boxes[fid];
    var label = nameOf(at0.node);
    change(function (d) {
      var at = locate(d, id, fid);
      if (fixedSpot(at)) return null;
      pinFrames(d);
      at.parent.children.splice(at.index, 1);
      var n = at.node;
      ["x", "y", "position", "anchor", "offset"].forEach(function (k) { delete n.style[k]; });
      var f = makeFrame(label, "desktop", true);
      f.width = Math.max(minSide(src), Math.min(MAX_WIDTH, Math.round(r && r.width ? r.width : src.width)));
      f.mode = src.mode;
      if (b) { f.x = Math.round(b.x + b.w + FRAME_GAP); f.y = Math.round(b.y); }
      f.root.children = [n];
      d.frames.push(f);
      d.active = f.id;
      return n.id;
    }, label + " is a frame of its own now");
  };
  var frameToGroup = function (fid) {
    var b = layoutRef.current.boxes[fid];
    change(function (d) {
      var f = frameById(d, fid);
      if (!f || f.bare) return null;
      pinFrames(d);
      /* What was placed freely goes into the Group's flow, top to bottom. */
      var kids = f.root.children.slice().sort(function (p, q) { return ((p.style.y || 0) - (q.style.y || 0)) || ((p.style.x || 0) - (q.style.x || 0)); });
      kids.forEach(function (k) { delete k.style.x; delete k.style.y; });
      var g = make("Group", { direction: "column", gap: "md" }, kids, { padding: "lg" });
      g.name = f.name;
      f.root.children = [g];
      f.bare = true;
      f.hug = true;
      f.sized = true;
      f.width = Math.round(b ? b.w : f.width);
      f.mode = "free";
      d.active = f.id;
      return g.id;
    }, "Now a Group, loose on the canvas: drag it into a frame");
  };
  var looseToFrame = function (fid) {
    var b = layoutRef.current.boxes[fid];
    change(function (d) {
      var f = frameById(d, fid);
      if (!f || !f.bare) return null;
      pinFrames(d);
      f.bare = false;
      delete f.sized;
      f.hug = true;
      f.width = Math.max(MIN_SIDE, Math.min(MAX_WIDTH, Math.round(b ? b.w : f.width)));
      d.active = f.id;
      return [];
    }, "Now a frame");
  };

  var frameOps = {
    /* page: a frame that hugs its content, started with a Section to fill.
       A new frame is the screen size of the frame on screen when that is a
       screen size, and a desktop screen otherwise (never a loose object's
       size, or an odd one a frame was dragged to). at: where its top left
       corner goes on the canvas; otherwise it goes beside the others. */
    /* opts: a kind (free or structured) and a screen size; otherwise the
       active frame's size, or a desktop screen. */
    add: function (size, page, at, opts) {
      opts = opts || {};
      var cur = active(docRef.current);
      var structured = opts.mode === "structured";
      var pid = opts.preset && PRESET[opts.preset] ? opts.preset : !page && !cur.bare ? presetOf(cur) : "";
      var p = (pid && PRESET[pid]) || PRESET.desktop;
      var f = makeFrame("Frame " + (docRef.current.frames.length + 1), pid || "desktop", !!page || structured);
      f.width = size ? side(size.width, MAX_WIDTH, p.width) : p.width;
      f.height = size ? side(size.height, MAX_HEIGHT, p.height) : p.height;
      if (opts.preset && p.typeScale) f.typeScale = p.typeScale;
      if (page) f.root.children = [make("Section")];
      /* A structured frame starts with a Group to put things in, and its
         blocks sit a block's gap apart. */
      if (structured) { f.mode = "structured"; var g = make("Group", { direction: "column", gap: "md" }, [], { padding: "lg", w: "fill" }); g.name = "Content"; f.root.children = [g]; f.gap = "block"; }
      var L = layoutRef.current, boxesNow = L.boxes;
      change(function (d) {
        var placed = d.frames.some(function (fr) { return typeof fr.x === "number"; });
        if (at || placed) {
          /* Frames still in their row keep the spot they're in, so the new one doesn't shuffle them. */
          d.frames.forEach(function (fr) { if (typeof fr.x !== "number" && boxesNow[fr.id]) { fr.x = Math.round(boxesNow[fr.id].x); fr.y = Math.round(boxesNow[fr.id].y); } });
          var cb = boxesNow[cur.id];
          f.x = Math.round(at ? at.x : L.left + L.width + FRAME_GAP);
          f.y = Math.round(at ? at.y : cb ? cb.y : L.top);
        }
        d.frames.push(f);
        d.active = f.id;
        return [];
      }, "Added " + f.name + ", " + f.width + " by " + f.height + (structured ? ": a structured frame. Everything goes in auto-layout Groups." : opts.mode === "free" ? ": a freeform frame. Place things anywhere." : ""));
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
  /* A new frame of a kind, the size of the active frame's screen. */
  var newFrame = function (mode) { frameOps.add(null, false, null, { mode: mode === "structured" ? "structured" : "free" }); };

  /* ------------------------------------------------- projects */

  /* Projects: each a name and its own canvas, kept in this browser. The
     home lists them; the bar names the one on screen. Switching saves this
     one first, then opens the other with a fresh history. */
  var versionsRef = useRef(null);
  /* null while the list is being read, so an old list never shows. */
  var projListState = useState(null);
  var projList = projListState[0], setProjList = projListState[1];
  var projQueryState = useState("");
  var projQuery = projQueryState[0], setProjQuery = projQueryState[1];
  var renamingState = useState(null);
  var renamingProj = renamingState[0], setRenamingProj = renamingState[1];
  var confirmState = useState(null);
  var confirmDel = confirmState[0], setConfirmDel = confirmState[1];
  var versionsState = useState([]);
  var versions = versionsState[0], setVersions = versionsState[1];
  /* Which of the two dialogs is open; their contents render only then. */
  var shownState = useState(null);
  var shown = shownState[0], setShown = shownState[1];
  var importFileRef = useRef(null);

  var refreshProjects = function () { return store.listProjects().then(function (list) { setProjList(list); return list; }); };

  /* A small picture of the active frame for the project's card: the frame's
     own export, scaled to 480px wide. Best effort; a card without one shows
     its frame count. */
  /* The project's picture: the active frame, small. An automatic one is
     quick (no web fonts to fetch) and never holds anything up for long; one
     chosen from the menu (byUser) takes its time and stays. */
  var captureThumb = function (byUser) {
    var pid = projectRef.current.id;
    if (projectRef.current.thumbSet && !byUser) return Promise.resolve();
    var a = api(docRef.current.active);
    if (!a || !a.snapshot) return Promise.resolve();
    var shot = a.snapshot("jpeg", { fonts: !!byUser });
    var late = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, byUser ? 15000 : 2500); });
    return Promise.race([shot, late]).then(function (url) {
      if (!url) return null;
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          var w = Math.min(480, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
          var c = document.createElement("canvas");
          c.width = w; c.height = Math.min(h, Math.round(w * 1.25));
          var g = c.getContext("2d");
          g.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.72));
        };
        img.onerror = function () { resolve(null); };
        img.src = url;
      });
    }).then(function (thumb) {
      if (!thumb) return null;
      return store.setThumb(pid, thumb, !!byUser).then(function (meta) {
        if (meta && meta.id === projectRef.current.id) { projectRef.current.thumb = meta.thumb; projectRef.current.thumbSet = meta.thumbSet; }
        return meta;
      });
    }).catch(function () { return null; });
  };
  /* A picture chosen from a file, cut to the card's 4:3 from its middle. */
  var THUMB_W = 480, THUMB_H = 360;
  var pictureFrom = function (file) {
    return new Promise(function (resolve) {
      if (!file || !/^image\//.test(file.type)) { resolve(null); return; }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = THUMB_W; c.height = THUMB_H;
        var k = Math.max(THUMB_W / img.naturalWidth, THUMB_H / img.naturalHeight);
        var w = img.naturalWidth * k, h = img.naturalHeight * k;
        c.getContext("2d").drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };
  var setPicture = function (id, file) {
    pictureFrom(file).then(function (thumb) {
      if (!thumb) { announce("That file isn't a picture this browser can read."); return; }
      store.setThumb(id, thumb, true).then(function (meta) {
        if (meta && meta.id === projectRef.current.id) { projectRef.current.thumb = meta.thumb; projectRef.current.thumbSet = true; }
        announce("Picture set");
        refreshProjects();
      });
    });
  };
  var framePicture = function () {
    announce("Taking a picture of this frame");
    captureThumb(true).then(function (meta) { announce(meta ? "This frame is the project's picture now" : "That frame couldn't be pictured."); });
  };
  var autoPicture = function () {
    var meta = projectRef.current;
    store.setThumb(meta.id, null, false).then(function () {
      meta.thumbSet = false;
      meta.thumb = null;
      return captureThumb(false);
    }).then(function () { announce("The picture follows the canvas again"); refreshProjects(); });
  };

  var openProjects = function () {
    setProjQuery("");
    setRenamingProj(null);
    setConfirmDel(null);
    setProjList(null);
    refreshProjects();
    setHome(true);
    captureThumb().then(refreshProjects);
  };
  var closeProjects = function () { setHome(false); setConfirmDel(null); setRenamingProj(null); };

  var switchTo = function (meta, d, message, pg) {
    var next = freeze(d, true);
    history.current = { past: [], future: [] };
    histories.current = {};
    pg = pg || pageOf(meta);
    pageRef.current = pg;
    setPageId(pg);
    setEdit(null);
    select([]);
    lastSaved.current = next;
    projectRef.current = meta;
    setProject(meta);
    store.setLastOpened(meta.id);
    /* Its own canvas colour and theme come with it. */
    if (typeof meta.stage !== "string") meta.stage = "";
    setStageColor(meta.stage);
    applyTheme(meta);
    docRef.current = next;
    setDoc(next);
    closeProjects();
    if (message) announce(message);
    setTimeout(function () { showFrameRef.current(next.active); }, 0);
  };
  var openProject = function (meta) {
    if (meta.id === projectRef.current.id) { closeProjects(); return; }
    var pg = pageOf(meta);
    captureThumb().then(flush).then(function () { return store.loadDoc(meta.id, pg); }).then(function (d) {
      if (!d) { announce("That project couldn't be opened."); return; }
      switchTo(meta, d, "Opened " + meta.name, pg);
    });
  };
  var newProject = function (starterId) {
    var s = starterId ? STARTERS.filter(function (x) { return x[0] === starterId; })[0] : null;
    var d = s ? s[2]() : emptyDoc();
    var taken = (projList || []).map(function (p) { return p.name; });
    var name = s ? s[1] : "Untitled";
    for (var n = 2; taken.indexOf(name) >= 0; n++) name = (s ? s[1] : "Untitled") + " " + n;
    /* A new project starts with the theme on screen, and the builder's own canvas colour. */
    var P = window.DovetailConfigurePanel;
    var settings = { stage: "", theme: P && P.theme ? P.theme() : undefined };
    captureThumb().then(flush).then(function () { return store.createProject(name, d, settings); }).then(function (meta) {
      switchTo(meta, d, "Made a new project, " + name);
    });
  };
  var renameProject = function (id, name) {
    setRenamingProj(null);
    if (!name) return;
    store.renameProject(id, name).then(function (meta) {
      if (!meta) return;
      if (id === projectRef.current.id) { projectRef.current = meta; setProject(meta); }
      refreshProjects();
    });
  };
  var duplicateProject = function (id) {
    flush().then(function () { return store.duplicateProject(id); }).then(function (meta) {
      if (meta) announce("Made a copy, " + meta.name);
      refreshProjects();
    });
  };
  var deleteProject = function (id) {
    setConfirmDel(null);
    var gone = (projList || []).filter(function (p) { return p.id === id; })[0];
    store.deleteProject(id).then(refreshProjects).then(function (list) {
      announce("Deleted " + (gone ? gone.name : "the project"));
      if (id !== projectRef.current.id) return;
      /* The one on screen went: open the next, or start a new one. */
      if (list.length) store.loadDoc(list[0].id, pageOf(list[0])).then(function (d) { switchTo(list[0], d || emptyDoc(), "Opened " + list[0].name, pageOf(list[0])); });
      else { var d = starterDoc(); store.createProject("Untitled", d).then(function (meta) { switchTo(meta, d, "Made a new project"); refreshProjects(); }); }
    });
  };

  /* ------------------------------------------------- pages */

  /* A project's pages, each its own canvas. Opening one saves the page
     being left first; its history waits for it to come back. */
  var renamingPageState = useState(null);
  var renamingPage = renamingPageState[0], setRenamingPage = renamingPageState[1];
  var renamingFolderState = useState(null);
  var renamingFolder = renamingFolderState[0], setRenamingFolder = renamingFolderState[1];
  /* A page on the move in the list: where it is, and where it would land. */
  var pageDragState = useState(null);
  var pageDrag = pageDragState[0], setPageDrag = pageDragState[1];
  var pageDragRef = useRef(null);
  var pagesListRef = useRef(null);
  var confirmPageState = useState(null);
  var confirmPage = confirmPageState[0], setConfirmPage = confirmPageState[1];
  var takeMeta = function (meta) {
    if (meta && meta.id === projectRef.current.id) { projectRef.current = meta; setProject(meta); }
    return meta;
  };
  var openPage = function (pg) {
    if (pg === pageRef.current) return Promise.resolve();
    var meta = projectRef.current;
    if (editRef.current) editDone(true);
    return flush().then(function () { return store.loadDoc(meta.id, pg); }).then(function (d) {
      if (projectRef.current.id !== meta.id) return;
      histories.current[pageRef.current] = history.current;
      history.current = histories.current[pg] || { past: [], future: [] };
      var next = freeze(d || emptyDoc(), true);
      select([]);
      if (d) lastSaved.current = next;
      pageRef.current = pg;
      setPageId(pg);
      docRef.current = next;
      setDoc(next);
      noteMeta(store.setPage(meta.id, pg)).then(takeMeta);
      var named = pagesOf(projectRef.current).filter(function (x) { return x.id === pg; })[0];
      announce("Opened " + (named ? named.name : "the page"));
      setTimeout(function () { showFrameRef.current(next.active); }, 0);
    });
  };
  var addPage = function () {
    var meta = projectRef.current;
    var taken = pagesOf(meta).map(function (x) { return x.name; });
    var n = taken.length + 1, name = "Page " + n;
    while (taken.indexOf(name) >= 0) name = "Page " + (++n);
    flush().then(function () { return store.addPage(meta.id, name, emptyDoc(), pageRef.current); }).then(function (got) {
      if (!got) return null;
      takeMeta(got.meta);
      return openPage(got.page.id);
    });
  };
  var renamePage = function (pg, name) {
    setRenamingPage(null);
    if (!name) return;
    store.renamePage(projectRef.current.id, pg, name).then(takeMeta);
  };
  var movePage = function (pg, by) { store.movePage(projectRef.current.id, pg, by).then(takeMeta); };
  var placePage = function (pg, index, folderId) { return store.placePage(projectRef.current.id, pg, index, folderId).then(takeMeta); };
  /* Where the list ends for a folder: after its last page, counted without
     the page on the move. */
  var endOfFolder = function (fid, except) {
    var pages = pagesOf(projectRef.current).filter(function (p) { return p.id !== except; });
    var last = -1;
    pages.forEach(function (p, i) { if (p.folder === fid) last = i; });
    return last >= 0 ? last + 1 : pages.length;
  };
  var addFolder = function () {
    var meta = projectRef.current;
    var taken = foldersOf(meta).map(function (f) { return f.name; });
    var n = taken.length + 1, name = "Folder " + n;
    while (taken.indexOf(name) >= 0) name = "Folder " + (++n);
    store.addFolder(meta.id, name).then(function (got) {
      if (!got) return;
      takeMeta(got.meta);
      setRenamingFolder(got.folder.id);
      announce("Added " + name + ". Drag pages into it, or use a page's menu.");
    });
  };
  var renameFolder = function (fid, name) { setRenamingFolder(null); if (!name) return; store.renameFolder(projectRef.current.id, fid, name).then(takeMeta); };
  var foldFolder = function (fid, open) { store.foldFolder(projectRef.current.id, fid, open).then(takeMeta); };
  var moveFolder = function (fid, by) { store.moveFolder(projectRef.current.id, fid, by).then(takeMeta); };
  var deleteFolder = function (fid) { store.deleteFolder(projectRef.current.id, fid).then(function (m) { takeMeta(m); announce("Removed the folder. Its pages stay."); }); };
  var duplicatePage = function (pg) {
    flush().then(function () { return store.duplicatePage(projectRef.current.id, pg); }).then(function (got) {
      if (!got) return null;
      takeMeta(got.meta);
      announce("Made a copy, " + got.page.name);
      return openPage(got.page.id);
    });
  };
  var deletePage = function (pg) {
    setConfirmPage(null);
    var meta = projectRef.current;
    var gone = pagesOf(meta).filter(function (x) { return x.id === pg; })[0];
    if (pagesOf(meta).length < 2 || !gone) return;
    var here = pg === pageRef.current;
    var others = pagesOf(meta).filter(function (x) { return x.id !== pg; });
    /* Off the page first, so nothing saves into it once it's gone. */
    (here ? openPage(others[0].id) : flush()).then(function () { return store.deletePage(meta.id, pg); }).then(function (m) {
      delete histories.current[pg];
      takeMeta(m);
      announce("Deleted " + gone.name);
    });
  };

  /* A project as one file: its name and document, uploads and all. */
  var PROJECT_FORMAT = "dovetail-project";
  var exportProject = function (id) {
    flush().then(function () { return store.getProject(id); }).then(function (meta) {
      if (!meta) return null;
      return Promise.all(pagesOf(meta).map(function (p) { return store.loadDoc(id, p.id); })).then(function (docs) { return [meta, docs]; });
    }).then(function (got) {
      if (!got || !got[1][0]) return;
      /* Every page, in order; doc is the first, for files read before pages. */
      var pages = pagesOf(got[0]).map(function (p, i) { return { name: p.name, doc: got[1][i], folder: p.folder || undefined }; }).filter(function (p) { return p.doc; });
      var file = JSON.stringify({ format: PROJECT_FORMAT, version: 2, name: got[0].name, savedAt: new Date().toISOString(), doc: pages[0].doc, pages: pages, folders: foldersOf(got[0]), stage: got[0].stage, theme: got[0].theme });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([file], { type: "application/json" }));
      link.download = (got[0].name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "project") + ".dovetail";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
      announce("Downloaded " + link.download);
    });
  };
  var importProject = function (file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(String(reader.result)); } catch (err) { announce(file.name + " isn't a Dovetail project file."); return; }
      if (!data || data.format !== PROJECT_FORMAT || !data.doc) { announce(file.name + " isn't a Dovetail project file."); return; }
      var dropped = [];
      var given = (Array.isArray(data.pages) && data.pages.length ? data.pages : [{ name: "Page 1", doc: data.doc }]).slice(0, 50)
        .filter(function (p) { return p && p.doc && typeof p.doc === "object"; });
      if (!given.length) { announce(file.name + " isn't a Dovetail project file."); return; }
      var pages = given.map(function (p, i) { return { name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 60) : "Page " + (i + 1), doc: clean(p.doc, dropped), folder: typeof p.folder === "string" ? p.folder : null }; });
      var d = pages[0].doc;
      var name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : file.name.replace(/\.[\w]+$/, "");
      /* Its pages, canvas colour and theme come along, cleaned like anything else that comes in. */
      captureThumb().then(flush).then(function () { return store.createProject(name, d, { stage: data.stage, theme: data.theme }); }).then(function (meta) {
        var steps = store.setFolders(meta.id, data.folders).then(function () { return store.renamePage(meta.id, pageOf(meta), pages[0].name); })
          .then(function () { return pages[0].folder ? store.placePage(meta.id, pageOf(meta), 0, pages[0].folder) : null; });
        pages.slice(1).forEach(function (p) { steps = steps.then(function () { return store.addPage(meta.id, p.name, p.doc, undefined, p.folder); }); });
        return steps.then(function () { return store.getProject(meta.id); });
      }).then(function (meta) {
        switchTo(meta, d, "Opened " + name + (dropped.length ? ". " + dropped.length + (dropped.length === 1 ? " thing" : " things") + " in it were left out." : ""));
        refreshProjects();
      });
    };
    reader.readAsText(file);
  };

  /* Versions of the project on screen. Restoring is a step undo can take back. */
  var openVersions = function () {
    flush().then(function () { return store.listVersions(projectRef.current.id, pageRef.current); }).then(function (vs) {
      setVersions(vs);
      setShown("versions");
      var dlg = versionsRef.current;
      if (dlg && dlg.showModal && !dlg.open) dlg.showModal();
    });
  };
  var keepVersion = function () {
    store.addVersion(projectRef.current.id, docRef.current, "Saved by you", pageRef.current).then(function () { return store.listVersions(projectRef.current.id, pageRef.current); }).then(function (vs) {
      setVersions(vs);
      announce("Kept this version");
    });
  };
  var restoreVersion = function (v) {
    store.loadVersion(v.key).then(function (d) {
      if (!d) { announce("That version couldn't be opened."); return; }
      store.addVersion(projectRef.current.id, docRef.current, "Before restoring", pageRef.current);
      var dlg = versionsRef.current;
      if (dlg && dlg.open) dlg.close();
      commit(d, null, "Restored the version from " + new Date(v.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) + ". Undo to go back.");
      setTimeout(function () { showFrameRef.current(d.active); }, 0);
    });
  };

  /* Home: a page of every project over the canvas, which stays where it was
     underneath. Opening one puts the canvas back; so does Escape, or Back. */
  var homePage = function () {
    if (!home) return null;
    var q = projQuery.trim().toLowerCase();
    /* The project on screen first, then the most recently edited. */
    var list = (projList || []).filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; })
      .sort(function (x, y) { return (y.id === project.id) - (x.id === project.id) || y.updatedAt - x.updatedAt; });
    return e("main", { className: "bd-home bd-projects", "aria-labelledby": "bd-projects-title" },
      /* On a phone the bar lives in the canvas pane, under this page, so it comes along. */
      slot ? null : toolbar,
      e("div", { className: "bd-home-inner" },
      e("div", { className: "bd-home-head" },
        e("div", { className: "bd-code-intro" },
          e("h1", { id: "bd-projects-title", className: "bd-home-title" }, "Projects"),
          e("p", { className: "bd-inspect-sub" }, "Each project has its own canvas, saved in this browser. Download one as a file to move it or keep a copy.")),
        e("div", { className: "bd-code-actions" },
          e("label", { className: "bd-btn", title: "Open a .dovetail file as a new project" }, e(Icon, { name: "upload" }), "Open file",
            e("input", { ref: importFileRef, type: "file", className: "visually-hidden", accept: ".dovetail,application/json",
              onChange: function (ev) { var f = ev.target.files && ev.target.files[0]; ev.target.value = ""; importProject(f); } })))),
      e("div", { className: "bd-projects-bar" },
        e("button", { type: "button", className: "bd-btn bd-btn-primary", onClick: function () { newProject(null); } }, e(Icon, { name: "plus" }), "New project"),
        e("span", { className: "bd-projects-tpl", role: "group", "aria-label": "New project from a template" },
          STARTERS.filter(function (st) { return st[0] !== "blank"; }).map(function (st) {
            return e("button", { key: st[0], type: "button", className: "bd-btn bd-chip", onClick: function () { newProject(st[0]); }, title: "A new project from the " + st[1] + " template" }, st[1]);
          })),
        e(SearchField, { className: "bd-projects-search", label: "Search projects", placeholder: "Search projects", value: projQuery, onChange: setProjQuery })),
      list.length ? e("ul", { className: "bd-projects-grid", role: "list" }, list.map(function (p) {
        var current = p.id === project.id;
        return e("li", { key: p.id, className: cx("bd-proj", current && "is-current"), "data-project": p.id },
          e("button", { type: "button", className: "bd-proj-open", onClick: function () { openProject(p); }, "aria-label": "Open " + p.name + (current ? ", open now" : "") },
            e("span", { className: "bd-proj-thumb", "aria-hidden": "true" },
              p.thumb ? e("img", { src: p.thumb, alt: "" }) : e(Icon, { name: "frame" }))),
          e("div", { className: "bd-proj-info" },
            renamingProj === p.id
              ? e(Renamable, { className: "bd-proj-name", value: p.name, label: "Project name", startEditing: true, onChange: function (v) { renameProject(p.id, v); } })
              : e("span", { className: "bd-proj-name" }, p.name),
            e("span", { className: "bd-proj-meta" }, (current ? "Open now · " : "") + ago(p.updatedAt) + " · " + (pagesOf(p).length > 1 ? pagesOf(p).length + " pages · " : "") + p.frames + (p.frames === 1 ? " frame" : " frames"))),
          confirmDel === p.id
            ? e("div", { className: "bd-proj-confirm", role: "group", "aria-label": "Delete " + p.name },
              e("span", null, "Delete for good?"),
              e("button", { type: "button", className: "bd-btn bd-btn-danger", onClick: function () { deleteProject(p.id); } }, "Delete"),
              e("button", { type: "button", className: "bd-btn", onClick: function () { setConfirmDel(null); } }, "Keep"))
            : e("span", { className: "bd-proj-acts", role: "group", "aria-label": "Actions for " + p.name },
              e("button", { type: "button", className: "bd-act", "aria-label": "Rename " + p.name, title: "Rename", onClick: function () { setRenamingProj(p.id); } }, e(Icon, { name: "pencil" })),
              e("label", { className: "bd-act", title: "Choose a picture" },
                e(Icon, { name: "image" }),
                e("input", { type: "file", className: "visually-hidden", accept: "image/*", "aria-label": "Choose a picture for " + p.name,
                  onChange: function (ev) { var f = ev.target.files && ev.target.files[0]; ev.target.value = ""; setPicture(p.id, f); } })),
              e("button", { type: "button", className: "bd-act", "aria-label": "Duplicate " + p.name, title: "Duplicate", onClick: function () { duplicateProject(p.id); } }, e(Icon, { name: "copy" })),
              e("button", { type: "button", className: "bd-act", "aria-label": "Download " + p.name, title: "Download as a file", onClick: function () { exportProject(p.id); } }, e(Icon, { name: "exportOut" })),
              e("button", { type: "button", className: "bd-act", "aria-label": "Delete " + p.name, title: "Delete", onClick: function () { setConfirmDel(p.id); } }, e(Icon, { name: "trash" }))));
      })) : e("p", { className: "bd-sec-empty bd-projects-empty", "aria-busy": projList ? undefined : "true" }, !projList ? "Loading projects…" : q ? "No project is called that." : "No projects yet.")));
  };

  var versionsDialog = function () {
    var dialogProps = { className: "bd-code bd-versions", ref: versionsRef, "aria-labelledby": "bd-versions-title", onClose: function () { setShown(null); } };
    if (shown !== "versions") return e("dialog", dialogProps);
    return e("dialog", dialogProps,
      e("div", { className: "bd-code-head" },
        e("div", { className: "bd-code-intro" },
          e("h2", { id: "bd-versions-title" }, "Versions of " + project.name),
          e("p", { className: "bd-inspect-sub" }, "Kept every 10 minutes while you work and before big changes, " + VERSIONS_MAX + " at most. Restoring one is a step you can undo.")),
        e("div", { className: "bd-code-actions" },
          e("button", { type: "button", className: "bd-btn", onClick: keepVersion }, e(Icon, { name: "plus" }), "Keep this version"),
          e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { versionsRef.current.close(); } }, e(Icon, { name: "close" })))),
      versions.length ? e("ul", { className: "bd-versions-list", role: "list" }, versions.map(function (v) {
        return e("li", { key: v.key, className: "bd-version" },
          e("span", { className: "bd-version-when" }, new Date(v.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })),
          e("span", { className: "bd-version-what" }, v.label + " · " + v.frames + (v.frames === 1 ? " frame" : " frames")),
          e("button", { type: "button", className: "bd-btn", onClick: function () { restoreVersion(v); } }, "Restore"));
      })) : e("p", { className: "bd-sec-empty" }, "No versions yet. The first is kept after 10 minutes of work, or keep one now."));
  };

  /* Starting over, or a pasted layout. Templates add; only this replaces. */
  var startFrom = function (id) {
    if (id === "import") { openImport(); return; }
    var s = STARTERS.filter(function (x) { return x[0] === id; })[0];
    if (!s) return;
    var has = docRef.current.frames.some(function (f) { return f.root.children.length; });
    if (has && !window.confirm("Start over with a blank frame? Every frame goes; undo brings your work back.")) return;
    store.addVersion(projectRef.current.id, docRef.current, "Before starting over", pageRef.current);
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
      store.addVersion(projectRef.current.id, docRef.current, "Before a pasted layout", pageRef.current);
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
        { value: "duplicate", label: f.bare ? "Duplicate" : "Duplicate frame", icon: "copy" },
        { value: "rename", label: "Rename", icon: "pencil" },
        f.bare ? { value: "to-frame", label: "Turn into a frame", icon: "frame" } : { value: "to-group", label: "Turn into a group", icon: "group" },
        { value: "fit", label: "Zoom to frame", icon: "fit" },
        { value: "link", label: "Copy link to frame", icon: "link" },
        { value: "png", label: "Export as PNG", icon: "image" },
        { value: "jpeg", label: "Export as JPG", icon: "image" },
        { value: "delete", label: "Delete frame", icon: "trash", disabled: doc.frames.length < 2, danger: true },
      ],
      onChange: function (v) {
        if (v === "duplicate") frameOps.duplicate(f.id);
        if (v === "to-group") frameToGroup(f.id);
        if (v === "to-frame") looseToFrame(f.id);
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
  /* The brand: the name, the logo (a wordmark file, or the name set in type)
     and the brand mark, the same ones Configure's Brand group sets and kept
     with the project's theme. Each places on a frame like any picture. */
  var brandNow = function () {
    var P = window.DovetailConfigurePanel;
    return P && P.brand ? P.brand() : { name: "", mark: "", wordmark: "" };
  };
  var WORDMARK_TONE = { primary: "brand", secondary: "brand-secondary" };
  var brandPieces = function (b) {
    var name = b.name || "Your brand";
    var P = window.DovetailConfigurePanel;
    var tone = P && P.config ? WORDMARK_TONE[P.config().wordmarkColor] : null;
    var logo = b.wordmark
      ? { kind: "asset", src: b.wordmark, label: name, media: "image", props: { ratio: "21:9", fit: "contain", radius: "none" }, extra: { name: "Logo", style: { w: "x4" } } }
      : { kind: "new", type: "Heading", label: name, props: Object.assign({ children: name, size: "heading-md", balance: false }, tone ? { tone: tone } : {}), extra: { name: "Logo" } };
    var mark = b.mark ? { kind: "asset", src: b.mark, label: name + " mark", media: "image", props: { ratio: "square", fit: "contain", radius: "none" }, extra: { name: "Brand mark", style: { w: "x2" } } } : null;
    return { logo: logo, mark: mark };
  };
  var placeBrand = function (piece) {
    if (piece.kind === "asset") add("Image", null, Object.assign({ src: piece.src, alt: piece.label }, piece.props), piece.extra);
    else add(piece.type, null, piece.props, piece.extra);
    announce("Added the " + piece.extra.name.toLowerCase() + " to " + frame.name);
  };
  var setBrandPart = function (patch) {
    var P = window.DovetailConfigurePanel;
    if (!P || !P.setBrand) { setBrandErr("Configure hasn't loaded yet. Try again in a moment."); return false; }
    if (!P.setBrand(patch)) { setBrandErr("That picture couldn't be used. Use a PNG, JPEG, GIF, WebP or SVG."); return false; }
    setBrandErr(null);
    setBrandTick(function (n) { return n + 1; });
    return true;
  };
  var readBrandFile = function (kind, file) {
    if (!file) return;
    var P = window.DovetailConfigurePanel;
    var limit = (P && P.brandLimit) || 512 * 1024;
    var what = kind === "wordmark" ? "logo" : "brand mark";
    if (!/^image\//.test(file.type)) { setBrandErr("That isn't a picture. Use a PNG, JPEG, GIF, WebP or SVG."); return; }
    if (file.size > limit) { setBrandErr("That " + what + " is " + Math.round(file.size / 1024) + "KB. The limit is " + Math.round(limit / 1024) + "KB, because it's kept in this browser."); return; }
    var reader = new FileReader();
    reader.onload = function () { var patch = {}; patch[kind] = String(reader.result); if (setBrandPart(patch)) announce("The " + what + " is set for this project."); };
    reader.onerror = function () { setBrandErr("That file couldn't be read."); };
    reader.readAsDataURL(file);
  };
  var brandPanel = function () {
    var b = brandNow();
    var pieces = brandPieces(b);
    var tile = function (key, label, piece, preview, emptyNote, hint) {
      var fileId = "bd-brand-" + key;
      var hasFile = !!b[key];
      return e("section", { className: "bd-content-sec bd-brand-sec", "aria-labelledby": fileId + "-h",
        onDragOver: function (ev) { if (ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], "Files") >= 0) ev.preventDefault(); },
        onDrop: function (ev) { if (!ev.dataTransfer.files.length) return; ev.preventDefault(); readBrandFile(key, ev.dataTransfer.files[0]); } },
        e("h3", { className: "bd-content-h", id: fileId + "-h" }, label),
        piece ? e("button", { type: "button", className: cx("bd-brand-tile", key === "mark" && "is-mark"), "data-brand": key, title: "Drag the " + label.toLowerCase() + " onto a frame, or press to add it",
          onPointerDown: function (ev) { if (ev.pointerType !== "touch") startDrag(ev, piece); },
          onClick: function () { if (!justDragged.current) placeBrand(piece); } }, preview)
          : e("div", { className: "bd-brand-tile is-empty" }, e(Icon, { name: "image" }), e("span", null, emptyNote)),
        e("div", { className: "bd-content-add" },
          e("label", { className: "bd-btn", htmlFor: fileId }, e(Icon, { name: "upload" }), hasFile ? "Replace" : "Upload"),
          e("input", { id: fileId, type: "file", className: "visually-hidden", accept: "image/png,image/jpeg,image/gif,image/webp,image/svg+xml",
            onChange: function (ev) { readBrandFile(key, ev.target.files[0]); ev.target.value = ""; } }),
          hasFile ? e("button", { type: "button", className: "bd-btn", onClick: function () { var patch = {}; patch[key] = ""; if (setBrandPart(patch)) announce("Removed the " + label.toLowerCase() + "."); } }, "Remove") : null),
        hint ? e("p", { className: "bd-content-note" }, hint) : null);
    };
    return e("div", { className: "bd-content" },
      e("div", { className: "bd-panel-head bd-gallery-head" },
        e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Content", title: "Back to Content", onClick: function () { setLibTab(null); setBrandErr(null); } }, e(Icon, { name: "left" })),
        e("h2", { className: "bd-panel-title" }, "Brand")),
      e("p", { className: "bd-content-note bd-brand-intro" }, "The same name, logo and mark as Configure's Brand group. Each project keeps its own. Drag one onto a frame, or press it to add it."),
      e("section", { className: "bd-content-sec" },
        e("label", { className: "bd-content-h", htmlFor: "bd-brand-name" }, "Name"),
        e("input", { id: "bd-brand-name", className: "bd-input", type: "text", maxLength: 80, placeholder: "Your brand", value: b.name,
          onChange: function (ev) { setBrandPart({ name: ev.target.value }); } })),
      brandErr ? e("p", { className: "bd-brand-err", role: "alert" }, brandErr) : null,
      tile("wordmark", "Logo", pieces.logo,
        b.wordmark ? e("img", { src: b.wordmark, alt: "", draggable: false }) : e("span", { className: "bd-brand-word" }, b.name || "Your brand"),
        "", b.wordmark ? null : "Without a logo file, the logo is the name, set in type. SVG or PNG, up to 512KB."),
      tile("mark", "Brand mark", pieces.mark, b.mark ? e("img", { src: b.mark, alt: "", draggable: false }) : null, "No brand mark yet", "A small symbol for beside the logo, or on its own. SVG or PNG, up to 512KB."));
  };
  /* Content opens on a card for each kind; a card opens its gallery. */
  var brandCard = function () {
    var b = brandNow();
    var pics = [b.mark, b.wordmark].filter(Boolean);
    var note = b.wordmark && b.mark ? "Logo and mark" : b.wordmark ? "Logo" : b.mark ? "Mark, and the name" : b.name ? "The name" : "Name, logo and mark";
    return e("li", { key: "brand" }, e("button", { type: "button", className: "bd-kind", "data-kind": "brand", onClick: function () { setLibTab("brand"); } },
      e("span", { className: "bd-kind-pics is-brand" }, pics.length ? pics.map(function (src, i) { return e("img", { key: i, src: src, alt: "", draggable: false }); }) : b.name ? e("span", { className: "bd-brand-word" }, b.name) : e(Icon, { name: "tag" })),
      e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, "Brand"), e("span", { className: "bd-kind-note" }, note)),
      e(Icon, { name: "right", className: "bd-kind-chev" })));
  };
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
        e("ul", { className: "bd-kinds", role: "list" }, [brandCard()].concat(LIB_TABS.map(function (t) {
          var items = library[t[0]];
          var note = t[0] === "icons" ? (items.length ? items.length + " of yours, and the icon library" : "The icon library, and yours") : items.length ? items.length + (items.length === 1 ? " item" : " items") : "Nothing yet";
          return e("li", { key: t[0] }, e("button", { type: "button", className: "bd-kind", "data-kind": t[0], onClick: function () { setLibTab(t[0]); } },
            e("span", { className: cx("bd-kind-pics", t[0] === "icons" && "is-icons") }, items.length
              ? items.slice(0, 3).map(function (it) { return t[0] === "video" ? e("video", { key: it.id, src: it.src, muted: true, playsInline: true, preload: "metadata" }) : e("img", { key: it.id, src: it.src, alt: "", draggable: false }); })
              : e(Icon, { name: t[2] })),
            e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, t[1]), e("span", { className: "bd-kind-note" }, note)),
            e(Icon, { name: "right", className: "bd-kind-chev" })));
        }))));
    }
    if (libTab === "brand") return brandPanel();
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
    ["containers", "Containers", "frame", "Empty frames to build in: freeform, structured, tall, and every screen size"],
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
  /* Containers: an empty frame to build in. Freeform, structured or tall, or
     one of the screen sizes. Press one to add it beside your frames; drag it
     onto the canvas to put it where you drop it. */
  var CONTAINER_KINDS = [
    ["free", "Freeform frame", "frame", "Place anything anywhere, in any colour"],
    ["structured", "Structured frame", "layout", "Auto-layout Groups with tokens, ready for code"],
    ["page", "Tall frame", "file", "Grows as tall as what's on it"],
  ];
  var containerCard = function (key, name, icon, note, payload, onAdd) {
    return e("li", { key: key },
      e("button", { type: "button", className: "bd-kind bd-container-card", "data-container": key, title: note + ". Press to add one beside your frames, or drag it onto the canvas.",
        onPointerDown: function (ev) { if (ev.pointerType !== "touch") startDrag(ev, payload); },
        onClick: function () { if (!justDragged.current) onAdd(); } },
        e("span", { className: "bd-kind-pics is-asset" }, e(Icon, { name: icon })),
        e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, name), e("span", { className: "bd-kind-note" }, note))));
  };
  var containersPanel = function () {
    return e(React.Fragment, null,
      e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Frames")),
      e("ul", { className: "bd-kinds bd-containers", role: "list" }, CONTAINER_KINDS.map(function (k) {
        var page = k[0] === "page", opts = page ? null : { mode: k[0] };
        return containerCard(k[0], k[1], k[2], k[3], { kind: "tool", tool: page ? "page" : "frame", label: k[1], opts: opts }, function () { frameOps.add(null, page, null, opts); });
      })),
      e("div", { className: "bd-assets-head" }, e("h3", { className: "bd-assets-title" }, "Screen sizes")),
      e("ul", { className: "bd-kinds bd-containers", role: "list" }, PRESETS.map(function (p) {
        var opts = { preset: p.id, mode: "free" };
        return containerCard(p.id, p.label, PRESET_ICON[p.id] || "frame", p.width + " × " + p.height, { kind: "tool", tool: "frame", label: p.label, opts: opts }, function () { frameOps.add(null, false, null, opts); });
      })));
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
          var count = k[0] === "containers" ? "Frames and screen sizes" : k[0] === "variables" ? VAR_SETS.length + " sets" : k[0] === "templates" ? (STARTERS.length - 1) + " pages" : groupsOf(k[0]).reduce(function (t, g) { return t + usableIn(g).length; }, 0) + " to add";
          return e("li", { key: k[0] }, e("button", { type: "button", className: "bd-kind", "data-asset-kind": k[0], title: note, onClick: function () { setAssetKind(k[0]); } },
            e("span", { className: "bd-kind-pics is-asset" },
              e(Icon, { name: k[2] })),
            e("span", { className: "bd-kind-text" }, e("span", { className: "bd-kind-name" }, k[1]), e("span", { className: "bd-kind-count" }, count))));
        })));
    }
    var kind = ASSET_KINDS.filter(function (k) { return k[0] === assetKind; })[0] || ASSET_KINDS[0];
    var back = e("div", { className: "bd-panel-head bd-gallery-head" },
      e("button", { type: "button", className: "bd-act bd-act-ghost", "aria-label": "Back to Assets", title: "Back to Assets", onClick: function () { setAssetKind(null); } }, e(Icon, { name: "left" })),
      e("h2", { className: "bd-panel-title" }, kind[1]));
    if (kind[0] === "variables") return e("div", { className: "bd-assets" }, head, back, variablesPanel());
    if (kind[0] === "templates") return e("div", { className: "bd-assets is-cards" }, head, back, templatesPanel());
    if (kind[0] === "containers") return e("div", { className: "bd-assets is-cards" }, head, back, containersPanel());
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
  /* The pages as rows: a folder, then the pages in it (unless it's closed),
     and loose pages where they fall. A folder with nothing in it yet comes
     last. */
  var pageRows = function () {
    var byId = {};
    foldersOf(project).forEach(function (f) { byId[f.id] = f; });
    var rows = [], seen = {};
    itemsOf(pagesOf(project)).forEach(function (it) {
      var f = it.folder ? byId[it.folder] : null;
      if (!f) { it.pages.forEach(function (p) { rows.push({ kind: "page", page: p, folder: null }); }); return; }
      var open = f.open !== false;
      if (!seen[f.id]) { rows.push({ kind: "folder", folder: f, open: open, count: it.pages.length }); seen[f.id] = true; }
      if (open) it.pages.forEach(function (p) { rows.push({ kind: "page", page: p, folder: f.id }); });
    });
    foldersOf(project).forEach(function (f) { if (!seen[f.id]) rows.push({ kind: "folder", folder: f, open: f.open !== false, count: 0 }); });
    return rows;
  };
  /* Where a page on the move would land, from the pointer: a slot between
     rows, or a folder itself. The slot gives a place in the list and the
     folder it joins; after a folder's last page, a pointer tucked in means
     the folder, out at the edge means after it. */
  var pageDropAt = function (x, y) {
    var list = pagesListRef.current;
    var dr = pageDragRef.current;
    if (!list || !dr) return null;
    var rows = dr.rows;
    var els = Array.prototype.slice.call(list.querySelectorAll("[data-row]"));
    var pages = pagesOf(projectRef.current).filter(function (p) { return p.id !== dr.id; });
    var at = function (pid) { var i = pages.findIndex(function (p) { return p.id === pid; }); return i < 0 ? pages.length : i; };
    var listBox = list.getBoundingClientRect();
    var firstOf = function (fid) { var p = pages.filter(function (q) { return q.folder === fid; })[0]; return p ? at(p.id) : pages.length; };
    var slot = els.length, into = null;
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getBoundingClientRect();
      var row = rows[i];
      if (row.kind === "folder" && y >= b.top + b.height * 0.25 && y <= b.bottom - b.height * 0.25) { into = row.folder.id; slot = i; break; }
      if (y < b.top + b.height / 2) { slot = i; break; }
    }
    if (into) return { into: into, index: endOfFolder(into, dr.id), folder: into, line: null };
    var before = rows[slot], prev = rows[slot - 1];
    var tucked = x > listBox.left + 28;
    var folder = null, index;
    if (before && before.kind === "page" && before.folder && prev && (prev.kind === "page" ? prev.folder === before.folder : prev.folder.id === before.folder)) {
      folder = before.folder; index = at(before.page.id);
    } else if (prev && ((prev.kind === "page" && prev.folder) || (prev.kind === "folder" && !prev.open && prev.count)) && tucked) {
      folder = prev.kind === "page" ? prev.folder : prev.folder.id; index = endOfFolder(folder, dr.id);
    } else if (prev && prev.kind === "page" && prev.folder) {
      folder = null; index = endOfFolder(prev.folder, dr.id);
    } else if (before && before.kind === "page") {
      folder = null; index = at(before.page.id);
    } else if (before && before.kind === "folder") {
      folder = null; index = before.count ? firstOf(before.folder.id) : pages.length;
    } else {
      folder = null; index = pages.length;
    }
    var edge = slot < els.length ? els[slot].getBoundingClientRect().top : els.length ? els[els.length - 1].getBoundingClientRect().bottom : listBox.top;
    return { into: null, index: index, folder: folder, line: { top: edge - listBox.top + list.scrollTop, depth: folder ? 1 : 0 } };
  };
  /* The grip starts the move: a few pixels on, the page follows the pointer
     and a line shows where it would land. */
  var gripDown = function (p) {
    return function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      ev.preventDefault();
      var el = ev.currentTarget;
      try { el.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      pageDragRef.current = { id: p.id, name: p.name, pointer: ev.pointerId, x0: ev.clientX, y0: ev.clientY, live: false, rows: pageRows(), drop: null };
      var move = function (mv) {
        var dr = pageDragRef.current;
        if (!dr || mv.pointerId !== dr.pointer) return;
        if (!dr.live) { if (Math.abs(mv.clientX - dr.x0) + Math.abs(mv.clientY - dr.y0) < 4) return; dr.live = true; }
        dr.drop = pageDropAt(mv.clientX, mv.clientY);
        setPageDrag({ id: dr.id, name: dr.name, x: mv.clientX, y: mv.clientY, drop: dr.drop });
      };
      var end = function (up) {
        var dr = pageDragRef.current;
        if (!dr || (up && up.pointerId !== dr.pointer)) return;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", cancel);
        pageDragRef.current = null;
        setPageDrag(null);
        if (dr.live && dr.drop) {
          var fname = dr.drop.folder ? (foldersOf(projectRef.current).filter(function (f) { return f.id === dr.drop.folder; })[0] || {}).name : null;
          placePage(dr.id, dr.drop.index, dr.drop.folder).then(function () { announce("Moved " + dr.name + (fname ? " into " + fname : "")); });
        }
      };
      var cancel = function () { pageDragRef.current = null; setPageDrag(null); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", cancel); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", cancel);
    };
  };
  var pagesPanel = function () {
    var rows = pageRows();
    var folders = foldersOf(project);
    var items = itemsOf(pagesOf(project));
    var drop = pageDrag && pageDrag.drop;
    var folderRow = function (r, i) {
      var f = r.folder;
      var itemAt = items.findIndex(function (it) { return it.folder === f.id; });
      return e("li", { key: "f" + f.id, className: cx("bd-folder", !r.open && "is-closed", drop && drop.into === f.id && "is-drop"), "data-row": i, "data-folder": f.id },
        e("button", { type: "button", className: "bd-folder-twisty", "aria-expanded": String(r.open), "aria-label": (r.open ? "Close " : "Open ") + f.name, onClick: function () { foldFolder(f.id, !r.open); } }, e(Icon, { name: r.open ? "down" : "right" })),
        renamingFolder === f.id
          ? e(Renamable, { className: "bd-folder-name", value: f.name, label: "Folder name", startEditing: true, onChange: function (v) { renameFolder(f.id, v); } })
          : e("button", { type: "button", className: "bd-folder-open", title: "Double-click to rename", onClick: function () { foldFolder(f.id, !r.open); }, onDoubleClick: function () { setRenamingFolder(f.id); } },
            e(Icon, { name: "folder" }), e("span", { className: "bd-folder-name" }, f.name), e("span", { className: "bd-folder-count" }, r.count || "")),
        e(Dropdown, { menu: true, label: "Actions for " + f.name, placeholder: "Folder", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-page-menu",
          options: [{ value: "rename", label: "Rename", icon: "pencil" }]
            .concat(itemAt > 0 ? [{ value: "up", label: "Move up", icon: "up" }] : [])
            .concat(itemAt >= 0 && itemAt < items.length - 1 ? [{ value: "down", label: "Move down", icon: "down" }] : [])
            .concat([{ value: "delete", label: "Delete folder (the pages stay)", icon: "trash" }]),
          onChange: function (v) {
            if (v === "rename") setRenamingFolder(f.id);
            else if (v === "up") moveFolder(f.id, -1);
            else if (v === "down") moveFolder(f.id, 1);
            else if (v === "delete") deleteFolder(f.id);
          } }));
    };
    var pageRow = function (r, i) {
      var p = r.page, on = p.id === pageId;
      var list = pagesOf(project), idx = list.findIndex(function (x) { return x.id === p.id; });
      return e("li", { key: p.id, className: cx("bd-page", on && "is-current", r.folder && "is-nested", pageDrag && pageDrag.id === p.id && "is-moving"), "data-row": i },
        e("button", { type: "button", className: "bd-page-grip", "aria-label": "Move " + p.name + ": drag it, or use its menu", title: "Drag to move", onPointerDown: gripDown(p) }, e(Icon, { name: "grip" })),
        renamingPage === p.id
          ? e(Renamable, { className: "bd-page-name", value: p.name, label: "Page name", startEditing: true, onChange: function (v) { renamePage(p.id, v); } })
          : e("button", { type: "button", className: "bd-page-open", "aria-current": on ? "page" : undefined, title: "Double-click to rename",
            onClick: function () { openPage(p.id); }, onDoubleClick: function () { setRenamingPage(p.id); } },
            e(Icon, { name: "file" }), e("span", { className: "bd-page-name" }, p.name)),
        confirmPage === p.id
          ? e("span", { className: "bd-page-confirm", role: "group", "aria-label": "Delete " + p.name },
            e("button", { type: "button", className: "bd-btn bd-btn-sm bd-btn-danger", onClick: function () { deletePage(p.id); } }, "Delete"),
            e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setConfirmPage(null); } }, "Keep"))
          : e(Dropdown, { menu: true, label: "Actions for " + p.name, placeholder: "Page", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-page-menu",
            options: [
              { value: "rename", label: "Rename", icon: "pencil" },
              { value: "duplicate", label: "Duplicate", icon: "copy" },
            ].concat(idx > 0 ? [{ value: "up", label: "Move up", icon: "up" }] : [])
              .concat(idx < list.length - 1 ? [{ value: "down", label: "Move down", icon: "down" }] : [])
              .concat(folders.filter(function (f) { return f.id !== r.folder; }).map(function (f) { return { value: "into:" + f.id, label: "Move to " + f.name, icon: "folder" }; }))
              .concat(r.folder ? [{ value: "out", label: "Out of the folder", icon: "detach" }] : [])
              .concat(list.length > 1 ? [{ value: "delete", label: "Delete", icon: "trash" }] : []),
            onChange: function (v) {
              if (v === "rename") setRenamingPage(p.id);
              else if (v === "duplicate") duplicatePage(p.id);
              else if (v === "up") movePage(p.id, -1);
              else if (v === "down") movePage(p.id, 1);
              else if (v === "out") placePage(p.id, endOfFolder(r.folder, p.id), null);
              else if (v.indexOf("into:") === 0) placePage(p.id, endOfFolder(v.slice(5), p.id), v.slice(5));
              else if (v === "delete") setConfirmPage(p.id);
            } }));
    };
    return e("div", { className: "bd-pages-panel" },
      e("div", { className: "bd-panel-head" },
        e("h2", { className: "bd-panel-title" }, "Pages"),
        e("span", { className: "bd-panel-acts" },
          e("button", { type: "button", className: "bd-act", "aria-label": "New folder", title: "New folder", onClick: addFolder }, e(Icon, { name: "folder" })),
          e("button", { type: "button", className: "bd-act", "aria-label": "Add a page", title: "Add a page", onClick: addPage }, e(Icon, { name: "plus" })))),
      e("ul", { className: cx("bd-pages", pageDrag && "is-dragging"), role: "list", ref: pagesListRef },
        rows.map(function (r, i) { return r.kind === "folder" ? folderRow(r, i) : pageRow(r, i); }),
        drop && drop.line ? e("li", { className: cx("bd-page-drop", drop.line.depth && "is-nested"), "aria-hidden": true, style: { top: drop.line.top + "px" } }) : null),
      pageDrag ? e("div", { className: "bd-ghost", style: { left: pageDrag.x + "px", top: pageDrag.y + "px" }, "aria-hidden": true }, pageDrag.name) : null);
  };

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
      : [          sec("frame-mode", "Kind", e(Field, { key: "mode", id: "bd-fr-kind", label: "Frame kind", hint: frame.mode === "structured" ? "Everything sits in auto-layout Groups, in the flow, with tokens only." : "Place things anywhere, in any colour." },
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
      /* A project opened with its slots already filled never asked for the
         sample, so it's asked for here. */
      var tpl = slotSample(owner.type).filter(function (t) { return t.name === node.props.name; })[0];
      change(function (d) {
        var s2 = locate(d, node.id);
        if (!s2) return null;
        s2.node.children = tpl ? tpl.nodes.map(function (k) { return cleanNode(JSON.parse(JSON.stringify(k)), null); }).filter(function (k) { return k && slotAccepts(owner.type, node.props.name, k.type); }) : [];
        return node.id;
      }, words(node.props.name) + " is back to the sample");
    };
    return e("div", { className: "bd-inspect" },
      e("div", { className: "bd-inspect-head" },
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
        e("div", { className: "bd-head-row" },
          e("h2", { className: "bd-inspect-title" }, e(Icon, { name: sameType ? typeIcon(first.type) : "component" }),
            many ? title : isContainer(first.type) && first.type === "Group"
              ? e(Renamable, { value: first.name || "Group", label: "Group name", focusable: true, className: "bd-title-name", startEditing: isRenaming(first.id, "title"), onChange: function (v) { setRenaming(null); setName(first.id, v === "Group" ? "" : v); } })
              : nameOf(first)),
          /* Everything a selection can do, in one menu, so a long name has
             the row to itself. */
          e("div", { className: "bd-head-actions" },
            e(Dropdown, { menu: true, label: "Actions for " + (many ? title : nameOf(first)), placeholder: "Actions", icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon bd-layer-menu",
              options: [!many && first.type === "Group" ? { value: "ungroup", label: "Ungroup", hint: "Ctrl+Shift+G", icon: "group" } : { value: "group", label: "Group", hint: "Ctrl+G", icon: "group" }]
                .concat(WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return { value: "wrap:" + w, label: "Wrap in " + w, icon: typeIcon(w) }; }))
                .concat(!many && CONVERTS.indexOf(first.type) >= 0
                  ? CONVERTS.filter(function (t) { return t !== first.type && (placeable == null || placeable[t] || t === "Group"); }).map(function (t) { return { value: "turn:" + t, label: "Turn into " + t, icon: typeIcon(t) }; })
                    .concat([{ value: "turn:frame", label: "Turn into a frame", icon: "frame" }])
                  : [])
                .concat(!many && detachable[first.type] ? [{ value: "detach", label: "Detach into primitives", icon: "detach" }] : [])
                .concat(!many ? [{ value: "link", label: "Copy link to this layer", icon: "link" }] : [])
                .concat([{ value: "component", label: "Create component", hint: "Ctrl+Alt+K", icon: "component" }]),
              onChange: function (v) {
                if (v === "group") actions.group();
                else if (v === "ungroup") actions.ungroup();
                else if (v.indexOf("wrap:") === 0) actions.wrap(v.slice(5));
                else if (v.indexOf("turn:") === 0) actions.convert(v.slice(5));
                else if (v === "detach") actions.detach();
                else if (v === "link") share(first.id);
                else if (v === "component") openComponent();
              } }))),
        many ? e("p", { className: "bd-inspect-sub" }, sameType ? "Changes apply to all of them. Mixed means they differ." : "Different components: size, spacing and appearance apply to all of them.")
          : meta.blurb ? e("p", { className: "bd-inspect-sub" }, meta.blurb + ".", meta.href ? e(React.Fragment, null, " ", e("a", { href: meta.href }, "Docs")) : null) : null),
      tabBar(have, current),
      tabPanel(current, body));
  };

  /* ------------------------------------------------- layout */

  var selectedNodes = nodesOf(selection);
  var savedTitle = "This browser won't keep your work (a private window, blocked storage, or too many uploads). Use Share or Code to keep it.";
  var hidePanels = wide && (bare || preview);
  hidePanelsRef.current = hidePanels;
  var zoomText = Math.round(cam.z * 100) + "%";

  /* The middle of the bar says where you are: the project, and with
     something selected, the path down to it. The project's name renames on
     a double-click; each step of the path selects. */
  var titleCrumbs = function () {
    var sep = function (k) { return e("span", { key: "s" + k, className: "bd-crumb-sep", "aria-hidden": true }, "›"); };
    var crumbs = [e(Renamable, { key: "project", className: "bd-project-name bd-crumb", value: project.name, label: "Project name", hint: "Double-click to rename this project", focusable: true, onChange: function (v) { renameProject(project.id, v); } })];
    var last = sel ? locate(doc, sel) : null;
    if (last) {
      var many = selection.length > 1;
      last.path.forEach(function (n, i) {
        var isLast = i === last.path.length - 1 && !many && !part;
        var name = n.type === "Root" ? frame.name : nameOf(n);
        crumbs.push(sep(n.id));
        crumbs.push(isLast ? e("span", { key: n.id, className: "bd-crumb", "aria-current": "true" }, name)
          : e("button", { key: n.id, type: "button", className: "bd-crumb", onClick: function () { setPart(null); select(n.id === "root" ? [] : [n.id]); } }, name));
      });
      if (many) crumbs.push(sep("many"), e("span", { key: "many", className: "bd-crumb", "aria-current": "true" }, selection.length + " layers"));
      else if (part) crumbs.push(sep("part"), e("span", { key: "part", className: "bd-crumb", "aria-current": "true" }, "Title"));
    }
    return e("nav", { className: "bd-crumbs bd-tb-crumbs", "aria-label": "Where you are" }, crumbs);
  };

  var homeBar = e("div", { className: "bd-toolbar is-home", role: "toolbar", "aria-label": "Builder" },
    e("span", { className: "bd-tb-side bd-tb-left" }),
    e("div", { className: "bd-tb-title" }, e("span", { className: "bd-tb-home" }, "Projects")),
    e("span", { className: "bd-tb-side bd-tb-right" },
      e("button", { type: "button", className: "bd-btn bd-home-back", onClick: closeProjects, title: "Back to the canvas (Esc)" }, e(Icon, { name: "left" }), e("span", { className: "bd-home-back-text" }, "Back to " + project.name))));
  var workBar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
    e("span", { className: "bd-tb-side bd-tb-left" }),
    e("div", { className: "bd-tb-title bd-project" },
      titleCrumbs(),
      e(Dropdown, { menu: true, label: "Project actions", placeholder: "Project", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-project-menu",
        options: [
          { value: "link", label: sel ? "Copy link to this layer" : "Copy link to " + frame.name, icon: "link" },
          { value: "projects", label: "All projects", icon: "folder" },
          { value: "versions", label: "Versions", icon: "rotate" },
          { value: "duplicate", label: "Duplicate", icon: "copy" },
          { value: "export", label: "Download file", icon: "exportOut" },
          { value: "picture", label: "Use this frame as the picture", icon: "image" },
        ].concat(project.thumbSet ? [{ value: "auto-picture", label: "Picture follows the canvas", icon: "rotate" }] : [])
          .concat([
            { value: "import", label: "Paste a layout…", icon: "upload" },
            { value: "blank", label: "Start over with a blank frame", icon: "trash", danger: true },
          ]),
        onChange: function (v) {
          if (v === "link") share();
          else if (v === "picture") framePicture();
          else if (v === "auto-picture") autoPicture();
          else if (v === "projects") openProjects();
          else if (v === "versions") openVersions();
          else if (v === "duplicate") duplicateProject(project.id);
          else if (v === "export") exportProject(project.id);
          else if (v === "import" || v === "blank") startFrom(v);
        } })),
    e("span", { className: "bd-tb-side bd-tb-right" },
      e(Dropdown, { menu: true, label: "Zoom, " + zoomText, placeholder: zoomText, compact: true, narrow: true, className: "bd-zoom", icon: "zoomIn",
        options: [
          { value: "in", label: "Zoom in", hint: "Ctrl +" }, { value: "out", label: "Zoom out", hint: "Ctrl −" },
          { value: "all", label: "Zoom to fit", hint: "Shift 1" }, { value: "frame", label: "Zoom to " + frame.name, hint: "Shift 2" },
          { value: 0.5, label: "50%" }, { value: 1, label: "100%", hint: "Shift 0" }, { value: 2, label: "200%" },
        ],
        onChange: function (v) {
          if (v === "in") zoomStep(1); else if (v === "out") zoomStep(-1); else if (v === "all") fitAll(); else if (v === "frame") showFrame(frame.id); else zoomTo(v);
        } }),
      /* Saving is quiet; the bar speaks up only when this browser can't keep the work. */
      saved.ok ? null : e("span", { className: "bd-saved is-error", title: savedTitle, role: "status" }, e(Icon, { name: "alert" }), e("span", { className: "bd-saved-text" }, "Not saved")),
      e("button", { type: "button", className: "bd-act", title: "Play: see " + frame.name + " in a screen-sized window, scrolling like a device", "aria-label": "Play", disabled: !ready[frame.id], onClick: function () { openPlay(); } }, e(Icon, { name: "play" })),
      e("button", { type: "button", className: "bd-act", "aria-pressed": String(preview), title: "Preview: use the components (Esc to stop)", "aria-label": "Preview", onClick: actions.preview }, e(Icon, { name: "eye" })),
      e("button", { type: "button", className: "bd-btn bd-btn-primary bd-export", onClick: openCode, disabled: !ready[frame.id], "aria-label": "Export", title: "Export: code, a picture, the layout or a link" }, e(Icon, { name: "exportOut" }), e("span", { className: "bd-export-text" }, "Export"))));
  var toolbar = home ? homeBar : workBar;

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
  var placeTool = function (kind, hit, opts) {
    if (kind === "frame" || kind === "page") { frameOps.add(null, kind === "page", null, opts); return; }
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
    var start = { x: ev.clientX, y: ev.clientY, w: f.bare ? Math.round(b.w) : f.width, h: b.h };
    var cur = null;
    /* A structured page lands on a viewport size; a freeform canvas takes any. */
    var lo = f.bare ? MIN_FREE : minSide(f), snaps = f.mode === "structured";
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
          if (fr.bare) { fr.sized = true; d.active = f.id; return undefined; }
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
        if (!ok || !cur) return moved;
        justDragged.current = true;
        setTimeout(function () { justDragged.current = false; }, 60);
        if (dup) { frameOps.duplicate(f.id, { x: cur.x, y: cur.y }); return true; }
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
        return true;
      },
    };
  };
  var startFrameMove = function (ev, f) {
    if (ev.button !== 0) return;
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
  /* A drag that began on a frame itself: on its own background it moves
     the frame; with Cmd or Ctrl and Shift it drops a copy. Says, when it
     ends, whether the frame went anywhere. */
  var frameDragFrom = function (fid, phase, x, y, dup) {
    if (phase === "down") {
      var f = frameById(docRef.current, fid);
      frameDrag.current = f ? beginFrameDrag(f, x, y, dup !== false) : null;
      return false;
    }
    var dr = frameDrag.current;
    if (!dr) return false;
    if (phase === "move") { dr.move(x, y); return false; }
    frameDrag.current = null;
    return dr.end(phase === "up");
  };
  var frameDragRef = useRef(frameDragFrom); frameDragRef.current = frameDragFrom;
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
      /* A loose object takes a width (its height follows what it holds). */
      if (f.bare) return e("div", { key: f.id, className: "bd-resize is-r", style: { left: X + W - 4, top: Y, height: H }, title: "Drag to set the width of " + f.name, onPointerDown: function (ev) { startResize(ev, f, "r"); } });
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
  /* Big projects keep only frames near the view live. A frame comes alive
     within half a screen of the view and is let go past a screen and a
     half, so panning doesn't make frames flicker in and out. The active
     frame is always live; up to VIRTUAL_AFTER frames, all are, and past
     that never more than LIVE_MAX. */
  var liveNow = {};
  (function () {
    var many = doc.frames.length > VIRTUAL_AFTER;
    var keep = liveRef.current;
    var near = function (b, k) {
      if (!cam || !box.w || !b) return true;
      var vx = -cam.x / cam.z, vy = -cam.y / cam.z, vw = box.w / cam.z, vh = box.h / cam.z;
      return b.x < vx + vw * (1 + k) && b.x + b.w > vx - vw * k && b.y < vy + vh * (1 + k) && b.y + b.h > vy - vh * k;
    };
    var mid = { x: (box.w / 2 - cam.x) / cam.z, y: (box.h / 2 - cam.y) / cam.z };
    var gap = function (b) { return b ? Math.hypot(b.x + b.w / 2 - mid.x, b.y + b.h / 2 - mid.y) : Infinity; };
    var wanted = doc.frames.filter(function (f) {
      return !many || f.id === doc.active || near(boxes[f.id], keep[f.id] ? 1.5 : 0.5);
    });
    /* Zoomed far out, the nearest to the middle win: the active frame,
       then frames already live (so they don't reload), then by distance. */
    if (many && wanted.length > LIVE_MAX) {
      var rank = function (f) { return f.id === doc.active ? 0 : keep[f.id] ? 1 : 2; };
      wanted = wanted.slice().sort(function (x, y) { return rank(x) - rank(y) || gap(boxes[x.id]) - gap(boxes[y.id]); }).slice(0, LIVE_MAX);
    }
    wanted.forEach(function (f) { liveNow[f.id] = true; });
    liveRef.current = liveNow;
  })();
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
        if (!liveNow[f.id]) {
          /* Far from view in a big project: a light stand-in until it's panned to. */
          return e("div", {
            key: f.id, className: cx("bd-frame", "bd-frame-ghost", f.bare && "is-bare"), "aria-hidden": "true",
            style: { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" },
          }, e("span", { className: "bd-frame-ghost-name" }, f.name));
        }
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

  var importDialog = function () {
    var read = readLayout(importText);
    var ok = read && !read.error;
    var formatHref = mountEl.getAttribute("data-format") || "assets/builder-layouts.md";
    return e("dialog", { className: "bd-code bd-import", ref: importRef, "aria-labelledby": "bd-import-title" },
      e("div", { className: "bd-code-head" },
        e("div", { className: "bd-code-intro" },
          e("h2", { id: "bd-import-title" }, "Paste a layout"),
          e("p", { className: "bd-inspect-sub" }, "Paste builder JSON (from Claude, a teammate or Copy layout JSON), a builder link, or JSX with Dovetail components (from the docs or the Code dialog). Only the components, props and tokens the builder can set come in. ",
            e("a", { href: formatHref, target: "_blank", rel: "noopener" }, "The layout format"), ".")),
        e("div", { className: "bd-code-actions" },
          e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { importRef.current.close(); } }, e(Icon, { name: "close" })))),
      e("div", { className: "bd-import-body" },
        e("textarea", { className: "bd-import-text", "aria-label": "Layout JSON, JSX or link", spellCheck: false, value: importText, placeholder: '{ "frames": [ { "name": "Home", "width": 1280, "hug": true, "root": { "children": [ { "type": "HeroBlock" } ] } } ] }',
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
  /* What the project uses, for the inspector when nothing is selected: the
     page on screen, live, with the project's other pages read from the store. */
  var sysScopeState = useState("used");
  var sysScope = sysScopeState[0], setSysScope = sysScopeState[1];
  var otherUseState = useState(null);
  var otherUse = otherUseState[0], setOtherUse = otherUseState[1];
  var pageKey = pagesOf(project).map(function (p) { return p.id; }).join() + "|" + pageId;
  useEffect(function () {
    var meta = projectRef.current, live = true;
    var others = pagesOf(meta).filter(function (p) { return p.id !== pageRef.current; });
    Promise.all(others.map(function (p) { return store.loadDoc(meta.id, p.id); })).then(function (docs) {
      if (live) setOtherUse(usageOf(docs.filter(Boolean)));
    });
    return function () { live = false; };
  }, [project.id, pageKey]);
  var used = useMemo(function () { return mergeUsage(usageOf([doc]), otherUse); }, [doc, otherUse]);

  var builderInspector = function () {
    var bid = "bd-stage-bg";
    var onlyUsed = sysScope === "used";
    var prims = DATA.groups.filter(function (g) { return g.id === "layout" || g.id === "typography"; }).reduce(function (a, g) { return a.concat(g.items); }, [])
      .filter(function (n) { return (!placeable || placeable[n]) && (!onlyUsed || used.types[n]); });
    return e("div", { className: "bd-inspect" },
      e("div", { className: "bd-inspect-head" },
        e("div", { className: "bd-head-row" }, e("h2", { className: "bd-inspect-title" }, e(Icon, { name: "panels" }), "Canvas")),
        e("p", { className: "bd-inspect-sub" }, "The builder's own settings. Select a frame, or something in one, to change that instead.")),
      e("div", { className: "bd-ipanel" },
        sec("builder-canvas", "Canvas", [
          e(Field, { key: "bg", id: bid, label: "Background", hint: stageColor ? "Behind every frame in this project. It isn't part of any design." : "The builder's default, behind every frame in this project." },
            e("div", { className: "bd-canvas-row" },
              e(Segmented, { labelledBy: bid, className: "bd-seg-pics bd-stage-swatches", value: STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }) ? stageColor : null,
                onChange: function (v) { setStageColor(v || ""); },
                options: STAGE_SWATCHES.map(function (x) { return { value: x[0], label: x[1], picture: e("span", { className: cx("bd-stage-chip", !x[0] && "is-default"), style: x[0] ? { background: x[0] } : undefined }) }; }) }),
              e(ColorPick, { value: STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }) ? "" : stageColor, on: !!stageColor && !STAGE_SWATCHES.some(function (x) { return x[0] === stageColor; }), label: "Custom background colour", fallback: stageColor || "#e7e7ea", onChange: setStageColor }))),
        ]),
        /* Nothing selected: what the system offers, rather than a list of
           frames (Layers has those). */
        sec("builder-vars", "Variables", [
          e(Segmented, { key: "scope", label: "Show", wide: true, value: sysScope, onChange: function (v) { if (v) setSysScope(v); },
            options: [{ value: "used", label: "In this project" }, { value: "all", label: "Everything" }] }),
          sysGroup("colour", "Colour", DATA.tokens.surface.options.filter(function (o, i) { return onlyUsed ? usesToken(used, "surface", o.value) : i < 16; }).map(function (o) {
            return sysRow(o.value, e("span", { className: "bd-sw bd-sys-sw", style: { background: tints[o.tokens[0]] || "var(" + o.tokens[0] + ")" } }), o.value, o.tokens[0]);
          })),
          sysGroup("space", "Spacing", DATA.tokens.padding.options.filter(function (o) { return !o.family || o.family === "inset"; }).filter(function (o, i) { return onlyUsed ? usesToken(used, PADDING_KEYS, o.value) : i < 8; }).map(function (o) {
            var px = pxMap["padding|" + o.value];
            return sysRow(o.value, e("span", { className: "bd-sys-bar", style: { width: px != null ? Math.min(28, Math.round(px)) + "px" : "8px" } }), o.value, px != null ? Math.round(px) + "px" : o.tokens[0]);
          })),
          sysGroup("radius", "Radius", DATA.tokens.radius.options.filter(function (o) { return !onlyUsed || usesToken(used, "radius", o.value); }).map(function (o) {
            return sysRow(o.value, e("span", { className: "bd-pv-radius", style: { borderTopLeftRadius: "var(" + o.tokens[0] + ")" } }), o.value, o.tokens[0]);
          })),
          e("div", { key: "acts", className: "bd-media-actions" },
            e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setLeft("assets"); setAssetKind("variables"); } }, e(Icon, { name: "variable" }), "Apply from Assets"),
            e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setLeft("configure"); } }, e(Icon, { name: "sliders" }), "Change in Configure")),
        ]),
        sec("builder-prims", "Primitives", [
          e("p", { key: "n", className: "bd-sec-empty" }, prims.length ? "Press one to add it to " + frame.name + ", or drag it onto the canvas." : "None in this project yet. Show Everything to add one."),
          e("ul", { key: "list", className: "bd-sys-list", role: "list" }, prims.map(function (n) {
            return e("li", { key: n }, e("button", { type: "button", className: "bd-sys-item bd-sys-prim", "data-type": n, title: META[n].blurb ? n + ": " + META[n].blurb : n,
              onPointerDown: function (ev) { startDrag(ev, { kind: "new", type: n, label: n }); },
              onClick: function () { if (!justDragged.current) add(n); } },
              e("span", { className: "bd-sys-lead" }, e(Icon, { name: typeIcon(n) })),
              e("span", { className: "bd-sys-name" }, n),
              e("span", { className: "bd-sys-meta" }, META[n].blurb || "")));
          })),
        ]),
        sec("builder-styles", "Styles", [
          sysGroup("text", "Text", TEXT_STYLES.filter(function (t) { return !onlyUsed || used.text[t[0]]; }).map(function (t) {
            var px = pxMap["text|" + t[0]];
            return sysRow(t[0], e("span", { className: "bd-sys-ag", style: { fontFamily: "var(--dt-text-" + t[0] + "-family)", fontWeight: "var(--dt-text-" + t[0] + "-weight)" } }, "Ag"), t[1], px != null ? Math.round(px) + "px" : "", "--dt-text-" + t[0] + "-size");
          })),
          sysGroup("fx", "Shadow", DATA.tokens.elevation.options.filter(function (o) { return !onlyUsed || usesToken(used, "elevation", o.value); }).map(function (o) {
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
  var PADDING_KEYS = ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
  /* A group of the system's pieces; none at all says so. */
  var sysGroup = function (key, label, rows) {
    return e("div", { key: key, className: "bd-sys-row" },
      e("span", { className: "bd-sys-label" }, label),
      rows.length ? e("ul", { className: "bd-sys-list", role: "list" }, rows)
        : e("p", { className: "bd-sec-empty bd-sys-none" }, "None in this project yet"));
  };
  var inspector = selectedNodes.length === 1 && selectedNodes[0].type === "Slot" ? slotInspector(selectedNodes[0]) || frameInspector()
    : selectedNodes.length ? nodeInspector(selectedNodes.filter(function (n) { return n.type !== "Slot"; }).length ? selectedNodes.filter(function (n) { return n.type !== "Slot"; }) : selectedNodes)
    : frameOn ? frameInspector() : builderInspector();
  var slot = wide ? document.getElementById("app-toolbar") : null;

  return e(React.Fragment, null,
    slot ? ReactDOM.createPortal(toolbar, slot) : null,
    home ? null : e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
      [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
        return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
          t[1], t[0] === "edit" && selectedNodes.length ? e("span", { className: "bd-tab-note" }, " · " + (selectedNodes.length > 1 ? selectedNodes.length : selectedNodes[0].type)) : null);
      })),
    e("div", { className: cx("bd-shell", hidePanels && "is-bare"), "data-pane": pane, inert: home ? "" : undefined, "aria-hidden": home ? "true" : undefined },
      e("aside", { className: "bd-left", ref: leftPanelRef, "aria-label": "Assets, pages, layers, content and configure", hidden: hidePanels || undefined },
        e("div", { className: "bd-left-tabs bd-rail", role: "tablist", "aria-label": "Left panel", "aria-orientation": wide ? "vertical" : "horizontal" },
          RAIL.map(function (r) {
            var isHome = r[0] === "home";
            return e("button", { key: r[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(isHome ? home : !home && left === r[0]), "aria-controls": isHome ? undefined : "bd-left-body", title: r[2],
              onClick: isHome ? openProjects : function () { setLeft(r[0]); } }, e(Icon, { name: r[3] }), e("span", { className: "bd-rail-label" }, r[1]));
          })),
        e("div", { className: "bd-left-body", id: "bd-left-body", role: "tabpanel" },
          left === "configure" ? e("div", { className: "bd-config-dock", ref: dockRef })
            : e(React.Fragment, null,
              e("div", { className: "bd-left-main" }, left === "assets" ? assetsPanel() : left === "pages" ? pagesPanel() : left === "layers" ? layersPanel() : contentPanel()),
              left === "pages" ? null : left === "assets" ? e(SearchField, { className: "bd-search-dock", label: "Search components", placeholder: "Search all components", value: query, onChange: setQuery })
                : left === "layers" ? e(SearchField, { className: "bd-search-dock", label: "Filter layers", placeholder: "Filter layers", value: layerQuery, onChange: setLayerQuery })
                : e(SearchField, { className: "bd-search-dock", label: "Search content", placeholder: "Search your content", value: contentQuery, onChange: setContentQuery })))),
      e("div", { className: "bd-center" }, slot ? null : toolbar, stage),
      e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef, hidden: hidePanels || undefined }, inspector)),
    homePage(),
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
          e("button", { type: "button", className: "bd-btn", onClick: function () { share(); }, title: sel ? "Copy a link to the selected layer" : "Copy a link to " + frame.name }, e(Icon, { name: "link" }), "Copy link"),
          e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: function () { dialogRef.current.close(); } }, e(Icon, { name: "close" })))),
      e("pre", { className: "bd-code-pre", tabIndex: 0 }, e("code", null, code))),
    importDialog(),
    versionsDialog(),
    componentDialog(),
    playDialog(),
    e("div", { className: "visually-hidden", role: "status", "aria-live": "polite" }, say));
}

export { App };
