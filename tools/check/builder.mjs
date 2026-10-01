#!/usr/bin/env node
/* Drives the builder page (builder.html) in a real browser.

     npm run check:builder

   Checks, against the built site:
   - every component the assets panel offers renders on the canvas from its
     starting props, with no error box and no script error;
   - the assets panel shows one category at a time, search spans them all,
     tiles carry a live preview, and grid and list both work;
   - dragging a tile onto an empty page adds it, and clicking it on the
     canvas selects it;
   - a token chosen from a dropdown (by keyboard) reaches the component as a
     custom property; every option the builder offers, and every style value
     in the exported code, is a token or a CSS keyword, never a raw value;
   - layers: dragging a row reorders, the filter narrows the list, Ctrl+Up
     moves the selection, and shift-select then Ctrl+G makes a Group whose
     gap is a token;
   - pressing anywhere on a canvas node and dragging moves it;
   - undo; a reload keeps the work;
   - a share link opens the layout it encodes, and one carrying props,
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
  const frame = page.frames().find((f) => f.url().includes("builder-frame"));
  await frame.waitForFunction(() => !!window.BuilderFrame);
  return { page, frame };
}

/* The centre of a canvas node, in page coordinates. */
const canvasPoint = (page, selector, at = "center") => page.evaluate(({ selector, at }) => {
  const iframe = document.querySelector("iframe.bd-frame");
  let el = iframe.contentDocument.querySelector(selector);
  if (el && el.style.display === "contents") el = el.firstElementChild;
  const r = el.getBoundingClientRect();
  const box = iframe.getBoundingClientRect();
  const s = box.width / parseFloat(iframe.style.width);
  const y = at === "bottom" ? r.bottom - 4 : r.top + r.height / 2;
  return { x: box.left + (r.left + r.width / 2) * s, y: Math.min(box.bottom - 4, box.top + y * s) };
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

async function choose(page, fieldText, optionText) {
  await page.locator(".bd-right .bd-field", { hasText: fieldText }).locator(".bd-dd").first().click();
  await page.locator(".bd-dd-opt", { hasText: optionText }).first().click();
}

try {
  const { page, frame } = await open({ width: 1440, height: 900 });

  await step("Every component the assets panel offers renders on the canvas", async () => {
    const types = await page.evaluate(() => window.DovetailBuilderData.groups.flatMap((g) => g.items));
    expect(types.length > 60, `the assets panel should offer most components, got ${types.length}`);
    const result = await frame.evaluate((types) => {
      const doc = { page: { viewport: "desktop", context: "product", surface: "base" }, root: { id: "root", type: "Root", props: {}, style: {}, children: types.map((t, i) => ({ id: "c" + i, type: t, props: {}, style: {}, children: [] })) } };
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

  await step("Drag onto an empty page, add into the selection, select on the canvas", async () => {
    await page.locator(".bd-start").click();
    await page.locator(".bd-dd-opt", { hasText: "Blank page" }).click();
    await frame.waitForSelector('[data-bf-slot="root"]');
    await page.locator(".bd-cat[aria-label=Layout]").click();
    const from = await page.locator('.bd-tile[data-type="Stack"]').boundingBox();
    const to = await canvasPoint(page, '[data-bf-slot="root"]');
    await page.mouse.move(from.x + 30, from.y + 30);
    await page.mouse.down();
    await page.mouse.move(from.x + 140, from.y + 40, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    expect(await page.locator(".bd-mark-box, .bd-mark-line").count() === 1, "a drop target should show while dragging over the page");
    await page.mouse.up();
    await frame.waitForSelector('[data-bf-type="Stack"]');
    ok("Stack dropped on the page, with a target shown during the drag");
    await page.locator(".bd-cat[aria-label=Typography]").click();
    await page.locator('.bd-tile[data-type="Heading"]').click();
    await page.locator('.bd-tile[data-type="Text"]').click();
    await frame.waitForSelector('[data-bf-type="Stack"] [data-bf-type="Text"]');
    ok("with the Stack selected, Heading and then Text are added into it");
    await page.keyboard.press("Escape");
    const at = await canvasPoint(page, '[data-bf-type="Heading"]');
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => /Heading/.test(document.querySelector(".bd-inspect-title")?.textContent || ""));
    const sections = await page.$$eval(".bd-right .bd-sec-h", (h) => h.map((x) => x.textContent));
    expect(sections[0] === "Content and props", `content should come first, got ${sections.join(", ")}`);
    ok("clicking the Heading on the canvas selects it; Content and props comes first");
  });

  await step("Tokens only: dropdowns set custom properties, and nothing offered is a raw value", async () => {
    const dd = page.locator(".bd-right .bd-field", { hasText: "Padding" }).locator(".bd-dd");
    await dd.focus();
    await page.keyboard.press("ArrowDown");
    await page.locator(".bd-dd-list").waitFor();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await frame.waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "var(--dt-space-inset-lg)");
    ok("Padding chosen by keyboard (arrows, Enter) sets var(--dt-space-inset-lg)");
    const offered = await page.evaluate(() => Object.values(window.DovetailBuilderData.tokens).flatMap((d) => d.options.flatMap((o) => Object.values(o.css))));
    const bad = offered.filter(raw);
    expect(bad.length === 0, `options with raw values: ${bad.join(", ")}`);
    ok(`${offered.length} token option declarations, none a raw length or colour`);
    await page.locator(".bd-btn-primary", { hasText: "Code" }).click();
    const code = await page.locator(".bd-code-pre code").textContent();
    expect(/^import \{[^}]*Heading[^}]*Stack[^}]*\} from "@dovetail-ds\/react";/.test(code), "the code should import Heading and Stack from @dovetail-ds/react");
    expect(code.includes('padding: "var(--dt-space-inset-lg)"'), "the code should carry the padding token");
    const values = [...code.matchAll(/style=\{\{([^}]*)\}\}/g)].flatMap((m) => [...m[1].matchAll(/:\s*"([^"]*)"/g)].map((v) => v[1]));
    expect(!values.some(raw), `style values that aren't tokens: ${values.filter(raw).join(", ")}`);
    ok(`exported code imports from the package, and its ${values.length} style values are tokens or keywords`);
    await page.keyboard.press("Escape");
  });

  await step("Undo, and a reload keeps the work", async () => {
    await page.locator(".bd-tool-group .bd-act").first().click();
    await frame.waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "");
    ok("undo removes the padding again");
    await page.reload();
    await page.waitForSelector(".bd-tile", { state: "attached" });
    const f = page.frames().find((x) => x.url().includes("builder-frame"));
    await f.waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    expect(/^Saved/.test(await page.locator(".bd-saved").getAttribute("title")), "the toolbar should say it saved");
    ok("after a reload the Stack, Heading and Text are still there, and the toolbar says Saved");
  });

  await page.close();

  await step("Layers: drag to reorder, filter, Ctrl+Up, shift-select and group", async () => {
    const { page, frame } = await open({ width: 1440, height: 900 });
    await page.locator(".bd-left-tabs .bd-tab", { hasText: "Layers" }).click();
    expect((await layerNames(page)).join(" ") === "0:HeroBlock 0:FeatureGridBlock 0:StatsBlock 0:TestimonialBlock 0:CtaBlock", "the landing starter's layers");
    const cta = await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("CtaBlock")) .bd-layer-main').boundingBox();
    const fg = await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("FeatureGridBlock"))').boundingBox();
    await drag(page, { x: cta.x + 30, y: cta.y + cta.height / 2 }, { x: fg.x + 60, y: fg.y + 3 });
    expect((await layerNames(page)).join(" ") === "0:HeroBlock 0:CtaBlock 0:FeatureGridBlock 0:StatsBlock 0:TestimonialBlock", `dragging CtaBlock above FeatureGridBlock, got ${(await layerNames(page)).join(" ")}`);
    ok("dragging a layer row reorders the page");
    await page.keyboard.press("Control+ArrowUp");
    await page.waitForTimeout(150);
    expect((await layerNames(page))[0] === "0:CtaBlock", "Ctrl+Up moves the selection up");
    ok("Ctrl+Up moves the selected layer up");
    await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("StatsBlock")) .bd-layer-main').click();
    await page.locator('.bd-layer[data-layer]:has(.bd-layer-name:text-is("TestimonialBlock")) .bd-layer-main').click({ modifiers: ["Shift"] });
    expect(/2 selected/.test(await page.locator(".bd-inspect-title").first().textContent()), "shift-click selects two");
    await page.keyboard.press("Control+g");
    await page.waitForTimeout(200);
    expect((await layerNames(page)).slice(-3).join(" ") === "0:Group 1:StatsBlock 1:TestimonialBlock", `Ctrl+G groups them, got ${(await layerNames(page)).join(" ")}`);
    await page.locator('.bd-right .bd-seg-btn[aria-label="Column"]').click();
    await choose(page, /^Gap/, /^lg$/);
    await frame.waitForFunction(() => { const g = document.querySelector('[data-bf-type="Group"]').firstElementChild; return g.style.flexDirection === "column" && g.style.gap === "var(--dt-space-stack-lg)"; });
    ok("shift-select and Ctrl+G make a Group; a column with gap lg uses var(--dt-space-stack-lg)");
    await page.locator(".bd-layers-panel input[type=search]").fill("stats");
    expect((await layerNames(page)).join(" ") === "0:Group 1:StatsBlock", `the filter keeps matches and their parents, got ${(await layerNames(page)).join(" ")}`);
    await page.locator(".bd-layers-panel input[type=search]").fill("");
    ok("the layer filter narrows to StatsBlock and its Group");

    /* Press anywhere on the hero and drag it below the Group. */
    const from = await canvasPoint(page, '[data-bf-type="HeroBlock"]');
    const to = await canvasPoint(page, '[data-bf-type="FeatureGridBlock"]', "bottom");
    await drag(page, from, to);
    const order = (await layerNames(page)).filter((n) => n.startsWith("0:")).map((n) => n.slice(2));
    expect(order.indexOf("HeroBlock") > order.indexOf("FeatureGridBlock"), `pressing on the hero and dragging should move it, got ${order.join(" ")}`);
    ok("pressing anywhere on a canvas node and dragging moves it");
    await page.close();
  });

  await step("Share links open what they encode, and nothing the inspector can't set", async () => {
    const doc = { page: { viewport: "tablet", dark: true, context: "social", surface: "not-a-token", gap: "block" },
      root: { children: [
        { id: "a", type: "Button", props: { children: "Hi", variant: "secondary", size: "huge", onClick: "alert(1)", dangerouslySetInnerHTML: { __html: "<b>x</b>" } }, style: { surface: "subtle", padding: "10px" } },
        { id: "b", type: "NotAComponent" },
        { id: "c", type: "Grid", props: { minColumnWidth: "13px" }, children: [{ id: "a", type: "Badge" }] },
        { id: "d", type: "Group", props: { direction: "column", gap: "9px", children: "x" }, style: { marginY: "md", w: "200px" } },
      ] } };
    const hash = "#b=" + Buffer.from(JSON.stringify(doc)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const shared = await open({ width: 1280, height: 900 }, hash);
    await shared.frame.waitForSelector('[data-bf-type="Button"]');
    const saved = await shared.page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const [button, grid, group] = saved.root.children;
    expect(saved.page.viewport === "tablet" && saved.page.dark === true && saved.page.context === "social" && saved.page.gap === "block", "the page settings should come through");
    expect(saved.page.surface === "base", `an unknown surface token should fall back to base, got ${saved.page.surface}`);
    expect(JSON.stringify(button.props) === JSON.stringify({ children: "Hi", variant: "secondary" }), `only real props and values survive, got ${JSON.stringify(button.props)}`);
    expect(JSON.stringify(button.style) === JSON.stringify({ surface: "subtle" }), `only token styles survive, got ${JSON.stringify(button.style)}`);
    expect(saved.root.children.length === 3 && grid.type === "Grid" && group.type === "Group", "an unknown component is dropped");
    expect(!grid.props.minColumnWidth && grid.children[0].id !== "a", "a raw minColumnWidth is dropped and a repeated id replaced");
    expect(JSON.stringify(group.props) === JSON.stringify({ direction: "column" }) && JSON.stringify(group.style) === JSON.stringify({ marginY: "md" }), `Group keeps only its own props and token styles, got ${JSON.stringify(group)}`);
    expect(await shared.frame.evaluate(() => innerWidth) === 768, "the canvas should be 768px wide for tablet");
    ok("settings and real props come through; handlers, raw values, bad enum values, unknown components and repeated ids don't");
    await shared.page.close();
  });

  await step("At 390px: panels behind tabs, nothing wider than the screen", async () => {
    const phone = await open({ width: 390, height: 844 });
    expect(await phone.page.locator(".bd-tabs [role=tab]").count() === 3, "three panel tabs");
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "the page should not scroll sideways");
    expect(await phone.frame.evaluate(() => innerWidth) === 390, "the default canvas on a phone is the phone frame");
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Add" }).click();
    await phone.page.locator(".bd-cat[aria-label=Actions]").click();
    await phone.page.locator('.bd-tile[data-type="Button"]').click();
    expect(await phone.page.locator(".bd-tabs [role=tab][aria-selected=true]").textContent() === "Canvas", "adding returns to the canvas");
    await phone.frame.waitForSelector('[data-bf-type="Button"]');
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "still no sideways scroll");
    ok("tabs, no overflow, a phone canvas, and tap to add");
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
