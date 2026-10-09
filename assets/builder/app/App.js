/* The builder itself: the canvas, the panels, the inspector, history and every action. */

import { CAROUSEL_STEPS, DATA, FAMILY_LABEL, FRAME_GAP, GROUP_ICON, GROUP_TYPE_ICON, LABEL_ROOM, LIB_KINDS, MAX_HEIGHT, MAX_WIDTH, MEDIA_LIMIT, MEDIA_URL, META, MIN_FREE, MIN_SIDE, PICTURE_TYPES, PREFS_KEY, PRESET, PRESETS, PRESET_ICON, RAIL, SHARED_FAMILY, SPACINGS, STAGE_PAD, STORE_KEY, TEXT_PROPS, TEXT_STYLES, TEXT_TYPES, TONE_FILL, TONE_TEXT, TOOLBAR, TOOL_INFO, TOOL_KEY, TYPE_ICON, WRAPS, ZOOM_STEPS, contextOf, optionAllowed, scopeOf, cx, e, hasSlots, isContainer, joinsFlow, minSide, mountEl, mql, nameOf, readForLibrary, remover, slotAccepts, slotSpec, slotTakes, storage, useCallback, useEffect, useMemo, useRef, useState, words, kbd, useEvent, allSame, VIRTUAL_AFTER, LIVE_MAX, nodeLabel, typeIcon, hasTitlePart, nodeIsOpen, frameSize, IS_MAC, PANELS, SHORTCUTS } from "../config.js";
import { produce, freeze, setAutoFreeze } from "immer";
import { apply as applyChanges, diff as diffDocs, invert } from "../model/edits.js";
import { readLayout } from "../model/paste.js";
import { mergeUsage, usageOf, usesToken } from "../model/usage.js";
import { absorbComponents, componentsFor, copyText, encode, loadLibrary, loadPrefs, starterDoc, thick, withoutUploads } from "../model/share.js";
import { foldersOf, itemsOf, libScopeOf, pageOf, pagesOf } from "../model/store.js";
import { CodeDialog, ComponentDialog, ImportDialog, KeysDialog, PlayDialog, VersionsDialog, componentCheck } from "./dialogs.js";
import { HOME_SORTS, Home } from "./Home.js";
import { Layers } from "./Layers.js";
import { Pages } from "./Pages.js";
import { Assets } from "./Assets.js";
import { Content } from "./Content.js";
import { ContextPanel } from "./ContextPanel.js";
import { cleanItem, contextFor, contextText } from "../model/context.js";
import { AssistantPanel } from "./AssistantPanel.js";
import { practiceScript, runTool, systemPrompt, toolsFor } from "../model/agent.js";
import { checksFrom, checksText, lintFrame } from "../model/lint.js";
import { editsText, recentEdits } from "../model/recent.js";
import { collector } from "../model/assistant.js";
import { assistantMode, sendAssistant } from "../cloud/assistant.js";
import { EditorAt, Labels, Marks, Resizers, Rulers, SpacingLines, ViewMarks, World, camera, onStage, placeMarks } from "./Stage.js";
import { STARTERS } from "../model/starters.js";
import { addPlayground } from "../model/playground.js";
import { ARRIVED, AccountDialog, useAccount } from "../cloud/Account.js";
import { CONVERTS, FREE_MAX, active, autoLayout, canHold, clean, cleanNode, copy, emptyDoc, fixedSpot, frameById, fresh, isFree, locate, make, makeFrame, ops, presetOf, relSize, side, tokenOption, uid, constrain, H_PINS, V_PINS, GUIDES_MAX, COLUMNS_MAX, columnsOf } from "../model/tree.js";
import { detachAll, holdsInstanceOf, masterOf, rebase, updateInstances } from "../model/instances.js";
import { codeWithComponents } from "../model/codegen.js";
import { projectFiles } from "../model/projectcode.js";
import { themeCss } from "../model/theme.js";
import { zip } from "../model/zip.js";
import { ENUM_ICONS, ENUM_LABEL, ENUM_MENU, Icon, PROP_LABEL } from "../ui/icons.js";
import { AlignMatrix, BUILDER_ICON, ColorPick, ContextMenu, Dropdown, LinkTo, PAGE_LINK, Field, InlineEditor, ListEditor, NumberField, OpacityField, PictureField, PinPad, Renamable, SearchField, Section, Segmented, SwatchField, Switch, Thumb, VIEW_H, VIEW_W, clampZoom, distance, layoutOf, midpoint, playDefault, snapSide, ConstraintBox } from "../ui/parts.js";

/* How Home orders projects and files, remembered in this browser. */
var HOME_SORT_KEY = "dovetail-builder-home-sort";
/* The builder's own colour mode, dark unless this browser chose light. The
   frames keep their own setting each, and Configure's dark mode reaches them,
   not these tools. builder.html reads the same key before first paint. */
var DARK_KEY = "dovetail-builder-dark";

/* Past this many frames, only frames near the view stay live. */
/* However far out the view is zoomed, at most this many frames are live. */
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
  var contextQueryState = useState("");
  var contextQuery = contextQueryState[0], setContextQuery = contextQueryState[1];
  /* What the assistant reads (model/context.js), by scope: this file's, its
     project's and the team's. Read in when the file opens or moves; saved
     as it changes. The team, until teams come from the cloud, is this
     browser's. */
  var ctxState = useState({ file: [], project: [], team: [] });
  var ctxItems = ctxState[0], setCtxItems = ctxState[1];
  var ctxRef = useRef(ctxItems); ctxRef.current = ctxItems;
  var groupNameState = useState("");
  var groupName = groupNameState[0], setGroupName = groupNameState[1];
  var pageQueryState = useState("");
  var configQueryState = useState("");
  var configQuery = configQueryState[0], setConfigQuery = configQueryState[1];
  var configNoneState = useState(false);
  var configNone = configNoneState[0], setConfigNone = configNoneState[1];
  var pageQuery = pageQueryState[0], setPageQuery = pageQueryState[1];
  var contentQuery = contentQueryState[0], setContentQuery = contentQueryState[1];
  var categoryState = useState(prefs.category);
  var category = categoryState[0], setCategory = categoryState[1];
  var assetKindState = useState(prefs.kind);
  var assetKind = assetKindState[0], setAssetKind = assetKindState[1];
  var viewState = useState(prefs.view);
  var view = viewState[0], setView = viewState[1];
  var pxState = useState({});
  var pxMap = pxState[0], setPxMap = pxState[1];
  var tintState = useState({});
  var tints = tintState[0], setTints = tintState[1];
  var themeStampState = useState(0);
  var themeStamp = themeStampState[0], setThemeStamp = themeStampState[1];
  /* What the canvas shows and snaps to, from the View menu; kept per browser. */
  var canvasViewState = useState(prefs.canvas);
  var canvasView = canvasViewState[0], setCanvasView = canvasViewState[1];
  var viewRef = useRef(canvasView); viewRef.current = canvasView;
  /* How wide the floating panels are, and which are folded away; kept per browser. */
  var panelsState = useState(prefs.panels);
  var panels = panelsState[0], setPanels = panelsState[1];
  var railWState = useState(0);
  var railW = railWState[0], setRailW = railWState[1];
  var guideDragState = useState(null);
  var guideDrag = guideDragState[0], setGuideDrag = guideDragState[1];
  var colInfoState = useState({});
  var colInfo = colInfoState[0], setColInfo = colInfoState[1];
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
  /* The camera lives in Stage.js; the zoom, rounded, is state so the toolbar shows it. */
  var zoomPctState = useState(100);
  var zoomPct = zoomPctState[0], setZoomPct = zoomPctState[1];
  var heightsState = useState({});
  var heights = heightsState[0], setHeights = heightsState[1];
  var dragState = useState(null);
  var drag = dragState[0], setDrag = dragState[1];
  /* Size, position or angle by the pointer while it moves, resizes or
     turns something; and the handle being pulled. */
  var readoutState = useState(null);
  var readout = readoutState[0], setReadout = readoutState[1];
  var sizingState = useState(null);
  var sizing = sizingState[0], setSizing = sizingState[1];
  /* What was measured for the marks, in each frame's own pixels (sel and
     hover); drop is placed on the stage as the drag goes. */
  var marksState = useState({ sel: [], hover: null, drop: null });
  var marksRaw = marksState[0], setMarks = marksState[1];
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
  /* Shift or Alt (Option) held shows the spacing; either can be let go
     while the other still holds. */
  var measureKeys = useRef({});
  var spacingState = useState(null);
  var spacing = spacingState[0], setSpacing = spacingState[1];
  var focusSecState = useState(null);
  var focusSec = focusSecState[0], setFocusSec = focusSecState[1];
  var playState = useState(null);
  var play = playState[0], setPlay = playState[1];
  /* A link to one of the project's pages is kept as #page:<id> (PAGE_LINK). */
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
  /* What the code leaves out of the instances in it (model/codegen.js). */
  var codeNotesState = useState([]);
  var codeNotes = codeNotesState[0], setCodeNotes = codeNotesState[1];
  /* What Export's picture takes: the one layer the Code shows, or the frame;
     and at what scale, 1x to 3x. */
  var codePickState = useState(null);
  var codePick = codePickState[0], setCodePick = codePickState[1];
  var scaleState = useState(2);
  var exportScale = scaleState[0], setExportScale = scaleState[1];
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
  /* The document and the selection are set on their refs first, then on
     state (commit, quiet, place and select do both), so the refs are always
     the newest. They aren't copied back from state while rendering: a render
     React makes for a keypress can come before one for a canvas change made
     from a frame, and copying would put the older document back under the
     next edit. */
  var docRef = useRef(doc);
  var selRef = useRef(selection);
  var camRef = useRef(camera.get());
  /* Whether the camera has been placed yet: the first fit waits on the stage's size. */
  var camSetRef = useRef(false);
  var zoomPctRef = useRef(100);
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
  /* Who's signed in to the cloud, if it's connected (cloud/Account.js). */
  var accountRef = useRef(null);
  var accountState = useAccount(), account = accountState[0];
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
  /* Whose library is on screen: the file's project's, or its own (see
     libScopeOf). A library just read in isn't written straight back. */
  var libScopeRef = useRef(libScopeOf(init.project));
  var libSkip = useRef(true);
  useEffect(function () {
    if (libSkip.current) { libSkip.current = false; return; }
    store.saveLibrary(library, libScopeRef.current).catch(function () { announce("This browser is out of room for content. Remove something, or use smaller files."); });
  }, [library]);
  /* The library a file uses, read in when the file opens or moves. */
  var readLibraryFor = function (meta) {
    var scope = libScopeOf(meta);
    if (scope === libScopeRef.current) return Promise.resolve();
    libScopeRef.current = scope;
    return store.loadLibrary(scope).then(function (v) {
      if (libScopeRef.current !== scope) return;
      libSkip.current = true;
      setLibrary(loadLibrary(v));
      setLibTab(null);
    });
  };
  var ctxKey = function (scope, meta) {
    meta = meta || projectRef.current;
    return scope === "team" ? "t:local" : scope === "project" ? (meta && meta.group ? "g:" + meta.group : null) : meta ? "f:" + meta.id : null;
  };
  var groupOfFile = project ? project.group || "" : "";
  useEffect(function () {
    var meta = projectRef.current, live = true;
    if (!meta) return undefined;
    var read = function (scope) { var k = ctxKey(scope, meta); return k ? store.loadContext(k).then(function (list) { return (list || []).map(cleanItem).filter(Boolean); }, function () { return []; }) : Promise.resolve([]); };
    Promise.all([read("file"), read("project"), read("team")]).then(function (got) { if (live) setCtxItems({ file: got[0], project: got[1], team: got[2] }); });
    if (meta.group && store.getGroup) store.getGroup(meta.group).then(function (g) { if (live) setGroupName(g ? g.name : ""); }, function () {});
    else setGroupName("");
    return function () { live = false; };
  }, [project ? project.id : null, groupOfFile]);
  /* One scope's items replaced, kept on screen and saved. */
  var putCtx = function (scope, items) {
    var k = ctxKey(scope);
    if (!k) return;
    setCtxItems(function (c) { var n = Object.assign({}, c); n[scope] = items; return n; });
    store.saveContext(k, items).catch(function () { announce("This browser is out of room for context. Remove something, or use smaller files."); });
  };
  var ctxApi = {
    add: function (scope, list) { putCtx(scope, (ctxRef.current[scope] || []).concat(list)); },
    update: function (scope, id, patch) { putCtx(scope, (ctxRef.current[scope] || []).map(function (it) { return it.id === id ? cleanItem(Object.assign({}, it, patch, { updatedAt: Date.now() })) || it : it; })); },
    remove: function (scope, id) { putCtx(scope, (ctxRef.current[scope] || []).filter(function (it) { return it.id !== id; })); },
    move: function (from, to, id) {
      var it = (ctxRef.current[from] || []).filter(function (x) { return x.id === id; })[0];
      if (!it || !ctxKey(to)) return;
      var moved = Object.assign({}, it, { pages: to === "file" ? it.pages : [] });
      putCtx(from, (ctxRef.current[from] || []).filter(function (x) { return x.id !== id; }));
      putCtx(to, (ctxRef.current[to] || []).concat([moved]));
    },
  };
  /* The assistant: a conversation whose tool calls (model/agent.js) edit the
     canvas through change(), a history step each, so Undo all steps back
     through a reply's changes. Requests go nowhere in practice mode
     (cloud/assistant.js). */
  var asThreadState = useState([]);
  var asThread = asThreadState[0], setAsThread = asThreadState[1];
  var asBusyState = useState(false);
  var asBusy = asBusyState[0], setAsBusy = asBusyState[1];
  var asDraftState = useState("");
  var asSelState = useState(true);
  var asReachState = useState("selection");
  var asDropState = useState([]);
  var asMsgs = useRef([]);
  /* The assistant's settings: plans before big changes (on unless turned
     off, for this browser) and how hard it thinks (Careful unless Quick is
     picked). Looking at the canvas is per file (canLook). */
  var AS_PLAN_KEY = "dovetail-assistant-plan", AS_EFFORT_KEY = "dovetail-assistant-effort";
  var readPref = function (k, dflt) { try { return window.localStorage.getItem(k) || dflt; } catch (err) { return dflt; } };
  var writePref = function (k, v) { try { window.localStorage.setItem(k, v); } catch (err) { /* kept for this visit only */ } };
  var asPlanState = useState(readPref(AS_PLAN_KEY, "on") !== "off");
  var asEffortState = useState(readPref(AS_EFFORT_KEY, "high") === "low" ? "low" : "high");
  var asLookTick = useState(0);
  /* Notes typed while a reply runs, handed over at its next step; a plan
     waiting on its answer. */
  var asNotes = useRef([]);
  var planWait = useRef(null);
  /* A question on a reply's card, waiting for a choice or a typed answer. */
  var askWait = useRef(null);
  /* The page as the assistant last left it, so the person's own edits since
     can go with their next message. */
  var asBase = useRef(null);
  var asBaseTick = useState(0);
  /* The file's conversation with the assistant, picked up where it was
     left, and saved whenever a reply finishes. A reply cut off by leaving
     the page shows as stopped. */
  var threadFor = useRef(null);
  useEffect(function () {
    var meta = projectRef.current, live = true;
    threadFor.current = null;
    asBase.current = null;
    setAsThread([]);
    asMsgs.current = [];
    if (!meta || !store.loadThread) return undefined;
    store.loadThread(meta.id).then(function (v) {
      if (!live) return;
      threadFor.current = meta.id;
      if (!v || !Array.isArray(v.thread)) return;
      setAsThread(v.thread.map(function (t) { return t.status === "working" ? Object.assign({}, t, { status: "error", error: "Stopped when the page closed." }) : t.queued ? Object.assign({}, t, { queued: false }) : t; }));
      asMsgs.current = Array.isArray(v.msgs) ? v.msgs : [];
    }, function () { if (live) threadFor.current = meta.id; });
    return function () { live = false; };
  }, [project ? project.id : null]);
  useEffect(function () {
    var meta = projectRef.current;
    if (!meta || asBusy || threadFor.current !== meta.id || !store.saveThread) return;
    var plan = asThread.map(function (t) {
      if (t.plan && t.plan.status === "pending") t = Object.assign({}, t, { plan: Object.assign({}, t.plan, { status: "changing" }) });
      if (t.ask && t.ask.status === "pending") t = Object.assign({}, t, { ask: Object.assign({}, t.ask, { status: "skipped" }) });
      return t;
    });
    store.saveThread(meta.id, asThread.length ? { thread: plan, msgs: asMsgs.current } : null).catch(function () { /* the panel still has it */ });
  }, [asThread, asBusy]);
  var asAbort = useRef(null);
  var patchTurn = function (id, patch) {
    setAsThread(function (t) { return t.map(function (x) { return x.id === id ? Object.assign({}, x, typeof patch === "function" ? patch(x) : patch) : x; }); });
  };
  var asContext = function () {
    var ctx = contextFor(ctxRef.current, pageRef.current);
    var drop = asDropState[0];
    return Object.assign({}, ctx, { docs: ctx.docs.filter(function (d) { return drop.indexOf(d.id) < 0; }) });
  };
  /* What the assistant sees when it looks: the frame (or one layer) drawn
     as a JPEG no bigger than 1280 by 2000, so it fits what the model reads.
     A frame that's off screen (a stand-in) is brought into view first. */
  var shootForAssistant = function (fid, id) {
    var wait = function (tries) {
      var a = api(fid);
      if (a && a.snapshot) return Promise.resolve(a);
      if (tries <= 0) return Promise.reject(new Error("That frame isn't drawn yet."));
      return new Promise(function (r) { setTimeout(r, 150); }).then(function () { return wait(tries - 1); });
    };
    if (!api(fid)) showFrame(fid);
    return wait(20).then(function (a) {
      var shot = a.snapshot("jpeg", { scale: 1, id: id || null });
      var late = new Promise(function (resolve, reject) { setTimeout(function () { reject(new Error("The picture took too long.")); }, 15000); });
      return Promise.race([shot, late]);
    }).then(function (url) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1280 / img.naturalWidth, 2000 / img.naturalHeight);
          var w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          var g = c.getContext("2d");
          g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
          g.drawImage(img, 0, 0, w, h);
          var out = c.toDataURL("image/jpeg", 0.8);
          resolve({ media_type: "image/jpeg", data: out.slice(out.indexOf(",") + 1), width: w, height: h, url: out });
        };
        img.onerror = function () { reject(new Error("The picture couldn't be read.")); };
        img.src = url;
      });
    });
  };
  /* A component's documentation (its .md beside the code), found through
     the system's manifest; both are fetched once. */
  var docsRef = useRef({ manifest: null, md: {} });
  var componentDoc = function (name) {
    var cache = docsRef.current;
    if (cache.md[name]) return cache.md[name];
    if (!cache.manifest) cache.manifest = fetch("system/manifest.json").then(function (r) { if (!r.ok) throw new Error("no manifest"); return r.json(); }).catch(function (err) { cache.manifest = null; throw err; });
    cache.md[name] = cache.manifest.then(function (m) {
      var path = (m.files || []).filter(function (f) { return new RegExp("^components/[^/]+/" + name + "\\.md$").test(f); })[0];
      if (!path) return null;
      return fetch("system/" + path).then(function (r) { return r.ok ? r.text() : null; });
    }).catch(function () { delete cache.md[name]; return null; });
    return cache.md[name];
  };
  /* The checks draw a frame a second time, out of sight, so it can be read
     as it really looks (a preview, no editing marks) at another width or in
     the other mode without touching the canvas. One hidden frame serves
     every check, one at a time. */
  var auditEl = useRef(null);
  var auditQueue = useRef(Promise.resolve());
  var pageProps = function (f) { return { dark: f.dark, surface: f.surface, canvas: f.canvas, spacing: f.spacing, gap: f.gap, typeScale: f.typeScale, pageWidth: f.pageWidth, gutter: f.gutter, flow: f.flow, clip: f.clip, scroll: f.scroll }; };
  var drawAndAudit = function (f, width, dark) {
    var run = function () {
      return new Promise(function (resolve, reject) {
        var el = auditEl.current;
        if (!el) {
          el = document.createElement("iframe");
          el.setAttribute("aria-hidden", "true");
          el.tabIndex = -1;
          el.title = "Checks";
          el.style.cssText = "position:fixed;left:-20000px;top:0;height:900px;border:0;opacity:0;pointer-events:none;";
          el.src = frameSrc;
          document.body.appendChild(el);
          auditEl.current = el;
        }
        el.style.width = width + "px";
        var tries = 0;
        (function wait() {
          var a = null;
          try { a = el.contentWindow && el.contentWindow.BuilderFrame; } catch (err) { a = null; }
          if (!a || !a.audit) { if (++tries > 80) { reject(new Error("The checks couldn't draw the frame.")); return; } setTimeout(wait, 100); return; }
          a.render({ page: Object.assign(pageProps(f), { dark: dark }), root: f.root }, { preview: true, hug: true, screen: { w: width, h: f.height || 900 } });
          requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { try { resolve(a.audit()); } catch (err) { reject(err); } }, 120); }); });
        })();
      });
    };
    var next = auditQueue.current.then(run, run);
    auditQueue.current = next.catch(function () {});
    return next;
  };
  /* The checks for one frame: the layers' own findings, then the frame
     drawn at its width, at 390 wide (a structured frame wider than that),
     and in the other mode. */
  var runChecks = function (fid) {
    var f = frameById(docRef.current, fid);
    if (!f) return Promise.reject(new Error("That frame is gone."));
    var found = lintFrame(f), drawn = {}, skip = {};
    var soft = function (key) { return function (err) { skip[key] = (err && err.message) || "It couldn't be drawn."; return null; }; };
    return drawAndAudit(f, f.width, !!f.dark).then(function (r) { drawn.here = r; }, soft("here")).then(function () {
      if (f.bare) { skip.narrow = "A loose object isn't a page."; return null; }
      if (f.mode !== "structured") { skip.narrow = "A freeform frame places layers by position, so it isn't reflowed."; return null; }
      if (f.width <= 390) { drawn.narrow = drawn.here; return null; }
      return drawAndAudit(f, 390, !!f.dark).then(function (r) { drawn.narrow = r; }, soft("narrow"));
    }).then(function () {
      return drawAndAudit(f, f.width, !f.dark).then(function (r) { drawn.dark = r; }, soft("dark"));
    }).then(function () {
      var rows = checksFrom(f, found, drawn, skip);
      return { rows: rows, text: checksText(f, rows) };
    });
  };
  /* The space between two layers as drawn, and the nearest spacing token. */
  var SPACE_TOKENS = [];
  ["padding", "margin"].forEach(function (k) { ((DATA.tokens[k] || {}).options || []).forEach(function (o) { var t = o.tokens && o.tokens[0]; if (t && SPACE_TOKENS.indexOf(t) < 0) SPACE_TOKENS.push(t); }); });
  var measureLayers = function (aId, bId) {
    var a = api(docRef.current.active);
    if (!a || !a.rect) return null;
    var ra = a.rect(aId), rb = a.rect(bId);
    if (!ra || !rb) return null;
    var px = a.tokenPx ? a.tokenPx(SPACE_TOKENS) : {};
    var near = function (v) {
      var best = null;
      Object.keys(px).forEach(function (t) { if (px[t] > 0 && (!best || Math.abs(px[t] - v) < Math.abs(px[best] - v))) best = t; });
      return best ? { token: best, tokenPx: Math.round(px[best]) } : {};
    };
    var across = Math.max(rb.left - ra.right, ra.left - rb.right);
    var down = Math.max(rb.top - ra.bottom, ra.top - rb.bottom);
    var side = function (v) { return Object.assign({ px: Math.round(Math.max(0, v)), overlap: v < 0 }, v > 0 ? near(v) : {}); };
    return { across: side(across), down: side(down) };
  };
  /* A guideline as plain text: a prose guide as written, a foundation card
     with its markup taken away. Fetched once each. */
  var guideCache = useRef({});
  var guidelineText = function (g) {
    var c = guideCache.current;
    if (!c[g.id]) c[g.id] = fetch("system/guidelines/" + g.file).then(function (r) { if (!r.ok) throw new Error("missing"); return r.text(); }).then(function (t) {
      if (/\.md$/.test(g.file)) return t;
      return t.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
    }).catch(function (err) { delete c[g.id]; throw err; });
    return c[g.id];
  };
  /* The file's theme in a few words, from Configure: what the assistant
     needs to choose variants and copy, not every setting. */
  var themeSummary = function () {
    var P = window.DovetailConfigurePanel;
    var t = P && P.theme ? P.theme() : null;
    if (!t || !t.config) return null;
    var c = t.config;
    return {
      brand: (t.brand && t.brand.name) || "",
      primary: c.primary + (c.primaryHex ? " (" + c.primaryHex + ")" : ""),
      secondary: c.secondary + (c.secondaryHex ? " (" + c.secondaryHex + ")" : ""),
      actions: c.actions === "brand" ? "brand-coloured buttons and links" : "ink buttons and links, brand kept for accents",
      fonts: { body: c.font, display: c.displayFont || c.font, small: c.secondaryFont || c.font, code: c.codeFont },
      headlines: c.headlineColor, corners: c.radius, density: c.density ? "compact" : "regular",
      darkByDefault: !!c.dark, brandFill: c.brandFill, pageTint: c.pageTint, sectionTint: c.sectionTint, texture: c.texture,
      whitespace: c.whitespace, pageWidth: c.pageWidth,
      context: t.context ? String(t.context).replace(/^dt-context-/, "") : "none set",
    };
  };
  /* Whether the assistant may look at the canvas: on unless turned off for
     this file. */
  var LOOK_KEY = "dovetail-assistant-look:";
  var canLook = function () { try { return window.localStorage.getItem(LOOK_KEY + projectRef.current.id) !== "off"; } catch (err) { return true; } };
  var toolApi = {
    doc: function () { return docRef.current; },
    selection: function () { return asReachState[0] === "page" || !asSelState[0] ? [] : selRef.current.slice(); },
    setStyle: function (ids, key, value) {
      return change(function (d) { var any = false; ids.forEach(function (id) { var at = locate(d, id); if (!at || at.node.style[key] === value) return; any = true; if (value === undefined) delete at.node.style[key]; else at.node.style[key] = value; }); return any ? undefined : null; });
    },
    setProp: function (ids, name, value) {
      return change(function (d) { var any = false; ids.forEach(function (id) { var at = locate(d, id); if (!at || at.node.props[name] === value) return; any = true; at.node.props[name] = value; }); return any ? undefined : null; });
    },
    insert: function (parent, index, nodes) {
      var t = parent ? { parent: parent, index: index } : target();
      var at0 = locate(docRef.current, t.parent);
      if (!at0) return [];
      var at = t.index == null ? (at0.node.children || []).length : t.index, made = [];
      change(function (d) { nodes.forEach(function (n) { if (ops.insert(d, t.parent, at, n, d.active)) { made.push(n.id); at++; } }); return made.length ? undefined : null; });
      return made;
    },
    remove: function (ids) { var r = null; change(function (d) { r = ops.remove(d, ids); return r === null ? null : undefined; }); return r !== null; },
    select: function (ids) { select(ids); },
    skills: function () { return asContext().skills; },
    pages: function () { return pagesOf(projectRef.current).map(function (pg) { return { id: pg.id, name: pg.name, current: pg.id === pageRef.current || undefined }; }); },
    loadPage: function (pg) { return store.loadDoc(projectRef.current.id, pg); },
    screenshot: function (fid, id) { return shootForAssistant(fid, id); },
    componentDoc: function (name) { return componentDoc(name); },
    replace: function (id, nodes) {
      var made = [];
      change(function (d) {
        if (!ops.replace(d, id, nodes[0])) return null;
        made.push(nodes[0].id);
        var at = locate(d, nodes[0].id);
        nodes.slice(1).forEach(function (n, i) { if (at && ops.insert(d, at.parent.id, at.index + 1 + i, n, d.active)) made.push(n.id); });
        return undefined;
      });
      return made;
    },
    move: function (ids, parent, index) {
      var moved = [];
      change(function (d) {
        ids.forEach(function (id) {
          var to = locate(d, parent);
          if (!to) return;
          var at = index == null ? to.node.children.length : index + moved.length;
          if (ops.move(d, id, parent, at)) moved.push(id);
        });
        return moved.length ? undefined : null;
      });
      return moved;
    },
    wrap: function (id, type) { var box = null; change(function (d) { box = ops.wrap(d, id, type); return box ? undefined : null; }); return box; },
    group: function (ids) { var box = null; change(function (d) { box = ops.group(d, ids); return box ? undefined : null; }); return box; },
    duplicate: function (ids) {
      var copies = [];
      change(function (d) { ids.forEach(function (id) { var c = ops.duplicate(d, id); if (c) copies.push(c); }); return copies.length ? undefined : null; });
      return copies;
    },
    rename: function (id, name) { return change(function (d) { var at = locate(d, id); if (!at || at.node.name === name) return null; at.node.name = name; return undefined; }); },
    createFrame: function (opts) { return frameOps.add(null, false, null, opts); },
    useFrame: function (fid) { activate(fid); },
    /* Edits made inside fn become one history step. */
    guideline: function (g) { return guidelineText(g); },
    theme: function () { return themeSummary(); },
    runChecks: function (fid) { return runChecks(fid); },
    measure: function (a, b) { return measureLayers(a, b); },
    batch: function (fn) {
      var before = docRef.current, from = history.current.past.length;
      try { fn(); } finally {
        if (history.current.past.length - from > 1) { history.current.past.splice(from); remember(before, docRef.current); }
      }
    },
  };
  /* One reply: send, run the tools it calls, send back what they did, until
     it stops calling them (eight rounds at most). The brief (systemPrompt)
     goes first and never changes; what's particular to this page and this
     message follows it. */
  /* A conversation this long (pictures and all) is past what's sent in one
     request, so the next message starts a fresh one. */
  var AS_MSGS_MAX = 6000000;
  var runAssistant = function (text) {
    if (asBusy || !text) return;
    var sel = toolApi.selection().map(function (id) { var at = locate(docRef.current, id); return at && at.node; }).filter(Boolean);
    var ctx = asContext();
    var fr = active(docRef.current);
    var planOn = asPlanState[0];
    var canvas = "# Canvas\n\nFrame: " + fr.name + " (" + (fr.mode || "free") + ", " + fr.width + " wide). " +
      (asReachState[0] === "page" ? "You may change anything on this page." : sel.length ? "Selected: " + sel.map(function (n) { return (n.name || n.type) + " (" + n.id + ")"; }).join(", ") + ". Change only these unless asked for more." : "Nothing is selected.") +
      (planOn ? "" : "\n\nPlans are off: build without propose_plan.");
    var system = [contextText(ctx), canvas].filter(Boolean).join("\n\n");
    var tools = toolsFor({ look: canLook(), plan: planOn });
    var planned = false;
    var me = { id: uid(), role: "user", text: text };
    var base = asBase.current;
    var mine = base && base.page === pageRef.current ? recentEdits(base.doc, docRef.current) : null;
    var told = mine && mine.count ? { id: uid(), role: "edits", count: mine.count, lines: mine.lines } : null;
    asBase.current = null;
    var turn = { id: uid(), role: "assistant", text: "", steps: [], changes: [], status: "working", from: history.current.past.length, prompt: text };
    var api2 = Object.assign({}, toolApi, {
      screenshot: canLook() ? toolApi.screenshot : null,
      needsPlan: function () { return planOn && !planned; },
      /* The plan shows on this reply's card; its answer comes from the
         person's click (approvePlan or changePlan), or Stop. */
      /* The question shows on this reply's card; its answer is a click on
         an option (answerAsk), or what the person types next, or Stop. */
      askUser: function (q) {
        patchTurn(turn.id, { ask: Object.assign({ status: "pending" }, q) });
        return new Promise(function (resolve) {
          askWait.current = { turn: turn.id, resolve: function (answer) { askWait.current = null; resolve(answer); } };
        });
      },
      proposePlan: function (plan) {
        patchTurn(turn.id, { plan: Object.assign({ status: "pending" }, plan) });
        return new Promise(function (resolve) {
          planWait.current = { turn: turn.id, resolve: function (answer) { planWait.current = null; if (answer && answer.approved) planned = true; resolve(answer); } };
        });
      },
    });
    var fresh0 = JSON.stringify(asMsgs.current).length > AS_MSGS_MAX;
    if (fresh0) asMsgs.current = [];
    if (ctx.docs.length || ctx.skills.length) turn.steps.push({ ok: true, text: "Read " + (sel.length ? sel.length + (sel.length === 1 ? " layer" : " layers") + ", " : "") + ctx.docs.length + (ctx.docs.length === 1 ? " doc" : " docs") + " and " + ctx.skills.length + (ctx.skills.length === 1 ? " skill" : " skills") });
    setAsThread(function (t) { return t.concat(fresh0 ? [{ id: uid(), role: "divider", text: "A fresh conversation from here: the last one got too long to send. The assistant still sees the canvas." }] : [], told ? [told] : [], [me, turn]); });
    asDraftState[1]("");
    setAsBusy(true);
    asNotes.current = [];
    asMsgs.current = asMsgs.current.concat([{ role: "user", content: told ? [{ type: "text", text: editsText(mine) }, { type: "text", text: text }] : text }]);
    var abort = typeof AbortController !== "undefined" ? new AbortController() : null;
    asAbort.current = abort;
    var script = practiceScript(sel);
    var edits = 0;
    var round = function (n) {
      var c = collector();
      var shown = "";
      return sendAssistant({ stable: systemPrompt(), system: system, messages: asMsgs.current, tools: tools, effort: asEffortState[0] }, function (ev) {
        c.add(ev);
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { shown += ev.delta.text; var now = shown; patchTurn(turn.id, function (x) { return { text: (x.base || "") + now }; }); }
      }, { script: script, signal: abort && abort.signal }).then(function () {
        var r = c.result();
        asMsgs.current = asMsgs.current.concat([{ role: "assistant", content: r.content.length ? r.content : [{ type: "text", text: r.text || "…" }] }]);
        if (r.error) throw new Error(r.error);
        if (r.stop === "refusal") throw new Error("The model declined that request.");
        var noted = r.notes.map(function (t) { return { ok: true, note: true, text: t }; });
        if (r.stop !== "tool_use" || !r.tools.length) { if (noted.length) patchTurn(turn.id, function (x) { return { steps: x.steps.concat(noted) }; }); return null; }
        var results = [], changes = [], steps = noted.slice();
        /* One at a time, in order: an edit can depend on the one before.
           Each change remembers the history step it began at, so the card
           can undo back to it. */
        return r.tools.reduce(function (p, call) {
          return p.then(function () {
            if (call.bad) { results.push({ type: "tool_result", tool_use_id: call.id, content: "That input didn't parse; send it again.", is_error: true }); return; }
            var at = history.current.past.length;
            return Promise.resolve(runTool(api2, call)).then(function (res) {
              var mine = [].concat(res.change ? [res.change] : [], res.changes || []).map(function (ch) { return Object.assign({}, ch, { at: at }); });
              changes.push.apply(changes, mine);
              if (res.step && res.ok) steps.push({ ok: true, text: res.step, shot: res.shot ? res.shot.url : undefined });
              if (!res.ok) steps.push({ ok: false, text: res.result });
              results.push({ type: "tool_result", tool_use_id: call.id, content: res.result, is_error: !res.ok });
            });
          });
        }, Promise.resolve()).then(function () {
          edits += changes.length;
          /* Notes typed meanwhile go with the results, so this reply hears them. */
          var notes = asNotes.current.splice(0);
          if (notes.length) results.push({ type: "text", text: "The person added, while you worked: " + notes.map(function (x) { return x.text; }).join("\n") });
          patchTurn(turn.id, function (x) { return { changes: x.changes.concat(changes), steps: x.steps.concat(steps), base: (x.text ? x.text + " " : "") }; });
          if (notes.length) setAsThread(function (t) { return t.map(function (x) { return notes.some(function (nt) { return nt.id === x.id; }) ? Object.assign({}, x, { queued: false }) : x; }); });
          asMsgs.current = asMsgs.current.concat([{ role: "user", content: results }]);
          return n < 11 ? round(n + 1) : null;
        });
      });
    };
    var finish = function () {
      setAsBusy(false);
      asAbort.current = null;
      if (planWait.current) planWait.current.resolve({ approved: false, note: "stopped" });
      if (askWait.current) askWait.current.resolve(null);
      asBase.current = { page: pageRef.current, doc: docRef.current };
      asBaseTick[1](function (n) { return n + 1; });
      /* Notes that came too late for this reply start the next one. */
      var left = asNotes.current.splice(0);
      if (left.length) {
        setAsThread(function (t) { return t.filter(function (x) { return !left.some(function (nt) { return nt.id === x.id; }); }); });
        /* After the panel has drawn this reply as finished, so the next one may start. */
        setTimeout(function () { runRef.current(left.map(function (x) { return x.text; }).join("\n")); }, 60);
      }
    };
    round(0).then(function () {
      var changed = edits > 0;
      patchTurn(turn.id, function (x) {
        var made = history.current.past.length - x.from;
        var steps = x.changes.length ? x.steps.concat([{ ok: true, text: "Changed " + x.changes.length + (x.changes.length === 1 ? " thing" : " things") + ", all with system tokens" }]) : x.steps;
        return { status: "done", made: made, steps: steps, checking: x.changes.length > 0 };
      });
      /* Whatever it changed, the checks run on the frame it ended in, and
         their rows join the change card. */
      var fid = docRef.current.active;
      if (changed) setTimeout(function () {
        runChecks(fid).then(function (got) { patchTurn(turn.id, { checks: got.rows, checksOn: fid, checking: false }); }, function () { patchTurn(turn.id, { checking: false }); });
      }, 0);
    }, function (err) {
      patchTurn(turn.id, function (x) { return { status: "error", error: err.message || "The assistant stopped.", made: history.current.past.length - x.from }; });
    }).then(finish);
  };
  var runRef = useRef(runAssistant); runRef.current = runAssistant;
  var asApi = {
    send: runAssistant,
    stop: function () { if (asAbort.current) asAbort.current.abort(); if (planWait.current) planWait.current.resolve({ approved: false, note: "stopped" }); if (askWait.current) askWait.current.resolve(null); },
    clear: function () { setAsThread([]); asMsgs.current = []; asBase.current = null; asBaseTick[1](function (n) { return n + 1; }); if (projectRef.current) store.saveThread(projectRef.current.id, null).catch(function () {}); },
    /* A note while it works: it lands with the next step's results. */
    note: function (text) {
      if (askWait.current) {
        var asked = askWait.current.turn;
        setAsThread(function (t) { return t.map(function (x) { return x.id === asked ? Object.assign({}, x, { ask: Object.assign({}, x.ask, { status: "answered", answer: text }) }) : x; }); });
        askWait.current.resolve({ text: text });
        asDraftState[1]("");
        return;
      }
      var item = { id: uid(), role: "user", text: text, queued: true };
      asNotes.current.push(item);
      setAsThread(function (t) { return t.concat([item]); });
      asDraftState[1]("");
    },
    /* A click on one of a question's options. */
    answerAsk: function (id, index) {
      if (!askWait.current || askWait.current.turn !== id) return;
      patchTurn(id, function (x) { return { ask: Object.assign({}, x.ask, { status: "answered", choice: index }) }; });
      askWait.current.resolve({ index: index });
    },
    /* Write something else: the next message answers the question. */
    otherAsk: function () {
      setTimeout(function () { var el = document.querySelector(".bd-as-input"); if (el) el.focus(); }, 0);
    },
    /* Leave the edits since the last reply out of the next message. */
    dropEdits: function () {
      asBase.current = { page: pageRef.current, doc: docRef.current };
      asBaseTick[1](function (n) { return n + 1; });
    },
    approvePlan: function (id) {
      if (!planWait.current || planWait.current.turn !== id) return;
      patchTurn(id, function (x) { return { plan: Object.assign({}, x.plan, { status: "approved" }) }; });
      planWait.current.resolve({ approved: true });
    },
    changePlan: function (id) {
      if (!planWait.current || planWait.current.turn !== id) return;
      patchTurn(id, function (x) { return { plan: Object.assign({}, x.plan, { status: "changing" }) }; });
      planWait.current.resolve({ approved: false });
      asDraftState[1]("Change the plan: ");
      setTimeout(function () { var el = document.querySelector(".bd-as-input"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    },
    setPlans: function (on) { asPlanState[1](on); writePref(AS_PLAN_KEY, on ? "on" : "off"); announce(on ? "The assistant shows a plan before big changes" : "The assistant builds without asking first"); },
    setEffort: function (v) { asEffortState[1](v); writePref(AS_EFFORT_KEY, v); },
    setLook: function (on) {
      try { if (on) window.localStorage.removeItem(LOOK_KEY + projectRef.current.id); else window.localStorage.setItem(LOOK_KEY + projectRef.current.id, "off"); } catch (err) { /* this visit only */ }
      asLookTick[1](function (n) { return n + 1; });
      announce(on ? "The assistant can look at this file's canvas" : "The assistant won't send pictures of this file's canvas");
    },
    /* Undo one of a reply's changes and every one after it, while nothing
       else has been edited since. */
    undoFrom: function (id, index) {
      var t = asThread.filter(function (x) { return x.id === id; })[0];
      var ch = t && t.changes[index];
      if (!t || !ch || ch.undone) return;
      var end = t.from + (t.made || 0);
      if (history.current.past.length !== end) { announce("Other edits came after this reply, so undo them first, or use Undo step by step."); return; }
      var n = end - ch.at;
      for (var i = 0; i < n; i++) undo();
      patchTurn(id, function (x) {
        var changes = x.changes.map(function (c) { return c.at >= ch.at ? Object.assign({}, c, { undone: true }) : c; });
        var all = changes.every(function (c) { return c.undone; });
        return { changes: changes, made: ch.at - x.from, undone: all, checks: all ? x.checks : null };
      });
      announce("Undid " + (n === 1 ? "that step" : "that step and the ones after it"));
    },
    /* The conversation as Markdown, to keep or share. */
    exportThread: function () {
      var lines = ["# Assistant: " + ((projectRef.current && projectRef.current.name) || "file"), ""];
      asThread.forEach(function (t) {
        if (t.role === "user") lines.push("**You:** " + t.text, "");
        else if (t.role === "edits") { lines.push("_You changed:_"); t.lines.forEach(function (l) { lines.push("- " + l); }); lines.push(""); }
        else if (t.role === "divider") lines.push("---", "", "_" + t.text + "_", "");
        else {
          (t.steps || []).forEach(function (st) { lines.push("- " + (st.ok ? "" : "(failed) ") + st.text); });
          if (t.text) lines.push("", t.text);
          if (t.changes && t.changes.length) { lines.push("", "Changes:"); t.changes.forEach(function (c) { lines.push("- " + c.label + ": " + c.value + (c.on ? " · " + c.on : "") + (c.undone ? " (undone)" : "")); }); }
          if (t.checks) { lines.push("", "Checks:"); t.checks.forEach(function (r) { lines.push("- " + r.status + ": " + r.title); }); }
          lines.push("");
        }
      });
      var blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "assistant-" + (((projectRef.current && projectRef.current.name) || "file").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "file") + ".md";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
      announce("Downloaded " + link.download);
    },
    keep: function (id) { patchTurn(id, { kept: true }); },
    undoTurn: function (id) {
      var t = asThread.filter(function (x) { return x.id === id; })[0];
      if (!t || !t.made) { patchTurn(id, { undone: true }); return; }
      if (history.current.past.length !== t.from + t.made) { announce("Other edits came after this reply, so undo them first, or use Undo step by step."); return; }
      for (var i = 0; i < t.made; i++) undo();
      patchTurn(id, { undone: true });
      announce("Undid the assistant's " + t.changes.length + (t.changes.length === 1 ? " change" : " changes"));
    },
    /* A check's Fix: a message naming what failed and where. */
    fix: function (id, row) {
      if (asBusy) return;
      var t = asThread.filter(function (x) { return x.id === id; })[0];
      var f = t && frameById(docRef.current, t.checksOn);
      if (f && docRef.current.active !== f.id) activate(f.id);
      runAssistant("Fix this check" + (f ? " on " + f.name : "") + ": " + row.title + (row.detail ? ". " + row.detail : "") + (row.ids.length ? " Layers: " + row.ids.slice(0, 12).join(", ") + "." : ""));
    },
    show: function (ids) { if (ids && ids.length) select(ids.filter(function (x) { return locate(docRef.current, x); })); },
    retry: function (id) {
      var t = asThread.filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      asApi.undoTurn(id);
      setTimeout(function () { runAssistant(t.prompt); }, 0);
    },
  };
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
  /* The search under Configure narrows whatever the docked sheet shows: its
     groups by name and summary, or a group's settings by their words. The
     sheet repaints itself, so the filter goes back on after each repaint. */
  useEffect(function () {
    var root = dockRef.current;
    if (!docked || !root) return undefined;
    var q = configQuery.trim().toLowerCase();
    var apply = function () {
      var menu = root.querySelector(".configure-menu");
      var panel = root.querySelector(".configure-panel");
      var items = menu ? menu.querySelectorAll(".configure-row") : panel ? panel.children : [];
      var shown = 0;
      Array.prototype.forEach.call(items, function (el) {
        var hit = !q || el.textContent.toLowerCase().indexOf(q) >= 0;
        el.classList.toggle("bd-cfg-out", !hit);
        if (hit) shown++;
      });
      setConfigNone(!!q && items.length > 0 && !shown);
    };
    apply();
    var watch = new MutationObserver(apply);
    watch.observe(root, { childList: true, subtree: true });
    return function () {
      watch.disconnect();
      Array.prototype.forEach.call(root.querySelectorAll(".bd-cfg-out"), function (el) { el.classList.remove("bd-cfg-out"); });
    };
  }, [docked, configQuery]);
  var layersRef = useRef(null);
  var dragRef = useRef(null);
  var justDragged = useRef(false);
  var gest = useRef({ pts: {}, moved: false, start: null, pinch: null, fid: null });

  var api = function (fid) {
    var el = frameEls.current[fid || docRef.current.active];
    try { return el && el.contentWindow && el.contentWindow.BuilderFrame; } catch (err) { return null; }
  };

  var announce = useCallback(function (text) { setSay(""); setTimeout(function () { setSay(text); }, 30); }, []);
  var openAccount = function () { var dlg = accountRef.current; if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); };
  /* Back from a link in one of the cloud's emails (a confirmed address, a
     password to reset): the Account dialog takes it from there. */
  var arrivedRef = useRef(ARRIVED.link);
  useEffect(function () {
    if (account.status === "recovery" || (arrivedRef.current && (account.status === "in" || account.status === "out"))) { arrivedRef.current = false; openAccount(); }
  }, [account.status]);
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
      /* The selection, as the checks read and set it. */
      selection: function () { return selRef.current.slice(); }, select: function (ids) { select([].concat(ids)); },
      /* How many steps there are to undo and redo, and whether the project saved. */
      history: function () { return { past: history.current.past.length, future: history.current.future.length }; },
      saved: function () { return savedRef.current; } };
  }, []);
  useEffect(function () {
    storage(function (s) { s.setItem(PREFS_KEY, JSON.stringify({ category: category, kind: assetKind, view: view, closed: closedSecs, left: left, canvas: canvasView, panels: panels })); });
  }, [category, assetKind, view, closedSecs, left, canvasView, panels]);
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
    camSetRef.current = true;
    camera.set(next);
    var pct = Math.round(next.z * 100);
    if (pct !== zoomPctRef.current) { zoomPctRef.current = pct; setZoomPct(pct); }
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
  /* Resizing a floating panel by its inner edge: steps of 4 between its
     limits; past the minimum it folds away (the left one to its rail), and
     back out of it opens it again. Double-click puts the default back. */
  var PANEL_WORD = { left: "Left panel", right: "Inspector" };
  var setPanel = function (side, w, closed) {
    var b = PANELS[side];
    setPanels(function (p) {
      var n = Object.assign({}, p);
      if (w != null) n[side] = Math.min(b.max, Math.max(b.min, Math.round(w / PANELS.step) * PANELS.step));
      if (closed != null) n[side + "Closed"] = closed;
      return n;
    });
  };
  var startPanel = function (ev, side) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    var b = PANELS[side], p = panels, dir = side === "left" ? 1 : -1;
    var from = p[side + "Closed"] ? (side === "left" ? railW : 0) : p[side];
    var x0 = ev.clientX, last = null;
    var move = function (mv) {
      var raw = from + (mv.clientX - x0) * dir;
      var closed = raw < b.min - PANELS.fold;
      var w = Math.min(b.max, Math.max(b.min, Math.round(raw / PANELS.step) * PANELS.step));
      last = { w: w, closed: closed };
      /* Folded, it keeps the width it had before this drag, to open back to. */
      setPanel(side, closed ? p[side] : w, closed);
      setReadout({ x: mv.clientX, y: mv.clientY, text: closed ? "Fold away" : w + (w === b.min ? " · min" : w === b.max ? " · max" : "") });
    };
    var up = function () {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.classList.remove("bd-is-resizing");
      setReadout(null);
      if (last) announce(last.closed ? PANEL_WORD[side] + " folded away" : PANEL_WORD[side] + " " + last.w + " wide");
    };
    document.documentElement.classList.add("bd-is-resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  var panelKey = function (ev, side) {
    var b = PANELS[side], closed = panels[side + "Closed"], w = panels[side], dir = side === "left" ? 1 : -1, step = ev.shiftKey ? 16 : PANELS.step;
    var to = null;
    if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") to = (closed ? b.min : w + (ev.key === "ArrowRight" ? step : -step) * dir);
    else if (ev.key === "Home") to = b.min;
    else if (ev.key === "End") to = b.max;
    else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setPanel(side, null, !closed); announce(PANEL_WORD[side] + (closed ? " open" : " folded away")); return; }
    if (to == null) return;
    ev.preventDefault();
    setPanel(side, to, false);
  };
  var resetPanel = function (side) { setPanel(side, PANELS[side].def, false); announce(PANEL_WORD[side] + " back to " + PANELS[side].def + " wide"); };
  var panelHandle = function (side) {
    var b = PANELS[side], closed = panels[side + "Closed"];
    if (side === "right" && closed) return e("button", { key: "show-right", type: "button", className: "bd-panel-show", title: "Show the inspector", "aria-label": "Show the inspector",
      onClick: function () { setPanel("right", null, false); } }, e(Icon, { name: "panels" }));
    return e("div", { key: "edge-" + side, className: cx("bd-panel-edge", "is-" + side), role: "separator", tabIndex: 0, "aria-orientation": "vertical",
      "aria-label": "Resize the " + (side === "left" ? "left panel" : "inspector"), "aria-valuemin": b.min, "aria-valuemax": b.max, "aria-valuenow": closed ? b.min : panels[side],
      "aria-valuetext": closed ? "Folded away" : panels[side] + " wide", title: closed ? "Drag to open · Double-click to reset" : "Drag to resize · Double-click to reset",
      onPointerDown: function (ev) { startPanel(ev, side); }, onDoubleClick: function () { resetPanel(side); }, onKeyDown: function (ev) { panelKey(ev, side); } });
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
  /* The selection filling the stage (never past 100%); false when there's
     nothing selected to show. */
  var showSelection = function () {
    var ids = selRef.current;
    var fid = docRef.current.active, f = api(fid), b = layoutRef.current.boxes[fid];
    if (!ids.length || !f || !b) return false;
    var l = Infinity, t = Infinity, r = -Infinity, btm = -Infinity;
    ids.forEach(function (id) { var rc = f.rect(id); if (!rc) return; l = Math.min(l, rc.left); t = Math.min(t, rc.top); r = Math.max(r, rc.right); btm = Math.max(btm, rc.bottom); });
    if (l === Infinity) return false;
    var ins = insets(), W = boxRef.current.w - ins.l - ins.r, H = boxRef.current.h;
    if (!W) return false;
    var w = Math.max(1, r - l), h = Math.max(1, btm - t);
    var z = clampZoom(Math.min(1, (W - STAGE_PAD * 2) / w, (H - STAGE_PAD * 2 - LABEL_ROOM) / h));
    setCam({ x: ins.l + (W - w * z) / 2 - (b.x + l) * z, y: (H - h * z + LABEL_ROOM) / 2 - (b.y + t) * z, z: z });
    return true;
  };

  /* The first view: the active frame on its own, or every frame across. */
  useEffect(function () {
    if (camSetRef.current || !box.w) return;
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

  /* A marquee: with the Select tool, a mouse or pen dragged across empty
     canvas draws a box and selects the top-level layers it touches, in the
     frame holding most of them. Shift adds them to what was selected.
     Touch keeps panning, as do Space, the Hand tool and the middle button. */
  var marqueeState = useState(null);
  var marquee = marqueeState[0], setMarquee = marqueeState[1];
  var marqRef = useRef(null);
  var marqueeHits = function (r) {
    var best = null;
    docRef.current.frames.forEach(function (f) {
      var a = api(f.id), b = layoutRef.current.boxes[f.id];
      if (!a || !b || !a.rect) return;
      var ids = [];
      f.root.children.forEach(function (c) {
        var box = toStage(a.rect(c.id), f.id);
        if (box && box.left < r.left + r.width && box.left + box.width > r.left && box.top < r.top + r.height && box.top + box.height > r.top) ids.push(c.id);
      });
      if (ids.length && (!best || ids.length > best.ids.length)) best = { fid: f.id, ids: ids };
    });
    return best;
  };
  var marqueeStart = function (ev) {
    var p = stageXY(ev.clientX, ev.clientY);
    marqRef.current = { id: ev.pointerId, x0: p.x, y0: p.y, add: ev.shiftKey, base: selRef.current.slice(), baseFid: docRef.current.active, moved: false, raf: 0 };
  };
  var marqueeMove = function (ev) {
    var m = marqRef.current;
    var p = stageXY(ev.clientX, ev.clientY);
    if (!m.moved && Math.abs(p.x - m.x0) + Math.abs(p.y - m.y0) < 5) return;
    m.moved = true;
    var r = { left: Math.min(m.x0, p.x), top: Math.min(m.y0, p.y), width: Math.abs(p.x - m.x0), height: Math.abs(p.y - m.y0) };
    setMarquee(r);
    cancelAnimationFrame(m.raf);
    m.raf = requestAnimationFrame(function () {
      if (marqRef.current !== m) return;
      var hit = marqueeHits(r);
      var fid = hit ? hit.fid : m.baseFid;
      if (fid !== docRef.current.active) activate(fid);
      var ids = hit ? hit.ids : [];
      if (m.add && fid === m.baseFid) m.base.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      var cur = selRef.current;
      if (ids.length !== cur.length || ids.some(function (id) { return cur.indexOf(id) < 0; })) select(ids);
      if (!ids.length) setFrameOn(false);
    });
  };
  /* The right-click menu: on a layer (canvas or Layers), on the frame or
     on empty canvas. A press on a layer outside the selection selects it
     first; the menu then acts on the selection. Shift+F10 opens it too. */
  var menuState = useState(null);
  var menu = menuState[0], setMenu = menuState[1];
  /* id: a layer; null or "root": the frame or empty canvas (the frame's
     menu, whatever is selected); undefined: the selection itself. */
  var openMenu = function (x, y, id, fid) {
    if (fid && fid !== docRef.current.active) activate(fid);
    var onLayer = id && id !== "root";
    if (onLayer && selRef.current.indexOf(id) < 0) select([id]);
    setMenu({ x: x, y: y, ids: onLayer ? (selRef.current.indexOf(id) < 0 ? [id] : selRef.current.slice()) : id === undefined ? selRef.current.slice() : [] });
  };
  var openMenuRef = useRef(openMenu); openMenuRef.current = openMenu;
  var menuAtSelection = function () {
    var st = stageRef.current && stageRef.current.getBoundingClientRect();
    var placed = placeMarks(marksRaw, layoutRef.current.boxes, camRef.current).sel;
    var m = placed.filter(function (s) { return s.id === sel; })[0] || placed[0];
    if (st && m) openMenu(st.left + m.r.left + Math.min(m.r.width, 160) / 2, st.top + m.r.top + Math.min(m.r.height, 40) / 2, undefined);
    else if (st) openMenu(st.left + st.width / 2, st.top + st.height / 3, selRef.current.length ? undefined : null);
  };
  /* done: false puts back what was selected before (Escape). */
  var marqueeEnd = function (done) {
    var m = marqRef.current;
    if (!m) return false;
    marqRef.current = null;
    cancelAnimationFrame(m.raf);
    setMarquee(null);
    if (!done) { if (m.baseFid !== docRef.current.active) activate(m.baseFid); select(m.base); }
    else if (selRef.current.length) announce(selRef.current.length === 1 ? "1 selected" : selRef.current.length + " selected");
    return m.moved;
  };

  /* ------------------------------------------------- measuring */

  /* A node's box in stage coordinates, from its frame's own. */
  var toStage = useCallback(function (r, fid) {
    if (!r) return null;
    var b = layoutRef.current.boxes[fid || docRef.current.active];
    if (!b) return null;
    return onStage(r, b, camRef.current);
  }, []);

  var remeasure = useCallback(function () {
    var fid = docRef.current.active;
    var f = api(fid);
    var h = hoverRef.current;
    var hf = h ? api(h.f) : null;
    setMarks(function (m) {
      return {
        sel: f ? selRef.current.map(function (id) {
          var r = f.rect(id);
          if (!r) return null;
          /* A turned layer: its own size, to draw a box turned about the same centre. */
          var at = locate(docRef.current, id), rot = at && at.node.style && at.node.style.rot;
          var size = rot && f.size ? f.size(id) : null;
          return { id: id, fid: fid, r: r, rot: rot, size: size };
        }).filter(Boolean) : [],
        hover: h && hf && h.id !== "root" && !(h.f === fid && selRef.current.indexOf(h.id) >= 0) ? (function () { var r = hf.rect(h.id); return r ? { fid: h.f, r: r } : null; })() : null,
        drop: m.drop,
      };
    });
    var ed = editRef.current;
    if (ed && f) {
      var t = f.textRect(ed.id, ed.value);
      if (t) setEdit(function (cur) { return cur && cur.id === ed.id ? Object.assign({}, cur, { rect: t.rect, fid: fid, font: t.font }) : cur; });
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
    select(at ? [owner] : []);
    setClosedSecs(function (c) { var n = Object.assign({}, c); if (FOLDED_FIRST[sec]) n[sec] = false; else delete n[sec]; return n; });
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

  /* Smart guides: a free object dragged near a sibling's edge or centre,
     or the frame's, snaps to it, and a line shows what it lined up with.
     Between two siblings it snaps to equal gaps, which are labelled. Cmd
     or Ctrl held turns the snapping off. All in the frame's pixels. */
  var snapOffRef = useRef(false);
  var snapFree = function (f, hostFrame, skipId, fx, fy, w, h, z) {
    var res = { x: fx, y: fy, guides: [] };
    /* Objects (the frame's edges and its other layers) and guides each snap
       unless the View menu turns them off; Ctrl held turns both off. */
    var cv = viewRef.current, objects = cv.snapObjects !== false, toGuides = cv.snapGuides !== false && cv.guides !== false;
    if (snapOffRef.current || !f.rect || (!objects && !toGuides)) return res;
    var reach = 6 / z;
    var targets = [];
    var rootR = f.rect("root");
    if (objects) {
      if (rootR) targets.push({ l: 0, t: 0, r: rootR.width, b: rootR.height, frame: true });
      hostFrame.root.children.forEach(function (c) { if (c.id === skipId) return; var r = f.rect(c.id); if (r) targets.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); });
    }
    /* A guide is a line on one axis only. */
    if (toGuides) (hostFrame.guides || []).forEach(function (g) {
      var H = rootR ? rootR.height : hostFrame.height, W = rootR ? rootR.width : hostFrame.width;
      if (g.x !== undefined) targets.push({ l: g.x, r: g.x, t: 0, b: H, axis: "x" });
      else targets.push({ t: g.y, b: g.y, l: 0, r: W, axis: "y" });
    });
    if (!targets.length) return res;
    var bestX = null, bestY = null;
    targets.forEach(function (t) {
      if (t.axis !== "y") [t.l, (t.l + t.r) / 2, t.r].forEach(function (line) {
        [fx, fx + w / 2, fx + w].forEach(function (edge) {
          var d = line - edge;
          if (Math.abs(d) <= reach && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d: d, at: line, t: t };
        });
      });
      if (t.axis !== "x") [t.t, (t.t + t.b) / 2, t.b].forEach(function (line) {
        [fy, fy + h / 2, fy + h].forEach(function (edge) {
          var d = line - edge;
          if (Math.abs(d) <= reach && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d: d, at: line, t: t };
        });
      });
    });
    if (bestX) res.x = fx + bestX.d;
    if (bestY) res.y = fy + bestY.d;
    if (bestX) res.guides.push({ v: bestX.at, from: Math.min(res.y, bestX.t.t), to: Math.max(res.y + h, bestX.t.b) });
    if (bestY) res.guides.push({ h: bestY.at, from: Math.min(res.x, bestY.t.l), to: Math.max(res.x + w, bestY.t.r) });
    /* Between two siblings: the same gap on each side. */
    if (!bestX) {
      var L = null, R = null;
      targets.forEach(function (t) {
        if (t.frame || t.axis || t.b <= res.y || t.t >= res.y + h) return;
        if (t.r <= fx && (!L || t.r > L.r)) L = t;
        if (t.l >= fx + w && (!R || t.l < R.l)) R = t;
      });
      if (L && R && Math.abs((fx - L.r) - (R.l - fx - w)) <= reach * 2) {
        res.x = (L.r + R.l - w) / 2;
        var gx = Math.round(res.x - L.r), my = res.y + h / 2;
        res.guides.push({ gap: true, h: my, from: L.r, to: res.x, label: gx }, { gap: true, h: my, from: res.x + w, to: R.l, label: gx });
      }
    }
    if (!bestY) {
      var T = null, B = null;
      targets.forEach(function (t) {
        if (t.frame || t.axis || t.r <= res.x || t.l >= res.x + w) return;
        if (t.b <= fy && (!T || t.b > T.b)) T = t;
        if (t.t >= fy + h && (!B || t.t < B.t)) B = t;
      });
      if (T && B && Math.abs((fy - T.b) - (B.t - fy - h)) <= reach * 2) {
        res.y = (T.b + B.t - h) / 2;
        var gy = Math.round(res.y - T.b), mx = res.x + w / 2;
        res.guides.push({ gap: true, v: mx, from: T.b, to: res.y, label: gy }, { gap: true, v: mx, from: res.y + h, to: B.t, label: gy });
      }
    }
    res.x = Math.max(0, res.x); res.y = Math.max(0, res.y);
    return res;
  };

  /* ------------------------------------------------- view: rulers, guides, columns */

  var VIEW_SAYS = { rulers: "Rulers", guides: "Guides", columns: "Layout columns", snapObjects: "Snap to objects", snapGuides: "Snap to guides" };
  var toggleView = function (k, on) {
    var next = on === undefined ? !viewRef.current[k] : on;
    if (viewRef.current[k] === next) return;
    setCanvasView(function (v) { var n = Object.assign({}, v); n[k] = next; return n; });
    announce(VIEW_SAYS[k] + (next ? " on" : " off"));
  };
  var RULER = 20;
  /* A frame's guides, changed as one undoable step. fn takes a copy of the
     list and returns the new one, or null for no change. */
  var setGuides = function (fid, fn, message) {
    change(function (d) {
      var f = frameById(d, fid);
      if (!f) return null;
      var next = fn((f.guides || []).map(function (g) { return Object.assign({}, g); }));
      if (!next) return null;
      if (next.length) f.guides = next; else delete f.guides;
      return undefined;
    }, message);
  };
  var clearGuides = function (fid) { setGuides(fid, function (g) { return g.length ? [] : null; }, "Guides cleared"); };
  /* A guide dragged out of a ruler, or an existing one moved: it lands at a
     whole pixel of the frame when let go; dropped back on a ruler, or off
     the frame, a new one isn't made and an old one goes. */
  var startGuide = function (ev, fid, axis, i) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    var cur = null;
    var at = function (mv) {
      var st = stageRef.current && stageRef.current.getBoundingClientRect(), b = layoutRef.current.boxes[fid], c = camRef.current;
      if (!st || !b) return null;
      var sx = mv.clientX - st.left, sy = mv.clientY - st.top, ins = insets();
      var v = axis === "x" ? (sx - c.x) / c.z - b.x : (sy - c.y) / c.z - b.y, size = axis === "x" ? b.w : b.h;
      var overRuler = viewRef.current.rulers && (axis === "x" ? sx < ins.l + RULER : sy < RULER);
      return { fid: fid, axis: axis, i: i, v: Math.round(Math.max(0, Math.min(size, v))), off: overRuler || v < -2 || v > size + 2 };
    };
    var move = function (mv) {
      cur = at(mv);
      if (!cur) return;
      setGuideDrag(cur);
      setReadout({ x: mv.clientX, y: mv.clientY, text: cur.off ? (i >= 0 ? "Let go to remove" : "Onto the frame") : (axis === "x" ? "X " : "Y ") + cur.v });
    };
    var up = function (ok) {
      return function () {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        setGuideDrag(null);
        setReadout(null);
        if (!ok || !cur) return;
        if (cur.off) { if (i >= 0) setGuides(fid, function (g) { g.splice(i, 1); return g; }, "Guide removed"); return; }
        var o = axis === "x" ? { x: cur.v } : { y: cur.v };
        setGuides(fid, function (g) { if (i >= 0) g[i] = o; else if (g.length < GUIDES_MAX) g.push(o); else return null; return g; }, (i >= 0 ? "Guide moved to " : "Guide at ") + axis + " " + cur.v);
        if (!viewRef.current.guides) toggleView("guides", true);
      };
    };
    var onUp = up(true), onCancel = up(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
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
      var snapped = snapFree(f, hostFrame, moving && own ? payload.id : null, fx, fy, w, h, z);
      fx = snapped.x; fy = snapped.y;
      out.guides = snapped.guides.length ? snapped.guides : null;
      var gx = Math.min(FREE_MAX, Math.round(fx / unit)), gy = Math.min(FREE_MAX, Math.round(fy / unit));
      out.free = { x: gx, y: gy };
      out.readout = { x: x, y: y, text: "X " + Math.round(gx * unit) + "  Y " + Math.round(gy * unit) };
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
    setReadout(hit && hit.readout ? hit.readout : null);
    setMarks(function (m) {
      var guides = hit && hit.where === "canvas" && hit.guides ? hit.guides.map(function (g) {
        var r = g.v !== undefined ? toStage({ left: g.v, top: g.from, width: 0, height: g.to - g.from }, hit.frame) : toStage({ left: g.from, top: g.h, width: g.to - g.from, height: 0 }, hit.frame);
        return r ? Object.assign(r, { gap: !!g.gap, label: g.label, v: g.v !== undefined }) : null;
      }).filter(Boolean) : null;
      return Object.assign({}, m, { drop: hit && hit.where === "canvas" ? { line: hit.line ? thick(toStage(hit.line, hit.frame)) : null, box: hit.box && !(hit.free && ghosted) ? toStage(hit.box, hit.frame) : null, guides: guides } : null });
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

  var dragMove = function (x, y, shift) {
    var dr = dragRef.current;
    if (!dr) return;
    /* A drag the frame started knows where it began from its first move. */
    if (dr.x === undefined) { dr.x = x; dr.y = y; }
    /* Shift, once it's moving, keeps a layer to the axis it has moved along
       most (Shift at the press adds to the selection instead). */
    if (shift && dr.payload.kind === "move") { if (Math.abs(x - dr.x) >= Math.abs(y - dr.y)) y = dr.y; else x = dr.x; }
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
        delete from.node.style.ch;
        delete from.node.style.cv;
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
  var sizeNear = function (key, px, fills, any, nodes) {
    if (fills) return key === "w" || key === "height" ? "fill" : null;
    var best = null, gap = Infinity;
    /* Only sizes that suit the layer: a Text never snaps to an avatar. */
    var sc = nodes && nodes.length ? scopeFor(nodes) : null;
    DATA.tokens[key].options.forEach(function (o) {
      if (o.family === "fit" || o.family === "container") return;
      if (sc && !optionAllowed(key, o, sc)) return;
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
    if (r && !n.style.w) { var w = sizeNear("w", r.width, !!pr && Math.abs(pr.width - r.width) < 2 && !isFree(n.style), false, [n]); if (w) n.style.w = w; }
    if (r && !n.style.height) { var h = sizeNear("height", r.height, false, false, [n]); if (h) n.style.height = h; }
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
    delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv;
    n.name = comp.name;
    /* Linked: the component's changes reach it (model/instances.js). */
    n.inst = { of: comp.id, rev: comp.rev || 1 };
    return n;
  };
  var addLocal = function (comp, where) {
    var n = instanceOf(comp);
    if (!n) { announce(comp.name + " couldn't be read back"); return; }
    var t = where || target();
    var fid = t.frame || docRef.current.active;
    /* Inside one of its own instances, it goes right after that instance
       instead: a component can't hold itself. */
    var into = t.parent && t.parent !== "root" ? locate(docRef.current, t.parent, fid) : null;
    var self = into ? into.path.filter(function (a) { return a.inst && a.inst.of === comp.id; })[0] : null;
    var beside = self ? locate(docRef.current, self.id, fid) : null;
    if (beside) {
      var fr0 = frameById(docRef.current, fid);
      t = { parent: fr0 && beside.parent === fr0.root ? "root" : beside.parent.id, index: beside.index + 1, frame: fid };
    }
    if (t.free) { n.style.x = t.free.x; n.style.y = t.free.y; }
    var fr = frameById(docRef.current, fid);
    if (!change(function (d) { d.active = fid; return ops.insert(d, t.parent, t.index, n, fid); }, "Added " + comp.name + " to " + (fr ? fr.name : "the frame"))) announce(comp.name + " can't go there");
    else if (beside) announce(comp.name + " can't go inside itself, so it's beside " + nameOf(self));
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
      dragMove(mv.clientX, mv.clientY, mv.shiftKey);
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
          menu: on(function (fid, id, x, y) { var p = toPage(fid, x, y); openMenuRef.current(p.x, p.y, id, fid); }),
          /* From the Play screen, which isn't one of the canvas frames. */
          goPage: function (pageId) { playGoRef.current(pageId); },
          playKey: function (key, alt) { return playKeyRef.current(key, alt); },
          edit: on(function (fid, id, text) { if (docRef.current.active !== fid) activateRef.current(fid); beginEditRef.current(id, text); }),
          hover: on(function (fid, id) {
            var h = hoverRef.current;
            if (!id) { if (h && h.f === fid) setHover(null); return; }
            if (!h || h.f !== fid || h.id !== id) setHover({ f: fid, id: id });
          }),
          key: function (ev) { return keyRef.current(ev); },
          keyup: function (ev) { keyUpRef.current(ev); },
          moved: function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { measureRef.current(); }); },
          dragStart: on(function (fid, id, alt) {
            if (docRef.current.active !== fid) activateRef.current(fid);
            var at = locate(docRef.current, id);
            if (!at) return;
            if (at.node.type === "Slot" || at.node.lock) return;
            /* Alt-drag: a copy is made where the original is, and it's the
               copy that moves, so the original stays put. */
            if (alt) {
              var copyId = null;
              change(function (d) { copyId = ops.duplicate(d, id); return copyId; }, "Duplicated");
              if (!copyId) return;
              id = copyId;
              at = locate(docRef.current, id);
              if (!at) return;
            }
            var pl = { kind: "move", id: id, label: nameOf(at.node) };
            dragRef.current = { payload: pl, active: true, ghost: null };
            dragRef.current.ghost = ghostFor(pl);
            if (selRef.current.indexOf(id) < 0) select([id]);
          }),
          dragMove: on(function (fid, x, y, shift) { if (!dragRef.current) return; var p = toPage(fid, x, y); dragMoveRef.current(p.x, p.y, shift); }),
          dragEnd: function (commitIt) { dragEndRef.current(commitIt); },
          paste: function (cd) { return takePasteRef.current(cd); },
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
      a.render({ page: { dark: f.dark, surface: f.surface, canvas: f.canvas, spacing: f.spacing, gap: f.gap, typeScale: f.typeScale, pageWidth: f.pageWidth, gutter: f.gutter, flow: f.flow, clip: f.clip, scroll: f.scroll }, root: f.root }, { preview: preview, hug: f.hug || !!f.bare, bare: !!f.bare, sized: !!(f.bare && f.sized), screen: f.bare ? null : { w: f.width, h: f.height } });
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

  useEffect(function () { remeasure(); }, [selection, hover, layout.width, layout.height, doc.active, edit && edit.id]);
  /* Layout columns read each frame's page width, gutter and column gap as
     its theme and page settings make them. */
  var colKey = doc.frames.map(function (f) { return f.id + ":" + f.width + ":" + (f.pageWidth || "") + ":" + (f.gutter || "") + ":" + (f.spacing || "") + ":" + !!ready[f.id]; }).join("|");
  useEffect(function () {
    if (!canvasView.columns) return;
    var next = {};
    docRef.current.frames.forEach(function (f) {
      var a = !f.bare && ready[f.id] ? api(f.id) : null;
      var m = a && a.measure ? a.measure(["var(--dt-layout-page-width)", "var(--dt-layout-page-gutter)", "var(--dt-space-gutter)"]) : null;
      if (m) next[f.id] = { pw: m[0] || f.width, gut: m[1] || 0, gap: m[2] || 0 };
    });
    setColInfo(next);
  }, [canvasView.columns, colKey, themeStamp]);
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
  }, [shiftHeld, hover && hover.f, hover && hover.id, sel, doc, drag, preview, pxMap]);
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
    setEdit(Object.assign({ id: id, before: src.value, base: docRef.current, rect: t.rect, fid: docRef.current.active, font: t.font }, src));
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

  /* Align and distribute free objects: on their own, to the frame's edges
     and centre; several, to each other. Positions move by whole steps of
     --dt-space-inset-2xs, so the document stays token-only. Flow children
     aren't arranged this way: their parent's layout already does it. */
  var arrangeable = function (ids) {
    var d = docRef.current;
    if (!ids.length) return null;
    var spots = ids.map(function (id) { return locate(d, id); });
    if (spots.some(function (at) { return !at || !isFree(at.node.style); })) return null;
    var parent = spots[0].parent;
    if (spots.some(function (at) { return at.parent !== parent; })) return null;
    return spots;
  };
  var arrange = function (kind) {
    var ids = selRef.current.slice();
    var spots = arrangeable(ids);
    var f = api();
    if (!spots || !f || !f.rect || !f.measure) return false;
    var unit = f.measure(["var(--dt-space-inset-2xs)"])[0] || 4;
    var items = spots.map(function (at) { var r = f.rect(at.node.id); return r ? { id: at.node.id, l: r.left, t: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom } : null; }).filter(Boolean);
    if (!items.length) return false;
    /* One object lines up with its parent; several, with each other. */
    var box;
    if (items.length === 1) { var pr = f.rect(spots[0].parent.id); if (!pr) return false; box = { l: pr.left, t: pr.top, r: pr.right, b: pr.bottom }; }
    else box = { l: Math.min.apply(null, items.map(function (i) { return i.l; })), t: Math.min.apply(null, items.map(function (i) { return i.t; })), r: Math.max.apply(null, items.map(function (i) { return i.r; })), b: Math.max.apply(null, items.map(function (i) { return i.b; })) };
    var moves = {};
    var put = function (i, l, t) { moves[i.id] = { dx: Math.round((l - i.l) / unit), dy: Math.round((t - i.t) / unit) }; };
    var spread = function (axis) {
      if (items.length < 3) return;
      var a = axis === "x" ? ["l", "w", "r"] : ["t", "h", "b"];
      var sorted = items.slice().sort(function (p, q) { return p[a[0]] - q[a[0]]; });
      var first = sorted[0], last = sorted[sorted.length - 1];
      var span = last[a[2]] - first[a[0]], sum = sorted.reduce(function (n, i) { return n + i[a[1]]; }, 0);
      var gap = (span - sum) / (sorted.length - 1), at = first[a[0]];
      sorted.forEach(function (i) { if (axis === "x") put(i, at, i.t); else put(i, i.l, at); at += i[a[1]] + gap; });
    };
    if (kind === "left") items.forEach(function (i) { put(i, box.l, i.t); });
    else if (kind === "hcenter") items.forEach(function (i) { put(i, (box.l + box.r) / 2 - i.w / 2, i.t); });
    else if (kind === "right") items.forEach(function (i) { put(i, box.r - i.w, i.t); });
    else if (kind === "top") items.forEach(function (i) { put(i, i.l, box.t); });
    else if (kind === "vcenter") items.forEach(function (i) { put(i, i.l, (box.t + box.b) / 2 - i.h / 2); });
    else if (kind === "bottom") items.forEach(function (i) { put(i, i.l, box.b - i.h); });
    else if (kind === "hspread") spread("x");
    else if (kind === "vspread") spread("y");
    else if (kind === "tidy") {
      /* Even gaps along the longer run, and centred across it. */
      var wideRun = box.r - box.l >= box.b - box.t;
      spread(wideRun ? "x" : "y");
      items.forEach(function (i) {
        var m = moves[i.id] || { dx: 0, dy: 0 };
        if (wideRun) m.dy = Math.round(((box.t + box.b) / 2 - i.h / 2 - i.t) / unit); else m.dx = Math.round(((box.l + box.r) / 2 - i.w / 2 - i.l) / unit);
        moves[i.id] = m;
      });
    }
    var LABEL = { left: "Aligned left", hcenter: "Centred", right: "Aligned right", top: "Aligned top", vcenter: "Centred", bottom: "Aligned bottom", hspread: "Spread evenly across", vspread: "Spread evenly down", tidy: "Tidied up" };
    var moved = change(function (d) {
      var any = null;
      Object.keys(moves).forEach(function (id) { var m = moves[id]; if ((m.dx || m.dy) && ops.shift(d, id, m.dx, m.dy)) any = id; });
      return any ? ids : null;
    }, LABEL[kind]);
    if (moved) select(ids);
    return true;
  };
  var ARRANGE = [
    ["left", "Align left", "alignStart", "Alt+A"], ["hcenter", "Align centres", "alignCenter", "Alt+H"], ["right", "Align right", "alignEnd", "Alt+D"],
    ["top", "Align top", "alignTop", "Alt+W"], ["vcenter", "Align middles", "alignMiddle", "Alt+V"], ["bottom", "Align bottom", "alignBottom", "Alt+S"],
    ["hspread", "Spread evenly across", "distributeH", "Shift+Alt+H"], ["vspread", "Spread evenly down", "distributeV", "Shift+Alt+V"], ["tidy", "Tidy up", "tidy", "Shift+Alt+T"],
  ];
  var arrangeRow = function (nodes) {
    var spots = arrangeable(nodes.map(function (n) { return n.id; }));
    if (!spots) return null;
    var few = nodes.length < 3;
    return e("div", { key: "arrange", className: "bd-arrange", role: "group", "aria-label": "Align and distribute" },
      ARRANGE.map(function (a) {
        var off = few && (a[0] === "hspread" || a[0] === "vspread" || a[0] === "tidy");
        return e("button", { key: a[0], type: "button", className: "bd-act bd-act-sm bd-arrange-btn", "aria-label": a[1], title: a[1] + (off ? " (three or more)" : " (" + a[3] + ")"), disabled: off || undefined, onClick: function () { arrange(a[0]); } }, e(Icon, { name: a[2] }));
      }).concat(nodes.length > 1 && nodes.every(function (n) { return n.type === "Shape" && n.props.shape !== "line"; }) ? [e(Dropdown, { key: "bool", menu: true, label: "Combine shapes", icon: "boolUnion", iconOnly: true, compact: true, className: "bd-dd-icon bd-bool-dd",
        options: DATA.tokens.bool.options.map(function (o) { return { value: o.value, label: o.label, icon: BOOL_ICON[o.value] }; }),
        onChange: function (v) { combineShapes(v); } })] : []).concat(nodes.length > 1 ? [e(Dropdown, { key: "gap", menu: true, label: "Spread with a gap", icon: "distributeH", iconOnly: true, compact: true, className: "bd-dd-icon bd-gap-dd",
        options: ["x", "y"].reduce(function (list, axis) {
          return list.concat(DATA.tokens.padding.options.filter(function (o) { return /^--dt-space-inset-/.test(o.tokens[0] || "") && o.tokens.length === 1; }).map(function (o) {
            var px = pxMap["padding|" + o.value];
            return { value: axis + ":" + o.value, label: o.value, px: px != null ? Math.round(px) : null, hint: o.tokens[0], group: axis === "x" ? "Gap across" : "Gap down" };
          }));
        }, []),
        onChange: function (v) { var m = /^([xy]):(.+)$/.exec(v); if (m) spreadBy(m[1], m[2]); } })] : []).concat([e(Dropdown, { key: "scale", menu: true, label: "Scale", icon: "fit", iconOnly: true, compact: true, className: "bd-dd-icon bd-scale-dd",
        options: SCALE_STEPS.map(function (p) { return { value: String(p), label: p + "%", hint: p < 100 ? "Smaller" : "Larger" }; }),
        onChange: function (v) { scaleBy(Number(v) / 100); } })]).concat([["flipH", "Flip across", "Shift+H"], ["flipV", "Flip down", "Shift+V"]].map(function (f) {
        var on = nodes.every(function (n) { return n.style[f[0]]; });
        return e("button", { key: f[0], type: "button", className: "bd-act bd-act-sm bd-flip-btn", "aria-label": f[1], "aria-pressed": String(on), title: f[1] + " (" + f[2] + ")", onClick: function () { flip(f[0]); } }, e(Icon, { name: f[0] }));
      })));
  };
  /* Free layers scaled together about their top left: their places and
     own sizes by the factor, and inside them every free layer's place and
     size. Spacing steps and type sizes go to the nearest token, since a
     raw size would leave the system. */
  var SCALE_STEPS = [50, 75, 125, 150, 200];
  var SCALE_TYPE = {
    Heading: { prop: "size", styles: { "heading-xs": "heading-xs", "heading-sm": "heading-sm", "heading-md": "heading-md", "heading-lg": "heading-lg", "heading-xl": "heading-xl", "display-sm": "display-sm", "display-md": "display-md", "display-lg": "display-lg" } },
    Text: { prop: "variant", styles: { fine: "body-xs", small: "body-sm", body: "body-md", lead: "body-lg" } },
  };
  var scaleBy = function (factor) {
    var ids = selRef.current.slice();
    var spots = arrangeable(ids);
    var f = api();
    if (!spots || !f || !f.rect || !f.measure || !(factor > 0)) return false;
    var unit = f.measure(["var(--dt-space-inset-2xs)"])[0] || 4;
    var rects = {};
    spots.forEach(function (at) { rects[at.node.id] = f.rect(at.node.id); });
    /* Each type size in pixels, to find the nearest one scaled. */
    var typePx = {};
    Object.keys(SCALE_TYPE).forEach(function (t) {
      var sc = SCALE_TYPE[t], names = Object.keys(sc.styles);
      var got = f.measure(names.map(function (v) { return "var(--dt-text-" + sc.styles[v] + "-size)"; }));
      typePx[t] = names.map(function (v, i) { return { value: v, px: got[i] }; }).filter(function (o) { return o.px > 0; });
    });
    var nearest = function (list, want) {
      var best = null;
      list.forEach(function (o) { if (!best || Math.abs(o.px - want) < Math.abs(best.px - want)) best = o; });
      return best;
    };
    var clamp = function (v, lo) { return Math.max(lo, Math.min(FREE_MAX, Math.round(v))); };
    var SPACE_KEYS = Object.keys(DATA.tokens).filter(function (k) { return DATA.tokens[k].section === "spacing"; });
    var inner = function (n) {
      SPACE_KEYS.forEach(function (k) {
        var v = n.style[k], px = v ? pxMap[k + "|" + v] : null;
        if (px == null) return;
        var opt = tokenOption(k, v);
        var list = DATA.tokens[k].options.filter(function (o) { return pxMap[k + "|" + o.value] != null && (!opt || o.family === opt.family); })
          .map(function (o) { return { value: o.value, px: pxMap[k + "|" + o.value] }; });
        var pick = nearest(list, px * factor);
        if (pick) n.style[k] = pick.value;
      });
      var sc = SCALE_TYPE[n.type];
      if (sc && typePx[n.type].length) {
        var base = scalars[n.type] || {};
        var cur = n.props[sc.prop] || base[sc.prop] || (n.type === "Heading" ? HEADING_DEFAULT[n.props.level || base.level || 2] : "body");
        var now = typePx[n.type].filter(function (o) { return o.value === cur; })[0];
        var to = now ? nearest(typePx[n.type], now.px * factor) : null;
        if (to) n.props[sc.prop] = to.value;
      }
      (n.children || []).forEach(function (c) {
        if (isFree(c.style)) {
          c.style.x = clamp(c.style.x * factor, 0); c.style.y = clamp(c.style.y * factor, 0);
          if (c.style.fw) c.style.fw = clamp(c.style.fw * factor, 1);
          if (c.style.fh) c.style.fh = clamp(c.style.fh * factor, 1);
        }
        inner(c);
      });
    };
    var ox = Math.min.apply(null, spots.map(function (at) { return at.node.style.x; }));
    var oy = Math.min.apply(null, spots.map(function (at) { return at.node.style.y; }));
    var pct = Math.round(factor * 100) + "%";
    var moved = change(function (d) {
      var any = null;
      spots.forEach(function (at0) {
        var at = locate(d, at0.node.id);
        if (!at || at.node.lock) return;
        var st = at.node.style, r = rects[at0.node.id];
        st.x = clamp(ox + (st.x - ox) * factor, 0); st.y = clamp(oy + (st.y - oy) * factor, 0);
        /* A shape always has a size; anything else keeps sizing itself
           unless it has a size of its own. */
        var sized = at.node.type === "Shape";
        if (st.fw || (sized && r)) st.fw = clamp((st.fw || r.width / unit) * factor, 1);
        if (st.fh || (sized && r)) st.fh = clamp((st.fh || r.height / unit) * factor, 1);
        inner(at.node);
        any = at.node.id;
      });
      return any ? ids : null;
    }, "Scaled to " + pct);
    if (moved) { select(ids); announce("Scaled to " + pct + "; spacing and type moved to the nearest tokens"); }
    return true;
  };
  /* Free layers set a spacing token apart, across or down, in the order
     they stand, from the first one. */
  var spreadBy = function (axis, step) {
    var ids = selRef.current.slice();
    var spots = arrangeable(ids);
    var f = api();
    if (!spots || spots.length < 2 || !f || !f.rect || !f.measure) return false;
    var unit = f.measure(["var(--dt-space-inset-2xs)"])[0] || 4;
    var gap = f.measure(["var(--dt-space-inset-" + step + ")"])[0];
    if (!gap && gap !== 0) return false;
    var items = spots.map(function (at) { var r = f.rect(at.node.id); return r ? { id: at.node.id, start: axis === "x" ? r.left : r.top, size: axis === "x" ? r.width : r.height } : null; }).filter(Boolean)
      .sort(function (p, q) { return p.start - q.start; });
    var at = items[0].start, moves = {};
    items.forEach(function (i) { moves[i.id] = Math.round((at - i.start) / unit); at += i.size + gap; });
    var moved = change(function (d) {
      var any = null;
      Object.keys(moves).forEach(function (id) { if (moves[id] && ops.shift(d, id, axis === "x" ? moves[id] : 0, axis === "y" ? moves[id] : 0)) any = id; });
      return any ? ids : null;
    }, "Spread " + (axis === "x" ? "across" : "down") + " with a gap of " + step);
    if (moved) select(ids);
    return true;
  };
  /* Free rectangles and ellipses made one shape, by union, subtract,
     intersect or exclude. A shape with no size of its own takes its drawn
     size first. */
  var BOOL_ICON = { union: "boolUnion", subtract: "boolSubtract", intersect: "boolIntersect", exclude: "boolExclude" };
  var combineShapes = function (op) {
    var ids = selRef.current.slice(), a = api(), unit = pxMap["padding|2xs"] || 4, made = null;
    change(function (dd) {
      ids.forEach(function (id) {
        var at = locate(dd, id);
        if (!at || at.node.type !== "Shape" || (at.node.style.fw && at.node.style.fh)) return;
        var r = a && a.rect ? a.rect(id) : null;
        if (r) { at.node.style.fw = at.node.style.fw || Math.max(1, Math.round(r.width / unit)); at.node.style.fh = at.node.style.fh || Math.max(1, Math.round(r.height / unit)); }
      });
      made = ops.combine(dd, ids, op);
      return made ? [made] : null;
    }, "Combined: " + op);
    if (made) select([made]); else announce("Combine takes two or more free rectangles or ellipses side by side");
    return !!made;
  };
  /* Mirrors free layers across or down; pressed again, back. */
  var flip = function (key) {
    var spots = arrangeable(selRef.current.slice());
    if (!spots) return false;
    var on = spots.every(function (at) { return at.node.style[key]; });
    var patch = {};
    patch[key] = on ? undefined : true;
    setStyles(spots.map(function (at) { return at.node.id; }), patch);
    announce((on ? "Unflipped " : "Flipped ") + (key === "flipH" ? "across" : "down"));
    return true;
  };

  /* Copy style takes one layer's look (its tokens and custom colours, not
     where it sits); paste style puts that look on the selection, replacing
     what was there. */
  var styleClip = useRef(null);
  var POSITION_KEYS = ["x", "y", "ch", "cv", "position", "anchor", "offset"];
  var copyStyle = function () {
    var at = selRef.current.length ? locate(docRef.current, selRef.current[selRef.current.length - 1]) : null;
    if (!at) return false;
    var out = {};
    Object.keys(at.node.style).forEach(function (k) { if (POSITION_KEYS.indexOf(k) < 0) out[k] = at.node.style[k]; });
    styleClip.current = out;
    var n = Object.keys(out).length;
    announce(n ? "Copied the style of " + nameOf(at.node) + " (" + n + (n === 1 ? " property)" : " properties)") : "Copied a plain style");
    return true;
  };
  var pasteStyle = function () {
    var clipStyle = styleClip.current;
    if (!clipStyle || !selRef.current.length) return false;
    var patch = {};
    /* A free layer's own size, turn and opacity come along too. */
    Object.keys(DATA.tokens).concat(["fill", "color", "dark", "alpha", "fw", "fh", "rw", "rh", "rot", "flipH", "flipV"]).forEach(function (k) { if (POSITION_KEYS.indexOf(k) < 0) patch[k] = clipStyle[k]; });
    setStyles(selRef.current, patch);
    announce("Pasted the style");
    return true;
  };
  /* Every layer in the frame of the same kind as the selected one. */
  var selectSame = function () {
    var at = selRef.current.length ? locate(docRef.current, selRef.current[selRef.current.length - 1]) : null;
    if (!at) return;
    var type = at.node.type, ids = [];
    (function walk(n) { (n.children || []).forEach(function (c) { if (c.type === type) ids.push(c.id); walk(c); }); })(active(docRef.current).root);
    select(ids);
    announce(ids.length + " " + type + (ids.length === 1 ? "" : "s") + " selected");
  };

  /* What the right-click menu offers, for these layers (or none: the frame). */
  var menuOptions = function (ids) {
    var d = docRef.current;
    var spots = ids.map(function (id) { return locate(d, id); }).filter(Boolean);
    var nodes = spots.map(function (at) { return at.node; });
    var one = nodes.length === 1 ? nodes[0] : null;
    var hasClip = !!(clip.current && clip.current.nodes && clip.current.nodes.length);
    if (!nodes.length) {
      return [
        { value: "paste", label: "Paste", hint: "Ctrl+V", icon: "copy", group: "Edit", disabled: !hasClip },
        { value: "selectAll", label: "Select all", hint: "Ctrl+A", icon: "layers2", group: "Edit" },
        { value: "fitAll", label: "Zoom to fit", hint: "Shift+1", icon: "fit", group: "View" },
        { value: "fitFrame", label: "Zoom to " + active(d).name, hint: "Shift+2", icon: "frame", group: "View" },
      ];
    }
    var allHidden = nodes.every(function (n) { return n.hide; }), allLocked = nodes.every(function (n) { return n.lock; });
    var free = spots.every(function (at) { return isFree(at.node.style); });
    return [
      { value: "cut", label: "Cut", hint: "Ctrl+X", icon: "scissors", group: "Edit" },
      { value: "copy", label: "Copy", hint: "Ctrl+C", icon: "copy", group: "Edit" },
      { value: "paste", label: "Paste", hint: "Ctrl+V", icon: "copy", group: "Edit", disabled: !hasClip },
      { value: "duplicate", label: "Duplicate", hint: "Ctrl+D", icon: "copy", group: "Edit" },
      { value: "copyStyle", label: "Copy style", hint: "Ctrl+Alt+C", icon: "swatch", group: "Edit" },
      { value: "pasteStyle", label: "Paste style", hint: "Ctrl+Alt+V", icon: "swatch", group: "Edit", disabled: !styleClip.current },
      { value: "same", label: "Select all " + (one ? one.type + (one.type.endsWith("s") ? "" : "s") : "of this kind"), icon: "layers2", group: "Edit" },
      { value: "remove", label: "Delete", hint: "Del", icon: "trash", group: "Edit", danger: true },
      { value: "front", label: "Bring to front", hint: "Ctrl+Shift+]", icon: "up", group: "Arrange" },
      { value: "up", label: "Bring forward", hint: "Ctrl+]", icon: "up", group: "Arrange" },
      { value: "down", label: "Send backward", hint: "Ctrl+[", icon: "down", group: "Arrange" },
      { value: "back", label: "Send to back", hint: "Ctrl+Shift+[", icon: "down", group: "Arrange" },
    ].concat(free && nodes.length > 1 ? [{ value: "tidy", label: "Tidy up", hint: "Shift+Alt+T", icon: "tidy", group: "Arrange" }] : [])
    .concat([
      one && one.type === "Group" ? { value: "ungroup", label: "Ungroup", hint: "Ctrl+Shift+G", icon: "group", group: "Layer" } : { value: "group", label: "Group", hint: "Ctrl+G", icon: "group", group: "Layer" },
      { value: "hide", label: allHidden ? "Show" : "Hide", hint: "Ctrl+Shift+H", icon: allHidden ? "eye" : "eyeOff", group: "Layer" },
      { value: "lock", label: allLocked ? "Unlock" : "Lock", hint: "Ctrl+Shift+L", icon: allLocked ? "lockOpen" : "lock", group: "Layer" },
    ])
    .concat(free && one && one.type === "Group" && !one.style.bool && (one.children || []).length ? [(one.children || []).every(function (c) { return isFree(c.style); })
      ? { value: "autolayout", label: "Use auto layout", hint: "Shift+A", icon: "row", group: "Layer" }
      : { value: "freelayout", label: "Free positions", hint: "Shift+A", icon: "frame", group: "Layer" }] : [])
    .concat(free && nodes.length > 1 && nodes.some(function (n) { return n.type === "Shape" && n.props.shape !== "line"; }) ? [{ value: "mask", label: "Use the shape as a mask", icon: "shapeEllipse", group: "Layer" }] : [])
    .concat(one && one.type !== "Slot" ? [{ value: "rename", label: "Rename", hint: "F2", icon: "pencil", group: "Layer" }] : [])
    .concat([{ value: "component", label: "Create component", hint: "Ctrl+Alt+K", icon: "component", group: "Layer" }])
    .concat(one ? [{ value: "link", label: "Copy link to this layer", icon: "link", group: "Layer" }, { value: "png", label: "Export as PNG", icon: "image", group: "Layer" }] : []);
  };
  var onMenu = function (v) {
    if (v === "cut") copySelection(true);
    else if (v === "copy") copySelection(false);
    else if (v === "paste") { if (clip.current) pasteNodes(clip.current.nodes); }
    else if (v === "duplicate") actions.duplicate();
    else if (v === "copyStyle") copyStyle();
    else if (v === "pasteStyle") pasteStyle();
    else if (v === "same") selectSame();
    else if (v === "remove") actions.remove();
    else if (v === "front" || v === "back" || v === "up" || v === "down") actions.order(v);
    else if (v === "tidy") arrange("tidy");
    else if (v === "group") actions.group();
    else if (v === "ungroup") actions.ungroup();
    else if (v === "mask") actions.mask();
    else if (v === "autolayout") actions.autoLayout();
    else if (v === "freelayout") actions.freeLayout();
    else if (v === "hide") actions.hide();
    else if (v === "lock") actions.lock();
    else if (v === "rename") actions.rename();
    else if (v === "component") openComponent();
    else if (v === "link") share(selRef.current[0]);
    else if (v === "png") exportImage(docRef.current.active, "png", { scale: exportScale, id: selRef.current[0] });
    else if (v === "selectAll") actions.selectAll();
    else if (v === "fitAll") fitAll();
    else if (v === "fitFrame") showFrame(docRef.current.active);
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
    /* Z-order among siblings: up and down one, or to the front and back.
       Later siblings draw on top, so "front" is last. */
    order: function (where) {
      var ids = selRef.current.slice();
      if (!ids.length) return;
      var step = where === "up" ? 1 : where === "down" ? -1 : 0;
      var ordered = ids.map(function (id) { return locate(docRef.current, id); }).filter(Boolean).sort(function (a, b) { return a.index - b.index; }).map(function (a) { return a.node.id; });
      /* Moving forward, the last one goes first so siblings don't collide. */
      if (step > 0 || where === "front") ordered.reverse();
      var moved = change(function (d) {
        var any = null;
        ordered.forEach(function (id) { if (step ? ops.nudge(d, id, step) : ops.order(d, id, where)) any = id; });
        return any ? ids : null;
      }, where === "front" ? "Brought to the front" : where === "back" ? "Sent to the back" : where === "up" ? "Brought forward" : "Sent backward");
      if (moved) select(ids);
    },
    /* Free objects move by whole steps; nothing else takes the arrows. */
    nudge: function (dx, dy) {
      var ids = selRef.current.slice();
      if (!ids.length || (!dx && !dy)) return false;
      var d = docRef.current;
      if (!ids.some(function (id) { var at = locate(d, id); return at && isFree(at.node.style); })) return false;
      return !!change(function (dd) {
        var any = null;
        ids.forEach(function (id) { if (ops.shift(dd, id, dx, dy)) any = id; });
        return any ? ids : null;
      });
    },
    /* Locked: left alone on the canvas (it still answers in Layers).
       Hidden: not drawn and not exported. Each toggles the selection. */
    lock: function () {
      var ids = selRef.current.slice();
      if (!ids.length) return;
      var d = docRef.current, on = ids.some(function (id) { var at = locate(d, id); return at && !at.node.lock; });
      change(function (dd) { var any = false; ids.forEach(function (id) { var at = locate(dd, id); if (!at || at.node.type === "Slot") return; any = true; if (on) at.node.lock = true; else delete at.node.lock; }); return any ? ids : null; }, on ? (ids.length > 1 ? "Locked " + ids.length : "Locked") : (ids.length > 1 ? "Unlocked " + ids.length : "Unlocked"));
    },
    hide: function () {
      var ids = selRef.current.slice();
      if (!ids.length) return;
      var d = docRef.current, on = ids.some(function (id) { var at = locate(d, id); return at && !at.node.hide; });
      change(function (dd) { var any = false; ids.forEach(function (id) { var at = locate(dd, id); if (!at || at.node.type === "Slot") return; any = true; if (on) at.node.hide = true; else delete at.node.hide; }); return any ? ids : null; }, on ? (ids.length > 1 ? "Hidden " + ids.length : "Hidden") : (ids.length > 1 ? "Shown " + ids.length : "Shown"));
    },
    /* Everything at the top of the active frame. */
    selectAll: function () {
      var f = active(docRef.current);
      var ids = f.root.children.map(function (c) { return c.id; });
      if (!ids.length) return;
      select(ids);
      announce(ids.length === 1 ? "1 selected" : ids.length + " selected");
    },
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
    /* A free group's free children laid out in a row or a column, in the
     order they stand: the direction from how they spread, the gap and the
     padding the nearest tokens to what they had. The group keeps its own
     place and hugs what it holds. */
    autoLayout: function () {
      var id = selRef.current[0], d = docRef.current, at = selRef.current.length === 1 ? locate(d, id) : null, a = api();
      if (!at || at.node.type !== "Group" || at.node.style.bool || !isFree(at.node.style) || !a || !a.rect || !a.measure) return false;
      var kids = at.node.children || [];
      if (!kids.length || !kids.every(function (c) { return isFree(c.style); })) return false;
      var gr = a.rect(id);
      var items = kids.map(function (c) { return { id: c.id, r: a.rect(c.id) }; }).filter(function (i) { return i.r; });
      if (!gr || items.length !== kids.length) return false;
      var spanX = Math.max.apply(null, items.map(function (i) { return i.r.right; })) - Math.min.apply(null, items.map(function (i) { return i.r.left; }));
      var spanY = Math.max.apply(null, items.map(function (i) { return i.r.bottom; })) - Math.min.apply(null, items.map(function (i) { return i.r.top; }));
      var row = spanX >= spanY;
      items.sort(function (p, q) { return row ? p.r.left - q.r.left : p.r.top - q.r.top; });
      var gaps = [];
      for (var i = 1; i < items.length; i++) gaps.push(row ? items[i].r.left - items[i - 1].r.right : items[i].r.top - items[i - 1].r.bottom);
      var want = gaps.length ? Math.max(0, gaps.reduce(function (n, g) { return n + g; }, 0) / gaps.length) : 0;
      var steps = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];
      var got = a.measure(steps.map(function (s2) { return "var(--dt-space-" + (row ? "inline" : "stack") + "-" + s2 + ")"; }));
      var gap = "none", best = want;
      steps.forEach(function (s2, j) { if (got[j] != null && Math.abs(got[j] - want) < best) { best = Math.abs(got[j] - want); gap = s2; } });
      var inset = Math.max(0, Math.min(Math.min.apply(null, items.map(function (it) { return it.r.left - gr.left; })), Math.min.apply(null, items.map(function (it) { return it.r.top - gr.top; }))));
      var pad = null, pbest = inset;
      steps.forEach(function (s2) { var px = pxMap["padding|" + s2]; if (px != null && Math.abs(px - inset) < pbest) { pbest = Math.abs(px - inset); pad = s2; } });
      var order = items.map(function (it) { return it.id; });
      change(function (dd) {
        var g = locate(dd, id);
        if (!g) return null;
        var byId = {};
        g.node.children.forEach(function (c) { byId[c.id] = c; });
        g.node.children = order.map(function (k) { return byId[k]; });
        g.node.children.forEach(function (c) {
          ["x", "y", "ch", "cv", "rot", "flipH", "flipV"].concat(c.type === "Shape" || c.type === "Image" ? [] : ["fw", "fh"]).forEach(function (k) { delete c.style[k]; });
        });
        g.node.props.direction = row ? "row" : "column";
        g.node.props.gap = gap;
        g.node.props.align = "flex-start";
        delete g.node.style.fw; delete g.node.style.fh;
        if (pad) g.node.style.padding = pad; else delete g.node.style.padding;
        return [id];
      }, "Auto layout: a " + (row ? "row" : "column") + ", gap " + gap);
      return true;
    },
    /* Back to free: each child pinned where the layout put it, and the
       group the size it was drawn at. */
    freeLayout: function () {
      var id = selRef.current[0], d = docRef.current, at = selRef.current.length === 1 ? locate(d, id) : null, a = api();
      if (!at || at.node.type !== "Group" || at.node.style.bool || !isFree(at.node.style) || !a || !a.rect) return false;
      var kids = at.node.children || [];
      if (!kids.length || kids.some(function (c) { return isFree(c.style); })) return false;
      var unit = pxMap["padding|2xs"] || 4, gr = a.rect(id);
      var boxes = {};
      kids.forEach(function (c) { boxes[c.id] = a.rect(c.id); });
      if (!gr || kids.some(function (c) { return !boxes[c.id]; })) return false;
      var st = function (px) { return Math.max(0, Math.min(FREE_MAX, Math.round(px / unit))); };
      change(function (dd) {
        var g = locate(dd, id);
        if (!g) return null;
        g.node.style.fw = Math.max(1, st(gr.width)); g.node.style.fh = Math.max(1, st(gr.height));
        g.node.children.forEach(function (c) {
          var r = boxes[c.id];
          c.style.x = st(r.left - gr.left); c.style.y = st(r.top - gr.top);
          /* Shapes and pictures keep their size; text and components size
             themselves as before. */
          if (c.type === "Shape" || c.type === "Image") { c.style.fw = Math.max(1, st(r.width)); c.style.fh = Math.max(1, st(r.height)); }
        });
        return [id];
      }, "Free positions");
      return true;
    },
    mask: function () {
      var ids = selRef.current.slice();
      var d = docRef.current, a = api(), unit = pxMap["padding|2xs"] || 4;
      /* A shape with no size of its own takes its drawn size first. */
      var sized = function (dd) {
        ids.forEach(function (id) {
          var at = locate(dd, id);
          if (!at || at.node.type !== "Shape" || (at.node.style.fw && at.node.style.fh)) return;
          var r = a && a.rect ? a.rect(id) : null;
          if (r) { at.node.style.fw = at.node.style.fw || Math.max(1, Math.round(r.width / unit)); at.node.style.fh = at.node.style.fh || Math.max(1, Math.round(r.height / unit)); }
        });
      };
      var made = null;
      change(function (dd) { sized(dd); made = ops.mask(dd, ids); return made ? [made] : null; }, "Masked with a shape");
      if (made) select([made]); else announce("A mask needs free layers side by side, one of them a rectangle or an ellipse");
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
      if (id) { var at = locate(docRef.current, id); if (at && at.node.type !== "Slot") setRenaming({ id: id, where: where }); }
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
    if (ev.key === "Meta" || ev.key === "Control") snapOffRef.current = true;
    /* The Account dialog opens over Home too, and Escape is its own. */
    if (accountRef.current && accountRef.current.open) return false;
    if (homeRef.current) {
      /* Escape: out of a project, then back to the canvas. / finds. */
      if (ev.key === "Escape") { if (homeViewRef.current) goHomeView(null); else closeProjects(); return true; }
      if (ev.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) && !ev.target.isContentEditable) {
        var find = document.querySelector(".bd-home-search input");
        if (find) { find.focus(); return true; }
      }
      return false;
    }
    if ((dialogRef.current && dialogRef.current.open) || (importRef.current && importRef.current.open) || (versionsRef.current && versionsRef.current.open) || (keysRef.current && keysRef.current.open) || (playRef.current && playRef.current.open) || (compRef.current && compRef.current.open)) return false;
    var t = ev.target;
    var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if ((ev.key === "Shift" || ev.key === "Alt") && !ev.repeat) { measureKeys.current[ev.key] = true; setShiftHeld(true); }
    if (typing || (t && t.closest && t.closest(".bd-dd-list"))) return false;
    var free = !t || t === document.body || t === document.documentElement || t.ownerDocument !== document || (t.classList && t.classList.contains("bd-stage"));
    var mod = ev.metaKey || ev.ctrlKey;
    var key = ev.key.toLowerCase();
    if (ev.key === "Escape" && previewRef.current) { actions.preview(); return true; }
    if (ev.key === "Tab" && free && !mod && !ev.altKey && !ev.shiftKey && wide) { actions.panels(); return true; }
    if (mod && ev.key === "\\") { actions.panels(); return true; }
    if (ev.key === " " && free && !mod) { if (!spaceRef.current) { spaceRef.current = true; setSpace(true); } return true; }
    if (previewRef.current) return false;
    if (ev.key === "?" && !ev.altKey) { openKeys(); return true; }
    if (ev.key === "Escape" && marqRef.current) { marqueeEnd(false); return true; }
    if (ev.key === "ContextMenu" || (ev.key === "F10" && ev.shiftKey)) { menuAtSelection(); return true; }
    if (ev.key === "Escape" && tray) { setTray(null); return true; }
    if (ev.key === "Escape" && tool !== "select") { setTool("select"); return true; }
    if (!mod && !ev.altKey && !ev.shiftKey && TOOL_KEY[key]) { pickToolRef.current(TOOL_INFO[TOOL_KEY[key]]); return true; }
    if (mod && key === "z") { (ev.shiftKey ? redo : undo)(); return true; }
    if (mod && key === "y") { redo(); return true; }
    if (mod && (ev.key === "=" || ev.key === "+")) { zoomStep(1); return true; }
    if (mod && ev.key === "-") { zoomStep(-1); return true; }
    if (mod && ev.key === "0") { fitAll(); return true; }
    if (ev.shiftKey && !mod && !ev.altKey && (ev.code === "KeyH" || ev.code === "KeyV") && flip(ev.code === "KeyH" ? "flipH" : "flipV")) return true;
    if (ev.shiftKey && !mod && !ev.altKey && ev.code === "KeyA" && (actions.autoLayout() || actions.freeLayout())) return true;
    if (ev.shiftKey && !mod && !ev.altKey && ev.code === "KeyR") { toggleView("rulers"); return true; }
    if (ev.shiftKey && !mod && !ev.altKey && ev.code === "KeyG") { toggleView("columns"); return true; }
    if (ev.shiftKey && !mod && ev.code === "Digit0") { zoomTo(1); return true; }
    if (ev.shiftKey && !mod && ev.code === "Digit1") { fitAll(); return true; }
    if (ev.shiftKey && !mod && ev.code === "Digit2") { if (!showSelection()) showFrame(docRef.current.active); return true; }
    if (mod && key === "a" && !ev.shiftKey && !ev.altKey) { actions.selectAll(); return true; }
    if (ev.key === "Enter") { (ev.shiftKey ? actions.out : actions.into)(); return true; }
    if (ev.key === "Escape") { if (!selRef.current.length) setFrameOn(false); select([]); return true; }
    /* Paste: the paste event brings what the system clipboard holds, in this
       page or (passed on) in a frame. */
    /* Copy and paste style come before the plain copy and paste. */
    if (mod && ev.altKey && ev.code === "KeyC") { copyStyle(); return true; }
    if (mod && ev.altKey && ev.code === "KeyV") { pasteStyle(); return true; }
    if (mod && key === "v" && !ev.shiftKey && !ev.altKey) return false;
    if (ev.key === "F2") { actions.rename(); return true; }
    if (!selRef.current.length) return false;
    if (mod && key === "g") { (ev.shiftKey ? actions.ungroup : actions.group)(); return true; }
    if (mod && ev.altKey && (key === "k" || ev.code === "KeyK")) { openComponent(); return true; }
    if (mod && (key === "c" || key === "x") && !ev.shiftKey) { copySelection(key === "x"); return true; }
    if (ev.shiftKey && !mod && !ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && stepType(ev.key === "ArrowUp" ? 1 : -1)) return true;
    if (ev.key === "Delete" || ev.key === "Backspace") { actions.remove(); return true; }
    if (mod && key === "d") { actions.duplicate(); return true; }
    /* 1 to 9 step the opacity through its roles; 0 is opaque. */
    if (!mod && !ev.altKey && !ev.shiftKey && /^Digit[0-9]$/.test(ev.code)) {
      var digit = Number(ev.code.slice(5));
      /* A free frame takes any percent: 1 is 10%, 9 is 90%. */
      if (active(docRef.current).mode !== "structured") {
        setAlpha(selRef.current.slice(), digit === 0 ? 100 : digit * 10);
        announce(digit === 0 ? "Opaque" : "Opacity " + digit * 10 + "%");
        return true;
      }
      var role = digit === 0 ? undefined : digit <= 2 ? "ghost" : digit <= 5 ? "disabled" : digit <= 7 ? "muted" : "strong";
      setStyle(selRef.current, "opacity", role);
      announce(role ? "Opacity " + role : "Opaque");
      return true;
    }
    if (mod && ev.shiftKey && (key === "h" || ev.code === "KeyH")) { actions.hide(); return true; }
    if (mod && ev.shiftKey && (key === "l" || ev.code === "KeyL")) { actions.lock(); return true; }
    if ((ev.altKey || mod) && ev.key === "ArrowUp") { actions.up(); return true; }
    if ((ev.altKey || mod) && ev.key === "ArrowDown") { actions.down(); return true; }
    /* Align and distribute: Alt and a letter. */
    if (ev.altKey && !mod) {
      var ARRANGE_KEY = ev.shiftKey ? { KeyH: "hspread", KeyV: "vspread", KeyT: "tidy" } : { KeyA: "left", KeyH: "hcenter", KeyD: "right", KeyW: "top", KeyV: "vcenter", KeyS: "bottom" };
      if (ARRANGE_KEY[ev.code] && arrange(ARRANGE_KEY[ev.code])) return true;
    }
    if (mod && (ev.key === "]" || ev.code === "BracketRight")) { actions.order(ev.shiftKey ? "front" : "up"); return true; }
    if (mod && (ev.key === "[" || ev.code === "BracketLeft")) { actions.order(ev.shiftKey ? "back" : "down"); return true; }
    /* Arrows move free objects a step of --dt-space-inset-2xs; Shift, four. */
    if (!mod && !ev.altKey && /^Arrow(Left|Right|Up|Down)$/.test(ev.key)) {
      var by = ev.shiftKey ? 4 : 1;
      if (actions.nudge(ev.key === "ArrowLeft" ? -by : ev.key === "ArrowRight" ? by : 0, ev.key === "ArrowUp" ? -by : ev.key === "ArrowDown" ? by : 0)) return true;
    }
    return false;
  };
  var keyUpRef = useRef(function () {});
  keyUpRef.current = function (ev) {
    if (ev.key === "Meta" || ev.key === "Control") snapOffRef.current = false;
    if (ev.key === " " && spaceRef.current) { spaceRef.current = false; setSpace(false); }
    if (ev.key === "Shift" || ev.key === "Alt") { delete measureKeys.current[ev.key]; setShiftHeld(!!(measureKeys.current.Shift || measureKeys.current.Alt)); }
  };
  useEffect(function () {
    var onKey = function (ev) {
      /* The toolbar renders into the site header, outside the builder's box. */
      var inside = mountEl.contains(ev.target) || ev.target === document.body || (ev.target.closest && ev.target.closest("#app-toolbar"));
      if (!inside) return;
      if (keyRef.current(ev)) ev.preventDefault();
    };
    var onUp = function (ev) { keyUpRef.current(ev); };
    var onBlur = function () { if (spaceRef.current) { spaceRef.current = false; setSpace(false); } measureKeys.current = {}; setShiftHeld(false); snapOffRef.current = false; };
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

  var setFrame = function (key, value, message) { change(function (d) { var f = active(d); if (value === undefined) delete f[key]; else f[key] = value; return undefined; }, message); };
  /* A frame's auto layout: a patch over what it has; nothing left, none. */
  var setFlow = function (patch, message) {
    change(function (d) {
      var f = active(d);
      var fl = Object.assign({}, f.flow || {}, patch);
      Object.keys(fl).forEach(function (k) { if (fl[k] === undefined) delete fl[k]; });
      if (patch.gap !== undefined || "gap" in patch) delete f.gap;
      if (Object.keys(fl).length) f.flow = fl; else delete f.flow;
      return undefined;
    }, message);
  };
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
  /* A frame that changes size: its free layers keep to their constraints,
     worked from base, the frame as it was before (or, while a size is
     scrubbed, before the scrub began). */
  var sizeBase = useRef(null);
  var keepPins = function (d, fid, base) {
    var f = frameById(d, fid), b = base || frameById(docRef.current, fid), a = api(fid);
    if (!f || !b) return;
    constrain(f, b, pxMap["padding|2xs"] || 4, function (id) { var r = a && a.rect ? a.rect(id) : null; return r ? { width: r.width, height: r.height } : null; });
  };
  var setSize = function (w, h) { change(function (d) { sizeOn(active(d), w, h); keepPins(d, d.active); return undefined; }); };
  /* Scrubbing: the first step is the undo step, the rest follow it. */
  var setSizeLive = function (w, h, first) {
    if (first) { sizeBase.current = active(docRef.current); setSize(w, h); return; }
    quiet(function (d) { sizeOn(active(d), w, h); keepPins(d, d.active, sizeBase.current); });
  };
  /* A free frame's own opacity, in whole percents; 100 is opaque, which
     needs nothing set. It takes the place of an opacity role. */
  var setAlpha = function (ids, v, first) {
    var val = v >= 100 ? undefined : v;
    var apply = function (d) { var any = false; ids.forEach(function (id) { var at = locate(d, id); if (!at) return; any = true; delete at.node.style.opacity; if (val === undefined) delete at.node.style.alpha; else at.node.style.alpha = val; }); return any ? undefined : null; };
    if (first === false) quiet(apply);
    else change(apply, val === undefined ? "Opaque" : "Opacity " + val + "%");
  };
  /* A value shown on the canvas without becoming an edit: hovering a blend
     mode. null puts things back as they were. */
  var previewStyle = function (ids, key, v) {
    var p = stylePreviewRef.current;
    if (v === null) {
      stylePreviewRef.current = null;
      if (p && docRef.current !== p.start) { docRef.current = p.start; setDoc(p.start); }
      return;
    }
    if (!p) p = stylePreviewRef.current = { start: docRef.current };
    docRef.current = p.start;
    if (!quiet(function (d) { ids.forEach(function (id) { var at = locate(d, id); if (!at) return; if (v) at.node.style[key] = v; else delete at.node.style[key]; }); })) setDoc(p.start);
  };
  var scrubStyle = function (ids, key, v, first) {
    if (first) { setStyle(ids, key, v); return; }
    quiet(function (d) { ids.forEach(function (id) { var at = locate(d, id); if (at) at.node.style[key] = v; }); });
  };
  var setPreset = function (id) {
    var p = PRESET[id];
    if (p) change(function (d) { var f = active(d); f.width = p.width; f.height = p.height; if (p.typeScale) f.typeScale = p.typeScale; else delete f.typeScale; keepPins(d, d.active); return undefined; }, frame.name + " is " + p.label + ", " + p.width + " by " + p.height + (p.typeScale ? ", with social type" : ""));
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
  /* The eye and lock on a layer row, on any frame's row. */
  var flagLayer = function (id, fid, key) {
    change(function (d) {
      var at = locate(d, id, fid);
      if (!at) return null;
      if (at.node[key]) delete at.node[key]; else at.node[key] = true;
      return undefined;
    }, null);
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
      (function unfree(n) { if (n.style) { delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv; delete n.style.fill; delete n.style.color; delete n.style.alpha; delete n.style.fw; delete n.style.fh; delete n.style.rot; delete n.style.flipH; delete n.style.flipV; } (n.children || []).forEach(unfree); })(f.root);
      if (loose.length) { var g = make("Group", { direction: "column", gap: "md" }, loose, { padding: "lg" }); kept.push(g); }
      f.root.children = kept;
      if (!f.gap) f.gap = "block";
      autoLayout(f.root);
      return [];
    }, mode === "structured" ? "Structured: everything is in Groups now" : "Freeform: place things anywhere");
    if (mode !== "structured") return;
    /* The auto layout is the point of it: it comes into view, on the one
       Group everything went into when there is one. */
    var f = active(docRef.current);
    var g = f.root.children.length === 1 && f.root.children[0].type === "Group" ? f.root.children[0] : null;
    if (g) { select([g.id]); setFocusSec("flex"); }
    else setFocusSec("frame-auto");
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
      kids.forEach(function (k) { delete k.style.x; delete k.style.y; delete k.style.ch; delete k.style.cv; });
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
    /* opts: a kind (free or structured), a screen size and a name;
       otherwise the active frame's size, or a desktop screen. Returns the
       new frame's id, and its Content group's for a structured one. */
    add: function (size, page, at, opts) {
      opts = opts || {};
      var cur = active(docRef.current);
      var structured = opts.mode === "structured";
      var pid = opts.preset && PRESET[opts.preset] ? opts.preset : !page && !cur.bare ? presetOf(cur) : "";
      var p = (pid && PRESET[pid]) || PRESET.desktop;
      var f = makeFrame(opts.name || "Frame " + (docRef.current.frames.length + 1), pid || "desktop", !!page || structured);
      f.width = size ? side(size.width, MAX_WIDTH, p.width) : p.width;
      f.height = size ? side(size.height, MAX_HEIGHT, p.height) : p.height;
      if (opts.preset && p.typeScale) f.typeScale = p.typeScale;
      if (page) f.root.children = [make("Section")];
      /* A structured frame starts with a Group to put things in, and its
         blocks sit a block's gap apart. */
      if (structured) { f.mode = "structured"; var g = make("Group", { direction: "column", gap: "group" }, [], { w: "default", paddingTop: "lg", paddingBottom: "lg", paddingLeft: "gutter", paddingRight: "gutter" }); g.name = "Content"; f.root.children = [g]; f.gap = "block"; }
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
      return { frame: f.id, content: structured ? f.root.children[0].id : undefined };
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
  /* In the code, a link to a page becomes a relative address made from the
     page's name: the first page is index.html, "About us" is about-us.html.
     A link to a page that's gone is left out rather than written as is. */
  var pageFile = function (pg, i) { return i === 0 ? "index.html" : ((pg.name || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page-" + (i + 1)) + ".html"; };
  var withPageLinks = function (tree) {
    var pages = pagesOf(projectRef.current), files = {};
    pages.forEach(function (pg, i) { files[pg.id] = "./" + pageFile(pg, i); });
    return JSON.parse(JSON.stringify(tree), function (k, v) { var m = typeof v === "string" ? PAGE_LINK.exec(v) : null; return m ? files[m[1]] : v; });
  };
  var openCode = function () {
    var f = api();
    if (!f) return;
    var d = docRef.current;
    var fr = active(d);
    var picked = selRef.current.map(function (id) { return locate(d, id); }).filter(Boolean).map(function (a) { return a.node; });
    var parts = [];
    picked.forEach(function (n) { if (n.type === "Slot") parts = parts.concat(n.children); else parts.push(n); });
    /* Instances of My components become calls, with the components above. */
    var withComps = function (roots) {
      var got = codeWithComponents(roots, libRef.current);
      setCodeNotes(got.leftOut);
      return { roots: withPageLinks(got.roots), opts: { components: got.components.map(function (c) { return Object.assign({}, c, { node: withPageLinks(c.node) }); }) } };
    };
    if (parts.length && f.jsxNodes) {
      var title = parts.length === 1 ? nameOf(parts[0]) : parts.length + " layers";
      setCodeTitle(title);
      setCodePick(parts.length === 1 ? parts[0].id : null);
      var gotParts = withComps(parts);
      setCode(f.jsxNodes(gotParts.roots, parts.length === 1 ? (parts[0].name || parts[0].type) : fr.name + " parts", gotParts.opts));
    } else {
      setCodeTitle(fr.name);
      setCodePick(null);
      var gotFrame = withComps([fr.root]);
      setCode(f.jsx({ page: Object.assign({}, fr, { bare: !!fr.bare }), root: gotFrame.roots[0] }, fr.name, gotFrame.opts));
    }
    var dlg = dialogRef.current;
    if (dlg && dlg.showModal) dlg.showModal();
  };

  /* A frame, or one layer in it, as a picture, downloaded: PNG keeps
     transparency, JPEG is smaller and fills it white. Twice the size unless
     a scale is given; a scale other than 1x names itself in the file. */
  var exportImage = function (fid, type, opts) {
    var a = api(fid);
    var f = frameById(docRef.current, fid);
    if (!a || !a.snapshot || !f) return;
    var scale = (opts && opts.scale) || 2;
    var at = opts && opts.id ? locate(docRef.current, opts.id, fid) : null;
    var name = at ? nameOf(at.node) : f.name;
    announce("Making the " + (type === "jpeg" ? "JPG" : "PNG") + "…");
    a.snapshot(type, { scale: scale, id: at ? at.node.id : null }).then(function (url) {
      var link = document.createElement("a");
      link.href = url;
      link.download = (name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "frame") + (scale === 1 ? "" : "@" + scale + "x") + (type === "jpeg" ? ".jpg" : ".png");
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
        if (t.parent !== "root" || fr.mode === "structured" || fr.bare) { delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv; }
        else if (same && isFree(n.style)) { n.style.x = Math.min(FREE_MAX, n.style.x + 4); n.style.y = Math.min(FREE_MAX, n.style.y + 4); }
        if (ops.insert(dd, t.parent, at, n, fid)) { made.push(n.id); at++; }
      });
      return made.length ? made : null;
    }, "Pasted " + (nodes.length === 1 ? nameOf(nodes[0]) : nodes.length + " layers") + " into " + fr.name);
    if (same && clip.current) clip.current = { nodes: clip.current.nodes.map(function (n) { var c = copy(n); if (isFree(c.style)) { c.style.x += 4; c.style.y += 4; } return c; }), from: fid };
    return made.length > 0;
  };
  /* A picture on the clipboard (a screenshot, an image copied from a page)
     joins Content's images and lands as an Image, as in any design tool. */
  var pastePictures = function (files) {
    Promise.all(files.map(function (f) {
      var kind = f.type === "image/svg+xml" ? "illustrations" : "images";
      var base = (f.name || "").replace(/\.[a-z0-9]+$/i, "");
      var name = !base || /^image$/i.test(base) ? "Pasted picture" : base;
      return readForLibrary(f, kind).then(function (src) { return { kind: kind, item: { id: uid(), name: name, src: src } }; }, function (err) { announce(err.message); return null; });
    })).then(function (made) {
      made = made.filter(Boolean);
      if (!made.length) return;
      setLibrary(function (l) { var n = Object.assign({}, l); made.forEach(function (m) { n[m.kind] = [m.item].concat(l[m.kind] || []); }); return n; });
      made.forEach(function (m) { add("Image", null, { src: m.item.src, alt: m.item.name }); });
      announce("Pasted " + (made.length === 1 ? made[0].item.name : made.length + " pictures") + "; " + (made.length === 1 ? "it's" : "they're") + " in Content too");
    });
  };
  /* What a paste brings, in this page or a frame: pictures first, then the
     builder's own JSON for layers, then its own clipboard. */
  var takePaste = function (cd) {
    var pics = cd ? Array.prototype.filter.call(cd.files || [], function (f) { return /^image\//.test(f.type); }) : [];
    if (pics.length) { pastePictures(pics); return true; }
    var text = cd ? cd.getData("text/plain") : "";
    var data = null;
    try { data = JSON.parse(text); } catch (err) { data = null; }
    if (data && data.kind === CLIP_MARK && Array.isArray(data.nodes)) { pasteNodes(data.nodes); return true; }
    if (clip.current) { pasteNodes(clip.current.nodes); return true; }
    return false;
  };
  var takePasteRef = useRef(takePaste); takePasteRef.current = takePaste;
  useEffect(function () {
    var onPaste = function (ev) {
      var t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!(mountEl.contains(t) || t === document.body)) return;
      if (takePasteRef.current(ev.clipboardData)) ev.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    return function () { document.removeEventListener("paste", onPaste); };
  }, []);

  /* Text one step up or down its type scale: a Heading through its sizes
     into display, a Text through its variants. */
  /* A block's title: its text and its size, set through the block's props. */
  var TITLE_STEPS = ["heading-md", "heading-lg", "heading-xl", "display-sm", "display-md", "display-lg"];
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
    var comps = componentsFor([d], libRef.current);
    var url = location.origin + location.pathname + "#b=" + encode(out.doc) + "&f=" + fid + (at ? "&n=" + nid : "") + (comps.length ? "&c=" + encode(comps) : "");
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
  var keysRef = useRef(null);
  /* null while the list is being read, so an old list never shows. */
  var projListState = useState(null);
  var projList = projListState[0], setProjList = projListState[1];
  var projQueryState = useState("");
  var projQuery = projQueryState[0], setProjQuery = projQueryState[1];
  var renamingState = useState(null);
  var renamingProj = renamingState[0], setRenamingProj = renamingState[1];
  var confirmState = useState(null);
  var confirmDel = confirmState[0], setConfirmDel = confirmState[1];
  /* Projects: groups of files. Home shows them and the loose files; inside
     one (homeView, its id) it shows that project's files. */
  var groupListState = useState([]);
  var groupList = groupListState[0], setGroupList = groupListState[1];
  var homeViewState = useState(null);
  var homeView = homeViewState[0], setHomeView = homeViewState[1];
  var homeViewRef = useRef(null); homeViewRef.current = homeView;
  var homeSortState = useState(function () { var v = storage(function (st) { return st.getItem(HOME_SORT_KEY); }); return HOME_SORTS.some(function (o) { return o.value === v; }) ? v : "recent"; });
  var homeSort = homeSortState[0], setHomeSortState = homeSortState[1];
  var setHomeSort = function (v) { setHomeSortState(v); storage(function (st) { st.setItem(HOME_SORT_KEY, v); }); };
  var darkState = useState(function () { return storage(function (st) { return st.getItem(DARK_KEY); }) !== "0"; });
  var dark = darkState[0];
  var setDark = function (v) { darkState[1](!!v); storage(function (st) { st.setItem(DARK_KEY, v ? "1" : "0"); }); };
  useEffect(function () {
    var r = document.documentElement;
    r.classList.toggle("dark", dark);
    r.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  var renamingGroupState = useState(null);
  var renamingGroup = renamingGroupState[0], setRenamingGroup = renamingGroupState[1];
  /* The file being opened from Home, which shows it loading meanwhile. */
  var openingState = useState(null);
  var opening = openingState[0], setOpeningState = openingState[1];
  var openingRef = useRef(null);
  var setOpening = function (id) { openingRef.current = id; setOpeningState(id); };
  /* One picture input serves every card: whose picture it is waits here. */
  /* The canvas fades in after a file opens. */
  var arrivingState = useState(false);
  var arriving = arrivingState[0], setArriving = arrivingState[1];
  var versionsState = useState([]);
  var versions = versionsState[0], setVersions = versionsState[1];
  /* Which of the two dialogs is open; their contents render only then. */
  var shownState = useState(null);
  var shown = shownState[0], setShown = shownState[1];

  var refreshProjects = function () {
    return Promise.all([store.listProjects(), store.listGroups()]).then(function (got) { setGroupList(got[1]); setProjList(got[0]); return got[0]; });
  };
  var groupById = function (id) { return (groupList || []).filter(function (g) { return g.id === id; })[0] || null; };
  /* The bar names the file's project, so the projects are read at the start too. */
  useEffect(function () { store.listGroups().then(setGroupList, function () { /* none to name */ }); }, []);

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

  /* Home, or (view, a project's id) straight into one project. */
  var openProjects = function (view) {
    setProjQuery("");
    setRenamingProj(null);
    setRenamingGroup(null);
    setConfirmDel(null);
    setHomeView(typeof view === "string" ? view : null);
    setProjList(null);
    refreshProjects();
    setHome(true);
    captureThumb().then(refreshProjects);
  };
  var closeProjects = function () { setHome(false); setConfirmDel(null); setRenamingProj(null); setRenamingGroup(null); };
  /* Between Home and a project, or back: the list fades and comes back. */
  var goHomeView = function (view) {
    setProjQuery("");
    setConfirmDel(null);
    setRenamingProj(null);
    setRenamingGroup(null);
    setHomeView(view || null);
  };

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
    readLibraryFor(meta);
    store.setLastOpened(meta.id);
    /* Its own canvas colour and theme come with it. */
    if (typeof meta.stage !== "string") meta.stage = "";
    setStageColor(meta.stage);
    applyTheme(meta);
    docRef.current = next;
    setDoc(next);
    closeProjects();
    setOpening(null);
    setArriving(true);
    setTimeout(function () { setArriving(false); }, 420);
    if (message) announce(message);
    setTimeout(function () { showFrameRef.current(next.active); }, 0);
  };
  var openProject = function (meta) {
    if (meta.id === projectRef.current.id) { closeProjects(); return; }
    if (openingRef.current) return;
    setOpening(meta.id);
    var pg = pageOf(meta);
    captureThumb().then(flush).then(function () { return store.loadDoc(meta.id, pg); }).then(function (d) {
      if (!d) { setOpening(null); announce("That file couldn't be opened."); return; }
      switchTo(meta, d, "Opened " + meta.name, pg);
    }, function () { setOpening(null); announce("That file couldn't be opened."); });
  };
  var newProject = function (starterId) {
    var s = starterId ? STARTERS.filter(function (x) { return x[0] === starterId; })[0] : null;
    var d = s ? s[2]() : emptyDoc();
    var taken = (projList || []).map(function (p) { return p.name; });
    var name = s ? s[1] : "Untitled";
    for (var n = 2; taken.indexOf(name) >= 0; n++) name = (s ? s[1] : "Untitled") + " " + n;
    /* A new project starts with the theme on screen, and the builder's own canvas colour. */
    var P = window.DovetailConfigurePanel;
    /* Made on a project's page, it goes into that project. */
    var settings = { stage: "", theme: P && P.theme ? P.theme() : undefined, group: homeRef.current ? homeViewRef.current : projectRef.current.group };
    captureThumb().then(flush).then(function () { return store.createProject(name, d, settings); }).then(function (meta) {
      switchTo(meta, d, "Made a new file, " + name);
    });
  };
  /* A fresh copy of the Playground, shown on Home. */
  var newPlayground = function () {
    flush().then(function () { return addPlayground(store); }).then(function (made) {
      return refreshProjects().then(function () { goHomeView(made.group.id); announce("Added the Playground: Start here and the examples."); });
    });
  };
  /* A new project is empty: it opens on Home with its name ready to type. */
  var newGroup = function () {
    var taken = (groupList || []).map(function (g) { return g.name; });
    var name = "Untitled project";
    for (var n = 2; taken.indexOf(name) >= 0; n++) name = "Untitled project " + n;
    store.createGroup(name).then(function (g) {
      return refreshProjects().then(function () { goHomeView(g.id); setRenamingGroup(g.id); announce("Made a new project. Type its name."); });
    });
  };
  var renameGroup = function (id, name) {
    setRenamingGroup(null);
    if (!name) return;
    store.renameGroup(id, name).then(refreshProjects);
  };
  var duplicateGroup = function (id) {
    flush().then(function () { return store.duplicateGroup(id); }).then(function (g) {
      if (g) announce("Made a copy, " + g.name);
      refreshProjects();
    });
  };
  var moveFile = function (id, group) {
    var g = group ? groupById(group) : null;
    var f = (projList || []).filter(function (p) { return p.id === id; })[0];
    store.moveFile(id, group).then(function (meta) {
      if (!meta) return;
      if (id === projectRef.current.id) { projectRef.current = meta; setProject(meta); libScopeRef.current = null; readLibraryFor(meta); }
      announce((f ? f.name : "The file") + (g ? " is in " + g.name + " now" : " is on Home now"));
      refreshProjects();
    });
  };
  /* The file on screen went: open the most recent one left, or start a new one. */
  var afterCurrentGone = function (list) {
    if (list.length) store.loadDoc(list[0].id, pageOf(list[0])).then(function (d) { switchTo(list[0], d || emptyDoc(), "Opened " + list[0].name, pageOf(list[0])); });
    else { var d = starterDoc(); store.createProject("Untitled", d).then(function (meta) { switchTo(meta, d, "Made a new file"); refreshProjects(); }); }
  };
  var deleteGroup = function (id, keepFiles) {
    setConfirmDel(null);
    var g = groupById(id);
    var hadCurrent = projectRef.current.group === id;
    store.deleteGroup(id, keepFiles).then(refreshProjects).then(function (list) {
      announce("Deleted " + (g ? g.name : "the project") + (keepFiles ? "; its files are on Home" : ""));
      if (homeViewRef.current === id) goHomeView(null);
      if (!hadCurrent) return;
      if (keepFiles) { store.getProject(projectRef.current.id).then(function (meta) { if (meta) { projectRef.current = meta; setProject(meta); libScopeRef.current = null; readLibraryFor(meta); } }); return; }
      afterCurrentGone(list);
    });
  };
  /* A picture for a card, from the one shared file input. */
  var setGroupPicture = function (id, file) {
    pictureFrom(file).then(function (thumb) {
      if (!thumb) { announce("That file isn't a picture this browser can read."); return; }
      store.setGroupThumb(id, thumb).then(function () { announce("Picture set"); refreshProjects(); });
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
      announce("Deleted " + (gone ? gone.name : "the file"));
      if (id === projectRef.current.id) afterCurrentGone(list);
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
  var boxScrubRef = useRef(null);
  var stylePreviewRef = useRef(null);
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

  /* A file as one download: its name and pages, uploads and all. A project
     downloads as a bundle of its files. */
  var PROJECT_FORMAT = "dovetail-project";
  var BUNDLE_FORMAT = "dovetail-bundle";
  var fileData = function (id) {
    return store.getProject(id).then(function (meta) {
      if (!meta) return null;
      return Promise.all(pagesOf(meta).map(function (p) { return store.loadDoc(id, p.id); })).then(function (docs) {
        /* Every page, in order; doc is the first, for files read before pages. */
        var pages = pagesOf(meta).map(function (p, i) { return { name: p.name, doc: docs[i], folder: p.folder || undefined }; }).filter(function (p) { return p.doc; });
        if (!pages.length) return null;
        /* And the components its instances are made from, so they resolve wherever the file opens. */
        var scope = libScopeOf(meta);
        return (scope === libScopeRef.current ? Promise.resolve(libRef.current) : store.loadLibrary(scope).then(loadLibrary)).then(function (lib) {
          return { format: PROJECT_FORMAT, version: 3, name: meta.name, savedAt: new Date().toISOString(), doc: pages[0].doc, pages: pages, folders: foldersOf(meta), stage: meta.stage, theme: meta.theme, components: componentsFor(pages.map(function (p) { return p.doc; }), lib) };
        });
      });
    });
  };
  /* The whole project as code, every page, its components, its theme and
     its pictures, in one .zip (model/projectcode.js). */
  var downloadProjectCode = function () {
    var f = api();
    if (!f || !f.jsxComponent) return;
    var meta = projectRef.current, list = pagesOf(meta), pageNow = pageRef.current;
    flush().then(function () {
      return Promise.all(list.map(function (pg) { return pg.id === pageNow ? docRef.current : store.loadDoc(meta.id, pg.id); }));
    }).then(function (docs) {
      var P = window.DovetailConfigurePanel;
      var css = "";
      try { css = P && P.theme ? themeCss(P.theme()) : ""; } catch (err) { css = ""; }
      var got = projectFiles({ name: meta.name, pages: list.map(function (pg, i) { return { id: pg.id, name: pg.name, doc: docs[i] }; }), library: libRef.current, themeCss: css, exporter: f });
      var bytes = zip(got.entries);
      var link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      link.download = (meta.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "project") + "-code.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
      var pagesN = got.entries.filter(function (x) { return /^pages\//.test(x.name); }).length;
      announce("Downloaded " + link.download + ": " + pagesN + (pagesN === 1 ? " page" : " pages") + (got.notes.length ? ". " + got.notes.length + (got.notes.length === 1 ? " instance has" : " instances have") + " changes the code leaves out." : ""));
    });
  };
  var download = function (data, name) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
    link.download = (name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "file") + ".dovetail";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 4000);
    announce("Downloaded " + link.download);
  };
  var exportProject = function (id) {
    flush().then(function () { return fileData(id); }).then(function (data) { if (data) download(data, data.name); });
  };
  var exportGroup = function (id) {
    var g = groupById(id);
    if (!g) return;
    flush().then(function () { return store.filesIn(id); }).then(function (files) {
      return Promise.all(files.map(function (f) { return fileData(f.id); }));
    }).then(function (list) {
      download({ format: BUNDLE_FORMAT, version: 1, name: g.name, savedAt: new Date().toISOString(), files: list.filter(Boolean) }, g.name);
    });
  };
  /* Components from a file or a link, into a library; the one on screen
     follows if it's the same, so nothing saved later writes over them. */
  var takeComponents = function (scope, comps) {
    return absorbComponents(store, scope, comps).then(function (lib) {
      if (scope !== libScopeRef.current) return;
      libSkip.current = true;
      setLibrary(loadLibrary(lib));
    });
  };
  /* A file read from a download, made into a file here (in group, if given). */
  var fileFromData = function (data, fallback, group) {
    if (!data || data.format !== PROJECT_FORMAT || !data.doc) return Promise.resolve(null);
    var dropped = [];
    var given = (Array.isArray(data.pages) && data.pages.length ? data.pages : [{ name: "Page 1", doc: data.doc }]).slice(0, 50)
      .filter(function (p) { return p && p.doc && typeof p.doc === "object"; });
    if (!given.length) return Promise.resolve(null);
    var pages = given.map(function (p, i) { return { name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 60) : "Page " + (i + 1), doc: clean(p.doc, dropped), folder: typeof p.folder === "string" ? p.folder : null }; });
    var d = pages[0].doc;
    var name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallback;
    /* Its pages, canvas colour and theme come along, cleaned like anything else that comes in. */
    return store.createProject(name, d, { stage: data.stage, theme: data.theme, group: group || undefined }).then(function (meta) {
      var steps = store.setFolders(meta.id, data.folders).then(function () { return store.renamePage(meta.id, pageOf(meta), pages[0].name); })
        .then(function () { return pages[0].folder ? store.placePage(meta.id, pageOf(meta), 0, pages[0].folder) : null; });
      pages.slice(1).forEach(function (p) { steps = steps.then(function () { return store.addPage(meta.id, p.name, p.doc, undefined, p.folder); }); });
      /* Its components join the library this file uses; one already there stays as it is. */
      if (Array.isArray(data.components) && data.components.length) steps = steps.then(function () { return takeComponents(libScopeOf(meta), data.components); });
      return steps.then(function () { return store.getProject(meta.id); });
    }).then(function (meta) { return { meta: meta, doc: d, dropped: dropped.length, name: name }; });
  };
  var importProject = function (file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      var fallback = file.name.replace(/\.[\w]+$/, "");
      try { data = JSON.parse(String(reader.result)); } catch (err) { announce(file.name + " isn't a Dovetail file."); return; }
      /* A project: a new project with each of its files, shown on Home. */
      if (data && data.format === BUNDLE_FORMAT && Array.isArray(data.files)) {
        var name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : fallback;
        var made = 0;
        flush().then(function () { return store.createGroup(name); }).then(function (g) {
          var steps = Promise.resolve();
          data.files.slice(0, 100).forEach(function (f, i) {
            steps = steps.then(function () { return fileFromData(f, "File " + (i + 1), g.id); }).then(function (got) { if (got) made++; });
          });
          return steps.then(function () { return refreshProjects(); }).then(function () {
            setHome(true);
            goHomeView(g.id);
            announce("Opened " + name + ", with " + made + (made === 1 ? " file" : " files"));
          });
        });
        return;
      }
      if (!data || data.format !== PROJECT_FORMAT || !data.doc) { announce(file.name + " isn't a Dovetail file."); return; }
      var group = homeRef.current ? homeViewRef.current : null;
      captureThumb().then(flush).then(function () { return fileFromData(data, fallback, group); }).then(function (got) {
        if (!got) { announce(file.name + " isn't a Dovetail file."); return; }
        switchTo(got.meta, got.doc, "Opened " + got.name + (got.dropped ? ". " + got.dropped + (got.dropped === 1 ? " thing" : " things") + " in it were left out." : ""));
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

  /* Home: every project and loose file, over the canvas, which stays where
     it was underneath. A project opens to its files; a file opens the
     canvas. Escape goes back a level, then back to the canvas. */

  /* Every shortcut, as this keyboard says them: ? opens it, and so does the
     File menu. */
  var openKeys = function () {
    setShown("keys");
    var dlg = keysRef.current;
    if (dlg && dlg.showModal && !dlg.open) dlg.showModal();
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
          if (depth > 0 && (n.style.x !== undefined || n.style.y !== undefined)) { delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv; any = true; }
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
    delete kept.style.x; delete kept.style.y; delete kept.style.ch; delete kept.style.cv;
    var cid = uid();
    setLibrary(function (l) { var n = Object.assign({}, l); n.components = [{ id: cid, name: name, node: kept, tokens: check.tokens, rev: 1, made: Date.now() }].concat(l.components || []); return n; });
    if (compDraft.ids.length === 1) {
      setName(compDraft.ids[0], name);
      /* What it was made from is its first instance, so editing it there
         and pressing Update component carries the change everywhere. */
      quiet(function (d) { var at = locate(d, compDraft.ids[0]); if (!at) return null; at.node.inst = { of: cid, rev: 1 }; return undefined; });
    }
    var dlg = compRef.current;
    if (dlg && dlg.open) dlg.close();
    setCompDraft(null);
    announce(name + " is in My components, built on " + check.tokens.length + (check.tokens.length === 1 ? " token" : " tokens"));
  };
  var removeComponent = function (id) {
    setLibrary(function (l) { var n = Object.assign({}, l); n.components = (l.components || []).filter(function (c) { return c.id !== id; }); return n; });
    quiet(function (d) { return detachAll(d, id) ? undefined : null; });
  };
  /* Linked instances (model/instances.js, docs/instances.md). An instance
     is edited in place; Update component makes it the component's new
     revision and rebuilds the others, on this page now and on the
     project's other pages as they're saved. */
  var instanceActions = {
    update: function (id) {
      var at = locate(docRef.current, id), comp = masterOf(libRef.current, at && at.node);
      if (!comp) return;
      if (holdsInstanceOf(at.node, comp.id)) { announce("Not yet: " + nameOf(at.node) + " holds an instance of " + comp.name + ", and a component can't hold itself."); return; }
      var check = componentCheck(at.node);
      var bad = check.issues.filter(function (i) { return i.level === "error"; })[0];
      if (bad) { announce("Not yet: " + bad.text); return; }
      var master = cleanNode(copy(at.node), null);
      if (!master) return;
      delete master.style.x; delete master.style.y; delete master.style.ch; delete master.style.cv; delete master.inst; delete master.lock; delete master.hide;
      var rev = (comp.rev || 1) + 1, was = comp.node;
      setLibrary(function (l) { var n = Object.assign({}, l); n.components = (l.components || []).map(function (c) { return c.id === comp.id ? Object.assign({}, c, { node: master, prev: was, rev: rev, tokens: check.tokens }) : c; }); return n; });
      var here = 0;
      change(function (d) { here = updateInstances(d, comp.id, was, master, rev, id); return undefined; }, null);
      var pid = projectRef.current.id, pageNow = pageRef.current;
      var others = pagesOf(projectRef.current).filter(function (pg) { return pg.id !== pageNow; });
      Promise.all(others.map(function (pg) {
        return store.loadDoc(pid, pg.id).then(function (d) {
          if (!d) return 0;
          var n = 0;
          var next = produce(d, function (dr) { n = updateInstances(dr, comp.id, was, master, rev, null); });
          return n ? store.saveDoc(pid, next, pg.id).then(function () { return n; }) : 0;
        }).catch(function () { return 0; });
      })).then(function (ns) {
        var total = here + ns.reduce(function (a, b) { return a + b; }, 0);
        announce(comp.name + " is updated" + (total ? ", and so " + (total === 1 ? "is its other instance" : "are its " + total + " other instances") : ""));
      });
    },
    /* An instance behind the component (made in another project, say)
       catches up. Its differences from the revision it was on survive when
       that revision is the one before; otherwise its differences from the
       current one do. */
    pull: function (id) {
      var at = locate(docRef.current, id), comp = masterOf(libRef.current, at && at.node);
      if (!comp || (at.node.inst.rev || 1) >= (comp.rev || 1)) return;
      var was = comp.prev && (at.node.inst.rev || 1) === (comp.rev || 1) - 1 ? comp.prev : comp.node;
      change(function (d) {
        var a = locate(d, id);
        if (!a || !a.parent) return null;
        var i = a.parent.children.findIndex(function (c) { return c.id === id; });
        a.parent.children[i] = rebase(a.node, was, comp.node, comp.rev || 1);
        return undefined;
      }, nameOf(at.node) + " is on the latest " + comp.name);
    },
    reset: function (id) {
      var at = locate(docRef.current, id), comp = masterOf(libRef.current, at && at.node);
      if (!comp) return;
      change(function (d) {
        var a = locate(d, id);
        if (!a || !a.parent) return null;
        var i = a.parent.children.findIndex(function (c) { return c.id === id; });
        a.parent.children[i] = rebase(a.node, a.node, comp.node, comp.rev || 1);
        return undefined;
      }, nameOf(at.node) + " is back to " + comp.name);
    },
    detach: function (id) {
      var at = locate(docRef.current, id), comp = masterOf(libRef.current, at && at.node);
      if (!at || !at.node.inst) return;
      change(function (d) { var a = locate(d, id); if (!a) return null; delete a.node.inst; return undefined; }, nameOf(at.node) + " is detached from " + (comp ? comp.name : "its component") + "; changes to it stay here");
    },
  };
  /* Under the inspector's title: which component an instance is of, and
     what it can do about it. */
  var instanceRow = function (n) {
    var comp = masterOf(library, n);
    var stale = !!comp && (comp.rev || 1) > (n.inst.rev || 1);
    return e("div", { className: cx("bd-inst", !comp && "is-lost", stale && "is-stale") },
      e(Icon, { name: "component" }),
      e("span", { className: "bd-inst-text" }, comp ? e(React.Fragment, null, "Instance of ", e("strong", null, comp.name), stale ? ", which has changed since" : "") : "Its component was deleted; it's on its own now"),
      stale ? e("button", { type: "button", className: "bd-btn bd-btn-sm bd-inst-update", onClick: function () { instanceActions.pull(n.id); } }, "Update") : null,
      e(Dropdown, { menu: true, label: "Instance actions", icon: "more", iconOnly: true, compact: true, alignEnd: true, className: "bd-dd-icon bd-inst-menu",
        options: (comp ? [{ value: "update", label: "Update component from this", hint: "Every instance follows", icon: "upload" }, { value: "reset", label: "Reset to " + comp.name, icon: "undo" }] : []).concat([{ value: "detach", label: "Detach from component", icon: "detach" }]),
        onChange: function (v) { if (instanceActions[v]) instanceActions[v](n.id); } }));
  };
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

  var labelOf = function (n) { return nodeLabel(n, scalars); };
  var nodesOf = function (ids) { return ids.map(function (id) { return locate(doc, id); }).filter(Boolean).map(function (a) { return a.node; }); };
  var same = allSame;
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
  var sizeText = function (f) { return frameSize(f, boxes); };

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
  /* The families of tokens that suit these layers (config.js scopeOf). */
  var scopeFor = function (nodes) {
    var d = docRef.current;
    var top = nodes.length > 0 && nodes.every(function (n) { var at = locate(d, n.id); return !!at && !!at.parent && at.parent.type === "Root"; });
    var fr = active(d);
    return scopeOf(nodes.map(function (n) { return n.type; }), { top: top, social: !!fr && fr.typeScale === "social" });
  };
  var tokenDropdown = function (key, nodes, id, opts) {
    opts = opts || {};
    var def = DATA.tokens[key];
    var values = nodes.map(function (n) { return n.style[key] || ""; });
    var mixed = !same(values);
    var value = mixed ? "" : values[0];
    var ctx = scopeFor(nodes);
    var order = def.section === "size" ? ctx.size : def.section === "spacing" ? ctx.space : null;
    var list = def.options.slice();
    /* Only what suits this selection, and this axis; a value already set
       stays listed so it can be seen and changed. */
    if (order) list = list.filter(function (o) { return optionAllowed(key, o, ctx) || o.value === value; });
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
      title: opts.title || (opts.label || def.label) + (order ? ": suggestions for " + ctx.name + " first" : ""),
      onScrub: opts.onScrub || (opts.scrub ? function (v, first) { scrubStyle(ids0, key, v, first); } : undefined), scrubFrom: opts.scrubFrom || (opts.scrub ? measureFor : undefined),
      onScrubEnd: opts.onScrubEnd, scrubBody: opts.scrubBody, onStep: opts.onStep, onAltClick: opts.onAltClick, onPreview: opts.onPreview,
      /* Dragging and stepping keep to the families that suit the layer. */
      stepFilter: order ? function (o) { return o.group !== more; } : undefined,
      onChange: opts.onChange || function (v) { if (v === "__fixed") fixSize(key, nodes); else setStyle(ids0, key, v); },
    });
  };
  /* Fixed: each item keeps the size it's drawn at, as the nearest token. */
  var fixSize = function (key, nodes) {
    var a = api();
    if (!a) return;
    var wide = key === "w" || key === "minW";
    var picks = nodes.map(function (n) { var r = a.rect(n.id); return r ? sizeNear(key, wide ? r.width : r.height, false, true, [n]) : null; });
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
          type: "button", className: "bd-act bd-act-sm", "aria-pressed": String(open), title: key === "radius" ? "Each corner on its own" : "Each side on its own", "aria-label": def.label + (key === "radius" ? ", each corner" : ", each side"),
          onClick: function () { setSidesOpen(function (s) { var n = Object.assign({}, s); n[key] = !open; return n; }); },
        }, e(Icon, { name: "sides" })) : null),
      sides && open ? e("div", { className: "bd-sides" }, sides.map(function (k) {
        var sdef = DATA.tokens[k];
        return e("span", { key: k, className: "bd-side" },
          tokenDropdown(k, nodes, null, { compact: true, prefix: sdef.short || sdef.side[0].toUpperCase(), className: "bd-dd-field" }));
      })) : null);
  };

  /* A free text's box: auto width (no size of its own), auto height (a
     width) or fixed (a width and a height). Picking one takes the size it's
     drawn at now; dragging a side or a corner on the canvas does the same. */
  var TEXT_BOX = { Text: 1, Heading: 1 };
  var textBoxRow = function (nodes) {
    if (frame.mode === "structured" || !nodes.every(function (n) { return TEXT_BOX[n.type] && isFree(n.style); })) return null;
    var modeOf = function (n) { return !n.style.fw && !n.style.rw ? "auto" : n.style.fh || n.style.rh ? "fixed" : "height"; };
    var modes = nodes.map(modeOf);
    var tid = "bd-textbox-" + nodes[0].id;
    var HINT = { auto: "Grows as you type", height: "Wraps at its width, grows down", fixed: "Its own width and height; what doesn't fit is cut off" };
    return e(Field, { key: "textbox", id: tid, label: "Text box", hint: same(modes) ? HINT[modes[0]] : null },
      e(Dropdown, { labelledBy: tid, value: same(modes) ? modes[0] : null, mixed: !same(modes), className: "bd-dd-field", iconValue: true,
        options: [{ value: "auto", label: "Auto width", icon: "textAutoWidth", hint: HINT.auto }, { value: "height", label: "Auto height", icon: "textAutoHeight", hint: HINT.height }, { value: "fixed", label: "Fixed size", icon: "textFixed", hint: HINT.fixed }],
        onChange: function (v) {
          var a = api(), unit = pxMap["padding|2xs"] || 4;
          var steps = function (px) { return Math.max(1, Math.min(FREE_MAX, Math.round(px / unit))); };
          change(function (d) {
            nodes.forEach(function (n) {
              var at = locate(d, n.id);
              if (!at) return;
              var st = at.node.style, r = a && a.rect ? a.rect(n.id) : null;
              delete st.rw; delete st.rh;
              if (v === "auto") { delete st.fw; delete st.fh; return; }
              if (!st.fw && r) st.fw = steps(r.width);
              if (v === "height") delete st.fh;
              else if (!st.fh && r) st.fh = steps(r.height);
            });
          }, "Text box: " + (v === "auto" ? "auto width" : v === "height" ? "auto height" : "fixed size"));
        } }));
  };

  /* A border's width and line style, each from a menu. */
  var BORDER_LOOK_ICON = { borderWidth: { "": "weightDefault", strong: "weightStrong" }, borderStyle: { "": "lineSolid", dashed: "lineDashed", dotted: "lineDotted" } };
  var borderLookRow = function (nodes, nid) {
    var menu = function (key, prefix, noneLabel, noneHint) {
      var values = nodes.map(function (n) { return n.style[key] || ""; });
      var icons = BORDER_LOOK_ICON[key];
      return e(Dropdown, { key: key, label: DATA.tokens[key].label, prefix: prefix, value: same(values) ? values[0] : null, mixed: !same(values), className: "bd-dd-field", narrow: true, iconValue: true,
        options: [{ value: "", label: noneLabel, hint: noneHint, icon: icons[""] }].concat(DATA.tokens[key].options.map(function (o) { return { value: o.value, label: o.label || o.value, hint: o.tokens.join(" · ") || "CSS keyword", icon: icons[o.value] }; })),
        onChange: function (v) { setStyle(nodes.map(function (n) { return n.id; }), key, v || undefined); } });
    };
    return e("div", { key: "look", className: "bd-size-row bd-border-look", id: "bd-border-look-" + nid },
      menu("borderWidth", "Width", "Default", "--dt-border-width-default"),
      menu("borderStyle", "Style", "Solid", "CSS keyword"));
  };

  /* Several styles at once, in one undo step. */
  /* Constraints: what free layers keep to when their frame changes size.
     Left and top are the default and aren't stored. Stretching or scaling
     needs a size of the layer's own, so one that has none takes its drawn
     size then. */
  var PIN_WORD = { h: { left: "Left", right: "Right", both: "Left and right", center: "Centre", scale: "Scale" }, v: { top: "Top", bottom: "Bottom", both: "Top and bottom", center: "Centre", scale: "Scale" } };
  var PIN_SAYS = { h: { left: "keeps to the left edge", right: "keeps to the right edge", both: "stretches across with it", center: "stays centred across", scale: "scales across with it" },
    v: { top: "keeps to the top edge", bottom: "keeps to the bottom edge", both: "stretches down with it", center: "stays centred down", scale: "scales down with it" } };
  var setPins = function (ids, axis, value) {
    var key = axis === "h" ? "ch" : "cv", sizeKey = axis === "h" ? "fw" : "fh";
    var a = api(), unit = pxMap["padding|2xs"] || 4;
    change(function (d) {
      var any = false;
      ids.forEach(function (id) {
        var at = locate(d, id);
        if (!at || !isFree(at.node.style)) return;
        any = true;
        if (value === "left" || value === "top") delete at.node.style[key]; else at.node.style[key] = value;
        if ((value === "both" || value === "scale") && !at.node.style[sizeKey]) {
          var r = a && a.rect ? a.rect(id) : null;
          if (r) at.node.style[sizeKey] = Math.max(1, Math.min(FREE_MAX, Math.round((axis === "h" ? r.width : r.height) / unit)));
        }
      });
      return any ? undefined : null;
    }, (axis === "h" ? "Across: " : "Down: ") + PIN_WORD[axis][value]);
  };
  var pinsField = function (nodes, ids) {
    var hs = nodes.map(function (n) { return n.style.ch || "left"; }), vs = nodes.map(function (n) { return n.style.cv || "top"; });
    var h = same(hs) ? hs[0] : null, v = same(vs) ? vs[0] : null;
    var pick = function (line, shift) {
      var axis = /^(left|right|hcenter)$/.test(line) ? "h" : "v";
      var cur = axis === "h" ? h : v, lo = axis === "h" ? "left" : "top", hi = axis === "h" ? "right" : "bottom";
      var next;
      if (line === "hcenter" || line === "vcenter") next = cur === "center" ? lo : "center";
      else if (shift) { var other = line === lo ? hi : lo; next = cur === other ? "both" : cur === "both" ? other : line; }
      else next = line;
      setPins(ids, axis, next);
    };
    var pid = "bd-pins-" + nodes[0].id;
    var hint = !h || !v ? "These layers keep to different edges."
      : h === "left" && v === "top" ? "When the frame changes size, it stays put. Pin it to an edge, the centre, or both sides."
      : (h === "right" || h === "left") && (v === "bottom" || v === "top") ? "When the frame changes size, it keeps its distance to the " + h + " and " + v + " edges."
      : "When the frame changes size, it " + PIN_SAYS.h[h] + " and " + PIN_SAYS.v[v] + ".";
    var dd = function (axis, now, list, prefix) {
      return e(Dropdown, { key: axis, label: axis === "h" ? "Constraint across" : "Constraint down", prefix: prefix, value: now || "", mixed: now === null, placeholder: "Mixed", className: "bd-dd-field", narrow: true,
        options: list.map(function (k) { return { value: k, label: PIN_WORD[axis][k] }; }), onChange: function (val) { if (val) setPins(ids, axis, val); } });
    };
    return e(Field, { key: "pins", id: pid, label: "Constraints", hint: hint },
      e("div", { className: "bd-pins-row" },
        e(ConstraintBox, { label: "Constraints", h: h, v: v, onPick: pick }),
        e("div", { className: "bd-pins-dds" }, dd("h", h, H_PINS, "H"), dd("v", v, V_PINS, "V"))));
  };
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
     a box model reads. The name in each ring sets every side at once.
     A side left unset shows what the layer really has, measured on the
     canvas, in grey with where it comes from; one set here is in full ink.
     Drag sideways on a side to step through the spacing; Shift makes it
     every side. Up and Down step it too, and Alt-click clears it. */
  var boxApply = function (ids, key, all, v, every) {
    return function (d) {
      var any = false;
      ids.forEach(function (id) {
        var at = locate(d, id);
        if (!at) return;
        any = true;
        var st = at.node.style;
        if (every) { if (v) st[all] = v; else delete st[all]; DATA.tokens[all].sides.forEach(function (k) { delete st[k]; }); }
        else if (v) st[key] = v; else delete st[key];
      });
      return any ? undefined : null;
    };
  };
  var boxWord = function (key, all, v, every) {
    var what = every ? (all === "padding" ? "Padding" : "Margin") + " on every side" : DATA.tokens[key].label;
    return v ? what + " " + v : what + " cleared";
  };
  /* A drag is shown as it goes and kept as one change when it ends. */
  var scrubBox = function (ids, key, all, v, first, every) {
    if (first || !boxScrubRef.current) boxScrubRef.current = { start: docRef.current };
    var b = boxScrubRef.current;
    b.last = [ids, key, all, v, every];
    docRef.current = b.start;
    quiet(boxApply(ids, key, all, v, every));
  };
  var endScrubBox = function () {
    var b = boxScrubRef.current;
    boxScrubRef.current = null;
    if (!b || !b.last) return;
    docRef.current = b.start;
    change(boxApply.apply(null, b.last), boxWord(b.last[1], b.last[2], b.last[3], b.last[4]));
  };
  var boxModel = function (nodes) {
    var ids = nodes.map(function (n) { return n.id; });
    /* A component that pads itself from its own tier (Card's card padding)
       names that as the default, so "None" doesn't read as no padding. Only
       on that component: a mixed selection, or another type, never sees it. */
    var oneType = nodes.length && nodes.every(function (n) { return n.type === nodes[0].type; });
    var ownPad = oneType && META[nodes[0].type] ? META[nodes[0].type].ownPadding : null;
    var ownLabel = ownPad ? "Default: " + ownPad.label : null;
    var a = nodes.length === 1 ? api() : null;
    var drawn = a && a.spacing ? a.spacing(nodes[0].id) : null;
    var side = function (key, all, where) {
      var allValues = nodes.map(function (n) { return n.style[all] || ""; });
      var inherited = same(allValues) ? allValues[0] : "";
      var own = nodes.some(function (n) { return n.style[key]; });
      var px = drawn ? drawn[key] : null;
      var from = all === "padding" && ownPad ? ownPad.label + " (" + ownPad.token + ")" : oneType ? nodes[0].type + "'s own " + all : "";
      var noneLabel = inherited ? "Same as every side (" + inherited + ")" : px ? "From " + (from || "the component") + ": " + px + "px" : all === "padding" && ownLabel ? ownLabel : "None";
      var noneShort = inherited ? (pxMap[all + "|" + inherited] != null ? String(Math.round(pxMap[all + "|" + inherited])) : inherited) : px ? String(px) : all === "padding" && ownLabel ? "Def" : "–";
      var label = DATA.tokens[key].label;
      return e("div", { key: key, className: "bd-box-cell is-" + where },
        tokenDropdown(key, nodes, null, {
          compact: true, noPreview: true, mixedLabel: "~", pxOnly: true, className: cx("bd-box-val", !own && "is-inherited"),
          noneLabel: noneLabel, noneShort: noneShort,
          title: label + (own ? "" : inherited ? ", from every side" : px ? ", " + px + "px from " + (from || "the component") : "") + ". Drag sideways or press Up and Down to step it; Shift sets every side; Alt-click clears it.",
          scrubBody: true, scrubFrom: function () { return px != null ? px : null; },
          onScrub: function (v, first, ev) { scrubBox(ids, key, all, v, first, !!(ev && ev.shiftKey)); },
          onScrubEnd: endScrubBox,
          onStep: function (v, ev) { change(boxApply(ids, key, all, v, ev.shiftKey), boxWord(key, all, v, ev.shiftKey)); },
          onAltClick: function () { change(boxApply(ids, key, all, undefined, false), boxWord(key, all, undefined, false)); },
        }));
    };
    var ring = function (key, title) {
      return tokenDropdown(key, nodes, null, {
        compact: true, noPreview: true, label: title + ", every side", icon: "sides", iconOnly: true, mixedLabel: "", noneShort: "", short: function () { return ""; }, className: "bd-box-all",
        noneLabel: key === "padding" && ownLabel ? ownLabel : undefined,
        title: title + ", every side. Alt-click clears every side.",
        onAltClick: function () { change(boxApply(ids, key, key, undefined, true), boxWord(key, key, undefined, true)); },
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

  /* Width, height and their minimums, two by two. Width and height also take
     a share of the parent (%) or of the screen (vw, vh); switching the unit
     keeps the size the layer has now, converted. */
  var SIZE_UNITS = [{ value: "px", label: "px" }, { value: "%", label: "%" }, { value: "vw", label: "vw" }, { value: "vh", label: "vh" }];
  /* part: "dims" for just W and H (a free layer's, in its Position block),
     "mins" for just the minimums; the whole grid otherwise. */
  var sizeGrid = function (nodes, part) {
    var ids = nodes.map(function (n) { return n.id; });
    var a = api();
    var free = frame.mode !== "structured" && nodes.every(function (n) { return isFree(n.style); });
    var measured = function (id, wide) {
      var sz = a && a.size ? a.size(id) : null;
      return sz ? (wide ? sz.width : sz.height) : null;
    };
    /* What 1 of a unit is, in pixels, for this layer. */
    var per = function (id, wide, unit) {
      if (unit === "vw") return frame.width / 100;
      if (unit === "vh") return frame.height / 100;
      var at = locate(doc, id);
      var box = at && at.parent ? measured(at.parent.id, wide) : null;
      return (box || (wide ? frame.width : frame.height)) / 100;
    };
    var field = function (key, prefix) {
      return e("div", { key: key }, tokenDropdown(key, nodes, null, { prefix: prefix, short: shortSize, noneLabel: "Auto", noneShort: "Auto", noPreview: true, className: "bd-dd-field", scrub: true, fixed: key === "w" || key === "height" }));
    };
    /* One side: W or H, in px or one of the relative units. */
    var dim = function (wide) {
      var short = wide ? "W" : "H", label = wide ? "Width" : "Height";
      var fkey = wide ? "fw" : "fh", tkey = wide ? "w" : "height", rkey = wide ? "rw" : "rh";
      var units = nodes.map(function (n) { var r = relSize(n.style[rkey]); return r ? r.unit : "px"; });
      var unit = same(units) ? units[0] : null;
      var apply = function (patchFor, message, live) {
        var fn = function (d) { ids.forEach(function (id) { var at = locate(d, id); if (!at) return; Object.assign(at.node.style, patchFor(id)); Object.keys(at.node.style).forEach(function (k) { if (at.node.style[k] === undefined) delete at.node.style[k]; }); }); return undefined; };
        if (live) quiet(fn); else change(fn, message);
      };
      var clear = {}; clear[fkey] = undefined; clear[tkey] = undefined; clear[rkey] = undefined;
      var setRel = function (n, u, live) {
        n = Math.max(1, Math.min(999, Math.round(n)));
        apply(function () { var p = Object.assign({}, clear); p[rkey] = n + u; return p; }, label + " " + n + u, live);
      };
      var onUnit = function (u) {
        if (u === unit) return;
        if (u === "px") {
          /* Back to pixels: a free layer keeps its size in 4px steps; in
             the flow it goes back to its own size. */
          apply(function (id) {
            var p = Object.assign({}, clear);
            var px = measured(id, wide);
            if (free && px) p[fkey] = Math.max(1, Math.min(FREE_MAX, Math.round(px / 4)));
            return p;
          }, label + " in pixels");
          return;
        }
        apply(function (id) {
          var p = Object.assign({}, clear);
          var px = measured(id, wide), one = per(id, wide, u);
          p[rkey] = Math.max(1, Math.min(999, Math.round(px && one ? px / one : 100))) + u;
          return p;
        }, label + " in " + u);
      };
      var picker = e(Dropdown, { label: label + " unit", value: unit, mixed: !unit, mixedLabel: "~", options: SIZE_UNITS, compact: true, narrow: true, alignEnd: true, className: "bd-dd-unit", onChange: onUnit });
      var body;
      if (unit && unit !== "px") {
        var ns = nodes.map(function (n) { return relSize(n.style[rkey]).n; });
        body = e(NumberField, { short: short, label: label + ", in " + (unit === "%" ? "percent of its parent" : unit === "vw" ? "percent of the screen's width" : "percent of the screen's height"), value: same(ns) ? ns[0] : null, placeholder: "Mixed", min: 1, max: 999,
          title: label + ": " + (unit === "%" ? "a share of its parent" : "a share of the screen's " + (unit === "vw" ? "width" : "height")) + ". Arrows step 1, Shift 10; drag the letter to scrub.",
          onChange: function (v) { setRel(v, unit); }, onScrub: function (v, first) { setRel(v, unit, !first); } });
      } else if (free) {
        /* A free layer takes any multiple of 4px: typed (rounded to the
           nearest 4), dragged on the letter, or stepped with the arrows, 4 at
           a time or 16 with Shift. Empty means its own size. */
        var px = function (n) {
          if (n.style[fkey]) return n.style[fkey] * 4;
          var m = measured(n.id, wide);
          return m ? Math.round(m / 4) * 4 : null;
        };
        var vs = nodes.map(px);
        var set = function (v, first) {
          var steps = Math.max(1, Math.min(FREE_MAX, Math.round(v / 4)));
          apply(function () { var p = Object.assign({}, clear); p[fkey] = steps; return p; }, label + " " + steps * 4 + "px", first === false);
        };
        body = e(NumberField, { short: short, label: label + ", in pixels, a multiple of 4", value: same(vs) ? vs[0] : null, placeholder: "Mixed", step: 4, min: 4, max: FREE_MAX * 4,
          title: label + ": any multiple of 4px. Arrows step 4, Shift 16; drag the letter to scrub.",
          onChange: function (v) { set(v); }, onScrub: function (v, first) { set(v, first); } });
      } else {
        body = tokenDropdown(tkey, nodes, null, { prefix: short, short: shortSize, noneLabel: "Auto", noneShort: "Auto", noPreview: true, className: "bd-dd-field", scrub: true, fixed: true });
      }
      return e("div", { key: fkey, className: "bd-size-unit" }, body, picker);
    };
    if (part === "dims") return [dim(true), dim(false)];
    if (part === "mins") return e("div", { key: "mins", className: "bd-grid2" }, field("minW", "Min W"), field("h", "Min H"));
    return e("div", { className: "bd-grid2" }, dim(true), dim(false), field("minW", "Min W"), field("h", "Min H"));
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
  /* Props that read better as pictures than words: how a photo fits its
     box (drawn with object-fit itself, on a small landscape), the corner
     each radius gives, and the shape of each ratio. */
  var FIT_SRC = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><rect width="64" height="32" fill="#8ea3b8"/><circle cx="50" cy="9" r="4.5" fill="#f4d58d"/><path d="M0 32 L18 12 L32 26 L44 16 L64 32 Z" fill="#4d6b57"/></svg>');
  var PIC_LABEL = { cover: "Cover", contain: "Contain", fill: "Fill", none: "None", "scale-down": "Shrink", square: "1:1", media: "Media", container: "Container", control: "Control", overlay: "Overlay", pill: "Pill" };
  var ratioOf = function (v) { if (v === "square") return 1; var m = /^(\d+):(\d+)$/.exec(String(v)); return m ? Number(m[1]) / Number(m[2]) : null; };
  var propPicture = function (name, o) {
    if (name === "fit") return e("span", { className: "bd-pv-fit" }, e("img", { src: FIT_SRC, alt: "", style: { objectFit: o } }));
    if (name === "radius") return e("span", { className: "bd-pv-corner", style: { borderTopLeftRadius: "var(--dt-radius-" + o + ")" } });
    var r = ratioOf(o);
    /* Every shape inside the same 28 × 20 box. */
    var w = r >= 1.4 ? 28 : Math.round(20 * r), h = r >= 1.4 ? Math.round(28 / r) : 20;
    return e("span", { className: "bd-pv-ratio-box" }, e("span", { className: "bd-pv-ratio", style: { width: w + "px", height: h + "px" } }));
  };
  var picturable = function (p) {
    if (p.name === "fit") return p.options.every(function (o) { return /^(cover|contain|fill|none|scale-down)$/.test(o); });
    if (p.name === "radius") return p.options.every(function (o) { return /^(none|control|media|container|overlay|pill)$/.test(o); });
    if (p.name === "ratio") return p.options.every(function (o) { return ratioOf(o) != null; });
    return false;
  };
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
        e(ListEditor, { key: first.id + p.name, id: id, label: label, spec: p, value: sample, pages: pagesOf(projectRef.current), pageNow: pageRef.current, onChange: function (v) { setProp([first.id], p.name, v); } }));
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
    } else if (p.kind === "enum" && picturable(p)) {
      return e(PictureField, { key: p.name, id: id, label: label, note: p.note, value: current, mixed: mixed, onChange: set,
        options: p.options.map(function (o) {
          return { value: o, name: PIC_LABEL[o] || String(o), title: o === "scale-down" ? "Scale down: shrink to fit, never grow" : undefined, picture: propPicture(p.name, o) };
        }) });
    } else if (p.kind === "enum" && ((first.type === "Shape" && ENUM_MENU[p.name]) || (first.type === "Image" && p.name === "position"))) {
      /* A line's caps only mean something on a line. */
      if ((p.name === "start" || p.name === "end") && !nodes.every(function (n) { return n.props.shape === "line"; })) return null;
      var pics = ENUM_MENU[p.name];
      control = e(Dropdown, { labelledBy: id, value: current === undefined && !mixed ? p.default : current, mixed: mixed, onChange: function (v) { set(v === p.default ? undefined : v); }, className: "bd-dd-field", iconValue: true,
        options: p.options.map(function (o) { return { value: o, label: words(o), icon: pics[o] }; }) });
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
    } else if (p.kind === "url") {
      /* A link goes to one of the project's pages (Play follows it; the
         code gets a relative address) or to a web address. */
      control = e(LinkTo, { labelledBy: id, value: current, mixed: mixed, pages: pagesOf(projectRef.current), pageNow: pageRef.current, onChange: set });
    } else return null;
    return e(Field, { key: p.name, id: id, label: label, note: p.note }, control);
  };


  /* ------------------------------------------------- the panels */

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
  /* Content belongs to the file's project, or to a loose file alone. */
  var contentScopeNote = function () {
    var g = project.group ? groupById(project.group) : null;
    if (g) return "Shared by the files in " + g.name + ". Other projects don't see it.";
    if (project.lib === "shared") return "Shared by the files you made before projects. Moving this file into a project brings it along.";
    return "This file's own. Moving it into a project brings it along.";
  };

  var applyVar = function (key, value, label) {
    var ids = selRef.current.filter(function (id) { var at = locate(docRef.current, id); return at && at.node.type !== "Slot"; });
    if (!ids.length) { announce("Select a layer on the canvas, then pick a variable to apply it"); return; }
    var patch = {};
    patch[key] = value;
    if (key === "surface") patch.fill = undefined;
    setStyles(ids, patch);
    announce(label + " is " + value + " on " + (ids.length === 1 ? nameOf(locate(docRef.current, ids[0]).node) : ids.length + " layers"));
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
            if (f.bare || f.mode === "structured" || !joinsFlow(n.type)) { delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv; }
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

  /* Containers start open in Layers; a component's slots start folded. */
  var isOpen = function (n) { return nodeIsOpen(n, collapsed); };
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
  var anatomyOf = function (fid, id) { try { var a = api(fid); return a && a.anatomy ? a.anatomy(id) : null; } catch (err) { return null; } };
  var everyNode = function (fn) { doc.frames.forEach(function (f) { (function walk(n) { (n.children || []).forEach(function (c) { fn(c); walk(c); }); })(f.root); }); };

  /* A section that remembers whether it's folded, per title. A few start
     folded until opened once: a component's style options and arrangement,
     below its content, and spacing, unless something in them is set. One
     with nothing in it (no children) is just its title and its action, as
     a border is until one is added. */
  var FOLDED_FIRST = { "props-style": true, "props-arrange": true, spacing: true };
  var isClosed = function (key, changed) {
    if (!FOLDED_FIRST[key]) return !!closedSecs[key];
    return closedSecs[key] === undefined ? !changed : closedSecs[key] !== false;
  };
  var sec = function (key, title, children, action, changed) {
    var empty = children == null;
    return e(Section, { key: key, id: key, title: title, action: action, changed: changed, closed: empty || isClosed(key, changed),
      onToggle: empty ? undefined : function () { setClosedSecs(function (c) { var n = Object.assign({}, c), was = isClosed(key, changed); if (FOLDED_FIRST[key]) n[key] = !was; else if (was) delete n[key]; else n[key] = true; return n; }); } }, children);
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
  /* The Fill swatches, grouped, in the frame's own colours. */
  var SURFACE_NAME = { base: "Base", subtle: "Subtle", raised: "Raised", sunken: "Sunken", brand: "Brand", "brand-muted": "Brand muted", "brand-secondary": "Brand secondary", "brand-secondary-muted": "Brand secondary muted", "success-subtle": "Success", "warning-subtle": "Warning", "danger-subtle": "Danger", "info-subtle": "Info" };
  var surfaceGroups = function () {
    var a = api();
    var look = function (o) { var l = a && a.look ? a.look(o.css) : null; return l && l.bg ? l : { bg: "var(" + o.tokens[0] + ")", fg: "var(--dt-text-primary)" }; };
    var groups = [{ name: "Neutral", options: [{ value: "", name: "None", tokens: [] }] }, { name: "Brand", options: [] }, { name: "Status", options: [] }];
    DATA.tokens.surface.options.forEach(function (o) {
      var l = look(o);
      var item = { value: o.value, name: SURFACE_NAME[o.value] || o.label || o.value, tokens: o.tokens, bg: l.bg, fg: l.fg };
      (/^brand/.test(o.value) ? groups[1] : /^(success|warning|danger|info)-/.test(o.value) ? groups[2] : groups[0]).options.push(item);
    });
    return groups.filter(function (g) { return g.options.length; });
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
    /* A line is drawn by its border, so its width and style show even before
       a colour is picked. */
    var lines = nodes.every(function (n) { return n.type === "Shape" && n.props.shape === "line"; });
    var shadowValues = nodes.map(function (n) { return n.style.elevation || ""; });
    var cornersOf = DATA.tokens.radius.sides || [];
    var hasRadius = nodes.some(function (n) { return n.style.radius || cornersOf.some(function (k) { return n.style[k]; }); });
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
    var surfaces = nodes.map(function (n) { return n.style.surface || ""; });
    var surfaceNow = same(surfaces) ? surfaces[0] : null;
    var darkToggle = headAction("moon", darkOn ? "Dark band: everything inside resolves dark. Press for inherit." : "Make this a dark band", function () { setStyle(ids, "dark", darkOn ? undefined : true); }, !!darkOn);
    return [
      sec("layer", "Layer", [
        e("div", { key: "blend", className: "bd-blend-row" },
          e("span", { className: "bd-field-label", id: lid }, "Blend"),
          e("span", { className: "bd-blend-now" }, blendNow === null ? "Mixed" : blendOpt ? blendOpt.label || blendOpt.value : "Normal"),
          tokenDropdown("blend", nodes, lid, { label: "Blend mode", noneLabel: "Normal", className: "bd-dd-icon bd-blend-dd", noPreview: true, icon: "swatch", iconOnly: true, compact: true, alignEnd: true,
            onPreview: function (v) { previewStyle(ids, "blend", v); } })),
        nodes.every(function (n) { return n.type === "Group" && n.style.bool; }) ? e(Field, { key: "bool", id: lid + "-bool", label: "Combine", hint: "Off shows the shapes as they are" },
          e(Dropdown, { labelledBy: lid + "-bool", value: same(nodes.map(function (n) { return n.style.bool; })) ? nodes[0].style.bool : null, mixed: !same(nodes.map(function (n) { return n.style.bool; })), className: "bd-dd-field", iconValue: true,
            options: DATA.tokens.bool.options.map(function (o) { return { value: o.value, label: o.label, icon: BOOL_ICON[o.value] }; }).concat([{ value: "", label: "Off", hint: "The shapes as they are, in a group" }]),
            onChange: function (v) { setStyle(ids, "bool", v || undefined); } })) : null,
        nodes.every(function (n) { return n.type === "Group"; }) ? e(Field, { key: "clip", id: lid + "-clip", label: "Clip content", hint: "Cuts off what reaches past its edge" },
          tokenDropdown("clip", nodes, lid + "-clip", { noneLabel: "Off", className: "bd-dd-field", noPreview: true })) : null,
        picturesOnly ? e(Field, { key: "invert", id: lid + "-inv", label: "Invert colours", inline: true, note: "Flips the picture to its negative" },
          e(Switch, { labelledBy: lid + "-inv", value: !!invValues[0], mixed: !same(invValues), onChange: function (v) { setStyle(ids, "invert", v ? "on" : undefined); } })) : null,
        free ? (function () {
          /* A role set before (or in a structured frame) shows as mixed
             until the slider replaces it. */
          var alphas = nodes.map(function (n) { return typeof n.style.alpha === "number" ? n.style.alpha : n.style.opacity ? null : 100; });
          var role = nodes.map(function (n) { return n.style.opacity; }).filter(Boolean)[0];
          return e(Field, { key: "opacity", id: lid + "-op", label: "Opacity", hint: role ? "Set to the " + role + " role. Moving the slider replaces it with a percent." : "Any whole percent. Arrows step 1%, Shift 10%; keys 1 to 9 set 10% to 90%, 0 makes it opaque" },
            e(OpacityField, { labelledBy: lid + "-op", value: same(alphas) && alphas[0] !== null ? alphas[0] : null, onChange: function (v) { setAlpha(ids, v); }, onLive: function (v, first) { setAlpha(ids, v, first); } }));
        })()
          : e(Field, { key: "opacity", id: lid + "-op", label: "Opacity", hint: "Keys 1 to 9 step it; 0 makes it opaque again" },
            tokenDropdown("opacity", nodes, lid + "-op", { label: "Opacity", noneLabel: "Opaque", className: "bd-dd-field", noPreview: true })),
      ], (function () {
        var hidden = nodes.every(function (n) { return n.hide; });
        return headAction(hidden ? "eyeOff" : "eye", hidden ? "Hidden: press to show (Ctrl+Shift+H)" : "Visible: press to hide (Ctrl+Shift+H)", actions.hide, hidden);
      })(), styled(nodes, ["blend", "invert", "opacity", "alpha", "clip", "bool"])),
      sec("fill", "Fill", [extra || null,
        e(SwatchField, { key: "fill", id: "bd-fill-" + first.id, label: "Fill", groups: surfaceGroups(), value: surfaceNow, mixed: surfaceNow === null, custom: free && !surfaceNow && fillHex ? fillHex : null,
          noneHint: "Takes the surface around it",
          onChange: function (v) { if (free) setStyles(ids, { surface: v || undefined, fill: undefined }); else setStyle(ids, "surface", v || undefined); } }),
        /* A gradient or a texture, over the fill. */
        e(Field, { key: "gradient", id: "bd-grad-" + first.id, label: "Gradient", hint: (function () { var g = tokenOption("gradient", nodes[0].style.gradient); return g ? g.tokens[0] : null; })() },
          tokenDropdown("gradient", nodes, "bd-grad-" + first.id, { noneLabel: "None", className: "bd-dd-field", noPreview: true,
            onPreview: function (v) { previewStyle(ids, "gradient", v); } })),
        free && textOnly ? e(Field, { key: "ink", id: "bd-ink-" + first.id, label: "Text colour", hint: inkHex ? "A custom colour, outside the system's text roles." : "From the system's text roles." },
          e("div", { className: "bd-canvas-row" },
            picker("color", inkHex, "Custom text colour"),
            inkHex ? e("button", { type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setStyle(ids, "color", undefined); } }, "Use the system's") : null)) : null,
      ], free ? e("span", { className: "bd-sec-acts" }, picker("fill", fillHex, "Custom fill colour", "surface"), darkToggle) : darkToggle, styled(nodes, ["surface", "fill", "color", "dark", "gradient"])),
      sec("border", "Border", hasBorder || lines ? [hasBorder ? tokenControl("border", nodes, "bd-t-" + first.id + "-border", "Colour") : null, borderLookRow(nodes, first.id)] : null,
        hasBorder ? headAction("minus", "Remove the border", function () { var p = { border: undefined, borderWidth: undefined, borderStyle: undefined }; sidesOf.forEach(function (k) { p[k] = undefined; }); setStyles(ids, p); })
          : headAction("plusSm", "Add a border", function () { setStyle(ids, "border", lines ? "strong" : "default"); }), hasBorder),
      /* Corners and shadow stay out of the way until they're added, as a
         border is. */
      /* Every corner from one menu, or each corner from its own. */
      sec("corners", "Corners", hasRadius
        ? tokenControl("radius", nodes, rid, "Radius")
        : null,
        hasRadius ? headAction("minus", "Remove the corners", function () { var p = { radius: undefined }; cornersOf.forEach(function (k) { p[k] = undefined; }); setStyles(ids, p); })
          : headAction("plusSm", "Add corners", function () { setStyle(ids, "radius", DATA.tokens.radius.options.some(function (o) { return o.value === "container"; }) ? "container" : DATA.tokens.radius.options[1].value); }), hasRadius),
      /* Blurs and the shadow together. The shadow waits behind its +, as a
         border does. */
      sec("effects", "Effects", [
        e("div", { key: "blurs", className: "bd-size-row bd-border-look" },
          tokenDropdown("blur", nodes, null, { label: "Layer blur", prefix: "Blur", noneLabel: "None", className: "bd-dd-field", noPreview: true, narrow: true }),
          tokenDropdown("backdrop", nodes, null, { label: "Background blur", prefix: "Behind", noneLabel: "None", className: "bd-dd-field", noPreview: true, narrow: true })),
        hasShadow
        ? e(Field, { key: "shadow", id: sid, label: "Elevation" },
            e(Segmented, { labelledBy: sid, wide: true, className: "bd-seg-pics", value: same(shadowValues) ? shadowValues[0] || undefined : null, onChange: function (v) { if (v) setStyle(ids, "elevation", v); },
              options: DATA.tokens.elevation.options.map(function (o) { return { value: o.value, label: "Elevation " + o.value + " (" + o.tokens[0] + ")", picture: e("span", { className: "bd-pv-shadow", style: { boxShadow: "var(" + o.tokens[0] + ")" } }) }; }) }))
        : null],
        hasShadow ? headAction("minus", "Remove the shadow", function () { setStyle(ids, "elevation", undefined); })
          : headAction("plusSm", "Add a shadow", function () { var opts = DATA.tokens.elevation.options; setStyle(ids, "elevation", (opts[1] || opts[0]).value); }), hasShadow || styled(nodes, ["blur", "backdrop"])),
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
          /* Where and how big, in one grid: X and Y, W and H, then the turn. */
          e("div", { className: "bd-grid2 bd-place-grid" },
            e(NumberField, { short: "X", label: "X position", value: same(xs) ? Math.round(xs[0] * unit) : "", onChange: function (v) { setStyles(ids, { x: Math.max(0, Math.min(FREE_MAX, Math.round(v / unit))) }); } }),
            e(NumberField, { short: "Y", label: "Y position", value: same(ys) ? Math.round(ys[0] * unit) : "", onChange: function (v) { setStyles(ids, { y: Math.max(0, Math.min(FREE_MAX, Math.round(v / unit))) }); } }),
            sizeGrid(nodes, "dims"),
            (function () {
              /* Its turn, in whole degrees: arrows step 1, Shift 15. */
              var rs = nodes.map(function (n) { return n.style.rot || 0; });
              return e(NumberField, { short: "↻", label: "Rotation, in degrees", value: same(rs) ? rs[0] : null, placeholder: "Mixed", signed: true, step: 1, bigStep: 15, min: -179, max: 180, unit: "°",
                title: "Rotation: whole degrees. Arrows step 1°, Shift 15°. On the canvas, drag just outside a corner.",
                onChange: function (v) { var deg = ((((v + 180) % 360) + 360) % 360) - 180; if (deg === -180) deg = 180; setStyles(ids, { rot: deg || undefined }); } });
            })())),
        pinsField(nodes, ids),
        e("button", { key: "flow", type: "button", className: "bd-btn bd-btn-sm", onClick: function () { setStyles(ids, { x: undefined, y: undefined, fw: undefined, fh: undefined, rot: undefined, flipH: undefined, flipV: undefined, ch: undefined, cv: undefined }); } }, "Put it in the flow"),
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

  /* A frame lays out what's in it as a Group does: direction, wrap,
     alignment, gap and padding, all from tokens. */
  var frameAuto = function () {
    var fl = frame.flow || {};
    var fdir = fl.direction || "column";
    var gapSpec = META.Group.props.filter(function (p) { return p.name === "gap"; })[0];
    var gapNow = fl.gap || frame.gap || "none";
    var a = fl.align || "stretch", j = fl.justify || "flex-start";
    return sec("frame-auto", "Auto layout", [
      e("div", { key: "head", className: "bd-flex-head" },
        e(Segmented, { label: "Direction", value: fdir, onChange: function (v) { if (v) setFlow({ direction: v }, frame.name + " runs in a " + v); },
          options: [{ value: "row", label: "Row", icon: "row" }, { value: "column", label: "Column", icon: "column" }] }),
        e("button", { type: "button", className: "bd-act", "aria-pressed": String(!!fl.wrap), title: fl.wrap ? "Wraps onto new lines" : "Stays on one line", "aria-label": "Wrap onto new lines",
          onClick: function () { setFlow({ wrap: fl.wrap ? undefined : true }); } }, e(Icon, { name: "wrapLines" }))),
      e("div", { key: "pad", className: "bd-flex-grid" },
        e(AlignMatrix, { dir: fdir, align: a, justify: j, onChange: function (na, nj) { setFlow({ align: na, justify: nj }); } }),
        e("div", { className: "bd-flex-side" },
          e(Dropdown, { label: "Gap", prefix: "Gap", value: gapNow, className: "bd-dd-field", narrow: true,
            options: gapSpec.options.map(function (o) { return { value: o, label: o === "none" ? "None" : o, hint: o === "none" ? undefined : DATA.rootGaps.indexOf(o) >= 0 ? "--dt-layout-" + (fdir === "row" ? "inline" : "stack") + "-" + o : (fdir === "row" ? "--dt-space-inline-" : "--dt-space-stack-") + o }; }),
            onChange: function (v) { setFlow({ gap: v === "none" ? undefined : v }); } }),
          e(Dropdown, { label: "Padding", prefix: "Padding", value: fl.padding || "", className: "bd-dd-field", narrow: true,
            options: [{ value: "", label: "None" }].concat(DATA.tokens.padding.options.map(function (o) { return { value: o.value, label: o.value, hint: o.tokens[0] }; })),
            onChange: function (v) { setFlow({ padding: v || undefined }); } }),
          e("button", { type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(a === "stretch"), title: "Children fill the cross axis",
            onClick: function () { setFlow({ align: a === "stretch" ? "flex-start" : "stretch" }); } }, e(Icon, { name: "alignStretch" }), "Stretch"),
          e("button", { type: "button", className: "bd-btn bd-btn-sm", "aria-pressed": String(j === "space-between"), title: "Spread children along the main axis",
            onClick: function () { setFlow({ justify: j === "space-between" ? "flex-start" : "space-between" }); } }, e(Icon, { name: "justifyBetween" }), "Space between"))),
    ]);
  };
  /* What spills past the frame's edges: clipped, or scrolled one way. A
     frame that hugs its content grows to fit, so neither applies. */
  var frameOverflow = function () {
    var scroll = frame.scroll || "none";
    return sec("frame-overflow", "Overflow", [
      e(Field, { key: "clip", id: "bd-fr-clip", label: "Clip content", hint: frame.hug ? "It hugs its content, so nothing spills. Fix its height to clip." : frame.clip ? "Whatever spills past the frame's edges is hidden." : "What spills past the frame's edges still shows." },
        e(Switch, { value: !!frame.clip, labelledBy: "bd-fr-clip", onChange: function (v) { setFrame("clip", v ? true : undefined, v ? frame.name + " clips its content" : frame.name + " lets its content spill"); } })),
      e(Field, { key: "scroll", id: "bd-fr-scroll", label: "Scroll", hint: frame.hug ? "It hugs its content, so it grows instead. Fix its height to scroll." : scroll === "y" ? "Content taller than the frame scrolls down." : scroll === "x" ? "Content wider than the frame scrolls sideways." : "Nothing scrolls." },
        e(Segmented, { labelledBy: "bd-fr-scroll", wide: true, value: scroll, onChange: function (v) { if (v) setFrame("scroll", v === "none" ? undefined : v, v === "none" ? frame.name + " doesn't scroll" : frame.name + " scrolls " + (v === "y" ? "vertically" : "horizontally")); },
          options: [{ value: "none", label: "None" }, { value: "y", label: "Vertical" }, { value: "x", label: "Horizontal" }] })),
    ]);
  };
  /* A social frame's shape: square, 4:3 or 16:9 at its width. One whose
     height matches none of them shows none pressed. */
  var SOCIAL_RATIOS = [["square", "Square", 1], ["4:3", "4:3", 3 / 4], ["16:9", "16:9", 9 / 16]];
  var frameRatio = function () {
    var now = frame.hug ? null : SOCIAL_RATIOS.filter(function (r) { return Math.abs(frame.height - Math.round(frame.width * r[2])) <= 1; })[0];
    return sec("frame-ratio", "Ratio", e(Field, { key: "ratio", id: "bd-fr-ratio", label: "Shape", hint: now ? frame.width + " × " + frame.height + ", " + now[1] + "." : "Pick one to set its height from its width, " + frame.width + "." },
      e(Segmented, { labelledBy: "bd-fr-ratio", wide: true, value: now ? now[0] : undefined,
        onChange: function (v) {
          var r = SOCIAL_RATIOS.filter(function (x) { return x[0] === v; })[0];
          if (!r) return;
          var h = Math.round(frame.width * r[2]);
          change(function (d) { sizeOn(active(d), active(d).width, h); keepPins(d, d.active); return undefined; }, frame.name + " is " + r[1] + ", " + frame.width + " by " + h);
        },
        options: SOCIAL_RATIOS.map(function (r) { return { value: r[0], label: r[1], title: r[1] + ": " + frame.width + " × " + Math.round(frame.width * r[2]) }; }) })));
  };
  var frameInspector = function () {
    var surfaceOptions = DATA.tokens.surface.options.map(function (o) { return { value: o.value, label: o.value, hint: o.tokens[0], tokens: o.tokens }; });
    var b = boxes[frame.id] || { h: frame.height };
    var preset = presetOf(frame);
    /* One panel: what kind of frame it is, how it looks, then its layout. */
    var look = [sec("frame-look", "Frame", [
          e(Field, { key: "fill", id: "bd-pg-surface", label: "Canvas", hint: frame.canvas ? "A custom colour, outside the system's surfaces. Pick a surface to go back." : frame.mode === "structured" ? "A structured page takes the system's surfaces only." : null },
            e("div", { className: "bd-canvas-row" + (frame.mode === "structured" && !frame.canvas ? " is-tokens" : "") },
              e(Dropdown, { labelledBy: "bd-pg-surface", value: frame.canvas ? "" : frame.surface, placeholder: "Custom", preview: "color", className: "bd-dd-field bd-dd-swatch",
                onChange: function (v) { change(function (d) { var f = active(d); f.surface = v || "base"; delete f.canvas; return undefined; }); }, options: surfaceOptions }),
              e(ColorPick, { value: frame.canvas, on: !!frame.canvas, label: "Custom canvas colour", onChange: function (v) { setFrame("canvas", v); } }))),
        ])];
    var body = [sec("frame-mode", "Kind", e(Field, { key: "mode", id: "bd-fr-kind", label: "Frame kind", hint: frame.mode === "structured" ? "Everything sits in auto-layout Groups, in the flow, with tokens only." : "Place things anywhere, in any colour." },
          e(Segmented, { labelledBy: "bd-fr-kind", wide: true, value: frame.mode === "structured" ? "structured" : "free", onChange: function (v) { if (v) setMode(v); },
            options: [{ value: "free", label: "Freeform" }, { value: "structured", label: "Structured" }] }))),
        frame.typeScale === "social" ? frameRatio() : null].concat(look, [
        sec("frame-flow", "Page layout", [
          e(Field, { key: "char", id: "bd-pg-char", label: "Layout character", hint: "Sets data-layout, which moves every layout layer token together." },
            e(Dropdown, { labelledBy: "bd-pg-char", value: frame.spacing, className: "bd-dd-field", onChange: function (v) { setFrame("spacing", v || ""); }, options: SPACINGS.map(function (s) { return { value: s[0], label: s[1] }; }) })),
          e(Field, { key: "type", id: "bd-pg-type", label: "Type scale", hint: frame.typeScale === "social" ? "data-type-scale=\"social\": body 2.5x, headings 2.75x, display 3x, for a 1080 post read in a feed." : "The page's own sizes." },
            e(Dropdown, { labelledBy: "bd-pg-type", value: frame.typeScale || "", className: "bd-dd-field", onChange: function (v) { setFrame("typeScale", v || undefined, v ? frame.name + " has social type" : frame.name + " has page type"); },
              options: [{ value: "", label: "Page", hint: "The system's sizes" }, { value: "social", label: "Social", hint: "Larger body, steeper headlines, for a 1080 artboard" }] })),
          e(Field, { key: "width", id: "bd-pg-width", label: "Page width", hint: frame.pageWidth ? "--dt-layout-page-width is the " + frame.pageWidth + " one on this page" : "--dt-layout-page-width: the column every Section, block and page-width Group reads. Configure moves it for every page." },
            e(Dropdown, { labelledBy: "bd-pg-width", value: frame.pageWidth || "", className: "bd-dd-field", onChange: function (v) { setFrame("pageWidth", v || undefined); },
              options: [{ value: "", label: "Page", hint: "--dt-layout-page-width" }, { value: "narrow", label: "Narrow", hint: "--dt-layout-page-width-narrow" }, { value: "wide", label: "Wide", hint: "--dt-layout-page-width-wide" }] })),
          e(Field, { key: "gutter", id: "bd-pg-gutter", label: "Page gutter", hint: "The room between the column and the screen's edge." },
            e(Dropdown, { labelledBy: "bd-pg-gutter", value: frame.gutter || "", className: "bd-dd-field", onChange: function (v) { setFrame("gutter", v || undefined); },
              options: [{ value: "", label: "Page", hint: "--dt-layout-page-gutter, which follows the layout character" }, { value: "wide", label: "Wide", hint: "--dt-space-gutter-wide" }, { value: "none", label: "None", hint: "Edge to edge" }] })),
          e(Field, { key: "cols", id: "bd-pg-cols", label: "Layout columns", hint: "How many View → Layout columns (Shift+G) lays over this frame, " + (frame.columns ? "set here." : "by its width; type a number to set it.") + " They sit in the page width, a --dt-space-gutter apart." },
            e("div", { className: "bd-size-row" },
              e(NumberField, { short: "#", label: "Layout columns", value: columnsOf(frame), min: 1, max: COLUMNS_MAX, step: 1, bigStep: 4,
                onChange: function (v) { var n = Math.max(1, Math.min(COLUMNS_MAX, Math.round(v || 0))); setFrame("columns", n, frame.name + " shows " + n + " columns"); if (!viewRef.current.columns) toggleView("columns", true); } }),
              e("button", { type: "button", className: cx("bd-act", canvasView.columns && "is-on"), "aria-pressed": String(!!canvasView.columns), title: (canvasView.columns ? "Hide" : "Show") + " layout columns (Shift+G)", onClick: function () { toggleView("columns"); } }, e(Icon, { name: canvasView.columns ? "eye" : "eyeOff" })))),
        ]),
        frameAuto(),
        frameOverflow()]);
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
      e("div", { className: "bd-ipanel" }, body));
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
        e("p", { className: "bd-inspect-sub" }, kbd("The heading " + nameOf(node) + " draws. Its words and size are the block's own props; Shift+Up and Shift+Down step the size."))),
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
    /* Properties holds everything the component has of its own: its
       content, its style options and its arrangement. A container's auto
       layout is the same on every container, so it stays under Layout. */
    var arrange = !meta.container && flex && flex.filter(Boolean).length ? flex : null;
    var propNames = function (t) { return byTab(t).map(function (p) { return p.name; }).concat(t === "content" && hasText ? ["children"] : []).concat(t === "layout" && first.type === "Grid" ? ["minColumnWidth"] : []); };
    /* One panel, top to bottom: what it is and says, how it's laid out and
       placed, how it looks, then its spacing. A free layer's W and H sit
       with its X and Y. */
    var placedFree = frame.mode !== "structured" && nodes.every(function (n) { return isFree(n.style); });
    var body = [
      contentRows.length ? sec("content", "Content", contentRows, null, propsSet(nodes, propNames("content"))) : null,
      styleRows.length ? sec("props-style", "Style", styleRows, null, propsSet(nodes, propNames("appearance"))) : null,
      arrange ? sec("props-arrange", "Arrangement", arrange, null, propsSet(nodes, propNames("layout"))) : null,
      meta.container && flex && flex.filter(Boolean).length ? sec("flex", first.type === "Grid" ? "Grid layout" : flex[0] || flex[1] ? "Auto layout" : "Arrangement", flex, null, propsSet(nodes, propNames("layout"))) : null,
      sec("position", "Position", positionRows(nodes), null, styled(nodes, ["position", "anchor", "offset", "x", "y"].concat(placedFree ? ["fw", "fh", "rw", "rh", "rot"] : []))),
      sec("size", "Size", placedFree ? [textBoxRow(nodes), sizeGrid(nodes, "mins")] : [textBoxRow(nodes), sizeGrid(nodes), selfRow(nodes)], null, styled(nodes, placedFree ? ["minW", "h"] : ["w", "minW", "height", "h", "self", "fw", "fh", "rw", "rh"])),
    ].concat(lookSections(nodes, null), [
      sec("spacing", "Spacing", boxModel(nodes), null, styled(nodes, SPACING_KEYS)),
    ]);
    var title = many ? nodes.length + " " + (sameType ? first.type + (first.type.endsWith("s") ? "" : "s") : "items") : null;
    var arrangeTools = arrangeRow(nodes);
    return e("div", { className: "bd-inspect" },
      e("div", { className: "bd-inspect-head" },
        e("div", { className: "bd-head-row" },
          e("h2", { className: "bd-inspect-title" }, e(Icon, { name: (!many && first.inst) || !sameType ? "component" : typeIcon(first.type) }),
            many ? title : first.type !== "Slot"
              ? e(Renamable, { value: first.name || first.type, label: "Layer name", focusable: true, className: "bd-title-name", startEditing: isRenaming(first.id, "title"), onChange: function (v) { setRenaming(null); setName(first.id, v === first.type ? "" : v); } })
              : nameOf(first)),
          /* Everything a selection can do, in one menu, so a long name has
             the row to itself. */
          e("div", { className: "bd-head-actions" },
            /* What it is, as a tooltip, and its docs when it has them. */
            (function () {
              var about = many ? (sameType ? "Changes apply to all of them. Mixed means they differ." : "Different components: size, spacing and appearance apply to all of them.") : meta.blurb ? meta.blurb + "." : "";
              if (!about) return null;
              var href = !many && meta.href;
              return e(href ? "a" : "span", { className: "bd-act bd-act-ghost bd-about", href: href || undefined, title: about + (href ? " Open the docs." : ""), "aria-label": href ? about + " Docs" : about, role: href ? undefined : "img" }, e(Icon, { name: "info" }));
            })(),
            e(Dropdown, { menu: true, label: "Actions for " + (many ? title : nameOf(first)), placeholder: "Actions", icon: "more", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon bd-layer-menu",
              options: [!many && first.type === "Group" ? { value: "ungroup", label: "Ungroup", hint: "Ctrl+Shift+G", icon: "group" } : { value: "group", label: "Group", hint: "Ctrl+G", icon: "group" }]
                .concat(WRAPS.filter(function (w) { return placeable == null || placeable[w]; }).map(function (w) { return { value: "wrap:" + w, label: "Wrap in " + w, icon: typeIcon(w) }; }))
                .concat(!many && CONVERTS.indexOf(first.type) >= 0
                  ? CONVERTS.filter(function (t) { return t !== first.type && (placeable == null || placeable[t] || t === "Group"); }).map(function (t) { return { value: "turn:" + t, label: "Turn into " + t, icon: typeIcon(t) }; })
                    .concat([{ value: "turn:frame", label: "Turn into a frame", icon: "frame" }])
                  : [])
                .concat(!many && detachable[first.type] ? [{ value: "detach", label: "Detach into primitives", icon: "detach" }] : [])
                .concat(!many ? [{ value: "link", label: "Copy link to this layer", icon: "link" }, { value: "same", label: "Select all " + first.type + (first.type.endsWith("s") ? "" : "s"), icon: "layers2" }] : [])
                .concat([{ value: "copyStyle", label: "Copy style", hint: "Ctrl+Alt+C", icon: "swatch" }, { value: "pasteStyle", label: "Paste style", hint: "Ctrl+Alt+V", icon: "swatch", disabled: !styleClip.current }])
                .concat([{ value: "component", label: "Create component", hint: "Ctrl+Alt+K", icon: "component" }])
                .concat([{ value: "hide", label: nodes.every(function (n) { return n.hide; }) ? "Show" : "Hide", hint: "Ctrl+Shift+H", icon: nodes.every(function (n) { return n.hide; }) ? "eye" : "eyeOff" },
                  { value: "lock", label: nodes.every(function (n) { return n.lock; }) ? "Unlock" : "Lock", hint: "Ctrl+Shift+L", icon: nodes.every(function (n) { return n.lock; }) ? "lockOpen" : "lock" }]),
              onChange: function (v) {
                if (v === "group") actions.group();
                else if (v === "ungroup") actions.ungroup();
                else if (v.indexOf("wrap:") === 0) actions.wrap(v.slice(5));
                else if (v.indexOf("turn:") === 0) actions.convert(v.slice(5));
                else if (v === "detach") actions.detach();
                else if (v === "link") share(first.id);
                else if (v === "component") openComponent();
                else if (v === "hide") actions.hide();
                else if (v === "lock") actions.lock();
                else if (v === "same") selectSame();
                else if (v === "copyStyle") copyStyle();
                else if (v === "pasteStyle") pasteStyle();
              } }))),
        !many && first.inst ? instanceRow(first) : null,
        arrangeTools),
      e("div", { className: "bd-ipanel" }, body));
  };

  /* ------------------------------------------------- layout */

  var selectedNodes = nodesOf(selection);
  /* The person's own edits since the assistant's last reply, shown above
     the message box while the panel is open. */
  var asEditsNow = useMemo(function () {
    var b = asBase.current;
    if (left !== "assistant" || asBusy || !b || b.page !== pageId) return null;
    var got = recentEdits(b.doc, doc);
    return got.count ? got : null;
  }, [doc, left, asBusy, pageId, asBaseTick[0]]);
  var savedTitle = "This browser won't keep your work (a private window, blocked storage, or too many uploads). Use Share or Code to keep it.";
  var hidePanels = wide && (bare || preview);
  hidePanelsRef.current = hidePanels;
  var leftClosed = wide && panels.leftClosed, rightClosed = wide && panels.rightClosed;
  /* A folded left panel is as wide as its rail; measure it once it's folded,
     so the tool bar centres and a drag back out starts from there. */
  useEffect(function () {
    if (!leftClosed || !leftPanelRef.current) return;
    var shell = leftPanelRef.current.parentNode;
    var w = Math.round(leftPanelRef.current.getBoundingClientRect().right - shell.getBoundingClientRect().left);
    if (w > 0 && w !== railW) setRailW(w);
  }, [leftClosed, wide, home]);
  var zoomText = zoomPct + "%";

  /* The middle of the bar says where you are: the project, and with
     something selected, the path down to it. The project's name renames on
     a double-click; each step of the path selects. */
  var titleCrumbs = function () {
    var sep = function (k) { return e("span", { key: "s" + k, className: "bd-crumb-sep", "aria-hidden": true }, "›"); };
    var crumbs = [e(Renamable, { key: "project", className: "bd-project-name bd-crumb", value: project.name, label: "File name", hint: "Double-click to rename this file", focusable: true, onChange: function (v) { renameProject(project.id, v); } })];
    /* A file in a project names it first; it opens that project on Home. */
    var inGroup = project.group ? groupById(project.group) : null;
    if (inGroup) crumbs.unshift(e("button", { key: "group", type: "button", className: "bd-crumb bd-tb-group", title: "Open " + inGroup.name + " on Home", onClick: function () { openProjects(inGroup.id); } }, inGroup.name), sep("group"));
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
    e("div", { className: "bd-tb-title" }, e("span", { className: "bd-tb-home" }, homeView && groupById(homeView) ? groupById(homeView).name : "Home")),
    e("span", { className: "bd-tb-side bd-tb-right" },
      e("button", { type: "button", className: "bd-btn bd-home-back", onClick: closeProjects, title: "Back to the canvas (Esc)" }, e(Icon, { name: "left" }), e("span", { className: "bd-home-back-text" }, "Back to " + project.name))));
  var workBar = e("div", { className: "bd-toolbar", role: "toolbar", "aria-label": "Builder" },
    e("span", { className: "bd-tb-side bd-tb-left" }),
    e("div", { className: "bd-tb-title bd-project" },
      titleCrumbs(),
      e(Dropdown, { menu: true, label: "File actions", placeholder: "File", icon: "more", iconOnly: true, compact: true, narrow: true, className: "bd-dd-icon bd-project-menu",
        options: [
          { value: "link", label: sel ? "Copy link to this layer" : "Copy link to " + frame.name, icon: "link" },
          { value: "projects", label: "Home", icon: "home" },
          { value: "mode", label: dark ? "Light mode" : "Dark mode", icon: dark ? "sun" : "moon", hint: "The builder's own tools" },
          { value: "versions", label: "Versions", icon: "rotate" },
          { value: "keys", label: "Keyboard shortcuts", icon: "sliders", hint: "?" },
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
          else if (v === "mode") setDark(!dark);
          else if (v === "versions") openVersions();
          else if (v === "keys") openKeys();
          else if (v === "duplicate") duplicateProject(project.id);
          else if (v === "export") exportProject(project.id);
          else if (v === "import" || v === "blank") startFrom(v);
        } })),
    e("span", { className: "bd-tb-side bd-tb-right" },
      /* What the canvas shows and snaps to: its own button, beside zoom. */
      e(Dropdown, { menu: true, label: "View", placeholder: "View", icon: "layout", iconOnly: true, compact: true, narrow: true, alignEnd: true, className: "bd-dd-icon bd-view-menu",
        options: [
          { value: "rulers", label: "Rulers", hint: "Shift+R", checked: !!canvasView.rulers, group: "Show" },
          { value: "guides", label: "Guides", hint: frame.guides && frame.guides.length ? frame.guides.length + " on " + frame.name : "Drag one out of a ruler", checked: !!canvasView.guides, group: "Show" },
          { value: "columns", label: "Layout columns", hint: (frame.bare ? "Shift+G" : columnsOf(frame) + " on " + frame.name + ", Shift+G"), checked: !!canvasView.columns, group: "Show" },
          { value: "snapObjects", label: "Snap to objects", hint: "Hold Ctrl to skip", checked: canvasView.snapObjects !== false, group: "Snap" },
          { value: "snapGuides", label: "Snap to guides", checked: canvasView.snapGuides !== false, group: "Snap" },
        ].concat(frame.guides && frame.guides.length ? [{ value: "clear", label: "Clear guides on " + frame.name, icon: "trash", group: "Guides", danger: true }] : []),
        onChange: function (v) { if (v === "clear") clearGuides(frame.id); else if (VIEW_SAYS[v]) toggleView(v); } }),
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
  /* Handles on the selected object: a drag sets its width and height to
     the nearest size tokens (never raw pixels), live, as one undo step.
     On a free object the top and left edges move it as they go, and
     Shift on a corner keeps its shape. */
  var startNodeResize = function (ev, id, dir) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    releaseFocus();
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    var f = api(), r0 = f && f.rect ? f.rect(id) : null, at0 = locate(docRef.current, id);
    if (!r0 || !at0) return;
    var z = camRef.current.z;
    var unit = (f.measure && f.measure(["var(--dt-space-inset-2xs)"])[0]) || 4;
    var free = isFree(at0.node.style), x0 = at0.node.style.x, y0 = at0.node.style.y;
    var start = { x: ev.clientX, y: ev.clientY };
    var first = true, last = "";
    var corner = /[ns]/.test(dir) && /[ew]/.test(dir);
    var horiz = /[ew]/.test(dir), vert = /[ns]/.test(dir);
    setSizing({ id: id, dir: dir });
    /* On a free canvas: any multiple of 4px, the opposite side held where it
       is, turned or not. */
    var sz = free && f.size ? f.size(id) : null;
    var W0 = sz ? sz.width : r0.width, H0 = sz ? sz.height : r0.height;
    var turn = ((at0.node.style.rot || 0) * Math.PI) / 180, cos = Math.cos(turn), sin = Math.sin(turn);
    var ax = /e/.test(dir) ? 0 : /w/.test(dir) ? 1 : 0.5, ay = /s/.test(dir) ? 0 : /n/.test(dir) ? 1 : 0.5;
    var C0 = { x: x0 * unit + W0 / 2, y: y0 * unit + H0 / 2 };
    var moveFree = function (mv) {
      var dx = (mv.clientX - start.x) / z, dy = (mv.clientY - start.y) / z;
      var du = dx * cos + dy * sin, dv = -dx * sin + dy * cos;
      /* Alt grows it from its centre, both sides at once. */
      var both = mv.altKey ? 2 : 1;
      var w = W0 + (/e/.test(dir) ? du : /w/.test(dir) ? -du : 0) * both;
      var h = H0 + (/s/.test(dir) ? dv : /n/.test(dir) ? -dv : 0) * both;
      if (corner && mv.shiftKey) { var k = H0 / W0; if (Math.abs(du) >= Math.abs(dv)) h = w * k; else w = h / k; }
      var fw = Math.max(1, Math.min(FREE_MAX, Math.round(w / unit))), fh = Math.max(1, Math.min(FREE_MAX, Math.round(h / unit)));
      var W = horiz ? fw * unit : W0, H = vert ? fh * unit : H0;
      var a = (mv.altKey ? 0 : ax - 0.5) * (W0 - W), b = (mv.altKey ? 0 : ay - 0.5) * (H0 - H);
      var cx = C0.x + a * cos - b * sin, cy = C0.y + a * sin + b * cos;
      var xs = Math.max(0, Math.min(FREE_MAX, Math.round((cx - W / 2) / unit))), ys = Math.max(0, Math.min(FREE_MAX, Math.round((cy - H / 2) / unit)));
      /* Pulled past the canvas's top or left edge, it stops there and the
         far side still holds. */
      if (!turn && !mv.altKey && /w/.test(dir) && xs === 0) { fw = Math.max(1, Math.round((x0 * unit + W0) / unit)); W = fw * unit; }
      if (!turn && !mv.altKey && /n/.test(dir) && ys === 0) { fh = Math.max(1, Math.round((y0 * unit + H0) / unit)); H = fh * unit; }
      setReadout({ x: mv.clientX, y: mv.clientY, text: Math.round(W) + " × " + Math.round(H) });
      var key = [horiz && fw, vert && fh, xs, ys].join("|");
      if (key === last) return;
      last = key;
      var fn = function (d) {
        var at = locate(d, id);
        if (!at) return null;
        var st = at.node.style;
        if (horiz) { st.fw = fw; delete st.w; delete st.rw; }
        if (vert) { st.fh = fh; delete st.height; delete st.rh; }
        st.x = xs;
        st.y = ys;
        return undefined;
      };
      if (first) { first = false; change(fn); } else quiet(fn);
    };
    var move = function (mv) {
      if (free) return moveFree(mv);
      var dx = (mv.clientX - start.x) / z, dy = (mv.clientY - start.y) / z;
      var w = r0.width, h = r0.height;
      if (/e/.test(dir)) w = r0.width + dx; else if (/w/.test(dir)) w = r0.width - dx;
      if (/s/.test(dir)) h = r0.height + dy; else if (/n/.test(dir)) h = r0.height - dy;
      if (corner && mv.shiftKey) { var k = r0.height / r0.width; if (Math.abs(dx) >= Math.abs(dy)) h = w * k; else w = h / k; }
      var tw = horiz ? sizeNear("w", Math.max(8, w), false, true, [at0.node]) : null;
      var th = vert ? sizeNear("height", Math.max(8, h), false, true, [at0.node]) : null;
      if (!tw && !th) return;
      var wpx = tw ? pxMap["w|" + tw] : r0.width, hpx = th ? pxMap["height|" + th] : r0.height;
      setReadout({ x: mv.clientX, y: mv.clientY, text: Math.round(wpx) + " × " + Math.round(hpx) });
      var key = [tw, th].join("|");
      if (key === last) return;
      last = key;
      var fn = function (d) {
        var at = locate(d, id);
        if (!at) return null;
        if (tw) at.node.style.w = tw;
        if (th) at.node.style.height = th;
        return undefined;
      };
      if (first) { first = false; change(fn); } else quiet(fn);
    };
    var up = function () {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setSizing(null);
      setReadout(null);
      if (first) return;
      var n = locate(docRef.current, id);
      if (!n) return;
      var st = n.node.style;
      announce(nameOf(n.node) + (st.fw ? " is " + st.fw * 4 + " wide" : st.w ? " is " + st.w + " wide" : "") + (st.fh ? ", " + st.fh * 4 + " tall" : st.height ? ", " + st.height + " tall" : ""));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  /* Turning a free layer: from just outside a corner, about its centre,
     in whole degrees; Shift snaps to 15°. */
  var startRotate = function (ev, id) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    releaseFocus();
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    var at0 = locate(docRef.current, id), box = ev.currentTarget.parentElement.getBoundingClientRect();
    if (!at0) return;
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    var a0 = Math.atan2(ev.clientY - cy, ev.clientX - cx), rot0 = at0.node.style.rot || 0;
    var first = true, last = rot0;
    setSizing({ id: id, dir: "rotate" });
    var move = function (mv) {
      var deg = rot0 + ((Math.atan2(mv.clientY - cy, mv.clientX - cx) - a0) * 180) / Math.PI;
      deg = mv.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
      deg = ((((deg + 180) % 360) + 360) % 360) - 180;
      if (deg === -180) deg = 180;
      setReadout({ x: mv.clientX, y: mv.clientY, text: deg + "°" });
      if (deg === last) return;
      last = deg;
      var fn = function (d) { var at = locate(d, id); if (!at) return null; if (deg) at.node.style.rot = deg; else delete at.node.style.rot; return undefined; };
      if (first) { first = false; change(fn); } else quiet(fn);
    };
    var up = function () {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setSizing(null);
      setReadout(null);
      if (!first) announce("Turned to " + last + "°");
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  /* Every selection shows a dot at each corner; the edges between take a
     drag without one. In the flow, a pull on the left or top edge sizes it
     the same as the right or bottom. */
  var HANDLES_FREE = ["nw", "n", "ne", "e", "se", "s", "sw", "w"], HANDLES_FLOW = HANDLES_FREE;

  var startResize = function (ev, f, edge) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    releaseFocus();
    /* Captured, so the pointer stays with the handle over the frames. */
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
    var b = layoutRef.current.boxes[f.id];
    var z = camRef.current.z;
    /* Any edge or corner: r, b and c (the bottom-right corner) as before,
       and l and t, which move the frame's left or top edge and hold its
       right or bottom where it is. */
    if (edge === "c") edge = "rb";
    var R = edge.indexOf("r") >= 0, L = edge.indexOf("l") >= 0, B = edge.indexOf("b") >= 0, T = edge.indexOf("t") >= 0;
    var start = { x: ev.clientX, y: ev.clientY, w: f.bare ? Math.round(b.w) : f.width, h: b.h, bx: b.x, by: b.y };
    var cur = null;
    /* A structured page lands on a viewport size; a freeform canvas takes any. */
    var lo = f.bare ? MIN_FREE : minSide(f), snaps = f.mode === "structured";
    var fit = function (v, list) { return snaps ? snapSide(v, list, f.hug, 16 / z) : Math.round(v); };
    var move = function (mv) {
      var dx = (mv.clientX - start.x) / z, dy = (mv.clientY - start.y) / z;
      var ddx = L ? -dx : dx, ddy = T ? -dy : dy;
      var horiz = R || L, vert = B || T;
      var w = !horiz ? start.w : Math.max(lo, Math.min(MAX_WIDTH, fit(start.w + ddx, VIEW_W)));
      var h = !vert ? null : Math.max(lo, Math.min(MAX_HEIGHT, fit(start.h + ddy, VIEW_H)));
      /* Proportions kept: the edge pulled leads, the other side follows. */
      if (f.lock) {
        var k = start.h / start.w;
        if (!horiz) w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(h / k)));
        else if (!vert) h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(w * k)));
        else if (Math.abs(ddx) >= Math.abs(ddy)) { w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(start.w + ddx))); h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(w * k))); }
        else { h = Math.max(lo, Math.min(MAX_HEIGHT, Math.round(start.h + ddy))); w = Math.max(lo, Math.min(MAX_WIDTH, Math.round(h / k))); }
      }
      cur = { fid: f.id, w: w, h: h };
      if (L) cur.x = Math.round(start.bx + start.w - w);
      if (T && h != null) cur.y = Math.round(start.by + start.h - h);
      if (cur.x != null || cur.y != null) { if (cur.x == null) cur.x = start.bx; if (cur.y == null) cur.y = start.by; }
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
        var boxesNow = layoutRef.current.boxes;
        change(function (d) {
          var fr = frameById(d, f.id);
          if (!fr) return null;
          /* A moved left or top edge places the frame; the others keep their
             spots too, as when a frame is dragged. */
          if (done.x != null) {
            d.frames.forEach(function (o) { if (typeof o.x !== "number" && boxesNow[o.id]) { o.x = Math.round(boxesNow[o.id].x); o.y = Math.round(boxesNow[o.id].y); } });
            fr.x = done.x; fr.y = done.y;
          }
          fr.width = done.w;
          if (fr.bare) { fr.sized = true; d.active = f.id; return undefined; }
          if (done.h != null) { fr.height = done.h; fr.hug = false; }
          keepPins(d, f.id);
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

  var isBackground = function (t) { return t === stageRef.current || (t.classList && (t.classList.contains("bd-world") || t.classList.contains("bd-labels"))); };
  var frameSrc = mountEl.getAttribute("data-frame");
  var anyReady = doc.frames.some(function (f) { return ready[f.id]; });

  var stageDark = stageColor && (function (h) { var r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b2 = parseInt(h.slice(5, 7), 16); return (0.2126 * r + 0.7152 * g + 0.0722 * b2) / 255 < 0.5; })(stageColor);
  /* What the stage's pieces (Stage.js) draw from; they read the camera themselves. */
  var worldProps = { box: box, boxes: boxes, doc: doc, frameEls: frameEls, frameReady: frameReady, frameSrc: frameSrc, liveRef: liveRef };
  var labelsProps = { boxes: boxes, doc: doc, frameMenu: frameMenu, frameOn: frameOn, frameOps: frameOps, isRenaming: isRenaming, justDragged: justDragged, preview: preview, sel: sel, setRenaming: setRenaming, sizeText: sizeText, startFrameMove: startFrameMove };
  var viewProps = { boxes: boxes, canvasView: canvasView, colInfo: colInfo, doc: doc, guideDrag: guideDrag, preview: preview, startGuide: startGuide };
  var rulersProps = { RULER: RULER, box: box, boxes: boxes, canvasView: canvasView, frame: frame, guideDrag: guideDrag, insets: insets, marksRaw: marksRaw, preview: preview, startGuide: startGuide, wide: wide };
  var marksProps = { HANDLES_FLOW: HANDLES_FLOW, HANDLES_FREE: HANDLES_FREE, boxes: boxes, doc: doc, dupFrame: dupFrame, edit: edit, frame: frame, frameOn: frameOn, marksRaw: marksRaw, marquee: marquee, openMenu: openMenu, part: part, preview: preview, sel: sel, sizing: sizing, startDrag: startDrag, startNodeResize: startNodeResize, startRotate: startRotate };
  var spacingProps = { boxes: boxes, openToken: openToken, spacing: spacing };
  var editorProps = { boxes: boxes, edit: edit, editChange: editChange, editDone: editDone };
  var resizersProps = { HANDLES_FREE: HANDLES_FREE, boxes: boxes, doc: doc, frameOn: frameOn, resizing: resizing, sel: sel, sizeName: sizeName, startResize: startResize };
  var stage = e("div", {
    className: cx("bd-stage", drag && "is-dragging", sizing && "is-sizing", (space || panning || tool === "hand") && "is-panning", preview && "is-preview", stageDark && "is-dark"), ref: stageRef,
    style: stageColor ? { backgroundColor: stageColor } : undefined,
    onPointerDown: function (ev) {
      if (!isBackground(ev.target) && !spaceRef.current && ev.button !== 1) return;
      if (ev.button === 2) return;
      ev.preventDefault();
      releaseFocus();
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* not capturable */ }
      if (ev.button === 0 && ev.pointerType !== "touch" && !spaceRef.current && tool === "select" && !previewRef.current && !marqRef.current) { marqueeStart(ev); return; }
      gesture("down", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
    },
    onPointerMove: function (ev) {
      if (marqRef.current && marqRef.current.id === ev.pointerId) { marqueeMove(ev); return; }
      if (gest.current.pts[ev.pointerId]) gesture("move", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
    },
    onPointerUp: function (ev) {
      if (marqRef.current && marqRef.current.id === ev.pointerId) {
        if (!marqueeEnd(true)) { select([]); setFrameOn(false); if (editRef.current) editDone(true); }
        return;
      }
      if (!gest.current.pts[ev.pointerId]) return;
      var moved = gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
      if (!moved && isBackground(ev.target) && !spaceRef.current) { select([]); setFrameOn(false); if (editRef.current) editDone(true); }
    },
    onPointerCancel: function (ev) {
      if (marqRef.current && marqRef.current.id === ev.pointerId) { marqueeEnd(false); return; }
      if (gest.current.pts[ev.pointerId]) gesture("up", ev.pointerId, ev.clientX, ev.clientY, ev.pointerType, null);
    },
    onContextMenu: function (ev) { if (!previewRef.current && isBackground(ev.target)) { ev.preventDefault(); openMenu(ev.clientX, ev.clientY, null); } },
  },
    e(World, worldProps),
    e(Labels, labelsProps),
    e(ViewMarks, viewProps),
    e(Marks, marksProps),
    e(SpacingLines, spacingProps),
    !preview && tool === "hand" ? e("div", Object.assign({ className: "bd-draw is-hand" }, handHandlers)) : null,
    !preview ? e(Resizers, resizersProps) : null,
    e(Rulers, rulersProps),
    !preview ? tools : null,
    e(EditorAt, editorProps),
    preview ? e("button", { type: "button", className: "bd-float bd-float-center", onClick: actions.preview, title: "Back to editing (Esc)" }, e(Icon, { name: "eye" }), "Previewing", e("span", { className: "bd-float-sep", "aria-hidden": true }), "Edit") : null,
    anyReady ? null : e("p", { className: "bd-stage-loading" }, "Loading the canvas…"));

  /* Play: the frame through a screen-sized window. It scrolls inside, so
     sticky, pinned and floating items behave as they would on a device. */
  var openPlay = function () { setPlay({ fid: frame.id, h: playDefault(frame.width), stack: [], home: { page: pageRef.current, fid: frame.id } }); };
  /* Play follows a link to another page: that page opens (as it would on
     the canvas) and its active frame fills the screen; Back retraces. */
  var playGo = function (pageId) {
    var p = playRef.current && playRef.current.open ? play : null;
    if (!p || !pagesOf(projectRef.current).some(function (pg) { return pg.id === pageId; })) return;
    var from = { page: pageRef.current, fid: p.fid };
    if (pageId === pageRef.current) return;
    openPage(pageId).then(function () {
      setPlay(function (q) { return q ? Object.assign({}, q, { fid: docRef.current.active, stack: (q.stack || []).concat([from]) }) : q; });
    });
  };
  var playGoRef = useRef(playGo); playGoRef.current = playGo;
  var playBack = function () {
    var p = play;
    if (!p || !p.stack || !p.stack.length) return;
    var prev = p.stack[p.stack.length - 1], rest = p.stack.slice(0, -1);
    var done = function () { setPlay(function (q) { return q ? Object.assign({}, q, { fid: frameById(docRef.current, prev.fid) ? prev.fid : docRef.current.active, stack: rest }) : q; }); };
    if (prev.page === pageRef.current) done(); else openPage(prev.page).then(done);
  };
  /* Keys pressed inside the Play screen: Escape closes, Backspace and
     Alt+Left go back. */
  var playKey = function (key, alt) {
    var el = playRef.current;
    if (!play || !el || !el.open) return false;
    if (key === "Escape") { el.close(); return true; }
    if (key === "Backspace" || (alt && key === "ArrowLeft")) { if (play.stack && play.stack.length) playBack(); return true; }
    return false;
  };
  var playKeyRef = useRef(playKey); playKeyRef.current = playKey;
  /* Closing Play goes back to the page it started on. */
  var playClosed = function () {
    var home = play && play.home;
    setPlay(null);
    if (home && home.page !== pageRef.current) openPage(home.page);
  };
  var renderPlay = function () {
    var el = playFrameRef.current;
    var fr = play && frameById(docRef.current, play.fid);
    var a = null;
    try { a = el && el.contentWindow && el.contentWindow.BuilderFrame; } catch (err) { a = null; }
    if (a && fr) a.render({ page: { dark: fr.dark, surface: fr.surface, canvas: fr.canvas, spacing: fr.spacing, gap: fr.gap, typeScale: fr.typeScale, pageWidth: fr.pageWidth, gutter: fr.gutter, flow: fr.flow, clip: fr.clip, scroll: fr.scroll }, root: fr.root }, { preview: true, hug: false });
  };
  useEffect(function () { if (play) renderPlay(); }, [play && play.fid, doc]);

  /* Nothing picked, not even a frame: the builder's own settings. */
  var STAGE_SWATCHES = [["", "Default"], ["#ffffff", "White"], ["#e7e7ea", "Light grey"], ["#3a3a40", "Dark grey"], ["#141416", "Black"]];
  /* What the project uses, for the inspector when nothing is selected: the
     page on screen, live, with the project's other pages read from the store. */
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
    var onlyUsed = false;
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
        /* Nothing selected: the primitives and styles the system offers.
           Variables live in the left panel's Assets, with the choice of this
           project's or all of them. */
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
  /* The dialogs (dialogs.js) are memoized, so what they take keeps one
     identity across renders: handlers through useEvent, the component
     draft's node remembered until the draft, document or selection change. */
  var closeShown = useEvent(function () { setShown(null); });
  var closeComponent = useEvent(function () { setCompDraft(null); });
  var onKeepVersion = useEvent(keepVersion), onRestoreVersion = useEvent(restoreVersion);
  var onSaveComponent = useEvent(saveComponent), onFixComponent = useEvent(fixComponent);
  var onImportLayout = useEvent(importLayout);
  var onCopyCode = useEvent(function () { copyText(code).then(function () { announce("Code copied"); }); });
  var onExportImage = useEvent(function (type) { exportImage(frame.id, type, { scale: exportScale, id: codePick }); });
  var onCopyLayout = useEvent(copyLayout), onShare = useEvent(function () { share(); });
  var onDownloadProject = useEvent(downloadProjectCode);
  var onPlayClosed = useEvent(playClosed), onPlayBack = useEvent(playBack), onRenderPlay = useEvent(renderPlay);
  var compNode = useMemo(function () { return compDraft ? componentSource() : null; }, [compDraft, doc, selection]);
  var playPage = play ? pagesOf(project).filter(function (pg) { return pg.id === pageId; })[0] : null;
  var playPageName = playPage && pagesOf(project).length > 1 ? playPage.name : null;

  /* Home (Home.js) is memoized too, so its handlers go through useEvent. */
  var homeSetSort = useEvent(setHomeSort), homeGoView = useEvent(goHomeView), homeSetDark = useEvent(setDark);
  var homeOpen = useEvent(openProject), homeRename = useEvent(renameProject), homeDuplicate = useEvent(duplicateProject), homeDelete = useEvent(deleteProject);
  var homeMove = useEvent(moveFile), homeExport = useEvent(exportProject), homeImport = useEvent(importProject);
  var homePicture = useEvent(function (who, f) { if (who.indexOf("g:") === 0) setGroupPicture(who.slice(2), f); else setPicture(who, f); });
  var homeRenameGroup = useEvent(renameGroup), homeDuplicateGroup = useEvent(duplicateGroup), homeExportGroup = useEvent(exportGroup), homeDeleteGroup = useEvent(deleteGroup);
  var homeAutoPicture = useEvent(function (id) { store.setGroupThumb(id, null).then(refreshProjects); });
  var homeNewGroup = useEvent(newGroup), homeNewProject = useEvent(newProject), homeNewPlayground = useEvent(newPlayground), homeOpenAccount = useEvent(openAccount);

  /* Layers (Layers.js) is memoized: handlers through useEvent, data as it is. */
  var onPick = useEvent(pick), onOpenMenu = useEvent(openMenu), onStartDrag = useEvent(startDrag), onSetName = useEvent(setName), onFlagLayer = useEvent(flagLayer);
  var onFramePick = useEvent(function (fid, v) { frameOps.pick(fid, v); }), onFrameRename = useEvent(function (fid, v) { frameOps.rename(fid, v); }), onAnatomy = useEvent(anatomyOf);
  var layersProps = { doc: doc, selection: selection, partId: part ? part.id : null, listDrop: listDrop, hover: hover, frameOn: frameOn, hasSel: !!sel, query: layerQuery, collapsed: collapsed, openFrames: openFrames, renaming: renaming, boxes: boxes, scalars: scalars,
    layersRef: layersRef, justDragged: justDragged, setCollapsed: setCollapsed, setHover: setHover, setRenaming: setRenaming, setOpenFrames: setOpenFrames,
    pick: onPick, openMenu: onOpenMenu, startDrag: onStartDrag, setName: onSetName, flagLayer: onFlagLayer, framePick: onFramePick, frameRename: onFrameRename, anatomyOf: onAnatomy };

  /* Pages (Pages.js) is memoized too; its drag is its own. */
  var onFoldFolder = useEvent(foldFolder), onRenameFolder = useEvent(renameFolder), onMoveFolder = useEvent(moveFolder), onDeleteFolder = useEvent(deleteFolder);
  var onRenamePage = useEvent(renamePage), onOpenPage = useEvent(openPage), onDeletePage = useEvent(deletePage), onDuplicatePage = useEvent(duplicatePage), onMovePage = useEvent(movePage), onPlacePage = useEvent(placePage);
  var onAddFolder = useEvent(addFolder), onAddPage = useEvent(addPage);
  var pagesProps = { project: project, pageId: pageId, query: pageQuery, renamingPage: renamingPage, renamingFolder: renamingFolder, confirmPage: confirmPage,
    setRenamingPage: setRenamingPage, setRenamingFolder: setRenamingFolder, setConfirmPage: setConfirmPage, foldFolder: onFoldFolder, renameFolder: onRenameFolder, moveFolder: onMoveFolder, deleteFolder: onDeleteFolder,
    renamePage: onRenamePage, openPage: onOpenPage, deletePage: onDeletePage, duplicatePage: onDuplicatePage, movePage: onMovePage, placePage: onPlacePage, addFolder: onAddFolder, addPage: onAddPage, announce: announce };

  /* Assets and Content (Assets.js, Content.js) are memoized too. */
  var onAddOrSwap = useEvent(function (type, swap) { var s0 = selRef.current; if (swap && s0.length) { swapNode(s0[s0.length - 1], type, docRef.current.active); return; } add(type); });
  var onAddLocal = useEvent(addLocal), onRenameComponent = useEvent(renameComponent), onRemoveComponent = useEvent(removeComponent), onApplyVar = useEvent(applyVar), onSetStyles = useEvent(setStyles), onAddTemplate = useEvent(addTemplate);
  var onFrameAdd = useEvent(function (size, page, at, opts) { return frameOps.add(size, page, at, opts); });
  var picked = useMemo(function () { return nodesOf(selection).filter(function (n) { return n.type !== "Slot"; }); }, [selection, doc]);
  var pickedScope = useMemo(function () { return picked.length ? scopeFor(picked) : null; }, [picked]);
  var assetsProps = { query: query, library: library, kind: assetKind, category: category, view: view, placeable: placeable, picked: picked, scope: pickedScope, pxMap: pxMap, used: used, frameName: frame.name, justDragged: justDragged,
    setView: setView, setAssetKind: setAssetKind, setCategory: setCategory, startDrag: onStartDrag, addOrSwap: onAddOrSwap, addLocal: onAddLocal, renameComponent: onRenameComponent, removeComponent: onRemoveComponent, applyVar: onApplyVar, setStyles: onSetStyles, announce: announce, addTemplate: onAddTemplate, frameAdd: onFrameAdd };
  var onInsertAsset = useEvent(insertAsset), onAddToLibrary = useEvent(addToLibrary), onCutBackground = useEvent(cutBackground), onLibUpdate = useEvent(libUpdate), onReadBrandFile = useEvent(readBrandFile), onPlaceBrand = useEvent(placeBrand), onSetBrandPart = useEvent(setBrandPart);
  var contentProps = { query: contentQuery, tab: libTab, library: library, busy: libBusy, brandErr: brandErr, brand: brandNow(), scopeNote: contentScopeNote(), frameName: frame.name, justDragged: justDragged,
    startDrag: onStartDrag, insertAsset: onInsertAsset, addToLibrary: onAddToLibrary, cutBackground: onCutBackground, libUpdate: onLibUpdate, readBrandFile: onReadBrandFile, placeBrand: onPlaceBrand, setBrandPart: onSetBrandPart, announce: announce, setLibTab: setLibTab, setBrandErr: setBrandErr, setThemeStamp: setThemeStamp };

  var slot = wide ? document.getElementById("app-toolbar") : null;

  return e(React.Fragment, null,
    slot ? ReactDOM.createPortal(toolbar, slot) : null,
    home ? null : e("div", { className: "bd-tabs", role: "tablist", "aria-label": "Builder panels" },
      [["add", "Add"], ["canvas", "Canvas"], ["edit", "Edit"]].map(function (t) {
        return e("button", { key: t[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(pane === t[0]), onClick: function () { setPane(t[0]); } },
          t[1], t[0] === "edit" && selectedNodes.length ? e("span", { className: "bd-tab-note" }, " · " + (selectedNodes.length > 1 ? selectedNodes.length : selectedNodes[0].type)) : null);
      })),
    e("div", { className: cx("bd-shell", hidePanels && "is-bare", arriving && "is-arriving", leftClosed && "is-left-closed"), "data-pane": pane, inert: home ? "" : undefined, "aria-hidden": home ? "true" : undefined,
      style: wide ? { "--bd-left-w": (leftClosed ? railW || 88 : panels.left) + "px", "--bd-right-w": (rightClosed ? 0 : panels.right) + "px" } : undefined },
      e("aside", { className: "bd-left", ref: leftPanelRef, "aria-label": "Assets, pages, layers, content, configure, assistant and context", hidden: hidePanels || undefined },
        e("div", { className: "bd-left-tabs bd-rail" },
          e("div", { className: "bd-rail-tabs", role: "tablist", "aria-label": "Left panel", "aria-orientation": wide ? "vertical" : "horizontal" },
            RAIL.map(function (r) {
              var isHome = r[0] === "home";
              return e("button", { key: r[0], type: "button", role: "tab", className: "bd-tab", "aria-selected": String(isHome ? home : !home && !leftClosed && left === r[0]), "aria-controls": isHome ? undefined : "bd-left-body", title: r[2],
                onClick: isHome ? openProjects : function () { setLeft(r[0]); if (leftClosed) setPanel("left", null, false); } }, e(Icon, { name: r[3] }), e("span", { className: "bd-rail-label" }, r[1]));
            })),
          e("button", { type: "button", className: cx("bd-tab bd-rail-account", account.status === "in" && "is-in"), "aria-haspopup": "dialog", "aria-label": account.status === "in" ? "Account: signed in as " + account.account.email : "Account",
            title: account.status === "in" ? "Signed in as " + account.account.email : account.status === "off" ? "Account (the cloud isn't connected yet)" : "Sign in or create an account", onClick: openAccount },
            e(Icon, { name: "user" }), e("span", { className: "bd-rail-label", "aria-hidden": "true" }, "Account"))),
        e("div", { className: "bd-left-body", id: "bd-left-body", role: "tabpanel" },
          e("div", { className: cx("bd-left-main", left === "configure" && "bd-config-main") },
            left === "configure" ? e(React.Fragment, null, e("div", { className: "bd-config-dock", ref: dockRef }), configNone ? e("p", { className: "bd-empty-note bd-config-none" }, "No settings match.") : null)
              : left === "assets" ? e(Assets, assetsProps) : left === "pages" ? e(Pages, pagesProps) : left === "layers" ? e(Layers, layersProps)
              : left === "assistant" ? e(AssistantPanel, { thread: asThread, busy: asBusy, draft: asDraftState[0], setDraft: asDraftState[1], mode: assistantMode(),
                  target: selectedNodes.length ? (selectedNodes.length === 1 ? (selectedNodes[0].name || selectedNodes[0].type) : selectedNodes.length + " layers") : null,
                  includeSel: asSelState[0], toggleSel: function () { asSelState[1](!asSelState[0]); }, reach: asReachState[0], setReach: asReachState[1],
                  docs: asContext().docs, skills: asContext().skills, dropDoc: function (id) { asDropState[1](asDropState[0].concat([id])); },
                  suggestions: selectedNodes.length ? ["Make it feel more premium", "Round the corners", "Add a button"] : ["Add a pricing section"],
                  send: asApi.send, stop: asApi.stop, clear: asApi.clear, keep: asApi.keep, undoTurn: asApi.undoTurn, retry: asApi.retry, fix: asApi.fix, show: asApi.show,
                  note: asApi.note, waiting: asBusy && asThread.some(function (t) { return t.ask && t.ask.status === "pending"; }), answerAsk: asApi.answerAsk, otherAsk: asApi.otherAsk, edits: asEditsNow, dropEdits: asApi.dropEdits, approvePlan: asApi.approvePlan, changePlan: asApi.changePlan, undoFrom: asApi.undoFrom, exportThread: asApi.exportThread,
                  plans: asPlanState[0], setPlans: asApi.setPlans, effort: asEffortState[0], setEffort: asApi.setEffort, look: canLook(), setLook: asApi.setLook })
              : left === "context" ? e(ContextPanel, { items: ctxItems, query: contextQuery, hasProject: !!(project && project.group), projectName: groupName, fileName: project ? project.name : "",
                  pages: pagesOf(project), pageId: pageId, pageName: (pagesOf(project).filter(function (x) { return x.id === pageId; })[0] || {}).name, announce: announce,
                  add: ctxApi.add, update: ctxApi.update, remove: ctxApi.remove, move: ctxApi.move })
              : e(Content, contentProps)),
          left === "configure" ? e(SearchField, { className: "bd-search-dock", label: "Search settings", placeholder: "Search settings", value: configQuery, onChange: setConfigQuery })
            : left === "pages" ? e(SearchField, { className: "bd-search-dock", label: "Filter pages", placeholder: "Filter pages", value: pageQuery, onChange: setPageQuery })
            : left === "assets" ? e(SearchField, { className: "bd-search-dock", label: "Search components", placeholder: "Search all components", value: query, onChange: setQuery })
            : left === "layers" ? e(SearchField, { className: "bd-search-dock", label: "Filter layers", placeholder: "Filter layers", value: layerQuery, onChange: setLayerQuery })
            : left === "assistant" ? null
            : left === "context" ? e(SearchField, { className: "bd-search-dock", label: "Filter context", placeholder: "Filter docs and skills", value: contextQuery, onChange: setContextQuery })
            : e(SearchField, { className: "bd-search-dock", label: "Search content", placeholder: "Search your content", value: contentQuery, onChange: setContentQuery }))),
      e("div", { className: "bd-center" }, slot ? null : toolbar, stage),
      e("aside", { className: "bd-right", "aria-label": "Inspector", ref: rightRef, hidden: hidePanels || rightClosed || undefined }, inspector),
      wide && !hidePanels && !home ? [panelHandle("left"), panelHandle("right")] : null),
    e(Home, { open: home, projects: projList, groups: groupList, currentId: project.id, opening: opening, query: projQuery, view: homeView, sort: homeSort,
      renamingProj: renamingProj, renamingGroup: renamingGroup, confirmDel: confirmDel, dark: dark, account: account, toolbar: slot ? null : toolbar,
      setQuery: setProjQuery, setSort: homeSetSort, setRenamingProj: setRenamingProj, setRenamingGroup: setRenamingGroup, setConfirmDel: setConfirmDel, goView: homeGoView, setDark: homeSetDark,
      openProject: homeOpen, renameProject: homeRename, duplicateProject: homeDuplicate, deleteProject: homeDelete, moveFile: homeMove, exportProject: homeExport, onPicture: homePicture, importProject: homeImport,
      renameGroup: homeRenameGroup, duplicateGroup: homeDuplicateGroup, exportGroup: homeExportGroup, deleteGroup: homeDeleteGroup, autoGroupPicture: homeAutoPicture,
      newGroup: homeNewGroup, newProject: homeNewProject, newPlayground: homeNewPlayground, openAccount: homeOpenAccount }),
    readout ? e("div", { className: "bd-readout", "aria-hidden": true, style: { left: readout.x + 14 + "px", top: readout.y + 16 + "px" } }, readout.text) : null,
    drag && drag.ghost ? (function () {
      var g = drag.ghost, z = g.flat ? 1 : camRef.current.z, grab = g.grab || { x: 0, y: 0 };
      var x = drag.spot ? drag.spot.x : drag.x - grab.x * z, y = drag.spot ? drag.spot.y : drag.y - grab.y * z;
      return e("div", { className: cx("bd-ghost-el", g.flat && "is-flat"), style: { left: x + "px", top: y + "px", width: g.w * z + "px", height: g.h * z + "px" }, "aria-hidden": true },
        e("div", { className: "bd-ghost-inner", style: { width: g.w + "px", height: g.h + "px", transform: "scale(" + z + ")" }, dangerouslySetInnerHTML: { __html: g.html } }));
    })() : drag && !drag.inside ? e("div", { className: "bd-ghost", style: { left: drag.x + "px", top: drag.y + "px" }, "aria-hidden": true }, drag.label) : null,
    e(CodeDialog, { dialogRef: dialogRef, code: code, notes: codeNotes, title: codeTitle, picked: !!codePick, frameName: frame.name, scale: exportScale, setScale: setExportScale, hasSelection: !!sel,
      onCopyCode: onCopyCode, onExportImage: onExportImage, onCopyLayout: onCopyLayout, onShare: onShare, onDownloadProject: onDownloadProject }),
    e(ImportDialog, { dialogRef: importRef, text: importText, setText: setImportText, onImport: onImportLayout }),
    e(VersionsDialog, { dialogRef: versionsRef, open: shown === "versions", onClose: closeShown, projectName: project.name, versions: versions, onKeep: onKeepVersion, onRestore: onRestoreVersion }),
    e(KeysDialog, { dialogRef: keysRef, open: shown === "keys", onClose: closeShown }),
    e(ComponentDialog, { dialogRef: compRef, draft: compDraft, setDraft: setCompDraft, node: compNode, onClose: closeComponent, onSave: onSaveComponent, onFix: onFixComponent }),
    e(PlayDialog, { dialogRef: playRef, frameRef: playFrameRef, stageRef: playStageRef, play: play, setPlay: setPlay, box: playBox, frame: play ? frameById(doc, play.fid) : null,
      pageName: playPageName, frameSrc: frameSrc, onClose: onPlayClosed, onBack: onPlayBack, onLoad: onRenderPlay }),
    e(AccountDialog, { dialogRef: accountRef, state: account, setState: accountState[1] }),
    menu ? e(ContextMenu, { x: menu.x, y: menu.y, label: "Actions", options: menuOptions(menu.ids), onClose: function () { setMenu(null); }, onChoose: onMenu }) : null,
    e("div", { className: "visually-hidden", role: "status", "aria-live": "polite" }, say));
}

export { App };
