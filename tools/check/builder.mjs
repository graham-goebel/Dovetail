#!/usr/bin/env node
/* Drives the builder page (builder.html) in a real browser.

     npm run check:builder

   Checks, against the built site:
   - the toolbar sits in the site header on a wide screen, and the header has
     no search or page menu there;
   - every component the assets panel offers renders on the canvas from its
     starting props, with no error box and no script error;
   - the assets panel shows one category at a time, search spans them all,
     tiles carry a live preview, and grid and list both work;
   - dragging a tile onto an empty frame adds it, clicking it on the canvas
     selects it, and clicking the empty canvas clears the selection;
   - Enter goes into a container's children and Shift+Enter back out;
   - a token chosen from a dropdown (by keyboard) reaches the component as a
     custom property, one side at a time too; every option the builder offers,
     and every style value in the exported code, is a token or a CSS keyword;
   - several components of one kind change together;
   - double-clicking text on the canvas edits it in place;
   - layers: dragging a row reorders, the filter narrows the list, Ctrl+Up
     moves the selection, a Group renames on double-click, and shift-select
     then Ctrl+G makes a Group whose gap is a token;
   - pressing anywhere on a canvas node and dragging moves it;
   - Detach rebuilds a block from primitives; a media prop takes a URL;
   - zoom, a duplicated frame, undo, and a reload that keeps the work;
   - a share link opens the frames it encodes, and one carrying props,
     styles or components the inspector can't set loses them;
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

async function open(viewport, hash = "") {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(8000);
  watch(page);
  await page.goto(server.origin + "/builder.html");
  await page.evaluate(() => { localStorage.clear(); });
  if (hash) await page.goto(server.origin + "/builder.html" + hash);
  await page.reload();
  await page.waitForSelector(".bd-tile", { state: "attached" });
  const frame = () => page.frames().find((f) => f.url().includes("builder-frame"));
  await frame().waitForFunction(() => !!window.BuilderFrame);
  return { page, frame };
}

/* A point on a canvas node, in page coordinates. */
const canvasPoint = (page, selector, at = "center") => page.evaluate(({ selector, at }) => {
  const iframe = document.querySelector("iframe.bd-frame");
  let el = iframe.contentDocument.querySelector(selector);
  if (el && el.style.display === "contents") el = el.firstElementChild;
  const r = el.getBoundingClientRect();
  const box = iframe.getBoundingClientRect();
  const s = box.width / parseFloat(iframe.style.width);
  const y = at === "bottom" ? r.bottom - 4 : r.top + r.height / 2;
  const x = at === "left" ? r.left + 20 : r.left + r.width / 2;
  return { x: box.left + x * s, y: Math.min(box.bottom - 4, box.top + y * s) };
}, { selector, at });

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

try {
  const { page, frame } = await open({ width: 1440, height: 900 });

  await step("The toolbar lives in the header; search and the page menu don't", async () => {
    expect(await page.locator("#app-toolbar .bd-toolbar").count() === 1, "the toolbar should render into #app-toolbar");
    expect(await page.locator(".search-btn, .page-actions-btn").count() === 0, "no search button or page menu on the builder");
    expect(await page.locator(".bd-layer-lock, .bd-layer-grip").count() === 0, "no lock or grip icons");
    ok("toolbar in the site header, no search, no page menu, no lock or grip icons");
  });

  await step("Every component the assets panel offers renders on the canvas", async () => {
    const types = await page.evaluate(() => window.DovetailBuilderData.groups.flatMap((g) => g.items));
    expect(types.length > 60, `the assets panel should offer most components, got ${types.length}`);
    const result = await frame().evaluate((types) => {
      const doc = { page: { context: "product", surface: "base" }, root: { id: "root", type: "Root", props: {}, style: {}, children: types.map((t, i) => ({ id: "c" + i, type: t, props: {}, style: {}, children: [] })) } };
      window.BuilderFrame.render(doc, {});
      return new Promise((r) => setTimeout(() => r([...document.querySelectorAll(".bf-error")].map((e) => e.textContent.slice(0, 120))), 400));
    }, types);
    expect(result.length === 0, `components showed an error box: ${result.join(" | ")}`);
    ok(`${types.length} components rendered from their starting props`);
  });

  await step("Assets: one category at a time, search across all, live previews, grid and list", async () => {
    await page.locator(".bd-cat[aria-label=Blocks]").click();
    const blocks = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(blocks.includes("HeroBlock") && !blocks.includes("Button"), "the Blocks category should show blocks only");
    await page.locator(".bd-assets input[type=search]").fill("button");
    const found = await page.$$eval(".bd-tile", (t) => t.map((x) => x.getAttribute("data-type")));
    expect(found.includes("Button") && found.includes("IconButton"), `search should span categories, got ${found.join(", ")}`);
    await page.locator(".bd-assets input[type=search]").fill("");
    await page.locator(".bd-cat[aria-label=Actions]").click();
    await page.waitForFunction(() => document.querySelector('.bd-tile[data-type="Button"] .bd-thumb-stage')?.children.length > 0);
    ok("Blocks shows blocks, search finds Button and IconButton, and the Button tile has a live preview");
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
    await page.locator(".bd-cat[aria-label=Layout]").click();
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
    await page.locator(".bd-cat[aria-label=Typography]").click();
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await page.locator('.bd-tile[data-type="Text"]').click();
    await frame().waitForSelector('[data-bf-type="Stack"] [data-bf-type="Text"]');
    ok("with the Stack selected, Heading and then Text are added into it");
    const at = await canvasPoint(page, '[data-bf-type="Heading"]');
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const sections = await page.$$eval(".bd-right .bd-sec-h", (h) => h.map((x) => x.textContent));
    expect(sections[0] === "Content and props", `content should come first, got ${sections.join(", ")}`);
    expect(await page.locator(".bd-inspect-head .bd-actions").textContent() === "Wrap inGroup", "the head offers only Wrap and Group for a Heading");
    const stage = await page.locator(".bd-stage").boundingBox();
    await page.mouse.click(stage.x + 4, stage.y + stage.height - 4);
    await page.waitForFunction(() => /Frame 1/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    ok("clicking the Heading selects it, content comes first, and clicking the empty canvas deselects");
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
    const dd = page.locator(".bd-right .bd-field", { hasText: /^Padding/ }).first().locator(".bd-dd").first();
    await dd.focus();
    await page.keyboard.press("ArrowDown");
    await page.locator(".bd-dd-list").waitFor();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "var(--dt-space-inset-lg)");
    ok("Padding chosen by keyboard (arrows, Enter) sets var(--dt-space-inset-lg)");
    await page.locator(".bd-right .bd-field", { hasText: /^Padding/ }).first().locator(".bd-act-sm").click();
    await page.locator(".bd-right .bd-side").first().locator(".bd-dd").click();
    await option(page, /^2xl$/).click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.paddingTop === "var(--dt-space-inset-2xl)");
    ok("the per-side toggle shows T/R/B/L; top set to 2xl gives paddingTop: var(--dt-space-inset-2xl)");
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
    ok(`exported code is named after the frame, and its ${values.length} style values are tokens or keywords`);
    await page.keyboard.press("Escape");
  });

  await step("Several of one kind change together", async () => {
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await page.locator(".bd-cat[aria-label=Actions]").click();
    await row(page, "Text").click().catch(() => {});
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await row(page, "Text").click();
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await page.locator('.bd-tile[data-type="Button"]').click();
    await page.locator('.bd-tile[data-type="Button"]').click();
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    await row(page, "Button").nth(0).click();
    await row(page, "Button").nth(1).click({ modifiers: ["Shift"] });
    expect(await title(page) === "2 Buttons", `two Buttons selected should read "2 Buttons", got ${await title(page)}`);
    await choose(page, /^Variant/, /^ghost$/);
    await frame().waitForFunction(() => { const bs = [...document.querySelectorAll('[data-bf-type="Button"] button')]; return bs.length === 2 && bs.every((b) => getComputedStyle(b).backgroundColor === "oklch(0 0 0 / 0)" || getComputedStyle(b).backgroundColor === "rgba(0, 0, 0, 0)"); });
    ok("two Buttons selected read \"2 Buttons\"; setting Variant ghost changes both");
  });

  await step("Double-click text on the canvas to type in place", async () => {
    const at = await canvasPoint(page, '[data-bf-type="Heading"]', "left");
    await page.mouse.dblclick(at.x, at.y);
    await page.locator(".bd-inline").waitFor();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Typed here");
    await page.keyboard.press("Enter");
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').textContent === "Typed here");
    expect(await page.locator(".bd-inline").count() === 0, "Enter closes the editor");
    ok("an editor opens over the heading; typing and Enter set its text");
  });

  await step("Undo, zoom, duplicate frame, and a reload keeps the work", async () => {
    await page.locator(".bd-toolbar .bd-tool-group .bd-act").first().click();
    await frame().waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').textContent !== "Typed here");
    ok("undo puts the heading back");
    await page.locator(".bd-zoom").click();
    await option(page, "100%").click();
    await page.waitForFunction(() => document.querySelector("iframe.bd-frame").style.transform === "scale(1)");
    await page.keyboard.press("Control+0");
    await page.waitForFunction(() => document.querySelector("iframe.bd-frame").style.transform !== "scale(1)");
    ok("zoom 100% scales the frame to 1; Ctrl+0 fits it again");
    await page.locator(".bd-frame-more").click();
    await option(page, "Duplicate frame").click();
    await page.waitForFunction(() => document.querySelectorAll(".bd-frame-tab").length === 2);
    expect((await page.locator(".bd-frame-name").allTextContents()).join("|") === "Frame 1|Frame 1 copy", "the copy sits beside the original");
    await frame().waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    ok("Duplicate frame adds \"Frame 1 copy\" with the same content, and shows it");
    await page.reload();
    await page.waitForSelector(".bd-tile", { state: "attached" });
    await frame().waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    expect(await page.locator(".bd-frame-tab").count() === 2, "both frames come back");
    expect(/^Saved/.test(await page.locator(".bd-saved").getAttribute("title")), "the toolbar should say it saved");
    ok("after a reload both frames and their content are still there, and the toolbar says Saved");
  });

  await page.close();

  await step("Layers: drag to reorder, filter, Ctrl+Up, shift-select and group, rename, detach, media", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    expect((await layerNames(page)).join(" ") === "0:HeroBlock 0:FeatureGridBlock 0:StatsBlock 0:TestimonialBlock 0:CtaBlock", "the landing starter's layers");
    const cta = await row(page, "CtaBlock").boundingBox();
    const fg = await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("FeatureGridBlock"))').boundingBox();
    await drag(page, { x: cta.x + 30, y: cta.y + cta.height / 2 }, { x: fg.x + 60, y: fg.y + 3 });
    expect((await layerNames(page)).join(" ") === "0:HeroBlock 0:CtaBlock 0:FeatureGridBlock 0:StatsBlock 0:TestimonialBlock", `dragging CtaBlock above FeatureGridBlock, got ${(await layerNames(page)).join(" ")}`);
    ok("dragging a layer row reorders the frame");
    await page.keyboard.press("Control+ArrowUp");
    await page.waitForTimeout(150);
    expect((await layerNames(page))[0] === "0:CtaBlock", "Ctrl+Up moves the selection up");
    ok("Ctrl+Up moves the selected layer up");
    await row(page, "StatsBlock").click();
    await row(page, "TestimonialBlock").click({ modifiers: ["Shift"] });
    expect(/^2 /.test(await title(page)), "shift-click selects two");
    await page.keyboard.press("Control+g");
    await page.waitForTimeout(200);
    expect((await layerNames(page)).slice(-3).join(" ") === "0:Group 1:StatsBlock 1:TestimonialBlock", `Ctrl+G groups them, got ${(await layerNames(page)).join(" ")}`);
    await page.locator('.bd-right .bd-seg-btn[aria-label="Column"]').click();
    await choose(page, /^Gap/, /^lg$/);
    await frame().waitForFunction(() => { const g = document.querySelector('[data-bf-type="Group"]').firstElementChild; return g.style.flexDirection === "column" && g.style.gap === "var(--dt-space-stack-lg)"; });
    ok("shift-select and Ctrl+G make a Group; a column with gap lg uses var(--dt-space-stack-lg)");
    await row(page, "Group").dblclick();
    await page.keyboard.type("Proof");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-layer-name")].some((n) => n.textContent === "Proof"));
    ok("double-clicking the Group's row renames it");
    await page.locator(".bd-layers-panel input[type=search]").fill("stats");
    expect((await layerNames(page)).join(" ") === "0:Proof 1:StatsBlock", `the filter keeps matches and their parents, got ${(await layerNames(page)).join(" ")}`);
    await page.locator(".bd-layers-panel input[type=search]").fill("");
    ok("the layer filter narrows to StatsBlock and its group");

    const from = await canvasPoint(page, '[data-bf-type="HeroBlock"]');
    const to = await canvasPoint(page, '[data-bf-type="FeatureGridBlock"]', "bottom");
    await drag(page, from, to);
    const order = (await layerNames(page)).filter((n) => n.startsWith("0:")).map((n) => n.slice(2));
    expect(order.indexOf("HeroBlock") > order.indexOf("FeatureGridBlock"), `pressing on the hero and dragging should move it, got ${order.join(" ")}`);
    ok("pressing anywhere on a canvas node and dragging moves it");

    await row(page, "HeroBlock").click();
    await page.locator(".bd-right .bd-btn", { hasText: "Detach" }).click();
    await page.waitForFunction(() => [...document.querySelectorAll(".bd-layer-name")].filter((n) => n.textContent === "Button").length >= 2);
    const names = await layerNames(page);
    const heroAt = names.indexOf("0:HeroBlock");
    expect(heroAt >= 0 && names[heroAt + 1] === "1:Grid" && names.slice(heroAt).some((n) => /Heading/.test(n)), `the hero should become a named Section holding a Grid of primitives, got ${names.slice(heroAt, heroAt + 6).join(" ")}`);
    /* The canvas commits on its own schedule, after the layers list. */
    await frame().waitForFunction(() => !document.querySelector('[data-bf-type="HeroBlock"]') && !!document.querySelector('[data-bf-type="Section"] [data-bf-type="Heading"]'))
      .catch(() => { throw new Error("the canvas shows the primitives, not the block"); });
    ok("Detach replaces the HeroBlock with a Section, a Grid, Heading, Text, Buttons and an Image");

    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Assets" }).click();
    await page.locator(".bd-cat[aria-label=Content]").click();
    await page.locator('.bd-tile[data-type="Image"]').click();
    await page.locator(".bd-right input[type=url]").fill("https://example.com/pic.png");
    await frame().waitForFunction(() => [...document.querySelectorAll('[data-bf-type="Image"] img')].some((i) => i.getAttribute("src") === "https://example.com/pic.png"));
    await page.locator(".bd-right input[type=url]").fill("javascript:alert(1)");
    await page.waitForTimeout(150);
    expect(await frame().evaluate(() => ![...document.querySelectorAll('[data-bf-type="Image"] img')].some((i) => /^javascript:/.test(i.getAttribute("src") || ""))), "a non-http(s), non-data URL is refused");
    ok("an Image takes a pasted https URL, and refuses a javascript: one");
    await page.close();
  });

  await step("Share links open what they encode, and nothing the inspector can't set", async () => {
    const doc = { frames: [{ id: "f1", name: "Shared", size: "tablet", dark: true, context: "social", surface: "not-a-token", gap: "block",
      root: { children: [
        { id: "a", type: "Button", props: { children: "Hi", variant: "secondary", size: "huge", onClick: "alert(1)", dangerouslySetInnerHTML: { __html: "<b>x</b>" } }, style: { surface: "subtle", padding: "10px", paddingTop: "sm" } },
        { id: "b", type: "NotAComponent" },
        { id: "c", type: "Grid", props: { minColumnWidth: "13px" }, children: [{ id: "a", type: "Badge" }] },
        { id: "d", type: "Group", name: "<b>Named</b>", props: { direction: "column", gap: "9px", children: "x" }, style: { marginY: "md", w: "200px" } },
        { id: "e", type: "Image", props: { src: "javascript:alert(1)", alt: "x" } },
        { id: "f", type: "Image", props: { src: "https://example.com/a.png", alt: "x" } },
      ] } }], active: "f1" };
    const hash = "#b=" + Buffer.from(JSON.stringify(doc)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const shared = await open({ width: 1280, height: 900 }, hash);
    await shared.frame().waitForSelector('[data-bf-type="Button"]');
    const saved = await shared.page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const f = saved.frames[0];
    const [button, grid, group, img1, img2] = f.root.children;
    expect(f.name === "Shared" && f.size === "tablet" && f.dark === true && f.context === "social" && f.gap === "block", "the frame settings should come through");
    expect(f.surface === "base", `an unknown surface token should fall back to base, got ${f.surface}`);
    expect(JSON.stringify(button.props) === JSON.stringify({ children: "Hi", variant: "secondary" }), `only real props and values survive, got ${JSON.stringify(button.props)}`);
    expect(JSON.stringify(button.style) === JSON.stringify({ surface: "subtle", paddingTop: "sm" }), `only token styles survive, got ${JSON.stringify(button.style)}`);
    expect(f.root.children.length === 5 && grid.type === "Grid" && group.type === "Group", "an unknown component is dropped");
    expect(!grid.props.minColumnWidth && grid.children[0].id !== "a", "a raw minColumnWidth is dropped and a repeated id replaced");
    expect(group.name === "<b>Named</b>" && JSON.stringify(group.props) === JSON.stringify({ direction: "column" }) && JSON.stringify(group.style) === JSON.stringify({ marginTop: "md", marginBottom: "md" }), `Group keeps its name as text, its own props and token styles, and old two-sided margins split into sides, got ${JSON.stringify(group)}`);
    expect(!img1.props.src && img2.props.src === "https://example.com/a.png", "a javascript: src is dropped and an https one kept");
    expect(await shared.frame().evaluate(() => innerWidth) === 768, "the canvas should be 768px wide for tablet");
    await shared.page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    expect(await shared.page.locator(".bd-layer-name").first().textContent() === "Shared", "the layers list is headed by the frame's name, as text");
    ok("frame settings and real props come through; handlers, raw values, bad enum values, unknown components, bad URLs and repeated ids don't");
    await shared.page.close();
  });

  await step("At 390px: panels behind tabs, the toolbar inline, nothing wider than the screen", async () => {
    const phone = await open({ width: 390, height: 844 });
    expect(await phone.page.locator(".bd-tabs [role=tab]").count() === 3, "three panel tabs");
    expect(await phone.page.locator(".bd-center .bd-toolbar").count() === 1, "the toolbar is in the canvas pane on a phone");
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "the page should not scroll sideways");
    expect(await phone.frame().evaluate(() => innerWidth) === 390, "the default canvas on a phone is the phone frame");
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Add" }).click();
    await phone.page.locator(".bd-cat[aria-label=Actions]").click();
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
