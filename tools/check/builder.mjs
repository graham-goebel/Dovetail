#!/usr/bin/env node
/* Drives the builder page (builder.html) in a real browser.

     npm run check:builder

   Checks, against the built site:
   - the toolbar sits in the site header on a wide screen, and the header has
     no search or page menu there;
   - every component the assets panel offers renders on the canvas from its
     starting props, with no error box and no script error;
   - the assets panel shows one named category at a time, search spans them
     all and clears, tiles carry a live preview, and grid and list both work;
   - dragging a tile onto an empty frame adds it, clicking it on the canvas
     selects it, and clicking the empty canvas clears the selection;
   - the inspector splits into Appearance, Layout and Content, with a box
     model for margin and padding, a size grid and a flex alignment pad;
   - the tools add a container, text, a heading, a frame and a page with no
     marquee to draw, and one dragged onto a frame's canvas lands where it's
     dropped; groups and new rows don't wrap;
   - the left rail switches Assets, Layers, Content and Configure, and
     Configure sits in the panel; Content cuts an image's backdrop out and
     drags it onto the canvas; a frame's edge resizes it; a frame takes a
     custom canvas colour; sections show a dot when something is set; Shift
     shows spacing with its token; Play shows a frame at a screen's height;
   - a block's element props are slots: its own buttons are picked on the
     canvas, changed, and exported as JSX in the prop; a slot empties, takes
     its sample back, and only takes the kinds it allows; a layer dropped on
     the middle of a slot owner's row lands beside it;
   - a block's array props are lists: FaqBlock's items open onto fields read
     from its types, edit on the canvas, add with an id of their own, move,
     go, survive a reload, and export as an array in the prop;
   - New opens a freeform canvas, a structured page (whose loose items come
     in Groups) or a template; Ctrl+C, Ctrl+X and Ctrl+V move layers between
     frames; Code shows just the selection; Shift+Up and Down step text
     along the type scale; a press on the empty canvas shows the builder's
     own settings and its background colour; Layers shows a component's own
     parts, disabled, and folds everything at once; something dropped off
     every frame stays loose on the canvas; a dragged node is carried as
     itself; a frame keeps its proportions; a brand page re-points its text;
     a frame exports as PNG; tones show swatches; blend modes and invert
     apply; a Badge isn't offered avatar sizes;
   - Select and Hand share one button; a group's tray closes on a press on
     the canvas, and its items drag onto a frame;
   - the inspector opens on the tab that suits the layer; size and spacing
     options lead with the families that suit it and show their px;
   - Pinned fixes an item to its frame, and the pin pad moves it;
   - resting on a tool shows its tooltip;
   - a primary Button on a brand-muted Section takes the brand fill;
   - Enter goes into a container's children and Shift+Enter back out;
   - a token chosen from a dropdown (by keyboard) reaches the component as a
     custom property, one side at a time too, and height and min width are
     tokens; every option the builder offers, and every style value in the
     exported code, is a token or a CSS keyword;
   - several components of one kind change together;
   - double-clicking text on the canvas edits it in place;
   - the canvas pans and zooms, shows every frame side by side, and a frame
     takes a typed width and height; a click in another frame makes it active;
   - Tab hides the panels, and so does preview;
   - layers: every frame is a row; dragging a row reorders, the filter
     narrows the list, Ctrl+Up moves the selection, a Group renames on
     double-click, and shift-select then Ctrl+G makes a Group whose gap is a
     token; a node drags from one frame into another;
   - pressing anywhere on a canvas node and dragging moves it;
   - Detach rebuilds a block from primitives; a media prop takes a URL;
   - undo, and a reload that keeps the work;
   - the layout reference's own example opens with nothing left out, and a
     pasted layout comes in beside the frames there, listing what it left out;
   - a share link opens the frames it encodes, and one carrying props,
     styles, sizes or components the inspector can't set loses them;
   - a theme tried in Configure reaches the frames and not the builder's own
     chrome;
   - the code exported for every Playground page, for a structured page of
     Groups, Sections, Cards, slots and a Carousel, and for a selection,
     type-checks against the built package with tsc (typecheck.mjs, shared
     with the package check);
   - at 390px the panels sit behind tabs and nothing is wider than the screen.

   Steps run side by side, as many as BUILDER_WORKERS (half the cores, up to
   four); the first ten share one page and run in order on one of them, the
   Performance step runs on its own afterwards. Each step's lines print when
   it ends, with how long it took.

   Chromium comes from Playwright; set CHROMIUM_PATH to use a local binary. */

import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { buildPackage, describe as describeTs, hasReactTypes, typecheck } from "./typecheck.mjs";

let failures = 0;
/* Steps run side by side, so each one's lines are kept in its own lane and
   printed together when it ends; with one worker they print as they come. */
const lane = new AsyncLocalStorage();
const say = (line) => { const l = lane.getStore(); if (l && !l.live) l.lines.push(line); else console.log(line); };
const ok = (m) => say(`  ok    ${m}`);
/* On GitHub Actions a failure is also an annotation, so it reads from the
   checks page without opening the log. */
const fail = (m) => {
  failures++;
  say(`  FAIL  ${m}`);
  const title = (lane.getStore() || {}).title || "";
  if (process.env.GITHUB_ACTIONS) say(`::error title=Builder check::${(title + ": " + m).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}`);
};
const expect = (cond, m) => { if (!cond) throw new Error(m); };
const seconds = (ms) => (ms / 1000).toFixed(1).replace(/\.0$/, "") + "s";

/* The steps, as this file declares them; they run once every one is known.
   ONLY=<text> keeps just the steps whose title has it, to work on one; a
   step that shares a page runs with the ones before it, which it builds on. */
const queue = [];
let chain = null;
const wanted = (title) => !process.env.ONLY || title.includes(process.env.ONLY) || title === "page errors";
function step(title, fn, opts = {}) {
  const item = { title, fn, ...opts };
  if (chain && !opts.alone && !opts.last) chain.steps.push(item);
  else if (wanted(title)) queue.push(item);
}
/* Steps declared between inOrder(name, after) and inOrder(null) share a
   page, so they run in order as one task; `after` runs when they're done.
   Under ONLY the task keeps its steps up to the last one wanted. */
function inOrder(name, after) {
  if (chain) { const last = chain.steps.map((s) => wanted(s.title)).lastIndexOf(true); chain.steps = chain.steps.slice(0, last + 1); }
  chain = name ? { title: name, steps: [], after } : null;
  if (chain) queue.push(chain);
}
async function runStep(s, live) {
  const l = { title: s.title, lines: [], live };
  const started = Date.now();
  if (live) console.log(s.title);
  await lane.run(l, async () => {
    try { await s.fn(); } catch (err) {
      if (process.env.DEBUG) say(String(err && err.stack || err));
      /* A timeout doesn't say which wait it was; the line in this file does. */
      const at = /builder\.mjs:(\d+)/.exec((err && err.stack) || "");
      fail(String(err && err.message ? err.message : err).split("\n")[0] + (at && /Timeout/.test(String(err && err.message)) ? ` (line ${at[1]})` : ""));
    }
  });
  if (live) console.log(`  (${seconds(Date.now() - started)})`);
  else { console.log(`${s.title} (${seconds(Date.now() - started)})`); for (const line of l.lines) console.log(line); }
}
async function runTask(t, live) {
  if (!t.steps) return runStep(t, live);
  for (const s of t.steps) await runStep(s, live);
  if (t.after) await t.after();
}
/* As many at once as there are workers; what must run alone goes after,
   and the last step, which reads what the others left, after that. */
async function runAll() {
  const cores = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  const workers = Math.max(1, Number(process.env.BUILDER_WORKERS) || Math.min(4, Math.floor(cores / 2)));
  const pool = queue.filter((t) => !t.alone && !t.last), alone = queue.filter((t) => t.alone), last = queue.filter((t) => t.last);
  const live = workers === 1;
  if (!live) console.log(`${pool.length + alone.length} tasks on ${workers} workers\n`);
  let i = 0;
  const worker = async () => { while (i < pool.length) await runTask(pool[i++], live); };
  await Promise.all(Array.from({ length: Math.min(workers, pool.length) }, worker));
  for (const t of alone) await runTask(t, live);
  for (const t of last) await runTask(t, live);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = await serve(0);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const THIRD_PARTY = /fonts\.googleapis|fonts\.gstatic|ERR_CERT|net::ERR_(NAME|INTERNET|CONNECTION|TUNNEL|PROXY)|Failed to load resource/i;
/* A style value may be a token, a calc() of tokens, or a CSS keyword. */
const RAW = /\d(px|rem|em|vh|vw|ch)\b|#[0-9a-f]{3,8}\b|rgba?\(|oklch\(|hsla?\(/i;
const raw = (v) => RAW.test(String(v).replace(/var\(--dt-[\w-]+\)/g, ""));

function watch(page) {
  const where = lane.getStore() ? `[${lane.getStore().title.slice(0, 40)}] ` : "";
  page.on("pageerror", (e) => errors.push(where + "script error: " + String(e.message || e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error" && !THIRD_PARTY.test(m.text())) errors.push(where + "console: " + m.text().slice(0, 160)); });
  page.on("dialog", (d) => d.accept());
}

/* The canvas frames, in the order they sit on the canvas. */
const frames = (page) => page.frames().filter((f) => f.url().includes("builder-frame"));

async function open(viewport, { hash = "", store = null, before = null, playground = false } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  /* Each step starts from an empty browser; the Playground a first visit
     makes has a step of its own. The script runs before every load, so it
     outlasts the clear below. */
  if (!playground) await page.context().addInitScript(() => { try { if (!localStorage.getItem("dovetail-builder-playground")) localStorage.setItem("dovetail-builder-playground", "1"); } catch (err) { /* no storage */ } });
  page.setDefaultTimeout(8000);
  watch(page);
  if (before) await before(page);
  await page.goto(server.origin + "/builder.html");
  /* Let the first visit finish making its project before the reload below. */
  await page.waitForFunction(() => !!window.__builder);
  await page.evaluate((store) => { localStorage.clear(); if (store) for (const k in store) localStorage.setItem(k, store[k]); }, store);
  if (hash) await page.goto(server.origin + "/builder.html" + hash);
  await page.reload();
  await page.waitForSelector(".bd-assets", { state: "attached" });
  const frame = (i = 0) => frames(page)[i];
  await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length > 0);
  await frame().waitForFunction(() => !!window.BuilderFrame);
  return { page, frame };
}

/* A point on a canvas node in the active frame (or the frame given), in page
   coordinates. */
const canvasPoint = (page, selector, at = "center", index = null) => page.evaluate(({ selector, at, index }) => {
  const iframe = index === null ? document.querySelector("iframe.bd-frame.is-active") : document.querySelectorAll("iframe.bd-frame")[index];
  let el = iframe.contentDocument.querySelector(selector);
  if (el && el.style.display === "contents") el = el.firstElementChild;
  const r = el.getBoundingClientRect();
  const box = iframe.getBoundingClientRect();
  const s = box.width / parseFloat(iframe.style.width);
  const y = at === "bottom" ? r.bottom - 4 : r.top + Math.min(r.height / 2, 40);
  const x = at === "left" ? r.left + 20 : at === "right" ? r.right - 12 : r.left + r.width / 2;
  return { x: box.left + x * s, y: Math.min(box.bottom - 4, box.top + y * s) };
}, { selector, at, index });

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

const layerNames = (page) => page.$$eval(".bd-layer[data-layer]:not([data-layer=root])", (rows) =>
  rows.map((r) => r.getAttribute("data-depth") + ":" + r.querySelector(".bd-layer-name").textContent));
const title = (page) => page.locator(".bd-inspect-title").first().textContent();
const option = (page, text) => page.locator(".bd-dd-opt", { has: page.locator(".bd-dd-opt-label", { hasText: text }) }).first();
/* Home: New's menu, a card by its exact name, and a card's ⋯ menu. */
const homeNew = async (page, what) => { await page.locator(".bd-home-new").click(); await option(page, what).click(); };
const homeCard = (page, name) => page.locator(".bd-proj").filter({ has: page.locator(".bd-proj-name", { hasText: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }) });
const cardMenu = async (page, name, what) => { await homeCard(page, name).locator(".bd-proj-menu").click(); await option(page, what).click(); };
/* A component's own options live under Properties: when the field isn't on
   the tab that's open, look there. */
async function choose(page, fieldText, optionText) {
  const field = () => page.locator(".bd-right .bd-field", { hasText: fieldText }).first();
  if (!(await field().count()) && await page.locator(".bd-itab", { hasText: "Properties" }).count()) await tab(page, "Properties");
  await field().locator(".bd-dd").first().click();
  await option(page, optionText).click();
}
/* Selects a layer by the text on its row in Layers, which it opens. */
async function pickLayer(page, text) {
  await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
  await page.locator(".bd-layer[data-layer] .bd-layer-main", { hasText: text }).first().click();
}
/* Presses the canvas button that reads `text`, in frame `i`, to select it. */
async function pressButton(page, text, i = 0) {
  const at = await page.evaluate(({ text, i }) => {
    const f = document.querySelectorAll("iframe.bd-frame")[i];
    const b = [...f.contentDocument.querySelectorAll("button")].find((x) => x.textContent.includes(text));
    const r = b.getBoundingClientRect(), box = f.getBoundingClientRect(), s = box.width / parseFloat(f.style.width);
    return { x: box.left + (r.left + r.width / 2) * s, y: box.top + (r.top + r.height / 2) * s };
  }, { text, i });
  await page.mouse.click(at.x, at.y);
}
const row = (page, name) => page.locator(`.bd-layer[data-layer]:has(.bd-layer-name:text-is("${name}")) .bd-layer-main`);
/* The inspector's tabs. Properties (once Content) opens with its Style and
   Arrangement folded; this unfolds them, so their fields can be found. */
const tab = async (page, name) => {
  if (name === "Content") name = "Properties";
  await page.locator(".bd-itab", { hasText: name }).click();
  if (name !== "Properties") return;
  for (const key of ["props-style", "props-arrange"]) {
    const head = page.locator(`.bd-right .bd-sec.is-closed[data-sec="${key}"] .bd-sec-h`);
    if (await head.count()) await head.click();
  }
};
/* Assets open on five kinds; a category lives in one of them. */
const KIND_OF = { Layout: "primitives", Typography: "primitives", Blocks: "blocks" };
async function category(page, name) {
  const kind = KIND_OF[name] || "components";
  const clear = page.locator(".bd-search-dock .bd-search-clear");
  if (await clear.count()) await clear.click();
  if (!(await page.locator(".bd-assets [data-asset-kind]").count())) {
    const here = ((await page.locator(".bd-assets .bd-panel-title").textContent()) || "").toLowerCase();
    if (here !== kind) await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
  }
  const card = page.locator(`.bd-assets [data-asset-kind="${kind}"]`);
  if (await card.count()) await card.click();
  if (kind !== "blocks") await page.locator(".bd-cat", { hasText: name }).click();
}
/* The canvas between the floating panels: what a press can reach. */
const stageBox = (page) => page.evaluate(() => {
  const s = document.querySelector(".bd-stage").getBoundingClientRect();
  const l = document.querySelector(".bd-left"), r = document.querySelector(".bd-right");
  const lx = l && l.offsetParent ? Math.max(s.left, l.getBoundingClientRect().right) : s.left;
  const rx = r && r.offsetParent ? Math.min(s.right, r.getBoundingClientRect().left) : s.right;
  return { x: lx, y: s.top, width: rx - lx, height: s.bottom - s.top };
});
const camera = (page) => page.evaluate(() => document.querySelector(".bd-world").style.transform);
const dd = (page, label) => page.locator(`.bd-right .bd-dd[aria-label="${label}"]`).first();
async function pick(page, label, optionText) {
  await dd(page, label).click();
  await option(page, optionText).click();
}
const labels = (page) => page.$$eval(".bd-flabel-name", (n) => n.map((x) => x.textContent));
/* New, then Start over (a blank frame replaces every frame) or Paste a layout. */
async function startFrom(page, label) {
  await page.locator(".bd-project-menu").click();
  await option(page, label === "Blank frame" ? "Start over with a blank frame" : "Paste a layout…").click();
}
/* Assets opens on a kind's cards; a gallery that is open goes back first. */
async function assetKind(page, kind) {
  await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
  if (await page.locator('.bd-assets [aria-label="Back to Assets"]').count()) await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
  await page.locator(`.bd-assets [data-asset-kind="${kind}"]`).click();
}
/* A container card, pressed: a new frame beside the others. */
async function addContainer(page, name) {
  await assetKind(page, "containers");
  await page.locator(".bd-container-card", { hasText: name }).click();
}
/* Undo and redo are keys now, not buttons; the builder says how many steps wait. */
const steps = (page) => page.evaluate(() => window.__builder.history());
const history = (page) => ({
  undo: { click: async () => { await release(page); await page.keyboard.press("Control+z"); }, isEnabled: async () => (await steps(page)).past > 0, isDisabled: async () => (await steps(page)).past === 0 },
  redo: { click: async () => { await release(page); await page.keyboard.press("Control+Shift+z"); }, isEnabled: async () => (await steps(page)).future > 0, isDisabled: async () => (await steps(page)).future === 0 },
});
/* A blank frame replaces the canvas's iframe, so for a moment there is no
   frame to ask; wait in the page until the new one has drawn its empty root. */
const emptyFrame = (page) => page.waitForFunction(() => {
  const i = document.querySelector("iframe.bd-frame");
  try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector('[data-bf-slot="root"]')); } catch (err) { return false; }
});
/* Hands the keyboard back to the canvas, as a press on it does. */
const release = (page) => page.evaluate(() => document.activeElement && document.activeElement.blur());
/* Every frame in view. */
async function fitAll(page) {
  await release(page);
  await page.keyboard.press("Shift+Digit1");
  await page.waitForTimeout(150);
}

try {
  const { page, frame } = await open({ width: 1440, height: 900 });
  inOrder("the first page", () => page.close());

  await step("The toolbar lives in the header; search and the page menu don't", async () => {
    expect(await page.locator("#app-toolbar .bd-toolbar").count() === 1, "the toolbar should render into #app-toolbar");
    expect(await page.locator(".search-btn, .page-actions-btn").count() === 0, "no search button or page menu on the builder");
    expect(await page.locator(".bd-layer-lock, .bd-layer-grip, .bd-tip").count() === 0, "no lock or grip icons, and no instructions in the side panel");
    ok("toolbar in the site header, no search, no page menu, no lock or grip icons, no instructions");
  });

  await step("Every component the assets panel offers renders on the canvas", async () => {
    const types = await page.evaluate(() => window.DovetailBuilderData.groups.flatMap((g) => g.items));
    expect(types.length > 60, `the assets panel should offer most components, got ${types.length}`);
    const result = await frame().evaluate((types) => {
      const doc = { page: { surface: "base" }, root: { id: "root", type: "Root", props: {}, style: {}, children: types.map((t, i) => ({ id: "c" + i, type: t, props: {}, style: {}, children: [] })) } };
      window.BuilderFrame.render(doc, {});
      return new Promise((r) => setTimeout(() => r([...document.querySelectorAll(".bf-error")].map((e) => e.textContent.slice(0, 120))), 400));
    }, types);
    expect(result.length === 0, `components showed an error box: ${result.join(" | ")}`);
    ok(`${types.length} components rendered from their starting props`);
  });

  await step("Assets: five kinds as icons, one named category at a time, search across all and clear it, live previews, grid and list", async () => {
    const kinds = await page.$$eval(".bd-assets [data-asset-kind] .bd-kind-name", (c) => c.map((x) => x.textContent));
    expect(kinds.join(",") === "Containers,Primitives,Variables,Components,Blocks,Templates", `Assets open on Containers, Primitives, Variables, Components, Blocks and Templates, got ${kinds.join(", ")}`);
    const heights = await page.$$eval(".bd-assets [data-asset-kind]", (c) => c.map((x) => Math.round(x.getBoundingClientRect().height)));
    expect(new Set(heights).size === 1, `the kind cards are all one height, got ${heights.join(", ")}`);
    const pics = await page.$$eval(".bd-assets [data-asset-kind]", (c) => c.map((x) => x.getAttribute("data-asset-kind") + ":" + (x.querySelector(".bd-thumb-stage, .bd-mini-frame, .bd-mini-swatch, .bd-mini-page") ? "picture" : x.querySelector(".bd-kind-pics.is-asset .bd-ic") ? "icon" : "none")));
    expect(pics.every((p) => p.endsWith(":icon")), `every kind card on the first level shows an icon, not a preview, got ${pics.join(", ")}`);
    const prim = await page.$eval('.bd-assets [data-asset-kind="primitives"] .bd-kind-pics svg', (svg) => svg.innerHTML);
    expect(prim.includes("M4.098 19.902"), "Primitives uses the blend modes' swatch icon");
    await category(page, "Actions");
    const named = await page.$$eval(".bd-cat", (c) => c.map((x) => x.querySelector(".bd-cat-label")?.textContent || ""));
    expect(named.length >= 8 && named.every(Boolean) && !named.includes("Blocks") && !named.includes("Layout"), `every component category carries its name, without the primitives' or blocks', got ${named.join(", ")}`);
    await category(page, "Blocks");
    const blocks = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(blocks.includes("HeroBlock") && !blocks.includes("Button"), "the Blocks category should show blocks only");
    await page.locator(".bd-search-dock input").fill("button");
    const found = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(found.includes("Button") && found.includes("IconButton"), `search should span categories, got ${found.join(", ")}`);
    await page.locator(".bd-search-dock .bd-search-clear").click();
    expect(await page.locator(".bd-search-dock input").inputValue() === "" && await page.locator(".bd-search-clear").count() === 0, "the clear button empties the search and goes away");
    await category(page, "Actions");
    await page.waitForFunction(() => document.querySelector('.bd-tile[data-type="Button"] .bd-thumb-stage')?.children.length > 0);
    ok("the kinds show as icons, Primitives with the blend swatch; categories are named, Blocks shows blocks, search finds Button and IconButton and clears, and the Button tile has a live preview");
    await page.locator('.bd-assets-head .bd-seg-btn[aria-label="List"]').click();
    expect(await page.locator(".bd-tiles.is-list").count() === 1, "list view");
    const list = await page.$$eval(".bd-tiles.is-list .bd-tile", (t) => t.map((x) => { const r = x.getBoundingClientRect(), p = x.querySelector(".bd-thumb").getBoundingClientRect(), n = x.querySelector(".bd-tile-text").getBoundingClientRect(); return [Math.round(r.height), p.bottom <= n.top + 1]; }));
    expect(new Set(list.map((x) => x[0])).size === 1 && list.every((x) => x[1]), `in the list every tile is one height, its picture over its words, got ${JSON.stringify(list)}`);
    await page.locator('.bd-assets-head .bd-seg-btn[aria-label="Grid"]').click();
    expect(await page.locator(".bd-tiles.is-grid").count() === 1, "grid view");
    ok("grid and list views switch");
  });

  await step("Drag onto an empty frame, add into the selection, select and deselect on the canvas", async () => {
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Layout");
    const from = await page.locator('.bd-tile[data-type="Stack"]').boundingBox();
    const to = await canvasPoint(page, '[data-bf-slot="root"]');
    await page.mouse.move(from.x + 30, from.y + 30);
    await page.mouse.down();
    await page.mouse.move(from.x + 140, from.y + 40, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    expect(await page.locator(".bd-mark-box, .bd-mark-line, .bd-ghost-el").count() >= 1, "a drop target, or the thing itself where it will land, should show while dragging over the frame");
    await page.mouse.up();
    await frame().waitForSelector('[data-bf-type="Stack"]');
    ok("Stack dropped on the frame, with a target shown during the drag");
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await page.locator('.bd-tile[data-type="Text"]').click();
    await frame().waitForSelector('[data-bf-type="Stack"] [data-bf-type="Text"]');
    ok("with the Stack selected, Heading and then Text are added into it");
    /* Toward its right end: the selected Text's tag, with its ⋯, sits over
       the Heading's left end. */
    const at = await canvasPoint(page, '[data-bf-type="Heading"]', "right");
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect((await page.locator(".bd-itab").allTextContents()).join(",") === "Properties,Appearance,Layout", "the inspector has Properties, Appearance and Layout tabs, in that order");
    expect(await page.locator(".bd-itab[aria-selected=true]").textContent() === "Properties" && await page.locator(".bd-ipanel .bd-field-label", { hasText: /^Text$/ }).count() === 1, "Properties opens first, with the Text field");
    expect(await page.locator(".bd-inspect-head .bd-head-actions > *").count() === 1, "the head has one menu beside the name, not a row of buttons");
    await page.locator(".bd-inspect-head .bd-layer-menu").click();
    const actions = await page.locator(".bd-dd-opt .bd-dd-opt-label").allTextContents();
    await page.keyboard.press("Escape");
    expect(actions[0] === "Group" && actions.includes("Wrap in Group") && actions.includes("Copy link to this layer") && actions.includes("Create component") && actions.includes("Copy style") && actions.includes("Hide") && actions.includes("Lock") && !actions.some((a) => /Turn into|Detach/.test(a)), `the menu offers Group, Wrap in, a link, Create component, Copy style, Hide and Lock for a Heading, got ${actions.join("|")}`);
    const stage = await stageBox(page);
    await page.mouse.click(stage.x + 6, stage.y + stage.height - 6);
    await page.waitForFunction(() => /^Canvas$/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    ok("clicking the Heading selects it, the inspector opens on Content, and clicking the empty canvas deselects everything, frame too, for the builder's own settings");
  });

  await step("Enter goes into the selection, Shift+Enter back out", async () => {
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await row(page, "Stack").click();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => /^2 items/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.keyboard.press("Shift+Enter");
    await page.waitForFunction(() => /Stack/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    ok("Enter selects the Stack's two children; Shift+Enter selects the Stack again");
  });

  await step("Tokens only: dropdowns set custom properties, per side too; nothing offered is a raw value", async () => {
    await row(page, "Heading").click();
    await tab(page, "Layout");
    const sections = await page.$$eval(".bd-ipanel .bd-sec-h", (h) => h.map((x) => x.textContent));
    expect(sections.includes("Size") && sections.includes("Spacing"), `Layout holds Size and Spacing, got ${sections.join(", ")}`);
    await page.locator(".bd-box-p > .bd-box-all").focus();
    await page.keyboard.press("ArrowDown");
    await page.locator(".bd-dd-list").waitFor();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "var(--dt-space-inset-lg)");
    ok("Padding chosen by keyboard in the box model (arrows, Enter) sets var(--dt-space-inset-lg)");
    const lgPx = await frame().evaluate(() => Math.round(window.BuilderFrame.measure(["var(--dt-space-inset-lg)"])[0]));
    const sideLabel = await page.locator(".bd-box-p > .bd-box-cell.is-top .bd-dd-label").textContent();
    expect(sideLabel === String(lgPx), `each side shows, in px, the padding it takes from every side: expected ${lgPx}, got ${sideLabel}`);
    await page.locator(".bd-box-p > .bd-box-cell.is-top .bd-dd").click();
    await option(page, /^2xl$/).click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.paddingTop === "var(--dt-space-inset-2xl)");
    ok("the box model's top padding set to 2xl gives paddingTop: var(--dt-space-inset-2xl)");
    await pick(page, "Height", "step × 2");
    await pick(page, "Min width", "step × 3");
    await frame().waitForFunction(() => { const s = document.querySelector('[data-bf-type="Heading"]').firstElementChild.style; return s.height === "calc(var(--dt-size-step) * 2)" && s.minWidth === "calc(var(--dt-size-step) * 3)"; });
    const hLabel = await dd(page, "Height").locator(".bd-dd-label").textContent();
    expect(/^\d+ ×2$/.test(hLabel), `the size grid gives the px, then the step briefly, got ${hLabel}`);
    ok("Height and Min width, from the size grid, are multiples of --dt-size-step");
    const offered = await page.evaluate(() => Object.values(window.DovetailBuilderData.tokens).flatMap((d) => d.options.flatMap((o) => Object.values(o.css))));
    const bad = offered.filter(raw);
    expect(bad.length === 0, `options with raw values: ${bad.join(", ")}`);
    ok(`${offered.length} token option declarations, none a raw length or colour`);
    /* Nothing selected inside the frame: Code is the whole frame. */
    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    expect(/^import \{[^}]*Heading[^}]*Stack[^}]*\} from "@dovetail-ds\/react";/.test(code), "the code should import Heading and Stack from @dovetail-ds/react");
    expect(/export function Frame1\(\)/.test(code), "the function is named after the frame");
    expect(code.includes('paddingTop: "var(--dt-space-inset-2xl)"'), "the code should carry the per-side token");
    const values = [...code.matchAll(/style=\{\{([^}]*)\}\}/g)].flatMap((m) => [...m[1].matchAll(/:\s*"([^"]*)"/g)].map((v) => v[1]));
    expect(!values.some(raw), `style values that aren't tokens: ${values.filter(raw).join(", ")}`);
    const box = await page.locator(".bd-code:not(.bd-import):not(.bd-new):not(.bd-comp-dlg):not(.bd-projects):not(.bd-versions):not(.bd-keys):not(.bd-acct)").boundingBox();
    expect(box.height > 700, `the code overlay should use most of the screen, got ${Math.round(box.height)}px`);
    ok(`exported code is named after the frame, its ${values.length} style values are tokens or keywords, and the overlay is ${Math.round(box.height)}px tall`);
    await page.keyboard.press("Escape");
  });

  await step("Several of one kind change together", async () => {
    await row(page, "Text").click();
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Actions");
    await page.locator('.bd-tile[data-type="Button"]').click();
    await page.locator('.bd-tile[data-type="Button"]').click();
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await row(page, "Button").nth(0).click();
    await row(page, "Button").nth(1).click({ modifiers: ["Shift"] });
    expect(await title(page) === "2 Buttons", `two Buttons selected should read "2 Buttons", got ${await title(page)}`);
    await tab(page, "Properties");
    await choose(page, /^Variant/, /^ghost$/);
    await frame().waitForFunction(() => { const bs = [...document.querySelectorAll('[data-bf-type="Button"] button')]; return bs.length === 2 && bs.every((b) => getComputedStyle(b).backgroundColor === "oklch(0 0 0 / 0)" || getComputedStyle(b).backgroundColor === "rgba(0, 0, 0, 0)"); });
    ok("two Buttons selected read \"2 Buttons\"; setting Variant ghost, under Properties, changes both");
  });

  await step("Double-click text on the canvas to type in place", async () => {
    const at = await canvasPoint(page, '[data-bf-type="Heading"]', "left");
    await page.mouse.dblclick(at.x, at.y);
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Typed here");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]')?.textContent === "Typed here");
    expect(await page.locator(".bd-inline").count() === 0, "Enter closes the editor");
    ok("an editor opens over the heading; typing and Enter set its text");
    await history(page).undo.click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]')?.textContent !== "Typed here");
    ok("Ctrl+Z puts the heading back");
    const before = await frame().evaluate(() => document.querySelector('[data-bf-type="Heading"]').textContent);
    const redoOn = await history(page).redo.isEnabled();
    const again = await canvasPoint(page, '[data-bf-type="Heading"]', "left");
    await page.mouse.dblclick(again.x, again.y);
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Not kept");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]')?.textContent === "Not kept");
    await page.keyboard.press("Escape");
    await frame().waitForFunction((t) => document.querySelector('[data-bf-type="Heading"]')?.textContent === t, before);
    expect(await history(page).redo.isEnabled() === redoOn, "a cancelled edit leaves history as it was");
    ok("Escape takes back what was typed, without leaving a step");
  });

  await step("The canvas pans and zooms, frames sit side by side and take a width and height", async () => {
    await page.locator(".bd-zoom").click();
    await option(page, /^100%$/).click();
    await page.waitForFunction(() => /scale\(1\)$/.test(document.querySelector(".bd-world").style.transform));
    await page.keyboard.press("Control+0");
    await page.waitForFunction(() => !/scale\(1\)$/.test(document.querySelector(".bd-world").style.transform));
    ok("zoom 100% scales the canvas to 1; Ctrl+0 fits it again");
    const stage = await stageBox(page);
    const before = await camera(page);
    await page.mouse.move(stage.x + 8, stage.y + stage.height - 8);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction((b) => document.querySelector(".bd-world").style.transform !== b, before);
    const panned = await camera(page);
    await release(page);
    await page.mouse.move(stage.x + 8, stage.y + stage.height - 8);
    await page.keyboard.down("Space");
    await page.mouse.down();
    await page.mouse.move(stage.x + 120, stage.y + stage.height - 60, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Space");
    expect(await camera(page) !== panned, "dragging the empty canvas with Space held pans it");
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await page.waitForFunction((p) => { const m = /scale\(([\d.]+)\)/.exec(document.querySelector(".bd-world").style.transform); return m && Number(m[1]) !== Number(/scale\(([\d.]+)\)/.exec(p)[1]); }, panned);
    ok("the wheel and a Space-drag on empty canvas pan it; Ctrl and the wheel zoom");
    await page.keyboard.press("Escape");
    await page.locator(".bd-right .bd-frame-menu").click();
    await option(page, "Duplicate frame").click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    expect((await labels(page)).join("|") === "Frame 1|Frame 1 copy", `the copy sits beside the original, got ${(await labels(page)).join("|")}`);
    await frame(1).waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    ok("Duplicate frame puts \"Frame 1 copy\" beside the original, with the same content");
    await tab(page, "Layout");
    const w = page.locator("input[aria-label='Frame width']");
    await w.fill("390");
    await w.press("Enter");
    const h = page.locator("input[aria-label='Frame height']");
    await h.fill("640");
    await h.press("Enter");
    await frame(1).waitForFunction(() => innerWidth === 390 && innerHeight === 640);
    expect(await page.locator(".bd-flabel.is-current .bd-flabel-size").textContent() === "390 × 640", "the label shows the new size");
    ok("a typed width and height size the frame: 390 × 640");
    await fitAll(page);
    const at = await canvasPoint(page, '[data-bf-type="Heading"]', "left", 0);
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => document.querySelector(".bd-flabel.is-current .bd-flabel-name")?.textContent === "Frame 1" && /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    ok("a click in the other frame makes it active and selects what was clicked");
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frame(1).waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    expect((await page.evaluate(() => window.__builder.saved())).ok && await page.locator(".bd-saved").count() === 0, "the project saved, so the bar shows no warning");
    ok("after a reload both frames and their content are still there, and the bar has no Not saved warning");
  });

  await step("Tab hides the panels, and so does preview", async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.querySelector(".bd-left").hidden && document.querySelector(".bd-right").hidden);
    expect(await page.locator(".bd-float", { hasText: "Show panels" }).count() === 0 && await page.locator('.bd-toolbar [aria-label="Hide panels"]').count() === 0, "no Show panels button on the canvas and none in the bar: Tab does it");
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => !document.querySelector(".bd-left").hidden);
    ok("Tab hides both side panels, and Tab again brings them back");
    await page.locator(".bd-toolbar [aria-label=Preview]").click();
    await page.waitForFunction(() => document.querySelector(".bd-left").hidden && document.querySelector(".bd-right").hidden);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-left").hidden);
    ok("preview hides them too, and Escape returns to editing");
  });

  inOrder(null);

  await step("Layers: frames, drag to reorder, filter, Ctrl+Up, shift-select and group, rename, detach, media", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    expect((await layerNames(page)).join(" ") === "1:HeroBlock 1:FeatureGridBlock 1:StatsBlock 1:TestimonialBlock 1:CtaBlock", `the landing starter's layers, got ${(await layerNames(page)).join(" ")}`);
    expect(await page.locator(".bd-layer-frame .bd-layer-name").first().textContent() === "Landing", "the frame heads its layers");
    const cta = await row(page, "CtaBlock").boundingBox();
    const fg = await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("FeatureGridBlock"))').boundingBox();
    await drag(page, { x: cta.x + 30, y: cta.y + cta.height / 2 }, { x: fg.x + 60, y: fg.y + 3 });
    expect((await layerNames(page)).join(" ") === "1:HeroBlock 1:CtaBlock 1:FeatureGridBlock 1:StatsBlock 1:TestimonialBlock", `dragging CtaBlock above FeatureGridBlock, got ${(await layerNames(page)).join(" ")}`);
    ok("dragging a layer row reorders the frame");
    await page.keyboard.press("Control+ArrowUp");
    await page.waitForTimeout(150);
    expect((await layerNames(page))[0] === "1:CtaBlock", "Ctrl+Up moves the selection up");
    ok("Ctrl+Up moves the selected layer up");
    await row(page, "StatsBlock").click();
    await row(page, "TestimonialBlock").click({ modifiers: ["Shift"] });
    expect(/^2 /.test(await title(page)), "shift-click selects two");
    await page.keyboard.press("Control+g");
    await page.waitForTimeout(200);
    expect((await layerNames(page)).slice(-3).join(" ") === "1:Group 2:StatsBlock 2:TestimonialBlock", `Ctrl+G groups them, got ${(await layerNames(page)).join(" ")}`);
    await tab(page, "Layout");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Group"]').firstElementChild.style.flexWrap === "nowrap");
    await page.locator('.bd-right .bd-seg-btn[aria-label="Column"]').click();
    await pick(page, "Gap", /^lg$/);
    await frame().waitForFunction(() => { const g = document.querySelector('[data-bf-type="Group"]').firstElementChild; return g.style.flexDirection === "column" && g.style.gap === "var(--dt-space-stack-lg)"; });
    ok("shift-select and Ctrl+G make a Group that stays on one line; a column with gap lg uses var(--dt-space-stack-lg)");
    await page.locator(".bd-mx-cell").nth(8).click();
    await frame().waitForFunction(() => { const g = document.querySelector('[data-bf-type="Group"]').firstElementChild; return g.style.alignItems === "flex-end" && g.style.justifyContent === "flex-end"; });
    expect(await page.locator(".bd-mx-cell[aria-pressed=true]").count() === 1, "one cell of the pad is pressed");
    ok("the alignment pad's corner sets align and justify to flex-end together");
    await row(page, "Group").dblclick();
    await page.keyboard.type("Proof");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-layer-name")].some((n) => n.textContent === "Proof"));
    ok("double-clicking the Group's row renames it");
    await page.locator(".bd-search-dock input").fill("stats");
    expect((await layerNames(page)).join(" ") === "1:Proof 2:StatsBlock", `the filter keeps matches and their parents, got ${(await layerNames(page)).join(" ")}`);
    await page.locator(".bd-search-dock input").press("Escape");
    expect(await page.locator(".bd-search-dock input").inputValue() === "", "Escape clears the filter");
    ok("the layer filter narrows to StatsBlock and its group, and Escape clears it");

    await fitAll(page);
    const from = await canvasPoint(page, '[data-bf-type="HeroBlock"]');
    const to = await canvasPoint(page, '[data-bf-type="FeatureGridBlock"]', "bottom");
    await drag(page, from, to);
    const order = (await layerNames(page)).filter((n) => n.startsWith("1:")).map((n) => n.slice(2));
    expect(order.indexOf("HeroBlock") > order.indexOf("FeatureGridBlock"), `pressing on the hero and dragging should move it, got ${order.join(" ")}`);
    ok("pressing anywhere on a canvas node and dragging moves it");

    await row(page, "HeroBlock").click();
    await page.locator(".bd-inspect-head .bd-layer-menu").click();
    await option(page, "Detach into primitives").click();
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-layer-name")].filter((n) => n.textContent === "Button").length >= 2);
    const names = await layerNames(page);
    const heroAt = names.indexOf("1:HeroBlock");
    expect(heroAt >= 0 && names[heroAt + 1] === "2:Grid" && names.slice(heroAt).some((n) => /Heading/.test(n)), `the hero should become a named Section holding a Grid of primitives, got ${names.slice(heroAt, heroAt + 6).join(" ")}`);
    /* The canvas commits on its own schedule, after the layers list. */
    await frame().waitForFunction(() => !document.querySelector('[data-bf-type="HeroBlock"]') && !!document.querySelector('[data-bf-type="Section"] [data-bf-type="Heading"]'))
      .catch(() => { throw new Error("the canvas shows the primitives, not the block"); });
    ok("Detach replaces the HeroBlock with a Section, a Grid, Heading, Text, Buttons and an Image");

    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Content");
    await page.locator('.bd-tile[data-type="Image"]').click();
    await tab(page, "Content");
    await page.locator(".bd-right input[type=url]").fill("https://example.com/pic.png");
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Image"] img')].some((i) => i.getAttribute("src") === "https://example.com/pic.png"));
    await page.locator(".bd-right input[type=url]").fill("javascript:alert(1)");
    await page.waitForTimeout(150);
    expect(await frame().evaluate(() => ![...document.querySelectorAll('[data-bf-type="Image"] img')].some((i) => /^javascript:/.test(i.getAttribute("src") || ""))), "a non-http(s), non-data URL is refused");
    ok("an Image takes a pasted https URL, and refuses a javascript: one");

    await page.locator('.bd-tool-group[aria-label^="Layout,"]').click();
    await page.locator(".bd-tray-item", { hasText: /^Frame$/ }).click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frame(1).waitForFunction(() => !!window.BuilderFrame && !!document.querySelector('[data-bf-slot="root"]'));
    await fitAll(page);
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await page.locator(".bd-layer-frame .bd-layer-main").first().click();
    await row(page, "Proof").click();
    const tag = await page.locator(".bd-mark-tag").boundingBox();
    const empty = await canvasPoint(page, '[data-bf-slot="root"]', "center", 1);
    await drag(page, { x: tag.x + 6, y: tag.y + 6 }, empty);
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    expect(saved.frames[1].root.children.map((c) => c.name || c.type).join() === "Proof" && !saved.frames[0].root.children.some((c) => c.name === "Proof"), "the Group moves from the first frame to the second");
    await frame(1).waitForSelector('[data-bf-type="Group"] [data-bf-type="StatsBlock"]');
    expect(await page.locator(".bd-flabel.is-current .bd-flabel-name").textContent() === "Frame 2", "the frame it landed in becomes active");
    ok("a node drags from one frame into another, and that frame becomes active");
    await page.close();
  });

  await step("Tools add primitives straight away, and land where they are dropped", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    expect(await page.locator(".bd-tools-row > .bd-tool").count() === 4, "one Select/Hand button and three groups in the bar, with no shapes");
    const trays = {};
    for (const g of ["Layout", "Text", "Images and media"]) {
      await page.locator(`.bd-tool-group[aria-label^="${g},"]`).click();
      trays[g] = await page.$$eval(".bd-tray-item", (b) => b.map((x) => x.querySelector(".bd-tray-label").textContent + (x.getAttribute("aria-disabled") ? "*" : "")));
      await page.locator(`.bd-tool-group[aria-label^="${g},"]`).click();
    }
    expect(trays.Layout.join() === "Group,Section,Frame,Tall frame", `the Layout tray, got ${trays.Layout}`);
    expect(trays.Text.join() === "Text,Heading", `the Text tray, got ${trays.Text}`);
    expect(trays["Images and media"].join() === "Image,Video,Cover,Media,Figure,Icons*,Illustrations*", `the media tray, with icons and illustrations to come, got ${trays["Images and media"]}`);
    expect(await page.locator(".bd-tray.is-open").count() === 0, "pressing a group again closes its tray");
    ok("the bar's groups open trays: Group, Section, Frame, Page; Text, Heading; Image, Video, Cover, Media, Figure, with Icons and Illustrations marked coming soon");
    await page.keyboard.press("b");
    await frame().waitForSelector('[data-bf-type="Group"]');
    let d = await saved();
    const group = d.frames[0].root.children[0];
    expect(group.type === "Group" && group.style.padding === "md" && group.style.x === undefined, `B adds a padded Group in the flow, got ${JSON.stringify(group.style)}`);
    expect(await page.locator(".bd-draw, .bd-sketch").count() === 0, "no drawing mode: nothing waits for a drag on the canvas");
    ok("B adds a padded Group straight away, with no marquee to draw");
    await page.keyboard.press("t");
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.type("Drawn text");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Text"]')].some((t) => t.textContent === "Drawn text"));
    d = await saved();
    const kinds = d.frames[0].root.children[0].children.map((c) => c.type);
    expect(kinds.join() === "Text", `the selected container takes the text, got ${kinds.join(", ")}`);
    ok("T adds text inside the selected container and opens it for typing");
    await page.locator('.bd-tool-group[aria-label^="Text,"]').click();
    await page.locator(".bd-tray-item", { hasText: "Heading" }).click();
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.type("Drawn heading");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Heading"]')].some((t) => t.textContent === "Drawn heading"));
    expect(await page.locator('.bd-tool-group[aria-label="Text, Heading"]').count() === 1, "the Text group shows Heading once it's picked");
    ok("Heading, pressed in the Text tray, goes straight in and opens for typing");
    await release(page);
    await page.mouse.click((await stageBox(page)).x + 20, (await stageBox(page)).y + 20);
    await page.locator('.bd-tool-group[aria-label^="Layout,"]').click();
    const gi = await page.locator(".bd-tray.is-open .bd-tray-item", { hasText: "Group" }).boundingBox();
    await page.waitForFunction(() => { const t = document.querySelector(".bd-tray.is-open"); return t && getComputedStyle(t).visibility === "visible"; });
    const fb = await page.locator("iframe.bd-frame").boundingBox();
    const spot = { x: fb.x + fb.width * 0.6, y: fb.y + fb.height * 0.7 };
    await drag(page, { x: gi.x + gi.width / 2, y: gi.y + gi.height / 2 }, spot);
    d = await saved();
    const free = d.frames[0].root.children[d.frames[0].root.children.length - 1];
    expect(free.type === "Group" && Number.isInteger(free.style.x) && Number.isInteger(free.style.y) && free.style.x > 0, `a Group dropped on the frame's canvas is placed freely, got ${JSON.stringify(free.style)}`);
    const left = await frame().evaluate((id) => document.querySelector(`[data-bf-id="${id}"]`).firstElementChild.style.left, free.id);
    expect(left === `calc(var(--dt-space-inset-2xs) * ${free.style.x})`, `its position is steps of a token, got ${left}`);
    ok(`a Group dragged from the tray onto the canvas lands where it's dropped: x ${free.style.x}, y ${free.style.y} steps of --dt-space-inset-2xs`);
    await page.keyboard.press("f");
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    ok("F adds a frame");
    await page.locator('.bd-tool-group[aria-label^="Layout,"]').click();
    await page.locator(".bd-tray-item", { hasText: "Tall frame" }).click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 3);
    const pageFrame = (await saved()).frames[2];
    expect(pageFrame.hug === true && pageFrame.root.children[0].type === "Section", `Page adds a frame that hugs its content, started with a Section, got ${JSON.stringify(pageFrame).slice(0, 160)}`);
    ok("Page, from the Layout tray, adds a frame that hugs its content with a Section to fill");
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Inline"]').click();
    d = await saved();
    const inl = d.frames[d.frames.length - 1].root.children.find((c) => c.type === "Inline");
    expect(inl && inl.props.wrap === false, "an Inline added from the panel starts on one line");
    ok("an Inline added from the panel doesn't wrap");
    await page.close();
  });

  await step("The bar's nav button, trays that drag and close, smart tabs, context sizes, pinning, tooltips and brand buttons", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const current = () => page.locator(".bd-itab[aria-selected=true]").textContent();
    await startFrom(page, "Blank frame");
    await emptyFrame(page);

    const nav = page.locator(".bd-tool-nav");
    expect(/^Select/.test(await nav.getAttribute("aria-label")), "the nav button starts on Select");
    await nav.click();
    expect(/^Hand/.test(await nav.getAttribute("aria-label")) && await page.locator(".bd-stage.is-panning").count() === 1, "pressing it switches to Hand, and the canvas pans");
    await nav.click();
    expect(/^Select/.test(await nav.getAttribute("aria-label")), "pressing it again goes back to Select");
    ok("Select and Hand share one button that toggles between them");

    await page.locator('.bd-tool-group[aria-label^="Layout,"]').click();
    await page.locator(".bd-tray.is-open").waitFor();
    const stage = await stageBox(page);
    await page.mouse.click(stage.x + 30, stage.y + 30);
    await page.waitForFunction(() => !document.querySelector(".bd-tray.is-open"));
    ok("a press on the empty canvas closes an open tray");

    await page.locator('.bd-tool-group[aria-label^="Images and media,"]').click();
    await page.waitForFunction(() => { const t = document.querySelector(".bd-tray.is-open"); return t && getComputedStyle(t).visibility === "visible" && getComputedStyle(t).opacity === "1"; });
    const item = await page.locator(".bd-tray.is-open .bd-tray-item", { hasText: /^Image$/ }).boundingBox();
    const box = await page.locator("iframe.bd-frame").boundingBox();
    const from = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
    const to = await canvasPoint(page, '[data-bf-slot="root"]');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 12, from.y - 12, { steps: 3 });
    await page.locator(".bd-ghost").waitFor({ timeout: 3000 }).catch(async () => {
      const under = await page.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); const t = document.querySelector(".bd-tray"); return { el: el ? el.tagName + "." + el.className + " " + (el.textContent || "").slice(0, 20) : null, tray: t ? t.className + " inert=" + t.hasAttribute("inert") + " " + getComputedStyle(t).visibility + " " + getComputedStyle(t).transform : null }; }, from);
      throw new Error(`pressing and dragging a tray item doesn't start a drag: pressed at ${Math.round(from.x)},${Math.round(from.y)} on ${JSON.stringify(under)}`);
    });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.waitForFunction(() => document.querySelectorAll(".bd-mark-box, .bd-mark-line").length > 0, null, { timeout: 3000 })
      .catch(async () => { throw new Error(`no drop target shows over the frame at ${Math.round(to.x)},${Math.round(to.y)}; the frame is at ${JSON.stringify(box)}`); });
    await page.mouse.up();
    await frame().waitForSelector('[data-bf-type="Image"]', { timeout: 4000 }).catch(() => { throw new Error("an Image dropped from its tray doesn't land on the frame"); });
    await page.waitForFunction(() => /Image/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await current() === "Properties", `an Image opens on Properties, got ${await current()}`);
    ok("an Image dragged from its tray lands on the frame, selected, with the inspector on Content");

    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Shape"]').click();
    await page.waitForFunction(() => /Shape/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await current() === "Appearance", `a Shape opens on Appearance, got ${await current()}`);
    ok("a Shape from the assets panel opens on Appearance");

    await page.mouse.click(stage.x + 30, stage.y + 30);
    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Section"]').click();
    await page.waitForFunction(() => /Section/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await current() === "Layout", `a Section opens on Layout, got ${await current()}`);
    await page.locator(".bd-box-p > .bd-box-all").click();
    const padGroups = await page.$$eval(".bd-dd-list .bd-dd-group", (g) => g.map((x) => x.textContent));
    const padPx = await page.$$eval(".bd-dd-list .bd-dd-px", (g) => g.map((x) => x.textContent));
    expect(padGroups[0] === "Sections and page" && padGroups[1] === "Layout layers", `a Section's padding starts with section padding, then the layout layers, got ${padGroups.join(", ")}`);
    expect(padPx.length > 4 && padPx.every((v) => /^\d+$/.test(v)), `each padding option shows its px, got ${padPx.slice(0, 6).join(", ")}`);
    await page.keyboard.press("Escape");
    ok(`a Section opens on Layout, and its padding offers ${padGroups.join(", ")}, each with its px`);

    await tab(page, "Appearance");
    await choose(page, "Tone", "brand-muted");
    await category(page, "Actions");
    await page.locator('.bd-tile[data-type="Button"]').click();
    await frame().waitForSelector('[data-bf-type="Section"] [data-bf-type="Button"]');
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await current() === "Properties", `a Button opens on Properties, got ${await current()}`);
    const tint = await frame().evaluate(() => {
      const btn = document.querySelector('[data-bf-type="Button"] button, [data-bf-type="Button"] a, button');
      const probe = document.createElement("div");
      probe.style.background = "var(--dt-surface-action-brand)";
      btn.parentElement.appendChild(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { got: getComputedStyle(btn).backgroundColor, want };
    });
    expect(tint.got === tint.want, `a primary Button on a brand-muted Section takes the brand fill: ${tint.got} vs ${tint.want}`);
    ok("a primary Button inside a brand-muted Section takes the base brand colour");

    await tab(page, "Layout");
    await dd(page, "Height").click();
    const hGroups = await page.$$eval(".bd-dd-list .bd-dd-group", (g) => g.map((x) => x.textContent));
    expect(hGroups[0] === "Controls", `a Button's height starts with the control sizes, got ${hGroups.join(", ")}`);
    await page.keyboard.press("Escape");
    ok(`a Button's height offers ${hGroups.join(", ")}`);

    await page.locator(".bd-seg-btn", { hasText: "Pinned" }).click();
    let d = await saved();
    let btn = d.frames[0].root.children.find((c) => c.type === "Section").children[0];
    expect(btn.style.position === "pinned" && btn.style.anchor === "bottom-right", `Pinned pins to the bottom right, got ${JSON.stringify(btn.style)}`);
    await page.locator('.bd-pin-grid .bd-mx-cell[aria-label="Top left"]').click();
    await frame().waitForFunction(() => { const s = getComputedStyle(document.querySelector('[data-bf-type="Button"]').firstElementChild); return s.position === "fixed" && s.top === "0px" && s.left === "0px"; });
    d = await saved();
    btn = d.frames[0].root.children.find((c) => c.type === "Section").children[0];
    expect(btn.style.anchor === "top-left", `the pin pad moves it to the top left, got ${btn.style.anchor}`);
    await page.locator(".bd-seg-btn", { hasText: "In flow" }).click();
    d = await saved();
    btn = d.frames[0].root.children.find((c) => c.type === "Section").children[0];
    expect(!btn.style.position && !btn.style.anchor, `In flow clears the pin, got ${JSON.stringify(btn.style)}`);
    ok("Pinned fixes the Button to the frame, the pin pad moves it, and In flow puts it back");

    await page.mouse.move(stage.x + 10, stage.y + 10);
    await page.locator('.bd-tool-group[aria-label^="Text,"]').hover();
    await page.locator(".bd-tip").waitFor({ timeout: 3000 });
    const tipText = await page.locator(".bd-tip").textContent();
    expect(/^Text/.test(tipText), `the tip names the group, got ${tipText}`);
    await page.mouse.move(stage.x + 10, stage.y + 10);
    await page.waitForFunction(() => !document.querySelector(".bd-tip"));
    ok(`resting on a tool shows its tip ("${tipText}") and moving away hides it`);
    await page.close();
  });

  await step("The rail, Configure in the panel, Content with background removal, edge resizing, a canvas colour, override dots, Shift spacing and Play", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const rail = (name) => page.locator(".bd-rail .bd-tab", { hasText: name });

    const tabs = await page.$$eval(".bd-rail [role=tab]", (b) => b.map((x) => x.textContent));
    expect(tabs.join() === "Home,Assets,Pages,Layers,Content,Configure", `the rail holds Home, Assets, Pages, Layers, Content and Configure, got ${tabs}`);
    const dupes = await page.locator(".bd-toolbar [aria-label='New frame'], .bd-toolbar [aria-label='Dark mode'], .bd-toolbar .bd-frame-size").count();
    expect(dupes === 0, "the top bar no longer repeats New frame, the frame size or dark mode");
    const gone = await page.locator(".bd-toolbar [aria-label='New'], .bd-toolbar [aria-label='Undo'], .bd-toolbar [aria-label='Redo'], .bd-toolbar [aria-label='Hide panels'], .bd-toolbar [aria-label='Copy link'], .bd-toolbar .bd-saved").count();
    expect(gone === 0, "the top bar has no New, Undo, Redo, panels toggle, Copy link or Saved mark");
    const bar = await page.evaluate(() => { const t = document.querySelector(".bd-tb-title").getBoundingClientRect(), b = document.querySelector(".bd-toolbar").getBoundingClientRect(); return { mid: (t.left + t.right) / 2, centre: (b.left + b.right) / 2, text: document.querySelector(".bd-tb-crumbs").textContent.trim() }; });
    expect(Math.abs(bar.mid - bar.centre) < 24 && bar.text === "Untitled", `the project's name sits in the middle of the bar, got "${bar.text}" at ${Math.round(bar.mid)} of ${Math.round(bar.centre)}`);
    await pickLayer(page, "HeroBlock");
    await page.waitForFunction(() => /HeroBlock/.test(document.querySelector(".bd-tb-crumbs")?.textContent || ""));
    const path = await page.locator(".bd-tb-crumbs").textContent();
    expect(/^Untitled›.*›HeroBlock$/.test(path.replace(/\s+/g, "")), `with a layer selected the bar shows the path to it, got ${path}`);
    await page.locator(".bd-tb-crumbs .bd-crumb", { hasText: /^Frame 1$|^Landing$/ }).first().click();
    await page.waitForFunction(() => !/HeroBlock/.test(document.querySelector(".bd-tb-crumbs")?.textContent || ""));
    expect(await page.locator(".bd-right .bd-crumbs").count() === 0, "the inspector no longer repeats the path");
    const layersIcon = await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).locator("svg path").first().getAttribute("d");
    await rail("Layers").click();
    const blocksIcon = await page.locator(".bd-layer-main", { hasText: "HeroBlock" }).first().locator("svg path").last().getAttribute("d");
    expect(layersIcon !== blocksIcon, "the Layers tab and a block's layer have different icons");
    await rail("Configure").click();
    await page.waitForSelector(".bd-config-dock .configure-sheet.is-docked .configure-row");
    expect(await page.evaluate(() => { const b = document.querySelector(".configure-bar"); return !b || getComputedStyle(b).display === "none"; }), "the floating Configure button is gone on this page");
    await page.locator(".bd-config-dock .configure-row", { hasText: "Color" }).click();
    await page.locator(".bd-config-dock [data-bid='back']").waitFor();
    await rail("Assets").click();
    expect(await page.evaluate(() => { const s = document.querySelector(".configure-sheet"); return s.parentElement === document.body && s.hidden; }), "leaving Configure puts the sheet away");
    ok("the rail switches Assets, Layers, Content and Configure; Configure sits in the panel; the bar holds the project in the middle, its path when a layer is picked, and nothing redundant");

    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await rail("Content").click();
    expect((await page.locator(".bd-kind .bd-kind-name").allTextContents()).join(",") === "Brand,Images,Illustrations,Icons,Video", "Content opens on the brand, then a card for each kind");
    await page.locator('.bd-kind[data-kind="images"]').click();
    await page.locator(".bd-gallery-head", { hasText: "Images" }).waitFor();
    const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 160; c.height = 120; const x = c.getContext("2d"); x.fillStyle = "#f3f2ee"; x.fillRect(0, 0, 160, 120); x.fillStyle = "#a01010"; x.beginPath(); x.arc(80, 60, 36, 0, 7); x.fill(); return c.toDataURL("image/png"); });
    await page.setInputFiles("#bd-lib-file", { name: "red-dot.png", mimeType: "image/png", buffer: Buffer.from(png.split(",")[1], "base64") });
    await page.waitForSelector(".bd-lib-item");
    await page.locator(".bd-lib-menu").first().click();
    await option(page, "Remove background").click();
    await page.waitForFunction(() => /Background removed/.test(document.querySelector('.visually-hidden[role="status"]')?.textContent || ""), null, { timeout: 10000 });
    const lib = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.library())));
    expect(lib.images.length === 1 && lib.images[0].original && /^data:image\/png/.test(lib.images[0].src), "the cut-out replaces the picture and keeps the original");
    const corner = await page.evaluate((src) => new Promise((res) => { const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d"); x.drawImage(i, 0, 0); res([x.getImageData(2, 2, 1, 1).data[3], x.getImageData(i.width / 2, i.height / 2, 1, 1).data[3]]); }; i.src = src; }), lib.images[0].src);
    expect(corner[0] === 0 && corner[1] === 255, `the backdrop is clear and the subject solid, got alpha ${corner}`);
    const thumb = await page.locator(".bd-lib-thumb").first().boundingBox();
    const fb = await page.locator("iframe.bd-frame").boundingBox();
    await drag(page, { x: thumb.x + thumb.width / 2, y: thumb.y + thumb.height / 2 }, { x: fb.x + fb.width * 0.4, y: fb.y + fb.height * 0.4 });
    await frame().waitForSelector('[data-bf-type="Image"] img[src^="data:image/png"]');
    let d = await saved();
    const img = d.frames[0].root.children.find((c) => c.type === "Image");
    expect(img && Number.isInteger(img.style.x), `the picture lands where it's dropped, got ${JSON.stringify(img && img.style)}`);
    ok("Content keeps an uploaded image, cuts out its backdrop (corner clear, centre solid), and drags onto the canvas where it's dropped");

    const edge = await page.locator(".bd-resize.is-r").first().boundingBox();
    await drag(page, { x: edge.x + 4, y: edge.y + 100 }, { x: edge.x - 120, y: edge.y + 100 });
    d = await saved();
    expect(d.frames[0].width < 1280 && d.frames[0].width % 10 === 0, `dragging the right edge resizes the frame, got ${d.frames[0].width}`);
    ok(`the frame's right edge drags it to ${d.frames[0].width} wide`);

    await page.mouse.click((await stageBox(page)).x + 20, (await stageBox(page)).y + 20);
    await page.locator(".bd-flabel-btn").first().click();
    await tab(page, "Appearance");
    await page.locator(".bd-canvas-input").evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, "#ffe8cc"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
    await frame().waitForFunction(() => getComputedStyle(document.querySelector(".bf-root")).backgroundColor === "rgb(255, 232, 204)");
    expect((await saved()).frames[0].canvas === "#ffe8cc", "the frame keeps its custom canvas colour");
    ok("a frame takes a custom canvas colour");

    await rail("Assets").click();
    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Stack"]').click();
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await page.locator('.bd-tile[data-type="Text"]').click();
    await frame().waitForSelector('[data-bf-type="Stack"] [data-bf-type="Text"]');
    await rail("Layers").click();
    await row(page, "Heading").click();
    await tab(page, "Layout");
    expect(await page.locator('[data-sec="spacing"] .bd-sec-dot').count() === 0, "nothing set in Spacing, so no dot");
    await page.locator(".bd-box-p > .bd-box-all").click();
    await option(page, /^lg$/).click();
    await page.locator('[data-sec="spacing"] .bd-sec-dot').waitFor();
    ok("a section shows a dot once something in it is set on the item");
    await page.locator(".bd-box-p > .bd-box-all").click();
    await option(page, "None").click();
    await page.locator('[data-sec="spacing"] .bd-sec-dot').waitFor({ state: "detached" });
    await frame().waitForFunction(() => !document.querySelector('[data-bf-type="Stack"] [data-bf-type="Heading"]').firstElementChild.style.padding);

    /* The canvas eases to a new selection; measure once it has settled. */
    let tp = null;
    for (let i = 0; i < 20; i++) {
      const next = await canvasPoint(page, '[data-bf-type="Stack"] [data-bf-type="Text"]');
      if (tp && Math.abs(next.x - tp.x) < 0.5 && Math.abs(next.y - tp.y) < 0.5) break;
      tp = next;
      await page.waitForTimeout(120);
    }
    await page.keyboard.down("Shift");
    await page.mouse.move(tp.x, tp.y, { steps: 4 });
    const tag = page.locator(".bd-spacing-tag").first();
    await tag.waitFor();
    const said = await tag.textContent();
    expect(/^\d+ gap \w+$/.test(said), `Shift shows the gap between the Heading and the Text with its token, got ${said}`);
    await tag.click();
    await page.waitForFunction(() => /Stack/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await page.locator(".bd-itab[aria-selected=true]").textContent() === "Layout", "the label opens the Stack's Layout tab");
    await page.keyboard.up("Shift");
    await page.waitForFunction(() => !document.querySelector(".bd-spacing-tag"));
    /* Alt (Option) measures too: the frame around the Stack, now picked,
       hovered below it. */
    const below = await canvasPoint(page, '[data-bf-type="Stack"]', "bottom");
    await page.mouse.move(below.x + 30, below.y + 90, { steps: 2 });
    await page.keyboard.down("Alt");
    await page.mouse.move(below.x, below.y + 60, { steps: 4 });
    await page.locator(".bd-spacing-tag").first().waitFor();
    await page.keyboard.up("Alt");
    await page.waitForFunction(() => !document.querySelector(".bd-spacing-tag"));
    ok(`Shift or Alt and a hover show the space between two items ("${said}"); its label opens the Stack's gap, and letting go clears it`);

    await page.locator("[aria-label='Play']").first().click();
    await page.locator(".bd-play[open]").waitFor();
    await page.waitForFunction(() => { const i = document.querySelector(".bd-play iframe"); return i && i.contentDocument && i.contentDocument.querySelector('[data-bf-type="Heading"]'); });
    const hs = await page.$$eval(".bd-play .bd-seg-btn", (b) => b.map((x) => x.textContent));
    const w = (await saved()).frames[0].width;
    expect(hs.length >= 3 && (w > 1100 ? hs.includes("900") : w > 500 ? hs.includes("1180") : hs.includes("812")), `screen heights that suit a ${w} wide frame, got ${hs}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-play"));
    ok(`Play shows the frame through a screen-sized window (${hs.join(", ")}) and Escape closes it`);
    await page.close();
  });

  await step("Slots: a block's own buttons are picked on the canvas, changed, and exported in its prop", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const heroOf = (d) => d.frames[0].root.children.find((c) => c.type === "HeroBlock");
    await page.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); const h = d && d.frames[0].root.children.find((c) => c.type === "HeroBlock"); return h && h.children && h.children.some((c) => c.type === "Slot"); });
    let hero = heroOf(await saved());
    const names = hero.children.map((c) => c.props.name);
    expect(names.includes("actions") && names.includes("media"), `the hero's slots come from its types, got ${names}`);
    ok(`a HeroBlock on the canvas gets its slots (${names.join(", ")}) filled from its sample`);

    /* The frame draws the filled slots a moment after the document has them;
       the hero's own button shows before that, and isn't the slot's. */
    const SLOTTED = '[data-bf-type="Slot"] button';
    await frame().waitForFunction((sel) => [...document.querySelectorAll(sel)].some((x) => /Shop the collection/.test(x.textContent)), SLOTTED);
    const pt = await frame().evaluate((sel) => { const b = [...document.querySelectorAll(sel)].find((x) => /Shop the collection/.test(x.textContent)); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, SLOTTED);
    const ib = await page.locator("iframe.bd-frame").boundingBox();
    const sc = await page.evaluate(() => { const i = document.querySelector("iframe.bd-frame"); return i.getBoundingClientRect().width / parseFloat(i.style.width); });
    await page.mouse.click(ib.x + pt.x * sc, ib.y + pt.y * sc);
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || "")).catch(async () => {
      throw new Error(`clicking the hero's button should select it, got "${await page.locator(".bd-inspect-title").first().textContent().catch(() => "nothing")}"`);
    });
    const crumbs = await page.locator(".bd-crumbs").first().textContent();
    expect(/HeroBlock.*Actions.*Button/.test(crumbs), `the path runs through the slot, got ${crumbs}`);
    await tab(page, "Content");
    await page.locator(".bd-right input.bd-input[type=text]").first().fill("Browse mugs");
    await tab(page, "Appearance");
    await choose(page, "Variant", "brand");
    await frame().waitForFunction(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent === "Browse mugs");
      if (!b) return false;
      const probe = document.createElement("div");
      probe.style.background = "var(--dt-surface-action-brand)";
      document.body.appendChild(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(b).backgroundColor === want;
    });
    expect(await frame().locator('[data-bf-type="HeroBlock"]').count() === 1, "the hero is still a HeroBlock, not detached");
    ok(`clicking the hero's button selects it (${crumbs.replace(/\s+/g, " ")}); its label and variant change on the canvas`);

    await page.locator(".bd-export").click();
    const part = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/^import \{ Button \} from/.test(part) && /<Button[^>]*variant="brand"[^>]*>Browse mugs<\/Button>/.test(part) && !/HeroBlock/.test(part), `with the button selected, Code is that button alone, got ${part.slice(0, 160)}`);
    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/<HeroBlock[^]*actions=\{<>[^]*<Button[^>]*variant="brand"[^>]*>Browse mugs<\/Button>/.test(code), "the export writes the slot as JSX in the hero's actions prop");
    expect(/media=\{<>[^]*<Image /.test(code), "and its media as an Image");
    ok("with the button selected Code is just <Button variant=\"brand\">Browse mugs</Button>; with the frame, the hero with actions={<>…</>} and its media as an Image");

    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("Actions")) .bd-layer-main').first().click();
    await page.waitForFunction(() => /Actions/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(/It takes Button/.test(await page.locator(".bd-inspect-sub").first().textContent()), "the slot says what it takes");
    await page.locator(".bd-right .bd-btn", { hasText: "Empty it" }).click();
    await frame().waitForFunction(() => ![...document.querySelectorAll("button")].some((x) => x.textContent === "Browse mugs"));
    await page.locator(".bd-right .bd-btn", { hasText: "Put the sample back" }).click();
    await frame().waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /Shop the collection/.test(x.textContent)));
    ok("the Actions slot says what it takes, empties, and puts the sample back");

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    hero = heroOf(await saved());
    const kids = (await saved()).frames[0].root.children.map((c) => c.type);
    const slot = hero.children.find((c) => c.props.name === "actions");
    expect(!JSON.stringify(slot).includes('"Heading"') && kids[kids.indexOf("HeroBlock") + 1] === "Heading", `a Heading, which Actions doesn't take, goes after the hero instead, got ${kids}`);
    ok("something a slot doesn't take goes after the component instead");

    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frame().waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /Shop the collection/.test(x.textContent)));
    hero = heroOf(await saved());
    expect(hero.children.filter((c) => c.type === "Slot").length === 2, "the slots survive a reload");
    ok("the slots and what's in them survive a reload");

    /* Reopened with its slots already filled, the sample is still there to put back. */
    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    const twisty = page.locator('.bd-layer-twisty[aria-label="Expand HeroBlock"]').first();
    if (await twisty.count()) await twisty.click();
    await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("Actions")) .bd-layer-main').first().click();
    await page.waitForFunction(() => /Actions/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator(".bd-right .bd-btn", { hasText: "Empty it" }).click();
    await frame().waitForFunction(() => ![...document.querySelectorAll("button")].some((x) => /Shop the collection/.test(x.textContent)));
    await page.locator(".bd-right .bd-btn", { hasText: "Put the sample back" }).click();
    await frame().waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /Shop the collection/.test(x.textContent)));
    ok("after a reload, Put the sample back still fills the Actions slot");
    await page.keyboard.press("Escape");

    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    /* The list can still be settling (a component's parts fill in once its
       frame answers), so the hero's row is measured again just before the drop. */
    const heroRowLoc = page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("HeroBlock"))').first();
    await page.waitForTimeout(300);
    const ctaRow = await row(page, "CtaBlock").first().boundingBox();
    await page.mouse.move(ctaRow.x + 30, ctaRow.y + ctaRow.height / 2);
    await page.mouse.down();
    await page.mouse.move(ctaRow.x + 42, ctaRow.y + ctaRow.height / 2 + 12, { steps: 3 });
    let heroRow = await heroRowLoc.boundingBox();
    await page.mouse.move(heroRow.x + 60, heroRow.y + heroRow.height / 2, { steps: 10 });
    await page.waitForTimeout(80);
    heroRow = await heroRowLoc.boundingBox();
    await page.mouse.move(heroRow.x + 60, heroRow.y + heroRow.height / 2, { steps: 2 });
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(250);
    const order = (await layerNames(page)).filter((n) => n.startsWith("1:"));
    expect(Math.abs(order.indexOf("1:CtaBlock") - order.indexOf("1:HeroBlock")) === 1, `a row dropped on the middle of the hero's row lands beside it, since the hero only holds its slots, got ${order.join(" ")}`);
    ok("a layer dropped on the middle of the hero's row lands beside it rather than being refused");
    await page.close();
  });

  await step("Lists: a block's items edit one by one, add, move and go, and export as its prop", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const items = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].root.children.find((c) => c.type === "FaqBlock").props.items);
    const labelsNow = () => page.locator(".bd-list-label").allTextContents();
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Blocks");
    await page.locator('.bd-tile[data-type="FaqBlock"]').click();
    await frame().waitForSelector('[data-bf-type="FaqBlock"]');
    await tab(page, "Content");
    expect(await page.locator(".bd-right .bd-list").count() === 1, "FaqBlock's items show as a list, and defaultOpen, which is state, doesn't");
    const first = await labelsNow();
    expect(first.length === 2 && /dishwasher/.test(first[0]), `each item is named by its question, not its id, got ${first}`);
    const fields = await page.locator(".bd-list-item.is-open .bd-field-label").allTextContents();
    expect(fields.join(",") === "Question,Answer,Id", `an item's fields come from its type with the id last, got ${fields}`);
    await page.locator(".bd-list-item.is-open .bd-list-field", { hasText: "Question" }).locator("input").fill("Do the mugs survive a dishwasher?");
    await frame().waitForFunction(() => document.body.textContent.includes("Do the mugs survive a dishwasher?"));
    ok("FaqBlock's items list by question, open onto Question, Answer and Id, and an edit reaches the canvas");

    await page.locator(".bd-list-add").click();
    let now = await items();
    expect(now.length === 3 && now[2].id === "ship-2" && now[2].question === now[1].question, `a new item copies the last with an id of its own, got ${JSON.stringify(now[2])}`);
    await page.locator(".bd-list-item").nth(0).locator('[aria-label="Move down"]').click();
    await page.locator(".bd-list-item").last().locator('[aria-label^="Remove"]').click();
    now = await items();
    expect(now.map((x) => x.id).join(",") === "ship,dish", `moved and removed, got ${now.map((x) => x.id)}`);
    await frame().waitForFunction(() => { const t = document.body.textContent; return t.indexOf("How long does shipping take?") < t.indexOf("Do the mugs survive a dishwasher?"); });
    ok("Add copies the last item with the id ship-2; Move down and Remove reorder and trim it, on the canvas too");

    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/<FaqBlock[^>]*items=\{\[\{ id: "ship", question: "How long does shipping take\?"[^\]]*\}, \{ id: "dish", question: "Do the mugs survive a dishwasher\?"/.test(code), "the export writes the items as an array in the prop");
    ok("Code writes items={[{ id: \"ship\", … }, { id: \"dish\", question: \"Do the mugs survive a dishwasher?\", … }]}");

    await page.locator(".bd-search-dock input").fill("Navbar");
    await page.locator('.bd-tile[data-type="Navbar"]').click();
    await frame().waitForSelector('[data-bf-type="Navbar"]');
    await tab(page, "Content");
    const hrefField = page.locator(".bd-list-item.is-open .bd-list-field", { hasText: "Href" });
    await hrefField.waitFor();
    /* An href is a Link to control: pick "A web address" to get the field to type in. */
    if (await hrefField.locator("input").count() === 0) { await hrefField.locator(".bd-dd").first().click(); await option(page, "A web address").click(); }
    const href = hrefField.locator("input");
    await href.fill("");
    await href.pressSequentially("https://example.com/shop");
    await page.waitForFunction(() => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].root.children.find((c) => c.type === "Navbar").props.links[0].href === "https://example.com/shop");
    await href.fill("javascript:alert(1)");
    expect(await href.getAttribute("aria-invalid") === "true", "an unsafe link shows as invalid");
    const kept = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].root.children.find((c) => c.type === "Navbar").props.links[0].href);
    expect(kept === "https://example.com/shop", `an unsafe link isn't kept, got ${kept}`);
    await page.locator(".bd-search-dock .bd-search-clear").click();
    ok("a Navbar link's href types in a letter at a time, and javascript: shows invalid and isn't kept");

    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => /Do the mugs survive a dishwasher\?/.test(document.querySelector("iframe.bd-frame")?.contentDocument?.body?.textContent || ""));
    ok("the edited list survives a reload");
    await page.close();
  });

  await step("v8: New (freeform, structured, template), clipboard, selection code, type scale, loose objects, builder settings, parts in layers, export and the inspector's additions", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const lastFrame = async () => { const d = await saved(); return d.frames[d.frames.length - 1]; };
    const pickFrame = async (name) => {
      await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
      await page.locator(".bd-layer-frame .bd-layer-main", { hasText: name }).first().click();
      await page.waitForTimeout(150);
    };
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    await page.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); return d && d.frames[0].root.children[0].children; });

    await assetKind(page, "containers");
    const cards = await page.locator(".bd-container-card .bd-kind-name").allTextContents();
    expect(cards.slice(0, 3).join(",") === "Freeform frame,Structured frame,Tall frame" && cards.length >= 3 + 6 && await page.locator("dialog[open]").count() === 0, `Containers in Assets offers a freeform, a structured and a tall frame, then the screen sizes, got ${cards}`);
    await page.locator(".bd-container-card", { hasText: "Structured frame" }).click();
    let f = await lastFrame();
    expect(f.mode === "structured" && f.root.children[0].type === "Group", `a structured page starts with a Group, got ${JSON.stringify(f.root.children.map((c) => c.type))}`);
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    { const sb = await stageBox(page); await page.mouse.click(sb.x + 6, sb.y + 8); }
    await pickFrame(f.name);
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    f = await lastFrame();
    expect(!f.root.children.some((c) => c.type === "Heading") && findIn(f.root, "Heading"), `on a structured page a Heading put on the page comes in a Group, got ${f.root.children.map((c) => c.type)}`);
    ok("New opens freeform, structured and template; a structured page puts what lands on its page in a Group");

    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await release(page);
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowUp");
    expect(findIn((await lastFrame()).root, "Heading").props.size === "display-md", "Shift+Up three times takes a heading-lg Heading to display-md");
    await page.keyboard.press("Shift+ArrowDown");
    expect(findIn((await lastFrame()).root, "Heading").props.size === "display-sm", "Shift+Down takes it back to display-sm");
    ok("Shift+Up and Shift+Down step a Heading along the type scale, heading-xl to display-sm and back");

    await page.locator(".bd-export").click();
    const one = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/^import \{ Heading \}/.test(one) && !/<div/.test(one), "with a Heading selected, Code is just that Heading");
    await page.keyboard.press("Control+c");
    const first = (await saved()).frames[0].name;
    await pickFrame(first);
    await release(page);
    await page.keyboard.press("Control+v");
    let kids = (await saved()).frames[0].root.children.map((c) => c.type);
    expect(kids[kids.length - 1] === "Heading", `Ctrl+C then Ctrl+V in another frame pastes the Heading there, got ${kids}`);
    await release(page);
    await page.keyboard.press("Control+x");
    kids = (await saved()).frames[0].root.children.map((c) => c.type);
    expect(!kids.includes("Heading"), "Ctrl+X cuts it");
    ok("Code shows just the selection; Ctrl+C, Ctrl+V into another frame, and Ctrl+X");

    const st = await stageBox(page);
    await page.mouse.click(st.x + st.width - 10, st.y + st.height - 60);
    await page.waitForFunction(() => /^Canvas$/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator('.bd-stage-swatches .bd-seg-btn[aria-label="Dark grey"]').click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".bd-stage")).backgroundColor === "rgb(58, 58, 64)");
    await page.locator('.bd-stage-swatches .bd-seg-btn[aria-label="Default"]').click();
    ok("a press on the empty canvas shows the builder's own settings, and its background takes a colour");

    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    expect(await page.locator("[aria-label='Expand everything'], [aria-label='Collapse everything']").count() === 0, "no expand or collapse everything buttons");
    await page.locator('.bd-layer-twisty[aria-label="Expand HeroBlock"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-layer.is-part").length >= 2);
    expect(await page.locator('.bd-layer:has(.bd-layer-name:text-is("Actions"))').count() > 0, "the hero's Actions slot is a row among its parts");
    expect(await page.locator(".bd-layer.is-part[aria-disabled=true] button").count() === 0, "a component's own parts can't be picked");
    expect(await page.locator(".bd-layer.is-part.is-pickable", { hasText: "Title" }).count() > 0, "the hero's title is a part that can be picked");
    ok("Layers shows a component's own parts, its title pickable and the rest disabled, with its slots in place");

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Actions");
    await page.keyboard.press("Shift+Digit1");
    const tile = await page.locator('.bd-tile[data-type="Button"]').boundingBox();
    await page.mouse.move(tile.x + 30, tile.y + 30);
    await page.mouse.down();
    await page.mouse.move(tile.x + 80, tile.y + 60, { steps: 4 });
    await page.mouse.move(st.x + st.width - 120, st.y + st.height - 160, { steps: 10 });
    expect(await page.locator(".bd-ghost-el").count() === 1, "the tile's own preview follows the pointer");
    await page.mouse.up();
    await page.waitForTimeout(400);
    const loose = (await saved()).frames.filter((x) => x.bare);
    expect(loose.length === 1 && loose[0].root.children[0].type === "Button" && typeof loose[0].x === "number", `a Button dropped off every frame is a loose object, got ${JSON.stringify(loose.map((x) => [x.name, x.x, x.y]))}`);
    ok(`a Button dropped on the empty canvas stays there, loose, at ${loose[0].x}, ${loose[0].y}`);

    await pickFrame(first);
    await page.keyboard.press("Shift+Digit2");
    await page.waitForTimeout(200);
    const fr = frames(page)[0];
    const box = await page.locator("iframe.bd-frame").first().boundingBox();
    const sc = await page.evaluate(() => { const i = document.querySelector("iframe.bd-frame"); return i.getBoundingClientRect().width / parseFloat(i.style.width); });
    const r = await fr.evaluate(() => { const el = document.querySelector('[data-bf-type="StatsBlock"]').firstElementChild.getBoundingClientRect(); return { x: el.left + 40, y: el.top + 30 }; });
    await page.mouse.move(box.x + r.x * sc, box.y + r.y * sc);
    await page.mouse.down();
    await page.mouse.move(box.x + r.x * sc + 20, box.y + r.y * sc + 30, { steps: 5 });
    await page.mouse.move(box.x + r.x * sc + 40, box.y + r.y * sc + 120, { steps: 5 });
    const ghost = await page.locator(".bd-ghost-el, .bd-ghost").count();
    const shifted = await fr.evaluate(() => /translate/.test(document.querySelector('[data-bf-type="StatsBlock"]').firstElementChild.style.transform));
    await page.keyboard.press("Escape");
    await page.mouse.up();
    const back = await fr.evaluate(() => document.querySelector('[data-bf-type="StatsBlock"]').firstElementChild.style.transform === "");
    expect(shifted && ghost === 0, `a node dragged in its frame moves itself, with no picture of it over the canvas (moved: ${shifted}, pictures: ${ghost})`);
    expect(back, "cancelling the drag puts it back");
    ok("a block dragged in its frame moves itself, and Escape puts it back");

    const firstFrame = async () => (await saved()).frames[0];
    await page.locator("[aria-label='Constrain proportions']").click();
    await page.waitForFunction(() => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].lock === true);
    const before = await firstFrame();
    await page.locator("input[aria-label='Frame width']").fill(String(Math.round(before.width / 2)));
    await page.keyboard.press("Enter");
    await page.waitForFunction((w) => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].width !== w, before.width);
    const after = await firstFrame();
    expect(after.lock && !after.hug && Math.abs(after.height - Math.round(before.height / 2)) <= 1, `with proportions kept, half the width halves the height: ${before.width}×${before.height} to ${after.width}×${after.height}`);
    ok(`Constrain proportions: ${before.width} × ${before.height} became ${after.width} × ${after.height}`);

    await pickFrame(f.name);
    await tab(page, "Appearance");
    await page.locator(".bd-right .bd-field", { hasText: "Canvas" }).locator(".bd-dd").first().click();
    await option(page, /^brand$/).click();
    await frames(page)[frames(page).length - 2].waitForFunction(() => getComputedStyle(document.querySelector(".bf-root")).getPropertyValue("--dt-text-primary").trim() === "var(--dt-text-on-brand)" || getComputedStyle(document.querySelector("h1, h2, h3")).color === getComputedStyle(document.querySelector(".bf-root")).color);
    ok("a page on the brand fill re-points its text roles, so a Heading on it reads in --dt-text-on-brand");

    const download = page.waitForEvent("download", { timeout: 20000 });
    await page.locator(".bd-inspect-head .bd-frame-menu").click();
    await option(page, "Export as PNG").click();
    const file = await download;
    expect(/\.png$/.test(file.suggestedFilename()), "the frame downloads as a PNG");
    ok(`Export as PNG downloads ${file.suggestedFilename()}`);

    await pickFrame(first);
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator(".bd-search-dock input").fill("Badge");
    await page.locator('.bd-tile[data-type="Badge"]').click();
    await page.locator(".bd-search-dock .bd-search-clear").click();
    await tab(page, "Properties");
    await page.locator(".bd-right .bd-field", { hasText: "Tone" }).locator(".bd-dd").first().click();
    const swatches = await page.locator(".bd-dd-list .bd-sw").count();
    await page.keyboard.press("Escape");
    expect(swatches >= 5, `the tone list shows a swatch for each colour, got ${swatches}`);
    expect(await page.locator(".bd-right .bd-field", { hasText: "Invert colours" }).count() === 0 && await page.locator(".bd-right .bd-field", { hasText: "Text colour" }).count() === 0, "a Badge has neither Invert colours (pictures only) nor Text colour (text only)");
    await tab(page, "Appearance");
    await page.locator(".bd-right .bd-blend-dd").click();
    await option(page, "Multiply").click();
    await frames(page)[0].waitForFunction(() => { const b = [...document.querySelectorAll('[data-bf-type="Badge"]')].pop(); return getComputedStyle(b.firstElementChild).mixBlendMode === "multiply"; });

    await tab(page, "Layout");
    await dd(page, "Width").click();
    const widths = await page.$$eval(".bd-dd-list .bd-dd-opt-label", (o) => o.map((x) => x.textContent));
    await page.keyboard.press("Escape");
    expect(!widths.some((w) => /avatar/.test(w)) && widths.some((w) => /control-/.test(w)), `a Badge's widths leave out avatar sizes and offer control sizes, got ${widths.join(", ")}`);
    ok("tone swatches, a Multiply blend from the blend icon, no invert or text colour, and no avatar sizes on a Badge");
    await page.close();
  });

  await step("v9: Export on the right, a frame's components, thin outlines, a colour picker, Fixed and scrubbed sizes, swap, copy a frame, layer links, glass New, variables and templates", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    /* What's saved lands a beat after a change; wait for it rather than race it. */
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await page.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); return d && d.frames[0].root.children.length; });

    const bar = await page.locator("#app-toolbar .bd-toolbar").boundingBox();
    const exp = await page.locator(".bd-export").boundingBox();
    expect((await page.locator(".bd-export").textContent()).trim() === "Export" && bar.x + bar.width - (exp.x + exp.width) < 24 && bar.width > 1000, `the top bar spans the header with Export at its right end (bar ${Math.round(bar.width)}px wide)`);
    ok("the top bar spans the header, Export at its right end");

    await pickLayer(page, "StatsBlock");
    await page.waitForFunction(() => /StatsBlock/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.waitForSelector(".bd-mark-sel");
    const outline = await page.evaluate(() => getComputedStyle(document.querySelector(".bd-mark-sel")).outlineWidth);
    expect(outline === "1px", `the selection outline is thin, got ${outline}`);
    ok("pressing a layer selects it on the canvas, outlined at 1px");

    await tab(page, "Appearance");
    expect(await page.locator(".bd-right .bd-canvas-custom .bd-canvas-ic").count() >= 1, "custom colours open from a colour picker icon");
    ok("custom colours open from a colour picker icon");

    await release(page);
    await page.keyboard.press("Escape");
    await pressButton(page, "Shop the collection");
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Layout");
    await dd(page, "Width").click();
    const sizing = await page.$$eval(".bd-dd-list .bd-dd-opt-label", (o) => o.map((x) => x.textContent));
    expect(["Auto", "Hug contents", "Fill container", "Fixed"].every((x) => sizing.includes(x)), `Width offers Auto, Hug contents, Fill container and Fixed, got ${sizing.slice(0, 6).join(", ")}`);
    await option(page, /^Fixed$/).click();
    await page.waitForFunction(() => { const d = JSON.parse(JSON.stringify(window.__builder.doc())); let b = null; (function w(x) { (x.children || []).forEach((c) => { if (!b && c.type === "Button") b = c; w(c); }); })(d.frames[0].root); return b && b.style.w && !/^(hug|fill)$/.test(b.style.w); });
    const fixedW = findIn((await saved()).frames[0].root, "Button").style.w;
    ok(`Width offers Hug contents, Fill container and Fixed; Fixed holds the Button at ${fixedW}`);

    const pre = await page.locator('.bd-right .bd-dd[aria-label="Height"] .bd-dd-prefix').boundingBox();
    await page.mouse.move(pre.x + 4, pre.y + pre.height / 2);
    await page.mouse.down();
    await page.mouse.move(pre.x + 80, pre.y + pre.height / 2, { steps: 8 });
    await page.mouse.up();
    const scrubbed = await poll(async () => findIn((await saved()).frames[0].root, "Button").style.height, Boolean);
    expect(!!scrubbed, "dragging the H sideways steps the height through its sizes");
    await release(page);
    await page.keyboard.press("Control+z");
    expect(!(await poll(async () => findIn((await saved()).frames[0].root, "Button").style.height, (v) => !v)), "the whole scrub is one undo step");
    ok(`dragging H sideways scrubbed the height to ${scrubbed}, and one undo takes it back`);

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator(".bd-search-dock input").fill("Badge");
    const tileBox = await page.locator('.bd-tile[data-type="Badge"]').boundingBox();
    const onButton = await canvasPoint(page, '[data-bf-type="Button"]');
    await page.keyboard.down("Control");
    await page.mouse.move(tileBox.x + 30, tileBox.y + 30);
    await page.mouse.down();
    await page.mouse.move(tileBox.x + 80, tileBox.y + 50, { steps: 4 });
    await page.mouse.move(onButton.x, onButton.y, { steps: 10 });
    expect(await page.locator(".bd-mark-box.is-swap").count() === 1, "a Cmd- or Ctrl-drag from a tile marks what it would swap");
    await page.mouse.up();
    await page.keyboard.up("Control");
    await page.locator(".bd-search-dock .bd-search-clear").click();
    await page.waitForFunction(() => /Badge/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const badge = await poll(async () => findIn((await saved()).frames[0].root.children.find((c) => c.type === "HeroBlock"), "Badge"), Boolean);
    expect(badge && badge.style.w === fixedW, `the Badge takes the Button's place and its size (${fixedW}), got ${JSON.stringify(badge && badge.style)}`);
    ok(`Ctrl-dragging Badge onto the Button swapped it, at the Button's width ${fixedW}`);

    await page.evaluate(() => { window.DovetailCopy = { write: (t, cb) => { window.__copied = t; cb(true); } }; });
    await page.locator(".bd-project-menu").click();
    await option(page, /^Copy link/).click();
    const link = await page.evaluate(() => window.__copied);
    const nid = badge.id;
    expect(link.includes("&n=" + nid), `the link names the selected layer, got ${link.slice(-60)}`);
    const shared = await open({ width: 1280, height: 900 }, { hash: link.slice(link.indexOf("#")) });
    await shared.page.waitForFunction(() => /Badge/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await shared.page.close();
    ok("Copy link carries the selected layer's id, and the link opens with that layer selected");

    const before = (await saved()).frames.length;
    const lab = await page.locator(".bd-flabel.is-current .bd-flabel-btn").boundingBox();
    await page.keyboard.down("Control");
    await page.keyboard.down("Shift");
    await page.mouse.move(lab.x + 10, lab.y + lab.height / 2);
    await page.mouse.down();
    await page.mouse.move(lab.x + 60, lab.y + 40, { steps: 4 });
    await page.mouse.move(lab.x + 300, lab.y + 200, { steps: 8 });
    expect(await page.locator(".bd-dup").count() === 1, "a Cmd-Shift-drag shows where the copy lands");
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await page.keyboard.up("Control");
    const after = await poll(async () => (await saved()).frames, (fs) => fs.length === before + 1);
    expect(after.length === before + 1 && typeof after[1].x === "number" && /copy$/.test(after[1].name), `Cmd-Shift-drag on a frame's name drops a copy where it's let go, got ${JSON.stringify(after.map((f) => [f.name, f.x, f.y]))}`);
    ok(`Cmd-Shift-dragging the frame dropped ${after[1].name} at ${after[1].x}, ${after[1].y}`);
    /* The copy renders its own Badge; click that one once it's there. */
    await page.waitForFunction(() => { const fs = [...document.querySelectorAll("iframe.bd-frame")]; const last = fs[fs.length - 1]; try { return !!last.contentDocument.querySelector('[data-bf-type="Badge"]'); } catch (err) { return false; } });
    { const at = await canvasPoint(page, '[data-bf-type="Badge"]', "center", await page.evaluate(() => { const fs = [...document.querySelectorAll("iframe.bd-frame")]; return fs.map((f, i) => (f.contentDocument.querySelector('[data-bf-type="Badge"]') ? i : -1)).filter((i) => i >= 0).pop(); })); await page.mouse.click(at.x, at.y); }
    await page.waitForFunction(() => /Badge/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));

    expect(await page.locator(".bd-toolbar .bd-start, .bd-toolbar [aria-label='New']").count() === 0, "the bar has no New button");
    await assetKind(page, "containers");
    expect(await page.locator(".bd-container-card").count() >= 9, "new frames come from Containers in Assets");
    ok("New lives in Assets › Containers; the bar has no + button");

    await page.locator(".bd-export").click();
    expect(/^Export:/.test(await page.locator("#bd-code-title").textContent()) && await page.locator(".bd-code-actions .bd-btn", { hasText: "PNG" }).count() === 1, "Export offers code, PNG, JPG and the layout");
    await page.keyboard.press("Escape");
    ok("Export offers code, a PNG or JPG, and the layout JSON");

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click().catch(() => {});
    await page.locator('.bd-assets [data-asset-kind="variables"]').click();
    await page.locator(".bd-vars-sec", { hasText: "Radius" }).locator(".bd-var", { hasText: /^pill$/ }).click();
    const radius = await poll(async () => (await saved()).frames.map((f) => findIn(f.root, "Badge")).filter(Boolean).map((b) => b.style.radius).find(Boolean), (v) => v === "pill");
    expect(radius === "pill", `a variable pressed applies to the selection, got radius ${radius}`);
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
    await page.locator('.bd-assets [data-asset-kind="templates"]').click();
    const count = (await saved()).frames.length;
    await page.locator('.bd-tpl-card[data-template="store"] .bd-tpl-new').click();
    const withStore = await poll(async () => (await saved()).frames, (fs) => fs.length === count + 1);
    expect(withStore.length === count + 1, `a template's frames go beside yours, got ${withStore.map((f) => f.name).join(", ")}`);
    ok("Variables apply to the selection (radius pill on the Badge); a template adds its frames beside yours");
    await page.close();
  });

  await step("v10: floating panels, one search at the foot, canvas presses let go, the system at rest, New as a menu, templates that add, block titles, media fills, conditional controls, mode toggle, Heroicons", async () => {
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const library = JSON.stringify({ images: [{ id: "lib1", name: "Dot", src: PNG }], illustrations: [], icons: [], video: [] });
    const { page } = await open({ width: 1440, height: 900 }, { store: { "dovetail-builder-library": library } });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await page.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); return d && d.frames[0].root.children.length; });

    const panel = await page.evaluate(() => { const l = document.querySelector(".bd-left"), st = document.querySelector(".bd-stage"); const lr = l.getBoundingClientRect(), sr = st.getBoundingClientRect(); return { radius: parseFloat(getComputedStyle(l).borderTopLeftRadius), inset: lr.left, under: sr.left <= lr.left && sr.right >= document.querySelector(".bd-right").getBoundingClientRect().right }; });
    expect(panel.radius > 0 && panel.inset > 0 && panel.under, `the panels float over the canvas, inset and rounded, got ${JSON.stringify(panel)}`);
    const plus = await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).locator("svg path").first().getAttribute("d");
    expect(/^M12 4\.5v15/.test(plus), `the builder draws with Heroicons, got ${plus}`);
    ok("the side panels float over a full-width canvas, inset with rounded corners; the icons are Heroicons");

    const searchTop = async () => Math.round((await page.locator(".bd-search-dock").boundingBox()).y);
    const atAssets = await searchTop();
    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    const atLayers = await searchTop();
    await page.locator(".bd-rail .bd-tab", { hasText: "Content" }).click();
    const atContent = await searchTop();
    expect(atAssets === atLayers && atLayers === atContent && await page.locator(".bd-search").count() === 1, `one search floats at the panel's foot in the same place on every page, got ${atAssets}, ${atLayers}, ${atContent}`);
    ok(`one search sits at the foot of Assets, Layers and Content, at y ${atAssets}`);

    const st = await stageBox(page);
    await pickLayer(page, "StatsBlock");
    await page.mouse.click(st.x + st.width / 2, st.y + 8);
    await page.waitForFunction(() => /^Canvas$/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await page.locator(".bd-ring").count() === 0 && await page.locator(".bd-mark-sel").count() === 0, "a press on the canvas lets go of the layer and the frame");
    const secs = await page.$$eval(".bd-right .bd-sec-h", (h) => h.map((x) => x.textContent.trim()));
    expect(["Primitives", "Styles"].every((x) => secs.includes(x)) && !secs.includes("Variables") && !secs.includes("Frames"), `with nothing selected the inspector shows Primitives and Styles, and Variables only on the left, got ${secs.join(", ")}`);
    const before = (await saved()).frames[0].root.children.length;
    await page.locator('.bd-sys-prim[data-type="Stack"]').click();
    await poll(async () => (await saved()).frames[0].root.children.length, (n) => n === before + 1);
    ok(`a press on the canvas lets go of everything; the inspector then shows Primitives and Styles (sections: ${secs.join(", ")}), and a primitive adds itself`);

    await assetKind(page, "templates");
    await page.locator('.bd-tpl-card[data-template="store"] .bd-tpl-into').click();
    const into = await poll(async () => (await saved()).frames, (fs) => fs.length === 1 && fs[0].root.children.some((c) => c.type === "StoreHeader" || c.type === "ProductGridBlock"));
    expect(into.length === 1 && into[0].root.children.some((c) => c.type === "HeroBlock"), "a template put into a frame adds to it and keeps what was there");
    await page.locator('.bd-tpl-card[data-template="settings"] .bd-tpl-new').click();
    const added = await poll(async () => (await saved()).frames, (fs) => fs.length === 2);
    expect(added.length === 2 && added[0].root.children.some((c) => c.type === "HeroBlock"), "a template as a new frame goes beside the others");
    ok("Assets' templates go into the current frame or beside it as a new frame; nothing is cleared");

    await page.locator(".bd-layer-frame .bd-layer-main", { hasText: added[0].name }).first().click().catch(async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click(); await page.locator(".bd-layer-frame .bd-layer-main", { hasText: added[0].name }).first().click(); });
    await page.keyboard.press("Shift+Digit2");
    await page.waitForTimeout(250);
    const h1 = await canvasPoint(page, '[data-bf-type="HeroBlock"] h1', "left", 0);
    await page.mouse.click(h1.x, h1.y);
    await page.waitForFunction(() => /^Title$/.test((document.querySelector(".bd-inspect-title")?.textContent || "").trim()));
    const sizeBefore = await frames(page)[0].evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-bf-type="HeroBlock"] h1')).fontSize));
    await release(page);
    await page.keyboard.press("Shift+ArrowUp");
    const titleSize = await poll(async () => (await saved()).frames[0].root.children.find((c) => c.type === "HeroBlock").props.titleSize, (v) => v === "display-md");
    await frames(page)[0].waitForFunction((b) => parseFloat(getComputedStyle(document.querySelector('[data-bf-type="HeroBlock"] h1')).fontSize) > b, sizeBefore);
    ok(`pressing the hero's heading picks its Title; Shift+Up makes it ${titleSize}, larger on the canvas`);

    await page.locator(".bd-rail .bd-tab", { hasText: "Content" }).click();
    await page.locator('.bd-kind[data-kind="images"]').click();
    const thumb = await page.locator(".bd-lib-thumb").first().boundingBox();
    const img = await canvasPoint(page, '[data-bf-type="HeroBlock"] [data-bf-type="Image"]', "center", 0);
    await page.mouse.move(thumb.x + 20, thumb.y + 20);
    await page.mouse.down();
    await page.mouse.move(thumb.x + 60, thumb.y + 40, { steps: 4 });
    await page.mouse.move(img.x, img.y, { steps: 10 });
    expect(await page.locator(".bd-mark-box.is-swap").count() === 1, "a picture over an Image marks it to be filled");
    await page.mouse.up();
    const filled = await poll(async () => { const hero = (await saved()).frames[0].root.children.find((c) => c.type === "HeroBlock"); let im = null; (function w(x) { (x.children || []).forEach((c) => { if (!im && c.type === "Image") im = c; w(c); }); })(hero); return im && im.props.src; }, (v) => v === PNG);
    expect(filled === PNG, "a picture dropped on an Image fills it");
    ok("a picture from Content dropped on the hero's Image fills it");

    await page.waitForFunction(() => /Image/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Appearance");
    expect(await page.locator(".bd-right .bd-field", { hasText: "Invert colours" }).count() === 1 && await page.locator(".bd-right .bd-field", { hasText: "Text colour" }).count() === 0, "an Image has Invert colours and no Text colour");
    const optH = await (async () => { await page.locator(".bd-right .bd-blend-dd").click(); const h = await page.locator(".bd-dd-list .bd-dd-opt").first().evaluate((el) => el.getBoundingClientRect().height); await page.keyboard.press("Escape"); return h; })();
    expect(optH >= 40, `dropdown options are roomy, got ${optH}px`);
    ok(`an Image offers Invert colours and no Text colour; blend opens from an icon, its options ${Math.round(optH)}px tall`);

    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-mode-toggle").click();
    expect(await poll(async () => (await saved()).frames[0].dark, Boolean) === true, "the frame's sun and moon toggle turns it dark");
    ok("a frame's light and dark is one toggle icon");
    await page.close();
  });

  await step("v11: rows for the system, no component list on a frame, social type, any freeform size, structured auto layout, corners and shadow on demand, local components, a theater", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await page.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); return d && d.frames[0].root.children.length; });

    { const sb = await stageBox(page); await page.mouse.click(sb.x + sb.width / 2, sb.y + 8); }
    await page.waitForFunction(() => /^Canvas$/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const rows = await page.$$eval(".bd-right .bd-sys-list .bd-sys-item", (r) => r.map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
    expect(rows.length > 10 && rows.every(([w, h]) => w > 200 && h < 56), `primitives and styles list as full-width rows, got ${rows.length} rows, first ${JSON.stringify(rows[0])}`);
    const kinds = await page.$$eval(".bd-asset-kinds .bd-kind", (k) => k.map((x) => Math.round(x.getBoundingClientRect().width)));
    expect(kinds.length === 6 && Math.abs(kinds[0] - kinds[1]) < 2 && await page.locator(".bd-asset-kinds .bd-kind-note").count() === 0, `the Assets kinds are two columns of icon and name, got widths ${kinds.join(", ")}`);
    await page.locator('.bd-assets [data-asset-kind="primitives"]').click();
    const prim = await page.locator('.bd-tile[data-type="Stack"]').evaluate((t) => ({ icon: !!t.querySelector(".bd-thumb.is-icon .bd-ic"), stage: !!t.querySelector(".bd-thumb-stage"), h: Math.round(t.getBoundingClientRect().height) }));
    expect(prim.icon && !prim.stage && prim.h < 120, `a primitive's tile is its icon and name, got ${JSON.stringify(prim)}`);
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
    ok(`the system lists as ${rows.length} rows; Assets kinds and primitives are icon-and-name tiles in two columns`);

    await page.locator(".bd-flabel.is-current .bd-flabel-btn").click();
    await page.waitForFunction(() => /Landing/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const secs = await page.$$eval(".bd-right .bd-sec-h", (h) => h.map((x) => x.textContent.trim()));
    expect(!secs.includes("Components") && await page.locator(".bd-frame-item").count() === 0, `a frame's inspector lists no components, got ${secs.join(", ")}`);
    const h1 = () => page.evaluate(() => { const d = document.querySelector("iframe.bd-frame").contentDocument; return parseFloat(getComputedStyle(d.querySelector('[data-bf-type="HeroBlock"] h1')).fontSize); });
    const before = await h1();
    await pick(page, "Device", /^Social post$/);
    const post = await poll(async () => (await saved()).frames[0], (f) => f.typeScale === "social" && f.width === 1080);
    expect(post.typeScale === "social" && post.width === 1080 && post.height === 1350, `the Social post preset sizes the frame 1080 × 1350 with social type, got ${post.width} × ${post.height} ${post.typeScale}`);
    await page.waitForFunction(() => document.querySelector("iframe.bd-frame").contentDocument.querySelector('[data-type-scale="social"]'));
    const after = await poll(h1, (v) => v > before * 2);
    expect(after > before * 2, `social type sets the hero's headline far larger, ${before}px became ${after}px`);
    await tab(page, "Layout");
    await page.locator('.bd-right .bd-dd[aria-labelledby^="bd-pg-type "]').click();
    await option(page, /^Page$/).click();
    expect(!(await poll(async () => (await saved()).frames[0].typeScale, (v) => !v)), "Type scale back to Page takes the social sizes off");
    ok(`a frame lists no components; Social post is 1080 × 1350 with data-type-scale="social", its headline ${before}px to ${after}px, and Type scale sets it back`);

    await addContainer(page, "Freeform frame");
    await poll(async () => (await saved()).frames.length, (n) => n === 2);
    const w = page.locator("input[aria-label='Frame width']");
    await w.fill("40");
    await w.press("Enter");
    const tiny = await poll(async () => (await saved()).frames[1].width, (v) => v === 40);
    expect(tiny === 40, `a freeform frame takes any width, got ${tiny}`);
    await page.locator(".bd-container-card", { hasText: "Structured frame" }).click();
    const page3 = await poll(async () => (await saved()).frames[2], Boolean);
    const g = page3.root.children[0];
    expect(page3.gap && g.type === "Group" && g.props.direction === "column" && g.props.gap && g.style.w === "default" && g.style.paddingLeft === "gutter" && g.style.paddingRight === "gutter", `a structured page and its Group get auto layout in the page column, got gap ${page3.gap}, ${JSON.stringify(g.props)} ${JSON.stringify(g.style)}`);
    ok(`a freeform frame shrinks to ${tiny}px wide; a structured page gaps its sections (${page3.gap}) and its Group stacks with gap ${g.props.gap} in the page column, with the page gutter at its sides`);

    await fitAll(page);
    await pressButton(page, "Shop the collection");
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Appearance");
    expect(await page.locator('.bd-right [aria-label="Add corners"]').count() === 1 && await page.locator('.bd-right [aria-label="Add a shadow"]').count() === 1 && await page.locator(".bd-right .bd-field", { hasText: /^Radius/ }).count() === 0, "corners and shadow wait behind their + buttons");
    await page.locator('.bd-right [aria-label="Add corners"]').click();
    await page.locator('.bd-right [aria-label="Add a shadow"]').click();
    const btn = await poll(async () => findIn((await saved()).frames[0].root, "Button"), (b) => b && b.style.radius && b.style.elevation);
    expect(btn.style.radius && btn.style.elevation && await page.locator('.bd-right [aria-label="Remove the corners"]').count() === 1, `+ adds a radius and a shadow, got ${JSON.stringify(btn.style)}`);
    ok(`Corners and Shadow show None until +; pressing them gives the Button radius ${btn.style.radius} and elevation ${btn.style.elevation}`);

    /* A layout saved with a raw colour on the Button, as an older or edited save might hold. */
    await page.evaluate(async (id) => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      (function w(x) { (x.children || []).forEach((c) => { if (c.id === id) c.style.fill = "#ff0000"; w(c); }); })(d.frames[0].root);
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    }, btn.id);
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame);
    await fitAll(page);
    await pressButton(page, "Shop the collection");
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator(".bd-inspect-head .bd-layer-menu").click();
    await option(page, "Create component").click();
    await page.locator(".bd-comp-dlg[open]").waitFor();
    expect(await page.locator(".bd-comp-status.is-blocked").count() === 1 && await page.locator(".bd-comp-dlg .bd-btn-primary").isDisabled(), "a custom fill blocks the component, and says why");
    await page.locator(".bd-comp-dlg .bd-btn", { hasText: "Use the system's instead" }).click();
    await page.locator(".bd-comp-status.is-ready").waitFor();
    await page.locator(".bd-comp-name").fill("Shop button");
    await page.locator(".bd-comp-dlg .bd-btn-primary").click();
    await page.waitForFunction(() => !document.querySelector(".bd-comp-dlg[open]"));
    const lib = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.library() || {})));
    const mine = (lib.components || [])[0];
    expect(mine && mine.name === "Shop button" && mine.tokens.length && !mine.node.style.fill, `the component saves with its tokens and no custom fill, got ${JSON.stringify(mine && { name: mine.name, tokens: mine.tokens, style: mine.node.style })}`);
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-assets [data-asset-kind="components"]').click();
    await page.locator(".bd-cat", { hasText: "My components" }).click();
    const count = (await saved()).frames[0].root.children.length;
    await page.locator('.bd-mine-btn', { hasText: "Shop button" }).click();
    await poll(async () => (await saved()).frames[0], (f) => JSON.stringify(f).split('"Shop button"').length > 2 || f.root.children.length > count);
    await page.locator(".bd-search-dock input").fill("shop");
    expect(await page.locator(".bd-assets .bd-mine-btn", { hasText: "Shop button" }).count() === 1, "search finds a local component");
    await page.locator(".bd-search-dock .bd-search-clear").click();
    ok(`a custom fill blocks Create component until "Use the system's instead"; "Shop button" saves on ${mine.tokens.length} tokens, sits in My components, adds to the frame and turns up in search`);

    await page.locator("[aria-label='Play']").first().click();
    await page.locator(".bd-play[open]").waitFor();
    const theater = await page.evaluate(() => { const p = document.querySelector(".bd-play"), bar = document.querySelector(".bd-play-bar").getBoundingClientRect(); return { bg: getComputedStyle(p).backgroundColor, w: p.getBoundingClientRect().width, mid: Math.round(bar.left + bar.width / 2), bottom: Math.round(innerHeight - bar.bottom) }; });
    expect(theater.w >= 1440 && Math.abs(theater.mid - 720) < 4 && theater.bottom < 40 && await page.locator(".bd-play-bar .bd-seg-btn").count() >= 3, `Play fills the screen on a dark stage with its heights in a bar at the foot, got ${JSON.stringify(theater)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-play"));
    ok(`Play is a theater: full screen on ${theater.bg}, the screen heights in a bar centred at the foot`);
    await page.close();
  });

  await step("Carousel: its items lie flat while editing, take drops and edits, export as children, and move in Play", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const carousel = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())).frames[0].root.children.find((c) => c.type === "Carousel"));
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await page.locator(".bd-search-dock input").fill("Carousel");
    await page.locator('.bd-tile[data-type="Carousel"]').click();
    await page.locator(".bd-search-dock .bd-search-clear").click();
    await frame().waitForSelector(".bf-carousel-board");
    let c = await carousel();
    expect(c.children.length === 5 && c.children.every((k) => k.type === "Cover"), `a new Carousel arrives with five Covers to move, got ${c.children.map((k) => k.type)}`);
    const flat = await frame().evaluate(() => ({ items: document.querySelectorAll(".bf-carousel-item").length, covers: document.querySelectorAll('.bf-carousel-item [data-bf-type="Cover"]').length, live: document.querySelectorAll("[data-carousel-item]").length, head: document.querySelector(".bf-carousel-head").textContent }));
    expect(flat.items === 5 && flat.covers === 5 && flat.live === 0 && /ring · 5 items/.test(flat.head), `while editing, the items lie flat with nothing moving, got ${JSON.stringify(flat)}`);
    ok(`a Carousel added to the frame brings five Covers, laid flat in a row ("${flat.head}")`);

    const at = await canvasPoint(page, '.bf-carousel-item:nth-child(2) [data-bf-type="Cover"]');
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => /Cover/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const crumbs = await page.locator(".bd-crumbs").first().textContent();
    expect(/Carousel.*Cover/.test(crumbs), `the item's path runs through the Carousel, got ${crumbs}`);
    ok("an item is picked on the canvas like any layer, inside its Carousel");

    await pickLayer(page, "Carousel");
    await page.waitForFunction(() => /Carousel/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Layout");
    await choose(page, "Layout", "coverflow");
    await frame().waitForFunction(() => /coverflow · 5 items/.test(document.querySelector(".bf-carousel-head").textContent));
    await tab(page, "Properties");
    expect(await page.locator(".bd-right .bd-field", { hasText: "Pace" }).first().locator(".bd-dd").count() === 1, "Pace is a set of steps, not a number box");
    await choose(page, "Pace", "1.5×");
    c = await carousel();
    expect(c.props.layout === "coverflow" && c.props.pace === 1.5, `layout and pace are set, got ${JSON.stringify(c.props)}`);
    expect(!(await labels(page)).some((l) => /^(Value|Paused)$/.test(l)), "value and paused, which an app drives, aren't offered");
    ok("its Layout tab sets coverflow, Pace steps to 1.5×, and value and paused aren't offered");

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForFunction(() => document.querySelectorAll(".bf-carousel-item").length === 6);
    c = await carousel();
    expect(c.children[5].type === "Heading", `with the Carousel selected, a Heading goes in as a sixth item, got ${c.children.map((k) => k.type)}`);
    const spot = await frame().evaluate((id) => {
      const r = document.querySelectorAll(".bf-carousel-item")[1].getBoundingClientRect();
      const d = window.BuilderFrame.drop(r.left + 6, r.top + r.height / 2, null);
      return d && { parent: d.parent === id, index: d.index, upright: !!d.line && d.line.width === 0 };
    }, c.id);
    expect(spot && spot.parent && spot.index === 1 && spot.upright, `a drop between two items lands in the Carousel between them, on an upright line, got ${JSON.stringify(spot)}`);
    ok("a component added with the Carousel selected becomes an item, and a drop between items lands between them");

    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/<Carousel[^>]*layout="coverflow"[^>]*>\s*<Cover[^]*<Heading[^]*<\/Carousel>/.test(code) && /import \{[^}]*Carousel[^}]*\}/.test(code), `the export writes the items as the Carousel's children, got ${code.slice(0, 200)}`);
    ok("Code writes <Carousel layout=\"coverflow\" …> with its Covers and the Heading inside");

    await page.locator("[aria-label='Play']").first().click();
    await page.locator(".bd-play[open]").waitFor();
    await page.waitForFunction(() => { const i = document.querySelector(".bd-play iframe"); return i && i.contentDocument && i.contentDocument.querySelectorAll("[data-carousel-item]").length === 6; });
    const live = await page.evaluate(() => { const d = document.querySelector(".bd-play iframe").contentDocument; return { region: d.querySelectorAll('[aria-roledescription="carousel"]').length, board: d.querySelectorAll(".bf-carousel-board").length }; });
    expect(live.region === 1 && live.board === 0, `Play renders the real carousel, got ${JSON.stringify(live)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-play"));
    ok("Play renders the real Carousel with all six items, not the flat board");
    await page.close();
  });

  await step("Layouts from elsewhere: the reference's example opens whole, and a pasted layout lists what it left out", async () => {
    const md = fs.readFileSync(path.join(ROOT, "assets/builder-layouts.md"), "utf8");
    const m = /\]\(https:\/\/[^)]*builder\.html(#b=[\w-]+)\)/.exec(md);
    expect(m, "the layout reference links its example into the builder");
    const ex = await open({ width: 1440, height: 900 }, { hash: m[1] });
    await ex.frame().waitForSelector('[data-bf-type="HeroBlock"]');
    await ex.frame().waitForSelector('[data-bf-type="Shape"]');
    await ex.page.waitForFunction(() => /Opened a shared layout/.test(document.querySelector('.visually-hidden[role="status"]')?.textContent || ""));
    const said = await ex.page.locator('.visually-hidden[role="status"]').last().textContent();
    expect(!/left out/.test(said), `the example should open with nothing left out, but: ${said}`);
    ok("the example in assets/builder-layouts.md opens on the canvas with nothing left out");

    await startFrom(ex.page, "Paste a layout");
    const pasted = [
      { type: "Heading", props: { children: "Pricing" } },
      { type: "Group", props: { direction: "row", gap: "md" }, style: { padding: "lg", w: "320px" }, children: [
        { type: "Card", props: { title: "Starter", onClick: "alert(1)" } },
        { type: "Card", props: { title: "Team" } },
        { type: "Sparkle" },
      ] },
      { type: "Text", children: "Billed monthly." },
    ];
    await ex.page.locator(".bd-import-text").fill("```json\n" + JSON.stringify(pasted) + "\n```");
    const report = await ex.page.locator(".bd-import-report").textContent();
    expect(/1 frame, 5 layers/.test(report), `the summary counts what comes in, got: ${report}`);
    for (const bit of ["onClick isn't a prop", "\"320px\" isn't a token option", "\"Sparkle\" isn't something the builder places"]) expect(report.includes(bit), `the report should say ${bit}, got: ${report}`);
    await ex.page.locator(".bd-import-actions .bd-btn-primary").click();
    await ex.page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await ex.frame(1).waitForFunction(() => document.querySelectorAll('[data-bf-type="Card"]').length === 2 && [...document.querySelectorAll('[data-bf-type="Text"]')].some((t) => t.textContent === "Billed monthly."));
    const saved = await ex.page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    expect(saved.frames.length === 2 && saved.frames[0].name === "Launch" && saved.frames[1].name === "Pasted", "the pasted frame sits beside the example's");
    const group = saved.frames[1].root.children[1];
    expect(JSON.stringify(group.style) === JSON.stringify({ padding: "lg" }) && group.children.length === 2, `only token styles and known components come in, got ${JSON.stringify(group)}`);
    ok("a pasted list of nodes, in a code fence, comes in as a new frame; an unknown prop, a raw width and an unknown component are listed and left out");

    await startFrom(ex.page, "Paste a layout");
    await ex.page.locator(".bd-import-text").fill("not a layout");
    expect(/isn't JSON, JSX or a builder link/.test(await ex.page.locator(".bd-import-report").textContent()) && await ex.page.locator(".bd-import-actions .bd-btn-primary").isDisabled(), "text that isn't a layout is refused");
    await ex.page.locator(".bd-import-text").fill(JSON.stringify(saved));
    await ex.page.locator(".bd-import-actions .bd-btn", { hasText: "Replace all frames" }).click();
    await ex.page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    ok("text that isn't a layout is refused, and a saved layout pasted back replaces the frames");
    await ex.page.close();
  });

  await step("JSX: pasted from anywhere, opened from a docs example, and the Code dialog's own export pasted back", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    /* A component's empty slots are the builder's own, filled in once it lands. */
    const shape = (n) => { const kids = (n.children || []).filter((c) => c.type !== "Slot" || (c.children || []).length); return n.type + (kids.length ? "(" + kids.map(shape).join(",") + ")" : ""); };
    await startFrom(page, "Paste a layout");
    const jsx = `import { Section, Stack, Heading, Text, Button } from "@dovetail-ds/react";

<Section tone="subtle" width="narrow">
  <Stack gap="md">
    <Heading level={2} size="heading-lg">Workshops</Heading>
    <Text tone="secondary">Throw a mug, glaze it, take it home.</Text>
    <div style={{ display: "flex", flexDirection: "row", gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-md)", width: "320px" }}>
      <Button variant="brand" onClick={() => book()}>Book a place</Button>
      <Button variant="secondary" {...more}>See dates</Button>
    </div>
    <HeroBlock title="Kiln days" actions={<><Button>Shop</Button></>} />
    <Carousel label="Glazes">{glazes.map((g) => <Cover key={g.id} title={g.name} />)}</Carousel>
    <Sparkle />
  </Stack>
</Section>`;
    await page.locator(".bd-import-text").fill("```jsx\n" + jsx + "\n```");
    const report = await page.locator(".bd-import-report").textContent();
    for (const bit of ["onClick is a handler", "spreads props from code", "width: \"320px\" isn't a token", "came in as 5 sample Cover", "<Sparkle> isn't something the builder places"]) expect(report.includes(bit), `the report should say ${bit}, got: ${report}`);
    await page.locator(".bd-import-actions .bd-btn-primary").click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    let d = await saved();
    const pastedFrame = d.frames[1];
    const sec = pastedFrame.root.children[0];
    expect(shape(sec) === "Section(Stack(Heading,Text,Group(Button,Button),HeroBlock(Slot(Button)),Carousel(Cover,Cover,Cover,Cover,Cover)))", `the JSX should come in as its tree, got ${shape(sec)}`);
    const [heading, , group, hero] = sec.children[0].children;
    expect(heading.props.level === "2" || heading.props.level === 2, `level={2} should become the level option, got ${JSON.stringify(heading.props)}`);
    expect(heading.props.children === "Workshops" && group.props.direction === "row" && group.props.gap === "sm" && group.style.padding === "md", `text, the div's flex and its token padding should come in, got ${JSON.stringify([heading.props, group])}`);
    expect(hero.children[0].props.name === "actions" && hero.children[0].children[0].props.children === "Shop", "the actions={<>…</>} slot should hold its Button");
    await frame(1).waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Book a place"));
    ok("pasted JSX with an import line in a fence comes in as Section › Stack › Heading, Text, a Group from the <div>, a HeroBlock with its actions slot and a Carousel of five sample Covers; the handler, the spread, a raw width and an unknown tag are listed");

    await page.locator(".bd-export").click();
    await page.locator(".bd-code-pre code").waitFor();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    await startFrom(page, "Paste a layout");
    await page.locator(".bd-import-text").fill(code);
    const back = await page.locator(".bd-import-report").textContent();
    expect(/Everything in it comes in/.test(back), `the Code dialog's JSX should paste back whole, got: ${back}`);
    await page.locator(".bd-import-actions .bd-btn-primary").click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 3);
    d = await saved();
    /* The export writes a component's default parts out (the hero's picture),
       so they come back as layers; the tree around them is what must match. */
    const flow = (n) => { const kids = (n.children || []).filter((c) => c.type !== "Slot"); return n.type + (kids.length ? "(" + kids.map(flow).join(",") + ")" : ""); };
    expect(flow(d.frames[2].root) === flow(d.frames[1].root), `the round trip should give the same tree, got ${flow(d.frames[2].root)} vs ${flow(d.frames[1].root)}`);
    ok("the Code dialog's JSX for that frame pastes back with nothing left out, as the same tree");
    await page.close();

    const docs = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(docs);
    /* Some work already saved in this browser, which the example joins. */
    await docs.goto(server.origin + "/builder.html");
    await docs.waitForFunction(() => !!window.__builder);
    await docs.goto(server.origin + "/components/Carousel.html");
    const btn = docs.locator(".open-btn").first();
    const where = await docs.$$eval(".open-btn", (b) => b.map((x) => x.parentNode.querySelector("pre").getAttribute("data-lang")));
    expect(where.length >= 1 && where.every((l) => l === "jsx"), `only JSX examples with components carry Open in builder, got ${where}`);
    await btn.click();
    await docs.waitForSelector(".bd-assets", { state: "attached" });
    await docs.waitForFunction(() => { const d = (window.__builder ? JSON.parse(JSON.stringify(window.__builder.doc())) : null); return d && d.frames.some((f) => f.name === "Example"); });
    const ex = await docs.evaluate(() => { const d = JSON.parse(JSON.stringify(window.__builder.doc())); const f = d.frames.find((x) => x.id === d.active); return { name: f.name, kids: f.root.children.map((c) => c.type + ":" + (c.children || []).length), frames: d.frames.length, hash: location.hash }; });
    expect(ex.name === "Example" && ex.kids.join(",") === "Carousel:5,Carousel:5" && ex.frames > 1 && ex.hash === "", `the example should open as a new, active frame beside the saved ones with sample items, got ${JSON.stringify(ex)}`);
    await docs.waitForFunction(() => /Added the example as a new frame/.test(document.querySelector('.visually-hidden[role="status"]')?.textContent || ""));
    ok("Open in builder on the Carousel page adds the example as an active frame beside the saved ones, two Carousels of five sample items, and says what it filled in");
    await docs.close();
  });

  await step("Projects: each its own canvas, renamed, switched, duplicated, deleted, versioned, downloaded and opened again", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const doc = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const proj = () => page.evaluate(() => window.__builder.project());
    const types = (d) => d.frames.map((f) => f.root.children.map((c) => c.type).join("+")).join(" | ");
    const cards = () => page.locator(".bd-projects .bd-proj .bd-proj-name").allTextContents();
    /* Switching projects replaces the canvas's frames; wait for the new one. */
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const openHome = async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click(); await page.locator(".bd-home .bd-proj").first().waitFor(); };

    expect(await page.locator(".bd-project-name").textContent() === "Untitled" && /HeroBlock/.test(types(await doc())), "a first visit opens one project, Untitled, on the landing page");
    await page.locator(".bd-project-name").dblclick();
    await page.locator("input.bd-project-name").fill("Kiln site");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__builder.project().name === "Kiln site");
    const first = await proj();
    ok("a first visit opens Untitled on the landing page; double-clicking its name in the bar renames it Kiln site");

    await openHome();
    expect(await page.locator('.bd-toolbar [aria-label="Projects"]').count() === 0 && await page.locator(".bd-shell[inert]").count() === 1 && (await page.locator(".bd-toolbar .bd-tb-home").textContent()) === "Home", "Home is a page over the canvas, named in the bar, with the canvas inert beneath");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-home") && !document.querySelector(".bd-shell[inert]"));
    ok("Home opens from the rail as a page over the canvas, and Escape goes back to it");
    await openHome();
    const listed = await cards(), meta0 = await page.locator(".bd-proj.is-current .bd-proj-meta").textContent();
    expect(listed.join() === "Kiln site" && /Open now/.test(meta0), `the home lists the one project, marked open now, got ${listed} / ${meta0}`);
    await homeNew(page, "New file");
    await page.waitForFunction((id) => window.__builder.project().id !== id && !document.querySelector(".bd-home"), first.id);
    await ready();
    expect(await page.locator(".bd-project-name").textContent() === "Untitled" && types(await doc()) === "", "New file opens a blank canvas of its own");
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    expect(await history(page).undo.isEnabled(), "an edit can be undone");
    ok("New, then New file, opens a blank canvas, and a Heading goes onto it");

    await openHome();
    expect((await cards()).length === 2, "two projects now");
    await page.locator(".bd-proj", { hasText: "Kiln site" }).locator(".bd-proj-open").click();
    await page.waitForFunction((id) => window.__builder.project().id === id, first.id);
    await ready();
    await frame().waitForSelector('[data-bf-type="HeroBlock"]');
    expect(/HeroBlock/.test(types(await doc())) && !/Heading/.test(types(await doc())) && await history(page).undo.isDisabled(), "Kiln site opens as it was, with a fresh history");
    ok("opening Kiln site from the home brings its own canvas back, with nothing to undo from the other project");

    await openHome();
    await cardMenu(page, "Kiln site", "Duplicate");
    await page.waitForFunction(() => document.querySelectorAll(".bd-projects .bd-proj").length === 3);
    expect((await cards()).includes("Kiln site copy"), "Duplicate makes Kiln site copy");
    await cardMenu(page, "Kiln site copy", "Delete");
    await page.locator(".bd-proj-confirm .bd-btn-danger").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-projects .bd-proj").length === 2);
    await page.locator(".bd-projects-search input").fill("kiln");
    expect((await cards()).join() === "Kiln site", "search narrows the list");
    await page.locator(".bd-toolbar .bd-home-back").click();
    await page.waitForFunction(() => !document.querySelector(".bd-home"));
    ok("Duplicate makes Kiln site copy, Delete asks first and removes it, and search narrows the list");

    await page.locator(".bd-project-menu").click();
    await option(page, "Versions").click();
    await page.locator(".bd-versions[open]").waitFor();
    await page.locator(".bd-versions .bd-btn", { hasText: "Keep this version" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-versions .bd-version").length === 1);
    await page.keyboard.press("Escape");
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Text"]').click();
    await page.waitForFunction(() => JSON.stringify(window.__builder.doc()).includes('"type":"Text"'));
    await page.locator(".bd-project-menu").click();
    await option(page, "Versions").click();
    await page.locator(".bd-versions .bd-version").first().locator(".bd-btn", { hasText: "Restore" }).click();
    await page.waitForFunction(() => !JSON.stringify(window.__builder.doc()).includes('"type":"Text"'));
    await page.keyboard.press("Control+z");
    await page.waitForFunction(() => JSON.stringify(window.__builder.doc()).includes('"type":"Text"'));
    ok("a kept version restores the canvas without the Text added since, and undo takes the restore back");

    const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { await page.locator(".bd-project-menu").click(); await option(page, "Download file").click(); })()]);
    const file = path.join(os.tmpdir(), "kiln-site-" + Date.now() + ".dovetail");
    await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(data.format === "dovetail-project" && data.name === "Kiln site" && /HeroBlock/.test(types(data.doc)) && dl.suggestedFilename() === "Kiln-site.dovetail", `Download file writes the project, got ${dl.suggestedFilename()} ${JSON.stringify({ format: data.format, name: data.name })}`);
    await openHome();
    await page.locator(".bd-projects input[type=file][accept^='.dovetail']").setInputFiles(file);
    await page.waitForFunction((id) => window.__builder.project().id !== id && window.__builder.project().name === "Kiln site", first.id);
    const imported = await proj();
    await page.evaluate(() => window.__builder.flush());
    await page.reload();
    await page.waitForFunction(() => !!window.__builder);
    expect((await proj()).id === imported.id && /HeroBlock/.test(types(await doc())), "a reload opens the last project again");
    fs.unlinkSync(file);
    ok("Download file saves Kiln-site.dovetail; Open file brings it back as a new project, and a reload reopens it");
    await page.close();

    const legacy = { frames: [{ id: "old", name: "My old page", width: 1280, height: 800, hug: true, root: { id: "root", type: "Root", props: {}, style: {}, children: [{ id: "h1", type: "Heading", props: { children: "Saved before projects" }, style: {} }] } }], active: "old" };
    const moved = await open({ width: 1440, height: 900 }, { store: { "dovetail-builder": JSON.stringify(legacy) } });
    await moved.frame().waitForFunction(() => document.body.textContent.includes("Saved before projects"));
    const left = await moved.page.evaluate(() => ({ name: window.__builder.project().name, old: localStorage.getItem("dovetail-builder") }));
    expect(left.name === "My old page" && left.old === null, `work saved before projects moves into a project of its own, got ${JSON.stringify(left)}`);
    ok("a layout saved before projects opens as its own project, My old page, and the old entry is cleared");
    await moved.page.close();
  });

  await step("Projects on Home: a group of files, made from New, with files moved in and out, sorted, searched, downloaded and deleted", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const proj = () => page.evaluate(() => window.__builder.project());
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const openHome = async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click(); await page.locator(".bd-home .bd-proj").first().waitFor(); };
    const names = (sel) => page.locator(sel + " .bd-proj-name").allTextContents();
    const first = await proj();

    await openHome();
    const opts = await page.locator(".bd-home-new").click().then(() => page.locator(".bd-dd-opt-label").allTextContents());
    await page.keyboard.press("Escape");
    expect(opts.slice(0, 2).join() === "New project,New file" && opts.includes("Landing page") && opts.includes("Open a file…"), `New holds New project, New file, the templates and Open a file, got ${opts}`);
    expect(await page.locator(".bd-proj .bd-act").count() === 0 && await page.locator(".bd-proj .bd-proj-menu").count() === 1, "a card's actions are in its ⋯ menu, with no buttons on its picture");
    ok("New is one button holding New project, New file, the templates and Open a file; each card's actions are in its ⋯ menu");

    await homeNew(page, "New project");
    await page.locator(".bd-home-heading input.bd-home-title").waitFor();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Kiln & Co");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".bd-home-title") && document.querySelector(".bd-home-title").textContent === "Kiln & Co");
    expect(await page.locator(".bd-home-crumbs").textContent() === "Home›Kiln & Co" && /No files in this project yet/.test(await page.locator(".bd-projects-empty").textContent()), "a new project opens on Home, named as you type, empty, with a path back");
    ok("New project makes an empty project, opened on Home with its name ready to type, and a path back to Home");

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-home-crumbs") && document.querySelector(".bd-home"));
    expect((await names(".bd-home-sec[aria-label=Projects]")).join() === "Kiln & Co" && /0 files/.test(await homeCard(page, "Kiln & Co").textContent()), "Escape goes back to Home, which lists the project");
    await cardMenu(page, "Untitled", "Move to Kiln & Co");
    await page.waitForFunction(() => window.__builder.project().group);
    expect(await page.locator(".bd-home-sec[aria-label=Files]").count() === 0 && /1 file/.test(await homeCard(page, "Kiln & Co").textContent()), "the file moves into the project and off Home");
    await page.locator(".bd-home-search input").fill("untit");
    expect((await names(".bd-home-sec[aria-label=Files]")).join() === "Untitled" && /in Kiln & Co/.test(await homeCard(page, "Untitled").textContent()), "searching Home finds a file inside a project, and says which");
    await page.locator(".bd-home-search input").fill("");
    ok("Escape goes back to Home; Move to Kiln & Co puts the file in the project, and searching Home still finds it, marked in Kiln & Co");

    await homeCard(page, "Kiln & Co").locator(".bd-proj-open").click();
    await homeNew(page, "New file in Kiln & Co");
    await page.waitForFunction((id) => window.__builder.project().id !== id && !document.querySelector(".bd-home"), first.id);
    await ready();
    const second = await proj();
    const firstNow = await page.evaluate((id) => window.__builder.store.getProject(id), first.id);
    expect(second.group && second.group === firstNow.group, "a file made inside a project belongs to it");
    expect(await page.locator(".bd-tb-crumbs .bd-tb-group").textContent() === "Kiln & Co", "the bar names the file's project first");
    await page.locator(".bd-tb-crumbs .bd-tb-group").click();
    await page.waitForFunction(() => document.querySelector(".bd-home-crumbs"));
    await page.locator(".bd-home-sort .bd-seg-btn", { hasText: "A–Z" }).click();
    expect((await names(".bd-home")).join() === "Untitled,Untitled 2", `A–Z sorts the project's files by name, got ${await names(".bd-home")}`);
    await page.locator(".bd-home-sort .bd-seg-btn", { hasText: "Recent" }).click();
    expect((await names(".bd-home")).join() === "Untitled 2,Untitled", "Recent puts the file on screen first");
    ok("New file inside the project goes into it; the bar names the project first and opens it on Home; A–Z and Recent order its files");

    const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { await page.locator(".bd-home-crumbs .bd-crumb", { hasText: "Home" }).click(); await cardMenu(page, "Kiln & Co", "Download as a file"); })()]);
    const file = path.join(os.tmpdir(), "kiln-co-" + Date.now() + ".dovetail");
    await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(data.format === "dovetail-bundle" && data.name === "Kiln & Co" && data.files.length === 2 && data.files.every((f) => f.format === "dovetail-project"), `a project downloads as one bundle of its files, got ${JSON.stringify({ format: data.format, n: data.files && data.files.length })}`);
    await page.locator(".bd-projects input[type=file][accept^='.dovetail']").setInputFiles(file);
    await page.waitForFunction(() => document.querySelector(".bd-home-title") && document.querySelector(".bd-home-title").textContent === "Kiln & Co" && document.querySelectorAll(".bd-home .bd-proj").length === 2);
    fs.unlinkSync(file);
    ok("Download as a file saves the project as one bundle of its two files; opening it makes a new project with both, shown on Home");

    await page.locator(".bd-home-crumbs .bd-crumb", { hasText: "Home" }).click();
    expect((await names(".bd-home-sec[aria-label=Projects]")).length === 2, "two projects called Kiln & Co now");
    await homeCard(page, "Kiln & Co").first().locator(".bd-proj-menu").click();
    await option(page, "Delete").click();
    expect(/Delete the project and its 2 files\?/.test(await page.locator(".bd-proj-confirm").textContent()), "deleting a project asks, and counts its files");
    await page.locator(".bd-proj-confirm .bd-btn", { hasText: "Keep files" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-home-sec[aria-label=Projects] .bd-proj").length === 1 && document.querySelectorAll(".bd-home-sec[aria-label=Files] .bd-proj").length === 2);
    ok("deleting a project asks first; Keep files leaves its two files loose on Home");
    await page.close();
  });

  await step("Content per project: a project's files share their uploads, other projects and loose files don't, and a moved file brings its own", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const openHome = async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click(); await page.locator(".bd-home").waitFor(); };
    const images = () => page.evaluate(() => window.__builder.library().images.map((i) => i.name).sort().join());
    const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 40; c.height = 30; c.getContext("2d").fillRect(0, 0, 40, 30); return c.toDataURL("image/png"); });
    const upload = async (name) => {
      await page.locator(".bd-rail .bd-tab", { hasText: "Content" }).click();
      if (await page.locator(".bd-gallery-head [aria-label='Back to Content']").count()) await page.locator(".bd-gallery-head [aria-label='Back to Content']").click();
      await page.locator('.bd-kind[data-kind="images"]').click();
      await page.setInputFiles("#bd-lib-file", { name, mimeType: "image/png", buffer: Buffer.from(png.split(",")[1], "base64") });
      await page.waitForFunction((n) => window.__builder.library().images.some((i) => i.name.startsWith(n.replace(/\.png$/, ""))), name);
    };

    await openHome();
    await homeNew(page, "New project");
    await page.locator(".bd-home-heading input.bd-home-title").waitFor();
    await page.keyboard.press("Control+a"); await page.keyboard.type("Kiln"); await page.keyboard.press("Enter");
    await homeNew(page, "New file in Kiln");
    await page.waitForFunction(() => !document.querySelector(".bd-home") && window.__builder.project().group);
    await ready();
    await page.locator(".bd-rail .bd-tab", { hasText: "Content" }).click();
    expect(/Shared by the files in Kiln/.test(await page.locator(".bd-content-scope").textContent()), "Content says it's shared by the project's files");
    await upload("mug.png");
    ok("a file made in a project shows Content as shared by Kiln's files, and an upload lands there");

    await openHome();
    await homeCard(page, "Kiln").locator(".bd-proj-open").click();
    await homeNew(page, "New file in Kiln");
    await page.waitForFunction(() => !document.querySelector(".bd-home") && window.__builder.project().name === "Untitled 3");
    await ready();
    await page.waitForFunction(() => window.__builder.library().images.length === 1);
    expect(/^mug/.test(await images()), `a second file in Kiln sees the same upload, got ${await images()}`);
    ok("a second file in the same project sees mug.png");

    await openHome();
    await homeCard(page, "Untitled").locator(".bd-proj-open").click();
    await page.waitForFunction(() => !document.querySelector(".bd-home") && window.__builder.project().name === "Untitled");
    await ready();
    await page.waitForFunction(() => window.__builder.library().images.length === 0);
    expect(/made before projects|This file's own/.test(await page.evaluate(() => { const el = document.querySelector(".bd-content-scope"); return el ? el.textContent : "This file's own"; })), "the loose file keeps its own content");
    await upload("jug.png");
    ok("a loose file sees none of Kiln's uploads and keeps its own");

    await openHome();
    await cardMenu(page, "Untitled", "Move to Kiln");
    await page.waitForFunction(() => window.__builder.project().group && window.__builder.library().images.length === 2);
    expect(/^jug.*,mug/.test(await images()), `moved into Kiln, the file brings jug.png and now sees mug.png too, got ${await images()}`);
    ok("moving the loose file into Kiln brings its upload along, and it now sees Kiln's too");
    await page.close();
  });

  await step("Project settings: each project keeps its own canvas colour, theme and picture", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const proj = () => page.evaluate(() => window.__builder.project());
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const stageBg = () => page.evaluate(() => document.querySelector(".bd-stage").style.backgroundColor);
    const radius = () => page.evaluate(() => window.DovetailConfigurePanel.config().radius);
    const openHome = async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click(); await page.locator(".bd-home .bd-proj").first().waitFor(); };
    /* A click on the canvas itself, clear of frames and panels, selects nothing and shows the canvas settings. */
    /* The camera can still be settling as a project opens, so a spot is
       found and clicked again until the canvas settings show. */
    const clickStage = async () => {
      await ready();
      for (let tries = 0; tries < 4; tries++) {
        const pt = await page.evaluate(() => { const st = document.querySelector(".bd-stage").getBoundingClientRect(); for (let y = st.bottom - 20; y > st.top; y -= 30) for (let x = st.left + st.width / 2; x < st.right - 10; x += 30) { const el = document.elementFromPoint(x, y); if (el && (el.classList.contains("bd-stage") || el.classList.contains("bd-world"))) return { x, y }; } return null; });
        expect(pt, "there's empty canvas to click");
        await page.mouse.click(pt.x, pt.y);
        if (await page.locator(".bd-stage-swatches").waitFor({ timeout: 1500 }).then(() => true, () => false)) return;
      }
      throw new Error("a click on empty canvas should show the canvas settings");
    };
    await page.waitForFunction(() => window.DovetailConfigurePanel && window.DovetailConfigurePanel.theme);

    await clickStage();
    await page.locator('.bd-stage-swatches [aria-label="Black"]').click();
    await page.waitForFunction(() => document.querySelector(".bd-stage").style.backgroundColor === "rgb(20, 20, 22)");
    await page.evaluate(() => { const P = window.DovetailConfigurePanel; const t = P.theme(); t.config.radius = "sharp"; P.loadTheme(t); });
    await page.waitForFunction(() => window.__builder.project().theme && window.__builder.project().theme.config.radius === "sharp");
    const first = await proj();
    expect(first.stage === "#141416", `the canvas colour is saved with the project, got ${first.stage}`);
    ok("a black canvas and a sharp-cornered theme are saved with the first project");

    await openHome();
    await homeNew(page, "New file");
    await page.waitForFunction((id) => window.__builder.project().id !== id, first.id);
    await ready();
    expect(await stageBg() === "", `a new project starts on the builder's own canvas colour, got ${await stageBg()}`);
    expect(await radius() === "sharp", "and with the theme that was on screen");
    await clickStage();
    await page.locator('.bd-stage-swatches [aria-label="White"]').click();
    await page.evaluate(() => { const P = window.DovetailConfigurePanel; const t = P.theme(); t.config.radius = "soft"; P.loadTheme(t); });
    await page.waitForFunction(() => window.__builder.project().theme && window.__builder.project().theme.config.radius === "soft");
    expect((await proj()).name === "Untitled 2", `a second blank project is Untitled 2, got ${(await proj()).name}`);
    ok("a new project, Untitled 2, starts on the default canvas with the theme on screen, then takes a white canvas and soft corners of its own");

    await openHome();
    const order = await page.locator(".bd-projects .bd-proj .bd-proj-name").allTextContents();
    expect(order[0] === "Untitled 2", `the project on screen is listed first, got ${order}`);
    await page.locator(".bd-proj", { hasText: /^Untitled(?! 2)/ }).locator(".bd-proj-open").click();
    await page.waitForFunction((id) => window.__builder.project().id === id, first.id);
    await ready();
    expect(await stageBg() === "rgb(20, 20, 22)", `the first project's black canvas comes back, got ${await stageBg()}`);
    expect(await radius() === "sharp", `and its sharp corners, got ${await radius()}`);
    ok("the project on screen is listed first; going back to the first project brings back its black canvas and sharp corners");

    /* A picture of your own stays when the project is left and opened again. */
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
    await openHome();
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), cardMenu(page, "Untitled", "Choose a picture")]);
    await chooser.setFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
    await page.waitForFunction(() => window.__builder.project().thumbSet === true);
    const chosen = (await proj()).thumb;
    await page.locator(".bd-proj", { hasText: "Untitled 2" }).locator(".bd-proj-open").click();
    await page.waitForFunction((id) => window.__builder.project().id !== id, first.id);
    await ready();
    const kept = await page.evaluate((id) => window.__builder.store.getProject(id), first.id);
    expect(kept.thumbSet && kept.thumb === chosen, "leaving the project doesn't replace the chosen picture");
    ok("a picture chosen for a project stays when the project is left");

    /* A file from elsewhere brings its theme, cleaned. */
    const file = path.join(os.tmpdir(), "settings-" + Date.now() + ".dovetail");
    const theDoc = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    fs.writeFileSync(file, JSON.stringify({ format: "dovetail-project", version: 1, name: "From a friend", doc: theDoc, stage: "#ff0000",
      theme: { config: { radius: "soft", primaryHex: "red;}body{display:none" }, brand: { name: "Friend", mark: "javascript:alert(1)" }, context: "nonsense" } }));
    await openHome();
    await page.locator(".bd-projects input[type=file][accept^='.dovetail']").setInputFiles(file);
    await page.waitForFunction(() => window.__builder.project().name === "From a friend");
    await ready();
    const got = await page.evaluate(() => ({ t: window.DovetailConfigurePanel.theme(), stage: document.querySelector(".bd-stage").style.backgroundColor }));
    fs.unlinkSync(file);
    expect(got.stage === "rgb(255, 0, 0)" && got.t.config.radius === "soft" && got.t.brand.name === "Friend", `the file's canvas colour and theme come with it, got ${JSON.stringify({ stage: got.stage, radius: got.t.config.radius, name: got.t.brand.name })}`);
    expect(got.t.config.primaryHex === "#eb6834" && got.t.brand.mark === "" && got.t.context === "", `but only settings the panel knows, as the types they take, got ${JSON.stringify({ hex: got.t.config.primaryHex, mark: got.t.brand.mark, context: got.t.context })}`);
    ok("a project file brings its red canvas and theme, with anything the panel doesn't take left out");
    await page.close();
  });

  await step("Pages: a project's pages, each its own canvas and history, added, switched, renamed, copied, moved and removed", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const rail = (name) => page.locator(".bd-rail .bd-tab", { hasText: name });
    const names = () => page.locator(".bd-pages .bd-page-name").allTextContents();
    const current = () => page.locator(".bd-page.is-current .bd-page-name").textContent();
    const types = () => page.evaluate(() => window.__builder.doc().frames.map((f) => f.root.children.map((c) => c.type).join("+")).join(" | "));
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const undo = history(page).undo;
    const menuFor = async (name, item) => { await page.locator(".bd-page", { hasText: name }).first().locator(".bd-page-menu").click(); await option(page, item).click(); };

    await rail("Pages").click();
    expect((await names()).join() === "Page 1" && await current() === "Page 1", `a project starts with one page, Page 1, got ${await names()}`);
    const landing = await types();
    await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name")?.textContent === "Page 2");
    await ready();
    expect(!/HeroBlock/.test(await types()), `a new page is a canvas of its own, got ${await types()}`);
    await rail("Assets").click();
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    ok("the Variables card has an icon; Pages lists Page 1, and Add a page makes Page 2, a canvas of its own, where a Heading goes");

    await rail("Pages").click();
    await page.locator(".bd-page", { hasText: "Page 1" }).locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name")?.textContent === "Page 1");
    await ready();
    expect(await types() === landing && await undo.isDisabled(), `Page 1 comes back as it was, with nothing to undo from Page 2, got ${await types()}`);
    await page.locator(".bd-page", { hasText: "Page 2" }).locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name")?.textContent === "Page 2");
    await ready();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    expect(await undo.isEnabled(), "and Page 2's own undo is waiting for it");
    ok("switching to Page 1 shows its canvas with nothing to undo; back on Page 2 its Heading and its undo are both there");

    await page.locator(".bd-page", { hasText: "Page 2" }).locator(".bd-page-open").dblclick();
    await page.locator("input.bd-page-name").fill("About");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].some((x) => x.textContent === "About"));
    await menuFor("About", "Duplicate");
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name")?.textContent === "About copy");
    await ready();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    expect((await names()).join() === "Page 1,About,About copy", `the copy goes after the page it copies, got ${await names()}`);
    await menuFor("About copy", "Move up");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].map((x) => x.textContent).join() === "Page 1,About copy,About");
    await menuFor("About copy", "Delete");
    await page.locator(".bd-page-confirm .bd-btn-danger").click();
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].map((x) => x.textContent).join() === "Page 1,About");
    await ready();
    ok("double-click renames Page 2 to About; Duplicate makes About copy, with its Heading, which moves up and is deleted after asking");

    await page.locator(".bd-page", { hasText: "About" }).locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name")?.textContent === "About");
    await page.evaluate(() => window.__builder.flush());
    await page.reload();
    await page.waitForFunction(() => !!window.__builder);
    await rail("Pages").click();
    await ready();
    expect(await current() === "About" && /Heading/.test(await types()), `a reload opens the page last open, got ${await current()} / ${await types()}`);
    ok("a reload opens the project on About, the page last open");

    const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { await page.locator(".bd-project-menu").click(); await option(page, "Download file").click(); })()]);
    const file = path.join(os.tmpdir(), "pages-" + Date.now() + ".dovetail");
    await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(data.version === 3 && data.pages.map((p) => p.name).join() === "Page 1,About" && /HeroBlock/.test(JSON.stringify(data.doc)), `the file carries every page, got ${JSON.stringify(data.pages && data.pages.map((p) => p.name))}`);
    await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click();
    await page.locator(".bd-home .bd-proj").first().waitFor();
    expect(/2 pages/.test(await page.locator(".bd-proj.is-current .bd-proj-meta").textContent()), "the project's card counts its pages");
    await page.locator(".bd-projects input[type=file][accept^='.dovetail']").setInputFiles(file);
    await page.waitForFunction(() => window.__builder.project().pages && window.__builder.project().pages.length === 2 && document.querySelectorAll(".bd-home").length === 0);
    fs.unlinkSync(file);
    await ready();
    expect((await names()).join() === "Page 1,About" && await current() === "Page 1", `an opened file brings its pages, got ${await names()}`);
    ok("Download file carries both pages, the card says 2 pages, and opening the file makes a project with Page 1 and About");
    await page.close();
  });

  await step("Frames on the canvas: dragged by their background, loose objects keep their size, and new frames take a screen size", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const boxOf = (fid) => page.evaluate((id) => { const f = window.__builder.doc().frames.find((x) => x.id === id); const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title && f && el.title.indexOf("Frame " + f.name + ",") === 0); const r = i && i.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; }, fid);
    /* A spot on the canvas with no frame or panel over it, nearest the corner asked for. */
    const emptyPoint = (corner) => page.evaluate((corner) => {
      const st = document.querySelector(".bd-stage").getBoundingClientRect();
      const xs = [], ys = [];
      for (let x = st.left + 20; x < st.right - 20; x += 24) xs.push(x);
      for (let y = st.top + 20; y < st.bottom - 20; y += 24) ys.push(y);
      if (corner.includes("right")) xs.reverse();
      if (corner.includes("bottom")) ys.reverse();
      for (const y of ys) for (const x of xs) { const el = document.elementFromPoint(x, y); if (el && (el.classList.contains("bd-stage") || el.classList.contains("bd-world"))) return { x, y }; }
      return null;
    }, corner);
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await fitAll(page);
    /* Zoomed out a step, so there's canvas around the frame to drop things on. */
    await release(page);
    await page.keyboard.press("Control+Minus");
    await page.waitForTimeout(250);
    const d0 = await saved();
    const f0 = d0.frames[0];
    const b0 = await boxOf(f0.id);
    /* Low on the frame, clear of the empty slot's prompt: the frame's own background. */
    const from = { x: b0.x + b0.w * 0.7, y: b0.y + b0.h * 0.85 };
    await page.mouse.click(from.x, from.y);
    await page.waitForTimeout(200);
    expect(await page.locator(".bd-flabel.is-current .bd-flabel-name").textContent() === f0.name, "a click on the frame's background selects the frame");
    await drag(page, from, { x: from.x + 200, y: from.y + 100 });
    const moved = (await saved()).frames[0];
    expect(typeof moved.x === "number" && typeof moved.y === "number", "the frame has a place of its own on the canvas");
    const b1 = await boxOf(f0.id);
    expect(Math.abs(b1.x - b0.x - 200) < 6 && Math.abs(b1.y - b0.y - 100) < 6, `dragging its background moves the frame with the pointer, moved ${Math.round(b1.x - b0.x)}, ${Math.round(b1.y - b0.y)}`);
    ok(`a click on a frame's own background selects it, and a drag there moves it ${Math.round(b1.x - b0.x)} by ${Math.round(b1.y - b0.y)} on screen`);

    /* A Button in the frame, dragged off it, keeps the width it had there. */
    await category(page, "Actions");
    await page.locator('.bd-tile[data-type="Button"]').click();
    await frame().waitForSelector('[data-bf-type="Button"]');
    const bw = await frame().evaluate(() => { const w = document.querySelector('[data-bf-type="Button"]'); const el = w.style.display === "contents" ? w.firstElementChild : w; return el.getBoundingClientRect().width; });
    const grip = await canvasPoint(page, '[data-bf-type="Button"]');
    const off = await emptyPoint("bottom-right");
    expect(off, "there's empty canvas to drop on");
    await drag(page, grip, off);
    const loose = (await saved()).frames.filter((x) => x.bare);
    expect(loose.length === 1 && loose[0].sized && Math.abs(loose[0].width - bw) <= 2, `a Button dragged off its frame keeps its width, ${Math.round(bw)}, got ${JSON.stringify(loose.map((x) => [x.width, x.sized]))}`);
    ok(`a Button dragged off its frame onto the canvas stays ${Math.round(bw)} wide, as it was`);

    /* A Heading put down loose is as wide as its text, not squeezed. */
    await category(page, "Typography");
    const tile = await page.locator('.bd-tile[data-type="Heading"]').boundingBox();
    await page.mouse.move(tile.x + 30, tile.y + 30);
    await page.mouse.down();
    await page.mouse.move(tile.x + 80, tile.y + 60, { steps: 4 });
    const off2 = await emptyPoint("top-right");
    await page.mouse.move(off2.x, off2.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    const heading = (await saved()).frames.find((x) => x.bare && x.root.children[0].type === "Heading");
    /* The loose Heading's frame draws its text on its own time, more so on a busy machine. */
    if (heading) await page.waitForFunction((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); return !!(i && i.contentDocument && i.contentDocument.querySelector("h1, h2, h3, h4")); }, heading.name);
    const hb = heading && await page.evaluate((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); return i ? parseFloat(i.style.width) : 0; }, heading.name);
    const textW = heading && await page.evaluate((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); const h = i.contentDocument.querySelector("h1, h2, h3, h4"); const r = document.createRange(); r.selectNodeContents(h); return r.getBoundingClientRect().width; }, heading.name);
    expect(heading && hb > 124 && hb >= textW - 2, `a Heading put down loose is as wide as its text, got a box ${Math.round(hb)} wide for text ${Math.round(textW)} wide`);
    ok(`a Heading put down loose is ${Math.round(hb)} wide, its text's width, rather than squeezed into 120`);

    /* With a loose object active, a new frame is still a screen. */
    await release(page);
    await page.keyboard.press("f");
    await page.waitForTimeout(300);
    const frames = (await saved()).frames.filter((x) => !x.bare);
    const made = frames[frames.length - 1];
    expect(frames.length === 2 && made.width === 1280 && made.height === 800, `F makes a desktop screen, not a loose object's size, got ${made.width} by ${made.height}`);
    ok("with a loose object active, F adds a frame at 1280 by 800, a desktop screen");

    /* A loose object's right edge gives it a width. */
    const hid = heading.id;
    await fitAll(page);
    const zNow = await page.evaluate(() => Number(/scale\(([\d.]+)\)/.exec(document.querySelector(".bd-world").style.transform)[1]));
    const hbox = await page.evaluate((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); const r = i.getBoundingClientRect(); return { x: r.right, y: r.top + r.height / 2 }; }, heading.name);
    await page.mouse.move(hbox.x - 1, hbox.y);
    await page.mouse.down();
    await page.mouse.move(hbox.x - 1 + Math.max(40, 60 * zNow), hbox.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const resized = (await saved()).frames.find((x) => x.id === hid);
    expect(resized.sized && resized.width > hb + 10, `dragging a loose object's edge sets its width, got ${resized.width} (was ${Math.round(hb)})`);
    ok(`a loose object's right edge sets its width, ${Math.round(hb)} to ${resized.width}`);
    await page.close();
  });

  await step("Groups and frames: a Section turns into a Group and back, a layer into a frame, a frame into a loose Group, and that into a frame again", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const find = (d, id) => { let out = null; d.frames.forEach((f) => (function w(n) { (n.children || []).forEach((c) => { if (c.id === id) out = { node: c, frame: f }; w(c); }); })(f.root)); return out; };
    const turn = async (label) => { await page.locator(".bd-inspect-head .bd-layer-menu").click(); await option(page, label).click(); };
    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Section"]').click();
    await page.waitForFunction(() => /Section/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const sid = await page.evaluate(() => { let id = null; (function w(n) { (n.children || []).forEach((c) => { if (c.type === "Section") id = c.id; w(c); }); })(window.__builder.doc().frames[0].root); return id; });
    await turn("Turn into Group");
    await page.waitForFunction((id) => { let t = null; (function w(n) { (n.children || []).forEach((c) => { if (c.id === id) t = c.type; w(c); }); })(window.__builder.doc().frames[0].root); return t === "Group"; }, sid);
    const g = find(await saved(), sid).node;
    expect(g.props.direction === "column" && g.style.padding === "lg", `the Group comes laid out, with the Section's padding, got ${JSON.stringify([g.props, g.style])}`);
    await turn("Turn into Section");
    await page.waitForFunction((id) => JSON.stringify(window.__builder.doc()).includes('"id":"' + id + '","type":"Section"'), sid);
    ok("a Section turns into a laid-out Group, still selected, and back into a Section");

    const framesBefore = (await saved()).frames.length;
    await turn("Turn into a frame");
    await page.waitForFunction((n) => window.__builder.doc().frames.length === n + 1, framesBefore);
    const d1 = await saved();
    const own = find(d1, sid);
    expect(own && own.frame.root.children.length === 1 && own.frame.id === d1.active && !find({ frames: [d1.frames[0]] }, sid), "the Section is a frame of its own now, and gone from the first");
    ok("Turn into a frame puts the Section in a frame of its own beside the first");

    /* With nothing in it selected, the inspector is the frame's. */
    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-right .bd-frame-menu").click();
    await option(page, "Turn into a group").click();
    await page.waitForFunction((fid) => { const f = window.__builder.doc().frames.find((x) => x.id === fid); return f && f.bare; }, own.frame.id);
    const loose = (await saved()).frames.find((x) => x.id === own.frame.id);
    expect(loose.root.children.length === 1 && loose.root.children[0].type === "Group" && loose.root.children[0].children[0].id === sid, `the frame is a loose Group holding the Section, got ${JSON.stringify(loose.root.children.map((c) => c.type))}`);
    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-right .bd-frame-menu").click();
    await option(page, "Turn into a frame").click();
    await page.waitForFunction((fid) => { const f = window.__builder.doc().frames.find((x) => x.id === fid); return f && !f.bare; }, own.frame.id);
    ok("its frame turns into a Group, loose on the canvas where the frame was, and that turns back into a frame");
    await page.close();
  });

  await step("Inspector head: one menu beside the name, a head that stays put, and Structured opening its layout", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    await page.locator(".bd-flabel-btn").first().click();
    await page.waitForFunction(() => document.querySelector('.bd-right [aria-labelledby="bd-fr-kind"]'));
    await page.locator('.bd-right [aria-labelledby="bd-fr-kind"] .bd-seg-btn', { hasText: "Structured" }).click();
    await page.waitForFunction(() => /Group/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await page.locator(".bd-itab[aria-selected=true]").textContent() === "Layout" && await page.locator(".bd-right .bd-sec-h", { hasText: /Flex layout|Arrangement/ }).count() === 1, `Structured selects the Group everything went into, on its Layout tab with the flex controls, got tab ${await page.locator(".bd-itab[aria-selected=true]").textContent()}`);
    ok("switching the frame to Structured opens the Layout tab on the Group its Heading went into, flex controls in view");
    expect(await page.locator(".bd-inspect-head .bd-layer-menu").count() === 1 && await page.locator(".bd-inspect-head .bd-head-actions > *").count() === 1, "the head has one menu beside the name");
    const stuck = await page.evaluate(() => { const r = document.querySelector(".bd-right"), h = document.querySelector(".bd-inspect-head"); r.scrollTop = 400; return { position: getComputedStyle(h).position, scrolled: r.scrollTop, top: Math.round(h.getBoundingClientRect().top - r.getBoundingClientRect().top) }; });
    expect(stuck.position === "sticky" && (stuck.scrolled === 0 || Math.abs(stuck.top) <= 2), `the head stays at the top of the panel while it scrolls, got ${JSON.stringify(stuck)}`);
    ok(`the name and its menu stay at the top while the inspector scrolls (${stuck.scrolled}px down)`);
    await page.close();
  });

  await step("Sliding choices: tabs and segmented rows slide a thumb to the chosen one, and a drag along the row picks once", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    /* The thumb sits on the selected tab. */
    const under = (row, on) => page.evaluate(({ row, on }) => {
      const r = document.querySelector(row), t = r && r.querySelector(".bd-seg-thumb"), b = r && r.querySelector(on);
      if (!t || !b) return null;
      const a = t.getBoundingClientRect(), c = b.getBoundingClientRect();
      return { dx: Math.round(Math.abs(a.left - c.left)), dw: Math.round(Math.abs(a.width - c.width)), sliding: r.classList.contains("is-sliding") };
    }, { row, on });
    await tab(page, "Layout");
    await page.waitForFunction(() => document.querySelector(".bd-itab[aria-selected=true]")?.textContent === "Layout");
    await page.waitForTimeout(100);
    let at = await under(".bd-itabs", ".bd-itab[aria-selected=true]");
    expect(at && at.dx <= 1 && at.dw <= 1 && at.sliding, `the tab thumb covers the selected tab, got ${JSON.stringify(at)}`);
    /* Drag from Layout to Appearance: one change, made on letting go. */
    const box = async (sel) => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const from = await box(".bd-itab#bd-itab-layout"), to = await box(".bd-itab#bd-itab-appearance");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 6 });
    expect(await page.locator(".bd-itab[aria-selected=true]").textContent() === "Layout", "the tab does not change until the drag lets go");
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector(".bd-itab[aria-selected=true]")?.textContent === "Appearance");
    await page.waitForTimeout(100);
    at = await under(".bd-itabs", ".bd-itab[aria-selected=true]");
    expect(at && at.dx <= 1, `the thumb follows to Appearance, got ${JSON.stringify(at)}`);
    ok("the tab thumb sits on the selected tab, and dragging it from Layout to Appearance changes the tab once, on letting go");
    /* A segmented row: the frame's kind. */
    await page.locator(".bd-flabel-btn").first().click();
    const kind = '.bd-right [aria-labelledby="bd-fr-kind"]';
    await page.waitForSelector(kind);
    at = await under(kind, ".bd-seg-btn[aria-pressed=true]");
    expect(at && at.dx <= 1 && at.dw <= 1 && at.sliding, `the segmented thumb covers the pressed choice, got ${JSON.stringify(at)}`);
    const before = await page.evaluate(() => window.__builder.doc().frames[0].mode || "free");
    const pressed = await page.locator(kind + " .bd-seg-btn[aria-pressed=true]").textContent();
    const other = await page.locator(kind + " .bd-seg-btn[aria-pressed=false]").first();
    const a = await box(kind + " .bd-seg-btn[aria-pressed=true]"), bb = await other.boundingBox();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width / 2, a.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(({ kind, pressed }) => document.querySelector(kind + " .bd-seg-btn[aria-pressed=true]")?.textContent !== pressed, { kind, pressed });
    const after = await page.evaluate(() => window.__builder.doc().frames[0].mode || "free");
    expect(after !== before, `dragging along the row changes the frame's kind, ${before} → ${after}`);
    ok(`the segmented thumb sits on ${pressed}, and a drag along the row picks the other choice (${before} → ${after})`);
    await page.close();
  });

  await step("Units: width and height take px, a share of the parent (%) or of the screen (vw, vh), on free layers and in the flow", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Layout");
    const f0 = await page.evaluate(() => { const f = window.__builder.doc().frames[0]; return { w: f.width, h: f.height }; });
    const last = () => page.evaluate(() => { const r = window.__builder.doc().frames[0].root; return JSON.parse(JSON.stringify(r.children[r.children.length - 1])); });
    const size = (id) => { let el = document.querySelector(`[data-bf-id="${id}"]`); while (el && getComputedStyle(el).display === "contents") el = el.firstElementChild; return { w: el.offsetWidth, h: el.offsetHeight }; };
    const drawn = (id) => frame().evaluate(size, id);
    /* The size once the canvas has drawn it, or as it stands after a wait. */
    const drawnAs = async (id, side, px) => {
      await frame().waitForFunction(({ id, side, px, src }) => Math.abs((0, eval)("(" + src + ")")(id)[side] - px) <= 1, { id, side, px, src: size.toString() }, { timeout: 3000 }).catch(() => {});
      return drawn(id);
    };
    const unit = async (which, u) => {
      await page.locator(`.bd-right .bd-dd-unit[aria-label="${which} unit"]`).click();
      await page.locator(".bd-dd-opt", { has: page.locator(".bd-dd-opt-label", { hasText: new RegExp("^" + u + "$") }) }).first().click();
    };
    const type = async (label, v) => { const f = page.locator(`.bd-right input[aria-label^="${label}"]`); await f.fill(String(v)); await f.press("Enter"); };
    /* Saved, and drawn: the canvas writes vw and vh against the frame's size. */
    const until = async (key, v) => {
      await page.waitForFunction(({ key, v }) => { const r = window.__builder.doc().frames[0].root; return r.children[r.children.length - 1].style[key] === v; }, { key, v });
      const css = /%$/.test(v) ? v : "* " + parseInt(v, 10) + ")";
      await frame().waitForFunction(({ css }) => [...document.querySelectorAll("[data-bf-id] > *")].some((el) => (el.getAttribute("style") || "").includes(css)), { css });
    };
    /* A Shape dropped on the canvas is free. */
    const tile = await page.locator('.bd-tile[data-type="Shape"]').boundingBox();
    const fb = await page.locator("iframe.bd-frame").boundingBox();
    await drag(page, { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }, { x: fb.x + fb.width * 0.3, y: fb.y + fb.height * 0.3 });
    let n = await last();
    expect(n.type === "Shape" && Number.isInteger(n.style.x), `the Shape is placed freely, got ${JSON.stringify(n)}`);
    await tab(page, "Layout");
    await unit("Width", "vw");
    n = await last();
    expect(/^\d+vw$/.test(n.style.rw || "") && n.style.fw === undefined, `switching W to vw keeps its size as a share of the screen, got ${JSON.stringify(n.style)}`);
    await type("Width, in percent", 50);
    await until("rw", "50vw");
    let d = await drawnAs(n.id, "w", f0.w / 2);
    expect(Math.abs(d.w - f0.w / 2) <= 1, `50vw draws half the frame's ${f0.w}px width, got ${d.w}`);
    ok(`a free layer in vw: 50vw draws ${d.w}px on a ${f0.w}px frame`);
    await unit("Height", "vh");
    await type("Height, in percent", 25);
    await until("rh", "25vh");
    d = await drawnAs(n.id, "h", f0.h / 4);
    expect(Math.abs(d.h - f0.h / 4) <= 1, `25vh draws a quarter of the frame's ${f0.h}px height, got ${d.h}`);
    ok(`and in vh: 25vh draws ${d.h}px on a ${f0.h}px frame`);
    /* The code writes the units as they are. */
    const tree = await page.evaluate(() => JSON.parse(JSON.stringify({ page: {}, root: window.__builder.doc().frames[0].root })));
    const code = await frame().evaluate((t) => window.BuilderFrame.jsx(t, "Units"), tree);
    expect(/"50vw"/.test(code) && /"25vh"/.test(code) && !/--bf-v/.test(code), `the code writes 50vw and 25vh, not the canvas's stand-in: ${code.slice(0, 500)}`);
    ok("the code writes width \"50vw\" and height \"25vh\" as they are");
    /* Back to px: 4px steps, the size it has now. */
    await unit("Width", "px");
    n = await last();
    expect(n.style.rw === undefined && n.style.fw === Math.round(f0.w / 2 / 4), `back to px keeps the width, in 4px steps, got ${JSON.stringify(n.style)}`);
    ok(`back to px: ${n.style.fw * 4}px, in 4px steps`);
    /* In the flow: the size token, or a share of the parent. */
    await page.locator('.bd-tile[data-type="Shape"]').click();
    await page.waitForFunction(() => window.__builder.doc().frames[0].root.children.length === 2);
    n = await last();
    expect(n.style.x === undefined, `a clicked Shape goes in the flow, got ${JSON.stringify(n.style)}`);
    await tab(page, "Layout");
    expect(await page.locator('.bd-right .bd-dd-field[aria-label^="W"], .bd-right .bd-size-unit .bd-dd-field').count() >= 1, "in the flow, W is the size token");
    await unit("Width", "%");
    await type("Width, in percent", 40);
    await until("rw", "40%");
    const parent = await drawn("root");
    d = await drawnAs(n.id, "w", parent.w * 0.4);
    expect(Math.abs(d.w - parent.w * 0.4) <= 1, `40% draws 40% of the ${parent.w}px root, got ${d.w}`);
    ok(`in the flow, 40% draws ${d.w}px of the root's ${parent.w}px`);
    await page.close();
  });

  await step("Preview and ratios: Play zooms in and out, fits the screen or its width, shows actual size; a social frame takes Square, 4:3 or 16:9", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    await page.locator(".bd-flabel.is-current .bd-flabel-btn").click();
    await page.waitForFunction(() => /Landing/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await page.locator('.bd-right [aria-labelledby="bd-fr-ratio"]').count() === 0, "a page frame has no Ratio");
    await pick(page, "Device", /^Social post$/);
    await page.waitForFunction(() => window.__builder.doc().frames[0].typeScale === "social");
    await tab(page, "Layout");
    const ratio = '.bd-right [aria-labelledby="bd-fr-ratio"]';
    await page.waitForSelector(ratio);
    expect(await page.locator(ratio + " .bd-seg-btn[aria-pressed=true]").count() === 0, "a 1080 × 1350 post matches none of the ratios");
    const sizes = [];
    for (const [label, h] of [["Square", 1080], ["4:3", 810], ["16:9", 608]]) {
      await page.locator(ratio + " .bd-seg-btn", { hasText: label }).click();
      await page.waitForFunction((h) => window.__builder.doc().frames[0].height === h, h);
      const f = (await saved()).frames[0];
      expect(f.width === 1080 && !f.hug && await page.locator(ratio + " .bd-seg-btn[aria-pressed=true]").textContent() === label, `${label} makes it 1080 × ${h}, got ${f.width} × ${f.height}`);
      sizes.push(`${label} ${f.width} × ${f.height}`);
    }
    ok(`a social frame's Ratio: ${sizes.join(", ")}; a page frame has none`);

    /* Play: back to a desktop frame, which fits at first. */
    await pick(page, "Device", /^Desktop$/);
    await page.waitForFunction(() => window.__builder.doc().frames[0].width === 1280);
    await page.locator("[aria-label='Play']").first().click();
    await page.locator(".bd-play[open]").waitFor();
    /* Once the screen is drawn at the size it was given. */
    const state = async () => { await page.waitForFunction(() => { const d = document.querySelector(".bd-play-device"); return d && Math.abs(d.getBoundingClientRect().width - parseFloat(d.style.width)) <= 1; }, null, { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(50); return page.evaluate(() => {
      const st = document.querySelector(".bd-play-stage"), dev = document.querySelector(".bd-play-device"), f = dev.querySelector("iframe");
      const m = /scale\(([\d.]+)\)/.exec(f.style.transform);
      return { pct: document.querySelector(".bd-play-pct").textContent, sc: m ? Number(m[1]) : null, devW: Math.round(dev.getBoundingClientRect().width), stageW: st.clientWidth, scrollW: st.scrollWidth, scrollH: st.scrollHeight, stageH: st.clientHeight };
    }); };
    const first = await state();
    expect(first.sc <= 1 && first.devW <= first.stageW && first.scrollH <= first.stageH + 1, `Play opens with the whole screen in view, got ${JSON.stringify(first)}`);
    await page.locator(".bd-play-fit .bd-seg-btn", { hasText: "100%" }).click();
    let s = await state();
    expect(s.sc === 1 && s.pct === "100%" && s.devW === 1280, `100% draws it at its own size, got ${JSON.stringify(s)}`);
    expect(s.scrollH > s.stageH, `at 100% a screen taller than the stage scrolls, got ${JSON.stringify(s)}`);
    await page.locator(".bd-play-fit .bd-seg-btn", { hasText: "Width" }).click();
    s = await state();
    expect(Math.abs(s.devW - (s.stageW - 32)) <= 2, `Width fits its width to the stage, got ${JSON.stringify(s)}`);
    await page.locator(".bd-play-fit .bd-seg-btn", { hasText: "Fit" }).click();
    s = await state();
    expect(s.devW <= s.stageW && s.scrollH <= s.stageH + 1, `Fit shows all of it, got ${JSON.stringify(s)}`);
    const fit = s.sc;
    await page.locator(".bd-play-step[aria-label='Zoom in']").click();
    s = await state();
    expect(s.sc > fit && await page.locator(".bd-play-fit .bd-seg-btn[aria-pressed=true]").count() === 0, `Zoom in steps up from ${fit}, got ${JSON.stringify(s)}`);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    const out = await state();
    expect(out.sc < s.sc, `minus steps back out, ${s.sc} to ${out.sc}`);
    await page.keyboard.press("Shift+Digit0");
    expect((await state()).sc === 1, "Shift+0 is actual size");
    ok(`Play opens at ${Math.round(first.sc * 100)}%; 100% draws 1280px and scrolls, Width fills the stage, Fit shows it all, + and - step, Shift+0 is actual size`);
    await page.keyboard.press("Escape");
    await page.close();
  });

  await step("Picture props: an Image's Fit, Radius and Ratio are rows of pictures; the chosen one is named after the label, the hovered one previewed there", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await category(page, "Content");
    await page.locator('.bd-tile[data-type="Image"]').click();
    await frame().waitForSelector('[data-bf-type="Image"]');
    await tab(page, "Properties");
    const field = (name) => page.locator(".bd-right .bd-field").filter({ has: page.locator(".bd-field-label", { hasText: new RegExp("^" + name + "$") }) });
    const row = (name) => field(name).locator(".bd-seg-tiles");
    const tile = (name, value) => row(name).locator(`.bd-seg-btn[aria-label="${name}: ${value}"]`);
    const shown = (name) => field(name).locator(".bd-field-val").textContent();
    const counts = {};
    for (const [name, pic] of [["Fit", ".bd-pv-fit img"], ["Radius", ".bd-pv-corner"], ["Ratio", ".bd-pv-ratio"]]) {
      counts[name] = await row(name).locator(".bd-seg-btn").count();
      expect(counts[name] >= 4 && await row(name).locator(pic).count() === counts[name] && (await row(name).innerText()).trim() === "", `${name} is a row of pictures with no words on them, got ${counts[name]} buttons`);
    }
    expect(await shown("Ratio") === "16:9" && await tile("Ratio", "16:9").getAttribute("aria-pressed") === "true", `the label names the Image's default ratio, got "${await shown("Ratio")}"`);
    const one = await row("Ratio").evaluate((r) => new Set([...r.querySelectorAll(".bd-seg-btn")].map((b) => Math.round(b.getBoundingClientRect().top))).size);
    expect(one === 1, `all seven ratios sit on one row, got ${one} rows`);
    const fits = await row("Fit").locator(".bd-pv-fit img").evaluateAll((imgs) => imgs.map((i) => getComputedStyle(i).objectFit));
    expect(fits.join() === "cover,contain,fill,none,scale-down", `the Fit pictures use object-fit itself, got ${fits.join()}`);
    /* Hovering names a choice in the label's place, in the preview style; leaving puts the value back. */
    await tile("Fit", "Contain").hover();
    expect(await shown("Fit") === "Contain" && await field("Fit").locator(".bd-field-val.is-preview").count() === 1, `hovering Contain previews its name, got "${await shown("Fit")}"`);
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-right .bd-field-val")].every((v) => !v.classList.contains("is-preview")));
    expect(await shown("Fit") === "Cover", `leaving the row shows the chosen fit again, got "${await shown("Fit")}"`);
    ok("hovering Contain names it after the Fit label; moving away shows Cover again");
    const node = () => page.evaluate(() => { const r = window.__builder.doc().frames[0].root; return JSON.parse(JSON.stringify(r.children[r.children.length - 1].props)); });
    await tile("Ratio", "1:1").click();
    await tile("Fit", "Contain").click();
    await tile("Radius", "Pill").click();
    await page.waitForFunction(() => { const r = window.__builder.doc().frames[0].root; const p = r.children[r.children.length - 1].props; return p.ratio === "square" && p.fit === "contain" && p.radius === "pill"; });
    const props = await node();
    expect(await shown("Ratio") === "1:1" && await shown("Fit") === "Contain" && await shown("Radius") === "Pill", "each label names the new choice");
    const shape = await frame().evaluate(() => { const el = document.querySelector('[data-bf-type="Image"]'); let x = el; while (x && getComputedStyle(x).display === "contents") x = x.firstElementChild; const r = x.getBoundingClientRect(); return Math.round((r.width / r.height) * 100) / 100; });
    expect(Math.abs(shape - 1) < 0.05, `1:1 draws a square Image, got ${shape}`);
    ok(`Fit (${counts.Fit}), Radius (${counts.Radius}) and Ratio (${counts.Ratio}, one row) are bare pictures; 1:1, Contain and Pill set ${JSON.stringify(props)}, the labels name them, and the Image draws square`);
    await page.close();
  });

  await step("Fill swatches: grouped rows in the frame's own colours, the name after the label, tokens only on hover, the eyedropper beside the moon", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const last = () => page.evaluate(() => { const r = window.__builder.doc().frames[0].root; return JSON.parse(JSON.stringify(r.children[1].style)); });
    await page.evaluate(() => { const r = window.__builder.doc().frames[0].root; window.__builder.select([r.children[1].id]); });
    await tab(page, "Appearance");
    const sec = page.locator('.bd-right .bd-sec[data-sec="fill"]');
    await sec.waitFor();
    const groups = await sec.locator(".bd-swatch-group").allTextContents();
    expect(groups.join() === "Neutral,Brand,Status", `the swatches are grouped Neutral, Brand, Status, got ${groups.join()}`);
    expect(await sec.locator(".bd-swatch").count() === 13 && await sec.locator(".bd-dd").count() === 0, "13 swatches (None and 12 surfaces), and no dropdown");
    /* The frame's own colours: base is the frame's white, not the dark builder's. */
    const base = await sec.locator('.bd-swatch[aria-label="Fill: Base"]').evaluate((b) => b.style.background);
    const frameBase = await page.evaluate(() => { const d = document.querySelector("iframe.bd-frame").contentDocument; return getComputedStyle(d.querySelector(".bf-root")).backgroundColor; });
    expect(base && !/var\(/.test(base), `a swatch shows a real colour, got ${base}`);
    ok(`grouped ${groups.join(", ")}; Base shows ${base} (the frame's root is ${frameBase})`);
    const val = () => sec.locator(".bd-field-val").textContent();
    const toks = () => sec.locator(".bd-swatch-tokens").textContent();
    expect(await toks() === "", "no tokens show until a swatch is pointed at");
    await sec.locator('.bd-swatch[aria-label="Fill: Brand muted"]').hover();
    expect(await val() === "Brand muted" && /--dt-surface-brand-muted/.test(await toks()), `hovering names Brand muted and shows its tokens, got "${await val()}" / "${await toks()}"`);
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => document.querySelector('.bd-sec[data-sec="fill"] .bd-swatch-tokens')?.textContent === "");
    await sec.locator('.bd-swatch[aria-label="Fill: Brand"]').click();
    await page.waitForFunction(() => window.__builder.doc().frames[0].root.children[1].style.surface === "brand");
    expect(await sec.locator('.bd-swatch[aria-label="Fill: Brand"]').getAttribute("aria-pressed") === "true" && await val() === "Brand", "Brand is pressed and named after the label");
    await sec.locator('.bd-swatch[aria-label="Fill: None"]').click();
    await page.waitForFunction(() => !window.__builder.doc().frames[0].root.children[1].style.surface);
    expect(await val() === "None", "None clears it");
    ok("hovering Brand muted names it and shows --dt-surface-brand-muted; Brand sets surface: brand; None clears it");
    /* The eyedropper sits in the head, beside the moon. */
    const head = await sec.locator(".bd-sec-head .bd-sec-acts > *").evaluateAll((els) => els.map((x) => x.className));
    expect(head.length === 2 && /bd-canvas-custom/.test(head[0]) && /bd-act/.test(head[1]), `the head holds the eyedropper then the moon, got ${JSON.stringify(head)}`);
    ok("the custom-colour eyedropper sits in the Fill head, beside the moon");
    await page.close();
  });

  await step("Edit in place: any text on the canvas, including an item of a component's list, is typed into where it is", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const grid = (d) => d.frames[0].root.children.find((c) => c.type === "FeatureGridBlock");
    /* A point on a piece of text in the active frame, in the page. */
    const textPoint = (text) => page.evaluate((text) => {
      const iframe = document.querySelector("iframe.bd-frame.is-active");
      const doc = iframe.contentDocument;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) if (n.textContent.trim() === text) break;
      if (!n) return null;
      n.parentElement.scrollIntoView({ block: "center" });
      const r = doc.createRange(); r.selectNodeContents(n);
      const b = r.getBoundingClientRect(), box = iframe.getBoundingClientRect(), s = box.width / parseFloat(iframe.style.width);
      return { x: box.left + (b.left + Math.min(b.width / 2, 20)) * s, y: box.top + (b.top + b.height / 2) * s };
    }, text);
    await frame().waitForSelector('[data-bf-type="FeatureGridBlock"]');
    expect(!grid(await saved()).props.items, "the feature grid starts on its sample items");
    const first = await frame().evaluate(() => { const w = document.querySelector('[data-bf-type="FeatureGridBlock"]'); const hs = w.querySelectorAll("h3, h4"); return hs[0] ? hs[0].textContent.trim() : null; });
    expect(first, "the grid shows its items' titles");
    await page.locator(".bd-flabel.is-current .bd-flabel-name").click();
    await page.keyboard.press("Shift+Digit2");
    await page.waitForTimeout(300);
    const at = await textPoint(first);
    expect(at, `the title "${first}" is on the canvas`);
    await page.mouse.dblclick(at.x, at.y);
    await page.locator(".bd-inline").waitFor();
    expect(await page.locator(".bd-inline").inputValue() === first, `the editor opens on the item's title, got ${await page.locator(".bd-inline").inputValue()}`);
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Fired three times");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => document.body.textContent.includes("Fired three times"));
    const items = grid(await saved()).props.items;
    expect(Array.isArray(items) && items[0].title === "Fired three times" && items.length >= 3 && items[1].title, `the item's title changes in the grid's own list, the rest kept, got ${JSON.stringify(items && items.map((x) => x.title))}`);
    ok(`double-clicking "${first}" in the feature grid types into that item's title, which becomes "Fired three times" in the grid's own items`);
    await page.keyboard.press("Control+z");
    await frame().waitForFunction((t) => document.body.textContent.includes(t) && !document.body.textContent.includes("Fired three times"), first);
    ok("undo puts the sample title back");
    await page.close();
  });

  await step("Pages: folders, and dragging a page to a new place", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const rail = (name) => page.locator(".bd-rail .bd-tab", { hasText: name });
    const names = () => page.locator(".bd-pages .bd-page-name").allTextContents();
    /* The rows as they read: [ marks a folder, * a page inside one. */
    const rows = () => page.evaluate(() => [...document.querySelectorAll(".bd-pages [data-row]")].map((r) => (r.classList.contains("bd-folder") ? "[" : "") + r.querySelector(".bd-page-name, .bd-folder-name").textContent + (r.classList.contains("is-nested") ? "*" : "")).join());
    const meta = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.project())));
    /* A page moves by dragging its row; there's no grip. */
    const gripOf = async (name) => { const g = await page.locator(".bd-page", { hasText: name }).locator(".bd-page-open").boundingBox(); return { x: g.x + 40, y: g.y + g.height / 2 }; };
    await rail("Pages").click();
    await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 2);
    await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 3);
    expect((await names()).join() === "Page 1,Page 2,Page 3", `three pages to start, got ${await names()}`);
    await page.locator(".bd-page", { hasText: "Page 1" }).locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name").textContent === "Page 1");
    const first = await page.locator(".bd-page", { hasText: "Page 1" }).boundingBox();
    await drag(page, await gripOf("Page 3"), { x: first.x + 60, y: first.y + 3 });
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].map((x) => x.textContent).join() === "Page 3,Page 1,Page 2");
    expect(await page.locator(".bd-page-grip").count() === 0, "the rows have no drag grips");
    expect(await page.locator(".bd-page.is-current .bd-page-name").textContent() === "Page 1", `a drag doesn't also open the page it moved, got ${await page.locator(".bd-page.is-current .bd-page-name").textContent()}`);
    await page.locator(".bd-page", { hasText: "Page 3" }).locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-page.is-current .bd-page-name").textContent === "Page 3");
    ok("dragging the Page 3 row, with no grip, above Page 1 puts the pages in that order without opening it; a click still opens it");

    await page.locator('.bd-pages-panel [aria-label="New folder"]').click();
    await page.locator("input.bd-folder-name").waitFor();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Marketing");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-folder-name")].some((x) => x.textContent === "Marketing"));
    await page.locator(".bd-page", { hasText: "Page 2" }).locator(".bd-page-menu").click();
    await option(page, "Move to Marketing").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-page.is-nested").length === 1);
    expect(await rows() === "Page 3,Page 1,[Marketing,Page 2*", `the page sits under the folder, got ${await rows()}`);
    const head = await page.locator(".bd-folder", { hasText: "Marketing" }).boundingBox();
    await drag(page, await gripOf("Page 1"), { x: head.x + head.width / 2, y: head.y + head.height / 2 });
    await page.waitForFunction(() => document.querySelectorAll(".bd-page.is-nested").length === 2);
    expect(await rows() === "Page 3,[Marketing,Page 2*,Page 1*", `a page dropped on the folder goes in at its end, got ${await rows()}`);
    await page.locator(".bd-folder .bd-folder-twisty").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-page.is-nested").length === 0);
    expect(await rows() === "Page 3,[Marketing", `a closed folder hides its pages, got ${await rows()}`);
    ok("New folder makes Marketing; Move to from a page's menu and a drop on the folder both put pages in it; closing it hides them");

    await page.evaluate(() => window.__builder.flush());
    await page.reload();
    await page.waitForFunction(() => !!window.__builder && window.__builder.project().folders);
    await rail("Pages").click();
    expect(await rows() === "Page 3,[Marketing" && (await meta()).folders.length === 1, `the folder, closed, is back after a reload, got ${await rows()}`);
    await page.locator(".bd-folder .bd-folder-twisty").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-page.is-nested").length === 2);
    await page.locator(".bd-page", { hasText: "Page 2" }).locator(".bd-page-menu").click();
    await option(page, "Out of the folder").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-page.is-nested").length === 1);
    expect(await rows() === "Page 3,[Marketing,Page 1*,Page 2", `Out of the folder puts the page after it, got ${await rows()}`);
    await page.locator(".bd-folder .bd-page-menu").click();
    await option(page, /^Delete folder/).click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-folder").length === 0);
    expect(await rows() === "Page 3,Page 1,Page 2", `deleting the folder leaves its pages where they were, got ${await rows()}`);
    ok("the folder survives a reload; Out of the folder and Delete folder leave the pages in place");
    await page.close();
  });

  await step("Left panels: component previews at 1440 and 1024, a search on Pages and Configure, photos filling their tiles", async () => {
    /* Every preview in view has drawn, at a scale that fits its tile. */
    const previews = (page) => page.evaluate(() => {
      const list = document.querySelector(".bd-assets .bd-tiles");
      const box = list.closest(".bd-assets").getBoundingClientRect();
      return [...list.querySelectorAll(".bd-tile")].filter((t) => { const r = t.getBoundingClientRect(); return r.bottom > box.top && r.top < box.bottom - 60 && t.querySelector(".bd-thumb:not(.is-icon)"); }).map((t) => {
        const holder = t.querySelector(".bd-thumb"), stage = holder.querySelector(".bd-thumb-stage");
        const h = holder.getBoundingClientRect(), r = stage && stage.getBoundingClientRect();
        const ok = !!stage && /scale\(/.test(stage.style.transform) && r.width > 8 && r.height > 4 && r.right <= h.right + 1 && r.left >= h.left - 1;
        return ok ? null : t.getAttribute("data-type") + (stage ? ` (${Math.round(r.width)}x${Math.round(r.height)} in ${Math.round(h.width)}x${Math.round(h.height)})` : " (not drawn)");
      }).filter(Boolean);
    });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
      const { page } = await open(viewport);
      for (const name of ["Actions", "Forms", "Display", "Navigation", "Feedback", "Commerce"]) {
        await category(page, name);
        await page.waitForFunction(() => document.querySelectorAll(".bd-assets .bd-tile").length > 0);
        let bad = [];
        for (let i = 0; i < 20; i++) { bad = await previews(page); if (!bad.length) break; await page.waitForTimeout(150); }
        expect(!bad.length, `at ${viewport.width}px every ${name} preview in view draws and fits its tile, but not ${bad.join(", ")}`);
      }
      await page.setViewportSize({ width: viewport.width - 200, height: viewport.height });
      let bad = [];
      for (let i = 0; i < 20; i++) { bad = await previews(page); if (!bad.length) break; await page.waitForTimeout(150); }
      expect(!bad.length, `after the window narrows from ${viewport.width}px the previews fit their tiles again, but not ${bad.join(", ")}`);
      await page.close();
    }
    ok("at 1440 and 1024, every component preview in view draws and fits its tile, in six categories, and refits when the window narrows");

    const { page } = await open({ width: 1440, height: 900 });
    const rail = (name) => page.locator(".bd-rail .bd-tab", { hasText: name });
    await rail("Pages").click();
    for (let i = 0; i < 2; i++) await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 3);
    await page.locator(".bd-page", { hasText: "Page 3" }).locator(".bd-page-menu").click();
    await option(page, "Rename").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Checkout");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-page-name")].some((x) => x.textContent === "Checkout"));
    const pageSearch = page.locator('.bd-search-dock input[aria-label="Filter pages"]');
    expect(await pageSearch.count() === 1, "Pages has the floating search");
    await pageSearch.fill("check");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].map((x) => x.textContent).join() === "Checkout");
    await pageSearch.fill("nothing like it");
    await page.locator(".bd-pages-panel .bd-empty-note", { hasText: "No pages match" }).waitFor();
    await page.locator(".bd-search-dock .bd-search-clear").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 3);
    ok("Pages has the floating search: \"check\" leaves Checkout, a miss says so, and clearing it brings every page back");

    await rail("Configure").click();
    await page.waitForSelector(".bd-config-dock .configure-row");
    const cfgSearch = page.locator('.bd-search-dock input[aria-label="Search settings"]');
    expect(await cfgSearch.count() === 1, "Configure has the floating search");
    const shownRows = () => page.$$eval(".bd-config-dock .configure-row", (r) => r.filter((x) => x.offsetParent).map((x) => x.querySelector(".configure-row-label").textContent).join());
    await cfgSearch.fill("radius");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-config-dock .configure-row")].filter((x) => x.offsetParent).length === 1);
    expect(await shownRows() === "Shape", `"radius" leaves the Shape group, got ${await shownRows()}`);
    await page.locator(".bd-config-dock .configure-row", { hasText: "Shape" }).click();
    await page.locator(".bd-config-dock [data-bid='back']").waitFor();
    const fields = await page.$$eval(".bd-config-dock .configure-panel > *", (f) => f.filter((x) => x.offsetParent).map((x) => (x.querySelector(".configure-label") || x).textContent.trim().slice(0, 20)));
    expect(fields.length >= 1 && fields.every((f) => /radius/i.test(f)), `inside Shape only the radius settings show, got ${fields.join(" | ")}`);
    await cfgSearch.fill("zzz");
    await page.locator(".bd-config-none", { hasText: "No settings match" }).waitFor();
    await page.locator(".bd-search-dock .bd-search-clear").click();
    await page.waitForFunction(() => !document.querySelector(".bd-config-dock .bd-cfg-out"));
    ok("Configure has the floating search: \"radius\" narrows the groups to Shape and its settings to the radius ones, a miss says so, and clearing it shows everything");

    await rail("Content").click();
    await page.locator('.bd-kind[data-kind="images"]').click();
    const photo = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 300; c.height = 100; const x = c.getContext("2d"); x.fillStyle = "#2a6"; x.fillRect(0, 0, 300, 100); return c.toDataURL("image/png"); });
    await page.setInputFiles("#bd-lib-file", { name: "wide.png", mimeType: "image/png", buffer: Buffer.from(photo.split(",")[1], "base64") });
    await page.waitForSelector(".bd-lib-item img");
    const tile = await page.$eval(".bd-lib-thumb", (b) => ({ cols: getComputedStyle(b.closest(".bd-lib")).gridTemplateColumns.split(" ").length, ratio: b.clientWidth / b.clientHeight, fit: getComputedStyle(b.querySelector("img")).objectFit }));
    expect(tile.cols === 2 && Math.abs(tile.ratio - 4 / 3) < 0.05 && tile.fit === "cover", `photos sit two across at 4:3 and fill their tile, got ${JSON.stringify(tile)}`);
    ok("Content's photos sit two across at 4:3 and fill their tiles");
    await page.close();
  });

  await step("Variables: Assets lists this project's or every variable; with nothing selected, the Canvas panel offers primitives and styles, and no Variables", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const clickStage = async () => {
      for (let tries = 0; tries < 4; tries++) {
        const pt = await page.evaluate(() => { const st = document.querySelector(".bd-stage").getBoundingClientRect(); for (let y = st.bottom - 20; y > st.top; y -= 30) for (let x = st.left + st.width / 2; x < st.right - 10; x += 30) { const el = document.elementFromPoint(x, y); if (el && (el.classList.contains("bd-stage") || el.classList.contains("bd-world"))) return { x, y }; } return null; });
        expect(pt, "there's empty canvas to click");
        await page.mouse.click(pt.x, pt.y);
        if (await page.locator(".bd-sys-prim").first().waitFor({ timeout: 1500 }).then(() => true, () => false)) return;
      }
      throw new Error("a click on empty canvas should show the canvas settings");
    };
    await frame().waitForSelector('[data-bf-type="HeroBlock"]');
    await clickStage();
    expect(await page.locator('.bd-right .bd-sec[data-sec="builder-vars"]').count() === 0 && await page.locator(".bd-right .bd-seg-btn", { hasText: "In this project" }).count() === 0, "the Canvas panel has no Variables and no scope switch");
    const prims = await page.locator(".bd-right .bd-sys-prim").count();
    expect(prims > 3 && await page.locator('.bd-right .bd-sys-row:has(.bd-sys-label:text-is("Text")) .bd-sys-item').count() > 3, `it offers every primitive and text style, got ${prims} primitives`);
    ok(`with nothing selected the Canvas panel offers ${prims} primitives and the text styles, with no Variables section`);

    await assetKind(page, "variables");
    const swatches = () => page.locator(".bd-vars-sec").filter({ has: page.locator('.bd-content-h:text-is("Fill")') }).locator(".bd-var").count();
    const all = await swatches();
    await page.locator(".bd-vars-scope .bd-seg-btn", { hasText: "In this project" }).click();
    const usedFills = await swatches();
    expect(usedFills < all, `In this project lists fewer fills than Everything, got ${usedFills} of ${all}`);
    await page.locator(".bd-vars-scope .bd-seg-btn", { hasText: "Everything" }).click();
    expect(await swatches() === all, "Everything brings them all back");
    ok(`Variables in Assets: In this project lists ${usedFills} of the ${all} fills, and Everything all of them`);
    await page.close();
  });

  await step("Brand in Content: the name, logo and brand mark, set for the project and placed on a frame", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const named = (d, name) => { let hit = null; (function w(n) { (n.children || []).forEach((c) => { if (c.name === name) hit = c; w(c); }); })(d.frames[0].root); return hit; };
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await page.waitForFunction(() => window.DovetailConfigurePanel && window.DovetailConfigurePanel.setBrand);
    await page.locator(".bd-rail .bd-tab", { hasText: "Content" }).click();
    const card = page.locator('.bd-kind[data-kind="brand"]');
    expect(/Name, logo and mark/.test(await card.textContent()), `the Brand card says what it holds, got ${await card.textContent()}`);
    await card.click();
    await page.locator(".bd-gallery-head", { hasText: "Brand" }).waitFor();
    expect(await page.locator('.bd-brand-tile[data-brand="wordmark"]').textContent() === "Your brand" && await page.locator(".bd-brand-tile.is-empty").count() === 1, "with no brand yet, the logo is a placeholder name and there's no mark to place");

    await page.locator("#bd-brand-name").fill("Acme");
    await page.waitForFunction(() => { const t = window.__builder.project().theme; return t && t.brand.name === "Acme"; });
    expect(await page.locator('.bd-brand-tile[data-brand="wordmark"]').textContent() === "Acme", "the logo tile sets the name in type");
    await page.locator('.bd-brand-tile[data-brand="wordmark"]').click();
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Heading"]')].some((h) => h.textContent.trim() === "Acme"));
    const word = named(await saved(), "Logo");
    expect(word && word.type === "Heading" && word.props.children === "Acme", `pressing the logo adds the name as a Heading called Logo, got ${JSON.stringify(word)}`);
    ok("the name typed in Content is saved with the project's theme, and with no logo file pressing the logo adds it as a Heading named Logo");

    const png = (w, h, fill) => page.evaluate(([w, h, fill]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.fillStyle = fill; x.fillRect(0, 0, w, h); return c.toDataURL("image/png"); }, [w, h, fill]);
    const file = async (name, w, h, fill) => ({ name, mimeType: "image/png", buffer: Buffer.from((await png(w, h, fill)).split(",")[1], "base64") });
    await page.setInputFiles("#bd-brand-mark", { name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(600 * 1024, 1) });
    await page.locator(".bd-brand-err", { hasText: "The limit is 512KB" }).waitFor();
    expect(!(await page.evaluate(() => window.DovetailConfigurePanel.brand().mark)), "a mark over the limit is turned away");
    await page.setInputFiles("#bd-brand-mark", await file("mark.png", 40, 40, "#a01010"));
    await page.waitForFunction(() => { const t = window.__builder.project().theme; return t && /^data:image\/png/.test(t.brand.mark); });
    expect(await page.locator(".bd-brand-err").count() === 0, "a mark within the limit clears the message");
    await page.locator('.bd-brand-tile[data-brand="mark"] img').waitFor();
    const tile = await page.locator('.bd-brand-tile[data-brand="mark"]').boundingBox();
    const fb = await page.locator("iframe.bd-frame").boundingBox();
    await drag(page, { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }, { x: fb.x + fb.width * 0.5, y: fb.y + fb.height * 0.5 });
    await frame().waitForSelector('[data-bf-type="Image"] img[src^="data:image/png"]');
    const mark = named(await saved(), "Brand mark");
    expect(mark && mark.type === "Image" && mark.props.fit === "contain" && mark.props.ratio === "square" && mark.props.radius === "none" && mark.style.w === "x2" && /^data:image\/png/.test(mark.props.src), `the mark drags on as a whole, square, uncropped picture called Brand mark, got ${JSON.stringify(mark && { props: { ...mark.props, src: mark.props.src.slice(0, 22) }, style: mark.style })}`);
    ok("a mark over 512KB is turned away with a message; one within it is saved with the project and drags onto the frame as an uncropped square Image named Brand mark");

    await page.setInputFiles("#bd-brand-wordmark", await file("logo.png", 210, 90, "#101010"));
    await page.locator('.bd-brand-tile[data-brand="wordmark"] img').waitFor();
    await page.locator('.bd-brand-tile[data-brand="wordmark"]').click();
    await page.waitForFunction(() => { let n = 0; (function w(x) { (x.children || []).forEach((c) => { if (c.name === "Logo") n++; w(c); }); })(window.__builder.doc().frames[0].root); return n === 2; });
    const logos = []; (function w(n) { (n.children || []).forEach((c) => { if (c.name === "Logo") logos.push(c); w(c); }); })((await saved()).frames[0].root);
    const pic = logos.find((n) => n.type === "Image");
    expect(pic && pic.props.fit === "contain" && pic.props.ratio === "21:9" && pic.style.w === "x4" && pic.props.alt === "Acme", `with a logo file, the logo is that picture, got ${JSON.stringify(pic && pic.props.alt)}`);
    const head = await page.evaluate(() => ({ text: document.querySelector(".wordmark-text").textContent, hidden: document.querySelector(".wordmark-text").hidden, logo: document.querySelector(".wordmark-logo").getAttribute("src") }));
    expect(head.text === "Dovetail" && !head.hidden && !head.logo, `the builder's own header keeps the Dovetail name after a logo and name are set, got ${JSON.stringify(head)}`);
    await page.locator('.bd-brand-sec:has(#bd-brand-mark) .bd-btn', { hasText: "Remove" }).click();
    await page.waitForFunction(() => window.__builder.project().theme.brand.mark === "");
    await page.locator(".bd-gallery-head [aria-label='Back to Content']").click();
    expect(/Logo/.test(await card.textContent()) && await card.locator("img").count() === 1, `back in Content the Brand card shows the logo, got ${await card.textContent()}`);
    ok("a logo file replaces the name: pressed, it adds an uncropped Image named Logo with the name as its alt; the builder's header still says Dovetail; removing the mark saves that too, and the Brand card shows what's set");
    await page.close();
  });

  await step("Changes: undo takes back only your own steps, and a change from elsewhere stays", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await page.waitForFunction(() => window.__builder && window.__builder.doc().frames[0].root.children.length > 1);
    const ids = await page.evaluate(() => { const f = window.__builder.doc().frames[0]; const [a, b] = f.root.children; return { f: f.id, a: a.id, b: b.id, title: (a.props.title || "") }; });
    const text = () => frame().evaluate(() => document.body.textContent);
    const undo = history(page).undo, redo = history(page).redo;

    await page.evaluate((id) => window.__builder.edit(id, "title", "Mine, made here"), ids.a);
    await frame().waitForFunction(() => document.body.textContent.includes("Mine, made here"));
    const step = await page.evaluate(({ f, b }) => { const before = window.__builder.doc(); window.__builder.receive([{ t: "set", f, n: b, g: "p", k: "title", value: "Theirs, from elsewhere" }]); return window.__builder.diff(before, window.__builder.doc()); }, ids);
    expect(step.length === 1 && step[0].t === "set" && step[0].n === ids.b && step[0].k === "title", `a change names one prop of one layer, got ${JSON.stringify(step)}`);
    await frame().waitForFunction(() => document.body.textContent.includes("Theirs, from elsewhere"));
    ok("an edit made here and a change received from elsewhere are both on the canvas");

    await undo.click();
    await frame().waitForFunction(() => !document.body.textContent.includes("Mine, made here"));
    expect((await text()).includes("Theirs, from elsewhere"), "undo leaves the change from elsewhere");
    expect(await undo.isDisabled(), "and the change from elsewhere was never a step of yours to undo");
    ok("undo takes back the edit made here, keeps the one from elsewhere, and has nothing more to undo");

    await redo.click();
    await frame().waitForFunction(() => document.body.textContent.includes("Mine, made here"));
    expect((await text()).includes("Theirs, from elsewhere"), "redo keeps it too");
    ok("redo brings the edit back, alongside the change from elsewhere");
    await page.close();
  });

  await step("Performance: a big project opens, keeps far frames as stand-ins, and edits stay quick", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    /* A project of 24 landing pages: copies of the first frame with fresh ids. */
    const FRAMES = 24;
    await page.evaluate(async (n) => {
      const one = JSON.parse(JSON.stringify(window.__builder.doc().frames[0]));
      let seq = 0;
      const renumber = (node) => { node.id = "perf" + (seq++); (node.children || []).forEach(renumber); };
      const frames = [];
      for (let i = 0; i < n; i++) {
        const f = JSON.parse(JSON.stringify(one));
        f.id = "pf" + i; f.name = "Page " + (i + 1); delete f.x; delete f.y;
        f.root.children.forEach(renumber);
        frames.push(f);
      }
      const meta = await window.__builder.store.createProject("Big project", { frames, active: "pf0" });
      window.__builder.store.setLastOpened(meta.id);
      await window.__builder.flush();
    }, FRAMES);
    const t0 = Date.now();
    await page.reload();
    await page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame.is-active"); try { return !!(window.__builder && i && i.contentDocument.querySelector('[data-bf-type="HeroBlock"]')); } catch (err) { return false; } }, null, { timeout: 30000 });
    const boot = Date.now() - t0;
    const counts = await page.evaluate(() => ({ live: document.querySelectorAll("iframe.bd-frame").length, ghosts: document.querySelectorAll(".bd-frame-ghost").length, name: window.__builder.project().name }));
    expect(counts.name === "Big project" && counts.live + counts.ghosts === FRAMES, `the big project opens with every frame placed, got ${JSON.stringify(counts)}`);
    expect(counts.live <= 8 && counts.ghosts >= FRAMES - 8, `only frames near the view are live, got ${counts.live} live and ${counts.ghosts} stand-ins`);
    expect(boot < 15000, `a ${FRAMES}-frame project should open in under 15s here, took ${boot}ms`);
    ok(`a ${FRAMES}-frame project opened in ${boot}ms with ${counts.live} live frames and ${counts.ghosts} stand-ins`);

    /* Edit latency: a change to a heading in the active frame, until the frame shows it. */
    const heading = await page.evaluate(() => { let id = null; (function w(n) { (n.children || []).forEach((c) => { if (!id && c.type === "HeroBlock") id = c.id; w(c); }); })(window.__builder.doc().frames[0].root); return id; });
    const times = [];
    for (let i = 0; i < 12; i++) {
      times.push(await page.evaluate(async ({ id, i }) => {
        const text = "Perf title " + i;
        const frame = document.querySelector("iframe.bd-frame.is-active");
        const start = performance.now();
        window.__builder.edit(id, "title", text);
        await new Promise((resolve) => { const tick = () => (frame.contentDocument.body.textContent.includes(text) ? resolve() : requestAnimationFrame(tick)); tick(); });
        return performance.now() - start;
      }, { id: heading, i }));
    }
    times.sort((a, b) => a - b);
    const median = Math.round(times[Math.floor(times.length / 2)]);
    expect(median < 200, `an edit should show in the frame in under 200ms (median), took ${median}ms; all: ${times.map(Math.round)}`);
    ok(`an edit reaches the frame in ${median}ms (median of 12) with ${FRAMES} frames in the project`);

    /* Zoomed out to the whole board, no more than a handful stay live. */
    await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
    await page.keyboard.press("Shift+Digit1");
    await page.waitForTimeout(400);
    const wide = await page.evaluate(() => ({ live: document.querySelectorAll("iframe.bd-frame").length, ghosts: document.querySelectorAll(".bd-frame-ghost").length, labels: document.querySelectorAll(".bd-flabel").length }));
    expect(wide.live <= 8 && wide.live + wide.ghosts === FRAMES, `zoomed out, at most 8 frames should be live, got ${wide.live} live and ${wide.ghosts} stand-ins`);
    expect(wide.labels === FRAMES, `every frame keeps its label, got ${wide.labels}`);
    ok(`zoomed out to all ${FRAMES} frames, ${wide.live} are live and the rest are stand-ins`);

    /* Selecting a far frame brings it alive. */
    await page.locator(".bd-labels .bd-flabel-btn", { hasText: "Page 24" }).first().click({ force: true }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll(".bd-flabel")].find((x) => x.textContent.includes("Page 24")); if (b) b.querySelector("button")?.click(); });
    await page.waitForFunction(() => [...document.querySelectorAll("iframe.bd-frame")].some((f) => /Page 24/.test(f.title)), null, { timeout: 15000 });
    ok("selecting Page 24 brings it alive on the canvas");
    await page.close();
  }, { alone: true });

  await step("Share links open what they encode, and nothing the inspector can't set", async () => {
    const doc = { frames: [
      { id: "f1", name: "Shared", size: "tablet", dark: true, context: "social", surface: "not-a-token", gap: "block",
        root: { children: [
          { id: "a", type: "Button", props: { children: "Hi", variant: "secondary", size: "huge", onClick: "alert(1)", dangerouslySetInnerHTML: { __html: "<b>x</b>" } }, style: { surface: "subtle", padding: "10px", paddingTop: "sm", height: "x4", minW: "200px" } },
          { id: "b", type: "NotAComponent" },
          { id: "c", type: "Grid", props: { minColumnWidth: "13px" }, children: [{ id: "a", type: "Badge" }] },
          { id: "d", type: "Group", name: "<b>Named</b>", props: { direction: "column", gap: "9px", children: "x" }, style: { marginY: "md", w: "200px" } },
          { id: "e", type: "Image", props: { src: "javascript:alert(1)", alt: "x" } },
          { id: "f", type: "Image", props: { src: "https://example.com/a.png", alt: "x" } },
        ] } },
      { id: "f2", name: "Sized", width: 99999, height: "tall", hug: "yes", root: { children: [] } },
    ], active: "f1" };
    const hash = "#b=" + Buffer.from(JSON.stringify(doc)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const shared = await open({ width: 1280, height: 900 }, { hash });
    await shared.frame().waitForSelector('[data-bf-type="Button"]');
    const saved = await shared.page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const f = saved.frames[0];
    const [button, grid, group, img1, img2] = f.root.children;
    expect(f.name === "Shared" && f.width === 768 && f.hug === true && f.dark === true && f.gap === "block" && f.context === undefined && f.size === undefined, `an older frame comes through as its preset's width, hugging its content, without a context, got ${JSON.stringify({ ...f, root: undefined })}`);
    expect(f.surface === "base", `an unknown surface token should fall back to base, got ${f.surface}`);
    expect(JSON.stringify(button.props) === JSON.stringify({ children: "Hi", variant: "secondary" }), `only real props and values survive, got ${JSON.stringify(button.props)}`);
    expect(JSON.stringify(button.style) === JSON.stringify({ surface: "subtle", paddingTop: "sm", height: "x4" }), `only token styles survive, got ${JSON.stringify(button.style)}`);
    expect(f.root.children.length === 5 && grid.type === "Grid" && group.type === "Group", "an unknown component is dropped");
    expect(!grid.props.minColumnWidth && grid.children[0].id !== "a", "a raw minColumnWidth is dropped and a repeated id replaced");
    expect(group.name === "<b>Named</b>" && JSON.stringify(group.props) === JSON.stringify({ direction: "column" }) && JSON.stringify(group.style) === JSON.stringify({ marginTop: "md", marginBottom: "md" }), `Group keeps its name as text, its own props and token styles, and old two-sided margins split into sides, got ${JSON.stringify(group)}`);
    expect(!img1.props.src && img2.props.src === "https://example.com/a.png", "a javascript: src is dropped and an https one kept");
    const f2 = saved.frames[1];
    expect(f2.width === 3840 && f2.height === 800 && f2.hug === false, `a frame size is clamped and a bad height or hug falls back, got ${f2.width} × ${f2.height}, hug ${f2.hug}`);
    expect(await shared.frame().evaluate(() => innerWidth) === 768, "the canvas should be 768px wide for tablet");
    await shared.page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    expect(await shared.page.locator(".bd-layer-name").first().textContent() === "Shared", "the layers list is headed by the frame's name, as text");
    ok("frame settings, sizes and real props come through; handlers, raw values, bad enum values, unknown components, bad URLs and repeated ids don't");
    await shared.page.close();
  });

  await step("A theme tried in Configure reaches the frames, not the builder's chrome", async () => {
    /* The theme is there from the first load: a project keeps its own theme,
       so one saved on the first visit, before the store below is set, would
       otherwise win when it opens again. */
    const theme = JSON.stringify({ vars: { "--dt-surface-subtle": "rgb(255, 0, 0)", "--dt-surface-base": "rgb(0, 0, 255)" } });
    const themed = await open({ width: 1280, height: 900 }, { store: { "dovetail-theme-config": theme }, before: (p) => p.addInitScript((t) => { try { if (!sessionStorage.getItem("themed")) { sessionStorage.setItem("themed", "1"); localStorage.setItem("dovetail-theme-config", t); } } catch (err) { /* no storage */ } }, theme) });
    await themed.frame().waitForFunction(() => getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 255)");
    const chrome = await themed.page.evaluate(() => [document.documentElement.hasAttribute("data-theme-fixed"), getComputedStyle(document.querySelector(".bd-left")).backgroundColor]);
    expect(chrome[0] && chrome[1] !== "rgb(255, 0, 0)", `the builder's panels should keep their own colours, got ${chrome[1]}`);
    ok("the canvas takes the configured surface; the panels keep theirs");
    await themed.page.close();
  });

  await step("Account: off without a cloud and fetching nothing; with one, sign in, a friendly error, sign up, a reset link, a new password, sign out", async () => {
    /* No cloud: nothing reaches Supabase or the CDN, and the dialog says why. */
    const asked = [];
    const off = await open({ width: 1440, height: 900 }, { before: (p) => p.on("request", (r) => { if (/supabase|jsdelivr/.test(r.url())) asked.push(r.url()); }) });
    await off.page.locator(".bd-rail-account").click();
    await off.page.waitForSelector(".bd-acct[open]");
    const note = await off.page.locator(".bd-acct-body").textContent();
    expect(/isn't connected/.test(note) && /saved in this browser/.test(note), `without a cloud the dialog says it isn't connected, got "${note.slice(0, 80)}"`);
    expect(await off.page.locator(".bd-acct input").count() === 0, "and offers nothing to fill in");
    await off.page.keyboard.press("Escape");
    expect(await off.page.locator(".bd-acct[open]").count() === 0, "Escape closes it");
    await off.page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click();
    await off.page.locator(".bd-home-account").click();
    await off.page.waitForSelector(".bd-acct[open]");
    await off.page.keyboard.press("Escape");
    expect(await off.page.locator(".bd-acct[open]").count() === 0 && await off.page.locator(".bd-home").count() === 1, "on Home, Escape closes the Account dialog and leaves Home open");
    expect(asked.length === 0, `without a cloud nothing is fetched from Supabase or the CDN, got ${asked.join(", ")}`);
    ok("off: says so, offers no form, fetches nothing, from the rail or Home");
    await off.page.close();

    /* A stand-in for supabase-js, served where the CDN would be. */
    const FAKE = `
      const users = { "ann@example.com": "correct horse battery" };
      let session = null;
      const subs = new Set();
      const emit = (ev) => { for (const f of subs) f(ev, session); };
      const err = (code, message) => ({ data: { session: null, user: null }, error: { code, message } });
      export function createClient(url, key, opts) {
        const log = window.__fakeSb = { url, key, opts, calls: [] };
        const call = (...a) => log.calls.push(a);
        const recover = new URLSearchParams(location.search).get("code") === "recover";
        return {
          auth: {
            getSession: async () => ({ data: { session }, error: null }),
            onAuthStateChange: (f) => {
              subs.add(f);
              setTimeout(() => { f("INITIAL_SESSION", session); if (recover) { session = { user: { id: "u1", email: "ann@example.com" } }; f("PASSWORD_RECOVERY", session); } }, 0);
              return { data: { subscription: { unsubscribe: () => subs.delete(f) } } };
            },
            signInWithPassword: async ({ email, password }) => {
              call("signIn", email);
              if (users[email] !== password) return err("invalid_credentials", "Invalid login credentials");
              session = { user: { id: "u1", email } }; emit("SIGNED_IN");
              return { data: { session, user: session.user }, error: null };
            },
            signUp: async ({ email, options }) => { call("signUp", email, options.emailRedirectTo); return { data: { session: null, user: { id: "u2", email } }, error: null }; },
            signOut: async () => { session = null; emit("SIGNED_OUT"); return { error: null }; },
            resetPasswordForEmail: async (email, o) => { call("reset", email, o.redirectTo); return { data: {}, error: null }; },
            updateUser: async ({ password }) => { call("updateUser", password.length); emit("USER_UPDATED"); return { data: { user: session.user }, error: null }; },
          },
          rpc: async (name) => { call("rpc", name); return { data: 0, error: null }; },
        };
      }`;
    const withCloud = async (p) => {
      await p.addInitScript(() => { window.DovetailCloud = { url: "https://stand-in.supabase.co/", anonKey: "stand-in-anon-key-0123456789" }; });
      await p.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: FAKE }));
    };
    const { page } = await open({ width: 1440, height: 900 }, { before: withCloud });
    await page.waitForFunction(() => window.__fakeSb);
    const made = await page.evaluate(() => ({ url: window.__fakeSb.url, flow: window.__fakeSb.opts.auth.flowType }));
    expect(made.url === "https://stand-in.supabase.co" && made.flow === "pkce", `the client is made with the address and the PKCE flow, got ${JSON.stringify(made)}`);
    const acct = page.locator(".bd-acct");
    await page.locator(".bd-rail-account").click();
    await page.waitForSelector(".bd-acct[open] #bd-acct-email");
    expect((await page.locator("#bd-acct-title").textContent()) === "Sign in", "signed out, the dialog signs in");
    await page.fill("#bd-acct-email", "ann@example.com");
    await page.fill("#bd-acct-pass", "wrong");
    await acct.locator("button[type=submit]").click();
    await page.waitForSelector(".bd-acct-msg.is-error");
    const bad = await page.locator(".bd-acct-msg").textContent();
    expect(/don't match/.test(bad), `a wrong password says so in words, got "${bad}"`);
    await page.fill("#bd-acct-pass", "correct horse battery");
    await acct.locator("button[type=submit]").click();
    await page.waitForSelector(".bd-acct-who");
    expect(/ann@example\.com/.test(await page.locator(".bd-acct-who").textContent()), "signed in, it names the account");
    expect(/ann@example\.com/.test(await page.locator(".bd-rail-account").getAttribute("aria-label")), "and so does the Account button");
    expect(await page.evaluate(() => window.__fakeSb.calls.some((c) => c[0] === "rpc" && c[1] === "accept_invites")), "signing in accepts waiting invites");
    ok("on: the PKCE client, a friendly error, then signed in with invites accepted");

    await acct.locator("button", { hasText: "Sign out" }).click();
    await page.waitForSelector(".bd-acct[open] #bd-acct-email");
    await acct.locator(".bd-acct-link", { hasText: "Create an account" }).click();
    expect((await page.locator("#bd-acct-pass").getAttribute("autocomplete")) === "new-password", "a new account asks for a new password");
    await page.fill("#bd-acct-email", "ben@example.com");
    await page.fill("#bd-acct-pass", "a fresh password");
    await acct.locator("button[type=submit]").click();
    await page.waitForSelector(".bd-acct-msg.is-note");
    expect(/ben@example\.com/.test(await page.locator(".bd-acct-msg").textContent()), "signing up says to open the link we sent");
    await acct.locator(".bd-acct-link", { hasText: "Sign in" }).click();
    await acct.locator(".bd-acct-link", { hasText: "Forgot" }).click();
    expect(await page.locator("#bd-acct-pass").count() === 0, "a reset asks only for the email");
    await page.fill("#bd-acct-email", "ann@example.com");
    await acct.locator("button[type=submit]").click();
    await page.waitForSelector(".bd-acct-msg.is-note");
    const calls = await page.evaluate(() => window.__fakeSb.calls);
    const here = server.origin + "/builder.html";
    expect(calls.some((c) => c[0] === "signUp" && c[2] === here) && calls.some((c) => c[0] === "reset" && c[2] === here), `the emails' links come back to the builder, got ${JSON.stringify(calls)}`);
    ok("sign out, sign up, and a reset link, each saying what happens next");
    await page.close();

    /* Back from the reset link: the dialog opens to choose a new password. */
    const back = await open({ width: 390, height: 844 }, { before: withCloud });
    await back.page.goto(server.origin + "/builder.html?code=recover");
    await back.page.waitForSelector(".bd-acct[open]");
    expect((await back.page.locator("#bd-acct-title").textContent()) === "Choose a new password", "the reset link opens the dialog to choose a new password");
    await back.page.fill("#bd-acct-pass", "a newer password");
    await back.page.fill("#bd-acct-again", "not the same");
    await back.page.locator(".bd-acct button[type=submit]").click();
    expect(/don't match/.test(await back.page.locator(".bd-acct-msg").textContent()), "two different passwords are caught");
    await back.page.fill("#bd-acct-again", "a newer password");
    await back.page.locator(".bd-acct button[type=submit]").click();
    await back.page.waitForSelector(".bd-acct-who");
    expect(/changed/.test(await back.page.locator(".bd-acct-msg").textContent()), "the new password is saved and said so");
    const box = await back.page.locator(".bd-acct").boundingBox();
    expect(box.x >= 0 && box.x + box.width <= 390, `the dialog fits a phone, got ${Math.round(box.x)} + ${Math.round(box.width)}`);
    ok("a reset link opens the dialog to a new password, at 390px");
    await back.page.close();
  });

  await step("Keyboard and selection: arrows nudge free objects, Cmd+A selects all, Cmd+] and [ order, Shift+2 zooms to the selection, Alt-drag copies", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    /* A freeform frame with three loose objects at known steps, saved once
       the first visit's own save has landed. */
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      const node = (id, type, props, x, y) => ({ id, type, props, style: { x, y } });
      d.frames.push({ id: "freebie", name: "Free", width: 800, height: 600, mode: "free", root: { id: "root", type: "Root", children: [
        node("ba", "Button", { children: "Alpha" }, 10, 10), node("bb", "Button", { children: "Beta" }, 60, 10), node("hc", "Heading", { children: "Gamma" }, 10, 60)] } });
      d.active = "freebie";
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    const opened = await poll(() => page.evaluate(() => window.__builder ? window.__builder.doc().frames.map((f) => f.id).join() : "no builder"), (v) => /freebie/.test(v), 8000);
    expect(/freebie/.test(opened), `after the save and reload the free frame is there, got frames ${opened}`);
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[1].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="ba"]'));
    const free = async () => (await saved()).frames.find((f) => f.id === "freebie");
    const at = async (id) => { const n = (await free()).root.children.find((c) => c.id === id); return [n.style.x, n.style.y]; };
    const order = async () => (await free()).root.children.map((c) => c.id).join(",");
    await fitAll(page);
    await release(page);
    await page.evaluate(() => window.__builder.select(["ba"]));
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const steps0 = (await steps(page)).past;
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+ArrowRight");
    const moved = await poll(() => at("ba"), (v) => v[0] === 15 && v[1] === 11);
    expect(moved[0] === 15 && moved[1] === 11, `Right, Down and Shift+Right take Alpha from 10,10 to 15,11, got ${moved}`);
    expect((await steps(page)).past === steps0 + 3, "each key press is one undo step");
    await page.keyboard.press("ArrowLeft");
    for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+ArrowUp");
    const edge = await poll(() => at("ba"), (v) => v[1] === 0);
    expect(edge[0] === 14 && edge[1] === 0, `nudging past the top stops at 0, got ${edge}`);
    ok("arrows move a free object a step at a time, Shift four, never past the canvas's edge");

    await page.keyboard.press("Control+a");
    const all = await page.evaluate(() => window.__builder.selection());
    expect(all.length === 3, `Cmd+A selects the frame's three objects, got ${all.length}`);
    ok("Cmd+A selects everything at the top of the frame");

    await page.evaluate(() => window.__builder.select(["ba"]));
    await page.keyboard.press("Control+]");
    expect(await poll(order, (o) => o === "bb,ba,hc") === "bb,ba,hc", `Cmd+] brings Alpha forward one, got ${await order()}`);
    await page.keyboard.press("Control+Shift+]");
    expect(await poll(order, (o) => o === "bb,hc,ba") === "bb,hc,ba", `Cmd+Shift+] brings it to the front, got ${await order()}`);
    await page.keyboard.press("Control+Shift+[");
    expect(await poll(order, (o) => o === "ba,bb,hc") === "ba,bb,hc", `Cmd+Shift+[ sends it to the back, got ${await order()}`);
    await page.keyboard.press("Control+[");
    expect(await order() === "ba,bb,hc", "Cmd+[ at the back changes nothing");
    expect(await page.evaluate(() => window.__builder.selection()).then((s) => s.join() === "ba"), "the selection stays through the reordering");
    ok("Cmd+] / [ step the z-order, with Shift to the front and the back");

    const wide = await camera(page);
    await page.keyboard.press("Shift+Digit2");
    await page.waitForFunction((c) => document.querySelector(".bd-world").style.transform !== c, wide);
    const zoomed = await camera(page);
    const zIn = Number(/scale\(([\d.]+)\)/.exec(zoomed)[1]), zWide = Number(/scale\(([\d.]+)\)/.exec(wide)[1]);
    expect(zIn > zWide, `Shift+2 zooms in on the selected Button, ${zWide} to ${zIn}`);
    await page.waitForTimeout(250);
    const centred = await page.evaluate(() => {
      const st = document.querySelector(".bd-stage").getBoundingClientRect();
      const fr = document.querySelectorAll("iframe.bd-frame")[1], fb = fr.getBoundingClientRect();
      const r = fr.contentWindow.BuilderFrame.rect("ba"), s = fb.width / parseFloat(fr.style.width);
      return { dx: fb.left + (r.left + r.width / 2) * s - (st.left + st.width / 2), dy: fb.top + (r.top + r.height / 2) * s - (st.top + st.height / 2), w: st.width, h: st.height };
    });
    expect(Math.abs(centred.dx) < centred.w * 0.15 && Math.abs(centred.dy) < centred.h * 0.15, `and centres it, off by ${Math.round(centred.dx)},${Math.round(centred.dy)} in a stage ${Math.round(centred.w)}×${Math.round(centred.h)}`);
    ok("Shift+2 zooms to the selection and centres it");

    await fitAll(page);
    await page.evaluate(() => window.__builder.select([]));
    const from = await canvasPoint(page, '[data-bf-id="bb"]', "center", 1);
    await page.keyboard.down("Alt");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 30, { steps: 8 });
    await page.mouse.move(from.x + 80, from.y + 60, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up("Alt");
    const after = await poll(free, (f) => f.root.children.length === 4);
    const betas = after.root.children.filter((c) => c.type === "Button" && c.props.children === "Beta");
    expect(betas.length === 2, `Alt-drag leaves two Betas, got ${after.root.children.map((c) => c.props.children)}`);
    const orig = betas.find((b) => b.id === "bb"), copy = betas.find((b) => b.id !== "bb");
    expect(orig.style.x === 60 && orig.style.y === 10, `the original stays at 60,10, got ${orig.style.x},${orig.style.y}`);
    expect(copy.style.x > 60 && copy.style.y > 10, `the copy moved with the pointer, got ${copy.style.x},${copy.style.y}`);
    ok(`Alt-drag puts a copy of Beta at ${copy.style.x},${copy.style.y} and leaves the original where it was`);

    /* A marquee from the empty canvas left of the free frame, across its two Buttons. */
    await fitAll(page);
    await page.evaluate(() => window.__builder.select([]));
    const fb = await page.evaluate(() => { const fr = document.querySelectorAll("iframe.bd-frame")[1], r = fr.getBoundingClientRect(); return { left: r.left, top: r.top, s: r.width / parseFloat(fr.style.width) }; });
    const camBefore = await camera(page);
    const sweep = async (x0, y0, x1, y1, mods = []) => {
      for (const m of mods) await page.keyboard.down(m);
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
      await page.mouse.move(x1, y1, { steps: 4 });
      await page.waitForTimeout(80);
    };
    await sweep(fb.left - 24, fb.top + 4, fb.left + 300 * fb.s, fb.top + 90 * fb.s);
    expect(await page.locator(".bd-marquee").count() === 1, "a box shows while dragging");
    await page.mouse.up();
    await page.waitForTimeout(100);
    let picked = await page.evaluate(() => window.__builder.selection().sort().join());
    expect(picked === "ba,bb", `a sweep across the Buttons selects both, got ${picked}`);
    expect(await camera(page) === camBefore, "and the canvas didn't pan");
    expect(await page.locator(".bd-marquee").count() === 0, "the box goes when the drag ends");
    await sweep(fb.left - 24, fb.top + 200 * fb.s, fb.left + 100 * fb.s, fb.top + 300 * fb.s, ["Shift"]);
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await page.waitForTimeout(100);
    picked = await page.evaluate(() => window.__builder.selection().sort().join());
    expect(picked === "ba,bb,hc", `a Shift-sweep over the Heading adds it, got ${picked}`);
    await sweep(fb.left - 24, fb.top + 4, fb.left + 300 * fb.s, fb.top + 90 * fb.s);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForTimeout(100);
    picked = await page.evaluate(() => window.__builder.selection().sort().join());
    expect(picked === "ba,bb,hc", `Escape mid-sweep keeps the selection as it was, got ${picked}`);
    await page.mouse.click(fb.left - 24, fb.top + 4);
    await page.waitForTimeout(100);
    expect((await page.evaluate(() => window.__builder.selection())).length === 0, "a plain click on empty canvas still clears the selection");
    ok("a drag on empty canvas draws a marquee that selects what it touches; Shift adds; Escape cancels; a click still clears");

    /* Align and distribute: Alpha is at 14,0, Beta at 60,10, Gamma at 10,60. */
    await page.evaluate(() => window.__builder.select(["ba", "bb", "hc"]));
    await page.waitForSelector(".bd-arrange");
    expect(await page.locator(".bd-arrange-btn").count() === 9 && await page.locator(".bd-arrange-btn[disabled]").count() === 0, "three free objects get nine arrange buttons, all live");
    await release(page);
    const stepsA = (await steps(page)).past;
    await page.keyboard.press("Alt+KeyA");
    const lefts = await poll(async () => [await at("ba"), await at("bb"), await at("hc")], (v) => v.every((p) => p[0] === 10));
    expect(lefts.every((p) => p[0] === 10), `Alt+A lines their left edges up on the leftmost, got ${JSON.stringify(lefts)}`);
    expect((await steps(page)).past === stepsA + 1, "as one undo step");
    /* What align measures: each object's box in the frame, beside where the
       document puts it, so a failure says which one was measured off. */
    let boxes = "";
    for (const f of frames(page)) {
      const got = await f.evaluate(() => document.querySelector('[data-bf-id="hc"]') ? ["ba", "bb", "hc"].map((id) => { const r = window.BuilderFrame.rect(id), el = document.querySelector(`[data-bf-id="${id}"]`).firstElementChild, b = el && el.getBoundingClientRect(); return id + " top " + (r ? Math.round(r.top * 100) / 100 + " h " + Math.round(r.height * 100) / 100 : "none") + " (el " + (b ? Math.round(b.top * 100) / 100 + " h " + Math.round(b.height * 100) / 100 : "none") + ")"; }).join(", ") + "; unit " + window.BuilderFrame.measure(["var(--dt-space-inset-2xs)"])[0] : "").catch(() => "");
      if (got) { boxes = got; break; }
    }
    const was = [await at("ba"), await at("bb"), await at("hc")];
    await page.keyboard.press("Alt+KeyW");
    const tops = await poll(async () => [await at("ba"), await at("bb"), await at("hc")], (v) => v.every((p) => p[1] === 0));
    expect(tops.every((p) => p[1] === 0), `Alt+W lines their tops up, got ${JSON.stringify(tops)} from ${JSON.stringify(was)}; measured ${boxes}`);
    await page.evaluate(() => window.__builder.select(["ba"]));
    await page.waitForTimeout(100);
    expect(await page.locator(".bd-arrange-btn[disabled]").count() === 3, "one object can align to its frame but not spread");
    await page.keyboard.press("Alt+KeyD");
    const right = await poll(() => at("ba"), (v) => v[0] > 100);
    expect(right[0] > 150, `on its own, Alt+D takes Alpha to the frame's right edge, got ${right}`);
    await page.locator(".bd-arrange-btn[aria-label='Align centres']").click();
    const mid = await poll(() => at("ba"), (v) => v[0] < 150 && v[0] > 50);
    expect(mid[0] > 50 && mid[0] < 150, `the Align centres button puts it in the middle of the frame, got ${mid}`);
    /* Three across a row, then spread evenly. */
    await page.evaluate(() => window.__builder.select(["bb", "hc"]));
    await page.keyboard.press("Alt+KeyW");
    await poll(async () => [await at("bb"), await at("hc")], (v) => v[0][1] === 0 && v[1][1] === 0);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__builder.select(["ba", "bb", "hc"]));
    const beforeSpread = await page.evaluate(() => ["ba", "bb", "hc"].map((id) => { const r = document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame.rect(id); return [id, Math.round(r.left), Math.round(r.width)]; }));
    await page.keyboard.press("Shift+Alt+KeyH");
    await page.waitForTimeout(300);
    const gaps = await page.evaluate(() => {
      const fr = document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame;
      const rs = ["ba", "bb", "hc"].map((id) => fr.rect(id)).sort((p, q) => p.left - q.left);
      return [rs[1].left - rs[0].right, rs[2].left - rs[1].right];
    });
    expect(Math.abs(gaps[0] - gaps[1]) <= 5, `Shift+Alt+H spreads them with even gaps, got ${gaps.map(Math.round)} from ${JSON.stringify(beforeSpread)}`);
    expect(await page.locator(".bd-inspect-title").textContent().then((t) => /^3 /.test(t)), "the selection stays through the arranging");
    ok("Alt+A/W align, Alt+D and the buttons align one object to its frame, Shift+Alt+H spreads three evenly");

    /* Smart guides: Alpha dragged down and to within a few pixels of Beta's
       left edge snaps to it, with a guide line; with Ctrl held it doesn't. */
    await fitAll(page);
    await page.evaluate(() => window.__builder.select([]));
    const geo = async () => page.evaluate(() => { const fr = document.querySelectorAll("iframe.bd-frame")[1], b = fr.getBoundingClientRect(), api = fr.contentWindow.BuilderFrame; const s = b.width / parseFloat(fr.style.width); const r = (id) => api.rect(id); return { s, ba: r("ba"), bb: r("bb"), left: b.left, top: b.top }; });
    let g = await geo();
    const start = { x: g.left + (g.ba.left + g.ba.width / 2) * g.s, y: g.top + (g.ba.top + g.ba.height / 2) * g.s };
    /* A drag the frame starts measures from its first move, so the first
       8px wake it and the rest is the distance that counts. */
    const dragBy = async (dx, dy, hold) => {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      if (hold) await page.keyboard.down(hold);
      await page.mouse.move(start.x + 8, start.y);
      await page.waitForTimeout(60);
      await page.mouse.move(start.x + 8 + dx / 2, start.y + dy / 2, { steps: 6 });
      await page.mouse.move(start.x + 8 + dx, start.y + dy, { steps: 6 });
      await page.waitForTimeout(120);
      const guides = await page.locator(".bd-guide").count();
      await page.mouse.up();
      if (hold) await page.keyboard.up(hold);
      await page.waitForTimeout(150);
      return guides;
    };
    const aim = (g.bb.left + 4 - g.ba.left) * g.s;
    const guides = await dragBy(aim, 120 * g.s);
    g = await geo();
    expect(Math.abs(g.ba.left - g.bb.left) <= 2, `dragged to 4px off Beta's left edge, Alpha snaps to it: ${Math.round(g.ba.left)} against ${Math.round(g.bb.left)}`);
    expect(guides >= 1, `and a guide line showed while dragging, got ${guides}`);
    expect(await page.locator(".bd-guide").count() === 0, "the guide goes when the drag ends");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    g = await geo();
    const noSnap = await dragBy(aim, 120 * g.s, "Control");
    g = await geo();
    expect(Math.abs(g.ba.left - g.bb.left) >= 3 && noSnap === 0, `with Ctrl held it lands where it was let go and shows no guide: ${Math.round(g.ba.left)} against ${Math.round(g.bb.left)}, ${noSnap} guides`);
    ok("a free object snaps to a sibling's edge with a guide line; Ctrl held turns the snapping off");

    /* Resize handles: the right edge widens Alpha to a size token; the left
       edge of a free object moves it as it grows; Shift on a corner sets both. */
    await page.evaluate(() => window.__builder.select(["ba"]));
    await page.waitForSelector(".bd-mark-sel .bd-handle.is-se");
    expect(await page.locator(".bd-mark-sel .bd-handle").count() === 8, "a free object shows eight handles");
    const node = async () => (await free()).root.children.find((c) => c.id === "ba");
    const widthOf = () => page.evaluate(() => document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame.rect("ba").width);
    const w0 = await widthOf(), stepsR = (await steps(page)).past;
    /* A handle's place once the mark has caught up with the last edit. */
    const settled = async (sel) => {
      let b = null;
      for (let i = 0; i < 10; i++) { const n = await page.locator(sel).boundingBox(); if (b && n && Math.abs(n.x - b.x) < 0.5 && Math.abs(n.y - b.y) < 0.5) return n; b = n; await page.waitForTimeout(100); }
      return b;
    };
    const pull = async (dir, dx, dy, hold) => {
      const hb = await settled(".bd-mark-sel .bd-handle.is-" + dir);
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await page.mouse.down();
      if (hold) await page.keyboard.down(hold);
      await page.mouse.move(hb.x + hb.width / 2 + dx / 2, hb.y + hb.height / 2 + dy / 2, { steps: 5 });
      await page.mouse.move(hb.x + hb.width / 2 + dx, hb.y + hb.height / 2 + dy, { steps: 5 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      if (hold) await page.keyboard.up(hold);
      await page.waitForTimeout(250);
    };
    /* On a free canvas a handle gives any multiple of 4px (fw/fh, in 4px
       steps), shows the size by the pointer, and holds the opposite side. */
    const readoutDuring = async (dir, dx, dy) => {
      const hb = await settled(".bd-mark-sel .bd-handle.is-" + dir);
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await page.mouse.down();
      await page.mouse.move(hb.x + hb.width / 2 + dx, hb.y + hb.height / 2 + dy, { steps: 6 });
      const text = await page.locator(".bd-readout").textContent().catch(() => null);
      const dimmed = await page.evaluate(() => { const hs = [...document.querySelectorAll(".bd-mark-sel .bd-handle")]; const on = hs.find((h) => h.classList.contains("is-active")); return !!on && hs.filter((h) => h !== on).every((h) => Number(getComputedStyle(h, "::after").opacity) < 0.5); });
      await page.mouse.up();
      await page.waitForTimeout(250);
      return { text, dimmed };
    };
    const during = await readoutDuring("e", 90, 0);
    const grown = await node();
    const w1 = await widthOf();
    expect(Number.isInteger(grown.style.fw) && !grown.style.w && Math.abs(w1 - grown.style.fw * 4) < 1, `the width becomes a multiple of 4px (fw ${grown.style.fw}), drawn ${w1}`);
    expect(w1 > w0 + 20, `and the Button is wider on the canvas, ${Math.round(w0)} to ${Math.round(w1)}`);
    expect((await steps(page)).past === stepsR + 1, "the whole pull is one undo step");
    expect(during.text && /^\d+ × \d+$/.test(during.text) && during.dimmed, `while it's pulled, the size shows by the pointer and the other handles dim, got ${JSON.stringify(during)}`);
    const x1 = grown.style.x, right1 = (grown.style.x + grown.style.fw) * 4;
    await pull("w", -60, 0);
    const left = await node();
    expect(left.style.x < x1 && left.style.fw > grown.style.fw && Math.abs((left.style.x + left.style.fw) * 4 - right1) <= 4, `pulling the left edge moves it left and keeps its right edge: x ${x1} to ${left.style.x}, right ${right1} to ${(left.style.x + left.style.fw) * 4}`);
    const ratio = (await page.evaluate(() => document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame.size("ba"))), k0 = ratio.height / ratio.width;
    await pull("se", 40, 40, "Shift");
    const kept = await node();
    expect(kept.style.fw && kept.style.fh && Math.abs(kept.style.fh / kept.style.fw - k0) < 0.15, `Shift on a corner sets both and keeps the shape: ${kept.style.fw * 4} × ${kept.style.fh * 4}, was ${k0.toFixed(2)} tall per wide`);
    ok(`free handles size in 4px steps: ${grown.style.fw * 4}px wide with the size by the pointer, then the left edge moved it and held the right, then a Shift corner gave ${kept.style.fw * 4} × ${kept.style.fh * 4}`);

    /* W and H in the inspector: any multiple of 4, arrows 4 and 16. */
    await tab(page, "Layout");
    const wField = page.locator('.bd-right input[aria-label^="Width, in pixels"]');
    await wField.fill("130");
    await wField.press("Enter");
    expect((await poll(node, (n) => n.style.fw === 33)).style.fw === 33, "130 typed rounds to 132, 33 steps");
    await wField.press("ArrowUp");
    expect((await poll(node, (n) => n.style.fw === 34)).style.fw === 34, "Up adds 4px");
    await wField.press("Shift+ArrowUp");
    expect((await poll(node, (n) => n.style.fw === 38)).style.fw === 38, "Shift+Up adds 16px");
    ok("the W field takes any multiple of 4: 130 typed is 132, Up is 136, Shift+Up 152");

    /* Turning: from just outside a corner, Shift snaps to 15°, the angle
       shows by the pointer, and the field sets it too. */
    const cornerTurn = async (deg, hold) => {
      /* The mark settles once the canvas has drawn the last edit. */
      let mark = null;
      for (let i = 0; i < 10; i++) { await page.waitForTimeout(120); const m = await page.locator(".bd-mark-sel").first().boundingBox(); if (mark && m && Math.abs(m.width - mark.width) < 0.5 && Math.abs(m.x - mark.x) < 0.5) break; mark = m; }
      mark = await page.locator(".bd-mark-sel").first().boundingBox();
      const cx = mark.x + mark.width / 2, cy = mark.y + mark.height / 2;
      /* The grip below and to the right: the layer may sit at the top. */
      const rb = await page.locator(".bd-mark-sel .bd-rotate.is-se").boundingBox();
      const sx = rb.x + rb.width / 2, sy = rb.y + rb.height / 2;
      const r = Math.hypot(sx - cx, sy - cy), a0 = Math.atan2(sy - cy, sx - cx);
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      if (hold) await page.keyboard.down(hold);
      for (let i = 1; i <= 8; i++) { const a = a0 + (deg * Math.PI / 180) * i / 8; await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
      const text = await page.locator(".bd-readout").textContent().catch(() => null);
      await page.mouse.up();
      if (hold) await page.keyboard.up(hold);
      await page.waitForTimeout(250);
      return text;
    };
    const turnSteps = (await steps(page)).past;
    const turnText = await cornerTurn(47, "Shift");
    const turned = await node();
    expect(turned.style.rot === 45 && turnText === "45°" && (await steps(page)).past === turnSteps + 1, `a Shift turn from the corner snaps to 45° in one step, showing the angle, got ${turned.style.rot} and ${turnText}`);
    expect(await frames(page)[1].evaluate(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).transform !== "none"), "the canvas draws it turned");
    await tab(page, "Layout");
    const rotField = page.locator('.bd-right input[aria-label="Rotation, in degrees"]');
    expect(await rotField.inputValue() === "45", `the rotation field reads 45, got ${await rotField.inputValue()}`);
    await rotField.fill("-30");
    await rotField.press("Enter");
    expect((await poll(node, (n) => n.style.rot === -30)).style.rot === -30, "typing -30 turns it back the other way");
    await rotField.press("Shift+ArrowUp");
    expect((await poll(node, (n) => n.style.rot === -15)).style.rot === -15, "Shift+Up adds 15°");
    /* A turned layer resizes along its own sides: the far side stays put.
       Away from the frame's top, so nothing clamps it at 0. */
    const yField = page.locator('.bd-right input[aria-label="Y position"]');
    await yField.fill("200");
    await yField.press("Enter");
    await poll(node, (n) => n.style.y === 50);
    const westMid = (st) => { const W = st.fw * 4, H = st.fh * 4, t = (st.rot || 0) * Math.PI / 180; const cx = st.x * 4 + W / 2, cy = st.y * 4 + H / 2; return { x: cx - (W / 2) * Math.cos(t), y: cy - (W / 2) * Math.sin(t) }; };
    const beforeTurned = await node();
    await pull("e", 50, 0);
    const afterTurned = await node();
    const wa = westMid(beforeTurned.style), wb = westMid(afterTurned.style);
    expect(afterTurned.style.fw > beforeTurned.style.fw && Math.hypot(wa.x - wb.x, wa.y - wb.y) <= 6, `pulling the right handle of a turned layer widens it and holds its left side: ${JSON.stringify(wa)} to ${JSON.stringify(wb)}`);
    await rotField.fill("0");
    await rotField.press("Enter");
    expect((await poll(node, (n) => !n.style.rot)).style.rot === undefined, "0 turns it straight again, with nothing stored");
    ok("a Shift turn from just outside a corner snaps to 45° with the angle by the pointer; the field takes -30 and Shift+Up 15°; a turned layer resizes along its own sides; 0 clears it");

    /* Moving shows where it's going, in pixels. */
    await settled(".bd-mark-sel");
    const at0 = await canvasPoint(page, '[data-bf-id="ba"]', "center", 1);
    await page.mouse.move(at0.x, at0.y);
    await page.mouse.down();
    await page.mouse.move(at0.x + 30, at0.y + 20, { steps: 8 });
    const moveText = await page.locator(".bd-readout").textContent().catch(() => null);
    await page.mouse.up();
    await page.waitForTimeout(250);
    expect(moveText && /^X \d+ {2}Y \d+$/.test(moveText), `a move shows X and Y by the pointer, got ${moveText}`);
    ok(`a move shows its position by the pointer (${moveText})`);

    /* Flush with the frame's right edge, its own handle still answers: the
       frame's edge grip sits outside the frame. */
    const frameW = (await free()).width;
    await page.evaluate(() => window.__builder.select(["ba"]));
    await tab(page, "Layout");
    await wField.fill("120");
    await wField.press("Enter");
    await poll(node, (n) => n.style.fw === 30);
    const xField = page.locator('.bd-right input[aria-label="X position"]');
    await xField.fill(String(frameW - 120));
    await xField.press("Enter");
    const flush = await poll(node, (n) => (n.style.x + n.style.fw) * 4 === frameW);
    expect((flush.style.x + flush.style.fw) * 4 === frameW, `the Button sits flush with the frame's right edge, ${(flush.style.x + flush.style.fw) * 4} of ${frameW}`);
    await pull("e", -12, 0);
    const pulled = await node();
    expect(pulled.style.fw < 30 && (await free()).width === frameW, `its right handle resizes the Button, not the frame: ${pulled.style.fw * 4}px wide, the frame still ${(await free()).width}`);
    ok("a layer flush with the frame's right edge resizes itself from its handle; the frame keeps its width");

    /* Hide and lock. Gamma hidden: gone from the canvas and the code, dim in
       Layers, back with the eye. Beta locked: a canvas press passes it by,
       arrows don't move it, no handles; Layers still picks it. */
    const flag = async (id) => { const n = (await free()).root.children.find((c) => c.id === id); return { hide: !!n.hide, lock: !!n.lock, x: n.style.x }; };
    await page.evaluate(() => window.__builder.select(["hc"]));
    await release(page);
    await page.keyboard.press("Control+Shift+KeyH");
    expect((await poll(() => flag("hc"), (v) => v.hide)).hide, "Ctrl+Shift+H hides the Heading");
    await frames(page)[1].waitForFunction(() => !document.querySelector('[data-bf-id="hc"]'));
    await page.evaluate(() => window.__builder.select([]));
    await page.waitForTimeout(100);
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(!/Gamma/.test(code) && /Alpha/.test(code), "the hidden Heading stays out of the exported code while the Buttons are in it");
    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    const gammaRow = page.locator('.bd-layer[data-layer="hc"]');
    expect(await gammaRow.evaluate((r) => r.classList.contains("is-hidden")), "its layer row is dimmed");
    expect(await page.locator('.bd-layer[data-layer="bb"] .bd-layer-flag[aria-label^="Hide"], .bd-layer[data-layer="bb"] .bd-layer-flag[aria-label^="Show"]').count() === 0, "a visible row has no eye of its own");
    await gammaRow.locator(".bd-layer-flag.is-hidden-mark[aria-label^='Show']").click();
    expect(!(await poll(() => flag("hc"), (v) => !v.hide)).hide, "the quiet eye-off on the hidden row shows it again");
    await frames(page)[1].waitForSelector('[data-bf-id="hc"]');
    /* The inspector's Layer section carries the eye now. */
    await page.evaluate(() => window.__builder.select(["hc"]));
    await tab(page, "Appearance");
    const eye = page.locator('.bd-right .bd-sec[data-sec="layer"] .bd-sec-head .bd-act');
    expect(await eye.getAttribute("aria-pressed") === "false" && /^Visible/.test(await eye.getAttribute("aria-label")), "the Layer section's eye says the Heading is visible");
    await eye.click();
    expect((await poll(() => flag("hc"), (v) => v.hide)).hide, "the Layer section's eye hides it");
    await page.waitForFunction(() => document.querySelector('.bd-right .bd-sec[data-sec="layer"] .bd-sec-head .bd-act')?.getAttribute("aria-pressed") === "true");
    await page.locator('.bd-right .bd-sec[data-sec="layer"] .bd-sec-head .bd-act').click();
    expect(!(await poll(() => flag("hc"), (v) => !v.hide)).hide, "and shows it again");
    await frames(page)[1].waitForSelector('[data-bf-id="hc"]');
    await page.evaluate(() => window.__builder.select(["bb"]));
    /* Pressed once Beta shows as selected, as a person would. */
    await page.waitForSelector('.bd-layer[data-layer="bb"].is-current');
    await page.keyboard.press("Control+Shift+KeyL");
    expect((await poll(() => flag("bb"), (v) => v.lock)).lock, "Ctrl+Shift+L locks Beta");
    await page.waitForSelector(".bd-mark-sel.is-locked");
    expect(await page.locator(".bd-mark-sel .bd-handle").count() === 0, "a locked layer has no handles and a dashed outline");
    const xBefore = (await flag("bb")).x;
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    expect((await flag("bb")).x === xBefore, "arrows don't move a locked layer");
    await page.evaluate(() => window.__builder.select([]));
    const bbAt = await canvasPoint(page, '[data-bf-id="bb"]', "center", 1);
    await page.mouse.click(bbAt.x, bbAt.y);
    await page.waitForTimeout(200);
    expect(!(await page.evaluate(() => window.__builder.selection())).includes("bb"), "a press on the canvas passes a locked layer by");
    await page.locator('.bd-layer[data-layer="bb"] .bd-layer-main').click();
    await page.waitForTimeout(150);
    expect((await page.evaluate(() => window.__builder.selection())).join() === "bb", "Layers still picks it");
    await page.locator('.bd-layer[data-layer="bb"] .bd-layer-flag[aria-label^="Unlock"]').click();
    expect(!(await poll(() => flag("bb"), (v) => !v.lock)).lock, "the lock on the row unlocks it");
    ok("hide takes a layer off the canvas and out of the code; the Layer section's eye hides and shows it, and a hidden row keeps a quiet eye-off that shows it; lock keeps the canvas and the arrows off it, and the row's lock turns it back");

    /* The right-click menu: on a canvas layer, on a layer row, from the
       keyboard, and on empty canvas. */
    await page.evaluate(() => window.__builder.select([]));
    /* Once the unlock has reached the frame and the old marks are gone. */
    await frames(page)[1].waitForSelector('[data-bf-id="bb"]:not([data-bf-locked])', { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll(".bd-mark-sel").length === 0);
    const bbPt = await canvasPoint(page, '[data-bf-id="bb"]', "center", 1);
    await page.mouse.move(bbPt.x, bbPt.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.up({ button: "right" });
    await page.waitForSelector(".bd-ctx");
    expect((await page.evaluate(() => window.__builder.selection())).join() === "bb", "a right-click on a layer selects it first");
    const countBefore = (await free()).root.children.length;
    await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Duplicate/ }).click();
    const countAfter = (await poll(async () => (await free()).root.children.length, (n) => n === countBefore + 1));
    expect(countAfter === countBefore + 1 && await page.locator(".bd-ctx").count() === 0, `Duplicate from the menu adds a layer and closes it, ${countBefore} to ${countAfter}`);
    await page.locator('.bd-layer[data-layer="hc"]').click({ button: "right" });
    await page.waitForSelector(".bd-ctx");
    await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Hide/ }).click();
    expect((await poll(() => flag("hc"), (v) => v.hide)).hide, "a layer row's menu hides it");
    await page.keyboard.press("Control+z");
    await poll(() => flag("hc"), (v) => !v.hide);
    await page.evaluate(() => window.__builder.select(["ba"]));
    await release(page);
    await page.keyboard.press("Shift+F10");
    await page.waitForSelector(".bd-ctx");
    expect(await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Lock/ }).count() === 1, "Shift+F10 opens the menu for the selection");
    await page.keyboard.press("Escape");
    expect(await page.locator(".bd-ctx").count() === 0, "Escape closes it");
    await page.mouse.click(fb.left - 24, fb.top + 4, { button: "right" });
    await page.waitForSelector(".bd-ctx");
    expect(await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Select all/ }).count() === 1 && await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Delete/ }).count() === 0, "empty canvas offers Select all and Paste, not Delete");
    await page.keyboard.press("Escape");
    ok("the right-click menu works on canvas layers, layer rows, from Shift+F10 and on empty canvas");

    /* Opacity in a free frame: any whole percent. The digit keys set 10%
       to 90% and 0 makes it opaque; the Layer section has a slider and a
       number, arrows step 1% and Shift 10%, and a slider drag is one undo. */
    await page.evaluate(() => window.__builder.select(["ba"]));
    await release(page);
    await page.keyboard.press("Digit5");
    const ba = async () => (await free()).root.children.find((c) => c.id === "ba").style;
    const alphaOf = async () => (await ba()).alpha;
    const painted = (v) => frames(page)[1].waitForFunction((v) => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).opacity === v, v);
    expect(await poll(alphaOf, (v) => v === 50) === 50, `5 sets 50%, got ${await alphaOf()}`);
    await painted("0.5");
    await page.keyboard.press("Digit9");
    expect(await poll(alphaOf, (v) => v === 90) === 90, "9 is 90%");
    await page.keyboard.press("Digit0");
    expect(await poll(alphaOf, (v) => v === undefined) === undefined && (await ba()).opacity === undefined, "0 makes it opaque again");
    await tab(page, "Appearance");
    const num = page.locator('.bd-right .bd-opacity input[aria-label="Opacity, percent"]');
    const range = page.locator(".bd-right .bd-opacity-range");
    expect(await num.count() === 1 && await range.count() === 1 && await num.inputValue() === "100", "the Layer section has an opacity slider and a number at 100");
    await num.fill("37");
    await num.press("Enter");
    expect(await poll(alphaOf, (v) => v === 37) === 37, `typing 37 sets 37%, got ${await alphaOf()}`);
    await painted("0.37");
    await num.press("Shift+ArrowUp");
    expect(await poll(alphaOf, (v) => v === 47) === 47, "Shift+Up in the number adds 10%");
    await range.focus();
    await page.keyboard.press("ArrowLeft");
    expect(await poll(alphaOf, (v) => v === 46) === 46, "Left on the slider takes 1%");
    await page.keyboard.press("Shift+ArrowLeft");
    expect(await poll(alphaOf, (v) => v === 36) === 36, "Shift+Left on the slider takes 10%");
    const before = (await steps(page)).past;
    const rb = await range.boundingBox();
    await page.mouse.move(rb.x + rb.width * 0.36, rb.y + rb.height / 2);
    await page.mouse.down();
    for (const f of [0.5, 0.6, 0.7, 0.8]) await page.mouse.move(rb.x + rb.width * f, rb.y + rb.height / 2, { steps: 3 });
    await page.mouse.up();
    const dragged = await alphaOf();
    expect(dragged >= 75 && dragged <= 85 && (await steps(page)).past === before + 1, `a drag on the slider lands near 80% as one undo step, got ${dragged}% and ${(await steps(page)).past - before} steps`);
    await release(page);
    await page.keyboard.press("Control+z");
    expect(await poll(alphaOf, (v) => v === 36) === 36, `undo puts the drag back to 36%, got ${await alphaOf()}`);
    await page.locator(".bd-export").click();
    const opCode = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/opacity: 0\.36/.test(opCode), "the exported code carries opacity: 0.36");
    await num.fill("100");
    await num.press("Enter");
    expect(await poll(alphaOf, (v) => v === undefined) === undefined, "100% clears it");
    ok("in a free frame, digits set 10% to 90% and 0 is opaque; the Layer section's slider and number take any percent, arrows step 1% and Shift 10%, a slider drag is one undo step, and the code carries it");

    /* Blend modes show on the canvas while the menu is open: hover or the
       arrows preview one, Escape puts back what was there, a click keeps it
       as one undo step. */
    const blendOn = () => frames(page)[1].evaluate(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode);
    const blendSteps = (await steps(page)).past;
    await page.locator(".bd-right .bd-blend-dd").click();
    await page.locator(".bd-dd-opt", { hasText: /^Multiply/ }).hover();
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode === "multiply");
    await page.locator(".bd-dd-opt", { hasText: /^Screen/ }).hover();
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode === "screen");
    await page.keyboard.press("ArrowDown");
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode === "overlay");
    expect((await steps(page)).past === blendSteps, "previewing makes no undo step");
    await page.keyboard.press("Escape");
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode === "normal");
    expect(!(await ba()).blend, "Escape puts the blend mode back to Normal");
    await page.locator(".bd-right .bd-blend-dd").click();
    await page.locator(".bd-dd-opt", { hasText: /^Darken/ }).hover();
    await page.locator(".bd-dd-opt", { hasText: /^Multiply/ }).click();
    expect(await poll(async () => (await ba()).blend, (v) => v === "multiply") === "multiply" && (await steps(page)).past === blendSteps + 1, `a click keeps Multiply as one undo step, got ${(await ba()).blend} and ${(await steps(page)).past - blendSteps} steps`);
    /* The frame repaints just after the change. */
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).mixBlendMode === "multiply", null, { timeout: 4000 }).catch(() => {});
    expect(await blendOn() === "multiply", `the canvas keeps it, got ${await blendOn()}`);
    await release(page);
    await page.keyboard.press("Control+z");
    expect(!(await poll(async () => (await ba()).blend, (v) => !v)), "undo goes back to Normal, past the previews");
    ok("hovering or arrowing through blend modes shows each on the canvas without an undo step; Escape restores; a click keeps one as a single step");

    /* Copy and paste style: Alpha's size tokens land on Gamma. Select all
       of a kind: every Button in the frame. */
    await page.evaluate(() => window.__builder.select(["ba"]));
    await release(page);
    const alpha = (await free()).root.children.find((c) => c.id === "ba");
    expect(alpha.style.fw && alpha.style.fh, `Alpha carries its own size to copy, got ${JSON.stringify(alpha.style)}`);
    await page.keyboard.press("Control+Alt+KeyC");
    await page.evaluate(() => window.__builder.select(["hc"]));
    const gammaBefore = (await free()).root.children.find((c) => c.id === "hc");
    const stepsP = (await steps(page)).past;
    await page.keyboard.press("Control+Alt+KeyV");
    const gamma = await poll(async () => (await free()).root.children.find((c) => c.id === "hc"), (n) => n.style.fw === alpha.style.fw);
    expect(gamma.style.fw === alpha.style.fw && gamma.style.fh === alpha.style.fh && gamma.style.x === gammaBefore.style.x && gamma.style.y === gammaBefore.style.y, `paste style gives Gamma Alpha's size and leaves its position, got ${JSON.stringify(gamma.style)} from ${JSON.stringify(gammaBefore.style)}`);
    expect((await steps(page)).past === stepsP + 1, "as one undo step");
    await page.evaluate(() => window.__builder.select(["bb"]));
    const buttons = (await free()).root.children.filter((c) => c.type === "Button").length;
    await page.locator('.bd-layer[data-layer="bb"]').click({ button: "right" });
    await page.waitForSelector(".bd-ctx");
    await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Select all Buttons/ }).click();
    const picked2 = await poll(() => page.evaluate(() => window.__builder.selection()), (s) => s.length === buttons);
    expect(picked2.length === buttons && buttons >= 3, `Select all Buttons picks the frame's ${buttons} Buttons, got ${picked2.length}`);
    ok(`Ctrl+Alt+C / V carry a style between layers; Select all Buttons picks ${buttons}`);
    await page.close();
  });

  await step("Page links: a Button links to another page, the code gets a relative address, Play follows it and comes back", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    /* A second page, About, with a Heading on it. */
    const aboutId = await page.evaluate(async () => {
      await window.__builder.flush();
      const d = { frames: [{ id: "abf", name: "About screen", width: 1280, height: 800, root: { id: "root", type: "Root", children: [{ id: "ah", type: "Heading", props: { children: "About us" }, style: {} }] } }], active: "abf" };
      const got = await window.__builder.store.addPage(window.__builder.project().id, "About", d, null);
      return got.page.id;
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => window.__builder && window.__builder.project().pages && window.__builder.project().pages.length === 2);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-type="FeatureGridBlock"]'));
    const grid = findIn((await saved()).frames[0].root, "FeatureGridBlock");
    await page.evaluate(([id, to]) => window.__builder.edit(id, "items", [
      { title: "Fired twice", description: "A second firing makes the glaze hard enough for the dishwasher.", href: "#page:" + to, linkLabel: "About us" },
      { title: "Repairable", description: "Chips and cracks are mended free for the first five years." },
      { title: "Made nearby", description: "Every piece comes from a workshop within a day's drive." }]), [grid.id, aboutId]);
    expect(findIn((await saved()).frames[0].root, "FeatureGridBlock").props.items[0].href === "#page:" + aboutId, "the first feature's href names the About page");
    expect(await page.evaluate(() => { const c = window.DovetailBuilderData.components; return ["Link", "Card"].every((n) => c[n] && c[n].props.some((p) => p.name === "href" && p.kind === "url")); }), "Link and Card offer an href the builder sets");
    await page.evaluate((id) => window.__builder.select([id]), grid.id);
    await page.waitForFunction(() => /FeatureGridBlock/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Content");
    const linkField = page.locator(".bd-right .bd-link").first();
    await linkField.waitFor();
    expect(/About/.test(await linkField.locator(".bd-dd-label").first().textContent()), "the item's Link to shows About");
    await linkField.locator(".bd-dd").first().click();
    const linkOpts = await page.locator(".bd-dd-opt .bd-dd-opt-label").allTextContents();
    await page.keyboard.press("Escape");
    expect(linkOpts.includes("None") && linkOpts.includes("A web address") && linkOpts.includes("Page 1") && linkOpts.includes("About"), `Link to offers none, a web address and each page, got ${linkOpts}`);
    ok("a url prop is a Link to control: None, a web address, or one of the project's pages");

    await page.evaluate(() => window.__builder.select([]));
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(code.includes('"./about.html"') && !code.includes("#page:"), `the code writes the page as a relative address, got ${(code.match(/href[=:] ?"[^"]*"/g) || []).join(" ")}`);
    ok("the exported code links to ./about.html");

    await page.locator("[aria-label='Play']").first().click();
    await page.locator(".bd-play[open]").waitFor();
    const play = page.frameLocator(".bd-play iframe");
    await play.locator('a[href="#page:' + aboutId + '"]').first().waitFor();
    expect(/Page 1 › /.test(await page.locator("#bd-play-title").textContent()), "Play names the page and the frame");
    await play.locator('a[href="#page:' + aboutId + '"]').first().click();
    await page.waitForFunction(() => /About › About screen/.test(document.querySelector("#bd-play-title")?.textContent || ""));
    await page.waitForFunction(() => { const i = document.querySelector(".bd-play iframe"); const d = i && i.contentDocument; return !!(d && d.body && /About us/.test(d.body.textContent) && !/autumn collection/i.test(d.body.textContent)); });
    const onAbout = await poll(() => page.evaluate(() => window.__builder.project().page), (v) => v === aboutId);
    expect(onAbout === aboutId, `the project is on About while Play shows it, got ${onAbout}`);
    await page.locator(".bd-play-back").click();
    await page.waitForFunction(() => /Page 1 › /.test(document.querySelector("#bd-play-title")?.textContent || ""));
    expect(await page.locator(".bd-play-back").count() === 0, "Back returns to Page 1 and there's nothing further back");
    /* Page 1's frame is rendered afresh after Back: wait for it to settle before following the link again. */
    await page.waitForFunction((id) => { const i = document.querySelector(".bd-play iframe"); const d = i && i.contentDocument; return !!(d && d.body && /autumn collection/i.test(d.body.textContent) && d.querySelector('a[href="#page:' + id + '"]')); }, aboutId);
    await page.waitForTimeout(600);
    await play.locator('a[href="#page:' + aboutId + '"]').first().click();
    await page.waitForFunction(() => /About › /.test(document.querySelector("#bd-play-title")?.textContent || ""));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-play"));
    const after = await poll(() => page.evaluate(() => window.__builder.project().page), (v) => v && v !== aboutId);
    expect(after && after !== aboutId, `closing Play goes back to the page it started on, got ${after}`);
    ok("in Play the link opens About with its own frame, Back retraces, and closing Play returns to the first page");
    await page.close();
  });

  await step("Instances: what's added from My components stays linked; Update component carries a change to every instance, on this page and the next, keeping their own edits; Reset, Detach and Delete", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    const instances = (d, cid) => { const out = []; d.frames.forEach((f) => (function w(x) { (x.children || []).forEach((c) => { if (c.inst && c.inst.of === cid) out.push(c); w(c); }); })(f.root)); return out; };
    const byId = (d, id) => { let hit = null; d.frames.forEach((f) => (function w(x) { (x.children || []).forEach((c) => { if (c.id === id) hit = c; w(c); }); })(f.root)); return hit; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    /* The Button gets a radius token, so it can become a component. */
    const btn = findIn((await saved()).frames[0].root, "Button");
    await page.evaluate(async (id) => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      (function w(x) { (x.children || []).forEach((c) => { if (c.id === id) c.style.radius = "control"; w(c); }); })(d.frames[0].root);
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    }, btn.id);
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-type="Button"]'));
    await page.evaluate((id) => window.__builder.select([id]), btn.id);
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator(".bd-inspect-head .bd-layer-menu").click();
    await option(page, "Create component").click();
    await page.locator(".bd-comp-dlg[open]").waitFor();
    await page.locator(".bd-comp-status.is-ready").waitFor();
    await page.locator(".bd-comp-name").fill("Shop button");
    await page.locator(".bd-comp-dlg .bd-btn-primary").click();
    await page.waitForFunction(() => !document.querySelector(".bd-comp-dlg[open]"));
    const comp = await poll(() => page.evaluate(() => (JSON.parse(JSON.stringify(window.__builder.library() || {})).components || [])[0]), (c) => c && c.name === "Shop button");
    expect(comp && comp.name === "Shop button" && comp.rev === 1, `the component starts at revision 1, got ${JSON.stringify(comp && { name: comp.name, rev: comp.rev })}`);
    const a0 = await poll(async () => byId(await saved(), btn.id), (n) => n && n.inst);
    expect(a0 && a0.inst && a0.inst.of === comp.id && a0.inst.rev === 1, `what it was made from is its first instance, got ${JSON.stringify(a0 && a0.inst)}`);
    await page.locator(".bd-inst").waitFor();
    expect(/Instance of\s*Shop button/.test(await page.locator(".bd-inst").textContent()), "the inspector says which component it's an instance of");
    ok("Create component links its source as the first instance, and the inspector says so");

    /* A second page carrying an instance of its own. */
    const twoId = await page.evaluate(async (cid) => {
      await window.__builder.flush();
      const lib = window.__builder.library();
      const c = lib.components.find((x) => x.id === cid);
      const node = JSON.parse(JSON.stringify(c.node));
      node.id = "i2"; node.inst = { of: cid, rev: 1 };
      const d = { frames: [{ id: "twof", name: "Two", width: 1280, height: 800, root: { id: "root", type: "Root", children: [node] } }], active: "twof" };
      const got = await window.__builder.store.addPage(window.__builder.project().id, "Two", d, null);
      return got.page.id;
    }, comp.id);
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => window.__builder && window.__builder.project().pages && window.__builder.project().pages.length === 2);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-type="Button"]'));

    /* Two more instances from My components. */
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-assets [data-asset-kind="components"]').click();
    await page.locator(".bd-cat", { hasText: "My components" }).click();
    await page.locator(".bd-mine-btn", { hasText: "Shop button" }).click();
    await poll(async () => instances(await saved(), comp.id), (l) => l.length === 2);
    await page.locator(".bd-mine-btn", { hasText: "Shop button" }).click();
    const three = await poll(async () => instances(await saved(), comp.id), (l) => l.length === 3);
    expect(three.length === 3 && three.every((n) => n.inst.rev === 1), `two added from My components make three instances, got ${three.length}`);
    const others = three.filter((n) => n.id !== btn.id);
    const bId = others[0].id, cId = others[1].id;
    await page.evaluate(([id, v]) => window.__builder.edit(id, "children", v), [cId, "Browse"]);
    await page.evaluate(([id, v]) => window.__builder.edit(id, "children", v), [btn.id, "Shop now"]);
    await poll(async () => byId(await saved(), btn.id), (n) => n && n.props.children === "Shop now");
    await page.evaluate((id) => window.__builder.select([id]), btn.id);
    await page.locator(".bd-inst-menu").waitFor();
    await page.locator(".bd-inst-menu").click();
    await option(page, "Update component from this").click();
    const after = await poll(() => saved(), (d) => byId(d, bId).props.children === "Shop now" && byId(d, cId).inst.rev === 2);
    expect(byId(after, bId).props.children === "Shop now" && byId(after, bId).inst.rev === 2, `the untouched instance follows the update, got ${JSON.stringify(byId(after, bId).props)} rev ${byId(after, bId).inst.rev}`);
    expect(byId(after, cId).props.children === "Browse" && byId(after, cId).inst.rev === 2, `the instance with its own text keeps it, got ${JSON.stringify(byId(after, cId).props)}`);
    expect(byId(after, btn.id).inst.rev === 2, "the source is on the new revision too");
    const lib2 = await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.library())));
    expect(lib2.components[0].rev === 2 && lib2.components[0].node.props.children === "Shop now" && lib2.components[0].prev.props.children !== "Shop now", `the library holds revision 2 and the one before, got rev ${lib2.components[0].rev}`);
    const two = await poll(() => page.evaluate((pid) => window.__builder.store.loadDoc(window.__builder.project().id, pid), twoId), (d) => d && d.frames[0].root.children[0].props.children === "Shop now");
    expect(two && two.frames[0].root.children[0].props.children === "Shop now" && two.frames[0].root.children[0].inst.rev === 2, `the other page's instance is updated as it's saved, got ${JSON.stringify(two && two.frames[0].root.children[0].props)}`);
    ok("Update component from this: the other instances on the page and on page Two follow, and one's own text survives");

    await page.evaluate((id) => window.__builder.select([id]), cId);
    await page.locator(".bd-inst-menu").waitFor();
    await page.locator(".bd-inst-menu").click();
    await option(page, "Reset to Shop button").click();
    const reset = await poll(async () => byId(await saved(), cId), (n) => n && n.props.children === "Shop now");
    expect(reset.props.children === "Shop now" && reset.inst && reset.inst.rev === 2, `Reset puts the instance back to the component, got ${JSON.stringify(reset.props)}`);
    await page.evaluate((id) => window.__builder.select([id]), bId);
    await page.locator(".bd-inst-menu").waitFor();
    await page.locator(".bd-inst-menu").click();
    await option(page, "Detach from component").click();
    const loose = await poll(async () => byId(await saved(), bId), (n) => n && !n.inst);
    expect(loose && !loose.inst, "Detach takes the link off");
    await page.waitForFunction(() => !document.querySelector(".bd-inst"));
    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-layer.is-instance").length === 2);
    await page.evaluate((id) => window.__builder.select([id]), btn.id);
    await page.waitForFunction(() => document.querySelectorAll(".bd-mark-sel.is-instance").length === 1);
    ok("Reset and Detach work; instances show in Layers and with their own outline on the canvas");

    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    /* Assets is still on Components › My components from before. */
    if (await page.locator('.bd-assets [data-asset-kind="components"]').count()) await page.locator('.bd-assets [data-asset-kind="components"]').click();
    if ((await page.locator(".bd-cat[aria-pressed='true']", { hasText: "My components" }).count()) === 0) await page.locator(".bd-cat", { hasText: "My components" }).click();
    await page.locator(".bd-mine-item .bd-dd-icon button, .bd-mine-item button.bd-dd-icon").first().click();
    await option(page, "Delete").click();
    const gone = await poll(async () => instances(await saved(), comp.id), (l) => l.length === 0);
    expect(gone.length === 0 && (await saved()).frames[0].root.children.length === after.frames[0].root.children.length, "deleting the component detaches its instances and keeps them on the page");
    ok("Delete in My components leaves the instances as plain layers");
    await page.close();
  });

  await step("Page column: the frame's page width and gutter re-point every Section and page-width Group; Group gaps take layout layers; a band's spacing per edge and bleed; a section padding sets the gutter at its sides", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    /* A Group set to the page width with a section padding, and three
       children spaced by the block layer, on top of the starter page. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      d.frames[0].root.children.unshift({ id: "pgcol", type: "Group", name: "Column", props: { direction: "column", gap: "block" }, style: { w: "default", padding: "module" },
        children: ["a", "b", "c"].map((k) => ({ id: "pgt" + k, type: "Text", props: { children: "Line " + k }, style: {} })) });
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    const fr = () => frames(page)[0];
    await fr().waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="pgcol"] > div') && document.querySelector('[data-bf-type="HeroBlock"] section'));
    const measure = () => fr().evaluate(() => {
      const g = getComputedStyle(document.querySelector('[data-bf-id="pgcol"] > div'));
      const sec = document.querySelector('[data-bf-type="HeroBlock"] section');
      const col = getComputedStyle(sec.firstElementChild.tagName === "IMG" ? sec.querySelector(":scope > div:last-child") : sec.firstElementChild);
      return { gMax: g.maxWidth, gGap: g.rowGap, gPadX: g.paddingLeft, gPadY: g.paddingTop, colMax: col.maxWidth, colPad: col.paddingLeft, secTop: getComputedStyle(sec).paddingTop };
    });
    const m0 = await measure();
    expect(m0.gMax === "1280px" && m0.colMax === "1280px", `a page-width Group and a Section's column both read --dt-layout-page-width, got ${m0.gMax} and ${m0.colMax}`);
    expect(m0.gGap === "32px", `a Group gap of block is --dt-layout-stack-block, 32px at balanced, got ${m0.gGap}`);
    expect(m0.gPadY === "96px" && m0.gPadX === "24px", `a section padding is module padding above and below and the page gutter at the sides, got ${m0.gPadY} by ${m0.gPadX}`);
    ok(`a page-width Group and a Section share the ${m0.gMax} column; Group gap block is ${m0.gGap}; section padding is ${m0.gPadY} by ${m0.gPadX}`);

    await page.locator(".bd-flabel.is-current .bd-flabel-btn").click();
    await page.waitForFunction(() => /Landing/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Layout");
    await page.locator('.bd-right .bd-dd[aria-labelledby^="bd-pg-width "]').click();
    await option(page, /^Narrow$/).click();
    await poll(async () => (await saved()).frames[0].pageWidth, (v) => v === "narrow");
    await page.locator('.bd-right .bd-dd[aria-labelledby^="bd-pg-gutter "]').click();
    await option(page, /^None$/).click();
    await poll(async () => (await saved()).frames[0].gutter, (v) => v === "none");
    await page.locator('.bd-right .bd-dd[aria-labelledby^="bd-pg-char "]').click();
    await option(page, /^Tight$/).click();
    const m1 = await poll(measure, (m) => m.gMax === "768px" && m.colPad === "0px" && m.gGap === "16px");
    expect(m1.gMax === "768px" && m1.colMax === "768px", `Page width Narrow re-points the column for the Group and the Section, got ${m1.gMax} and ${m1.colMax}`);
    expect(m1.colPad === "0px", `Page gutter None takes the Section's side room off, got ${m1.colPad}`);
    expect(m1.gGap === "16px", `the block layer follows the layout character, 16px at tight, got ${m1.gGap}`);
    ok(`the frame's Page width and Page gutter re-point the column (${m1.gMax}) and gutter (${m1.colPad}); a tight page moves the Group's layer gap to ${m1.gGap}`);

    const hero = findIn((await saved()).frames[0].root, "HeroBlock");
    await page.evaluate((id) => window.__builder.select([id]), hero.id);
    await page.waitForFunction(() => /HeroBlock/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Properties");
    const fields = await page.$$eval(".bd-right .bd-field-label", (l) => l.map((x) => x.textContent.trim()));
    expect(fields.some((f) => /Spacing top/i.test(f)) && fields.some((f) => /Spacing bottom/i.test(f)) && fields.some((f) => /Bleed/i.test(f)), `a block's Properties tab offers Spacing top, Spacing bottom and Bleed, under Arrangement, got ${fields.join(", ")}`);
    await page.evaluate((id) => window.__builder.edit(id, "spacingTop", "xl"), hero.id);
    const m2 = await poll(measure, (m) => m.secTop === "128px");
    expect(m2.secTop === "128px", `spacingTop xl is --dt-layout-module-padding-xl, 128px at tight, got ${m2.secTop}`);
    await page.evaluate((id) => window.__builder.edit(id, "bleed", "inset"), hero.id);
    const inset = await poll(() => fr().evaluate(() => { const s = document.querySelector('[data-bf-type="HeroBlock"] section'); const b = s && s.firstElementChild; return b ? getComputedStyle(b).borderTopLeftRadius : ""; }), (v) => v && v !== "0px");
    expect(inset && inset !== "0px", `bleed inset rounds the band with the container radius, got ${inset}`);
    ok("a block's Layout tab has Spacing top, Spacing bottom and Bleed; spacingTop xl and bleed inset reach the canvas");

    await page.evaluate(() => window.__builder.select([]));
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(code.includes('"--dt-layout-page-width": "var(--dt-layout-page-width-narrow)"') && code.includes('"--dt-layout-page-gutter": "0"') && code.includes('spacingTop="xl"') && code.includes('bleed="inset"') && code.includes("var(--dt-layout-stack-block)"), `the code carries the page's column and gutter, the band's spacing and bleed, and the layer gap, got ${(code.match(/--dt-layout[\w-]*|spacingTop="\w+"|bleed="\w+"/g) || []).join(" ")}`);
    ok("the exported code carries the page column, gutter, band spacing, bleed and layer gap");
    await page.close();
  });

  await step("Scoping: each layer is offered only the sizes and spacing that suit it, on the right axis, in the inspector, the Variables panel and when resized", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    /* A band at the top of the page holding a Text and a Button. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      d.frames[0].root.children.unshift({ id: "scg", type: "Group", name: "Band", props: { direction: "column", gap: "group" }, style: { padding: "module" },
        children: [{ id: "sct", type: "Text", props: { children: "Scoped text" }, style: {} }, { id: "scb", type: "Button", props: { children: "Scoped button" }, style: {} }] });
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="sct"]'));
    const listOf = async (locator) => { await locator.click(); const l = await page.locator(".bd-dd-opt .bd-dd-opt-label").allTextContents(); await page.keyboard.press("Escape"); return l; };
    const selectOne = async (id, title) => { await page.evaluate((x) => window.__builder.select([x]), id); await page.waitForFunction((t) => new RegExp(t).test(document.querySelector(".bd-inspect-title")?.textContent || ""), title); await tab(page, "Layout"); };

    await selectOne("sct", "Text");
    const tw = await listOf(dd(page, "Width")), th = await listOf(dd(page, "Height"));
    const tpad = await listOf(page.locator(".bd-box-p > .bd-box-all"));
    expect(!tw.concat(th).some((l) => /^(control|icon|avatar|touch)/.test(l)), `a Text is offered no component sizes, got ${tw.concat(th).filter((l) => /control|icon|avatar|touch/.test(l)).join(", ")}`);
    expect(tw.includes("page") && !th.some((l) => /^page/.test(l)), `a page width is offered for width, never height, got width ${tw.filter((l) => /page/.test(l))} height ${th.filter((l) => /page/.test(l))}`);
    expect(!tpad.some((l) => /^(section|layout|module|page gutter)/.test(l)), `a Text's padding offers no section padding or layout layers, got ${tpad.join(", ")}`);
    ok(`a Text is offered ${tw.length - 1} widths and ${th.length - 1} heights, none of them a component size, and no section padding`);

    await selectOne("scb", "Button");
    const bw = await listOf(dd(page, "Width"));
    expect(bw.some((l) => /^control-md$/.test(l)), `a Button is offered the control sizes, got ${bw.join(", ")}`);
    await selectOne("scg", "Band");
    const gpad = await listOf(page.locator(".bd-box-p > .bd-box-all"));
    const gleft = await listOf(page.locator(".bd-box-p > .bd-box-cell.is-left .bd-dd"));
    expect(gpad.some((l) => /^section lg$/.test(l)) && gpad.some((l) => /^layout block$/.test(l)), `a band's padding offers section padding and the layout layers, got ${gpad.join(", ")}`);
    expect(gleft.includes("page gutter") && !gleft.some((l) => /^module (sm|lg|xl)$|^module padding$/.test(l)), `a side offers the gutter and never a module step, got ${gleft.join(", ")}`);
    ok("a Button gets control sizes; a band gets section padding and layers, and its sides the page gutter but no module step");

    await selectOne("sct", "Text");
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click().catch(() => {});
    await page.locator('.bd-assets [data-asset-kind="variables"]').click();
    const vw = await page.locator(".bd-vars-sec", { hasText: "Width" }).locator(".bd-var-name").allTextContents();
    const vp = await page.locator(".bd-vars-sec", { hasText: "Padding" }).locator(".bd-var-name").allTextContents();
    expect(vw.length && !vw.some((l) => /^(control|icon|avatar|touch|artboard)/.test(l)) && !vp.some((l) => /^(section|layout|module)/.test(l)), `the Variables panel offers a Text what suits it, got widths ${vw.join(", ")} and padding ${vp.join(", ")}`);
    ok(`with a Text selected, Variables offers ${vw.length} widths and ${vp.length} paddings that suit it`);

    await page.waitForSelector(".bd-mark-sel .bd-handle.is-s");
    const hb = await page.locator(".bd-mark-sel .bd-handle.is-s").boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 6, { steps: 3 });
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + 14, { steps: 4 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    const sized = await poll(async () => (await saved()).frames[0].root.children[0].children[0].style.height, (v) => !!v);
    expect(sized && !/^(control|icon|avatar|touch|artboard)/.test(sized), `resizing a Text snaps to a size that suits it, got ${sized}`);
    ok(`resizing a Text snaps its height to ${sized}, not a component size`);
    await page.close();
  });

  await step("Own padding: a component that pads itself names that as its default, in the box model and in Variables, and nowhere else", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      d.frames[0].root.children.unshift({ id: "opc", type: "Card", props: { title: "Own padding" }, style: { padding: "lg" } }, { id: "opt", type: "Text", props: { children: "No padding of its own" }, style: {} });
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(400);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="opc"]'));
    const listOf = async (locator) => { await locator.click(); const l = await page.locator(".bd-dd-opt .bd-dd-opt-label").allTextContents(); await page.keyboard.press("Escape"); return l; };
    const selectOne = async (id, title) => { await page.evaluate((x) => window.__builder.select([x]), id); await page.waitForFunction((t) => new RegExp(t).test(document.querySelector(".bd-inspect-title")?.textContent || ""), title); await tab(page, "Layout"); };

    await selectOne("opc", "Card");
    const cardPad = await listOf(page.locator(".bd-box-p > .bd-box-all"));
    expect(cardPad[0] === "Default: card padding", `a Card's padding names its own as the default, got ${cardPad[0]}`);
    await selectOne("opt", "Text");
    const textPad = await listOf(page.locator(".bd-box-p > .bd-box-all"));
    expect(!textPad.some((l) => /card padding|Default:/.test(l)), `a Text never sees the card's padding, got ${textPad[0]}`);
    ok("a Card's padding list starts with its own card padding as the default; a Text's doesn't");

    await selectOne("opc", "Card");
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click().catch(() => {});
    await page.locator('.bd-assets [data-asset-kind="variables"]').click();
    const own = page.locator(".bd-vars-sec", { hasText: "Padding" }).locator(".bd-var-own");
    expect(await own.count() === 1 && /card padding/.test(await own.textContent()), "Variables offers the Card's own padding as its default");
    await own.click();
    const card = await poll(async () => (await saved()).frames[0].root.children.find((c) => c.id === "opc"), (c) => c && !c.style.padding);
    expect(card && !card.style.padding, `pressing it clears Padding so the card's own applies, got ${JSON.stringify(card && card.style)}`);
    await page.evaluate(() => window.__builder.select(["opt"]));
    await page.waitForTimeout(200);
    expect(await page.locator(".bd-vars-sec", { hasText: "Padding" }).locator(".bd-var-own").count() === 0, "with a Text selected, Variables offers no component's padding");
    ok("Variables offers the Card's own padding as its default, which clears Padding; a Text gets none");

    /* The box shows what the Card really has: its own card padding, in
       grey, with where it comes from. A drag steps a side, Shift makes it
       every side, Alt-click clears it, and Up steps it by keyboard. */
    await selectOne("opc", "Card");
    const cell = (where) => page.locator(`.bd-box-p > .bd-box-cell.is-${where} .bd-dd`);
    const drawnPad = await frames(page)[0].evaluate(() => window.BuilderFrame.spacing("opc").paddingTop);
    expect(drawnPad > 0, `the Card is drawn with padding, got ${drawnPad}`);
    await page.waitForFunction((px) => document.querySelector(".bd-box-p > .bd-box-cell.is-top .bd-dd-label")?.textContent === String(px), drawnPad);
    const topCell = cell("top");
    expect(await topCell.evaluate((b) => b.classList.contains("is-inherited")) && /card padding \(--dt-card-padding\)/.test(await topCell.getAttribute("title")), `the unset top side shows ${drawnPad} in grey, from the card padding token, got title ${await topCell.getAttribute("title")}`);
    const opcStyle = async () => (await page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())))).frames[0].root.children.find((c) => c.id === "opc").style;
    const stepsBefore = (await steps(page)).past;
    const tb = await topCell.boundingBox();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width / 2 + 40, tb.y + tb.height / 2, { steps: 6 });
    await page.mouse.up();
    const afterDrag = await poll(opcStyle, (st) => !!st.paddingTop);
    expect(afterDrag.paddingTop && !afterDrag.padding && (await steps(page)).past === stepsBefore + 1, `a drag on the top side sets paddingTop alone, as one undo step, got ${JSON.stringify(afterDrag)} and ${(await steps(page)).past - stepsBefore} steps`);
    expect(!(await cell("top").evaluate((b) => b.classList.contains("is-inherited"))), "a side that's set reads in full ink");
    expect(await page.locator(".bd-dd-list").count() === 0, "a drag doesn't open the list");
    const lb = await cell("left").boundingBox();
    await page.keyboard.down("Shift");
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.move(lb.x + lb.width / 2 + 30, lb.y + lb.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
    const afterShift = await poll(opcStyle, (st) => !!st.padding && !st.paddingTop);
    expect(afterShift.padding && !afterShift.paddingTop && !afterShift.paddingLeft, `Shift-drag sets padding on every side and clears the single sides, got ${JSON.stringify(afterShift)}`);
    await page.keyboard.down("Alt");
    await page.locator(".bd-box-p > .bd-box-all").click();
    await page.keyboard.up("Alt");
    const cleared = await poll(opcStyle, (st) => !st.padding);
    expect(!cleared.padding && await page.locator(".bd-dd-list").count() === 0, `Alt-click on Padding clears every side without opening the list, got ${JSON.stringify(cleared)}`);
    /* Once the frame draws the Card's own padding again and the box shows
       the cleared side in grey with that size: the inspector re-renders on
       the frame's redraw, and Up before then has stale steps to step. */
    await page.waitForSelector(".bd-box-p > .bd-box-cell.is-right .bd-dd.is-inherited");
    await frames(page)[0].waitForFunction((px) => window.BuilderFrame.spacing("opc").paddingRight === px, drawnPad);
    await page.waitForFunction((px) => document.querySelector(".bd-box-p > .bd-box-cell.is-right .bd-dd-label")?.textContent === String(px), drawnPad);
    await cell("right").focus();
    await page.keyboard.press("ArrowUp");
    const stepped = await poll(opcStyle, (st) => !!st.paddingRight);
    /* The size the inspector gives the token; a module token can draw
       smaller inside a Card than at the frame's root. */
    const rightPx = Number(await cell("right").locator(".bd-dd-label").textContent());
    expect(rightPx > drawnPad, `Up on the right side steps up from the ${drawnPad}px it had, got ${stepped.paddingRight} (${rightPx}px)`);
    await page.keyboard.down("Alt");
    await cell("right").click();
    await page.keyboard.up("Alt");
    expect(!(await poll(opcStyle, (st) => !st.paddingRight)).paddingRight, "Alt-click on a side clears it");
    ok(`the box shows the Card's own ${drawnPad}px in grey from --dt-card-padding; a drag sets one side in one undo step, Shift-drag every side, Up steps a side from what it had, and Alt-click clears`);
    await page.close();
  });

  await step("Playground: a first visit makes it on Home and opens Start here; its pages and examples open whole; New adds a fresh copy; a reload adds none", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 }, { playground: true });
    const proj = () => page.evaluate(() => window.__builder.project());
    const groups = () => page.evaluate(() => window.__builder.store.listGroups().then((gs) => gs.map((g) => g.name + ":" + (g.kind || ""))));
    const pageNames = () => page.locator(".bd-pages .bd-page-name").allTextContents();
    const ready = () => page.waitForFunction(() => { const i = document.querySelector("iframe.bd-frame"); try { return !!(i && i.contentWindow.BuilderFrame && i.contentDocument.querySelector("[data-bf-id=root]")); } catch (err) { return false; } });
    const openHome = async () => { await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click(); await page.locator(".bd-home .bd-proj").first().waitFor(); };

    const start = await proj();
    expect(start.name === "Start here" && !!start.group, `a first visit opens Start here, in a project, got ${start.name}`);
    expect((await groups()).join() === "Playground:playground", `there's one Playground, got ${await groups()}`);
    await frame().waitForSelector('[data-bf-type="Heading"]');
    expect(/Welcome to the builder/.test(await frame().evaluate(() => document.body.innerText)), "Start here opens on its Welcome page");
    await page.locator(".bd-rail .bd-tab", { hasText: "Pages" }).click();
    expect((await pageNames()).join() === "Welcome,Style a card,Lay out a row,Freeform and structured,Light, dark and themes,Use the components,Keys worth knowing", `Start here has its seven pages, got ${await pageNames()}`);
    ok("a first visit makes the Playground and opens Start here on Welcome, with its seven pages");

    await page.locator(".bd-page", { hasText: "Freeform and structured" }).first().locator(".bd-page-open").click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await ready();
    const kinds = await page.evaluate(() => window.__builder.doc().frames.map((f) => f.name + ":" + f.mode));
    expect(kinds.join() === "Freeform:free,Structured:structured", `the page shows a freeform and a structured frame, got ${kinds}`);
    ok("Freeform and structured shows one frame of each kind");

    await openHome();
    await homeCard(page, "Playground").locator(".bd-proj-open").click();
    await page.waitForFunction(() => document.querySelector(".bd-home-title")?.textContent === "Playground");
    const files = await page.locator(".bd-home .bd-proj-name").allTextContents();
    expect(files[0] === "Start here" && files.filter((f) => f.startsWith("Example: ")).length === 6, `the Playground holds Start here and six examples, got ${files}`);
    await homeCard(page, "Example: Builder screens").locator(".bd-proj-open").click();
    await page.waitForFunction(() => window.__builder.project().name === "Example: Builder screens");
    await ready();
    const ws = await page.evaluate(() => { const f = window.__builder.doc().frames[0]; return { name: f.name, dark: f.dark, mode: f.mode, n: f.root.children.length }; });
    expect(ws.name === "Workspace" && ws.dark && ws.mode === "free" && ws.n >= 6, `Builder screens opens a dark freeform Workspace of positioned panels, got ${JSON.stringify(ws)}`);
    ok("the Playground lists Start here first, then six examples; Builder screens opens a dark freeform frame of positioned panels");

    await openHome();
    await page.locator(".bd-home-crumbs .bd-crumb", { hasText: "Home" }).click().catch(() => {});
    await homeNew(page, "Playground");
    await page.waitForFunction(() => document.querySelector(".bd-home-title")?.textContent === "Playground");
    expect((await groups()).length === 2, "New, then Playground, adds a fresh copy");
    await page.reload();
    await page.waitForFunction(() => !!window.__builder);
    expect((await groups()).length === 2, "a reload adds no more");
    ok("New, then Playground, adds a fresh copy and shows it on Home; a reload adds none");
    await page.close();
  });

  await step("Exports compile: the code for every Playground page, and a structured page of Groups, Sections, Cards, slots and a Carousel, type-checks against @dovetail-ds/react", async () => {
    if (!hasReactTypes()) { say("  skip  @types/react is not installed, so tsc can't check the exported code"); return; }
    const { page } = await open({ width: 1440, height: 900 }, { playground: true });
    /* A first visit makes the Playground: Start here and six examples. */
    await page.waitForFunction(() => window.__builder.store.listGroups().then((gs) => { const g = gs.find((x) => x.kind === "playground"); return !!g && window.__builder.store.listProjects().then((ps) => ps.filter((p) => p.group === g.id).length >= 7); }), null, { polling: 200 });
    /* Each file's pages are read from the store and exported the way Export
       does it: the frame's jsx(), with links to pages made relative. */
    const exported = await page.evaluate(async () => {
      const store = window.__builder.store;
      const F = document.querySelector("iframe.bd-frame").contentWindow.BuilderFrame;
      const g = (await store.listGroups()).find((x) => x.kind === "playground");
      const files = (await store.listProjects()).filter((p) => p.group === g.id).sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
      const out = [];
      for (const meta of files) {
        const pages = meta.pages && meta.pages.length ? meta.pages : [{ id: "main", name: "Page 1" }];
        const links = {};
        pages.forEach((p, i) => { links[p.id] = i === 0 ? "./index.html" : "./" + (p.name || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + ".html"; });
        const relink = (tree) => JSON.parse(JSON.stringify(tree), (k, v) => { const m = typeof v === "string" ? /^#page:([\w-]+)$/.exec(v) : null; return m ? links[m[1]] : v; });
        for (const pg of pages) {
          const doc = await store.loadDoc(meta.id, pg.id);
          for (const fr of (doc && doc.frames) || []) out.push({ where: `${meta.name} / ${pg.name} / ${fr.name}`, code: F.jsx({ page: Object.assign({}, fr, { bare: !!fr.bare }), root: relink(fr.root) }, fr.name) });
        }
      }
      /* A structured page with one of each part the exporter writes
         differently: Groups, a Section, Cards with a slot, a block with two
         slots, and a Carousel of Covers. Then a selection's code. */
      let n = 0;
      const node = (type, props, children, style) => ({ id: "x" + ++n, type, props: props || {}, style: style || {}, children: children || [] });
      const slot = (name, children) => node("Slot", { name }, children);
      const card = node("Card", { eyebrow: "Starter", title: "Free", description: "For one person." }, [node("Text", { children: "Three projects." }), slot("footer", [node("Button", { children: "Start", variant: "primary" })])]);
      const children = [
        node("Section", { width: "default" }, [
          node("Group", { direction: "column", gap: "lg" }, [
            node("Heading", { children: "Plans", level: 2 }),
            node("Group", { direction: "row", gap: "md" }, [
              card,
              node("Card", { title: "Team", description: "For a studio." }, [slot("footer", [node("Button", { children: "Talk to us", variant: "secondary" }), node("Link", { children: "Compare", href: "./index.html" })])]),
            ]),
            node("Carousel", { label: "Work" }, [node("Cover", { title: "One" }), node("Cover", { title: "Two" }), node("Cover", { title: "Three" })]),
          ]),
        ]),
        node("HeroBlock", { title: "Made to order", lead: "Small batches." }, [slot("actions", [node("Button", { children: "Shop" }), node("Button", { children: "Read more", variant: "ghost" })]), slot("media", [node("Image", { src: "https://example.com/a.jpg", alt: "A bowl" })])]),
      ];
      const fr = { id: "fs", name: "Structured parts", mode: "structured", width: 1440, height: 900 };
      out.push({ where: "Structured parts / whole frame", code: F.jsx({ page: fr, root: { id: "root", type: "Root", props: {}, style: {}, children } }, fr.name) });
      out.push({ where: "Structured parts / two layers selected", code: F.jsxNodes(children, fr.name + " parts") });
      out.push({ where: "Structured parts / one Card selected", code: F.jsxNodes([card], "Card") });
      return out;
    });
    /* My components, through the Export dialog as a person gets them: a
       component inside a component, three instances (one with its texts
       changed), and a placed one on a freeform frame. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const m = window.__builder.project();
      const scope = m.group ? "g:" + m.group : m.lib === "shared" ? "shared" : "f:" + m.id;
      const n = (id, type, props, children, style, name) => ({ id, type, props: props || {}, children, style: style || {}, ...(name ? { name } : {}) });
      const badge = n("xb0", "Group", { direction: "row" }, [n("xb1", "Badge", { children: "Sale" })], { padding: "xs" });
      const tile = n("xt0", "Group", { direction: "column", gap: "sm" }, [n("xt1", "Heading", { children: "Stoneware mug" }), n("xt2", "Text", { children: "Fern glaze" }, undefined, undefined, "Glaze"), n("xt3", "Button", { children: "Add to cart" }), { ...JSON.parse(JSON.stringify(badge)), id: "xt4", inst: { of: "xbadge", rev: 1 } }], { padding: "md", surface: "raised" });
      const lib = await window.__builder.store.loadLibrary(scope) || {};
      lib.components = [{ id: "xtile", name: "Product card", node: tile, tokens: ["--dt-space-inset-md"], rev: 1, made: 1 }, { id: "xbadge", name: "Sale badge", node: badge, tokens: ["--dt-space-inset-xs"], rev: 1, made: 1 }].concat(lib.components || []);
      await window.__builder.store.saveLibrary(lib, scope);
      const copyOf = (id, extra) => { const c = JSON.parse(JSON.stringify(tile)); let i = 0; (function w(x) { x.id = id + (i++); (x.children || []).forEach(w); })(c); c.inst = { of: "xtile", rev: 1 }; return Object.assign(c, extra || {}); };
      const b = copyOf("xb"); b.children[0].props.children = "Tall jug"; b.children[1].props.children = "Moss glaze";
      const placed = copyOf("xp"); Object.assign(placed.style, { x: 4, y: 4 });
      await window.__builder.store.saveDoc(m.id, { frames: [
        { id: "xf1", name: "Shop", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [n("xs", "Section", {}, [copyOf("xa"), b])] } },
        { id: "xf2", name: "Poster", width: 800, height: 600, mode: "freeform", root: { id: "root2", type: "Root", children: [placed] } },
      ], active: "xf1" });
    });
    await page.reload();
    await page.waitForFunction(() => window.__builder && document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="xa0"]'));
    const viaDialog = async (where) => {
      await page.locator(".bd-export").click();
      await page.locator(".bd-code[open] .bd-code-pre code").waitFor();
      exported.push({ where, code: await page.locator(".bd-code[open] .bd-code-pre code").textContent() });
      await page.keyboard.press("Escape");
    };
    await page.evaluate(() => window.__builder.select([]));
    await viaDialog("My components / Shop");
    await page.evaluate(() => window.__builder.select(["xb0"]));
    await viaDialog("My components / one instance picked");
    await page.locator(".bd-flabel-btn", { hasText: "Poster" }).click();
    await page.evaluate(() => window.__builder.select([]));
    await viaDialog("My components / Poster");
    expect(exported.slice(-3).every((x) => /export function MyProductCard\(/.test(x.code)), "the My components exports carry their component function");
    await page.close();
    expect(exported.length >= 20, `the Playground and the structured page should give at least 20 exports, got ${exported.length}`);
    const notPackage = exported.filter((x) => !/^import \{[^}]+\} from "@dovetail-ds\/react";\n/.test(x.code));
    expect(!notPackage.length, `every export imports from @dovetail-ds/react, these don't: ${notPackage.map((x) => x.where).join(", ")}`);
    /* One file each, named after where it came from, so tsc's lines say. */
    const files = {}, where = {};
    for (const x of exported) {
      const base = "src/" + x.where.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
      let name = base + ".tsx";
      for (let i = 2; files[name]; i++) name = `${base}-${i}.tsx`;
      files[name] = x.code;
      where[name] = x.where;
    }
    /* Its own copy of the package: the behaviour check may rebuild dist/react
       while this runs beside it. */
    fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
    const pkg = fs.mkdtempSync(path.join(ROOT, "dist", ".export-package-"));
    try {
      buildPackage(pkg);
      const { diagnostics } = await typecheck(files, { pkg });
      /* Every line, not just the first a thrown error would show. */
      if (diagnostics.length) {
        const inFiles = new Set(diagnostics.map((d) => d.file));
        fail(`tsc found ${diagnostics.length} error${diagnostics.length === 1 ? "" : "s"} in ${inFiles.size} of ${exported.length} exports:\n` +
          diagnostics.map((d) => (where[d.file] ? `[${where[d.file]}] ` : "") + describeTs(d)).join("\n").replace(/\n/g, "\n        "));
        return;
      }
    } finally {
      fs.rmSync(pkg, { recursive: true, force: true });
    }
    ok(`${exported.length} exports (${exported.length - 6} Playground frames, a structured page, two selections and three with My components) type-check against the package, strict, with react-jsx`);
  });

  await step("Download project code: a .zip of every page, each component in a file of its own, the theme and the pictures, with a README, that type-checks as one project", async () => {
    if (!hasReactTypes()) { say("  skip  @types/react is not installed, so tsc can't check the downloaded code"); return; }
    const { page } = await open({ width: 1440, height: 900 });
    const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    /* Two pages: Home with two instances of Product tile (which holds a Sale
       badge and an uploaded picture) and a link to About us; About us with a
       third instance whose title is changed. */
    await page.evaluate(async (PNG) => {
      await window.__builder.flush();
      const m = window.__builder.project();
      const scope = m.group ? "g:" + m.group : m.lib === "shared" ? "shared" : "f:" + m.id;
      const n = (id, type, props, children, style, name) => ({ id, type, props: props || {}, children, style: style || {}, ...(name ? { name } : {}) });
      const badge = n("db0", "Group", { direction: "row" }, [n("db1", "Badge", { children: "Sale" })], { padding: "xs" });
      const tile = n("dt0", "Group", { direction: "column", gap: "sm" }, [n("dt1", "Heading", { children: "Stoneware mug" }), n("dt2", "Image", { src: PNG, alt: "A mug" }), { ...JSON.parse(JSON.stringify(badge)), id: "dt3", inst: { of: "dbadge", rev: 1 } }], { padding: "md", surface: "raised" });
      await window.__builder.store.saveLibrary({ images: [{ id: "im1", name: "Mug photo", src: PNG }], components: [
        { id: "dtile", name: "Product tile", node: tile, tokens: ["--dt-space-inset-md"], rev: 1, made: 1 },
        { id: "dbadge", name: "Sale badge", node: badge, tokens: ["--dt-space-inset-xs"], rev: 1, made: 1 },
      ] }, scope);
      const copyOf = (id) => { const c = JSON.parse(JSON.stringify(tile)); let i = 0; (function w(x) { x.id = id + (i++); (x.children || []).forEach(w); })(c); c.inst = { of: "dtile", rev: 1 }; return c; };
      const about = await window.__builder.store.addPage(m.id, "About us", { frames: [{ id: "df2", name: "About", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [n("ds2", "Section", {}, [(() => { const c = copyOf("dc"); c.children[0].props.children = "Tall jug"; return c; })()])] } }], active: "df2" }, null);
      await window.__builder.store.saveDoc(m.id, { frames: [{ id: "df1", name: "Shop", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [n("ds1", "Section", {}, [copyOf("da"), copyOf("dx"), n("dl", "Link", { children: "About us", href: "#page:" + about.page.id })])] } }], active: "df1" });
    }, PNG);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => window.__builder && window.__builder.project().pages && window.__builder.project().pages.length === 2);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="da0"]'));
    await page.locator(".bd-export").click();
    await page.locator(".bd-code[open]").waitFor();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator(".bd-code[open] .bd-btn", { hasText: "Download project code" }).click()]);
    const file = path.join(os.tmpdir(), "project-code-" + Date.now() + ".zip");
    await dl.saveAs(file);
    const buf = fs.readFileSync(file);
    fs.unlinkSync(file);
    /* The archive read back from its central directory: stored entries. */
    const entries = {};
    const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    expect(end > 0, "the download is a zip");
    let at = buf.readUInt32LE(end + 16);
    for (let i = 0, count = buf.readUInt16LE(end + 10); i < count; i++) {
      const size = buf.readUInt32LE(at + 20), nameLen = buf.readUInt16LE(at + 28), extra = buf.readUInt16LE(at + 30), note = buf.readUInt16LE(at + 32), local = buf.readUInt32LE(at + 42);
      const name = buf.slice(at + 46, at + 46 + nameLen).toString("utf8");
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      entries[name] = buf.slice(start, start + size);
      at += 46 + nameLen + extra + note;
    }
    const names = Object.keys(entries);
    expect(/-code\.zip$/.test(dl.suggestedFilename()), `named after the project, got ${dl.suggestedFilename()}`);
    expect(["README.md", "pages/index.jsx", "pages/about-us.jsx", "components/ProductTile.jsx", "components/SaleBadge.jsx", "assets/mug-photo.png"].every((x) => names.includes(x)), `the files, got ${names.join(", ")}`);
    expect(names.includes("theme.css") && /:root\s*\{/.test(entries["theme.css"].toString()), "the project's theme.css");
    const text = (n) => entries[n].toString("utf8");
    const home = text("pages/index.jsx"), tileFile = text("components/ProductTile.jsx");
    expect(/^import \{ Link, Section \} from "@dovetail-ds\/react";\nimport \{ ProductTile \} from "\.\.\/components\/ProductTile";/.test(home), `a page imports the system and its components, got ${home.split("\n").slice(0, 3).join(" | ")}`);
    expect(/<ProductTile \/>\s*<ProductTile \/>/.test(home) && /href="\/about-us"/.test(home), "Home calls the tile twice and links to /about-us");
    expect(/<ProductTile title="Tall jug" \/>/.test(text("pages/about-us.jsx")), "About us calls it with its own title");
    expect(/export function ProductTile\(\{ title = "Stoneware mug" \}\)/.test(tileFile), "the title another page changed is a prop of the component everywhere");
    expect(/import \{ SaleBadge \} from "\.\/SaleBadge";/.test(tileFile) && /src="\.\.\/assets\/mug-photo\.png"/.test(tileFile) && !/data:image/.test(tileFile), "the tile imports its badge and points at its picture in assets/");
    expect(entries["assets/mug-photo.png"].slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), "the picture is a PNG");
    const readme = text("README.md");
    expect(/npm install @dovetail-ds\/react/.test(readme) && /import "\.\/theme\.css";/.test(readme) && /- About us: `\/about-us`/.test(readme) && /`ProductTile` \(title\)/.test(readme), `the README says how to use it, got ${readme.slice(0, 300)}`);
    ok(`Download project code gives ${names.length} files: the two pages, ProductTile and SaleBadge in files of their own (the title About us changes is a prop), theme.css, the picture in assets/ and a README`);

    /* As one project: pages import components, components import each other. */
    const files = {};
    for (const n of names) if (/\.jsx$/.test(n)) files["src/" + n.replace(/\.jsx$/, ".tsx")] = text(n);
    fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
    const pkg = fs.mkdtempSync(path.join(ROOT, "dist", ".project-package-"));
    try {
      buildPackage(pkg);
      const { diagnostics } = await typecheck(files, { pkg });
      if (diagnostics.length) { fail(`tsc found ${diagnostics.length} error${diagnostics.length === 1 ? "" : "s"} in the downloaded project:\n` + diagnostics.map(describeTs).join("\n").replace(/\n/g, "\n        ")); return; }
    } finally {
      fs.rmSync(pkg, { recursive: true, force: true });
    }
    ok("the downloaded pages and components type-check together against the package, strict, with react-jsx");
    await page.close();
  });

  await step("Frames: a picked frame has a dot at each corner and resizes from its left edge; its auto layout, clip and scroll reach the frame and the code; a selection's tag has a ⋯ with its actions", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const sec = (key) => page.locator(`.bd-right .bd-sec[data-sec="${key}"]`);
    await page.locator(".bd-flabel-btn").first().click();
    await page.waitForSelector(".bd-frame-box .bd-handle.is-nw");
    const dots = await page.$$eval(".bd-frame-box .bd-handle", (hs) => hs.filter((h) => getComputedStyle(h, "::after").display !== "none").map((h) => h.className.replace("bd-handle is-", "")).sort().join());
    expect(dots === "ne,nw,se,sw", `a picked frame shows a dot at each corner and none on the edges, got ${dots}`);
    const before = await saved();
    const hw = await page.locator(".bd-frame-box .bd-handle.is-w").boundingBox();
    await page.mouse.move(hw.x + hw.width / 2, hw.y + hw.height / 2);
    await page.mouse.down();
    await page.mouse.move(hw.x + hw.width / 2 - 60, hw.y + hw.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction((w0) => window.__builder.doc().frames[0].width > w0, before.frames[0].width);
    const after = (await saved()).frames[0];
    expect(after.width > before.frames[0].width && typeof after.x === "number" && after.x < 0, `the left edge widens the frame and moves its left side, got ${after.width} at x ${after.x}`);
    ok(`a picked frame shows its four corner dots, and its left edge takes it from ${before.frames[0].width} to ${after.width} wide`);

    await tab(page, "Layout");
    await sec("frame-auto").locator('[aria-label="Row"]').click();
    await pick(page, "Gap", "md");
    await pick(page, "Padding", "lg");
    await frame().waitForFunction(() => { const r = getComputedStyle(document.querySelector(".bf-root")); return r.flexDirection === "row" && parseFloat(r.columnGap || r.gap) > 0 && parseFloat(r.paddingLeft) > 0; });
    const flow = (await saved()).frames[0].flow;
    expect(flow && flow.direction === "row" && flow.gap === "md" && flow.padding === "lg", `the frame keeps its auto layout, got ${JSON.stringify(flow)}`);
    ok("the frame's Auto layout runs it in a row with an md gap and lg padding, on the canvas and in the saved layout");

    await pick(page, "Resizing", "Fixed width and height");
    await sec("frame-overflow").locator(".bd-switch").click();
    await sec("frame-overflow").locator(".bd-seg-btn", { hasText: "Vertical" }).click();
    await frame().waitForFunction(() => { const r = getComputedStyle(document.querySelector(".bf-root")); return r.overflowY === "auto" && r.overflowX === "hidden"; });
    const fr = (await saved()).frames[0];
    expect(fr.clip === true && fr.scroll === "y" && !fr.hug, `a fixed frame keeps clip and vertical scroll, got ${JSON.stringify({ clip: fr.clip, scroll: fr.scroll, hug: fr.hug })}`);
    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    expect(code.includes('flexDirection: "row"') && code.includes('overflowY: "auto"') && code.includes('padding: "var(--dt-space-inset-lg)"'), "the exported code carries the frame's row, padding and vertical scroll");
    await page.keyboard.press("Escape");
    ok("Clip content and vertical scroll on a fixed frame: the root clips sideways and scrolls down, and the code says so");

    const hero = await frame().evaluate(() => document.querySelector('[data-bf-type="HeroBlock"]').getAttribute("data-bf-id"));
    await page.evaluate((id) => window.__builder.select([id]), hero);
    await page.waitForSelector(".bd-mark-sel .bd-mark-more");
    const corners = await page.$$eval(".bd-mark-sel .bd-handle", (hs) => hs.filter((h) => getComputedStyle(h, "::after").display !== "none").length);
    expect(corners === 4, `a selected layer in the flow shows a dot at each corner, got ${corners}`);
    await page.locator(".bd-mark-sel .bd-mark-more").click();
    await page.waitForSelector(".bd-ctx");
    expect(await page.locator(".bd-ctx .bd-dd-opt", { hasText: /^Duplicate/ }).count() === 1, "the tag's ⋯ opens the layer's actions");
    await page.keyboard.press("Escape");
    ok("a selected layer shows its four corner dots, and its tag's ⋯ opens its actions");
    await page.close();
  });

  await step("Dark mode: the builder's tools are dark unless this browser chose light, from the File menu or Home, and the frames and Configure keep their own", async () => {
    const { page, frame } = await open({ width: 1280, height: 800 });
    const chromeDark = () => page.evaluate(() => document.documentElement.classList.contains("dark") && document.documentElement.getAttribute("data-theme") === "dark");
    const frameDark = () => frame().evaluate(() => document.documentElement.classList.contains("dark"));
    const remembered = () => page.evaluate(() => localStorage.getItem("dovetail-builder-dark"));
    expect(await chromeDark() && !(await frameDark()), "a fresh browser gets dark tools over a light frame");
    /* In dark, a field sits lighter than the panel it's on, not darker. */
    const shade = await page.evaluate(() => {
      const rgba = (el) => getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number);
      const lum = (el) => { const m = rgba(el); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      /* A filled field: icon menus and the like are transparent. */
      const field = [...document.querySelectorAll(".bd-right .bd-dd, .bd-right .bd-input")].find((el) => { const m = rgba(el); return m.length < 4 || m[3] > 0; });
      const panel = document.querySelector(".bd-shell > .bd-right");
      return field && panel ? { field: lum(field), panel: lum(panel) } : null;
    });
    expect(shade && shade.field > shade.panel, `in dark, the inspector's fields are lighter than its panel, got ${JSON.stringify(shade)}`);
    await page.locator(".bd-project-menu").click();
    await option(page, "Light mode").click();
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    expect((await remembered()) === "0" && !(await frameDark()), "Light mode from the File menu is remembered, and the frame doesn't change");
    await page.evaluate(() => localStorage.setItem("dovetail-theme-config", JSON.stringify({ dark: true })));
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => !!window.__builder);
    expect(!(await chromeDark()), "after a reload the tools are still light, with Configure's dark mode on");
    await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click();
    const sw = page.locator(".bd-home-mode .bd-switch");
    expect((await sw.getAttribute("aria-checked")) === "false", "Home's Dark mode switch shows off");
    await sw.click();
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    expect((await remembered()) === "1" && (await sw.getAttribute("aria-checked")) === "true", "the switch turns the tools dark again and remembers it");
    ok("dark by default, Light mode from the File menu, remembered across a reload apart from Configure, and switched back on Home");
    await page.close();
  });

  await step("Conventions: shortcuts as this keyboard says them, a sheet of them, any layer renamed, Alt resizes from the centre, Shift keeps a move to one axis, a pasted picture, pictures at 1x to 3x", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      const node = (id, type, props, x, y) => ({ id, type, props, style: { x, y } });
      d.frames.push({ id: "conv", name: "Free", width: 800, height: 600, mode: "free", root: { id: "root", type: "Root", children: [
        node("ba", "Button", { children: "Alpha" }, 40, 40), node("bb", "Button", { children: "Beta" }, 40, 100), node("hc", "Heading", { children: "Gamma" }, 40, 140)] } });
      d.active = "conv";
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await poll(() => page.evaluate(() => window.__builder ? window.__builder.doc().frames.map((f) => f.id).join() : ""), (v) => /conv/.test(v), 8000);
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[1].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="ba"]'));
    const free = async () => (await saved()).frames.find((f) => f.id === "conv");
    const nodeOf = async (id) => (await free()).root.children.find((c) => c.id === id);
    await fitAll(page);
    await release(page);

    /* The shortcuts sheet: ? opens it, so does the File menu; the tools list
       their own keys; on this keyboard Ctrl stays Ctrl. */
    await page.keyboard.press("?");
    const sheet = page.locator("dialog.bd-keys[open]");
    await sheet.waitFor();
    const sheetText = await sheet.textContent();
    const groups = await sheet.locator(".bd-keys-group").count();
    expect(groups >= 7 && /Ctrl\+Shift\+G/.test(sheetText) && /Select\s*V/.test(sheetText) && !/⌘/.test(sheetText.replace("On a Mac, Ctrl is ⌘ and Alt is ⌥.", "")), `? opens a sheet of ${groups} groups with Ctrl+Shift+G and the tools' keys, got ${sheetText.slice(0, 160)}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog.bd-keys[open]"));
    await page.locator(".bd-project-menu").click();
    await option(page, "Keyboard shortcuts").click();
    await sheet.waitFor();
    await sheet.locator(".bd-act[aria-label=Close]").click();
    await page.waitForFunction(() => !document.querySelector("dialog.bd-keys[open]"));
    ok(`? and the File menu open the shortcuts, ${groups} groups, the tools listing their own keys`);

    /* Any layer renames: F2 on a Heading names it in the inspector's title;
       a double-click on a Button's row in Layers names that; both survive a
       reload. */
    await page.evaluate(() => window.__builder.select(["hc"]));
    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await release(page);
    await page.keyboard.press("F2");
    const titleInput = page.locator(".bd-inspect-title input");
    await titleInput.waitFor();
    await titleInput.fill("Big title");
    await titleInput.press("Enter");
    expect((await poll(() => nodeOf("hc"), (n) => n.name === "Big title")).name === "Big title", "F2 renames a Heading from the inspector's title");
    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    await page.locator('.bd-layer[data-layer="bb"] .bd-layer-main').dblclick();
    const rowInput = page.locator('.bd-layer[data-layer="bb"] input');
    await rowInput.waitFor();
    await rowInput.fill("Secondary");
    await rowInput.press("Enter");
    expect((await poll(() => nodeOf("bb"), (n) => n.name === "Secondary")).name === "Secondary", "a double-click on a Button's row renames it");
    await page.evaluate(() => window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await poll(() => page.evaluate(() => window.__builder ? window.__builder.doc().frames.map((f) => f.id).join() : ""), (v) => /conv/.test(v), 8000);
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[1].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="ba"]'));
    const kept = [(await nodeOf("hc")).name, (await nodeOf("bb")).name];
    expect(kept.join() === "Big title,Secondary", `the names outlast a reload, got ${kept}`);
    ok("F2 renames a Heading, a double-click renames a Button's row, and both names outlast a reload");

    /* Alt on a handle grows a free object from its centre; Shift once a move
       has begun keeps it to the axis it moved along most. */
    await fitAll(page);
    await release(page);
    await page.evaluate(() => window.__builder.select(["ba"]));
    await page.waitForSelector(".bd-mark-sel .bd-handle.is-e");
    const settled = async (sel) => {
      let b = null;
      for (let i = 0; i < 10; i++) { const n = await page.locator(sel).boundingBox(); if (b && n && Math.abs(n.x - b.x) < 0.5 && Math.abs(n.y - b.y) < 0.5) return n; b = n; await page.waitForTimeout(100); }
      return b;
    };
    const rectOf = (id) => page.evaluate((id) => document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame.rect(id), id);
    const r0 = await rectOf("ba");
    const hb = await settled(".bd-mark-sel .bd-handle.is-e");
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.keyboard.down("Alt");
    await page.mouse.move(hb.x + hb.width / 2 + 6, hb.y + hb.height / 2, { steps: 3 });
    await page.mouse.move(hb.x + hb.width / 2 + 12, hb.y + hb.height / 2, { steps: 3 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.keyboard.up("Alt");
    await page.waitForTimeout(250);
    const r1 = await rectOf("ba");
    const mid0 = r0.left + r0.width / 2, mid1 = r1.left + r1.width / 2;
    expect(r1.width > r0.width + 20 && Math.abs(mid1 - mid0) <= 4 && r1.left < r0.left - 8, `Alt widens Alpha on both sides, keeping its centre: ${Math.round(r0.left)}+${Math.round(r0.width)} to ${Math.round(r1.left)}+${Math.round(r1.width)}`);

    const bb0 = await nodeOf("bb");
    const bp = await canvasPoint(page, '[data-bf-id="bb"] button');
    await page.mouse.move(bp.x, bp.y);
    await page.mouse.down();
    await page.mouse.move(bp.x + 20, bp.y + 8, { steps: 4 });
    await page.keyboard.down("Shift");
    await page.mouse.move(bp.x + 120, bp.y + 40, { steps: 8 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.keyboard.up("Shift");
    const bb1 = await poll(() => nodeOf("bb"), (n) => n.style.x !== bb0.style.x);
    expect(bb1.style.x > bb0.style.x && bb1.style.y === bb0.style.y, `with Shift held once moving, Beta goes across and not down: ${bb0.style.x},${bb0.style.y} to ${bb1.style.x},${bb1.style.y}`);
    ok(`Alt resizes from the centre (${Math.round(r0.width)} to ${Math.round(r1.width)}px wide, centre held), and Shift keeps a move to one axis`);

    /* A picture on the clipboard lands as an Image and joins Content. */
    await page.evaluate(() => window.__builder.select([]));
    const before = (await free()).root.children.length;
    await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 40; c.height = 30;
      const g = c.getContext("2d"); g.fillStyle = "#3355ff"; g.fillRect(0, 0, 40, 30);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "image.png", { type: "image/png" }));
      document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    const pasted = await poll(async () => (await free()).root.children, (k) => k.length === before + 1);
    const pic = pasted[pasted.length - 1];
    const lib = await page.evaluate(() => (window.__builder.library().images || []).map((i) => i.name));
    expect(pic && pic.type === "Image" && /^data:image\/png/.test(pic.props.src || "") && lib[0] === "Pasted picture", `a pasted PNG becomes an Image, first in Content's images, got ${pic && pic.type} ${String(pic && pic.props.src).slice(0, 22)}, library ${lib.slice(0, 2)}`);
    ok("a picture pasted from the clipboard lands as an Image and joins Content as \"Pasted picture\"");

    /* Export takes the one layer it shows, at the scale chosen. */
    await page.evaluate(() => window.__builder.select(["hc"]));
    await page.waitForFunction(() => /Big title/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator(".bd-export").click();
    const dlg = page.locator("dialog.bd-code[open]").filter({ has: page.locator("#bd-code-title") });
    await dlg.waitFor();
    expect(/Export: Big title/.test(await dlg.locator("#bd-code-title").textContent()), "Export names the layer it shows");
    await dlg.locator(".bd-export-scale .bd-seg-btn", { hasText: "3x" }).click();
    const download = page.waitForEvent("download", { timeout: 20000 });
    await dlg.locator(".bd-code-actions .bd-btn", { hasText: "PNG" }).click();
    const file = await download;
    expect(/^Big-title@3x\.png$/.test(file.suggestedFilename()), `the layer downloads at 3x, named after it, got ${file.suggestedFilename()}`);
    await page.keyboard.press("Escape");
    ok(`Export takes just the selected layer at 3x: ${file.suggestedFilename()}`);
    await page.close();

    /* On a Mac the same shortcuts read as its keyboard has them. */
    const mac = await open({ width: 1440, height: 900 }, { before: (p) => p.addInitScript(() => { Object.defineProperty(Navigator.prototype, "platform", { get: () => "MacIntel" }); }) });
    await mac.page.locator(".bd-zoom").click();
    const hints = await mac.page.$$eval(".bd-dd-list .bd-dd-opt-hint", (h) => h.map((x) => x.textContent));
    await mac.page.keyboard.press("Escape");
    expect(hints.includes("⌘+") && hints.includes("⇧1") && !hints.some((h) => /Ctrl|Shift/.test(h)), `the zoom menu says ⌘+ and ⇧1 on a Mac, got ${hints.join(" | ")}`);
    await release(mac.page);
    await mac.page.keyboard.press("?");
    const macSheet = mac.page.locator("dialog.bd-keys[open]");
    await macSheet.waitFor();
    const macText = await macSheet.textContent();
    expect(/⇧⌘G/.test(macText) && /⌥⇧T/.test(macText) && /⌘-drag/.test(macText) && !/Ctrl\+/.test(macText), `the sheet on a Mac reads ⇧⌘G, ⌥⇧T and ⌘-drag, got ${macText.slice(0, 200)}`);
    ok(`on a Mac the zoom menu reads ${hints.slice(0, 4).join(", ")} and the sheet ⇧⌘G, ⌥⇧T, ⌘-drag`);
    await mac.page.close();
  });

  await step("Constraints: a free layer keeps to the edges it's pinned to as its frame changes size, live on the canvas, typed, and in the code", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      const node = (id, type, props, x, y, extra) => ({ id, type, props, style: Object.assign({ x, y }, extra || {}) });
      d.frames = [{ id: "pin", name: "Post", width: 800, height: 600, mode: "free", root: { id: "root", type: "Root", children: [
        node("hd", "Heading", { children: "Autumn" }, 10, 10), node("bt", "Button", { children: "Order" }, 150, 100, { fw: 40 })] } }];
      d.active = "pin";
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await poll(() => page.evaluate(() => window.__builder ? window.__builder.doc().frames.map((f) => f.id).join() : ""), (v) => v === "pin", 8000);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="bt"]'));
    const node = async (id) => (await saved()).frames[0].root.children.find((c) => c.id === id).style;
    const rectOf = (id) => page.evaluate((id) => document.querySelector("iframe.bd-frame").contentWindow.BuilderFrame.rect(id), id);
    await fitAll(page);
    await release(page);
    await page.evaluate(() => window.__builder.select(["bt"]));
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Layout");
    const pins = page.locator(".bd-right .bd-pins");
    await pins.waitFor();
    expect(await pins.locator(".bd-pin-line.is-on").count() === 2, "a free layer starts pinned left and top");
    await pins.locator(".bd-pin-line.is-right").click();
    await pins.locator(".bd-pin-line.is-bottom").click();
    let st = await poll(() => node("bt"), (s) => s.ch === "right" && s.cv === "bottom");
    expect(st.ch === "right" && st.cv === "bottom", `the square pins it right and bottom, got ${st.ch} ${st.cv}`);
    const hint = await page.locator(".bd-right .bd-field-hint", { hasText: "frame changes size" }).first().textContent();
    expect(/right and bottom edges/.test(hint), `the hint says what it keeps to, got ${hint}`);
    expect(await page.locator(".bd-pin-mark").count() === 2, "two dashed lines run from it to the right and bottom edges");
    await pins.locator(".bd-pin-line.is-left").click({ modifiers: ["Shift"] });
    st = await poll(() => node("bt"), (s) => s.ch === "both");
    expect(st.ch === "both", `Shift on the left edge with right pinned makes it both, got ${st.ch}`);
    await pins.locator(".bd-pin-line.is-right").click();
    await poll(() => node("bt"), (s) => s.ch === "right");
    ok("the square pins right and bottom, Shift makes both edges, the hint names them and dashed lines show them");

    /* Dragging the frame's right edge: it follows as the frame grows, and
       lands 100px further right once let go. */
    const r0 = await rectOf("bt");
    const fr = await page.locator("iframe.bd-frame").boundingBox();
    const s0 = fr.width / 800;
    const grip = await page.evaluate(({ x, y, h }) => {
      const els = [...document.querySelectorAll(".bd-resize.is-r")];
      const one = els.map((el) => ({ el, b: el.getBoundingClientRect() })).sort((a, b) => Math.abs(a.b.left - x) - Math.abs(b.b.left - x))[0];
      return one ? { x: one.b.left + one.b.width / 2, y: one.b.top + one.b.height / 2 } : null;
    }, { x: fr.x + fr.width, y: fr.y, h: fr.height });
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    await page.mouse.move(grip.x + 50 * s0, grip.y, { steps: 4 });
    await page.mouse.move(grip.x + 100 * s0, grip.y, { steps: 4 });
    await page.waitForTimeout(150);
    const live = await rectOf("bt");
    await page.mouse.up();
    const W1 = await poll(async () => (await saved()).frames[0].width, (w) => w !== 800);
    st = await poll(() => node("bt"), (s) => s.x !== 150);
    expect(live.left - r0.left > 60, `while the edge is dragged the Button follows it, ${Math.round(r0.left)} to ${Math.round(live.left)}`);
    expect(st.x === 150 + Math.round((W1 - 800) / 4) && st.y === 100, `let go at ${W1} wide, it sits ${W1 - 800}px further right: x ${st.x}, y ${st.y}`);
    const r1 = await rectOf("bt");
    expect(Math.abs((W1 - r1.right) - (800 - r0.right)) <= 4, `it keeps its distance to the right edge: ${Math.round(800 - r0.right)} then ${Math.round(W1 - r1.right)}`);
    ok(`a frame dragged from 800 to ${W1} wide carries the Button with it as it goes and keeps it ${Math.round(W1 - r1.right)}px from the right edge`);

    /* Scale, from the dropdown, then a typed width: place and size grow
       in proportion. */
    await pick(page, "Constraint across", "Scale");
    st = await poll(() => node("bt"), (s) => s.ch === "scale");
    const fw0 = st.fw, x0 = st.x, Wn = (await saved()).frames[0].width;
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.__builder.select([]));
    const wField = page.locator('.bd-right input[aria-label="Frame width"]');
    await wField.waitFor();
    await wField.fill(String(Wn * 2));
    await wField.press("Enter");
    st = await poll(() => node("bt"), (s) => s.fw !== fw0);
    expect(Math.abs(st.x - x0 * 2) <= 1 && Math.abs(st.fw - fw0 * 2) <= 1, `twice the width doubles its place and width: ${x0},${fw0} to ${st.x},${st.fw}`);
    ok(`Scale from the dropdown, then a typed width of ${Wn * 2}: the Button's place and width double`);

    /* The code positions it the same way, in tokens. */
    await page.locator(".bd-export").click();
    const code = await page.locator(".bd-code-pre code").textContent();
    await page.keyboard.press("Escape");
    expect(/left: "calc\(100% \* [\d.]+\)"/.test(code) && /width: "calc\(100% \* [\d.]+\)"/.test(code), "the exported Button scales with its page, in percentages of it");
    const values = [...code.matchAll(/style=\{\{([^}]*)\}\}/g)].flatMap((m) => [...m[1].matchAll(/:\s*"([^"]*)"/g)].map((v) => v[1]));
    expect(!values.some(raw), `no raw values in the code, got ${values.filter(raw).join(", ")}`);
    ok("the exported code places a scaling layer in percentages of its page, with no raw values");
    await page.close();
  });

  await step("View: its own menu, rulers, guides dragged out and snapped to, layout columns you can count, snapping switched off, kept per browser", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      d.frames.push({ id: "vw", name: "Post", width: 800, height: 600, mode: "free", guides: [{ x: 300 }], root: { id: "root", type: "Root", children: [
        { id: "bt", type: "Button", props: { children: "Go" }, style: { x: 10, y: 100 } }] } });
      d.active = "vw";
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.waitForTimeout(150);
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await poll(() => page.evaluate(() => window.__builder ? window.__builder.doc().frames.map((f) => f.id).join() : ""), (v) => /vw/.test(v), 8000);
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[1].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="bt"]'));
    const vw = async () => (await saved()).frames.find((f) => f.id === "vw");
    await page.evaluate(() => window.__builder.select([]));
    await page.keyboard.press("Shift+2");
    await page.waitForTimeout(400);
    await release(page);

    /* The View menu: its own button, switches that say whether they're on. */
    await page.locator(".bd-view-menu").click();
    const items = await page.$$eval(".bd-dd-list [role=menuitemcheckbox]", (o) => o.map((x) => x.querySelector(".bd-dd-opt-label").textContent + "=" + x.getAttribute("aria-checked")));
    expect(items.join() === "Rulers=false,Guides=true,Layout columns=false,Snap to objects=true,Snap to guides=true", `the menu lists what the canvas shows and snaps to, got ${items.join()}`);
    await option(page, "Rulers").click();
    await page.locator(".bd-ruler.is-top").waitFor();
    expect(await page.locator(".bd-ruler.is-top .bd-ruler-num").count() >= 4, "the top ruler is numbered");
    await page.keyboard.press("Shift+R");
    await page.waitForFunction(() => !document.querySelector(".bd-ruler"));
    await page.keyboard.press("Shift+R");
    await page.locator(".bd-ruler.is-left").waitFor();
    ok(`a View button of its own (${items.length} switches); Rulers from it, and Shift+R hides and shows them`);

    /* A guide dragged out of the left ruler lands where it's let go. */
    const fb = await page.locator("iframe.bd-frame.is-active").boundingBox();
    const s = fb.width / 800;
    const lr = await page.locator(".bd-ruler.is-left").boundingBox();
    await page.mouse.move(lr.x + lr.width / 2, fb.y + 200 * s);
    await page.mouse.down();
    await page.mouse.move(fb.x + 300 * s, fb.y + 200 * s, { steps: 6 });
    await page.mouse.move(fb.x + 500 * s, fb.y + 200 * s, { steps: 6 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    let g = await poll(async () => (await vw()).guides || [], (list) => list.length === 2);
    expect(g.length === 2 && Math.abs(g[1].x - 500) <= 2, `a guide comes out of the left ruler at x 500, got ${JSON.stringify(g)}`);
    expect(await page.locator(".bd-rguide.is-x").count() === 2, "both guides are drawn");
    await page.keyboard.press("Control+z");
    g = await poll(async () => (await vw()).guides || [], (list) => list.length === 1);
    expect(g.length === 1, "undo takes the new guide back");
    ok(`a guide dragged from the left ruler lands at x ${Math.round(500)}, drawn across the frame, and undo takes it back`);

    /* Dragging the Button so its left edge comes 5px short of the guide at
       300: it snaps to it; with Snap to guides off, it doesn't. */
    const dragTo = async (left) => {
      const r = await page.evaluate(() => document.querySelectorAll("iframe.bd-frame")[1].contentWindow.BuilderFrame.rect("bt"));
      const sx = fb.x + (r.left + r.width / 2) * s, sy = fb.y + (r.top + r.height / 2) * s;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      /* A drag counts from where it first moves past the threshold. */
      await page.mouse.move(sx + 8, sy, { steps: 2 });
      await page.mouse.move(sx + 8 + (left - r.left) * s, sy, { steps: 8 });
      await page.waitForTimeout(120);
      await page.mouse.up();
      await page.waitForTimeout(250);
      return (await vw()).root.children.find((c) => c.id === "bt").style.x * 4;
    };
    const snapped = await dragTo(295);
    expect(Math.abs(snapped - 300) <= 2, `let go 5px short of the guide, the Button's left edge snaps to x 300, got ${snapped}`);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    await page.locator(".bd-view-menu").click();
    await option(page, "Snap to guides").click();
    const loose = await dragTo(295);
    expect(Math.abs(loose - 300) >= 3, `with Snap to guides off it stays where it was let go, got ${loose}`);
    ok(`the Button snaps to the guide (x ${snapped}), and lands at x ${loose} with Snap to guides off`);

    /* Dragged onto the ruler, a guide goes. */
    const gl = await page.locator(".bd-rguide.is-x").first().boundingBox();
    await page.mouse.move(gl.x + gl.width / 2, gl.y + 40);
    await page.mouse.down();
    await page.mouse.move(lr.x + 30, gl.y + 40, { steps: 4 });
    await page.mouse.move(lr.x + lr.width / 2, gl.y + 40, { steps: 4 });
    await page.mouse.up();
    g = await poll(async () => (await vw()).guides, (list) => !list);
    expect(!g, `dragged back onto the ruler, the guide goes, got ${JSON.stringify(g)}`);
    ok("a guide dragged back onto the ruler is removed");

    /* Layout columns: Shift+G lays them over the frame; the frame's own
       count changes how many. */
    await page.keyboard.press("Shift+G");
    const cols = page.locator('.bd-cols[data-frame="vw"] .bd-col');
    await cols.first().waitFor();
    expect(await cols.count() === 8, `an 800-wide frame shows 8 columns by default, got ${await cols.count()}`);
    await page.evaluate(() => window.__builder.select([]));
    const colField = page.locator('.bd-right input[aria-label="Layout columns"]');
    await colField.waitFor();
    await colField.fill("6");
    await colField.press("Enter");
    await poll(() => cols.count(), (n) => n === 6);
    expect((await cols.count()) === 6 && (await vw()).columns === 6, `six typed in shows six columns and keeps them on the frame, got ${await cols.count()}`);
    ok("Shift+G lays 8 columns over an 800-wide frame; typing 6 in Layout columns shows 6, kept on the frame");

    /* Kept per browser. */
    await page.evaluate(() => window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.locator(".bd-ruler.is-top").waitFor();
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder-prefs")).canvas);
    expect(kept.rulers === true && kept.columns === true && kept.snapGuides === false, `the switches outlast a reload, got ${JSON.stringify(kept)}`);
    ok("rulers, columns and the snapping switch outlast a reload");
    await page.close();
  });

  await step("Panels: each resizes by its inner edge in steps of 4, folds away past its minimum, opens back to its width, by keyboard too, kept per browser", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const width = (side) => page.evaluate((s) => { const el = document.querySelector(".bd-shell > .bd-" + s); return el && el.offsetParent ? Math.round(el.getBoundingClientRect().width) : 0; }, side);
    const value = (side) => page.locator(".bd-panel-edge.is-" + side).getAttribute("aria-valuenow");
    /* The panel's width follows the handle's value on the next layout; wait
       for it, and if it never comes say what the page holds. */
    const settled = async (side, px) => {
      const came = await page.waitForFunction(([s, w]) => Math.round(document.querySelector(".bd-shell > .bd-" + s).getBoundingClientRect().width) === w, [side, px], { timeout: 3000 }).then(() => true, () => false);
      if (came) return;
      const got = await page.evaluate((s) => { const shell = document.querySelector(".bd-shell"), edge = document.querySelector(".bd-panel-edge.is-" + s); return { width: Math.round(document.querySelector(".bd-shell > .bd-" + s).getBoundingClientRect().width), left: shell.style.getPropertyValue("--bd-left-w"), right: shell.style.getPropertyValue("--bd-right-w"), columns: getComputedStyle(shell).gridTemplateColumns, value: edge && edge.getAttribute("aria-valuenow") }; }, side);
      throw new Error(`the ${side} panel should settle at ${px}px wide, got ${JSON.stringify(got)}`);
    };
    const drag = async (side, dx) => {
      const b = await page.locator(".bd-panel-edge.is-" + side).boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + dx / 2, y, { steps: 3 }); await page.mouse.move(x + dx, y, { steps: 3 });
      const said = await page.locator(".bd-readout").textContent().catch(() => "");
      await page.mouse.up();
      return said;
    };
    expect(await value("left") === "344" && await value("right") === "312", `the panels start at 344 and 312, got ${await value("left")} and ${await value("right")}`);
    const w0 = await width("left");
    const said = await drag("left", 101);
    expect(await value("left") === "444" && said.trim() === "444", `dragging the left edge 101px right makes it 444 (steps of 4) and says so, got ${await value("left")} saying "${said}"`);
    await settled("left", w0 + 100);
    await drag("left", 400);
    expect(await value("left") === "520", `the left panel stops at 520, got ${await value("left")}`);
    const toolsMid = await page.evaluate(() => { const t = document.querySelector(".bd-tools").getBoundingClientRect(), l = document.querySelector(".bd-shell > .bd-left").getBoundingClientRect(), r = document.querySelector(".bd-shell > .bd-right").getBoundingClientRect(); return Math.abs((t.left + t.right) / 2 - (l.right + r.left) / 2); });
    expect(toolsMid < 12, `the tool bar stays centred between the panels, off by ${Math.round(toolsMid)}px`);
    ok("the left panel resizes in steps of 4 up to its maximum, with a readout, the tool bar centred between");

    const folded = await drag("left", -600);
    expect(/fold/i.test(folded), `past the minimum the readout says it folds, got "${folded}"`);
    expect(await page.locator(".bd-shell.is-left-closed").count() === 1 && !(await page.locator(".bd-left-body").isVisible()), "past the minimum the left panel folds to its rail");
    expect(await width("left") < 120 && await page.locator(".bd-rail-tabs .bd-tab").first().isVisible(), `the rail stays, got ${await width("left")}px wide`);
    expect(await page.locator('.bd-rail-tabs .bd-tab[aria-selected="true"]').count() === 0, "no rail tab reads as open while it's folded");
    await page.locator(".bd-rail-tabs .bd-tab", { hasText: "Layers" }).click();
    expect(await page.locator(".bd-shell.is-left-closed").count() === 0 && await value("left") === "520" && await page.locator(".bd-layers").isVisible(), `a rail tab opens it back at its width on that tab, got ${await value("left")}`);
    ok("past its minimum the left panel folds to its rail; a rail tab opens it again at its width");

    await drag("right", 600);
    expect(!(await page.locator(".bd-shell > .bd-right").isVisible()) && await page.locator(".bd-panel-show").isVisible(), "past its minimum the inspector folds out of sight, leaving a button to show it");
    await page.locator(".bd-panel-show").click();
    expect(await page.locator(".bd-shell > .bd-right").isVisible() && await value("right") === "312", `the button shows the inspector at its width, got ${await value("right")}`);
    ok("the inspector folds away and its button brings it back at its width");

    await page.locator(".bd-panel-edge.is-right").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Shift+ArrowLeft");
    expect(await value("right") === "332", `Left widens the inspector by 4, Shift by 16, got ${await value("right")}`);
    await page.keyboard.press("Enter");
    expect(await page.locator(".bd-panel-show").isVisible(), "Enter on the edge folds the inspector");
    await page.locator(".bd-panel-show").click();
    await page.locator(".bd-panel-edge.is-left").focus();
    await page.keyboard.press("Home");
    expect(await value("left") === "280", `Home takes the left panel to its minimum, got ${await value("left")}`);
    ok("the edges take arrows (Shift for 16), Home, End and Enter to fold");

    await page.evaluate(() => window.__builder && window.__builder.flush());
    await page.reload();
    await page.waitForSelector(".bd-panel-edge.is-left");
    expect(await value("left") === "280" && await value("right") === "332", `the widths are kept per browser, got ${await value("left")} and ${await value("right")}`);
    await page.locator(".bd-panel-edge.is-left").dblclick();
    await page.locator(".bd-panel-edge.is-right").dblclick();
    expect(await value("left") === "344" && await value("right") === "312", `double-clicking an edge puts its default back, got ${await value("left")} and ${await value("right")}`);
    ok("the widths are kept across a reload, and a double-click puts the default back");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    expect(await page.locator(".bd-panel-edge, .bd-panel-show").count() === 0, "on a phone the panels are panes, with no edges to drag");
    ok("at 390px there are no panel edges");
    await page.close();
  });

  await step("Components travel: the file and the link carry the component an instance is made from; one can't go inside itself; a link to a removed page leaves the code", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = (pg = page) => pg.evaluate(() => JSON.parse(JSON.stringify(window.__builder.doc())));
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    const library = (pg = page) => pg.evaluate(() => JSON.parse(JSON.stringify(window.__builder.library() || {})));
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(400);
    /* A component in this file's library, at revision 2, and a page with an
       instance of it beside a Card linking to a page that's gone. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const m = window.__builder.project();
      const scope = m.group ? "g:" + m.group : m.lib === "shared" ? "shared" : "f:" + m.id;
      const node = { id: "cm", type: "Group", name: "Promo", props: { direction: "column", gap: "sm" }, style: { padding: "md", radius: "container", surface: "raised" },
        children: [{ id: "cmh", type: "Heading", props: { children: "Promo" }, style: {} }, { id: "cmb", type: "Button", props: { children: "Shop", variant: "primary" }, style: {} }] };
      await window.__builder.store.saveLibrary({ components: [{ id: "promo1", name: "Promo card", node, tokens: ["--dt-space-inset-md"], rev: 2, prev: node, made: 1 }] }, scope);
      const inst = JSON.parse(JSON.stringify(node)); inst.id = "in1"; inst.children[0].id = "in1h"; inst.children[1].id = "in1b"; inst.inst = { of: "promo1", rev: 2 };
      const card = { id: "cd1", type: "Card", props: { title: "Old page", href: "#page:gonepage" }, style: {} };
      const d = { frames: [{ id: "tf", name: "Travel", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [{ id: "sec", type: "Section", props: {}, style: {}, children: [inst, card] }] } }], active: "tf" };
      await window.__builder.store.saveDoc(m.id, d);
    });
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="in1"]'));
    const lib0 = await library();
    expect(lib0.components.length === 1 && lib0.components[0].rev === 2 && lib0.components[0].prev, `the library reads back with the component's revision and the one before, got ${JSON.stringify(lib0.components[0] && { rev: lib0.components[0].rev, prev: !!lib0.components[0].prev })}`);
    ok("a component's revision and its previous one survive a reload");

    /* Download file: the component is in it, once, at the current revision. */
    const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { await page.locator(".bd-project-menu").click(); await option(page, "Download file").click(); })()]);
    const file = path.join(os.tmpdir(), "travel-" + Date.now() + ".dovetail");
    await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(data.version === 3 && Array.isArray(data.components) && data.components.length === 1 && data.components[0].id === "promo1" && data.components[0].rev === 2 && !data.components[0].prev, `the file carries the component its instance uses, got ${JSON.stringify(data.components)}`);
    const firstId = await page.evaluate(() => window.__builder.project().id);
    await page.locator(".bd-rail .bd-tab", { hasText: "Home" }).click();
    await page.locator(".bd-home .bd-proj").first().waitFor();
    await page.locator(".bd-projects input[type=file][accept^='.dovetail']").setInputFiles(file);
    await page.waitForFunction((id) => window.__builder.project().id !== id, firstId);
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length > 0);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="in1"]'));
    const lib1 = await poll(() => library(), (l) => (l.components || []).some((c) => c.id === "promo1"));
    expect((lib1.components || []).some((c) => c.id === "promo1" && c.rev === 2), `the opened file's library has the component, got ${JSON.stringify((lib1.components || []).map((c) => c.id))}`);
    await page.evaluate(() => window.__builder.select(["in1"]));
    await page.locator(".bd-inst").waitFor();
    expect(/Instance of\s*Promo card/.test(await page.locator(".bd-inst").textContent()), "the instance in the opened file knows its component");
    fs.unlinkSync(file);
    ok("Download file carries the component; Open file brings it into the new file's library, and the instance resolves");

    /* Copy link carries it under &c=, and the link opens with it. */
    await page.evaluate(() => { window.DovetailCopy = { write: (t, cb) => { window.__copied = t; cb(true); } }; });
    await page.locator(".bd-project-menu").click();
    await option(page, /^Copy link/).click();
    const link = await page.evaluate(() => window.__copied);
    expect(/&c=[\w-]+/.test(link), `the link carries the components, got ${link.slice(link.indexOf("#"), link.indexOf("#") + 40)}…`);
    const shared = await open({ width: 1280, height: 900 }, { hash: link.slice(link.indexOf("#")) });
    await shared.frame().waitForSelector('[data-bf-id="in1"]');
    await shared.page.evaluate(() => window.__builder.select(["in1"]));
    await shared.page.locator(".bd-inst").waitFor();
    expect(/Promo card/.test(await shared.page.locator(".bd-inst").textContent()), "the link opens with the instance knowing its component");
    ok("Copy link adds &c= with the component, and the link opens with it in the new project's library");

    /* Added into its own instance from My components, it lands beside it. */
    await shared.page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await shared.page.locator('.bd-assets [data-asset-kind="components"]').click();
    await shared.page.locator(".bd-cat", { hasText: "My components" }).click();
    await shared.page.locator(".bd-mine-btn", { hasText: "Promo card" }).click();
    const d2 = await poll(() => saved(shared.page), (d) => d.frames[0].root.children[0].children.length === 3);
    const sec = d2.frames[0].root.children[0];
    const holds = (n) => (n.children || []).some((c) => (c.inst && c.inst.of === "promo1") || holds(c));
    expect(sec.children.length === 3 && sec.children[1].inst && sec.children[1].inst.of === "promo1" && !holds(sec.children[0]), `the new instance goes right after the selected one, not inside it, got ${JSON.stringify(sec.children.map((c) => [c.type, !!c.inst, (c.children || []).length]))}`);
    ok("an instance added into one of its own instances goes beside it");

    /* The Card's link to a removed page: named in the inspector, left out of the code. */
    await shared.page.evaluate(() => window.__builder.select(["cd1"]));
    await shared.page.waitForFunction(() => /Card/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await shared.page.locator(".bd-link .bd-dd-label", { hasText: "A page that was removed" }).waitFor();
    await shared.page.evaluate(() => window.__builder.select([]));
    await shared.page.locator(".bd-export").click();
    await shared.page.locator(".bd-code[open] .bd-code-pre code").waitFor();
    const code = await shared.page.locator(".bd-code[open] .bd-code-pre code").textContent();
    expect(/<Card /.test(code) && !/#page:/.test(code) && !/href=/.test(code), `the code leaves the dead link out, got ${(code.match(/<Card[^>]*>/) || [""])[0]}`);
    ok("a link to a removed page reads \"A page that was removed\" in the inspector and is left out of the code");
    await shared.page.close();
    await page.close();
  });

  await step("Fresh atoms: a component added with nothing set starts from its own defaults, and the code leaves defaults out", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(300);
    /* Each atom as a tile adds it: a type and nothing set. A HeroBlock beside
       them keeps its sample copy. A Button set to md, an Input set to sm and
       a Textarea set to 4 rows over its sample's 2 show what a choice
       exports. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const d = JSON.parse(JSON.stringify(window.__builder.doc()));
      const types = ["Heading", "Text", "Button", "Badge", "Tag", "Link", "Divider", "Card", "Input", "Select", "Switch", "Checkbox", "Alert", "Image"];
      const kids = types.map((t, i) => ({ id: "fa" + i, type: t, props: {}, style: {}, ...(t === "Card" ? { children: [] } : {}) }));
      kids.push({ id: "fa-md", type: "Button", props: { size: "md", children: "Medium" }, style: {} });
      kids.push({ id: "fa-sm", type: "Input", props: { size: "sm" }, style: {} });
      kids.push({ id: "fa-rows", type: "Textarea", props: { rows: 4 }, style: {} });
      d.frames = [{ id: "f1", name: "Fresh", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [
        { id: "fa-sec", type: "Section", props: {}, style: {}, children: kids },
        { id: "fa-hero", type: "HeroBlock", props: {}, style: {} },
      ] } }];
      d.active = "f1";
      await window.__builder.store.saveDoc(window.__builder.project().id, d);
    });
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 1);
    const fr = () => frames(page)[0];
    await fr().waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="fa13"]') && document.querySelector('[data-bf-type="HeroBlock"] section'));
    const seen = await fr().evaluate(() => ({
      h: document.querySelector('[data-bf-id="fa0"] h1, [data-bf-id="fa0"] h2, [data-bf-id="fa0"] h3')?.tagName,
      sw: document.querySelector('[data-bf-id="fa10"] input')?.checked,
      cb: document.querySelector('[data-bf-id="fa11"] input')?.checked,
      hero: document.querySelector('[data-bf-type="HeroBlock"]').textContent,
    }));
    expect(seen.h === "H2" && seen.sw === false && seen.cb === false, `on the canvas a fresh Heading is an h2 and a fresh Switch and Checkbox are off, got ${JSON.stringify(seen)}`);
    expect(/Made slowly\. Used every day\./.test(seen.hero), `a HeroBlock still starts with its sample copy, got ${seen.hero.slice(0, 80)}`);
    ok("on the canvas a fresh Heading is an h2, a fresh Switch and Checkbox are off, and a HeroBlock keeps its sample copy");

    await page.evaluate(() => window.__builder.select([]));
    await page.locator(".bd-export").click();
    await page.locator(".bd-code[open] .bd-code-pre code").waitFor();
    const code = await page.locator(".bd-code[open] .bd-code-pre code").textContent();
    const want = [
      "<Heading level={2}>Heading</Heading>",
      "<Text>Text</Text>",
      "<Button>Button</Button>",
      "<Badge>Badge</Badge>",
      "<Tag>Tag</Tag>",
      '<Link href="#">Link</Link>',
      "<Divider />",
      '<Card title="Card" description="A line of copy." />',
      '<Input label="Label" />',
      '<Select label="Label" options={["Owner", "Admin", "Member"]} />',
      '<Switch label="Switch" />',
      '<Checkbox label="Checkbox" />',
      '<Alert title="Alert" />',
      '<Image alt="Image" />',
    ];
    const lines = code.split("\n").map((l) => l.trim());
    const missing = want.filter((w) => !lines.includes(w));
    expect(!missing.length, `each fresh atom exports as its plain self, missing ${missing.join(" | ")}`);
    expect(!/variant="eyebrow"|size="sm"|defaultChecked|defaultValue|tone="warning"|selected\b|label="or"/.test(code.slice(0, code.indexOf("<Button>Medium"))), "no specimen showcase prop comes along");
    expect(!/Ridge loop|Quiet mornings|Save changes|Account settings|Five editors|Workspace name|Two-factor|trial ends/.test(code), "no specimen copy comes along");
    ok("each fresh atom exports as its plain self: " + want.slice(0, 3).join(" "));

    expect(lines.includes("<Button>Medium</Button>"), `a Button set to md, its documented default, exports without size, got ${lines.find((l) => /Medium/.test(l))}`);
    expect(lines.includes('<Input label="Label" size="sm" />'), `a prop away from its default stays, got ${lines.find((l) => /size="sm"/.test(l))}`);
    expect(lines.includes('<Textarea label="Label" rows={4} />'), `a default chosen over a different start stays, so the code pastes back as it was, got ${lines.find((l) => /<Textarea/.test(l))}`);
    expect(/<HeroBlock[^>]*title="Made slowly\. Used every day\."/.test(code), `a HeroBlock's code keeps its sample copy, got ${(code.match(/<HeroBlock[^\n]*/) || [""])[0].slice(0, 120)}`);
    expect(!/size="md"|tone="info"|ratio="16:9"/.test(code), "documented defaults are left out of the code");
    ok("a prop at its documented default is left out (<Button size=\"md\"> is <Button>), one set elsewhere stays, a default chosen over a different start stays, and a HeroBlock keeps its copy");
    await page.close();
  });

  await step("Components in the code: an instance is a call to its component, its changed texts are props, the rest is listed as left out, and a placed instance keeps its place", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const poll = async (get, good, ms = 5000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await poll(() => page.evaluate(() => window.__builder.saved().ok), (v) => v === true);
    await page.waitForTimeout(300);
    /* Product tile holds a Sale badge (a component inside a component).
       Three tiles on Shop: as it is, with two texts changed, and with a
       layer gone and its own surface. One placed tile on Poster. */
    await page.evaluate(async () => {
      await window.__builder.flush();
      const m = window.__builder.project();
      const scope = m.group ? "g:" + m.group : m.lib === "shared" ? "shared" : "f:" + m.id;
      const n = (id, type, props, children, style, name) => ({ id, type, props: props || {}, children, style: style || {}, ...(name ? { name } : {}) });
      const badge = n("b0", "Group", { direction: "row" }, [n("b1", "Badge", { children: "Sale" })], { padding: "xs" });
      const tile = n("t0", "Group", { direction: "column", gap: "sm" }, [n("t1", "Heading", { children: "Stoneware mug" }), n("t2", "Text", { children: "Fern glaze" }, undefined, undefined, "Glaze"), n("t3", "Button", { children: "Add to cart", variant: "primary" }), { ...JSON.parse(JSON.stringify(badge)), id: "t4", inst: { of: "badge", rev: 1 } }], { padding: "md", radius: "container", surface: "raised" });
      await window.__builder.store.saveLibrary({ components: [
        { id: "tile", name: "Product tile", node: tile, tokens: ["--dt-space-inset-md"], rev: 1, made: 1 },
        { id: "badge", name: "Sale badge", node: badge, tokens: ["--dt-space-inset-xs"], rev: 1, made: 1 },
      ] }, scope);
      const copyOf = (node, id, extra) => { const c = JSON.parse(JSON.stringify(node)); let i = 0; (function w(x) { x.id = id + (i++); (x.children || []).forEach(w); })(c); c.inst = { of: "tile", rev: 1 }; return Object.assign(c, extra || {}); };
      const a = copyOf(tile, "a");
      const b = copyOf(tile, "b"); b.children[0].props.children = "Tall jug"; b.children[1].props.children = "Moss glaze";
      const c = copyOf(tile, "c", { name: "Featured" }); c.style.surface = "brand"; c.children.splice(2, 1);
      const shop = { id: "f1", name: "Shop", width: 1280, hug: true, mode: "structured", root: { id: "root", type: "Root", children: [n("s", "Section", {}, [n("g", "Group", { direction: "row", gap: "md" }, [a, b, c])])] } };
      const placed = copyOf(tile, "p"); Object.assign(placed.style, { x: 20, y: 10 });
      const poster = { id: "f2", name: "Poster", width: 800, height: 600, mode: "freeform", root: { id: "root2", type: "Root", children: [placed] } };
      await window.__builder.store.saveDoc(m.id, { frames: [shop, poster], active: "f1" });
    });
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frames(page)[0].waitForFunction(() => !!window.BuilderFrame && document.querySelector('[data-bf-id="a0"]'));
    const exportCode = async () => {
      await page.locator(".bd-export").click();
      await page.locator(".bd-code[open] .bd-code-pre code").waitFor();
      return page.locator(".bd-code[open] .bd-code-pre code").textContent();
    };
    await page.evaluate(() => window.__builder.select([]));
    const shop = await exportCode();
    expect(/^import \{ Badge, Button, Heading, Section, Text \} from "@dovetail-ds\/react";/.test(shop), `one import line for the page and its components, got ${shop.split("\n")[0]}`);
    expect(/export function ProductTile\(\{ title = "Stoneware mug", glaze = "Fern glaze" \}\)/.test(shop), `the component takes the texts its instances changed, named by part and by layer, with its own as defaults, got ${(shop.match(/export function ProductTile[^\n]*/) || [""])[0]}`);
    expect(/<Heading[^>]*>\{title\}<\/Heading>/.test(shop) && /<Text[^>]*>\{glaze\}<\/Text>/.test(shop), "the component writes its params where its texts were");
    expect(/export function SaleBadge\(\)/.test(shop) && /<SaleBadge \/>/.test(shop), "a component inside a component is a function and a call of its own");
    expect((shop.match(/export function ProductTile/g) || []).length === 1 && (shop.match(/export function SaleBadge/g) || []).length === 1, "each component appears once");
    expect(/<ProductTile \/>\s*<ProductTile title="Tall jug" glaze="Moss glaze" \/>\s*<ProductTile \/>/.test(shop), `the page calls the component three times, the changed one with its texts, got ${(shop.match(/<ProductTile[^\n]*/g) || []).join(" | ")}`);
    expect(!/Stoneware mug<\/Heading>/.test(shop.slice(shop.indexOf("export function Shop"))), "no tile is written out in full on the page");
    const notes = page.locator(".bd-code[open] .bd-code-notes");
    expect(/Left out of the code \(1\)/.test(await notes.locator("summary").textContent()), "the dialog says one instance has changes the code leaves out");
    await notes.locator("summary").click();
    const said = await notes.innerText();
    expect(/Featured \(ProductTile\): a different set of layers inside; its own surface/.test(said), `and names them, got ${said}`);
    await page.keyboard.press("Escape");
    ok("Shop exports ProductTile({ title, glaze }) and SaleBadge once, three calls with the changed texts as props, and the dialog lists what Featured loses");

    await page.evaluate(() => window.__builder.select(["b0"]));
    const one = await exportCode();
    expect(/^import \{ Badge, Button, Heading, Text \}/.test(one) && /export function ProductTile\(\{ title = "Stoneware mug", glaze = "Fern glaze" \}\)/.test(one) && !/export function (Part|Shop)/.test(one), `with an instance picked, the code is its component, got ${one.slice(0, 200)}`);
    await page.keyboard.press("Escape");
    ok("with one instance picked, the code is its component alone");

    await page.locator(".bd-flabel-btn", { hasText: "Poster" }).click();
    await page.evaluate(() => window.__builder.select([]));
    const poster = await exportCode();
    expect(/<div style=\{\{ position: "absolute", left: "calc\(var\(--dt-space-inset-2xs\) \* 20\)", top: "calc\(var\(--dt-space-inset-2xs\) \* 10\)"[^}]*\}\}>\s*<ProductTile \/>\s*<\/div>/.test(poster), `a placed instance is its call in a box that keeps its place, got ${poster.slice(poster.indexOf("export function Poster"))}`);
    expect(await page.locator(".bd-code[open] .bd-code-notes").count() === 0, "being placed isn't a change the code leaves out");
    await page.keyboard.press("Escape");
    ok("on Poster, the placed tile is <ProductTile /> in a positioned box, with nothing listed as left out");
    await page.close();
  });

  await step("At 390px: panels behind tabs, the toolbar inline, nothing wider than the screen", async () => {
    const phone = await open({ width: 390, height: 844 });
    expect(await phone.page.locator(".bd-tabs [role=tab]").count() === 3, "three panel tabs");
    expect(await phone.page.locator(".bd-center .bd-toolbar").count() === 1, "the toolbar is in the canvas pane on a phone");
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "the page should not scroll sideways");
    const fits = await phone.page.evaluate(() => ({ bottom: Math.round(document.querySelector(".layout").getBoundingClientRect().bottom), h: innerHeight, overflow: getComputedStyle(document.body).overflow, fab: !!document.querySelector(".fab") && getComputedStyle(document.querySelector(".fab")).display !== "none" }));
    expect(fits.bottom <= fits.h + 1 && fits.overflow === "hidden" && !fits.fab, `the builder fills the phone's screen with nothing below to scroll into and no floating menu button, got ${JSON.stringify(fits)}`);
    expect(await phone.frame().evaluate(() => innerWidth) === 390, "the default canvas on a phone is the phone frame");
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Add" }).click();
    await category(phone.page, "Actions");
    await phone.page.locator('.bd-tile[data-type="Button"]').click();
    expect(await phone.page.locator(".bd-tabs [role=tab][aria-selected=true]").textContent() === "Canvas", "adding returns to the canvas");
    await phone.frame().waitForSelector('[data-bf-type="Button"]');
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "still no sideways scroll");
    /* The page stays still, so the pane under the tabs scrolls: the
       inspector of a long block runs well past the screen. */
    await phone.page.evaluate(() => { const r = window.__builder.doc().frames[0].root; const long = r.children.find((c) => c.type === "FeatureGridBlock") || r.children[0]; window.__builder.select([long.id]); });
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Edit" }).click();
    await phone.page.waitForSelector(".bd-shell[data-pane=edit] .bd-right .bd-sec");
    const pane = await phone.page.evaluate(() => { const s = document.querySelector(".bd-shell"); const before = s.scrollHeight - s.clientHeight; s.scrollTop = 200; return { room: before, top: s.scrollTop, overflow: getComputedStyle(s).overflowY }; });
    expect(pane.overflow === "auto" && pane.room > 0 && pane.top > 0, `the Edit pane runs past the screen and scrolls, got ${JSON.stringify(pane)}`);
    ok(`tabs, inline toolbar, no overflow, a phone canvas, tap to add, and an Edit pane that scrolls (${pane.room}px more than the screen)`);
    await phone.page.close();
  });

  await step("page errors", () => {
    if (errors.length) throw new Error(errors.join("\n"));
    ok("no script or console errors");
  }, { last: true });

  await runAll();
} finally {
  await browser.close();
  server.close();
}

console.log(failures ? `\nbuilder check: ${failures} failure${failures === 1 ? "" : "s"}` : "\nbuilder check: passed");
process.exit(failures ? 1 : 0);
