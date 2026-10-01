#!/usr/bin/env node
/* Drives the builder page (builder.html) in a real browser.

     npm run check:builder

   Checks, against the built site:
   - every component the palette offers renders on the canvas from its
     starting props, with no error box and no script error;
   - dragging a palette item onto an empty page adds it, and clicking it on
     the canvas selects it;
   - a token chosen in the inspector reaches the component as a custom
     property, and the exported code carries it;
   - the exported code's style values are all var(--dt-…), never a raw value;
   - undo puts the last change back;
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

function watch(page) {
  page.on("pageerror", (e) => errors.push("script error: " + String(e.message || e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error" && !THIRD_PARTY.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });
}

async function open(viewport, hash = "") {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.setDefaultTimeout(8000);
  watch(page);
  await page.goto(server.origin + "/builder.html");
  await page.evaluate(() => { localStorage.removeItem("dovetail-builder"); localStorage.removeItem("dovetail-theme-config"); });
  if (hash) await page.goto(server.origin + "/builder.html" + hash);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".bd-item").length > 20);
  const frame = page.frames().find((f) => f.url().includes("builder-frame"));
  await frame.waitForFunction(() => !!window.BuilderFrame);
  return { page, frame };
}

const canvasPoint = (page, frame, selector) => page.evaluate(async ({ selector }) => {
  const iframe = document.querySelector("iframe.bd-frame");
  const doc = iframe.contentDocument;
  let el = doc.querySelector(selector);
  if (el && el.style.display === "contents") el = el.firstElementChild;
  const r = el.getBoundingClientRect();
  const box = iframe.getBoundingClientRect();
  const s = box.width / parseFloat(iframe.style.width);
  return { x: box.left + (r.left + r.width / 2) * s, y: box.top + (r.top + r.height / 2) * s };
}, { selector });

try {
  const { page, frame } = await open({ width: 1440, height: 900 });

  await step("Every palette component renders on the canvas", async () => {
    const types = await page.$$eval(".bd-item", (els) => els.map((el) => el.getAttribute("data-type")));
    expect(types.length > 60, `the palette should offer most components, got ${types.length}`);
    const result = await frame.evaluate((types) => {
      const doc = { page: { viewport: "desktop", context: "product", surface: "base" }, root: { id: "root", type: "Root", props: {}, style: {}, children: types.map((t, i) => ({ id: "c" + i, type: t, props: {}, style: {}, children: [] })) } };
      window.BuilderFrame.render(doc, {});
      return new Promise((r) => setTimeout(() => r([...document.querySelectorAll(".bf-error")].map((e) => e.textContent.slice(0, 120))), 400));
    }, types);
    expect(result.length === 0, `components showed an error box: ${result.join(" | ")}`);
    ok(`${types.length} components rendered from their starting props`);
  });

  await step("Drag onto an empty page, then select on the canvas", async () => {
    await page.selectOption(".bd-start select", "blank");
    await frame.waitForSelector('[data-bf-slot="root"]');
    const item = page.locator('.bd-item[data-type="Stack"]');
    const from = await item.boundingBox();
    const to = await canvasPoint(page, frame, '[data-bf-slot="root"]');
    await page.mouse.move(from.x + 20, from.y + 12);
    await page.mouse.down();
    await page.mouse.move(from.x + 120, from.y + 20, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    expect(await page.locator(".bd-mark-box, .bd-mark-line").count() === 1, "a drop target should show while dragging over the page");
    await page.mouse.up();
    await frame.waitForSelector('[data-bf-type="Stack"]');
    ok("dropped Stack lands on the page, with a target shown during the drag");
    await page.locator('.bd-item[data-type="Heading"]').click();
    await frame.waitForSelector('[data-bf-type="Stack"] [data-bf-type="Heading"]');
    ok("with the Stack selected, a click on Heading adds it inside the Stack");
    await page.keyboard.press("Escape");
    const at = await canvasPoint(page, frame, '[data-bf-type="Heading"]');
    await page.mouse.click(at.x, at.y);
    await page.waitForFunction(() => document.querySelector(".bd-inspect-title")?.textContent === "Heading");
    ok("clicking the Heading on the canvas selects it in the inspector");
  });

  await step("Tokens only: the inspector sets custom properties, and the code keeps them", async () => {
    await page.locator(".bd-right .bd-field", { hasText: "Padding" }).locator("select").selectOption("lg");
    await frame.waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "var(--dt-space-inset-lg)");
    ok("Padding lg sets padding: var(--dt-space-inset-lg) on the Heading");
    const options = await page.$$eval(".bd-right select option", (os) => os.map((o) => o.value).filter(Boolean));
    expect(options.every((v) => !/\d(px|rem|em|%)$|^#|rgb|oklch/.test(v)), `an inspector option is a raw value: ${options.find((v) => /\d(px|rem|em|%)$|^#|rgb|oklch/.test(v))}`);
    ok("no inspector option is a raw length or colour");
    await page.locator(".bd-btn-primary", { hasText: "Code" }).click();
    const code = await page.locator(".bd-code-pre code").textContent();
    expect(/^import \{[^}]*Heading[^}]*Stack[^}]*\} from "@dovetail-ds\/react";/.test(code), "the code should import Heading and Stack from @dovetail-ds/react");
    expect(code.includes('padding: "var(--dt-space-inset-lg)"'), "the code should carry the padding token");
    const styleValues = [...code.matchAll(/style=\{\{([^}]*)\}\}/g)].flatMap((m) => [...m[1].matchAll(/:\s*"([^"]*)"/g)].map((v) => v[1]));
    const raw = styleValues.filter((v) => !/^(var\(--dt-[\w-]+\)|calc\(var\(--dt-[\w-]+\)[^)]*\)|flex|column|100%|auto|hidden)$/.test(v));
    expect(raw.length === 0, `style values that aren't tokens: ${raw.join(", ")}`);
    ok(`exported code imports from the package, and its ${styleValues.length} style values are all tokens`);
    await page.keyboard.press("Escape");
  });

  await step("Undo", async () => {
    await page.locator(".bd-tool-group .bd-act").first().click();
    await frame.waitForFunction(() => document.querySelector('[data-bf-type="Heading"]').firstElementChild.style.padding === "");
    ok("undo removes the padding again");
  });

  await page.close();

  await step("Share links open what they encode, and nothing the inspector can't set", async () => {
    const doc = { page: { viewport: "tablet", dark: true, context: "social", surface: "not-a-token", gap: "block" },
      root: { children: [
        { id: "a", type: "Button", props: { children: "Hi", variant: "secondary", onClick: "alert(1)", dangerouslySetInnerHTML: { __html: "<b>x</b>" } }, style: { surface: "subtle", padding: "10px" } },
        { id: "b", type: "NotAComponent" },
        { id: "c", type: "Grid", props: { minColumnWidth: "13px" }, children: [{ id: "a", type: "Badge" }] },
      ] } };
    const hash = "#b=" + Buffer.from(JSON.stringify(doc)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const shared = await open({ width: 1280, height: 900 }, hash);
    await shared.frame.waitForSelector('[data-bf-type="Button"]');
    const saved = await shared.page.evaluate(() => JSON.parse(localStorage.getItem("dovetail-builder")));
    const button = saved.root.children[0];
    expect(saved.page.viewport === "tablet" && saved.page.dark === true && saved.page.context === "social" && saved.page.gap === "block", "the page settings should come through");
    expect(saved.page.surface === "base", `an unknown surface token should fall back to base, got ${saved.page.surface}`);
    expect(JSON.stringify(button.props) === JSON.stringify({ children: "Hi", variant: "secondary" }), `only real props survive, got ${JSON.stringify(button.props)}`);
    expect(JSON.stringify(button.style) === JSON.stringify({ surface: "subtle" }), `only token styles survive, got ${JSON.stringify(button.style)}`);
    expect(saved.root.children.length === 2 && saved.root.children[1].type === "Grid", "an unknown component is dropped");
    expect(!saved.root.children[1].props.minColumnWidth, "a raw minColumnWidth is dropped");
    expect(saved.root.children[1].children[0].id !== "a", "a repeated id is replaced");
    expect(await shared.frame.evaluate(() => innerWidth) === 768, "the canvas should be 768px wide for tablet");
    ok("settings and real props come through; handlers, raw values, unknown components and repeated ids don't");
    await shared.page.close();
  });

  await step("At 390px: panels behind tabs, nothing wider than the screen", async () => {
    const phone = await open({ width: 390, height: 844 });
    expect(await phone.page.locator(".bd-tabs [role=tab]").count() === 3, "three panel tabs");
    expect(await phone.page.evaluate(() => document.documentElement.scrollWidth) <= 390, "the page should not scroll sideways");
    expect(await phone.frame.evaluate(() => innerWidth) === 390, "the default canvas on a phone is the phone frame");
    await phone.page.locator(".bd-tabs [role=tab]", { hasText: "Add" }).click();
    await phone.page.locator('.bd-item[data-type="Button"]').click();
    expect(await phone.page.locator(".bd-tabs [role=tab][aria-selected=true]").textContent() === "Canvas", "adding returns to the canvas");
    await phone.frame.waitForSelector('[data-bf-type="Button"]');
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
