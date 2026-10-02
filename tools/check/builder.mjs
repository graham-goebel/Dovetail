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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

let failures = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const expect = (cond, m) => { if (!cond) throw new Error(m); };
async function step(title, fn) {
  console.log(title);
  try { await fn(); } catch (err) { fail(String(err && err.message ? err.message : err).split("\n")[0]); }
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

async function open(viewport, { hash = "", store = null } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(8000);
  watch(page);
  await page.goto(server.origin + "/builder.html");
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
const row = (page, name) => page.locator(`.bd-layer[data-layer]:has(.bd-layer-name:text-is("${name}")) .bd-layer-main`);
const tab = (page, name) => page.locator(".bd-itab", { hasText: name }).click();
/* Assets open on five kinds; a category lives in one of them. */
const KIND_OF = { Layout: "primitives", Typography: "primitives", Blocks: "blocks" };
async function category(page, name) {
  const kind = KIND_OF[name] || "components";
  const clear = page.locator(".bd-assets .bd-search-clear");
  if (await clear.count()) await clear.click();
  if (!(await page.locator(".bd-assets [data-asset-kind]").count())) {
    const here = ((await page.locator(".bd-assets .bd-panel-title").textContent()) || "").toLowerCase();
    if (here !== kind) await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
  }
  const card = page.locator(`.bd-assets [data-asset-kind="${kind}"]`);
  if (await card.count()) await card.click();
  if (kind !== "blocks") await page.locator(".bd-cat", { hasText: name }).click();
}
const camera = (page) => page.evaluate(() => document.querySelector(".bd-world").style.transform);
const dd = (page, label) => page.locator(`.bd-right .bd-dd[aria-label="${label}"]`).first();
async function pick(page, label, optionText) {
  await dd(page, label).click();
  await option(page, optionText).click();
}
const labels = (page) => page.$$eval(".bd-flabel-name", (n) => n.map((x) => x.textContent));
/* New, then Template, then one of them: a starter replaces every frame. */
async function startFrom(page, label) {
  await page.locator(".bd-start").click();
  await page.locator(".bd-new-kind", { hasText: "Template" }).click();
  await page.locator(".bd-new-item", { hasText: label }).click();
}
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
    expect(kinds.join(",") === "Primitives,Variables,Components,Blocks,Templates", `Assets open on Primitives, Variables, Components, Blocks and Templates, got ${kinds.join(", ")}`);
    const heights = await page.$$eval(".bd-assets [data-asset-kind]", (c) => c.map((x) => Math.round(x.getBoundingClientRect().height)));
    expect(new Set(heights).size === 1, `the kind cards are all one height, got ${heights.join(", ")}`);
    await category(page, "Actions");
    const named = await page.$$eval(".bd-cat", (c) => c.map((x) => x.querySelector(".bd-cat-label")?.textContent || ""));
    expect(named.length >= 8 && named.every(Boolean) && !named.includes("Blocks") && !named.includes("Layout"), `every component category carries its name, without the primitives' or blocks', got ${named.join(", ")}`);
    await category(page, "Blocks");
    const blocks = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(blocks.includes("HeroBlock") && !blocks.includes("Button"), "the Blocks category should show blocks only");
    await page.locator(".bd-assets input[type=search]").fill("button");
    const found = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(found.includes("Button") && found.includes("IconButton"), `search should span categories, got ${found.join(", ")}`);
    await page.locator(".bd-assets .bd-search-clear").click();
    expect(await page.locator(".bd-assets input[type=search]").inputValue() === "" && await page.locator(".bd-search-clear").count() === 0, "the clear button empties the search and goes away");
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
    const actions = await page.$$eval(".bd-inspect-head .bd-head-actions [aria-label]", (b) => b.map((x) => x.getAttribute("aria-label")));
    expect(actions.join("|") === "Wrap in|Group (Ctrl+G)|Copy a link to this layer", `the head offers only Wrap, Group and a link for a Heading, got ${actions.join("|")}`);
    const stage = await page.locator(".bd-stage").boundingBox();
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
    const box = await page.locator(".bd-code:not(.bd-import):not(.bd-new)").boundingBox();
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
    await page.locator(".bd-toolbar .bd-tool-group .bd-act").first().click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]')?.textContent !== "Typed here");
    ok("undo puts the heading back");
  });

  await step("The canvas pans and zooms, frames sit side by side and take a width and height", async () => {
    await page.locator(".bd-zoom").click();
    await option(page, /^100%$/).click();
    await page.waitForFunction(() => /scale\(1\)$/.test(document.querySelector(".bd-world").style.transform));
    await page.keyboard.press("Control+0");
    await page.waitForFunction(() => !/scale\(1\)$/.test(document.querySelector(".bd-world").style.transform));
    ok("zoom 100% scales the canvas to 1; Ctrl+0 fits it again");
    const stage = await page.locator(".bd-stage").boundingBox();
    const before = await camera(page);
    await page.mouse.move(stage.x + 8, stage.y + stage.height - 8);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction((b) => document.querySelector(".bd-world").style.transform !== b, before);
    const panned = await camera(page);
    await page.mouse.move(stage.x + 8, stage.y + stage.height - 8);
    await page.mouse.down();
    await page.mouse.move(stage.x + 120, stage.y + stage.height - 60, { steps: 5 });
    await page.mouse.up();
    expect(await camera(page) !== panned, "dragging the empty canvas pans it");
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await page.waitForFunction((p) => { const m = /scale\(([\d.]+)\)/.exec(document.querySelector(".bd-world").style.transform); return m && Number(m[1]) !== Number(/scale\(([\d.]+)\)/.exec(p)[1]); }, panned);
    ok("the wheel and a drag on empty canvas pan it; Ctrl and the wheel zoom");
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
    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frame(1).waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    expect(/^Saved/.test(await page.locator(".bd-saved").evaluate((el) => el.getAttribute("title") || el.getAttribute("data-tip"))), "the toolbar should say it saved");
    ok("after a reload both frames and their content are still there, and the toolbar says Saved");
  });

  await step("Tab hides the panels, and so does preview", async () => {
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.querySelector(".bd-left").hidden && document.querySelector(".bd-right").hidden);
    await page.locator(".bd-float", { hasText: "Show panels" }).click();
    await page.waitForFunction(() => !document.querySelector(".bd-left").hidden);
    ok("Tab hides both side panels; Show panels brings them back");
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
    await page.locator(".bd-layers-panel input[type=search]").fill("stats");
    expect((await layerNames(page)).join(" ") === "1:Proof 2:StatsBlock", `the filter keeps matches and their parents, got ${(await layerNames(page)).join(" ")}`);
    await page.locator(".bd-layers-panel input[type=search]").press("Escape");
    expect(await page.locator(".bd-layers-panel input[type=search]").inputValue() === "", "Escape clears the filter");
    ok("the layer filter narrows to StatsBlock and its group, and Escape clears it");

    await fitAll(page);
    const from = await canvasPoint(page, '[data-bf-type="HeroBlock"]');
    const to = await canvasPoint(page, '[data-bf-type="FeatureGridBlock"]', "bottom");
    await drag(page, from, to);
    const order = (await layerNames(page)).filter((n) => n.startsWith("1:")).map((n) => n.slice(2));
    expect(order.indexOf("HeroBlock") > order.indexOf("FeatureGridBlock"), `pressing on the hero and dragging should move it, got ${order.join(" ")}`);
    ok("pressing anywhere on a canvas node and dragging moves it");

    await row(page, "HeroBlock").click();
    await page.locator('.bd-right [aria-label="Detach into primitives"]').click();
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
    await page.locator(".bd-tray-item", { hasText: "Frame" }).click();
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frame(1).waitForFunction(() => !!window.BuilderFrame && !!document.querySelector('[data-bf-slot="root"]'));
    await fitAll(page);
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await page.locator(".bd-layer-frame .bd-layer-main").first().click();
    await row(page, "Proof").click();
    const tag = await page.locator(".bd-mark-tag").boundingBox();
    const empty = await canvasPoint(page, '[data-bf-slot="root"]', "center", 1);
    await drag(page, { x: tag.x + 6, y: tag.y + 6 }, empty);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    expect(saved.frames[1].root.children.map((c) => c.name || c.type).join() === "Proof" && !saved.frames[0].root.children.some((c) => c.name === "Proof"), "the Group moves from the first frame to the second");
    await frame(1).waitForSelector('[data-bf-type="Group"] [data-bf-type="StatsBlock"]');
    expect(await page.locator(".bd-flabel.is-current .bd-flabel-name").textContent() === "Frame 2", "the frame it landed in becomes active");
    ok("a node drags from one frame into another, and that frame becomes active");
    await page.close();
  });

  await step("Tools add primitives straight away, and land where they are dropped", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    expect(await page.locator(".bd-tools-row > .bd-tool").count() === 4, "one Select/Hand button and three groups in the bar, with no shapes");
    const trays = {};
    for (const g of ["Layout", "Text", "Images and media"]) {
      await page.locator(`.bd-tool-group[aria-label^="${g},"]`).click();
      trays[g] = await page.$$eval(".bd-tray-item", (b) => b.map((x) => x.querySelector(".bd-tray-label").textContent + (x.getAttribute("aria-disabled") ? "*" : "")));
      await page.locator(`.bd-tool-group[aria-label^="${g},"]`).click();
    }
    expect(trays.Layout.join() === "Group,Section,Frame,Page", `the Layout tray, got ${trays.Layout}`);
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
    await page.mouse.click((await page.locator(".bd-stage").boundingBox()).x + 20, (await page.locator(".bd-stage").boundingBox()).y + 20);
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
    await page.locator(".bd-tray-item", { hasText: "Page" }).click();
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
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
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
    const stage = await page.locator(".bd-stage").boundingBox();
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
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const rail = (name) => page.locator(".bd-rail .bd-tab", { hasText: name });

    const tabs = await page.$$eval(".bd-rail .bd-tab", (b) => b.map((x) => x.textContent));
    expect(tabs.join() === "Assets,Layers,Content,Configure", `the rail holds Assets, Layers, Content and Configure, got ${tabs}`);
    const dupes = await page.locator(".bd-toolbar [aria-label='New frame'], .bd-toolbar [aria-label='Dark mode'], .bd-toolbar .bd-frame-size").count();
    expect(dupes === 0, "the top bar no longer repeats New frame, the frame size or dark mode");
    await rail("Configure").click();
    await page.waitForSelector(".bd-config-dock .configure-sheet.is-docked .configure-row");
    expect(await page.evaluate(() => { const b = document.querySelector(".configure-bar"); return !b || getComputedStyle(b).display === "none"; }), "the floating Configure button is gone on this page");
    await page.locator(".bd-config-dock .configure-row", { hasText: "Color" }).click();
    await page.locator(".bd-config-dock [data-bid='back']").waitFor();
    await rail("Assets").click();
    expect(await page.evaluate(() => { const s = document.querySelector(".configure-sheet"); return s.parentElement === document.body && s.hidden; }), "leaving Configure puts the sheet away");
    ok("the rail switches Assets, Layers, Content and Configure; Configure sits in the panel, and the top bar has no duplicates");

    await startFrom(page, "Blank frame");
    await emptyFrame(page);
    await rail("Content").click();
    expect((await page.locator(".bd-kind .bd-kind-name").allTextContents()).join(",") === "Images,Illustrations,Icons,Video", "Content opens on a card for each kind");
    await page.locator('.bd-kind[data-kind="images"]').click();
    await page.locator(".bd-gallery-head", { hasText: "Images" }).waitFor();
    const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 160; c.height = 120; const x = c.getContext("2d"); x.fillStyle = "#f3f2ee"; x.fillRect(0, 0, 160, 120); x.fillStyle = "#a01010"; x.beginPath(); x.arc(80, 60, 36, 0, 7); x.fill(); return c.toDataURL("image/png"); });
    await page.setInputFiles("#bd-lib-file", { name: "red-dot.png", mimeType: "image/png", buffer: Buffer.from(png.split(",")[1], "base64") });
    await page.waitForSelector(".bd-lib-item");
    await page.locator(".bd-lib-menu").first().click();
    await option(page, "Remove background").click();
    await page.waitForFunction(() => /Background removed/.test(document.querySelector('.visually-hidden[role="status"]')?.textContent || ""), null, { timeout: 10000 });
    const lib = await page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder-library")));
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

    await page.mouse.click((await page.locator(".bd-stage").boundingBox()).x + 20, (await page.locator(".bd-stage").boundingBox()).y + 20);
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
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const heroOf = (d) => d.frames[0].root.children.find((c) => c.type === "HeroBlock");
    await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("dovetail-builder") || "null"); const h = d && d.frames[0].root.children.find((c) => c.type === "HeroBlock"); return h && h.children && h.children.some((c) => c.type === "Slot"); });
    let hero = heroOf(await saved());
    const names = hero.children.map((c) => c.props.name);
    expect(names.includes("actions") && names.includes("media"), `the hero's slots come from its types, got ${names}`);
    ok(`a HeroBlock on the canvas gets its slots (${names.join(", ")}) filled from its sample`);

    const pt = await frame().evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Shop the collection/.test(x.textContent)); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const ib = await page.locator("iframe.bd-frame").boundingBox();
    const sc = await page.evaluate(() => { const i = document.querySelector("iframe.bd-frame"); return i.getBoundingClientRect().width / parseFloat(i.style.width); });
    await page.mouse.click(ib.x + pt.x * sc, ib.y + pt.y * sc);
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
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

    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await frame().waitForFunction(() => [...document.querySelectorAll("button")].some((x) => /Shop the collection/.test(x.textContent)));
    hero = heroOf(await saved());
    expect(hero.children.filter((c) => c.type === "Slot").length === 2, "the slots survive a reload");
    ok("the slots and what's in them survive a reload");

    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    const heroRow = await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("HeroBlock"))').first().boundingBox();
    const ctaRow = await row(page, "CtaBlock").first().boundingBox();
    await drag(page, { x: ctaRow.x + 30, y: ctaRow.y + ctaRow.height / 2 }, { x: heroRow.x + 60, y: heroRow.y + heroRow.height / 2 });
    const order = (await layerNames(page)).filter((n) => n.startsWith("1:"));
    expect(Math.abs(order.indexOf("1:CtaBlock") - order.indexOf("1:HeroBlock")) === 1, `a row dropped on the middle of the hero's row lands beside it, since the hero only holds its slots, got ${order.join(" ")}`);
    ok("a layer dropped on the middle of the hero's row lands beside it rather than being refused");
    await page.close();
  });

  await step("Lists: a block's items edit one by one, add, move and go, and export as its prop", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const items = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")).frames[0].root.children.find((c) => c.type === "FaqBlock").props.items);
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

    await page.locator(".bd-assets input[type=search]").fill("Navbar");
    await page.locator('.bd-tile[data-type="Navbar"]').click();
    await frame().waitForSelector('[data-bf-type="Navbar"]');
    await tab(page, "Content");
    const href = page.locator(".bd-list-item.is-open .bd-list-field", { hasText: "Href" }).locator("input");
    await href.fill("");
    await href.pressSequentially("https://example.com/shop");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("dovetail-builder")).frames[0].root.children.find((c) => c.type === "Navbar").props.links[0].href === "https://example.com/shop");
    await href.fill("javascript:alert(1)");
    expect(await href.getAttribute("aria-invalid") === "true", "an unsafe link shows as invalid");
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")).frames[0].root.children.find((c) => c.type === "Navbar").props.links[0].href);
    expect(kept === "https://example.com/shop", `an unsafe link isn't kept, got ${kept}`);
    await page.locator(".bd-assets .bd-search-clear").click();
    ok("a Navbar link's href types in a letter at a time, and javascript: shows invalid and isn't kept");

    await page.reload();
    await page.waitForSelector(".bd-assets", { state: "attached" });
    await page.waitForFunction(() => /Do the mugs survive a dishwasher\?/.test(document.querySelector("iframe.bd-frame")?.contentDocument?.body?.textContent || ""));
    ok("the edited list survives a reload");
    await page.close();
  });

  await step("v8: New (freeform, structured, template), clipboard, selection code, type scale, loose objects, builder settings, parts in layers, export and the inspector's additions", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const lastFrame = async () => { const d = await saved(); return d.frames[d.frames.length - 1]; };
    const pickFrame = async (name) => {
      await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
      await page.locator(".bd-layer-frame .bd-layer-main", { hasText: name }).first().click();
      await page.waitForTimeout(150);
    };
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("dovetail-builder") || "null"); return d && d.frames[0].root.children[0].children; });

    await page.locator(".bd-start").click();
    expect((await page.locator(".bd-new-kind .bd-new-name").allTextContents()).join(",") === "Freeform canvas,Structured page,Template", "New offers a freeform canvas, a structured page and a template");
    await page.locator(".bd-new-kind", { hasText: "Structured page" }).click();
    let f = await lastFrame();
    expect(f.mode === "structured" && f.root.children[0].type === "Group", `a structured page starts with a Group, got ${JSON.stringify(f.root.children.map((c) => c.type))}`);
    await page.locator(".bd-rail .bd-tab", { hasText: "Assets" }).click();
    await page.locator(".bd-stage").click({ position: { x: 6, y: 600 } });
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

    const st = await page.locator(".bd-stage").boundingBox();
    await page.mouse.click(st.x + st.width - 10, st.y + st.height - 60);
    await page.waitForFunction(() => /^Canvas$/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.locator('.bd-stage-swatches .bd-seg-btn[aria-label="Dark grey"]').click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector(".bd-stage")).backgroundColor === "rgb(58, 58, 64)");
    await page.locator('.bd-stage-swatches .bd-seg-btn[aria-label="Default"]').click();
    ok("a press on the empty canvas shows the builder's own settings, and its background takes a colour");

    await page.locator(".bd-rail .bd-tab", { hasText: "Layers" }).click();
    await page.locator(".bd-layers-head [aria-label='Expand everything']").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-layer.is-part").length > 3);
    expect(await page.locator('.bd-layer:has(.bd-layer-name:text-is("Actions"))').count() > 0, "the hero's Actions slot is a row among its parts");
    expect(await page.locator(".bd-layer.is-part[aria-disabled=true] button").count() === 0, "a component's own parts can't be picked");
    await page.locator(".bd-layers-head [aria-label='Collapse everything']").click();
    expect(await page.locator(".bd-layer").count() === (await saved()).frames.length, "Collapse everything leaves a row per frame");
    ok("Layers shows a component's own parts, disabled, with its slots in place; everything expands and collapses at once");

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
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("dovetail-builder")).frames[0].lock === true);
    const before = await firstFrame();
    await page.locator("input[aria-label='Frame width']").fill(String(Math.round(before.width / 2)));
    await page.keyboard.press("Enter");
    await page.waitForFunction((w) => JSON.parse(localStorage.getItem("dovetail-builder")).frames[0].width !== w, before.width);
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
    await page.locator(".bd-assets input[type=search]").fill("Badge");
    await page.locator('.bd-tile[data-type="Badge"]').click();
    await page.locator(".bd-assets .bd-search-clear").click();
    await tab(page, "Appearance");
    await page.locator(".bd-right .bd-field", { hasText: "Tone" }).locator(".bd-dd").first().click();
    const swatches = await page.locator(".bd-dd-list .bd-sw").count();
    await page.keyboard.press("Escape");
    expect(swatches >= 5, `the tone list shows a swatch for each colour, got ${swatches}`);
    await choose(page, "Blend mode", "Multiply");
    await frames(page)[0].waitForFunction(() => { const b = [...document.querySelectorAll('[data-bf-type="Badge"]')].pop(); return getComputedStyle(b.firstElementChild).mixBlendMode === "multiply"; });
    await page.locator(".bd-right .bd-field", { hasText: "Invert colours" }).locator(".bd-switch").click();
    await frames(page)[0].waitForFunction(() => { const b = [...document.querySelectorAll('[data-bf-type="Badge"]')].pop(); return getComputedStyle(b.firstElementChild).filter === "invert(1)"; });
    await tab(page, "Layout");
    await dd(page, "Width").click();
    const widths = await page.$$eval(".bd-dd-list .bd-dd-opt-label", (o) => o.map((x) => x.textContent));
    await page.keyboard.press("Escape");
    expect(!widths.some((w) => /avatar/.test(w)) && widths.some((w) => /control-/.test(w)), `a Badge's widths leave out avatar sizes and offer control sizes, got ${widths.join(", ")}`);
    ok("tone swatches, a Multiply blend, inverted colours, and no avatar sizes on a Badge");
    await page.close();
  });

  await step("v9: Export on the right, a frame's components, thin outlines, a colour picker, Fixed and scrubbed sizes, swap, copy a frame, layer links, glass New, variables and templates", async () => {
    const { page } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const findIn = (n, type) => { let hit = null; (function w(x) { (x.children || []).forEach((c) => { if (!hit && c.type === type) hit = c; w(c); }); })(n); return hit; };
    /* What's saved lands a beat after a change; wait for it rather than race it. */
    const poll = async (get, good, ms = 4000) => { const end = Date.now() + ms; let v; do { v = await get(); if (good(v)) return v; await page.waitForTimeout(50); } while (Date.now() < end); return v; };
    await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("dovetail-builder") || "null"); return d && d.frames[0].root.children.length; });

    const bar = await page.locator("#app-toolbar .bd-toolbar").boundingBox();
    const exp = await page.locator(".bd-export").boundingBox();
    expect((await page.locator(".bd-export").textContent()).trim() === "Export" && bar.x + bar.width - (exp.x + exp.width) < 24 && bar.width > 1000, `the top bar spans the header with Export at its right end (bar ${Math.round(bar.width)}px wide)`);
    ok("the top bar spans the header, Export at its right end");

    await page.locator(".bd-frame-item", { hasText: "StatsBlock" }).click();
    await page.waitForFunction(() => /StatsBlock/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await page.waitForSelector(".bd-mark-sel");
    const outline = await page.evaluate(() => getComputedStyle(document.querySelector(".bd-mark-sel")).outlineWidth);
    expect(outline === "1px", `the selection outline is thin, got ${outline}`);
    ok("a frame lists its components in the inspector; pressing one selects it, outlined at 1px");

    await tab(page, "Appearance");
    expect(await page.locator(".bd-right .bd-canvas-custom .bd-canvas-ic").count() >= 1, "custom colours open from a colour picker icon");
    ok("custom colours open from a colour picker icon");

    await release(page);
    await page.keyboard.press("Escape");
    await page.locator(".bd-frame-item", { hasText: "Shop the collection" }).click();
    await page.waitForFunction(() => /Button/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    await tab(page, "Layout");
    await dd(page, "Width").click();
    const sizing = await page.$$eval(".bd-dd-list .bd-dd-opt-label", (o) => o.map((x) => x.textContent));
    expect(["Auto", "Hug contents", "Fill container", "Fixed"].every((x) => sizing.includes(x)), `Width offers Auto, Hug contents, Fill container and Fixed, got ${sizing.slice(0, 6).join(", ")}`);
    await option(page, /^Fixed$/).click();
    await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem("dovetail-builder")); let b = null; (function w(x) { (x.children || []).forEach((c) => { if (!b && c.type === "Button") b = c; w(c); }); })(d.frames[0].root); return b && b.style.w && !/^(hug|fill)$/.test(b.style.w); });
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
    await page.locator(".bd-assets input[type=search]").fill("Badge");
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
    await page.locator(".bd-assets .bd-search-clear").click();
    await page.waitForFunction(() => /Badge/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const badge = await poll(async () => findIn((await saved()).frames[0].root.children.find((c) => c.type === "HeroBlock"), "Badge"), Boolean);
    expect(badge && badge.style.w === fixedW, `the Badge takes the Button's place and its size (${fixedW}), got ${JSON.stringify(badge && badge.style)}`);
    ok(`Ctrl-dragging Badge onto the Button swapped it, at the Button's width ${fixedW}`);

    await page.evaluate(() => { window.DovetailCopy = { write: (t, cb) => { window.__copied = t; cb(true); } }; });
    await page.locator('.bd-toolbar [aria-label="Copy link"]').click();
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
    await page.locator(".bd-frame-item", { hasText: "Badge" }).click();

    await page.locator(".bd-start").click();
    const nb = await page.locator(".bd-new").boundingBox();
    const glass = await page.evaluate(() => getComputedStyle(document.querySelector(".bd-new")).backdropFilter);
    expect(nb.height >= 900 * 0.45 && nb.height <= 900 * 0.6 && glass && glass !== "none", `New is glass and about half the screen tall, got ${Math.round(nb.height)}px, ${glass}`);
    await page.keyboard.press("Escape");
    ok(`New opens as glass, ${Math.round(nb.height)}px tall on a 900px screen`);

    await page.locator(".bd-export").click();
    expect(/^Export:/.test(await page.locator("#bd-code-title").textContent()) && await page.locator(".bd-code-actions .bd-btn", { hasText: "PNG" }).count() === 1, "Export offers code, PNG, JPG and the layout");
    await page.keyboard.press("Escape");
    ok("Export offers code, a PNG or JPG, and the layout JSON");

    await page.locator(".bd-frame-item, .bd-layer").first().waitFor({ state: "attached" }).catch(() => {});
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click().catch(() => {});
    await page.locator('.bd-assets [data-asset-kind="variables"]').click();
    await page.locator(".bd-vars-sec", { hasText: "Radius" }).locator(".bd-var", { hasText: /^pill$/ }).click();
    const radius = await poll(async () => findIn((await saved()).frames[1].root, "Badge").style.radius, (v) => v === "pill");
    expect(radius === "pill", `a variable pressed applies to the selection, got radius ${radius}`);
    await page.locator('.bd-assets [aria-label="Back to Assets"]').click();
    await page.locator('.bd-assets [data-asset-kind="templates"]').click();
    const count = (await saved()).frames.length;
    await page.locator('.bd-kind[data-template="store"]').click();
    const withStore = await poll(async () => (await saved()).frames, (fs) => fs.length === count + 1);
    expect(withStore.length === count + 1, `a template's frames go beside yours, got ${withStore.map((f) => f.name).join(", ")}`);
    ok("Variables apply to the selection (radius pill on the Badge); a template adds its frames beside yours");
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
    const saved = await ex.page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    expect(saved.frames.length === 2 && saved.frames[0].name === "Launch" && saved.frames[1].name === "Pasted", "the pasted frame sits beside the example's");
    const group = saved.frames[1].root.children[1];
    expect(JSON.stringify(group.style) === JSON.stringify({ padding: "lg" }) && group.children.length === 2, `only token styles and known components come in, got ${JSON.stringify(group)}`);
    ok("a pasted list of nodes, in a code fence, comes in as a new frame; an unknown prop, a raw width and an unknown component are listed and left out");

    await startFrom(ex.page, "Paste a layout");
    await ex.page.locator(".bd-import-text").fill("not a layout");
    expect(/isn't JSON or a builder link/.test(await ex.page.locator(".bd-import-report").textContent()) && await ex.page.locator(".bd-import-actions .bd-btn-primary").isDisabled(), "text that isn't a layout is refused");
    await ex.page.locator(".bd-import-text").fill(JSON.stringify(saved));
    await ex.page.locator(".bd-import-actions .bd-btn", { hasText: "Replace all frames" }).click();
    await ex.page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    ok("text that isn't a layout is refused, and a saved layout pasted back replaces the frames");
    await ex.page.close();
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
    const saved = await shared.page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
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
