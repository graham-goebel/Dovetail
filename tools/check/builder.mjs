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
   - the tools draw a rectangle, an ellipse, a container, text and a frame,
     sized in steps of a size token; groups and new rows don't wrap;
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
   - a share link opens the frames it encodes, and one carrying props,
     styles, sizes or components the inspector can't set loses them;
   - a theme tried in Configure reaches the frames and not the builder's own
     chrome;
   - at 390px the panels sit behind tabs and nothing is wider than the screen.

   Chromium comes from Playwright; set CHROMIUM_PATH to use a local binary. */

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
  await page.waitForSelector(".bd-tile", { state: "attached" });
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
const category = (page, name) => page.locator(".bd-cat", { hasText: name }).click();
const camera = (page) => page.evaluate(() => document.querySelector(".bd-world").style.transform);
const dd = (page, label) => page.locator(`.bd-right .bd-dd[aria-label="${label}"]`).first();
async function pick(page, label, optionText) {
  await dd(page, label).click();
  await option(page, optionText).click();
}
const labels = (page) => page.$$eval(".bd-flabel-name", (n) => n.map((x) => x.textContent));
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

  await step("Assets: one named category at a time, search across all and clear it, live previews, grid and list", async () => {
    const named = await page.$$eval(".bd-cat", (c) => c.map((x) => x.querySelector(".bd-cat-label")?.textContent || ""));
    expect(named.length > 8 && named.every(Boolean), `every category should carry its name, got ${named.join(", ")}`);
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
    ok("categories are named, Blocks shows blocks, search finds Button and IconButton and clears, and the Button tile has a live preview");
    await page.locator('.bd-assets-head .bd-seg-btn[aria-label="List"]').click();
    expect(await page.locator(".bd-tiles.is-list").count() === 1, "list view");
    await page.locator('.bd-assets-head .bd-seg-btn[aria-label="Grid"]').click();
    expect(await page.locator(".bd-tiles.is-grid").count() === 1, "grid view");
    ok("grid and list views switch");
  });

  await step("Drag onto an empty frame, add into the selection, select and deselect on the canvas", async () => {
    await page.locator(".bd-start").click();
    await option(page, "Blank frame").click();
    await frame().waitForSelector('[data-bf-slot="root"]');
    await category(page, "Layout");
    const from = await page.locator('.bd-tile[data-type="Stack"]').boundingBox();
    const to = await canvasPoint(page, '[data-bf-slot="root"]');
    await page.mouse.move(from.x + 30, from.y + 30);
    await page.mouse.down();
    await page.mouse.move(from.x + 140, from.y + 40, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    expect(await page.locator(".bd-mark-box, .bd-mark-line").count() === 1, "a drop target should show while dragging over the frame");
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
    expect(actions.join("|") === "Wrap in|Group (Ctrl+G)", `the head offers only Wrap and Group for a Heading, got ${actions.join("|")}`);
    const stage = await page.locator(".bd-stage").boundingBox();
    await page.mouse.click(stage.x + 6, stage.y + stage.height - 6);
    await page.waitForFunction(() => /Frame 1/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    ok("clicking the Heading selects it, the inspector opens on Content, and clicking the empty canvas deselects");
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
    expect(await page.locator(".bd-box-p > .bd-box-cell.is-top .bd-dd-label").textContent() === "lg", "each side shows the padding it takes from every side");
    await page.locator(".bd-box-p > .bd-box-cell.is-top .bd-dd").click();
    await option(page, /^2xl$/).click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.paddingTop === "var(--dt-space-inset-2xl)");
    ok("the box model's top padding set to 2xl gives paddingTop: var(--dt-space-inset-2xl)");
    await pick(page, "Height", "control-lg × 2");
    await pick(page, "Min width", "control-lg × 3");
    await frame().waitForFunction(() => { const s = document.querySelector('[data-bf-type="Heading"]').firstElementChild.style; return s.height === "calc(var(--dt-size-control-lg) * 2)" && s.minWidth === "calc(var(--dt-size-control-lg) * 3)"; });
    expect(await dd(page, "Height").locator(".bd-dd-label").textContent() === "×2", "the size grid names a step briefly");
    ok("Height and Min width, from the size grid, are multiples of --dt-size-control-lg");
    const offered = await page.evaluate(() => Object.values(window.DovetailBuilderData.tokens).flatMap((d) => d.options.flatMap((o) => Object.values(o.css))));
    const bad = offered.filter(raw);
    expect(bad.length === 0, `options with raw values: ${bad.join(", ")}`);
    ok(`${offered.length} token option declarations, none a raw length or colour`);
    await page.locator(".bd-btn-primary", { hasText: "Code" }).click();
    const code = await page.locator(".bd-code-pre code").textContent();
    expect(/^import \{[^}]*Heading[^}]*Stack[^}]*\} from "@dovetail-ds\/react";/.test(code), "the code should import Heading and Stack from @dovetail-ds/react");
    expect(/export function Frame1\(\)/.test(code), "the function is named after the frame");
    expect(code.includes('paddingTop: "var(--dt-space-inset-2xl)"'), "the code should carry the per-side token");
    const values = [...code.matchAll(/style=\{\{([^}]*)\}\}/g)].flatMap((m) => [...m[1].matchAll(/:\s*"([^"]*)"/g)].map((v) => v[1]));
    expect(!values.some(raw), `style values that aren't tokens: ${values.filter(raw).join(", ")}`);
    const box = await page.locator(".bd-code").boundingBox();
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
    await page.waitForSelector(".bd-tile", { state: "attached" });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    await frame(1).waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    expect(/^Saved/.test(await page.locator(".bd-saved").getAttribute("title")), "the toolbar should say it saved");
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

    await page.locator(".bd-toolbar [aria-label='New frame']").click();
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

  await step("Tools draw primitives sized by tokens", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    await page.locator(".bd-start").click();
    await option(page, "Blank frame").click();
    await frame().waitForSelector('[data-bf-slot="root"]');
    expect((await page.$$eval(".bd-tool", (t) => t.map((x) => x.getAttribute("aria-label")))).length === 8, "eight tools in the bar");
    const box = await page.locator("iframe.bd-frame").boundingBox();
    await page.keyboard.press("b");
    await drag(page, { x: box.x + box.width * 0.1, y: box.y + box.height * 0.1 }, { x: box.x + box.width * 0.5, y: box.y + box.height * 0.6 });
    await frame().waitForSelector('[data-bf-type="Group"]');
    let d = await saved();
    const group = d.frames[0].root.children[0];
    expect(group.type === "Group" && /^x\d+$/.test(group.style.w) && /^x\d+$/.test(group.style.h) && group.style.padding === "md", `a drawn container is a Group with token sizes, got ${JSON.stringify(group.style)}`);
    expect(await page.locator(".bd-tool[aria-pressed=true]").getAttribute("aria-label") === "Select", "the tool goes back to Select after drawing");
    ok(`B and a drag draw a container: a padded Group ${group.style.w} wide, at least ${group.style.h} tall`);
    const inside = await canvasPoint(page, '[data-bf-type="Group"]', "left");
    await page.keyboard.press("r");
    const unit = await frame().evaluate(() => window.BuilderFrame.unit());
    const z = box.width / 1280;
    await drag(page, { x: inside.x, y: inside.y + 4 }, { x: inside.x + unit * 3 * z, y: inside.y + 4 + unit * 2 * z });
    await frame().waitForSelector('[data-bf-type="Group"] [data-bf-type="Shape"]');
    d = await saved();
    const rect = d.frames[0].root.children[0].children[0];
    expect(rect.type === "Shape" && rect.props.shape === "rectangle" && rect.style.w === "x3" && rect.style.height === "x2", `a rectangle dragged 3 by 2 steps snaps to x3 by x2, got ${JSON.stringify(rect)}`);
    const css = await frame().evaluate(() => document.querySelector('[data-bf-type="Shape"]').firstElementChild.style.width);
    expect(css === "calc(var(--dt-size-control-lg) * 3)", `its width is a multiple of the token, got ${css}`);
    ok("R and a drag draw a rectangle inside the container, snapped to control-lg × 3 by × 2");
    await page.keyboard.press("o");
    await page.mouse.click(inside.x, inside.y + 4);
    await page.keyboard.press("t");
    await page.mouse.click(inside.x, inside.y + 4);
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.type("Drawn text");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Text"]')].some((t) => t.textContent === "Drawn text"));
    d = await saved();
    const kinds = d.frames[0].root.children[0].children.map((c) => c.type === "Shape" ? c.props.shape : c.type);
    expect(kinds.includes("ellipse") && kinds.includes("Text") && kinds.includes("rectangle"), `the container holds a rectangle, an ellipse and text, got ${kinds.join(", ")}`);
    ok("O and a click add an ellipse; T and a click add text and open it for typing");
    await page.keyboard.press("f");
    const stage = await page.locator(".bd-stage").boundingBox();
    await drag(page, { x: stage.x + 40, y: stage.y + stage.height - 140 }, { x: stage.x + 160, y: stage.y + stage.height - 60 });
    await page.waitForFunction(() => document.querySelectorAll("iframe.bd-frame").length === 2);
    ok("F and a drag on empty canvas add a frame");
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await category(page, "Layout");
    await page.locator('.bd-tile[data-type="Inline"]').click();
    d = await saved();
    const inl = d.frames[d.frames.length - 1].root.children.find((c) => c.type === "Inline");
    expect(inl && inl.props.wrap === false, "an Inline added from the panel starts on one line");
    ok("an Inline added from the panel doesn't wrap");
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
