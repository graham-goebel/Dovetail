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
   - at 390px the panels sit behind tabs and nothing is wider than the screen.

   Chromium comes from Playwright; set CHROMIUM_PATH to use a local binary. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

let failures = 0;
const ok = (m) => console.log(`  ok    ${m}`);
let stepNow = "";
/* On GitHub Actions a failure is also an annotation, so it reads from the
   checks page without opening the log. */
const fail = (m) => {
  failures++;
  console.log(`  FAIL  ${m}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Builder check::${(stepNow + ": " + m).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}`);
};
const expect = (cond, m) => { if (!cond) throw new Error(m); };
/* ONLY=<text> runs just the steps whose title has it, to work on one. */
async function step(title, fn) {
  if (process.env.ONLY && !title.includes(process.env.ONLY) && title !== "page errors") return;
  console.log(title);
  stepNow = title;
  try { await fn(); } catch (err) {
    if (process.env.DEBUG) console.log(err);
    /* A timeout doesn't say which wait it was; the line in this file does. */
    const at = /builder\.mjs:(\d+)/.exec((err && err.stack) || "");
    fail(String(err && err.message ? err.message : err).split("\n")[0] + (at && /Timeout/.test(String(err && err.message)) ? ` (line ${at[1]})` : ""));
  }
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
  page.on("pageerror", (e) => errors.push("script error: " + String(e.message || e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error" && !THIRD_PARTY.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });
  page.on("dialog", (d) => d.accept());
}

/* The canvas frames, in the order they sit on the canvas. */
const frames = (page) => page.frames().filter((f) => f.url().includes("builder-frame"));

async function open(viewport, { hash = "", store = null, before = null } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
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
  const x = at === "left" ? r.left + 20 : r.left + r.width / 2;
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
async function choose(page, fieldText, optionText) {
  await page.locator(".bd-right .bd-field", { hasText: fieldText }).first().locator(".bd-dd").first().click();
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
const tab = (page, name) => page.locator(".bd-itab", { hasText: name }).click();
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

  await step("Assets: five kinds, one named category at a time, search across all and clear it, live previews, grid and list", async () => {
    const kinds = await page.$$eval(".bd-assets [data-asset-kind] .bd-kind-name", (c) => c.map((x) => x.textContent));
    expect(kinds.join(",") === "Containers,Primitives,Variables,Components,Blocks,Templates", `Assets open on Containers, Primitives, Variables, Components, Blocks and Templates, got ${kinds.join(", ")}`);
    const heights = await page.$$eval(".bd-assets [data-asset-kind]", (c) => c.map((x) => Math.round(x.getBoundingClientRect().height)));
    expect(new Set(heights).size === 1, `the kind cards are all one height, got ${heights.join(", ")}`);
    await page.waitForFunction(() => ["components", "blocks", "primitives"].every((k) => document.querySelector(`.bd-assets [data-asset-kind="${k}"] .bd-thumb-stage`)));
    const pics = await page.$$eval(".bd-assets [data-asset-kind]", (c) => c.map((x) => x.getAttribute("data-asset-kind") + ":" + (x.querySelector(".bd-thumb-stage") ? "live" : x.querySelector(".bd-mini-frame, .bd-mini-swatch, .bd-mini-page") ? "drawn" : "icon")));
    expect(pics.every((p) => !p.endsWith(":icon")), `every kind card shows a picture of what it holds, not an icon, got ${pics.join(", ")}`);
    const fits = await page.$eval('.bd-assets [data-asset-kind="containers"] .bd-kind-pics', (el) => { const b = el.getBoundingClientRect(); return [...el.querySelectorAll(".bd-mini-frame")].every((f) => { const r = f.getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1; }); });
    expect(fits, "the Containers card's three frames fit inside it");
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
    ok("five kinds, categories are named, Blocks shows blocks, search finds Button and IconButton and clears, and the Button tile has a live preview");
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
    const at = await canvasPoint(page, '[data-bf-type="Heading"]');
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect((await page.locator(".bd-itab").allTextContents()).join(",") === "Appearance,Layout,Content", "the inspector has Appearance, Layout and Content tabs");
    expect(await page.locator(".bd-itab[aria-selected=true]").textContent() === "Content" && await page.locator(".bd-ipanel .bd-field-label", { hasText: /^Text$/ }).count() === 1, "Content opens first, with the Text field");
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
    await pick(page, "Height", "control-lg × 2");
    await pick(page, "Min width", "control-lg × 3");
    await frame().waitForFunction(() => { const s = document.querySelector('[data-bf-type="Heading"]').firstElementChild.style; return s.height === "calc(var(--dt-size-control-lg) * 2)" && s.minWidth === "calc(var(--dt-size-control-lg) * 3)"; });
    const hLabel = await dd(page, "Height").locator(".bd-dd-label").textContent();
    expect(/^\d+ ×2$/.test(hLabel), `the size grid gives the px, then the step briefly, got ${hLabel}`);
    ok("Height and Min width, from the size grid, are multiples of --dt-size-control-lg");
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
    const box = await page.locator(".bd-code:not(.bd-import):not(.bd-new):not(.bd-comp-dlg):not(.bd-projects):not(.bd-versions):not(.bd-acct)").boundingBox();
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
    await tab(page, "Appearance");
    await choose(page, /^Variant/, /^ghost$/);
    await frame().waitForFunction(() => { const bs = [...document.querySelectorAll('[data-bf-type="Button"] button')]; return bs.length === 2 && bs.every((b) => getComputedStyle(b).backgroundColor === "oklch(0 0 0 / 0)" || getComputedStyle(b).backgroundColor === "rgba(0, 0, 0, 0)"); });
    ok("two Buttons selected read \"2 Buttons\"; setting Variant ghost, under Appearance, changes both");
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

  await page.close();

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
    expect(await current() === "Content", `an Image opens on Content, got ${await current()}`);
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
    expect(padGroups[0] === "Layout layers", `a Section's padding starts with the layout layers, got ${padGroups.join(", ")}`);
    expect(padPx.length > 4 && padPx.every((v) => /^\d+$/.test(v)), `each padding option shows its px, got ${padPx.slice(0, 6).join(", ")}`);
    await page.keyboard.press("Escape");
    ok(`a Section opens on Layout, and its padding offers ${padGroups.join(", ")}, each with its px`);

    await tab(page, "Appearance");
    await choose(page, "Tone", "brand-muted");
    await category(page, "Actions");
    await page.locator('.bd-tile[data-type="Button"]').click();
    await frame().waitForSelector('[data-bf-type="Section"] [data-bf-type="Button"]');
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    expect(await current() === "Content", `a Button opens on Content, got ${await current()}`);
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
    ok(`Shift and a hover show the space between two items ("${said}"); its label opens the Stack's gap, and letting go clears it`);

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
    expect(findIn((await lastFrame()).root, "Heading").props.size === "display-sm", "Shift+Up three times takes a heading-lg Heading to display-sm");
    await page.keyboard.press("Shift+ArrowDown");
    expect(findIn((await lastFrame()).root, "Heading").props.size === "heading-xl", "Shift+Down takes it back to heading-xl");
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
    await tab(page, "Appearance");
    await page.locator(".bd-right .bd-field", { hasText: "Tone" }).locator(".bd-dd").first().click();
    const swatches = await page.locator(".bd-dd-list .bd-sw").count();
    await page.keyboard.press("Escape");
    expect(swatches >= 5, `the tone list shows a swatch for each colour, got ${swatches}`);
    expect(await page.locator(".bd-right .bd-field", { hasText: "Invert colours" }).count() === 0 && await page.locator(".bd-right .bd-field", { hasText: "Text colour" }).count() === 0, "a Badge has neither Invert colours (pictures only) nor Text colour (text only)");
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
    expect(["Variables", "Primitives", "Styles"].every((x) => secs.includes(x)) && !secs.includes("Frames"), `with nothing selected the inspector shows Variables, Primitives and Styles, got ${secs.join(", ")}`);
    const tint = await page.locator(".bd-sys-sw").first().evaluate((el) => el.style.background);
    expect(tint && !/var\(/.test(tint), `the colour swatches show the frame's own colours, got ${tint}`);
    const before = (await saved()).frames[0].root.children.length;
    /* The whole system, not only what's in the project. */
    await page.locator(".bd-right .bd-seg-btn", { hasText: "Everything" }).click();
    await page.locator('.bd-sys-prim[data-type="Stack"]').click();
    await poll(async () => (await saved()).frames[0].root.children.length, (n) => n === before + 1);
    ok(`a press on the canvas lets go of everything; the inspector then shows Variables, Primitives and Styles (sections: ${secs.join(", ")}), and a primitive adds itself`);

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
    await page.locator(".bd-right .bd-seg-btn", { hasText: "Everything" }).click();
    const rows = await page.$$eval(".bd-right .bd-sys-list .bd-sys-item", (r) => r.map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
    expect(rows.length > 10 && rows.every(([w, h]) => w > 200 && h < 56), `variables, primitives and styles list as full-width rows, got ${rows.length} rows, first ${JSON.stringify(rows[0])}`);
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
    expect(flat.items === 5 && flat.covers === 5 && flat.live === 0 && /coverflow · 5 items/.test(flat.head), `while editing, the items lie flat with nothing moving, got ${JSON.stringify(flat)}`);
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
    await choose(page, "Layout", "ring");
    await frame().waitForFunction(() => /ring · 5 items/.test(document.querySelector(".bf-carousel-head").textContent));
    await tab(page, "Appearance");
    expect(await page.locator(".bd-right .bd-field", { hasText: "Pace" }).first().locator(".bd-dd").count() === 1, "Pace is a set of steps, not a number box");
    await choose(page, "Pace", "1.5×");
    c = await carousel();
    expect(c.props.layout === "ring" && c.props.pace === 1.5, `layout and pace are set, got ${JSON.stringify(c.props)}`);
    expect(!(await labels(page)).some((l) => /^(Value|Paused)$/.test(l)), "value and paused, which an app drives, aren't offered");
    ok("its Layout tab sets ring, Pace steps to 1.5×, and value and paused aren't offered");

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
    expect(/<Carousel[^>]*layout="ring"[^>]*>\s*<Cover[^]*<Heading[^]*<\/Carousel>/.test(code) && /import \{[^}]*Carousel[^}]*\}/.test(code), `the export writes the items as the Carousel's children, got ${code.slice(0, 200)}`);
    ok("Code writes <Carousel layout=\"ring\" …> with its Covers and the Heading inside");

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
    expect(await page.locator('.bd-toolbar [aria-label="Projects"]').count() === 0 && await page.locator(".bd-shell[inert]").count() === 1 && (await page.locator(".bd-toolbar .bd-tb-home").textContent()) === "Projects", "Home is a page over the canvas, named in the bar, with the canvas inert beneath");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".bd-home") && !document.querySelector(".bd-shell[inert]"));
    ok("Home opens from the rail as a page over the canvas, and Escape goes back to it");
    await openHome();
    const listed = await cards(), meta0 = await page.locator(".bd-proj.is-current .bd-proj-meta").textContent();
    expect(listed.join() === "Kiln site" && /Open now/.test(meta0), `the home lists the one project, marked open now, got ${listed} / ${meta0}`);
    await page.locator(".bd-projects .bd-btn-primary", { hasText: "New project" }).click();
    await page.waitForFunction((id) => window.__builder.project().id !== id && !document.querySelector(".bd-home"), first.id);
    await ready();
    expect(await page.locator(".bd-project-name").textContent() === "Untitled" && types(await doc()) === "", "New project opens a blank canvas of its own");
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    expect(await history(page).undo.isEnabled(), "an edit can be undone");
    ok("New project opens a blank canvas, and a Heading goes onto it");

    await openHome();
    expect((await cards()).length === 2, "two projects now");
    await page.locator(".bd-proj", { hasText: "Kiln site" }).locator(".bd-proj-open").click();
    await page.waitForFunction((id) => window.__builder.project().id === id, first.id);
    await ready();
    await frame().waitForSelector('[data-bf-type="HeroBlock"]');
    expect(/HeroBlock/.test(types(await doc())) && !/Heading/.test(types(await doc())) && await history(page).undo.isDisabled(), "Kiln site opens as it was, with a fresh history");
    ok("opening Kiln site from the home brings its own canvas back, with nothing to undo from the other project");

    await openHome();
    await page.locator('.bd-proj [aria-label="Duplicate Kiln site"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-projects .bd-proj").length === 3);
    expect((await cards()).includes("Kiln site copy"), "Duplicate makes Kiln site copy");
    await page.locator('.bd-proj [aria-label="Delete Kiln site copy"]').click();
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
    await page.locator(".bd-projects .bd-btn-primary", { hasText: "New project" }).click();
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
    await page.locator('.bd-proj input[type=file][aria-label="Choose a picture for Untitled"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
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

    const varIcon = await page.locator('.bd-assets [data-asset-kind="variables"] .bd-kind-pics .bd-mini-swatch').count();
    expect(varIcon >= 4, "the Variables card in Assets shows the system's colours, as the others show what they hold");
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
    expect(data.version === 2 && data.pages.map((p) => p.name).join() === "Page 1,About" && /HeroBlock/.test(JSON.stringify(data.doc)), `the file carries every page, got ${JSON.stringify(data.pages && data.pages.map((p) => p.name))}`);
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
    const hb = heading && await page.evaluate((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); return i ? parseFloat(i.style.width) : 0; }, heading.name);
    const textW = heading && await page.evaluate((name) => { const i = [...document.querySelectorAll("iframe.bd-frame")].find((el) => el.title.indexOf("Frame " + name + ",") === 0); const h = i.contentDocument.querySelector("h1, h2, h3, h4"); const r = document.createRange(); r.selectNodeContents(h); return r.getBoundingClientRect().width; }, heading.name);
    expect(heading && hb > 140 && hb >= textW - 2, `a Heading put down loose is as wide as its text, got a box ${Math.round(hb)} wide for text ${Math.round(textW)} wide`);
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
    const gripOf = async (name) => { const g = await page.locator(".bd-page", { hasText: name }).locator(".bd-page-grip").boundingBox(); return { x: g.x + g.width / 2, y: g.y + g.height / 2 }; };
    await rail("Pages").click();
    await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 2);
    await page.locator('.bd-pages-panel [aria-label="Add a page"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-pages .bd-page").length === 3);
    expect((await names()).join() === "Page 1,Page 2,Page 3", `three pages to start, got ${await names()}`);
    const first = await page.locator(".bd-page", { hasText: "Page 1" }).boundingBox();
    await drag(page, await gripOf("Page 3"), { x: first.x + 60, y: first.y + 3 });
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-pages .bd-page-name")].map((x) => x.textContent).join() === "Page 3,Page 1,Page 2");
    ok("dragging Page 3 by its grip above Page 1 puts the pages in that order");

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

  await step("The project's own system: with nothing selected, variables, primitives and styles are the ones the project uses", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const clickStage = async () => {
      for (let tries = 0; tries < 4; tries++) {
        const pt = await page.evaluate(() => { const st = document.querySelector(".bd-stage").getBoundingClientRect(); for (let y = st.bottom - 20; y > st.top; y -= 30) for (let x = st.left + st.width / 2; x < st.right - 10; x += 30) { const el = document.elementFromPoint(x, y); if (el && (el.classList.contains("bd-stage") || el.classList.contains("bd-world"))) return { x, y }; } return null; });
        expect(pt, "there's empty canvas to click");
        await page.mouse.click(pt.x, pt.y);
        if (await page.locator(".bd-sys-prim, .bd-right .bd-sys-none, .bd-right .bd-sec-empty").first().waitFor({ timeout: 1500 }).then(() => true, () => false)) return;
      }
      throw new Error("a click on empty canvas should show the canvas settings");
    };
    const prims = () => page.locator(".bd-right .bd-sys-prim").evaluateAll((els) => els.map((x) => x.getAttribute("data-type")));
    await frame().waitForSelector('[data-bf-type="HeroBlock"]');
    await clickStage();
    expect(await page.locator('.bd-right .bd-seg-btn[aria-pressed="true"]', { hasText: "In this project" }).count() === 1, "the inspector starts on what's in this project");
    /* The primitives on the canvas, however deep (a hero's buttons sit in an Inline). */
    const placed = () => page.evaluate(() => { const out = new Set(); (function w(n) { (n.children || []).forEach((c) => { out.add(c.type); w(c); }); })(window.__builder.doc().frames[0].root); return [...out]; });
    const before = await prims();
    const has = await placed();
    expect(before.every((t) => has.includes(t)) && !before.includes("Heading") && !before.includes("Stack"), `Primitives lists only what's placed, got ${before}`);
    const textStyles = await page.locator('.bd-right .bd-sys-row:has(.bd-sys-label:text-is("Text")) .bd-sys-item').count();
    expect(textStyles >= 1, `the hero's title style is listed, got ${textStyles} text styles`);
    await category(page, "Typography");
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await frame().waitForSelector('[data-bf-type="Heading"]');
    await clickStage();
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-right .bd-sys-prim")].some((x) => x.getAttribute("data-type") === "Heading"));
    const after = await prims();
    expect(after.includes("Heading") && after.length === before.length + 1, `with a Heading placed, Primitives adds the Heading, got ${after}`);
    await page.locator(".bd-right .bd-seg-btn", { hasText: "Everything" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-right .bd-sys-prim").length > 3);
    ok(`with nothing selected the inspector lists what this project uses: ${before.join(", ") || "no primitives"} on the landing page, then the Heading too once one's placed, and ${textStyles} text style(s); Everything shows the whole system again`);
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
    await page.locator('.bd-brand-sec:has(#bd-brand-mark) .bd-btn', { hasText: "Remove" }).click();
    await page.waitForFunction(() => window.__builder.project().theme.brand.mark === "");
    await page.locator(".bd-gallery-head [aria-label='Back to Content']").click();
    expect(/Logo/.test(await card.textContent()) && await card.locator("img").count() === 1, `back in Content the Brand card shows the logo, got ${await card.textContent()}`);
    ok("a logo file replaces the name: pressed, it adds an uncropped Image named Logo with the name as its alt; removing the mark saves that too, and the Brand card shows what's set");
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
  });

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
    const themed = await open({ width: 1280, height: 900 }, { store: { "dovetail-theme-config": JSON.stringify({ vars: { "--dt-surface-subtle": "rgb(255, 0, 0)", "--dt-surface-base": "rgb(0, 0, 255)" } }) } });
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
    await page.keyboard.press("Alt+KeyW");
    const tops = await poll(async () => [await at("ba"), await at("bb"), await at("hc")], (v) => v.every((p) => p[1] === 0));
    expect(tops.every((p) => p[1] === 0), `Alt+W lines their tops up, got ${JSON.stringify(tops)}`);
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
    const pull = async (dir, dx, dy, hold) => {
      const hb = await page.locator(".bd-mark-sel .bd-handle.is-" + dir).boundingBox();
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
    await pull("e", 90, 0);
    const grown = await node();
    const sizes = await page.evaluate(() => ({ w: window.DovetailBuilderData.tokens.w.options.map((o) => o.value), h: window.DovetailBuilderData.tokens.height.options.map((o) => o.value) }));
    expect(sizes.w.includes(grown.style.w), `the width becomes a size token, got ${JSON.stringify(grown.style.w)}`);
    const w1 = await widthOf();
    expect(w1 > w0 + 20, `and the Button is wider on the canvas, ${Math.round(w0)} to ${Math.round(w1)}`);
    expect((await steps(page)).past === stepsR + 1, "the whole pull is one undo step");
    const x1 = grown.style.x;
    await pull("w", -60, 0);
    const left = await node();
    expect(left.style.x < x1 && sizes.w.includes(left.style.w), `pulling the left edge moves a free object as it grows: x ${x1} to ${left.style.x}, width ${left.style.w}`);
    await pull("se", 40, 40, "Shift");
    const kept = await node();
    expect(sizes.w.includes(kept.style.w) && sizes.h.includes(kept.style.height), `Shift on a corner sets both width and height tokens, got ${kept.style.w} × ${kept.style.height}`);
    ok(`handles resize to tokens: ${grown.style.w} wide, then the left edge moved it, then a Shift corner gave ${kept.style.w} × ${kept.style.height}`);

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
    await gammaRow.locator(".bd-layer-flag[aria-label^='Show']").click();
    expect(!(await poll(() => flag("hc"), (v) => !v.hide)).hide, "the eye on the row shows it again");
    await frames(page)[1].waitForSelector('[data-bf-id="hc"]');
    await page.evaluate(() => window.__builder.select(["bb"]));
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
    ok("hide takes a layer off the canvas and out of the code; lock keeps the canvas and the arrows off it; the row's eye and lock turn both back");

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

    /* Opacity: the digit keys step it through the four roles, 0 makes it
       opaque; the frame paints the token; the Layer section offers it. */
    await page.evaluate(() => window.__builder.select(["ba"]));
    await release(page);
    await page.keyboard.press("Digit5");
    const op = async () => ((await free()).root.children.find((c) => c.id === "ba").style.opacity);
    expect(await poll(op, (v) => v === "disabled") === "disabled", `5 sets the opacity role disabled, got ${await op()}`);
    await frames(page)[1].waitForFunction(() => getComputedStyle(document.querySelector('[data-bf-id="ba"]').firstElementChild).opacity === "0.4");
    ok("the canvas paints --dt-opacity-disabled as 0.4");
    await page.keyboard.press("Digit9");
    expect(await poll(op, (v) => v === "strong") === "strong", "9 is strong");
    await page.keyboard.press("Digit0");
    expect(await poll(op, (v) => v === undefined) === undefined, "0 makes it opaque again");
    await tab(page, "Appearance");
    expect(await page.locator(".bd-right .bd-field", { hasText: /^Opacity/ }).count() === 1, "the Layer section offers an Opacity dropdown");
    ok("digits 1 to 9 step the opacity through ghost, disabled, muted and strong; 0 clears it; the canvas paints the token");

    /* Copy and paste style: Alpha's size tokens land on Gamma. Select all
       of a kind: every Button in the frame. */
    await page.evaluate(() => window.__builder.select(["ba"]));
    await release(page);
    const alpha = (await free()).root.children.find((c) => c.id === "ba");
    expect(alpha.style.w && alpha.style.height, `Alpha carries size tokens to copy, got ${JSON.stringify(alpha.style)}`);
    await page.keyboard.press("Control+Alt+KeyC");
    await page.evaluate(() => window.__builder.select(["hc"]));
    const gammaBefore = (await free()).root.children.find((c) => c.id === "hc");
    const stepsP = (await steps(page)).past;
    await page.keyboard.press("Control+Alt+KeyV");
    const gamma = await poll(async () => (await free()).root.children.find((c) => c.id === "hc"), (n) => n.style.w === alpha.style.w);
    expect(gamma.style.w === alpha.style.w && gamma.style.height === alpha.style.height && gamma.style.x === gammaBefore.style.x && gamma.style.y === gammaBefore.style.y, `paste style gives Gamma Alpha's tokens and leaves its position, got ${JSON.stringify(gamma.style)} from ${JSON.stringify(gammaBefore.style)}`);
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
    await tab(page, "Layout");
    const fields = await page.$$eval(".bd-right .bd-field-label", (l) => l.map((x) => x.textContent.trim()));
    expect(fields.some((f) => /Spacing top/i.test(f)) && fields.some((f) => /Spacing bottom/i.test(f)) && fields.some((f) => /Bleed/i.test(f)), `a block's Layout tab offers Spacing top, Spacing bottom and Bleed, got ${fields.join(", ")}`);
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

  await step("At 390px: panels behind tabs, the toolbar inline, nothing wider than the screen", async () => {
    const phone = await open({ width: 390, height: 844 });
    expect(await phone.page.locator(".bd-tabs [role=tab]").count() === 3, "three panel tabs");
    expect(await phone.page.locator(".bd-center .bd-toolbar").count() === 1, "the toolbar is in the canvas pane on a phone");
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "the page should not scroll sideways");
    expect(await phone.frame().evaluate(() => innerWidth) === 390, "the default canvas on a phone is the phone frame");
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Add" }).click();
    await category(phone.page, "Actions");
    await phone.page.locator('.bd-tile[data-type="Button"]').click();
    expect(await phone.page.locator(".bd-tabs [role=tab][aria-selected=true]").textContent() === "Canvas", "adding returns to the canvas");
    await phone.frame().waitForSelector('[data-bf-type="Button"]');
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "still no sideways scroll");
    ok("tabs, inline toolbar, no overflow, a phone canvas, and tap to add");
    await phone.page.close();
  });

  await step("page errors", () => {
    if (errors.length) throw new Error(errors.join("\n"));
    ok("no script or console errors");
  });
} finally {
  await browser.close();
  server.close();
}

console.log(failures ? `\nbuilder check: ${failures} failure${failures === 1 ? "" : "s"}` : "\nbuilder check: passed");
process.exit(failures ? 1 : 0);
