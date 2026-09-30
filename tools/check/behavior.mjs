#!/usr/bin/env node
/* Drives the built package in a real browser and asserts how Dialog, Drawer
   and Tabs behave from the keyboard: what the consumer audits of 0.2.0 found
   broken, kept as a release regression check.

     npm run check:behavior

   1. Runs the package build into dist/react/.
   2. Writes a small page under dist/.behavior/ that loads dist/react through
      an import map, with React from the vendored copy in
      system/components/lib, so there is no bundler and no network.
   3. Opens it in Chromium (Playwright; set CHROMIUM_PATH to use a local
      binary) and checks:
      - Tabs: ArrowRight, ArrowLeft, Home and End move only among enabled
        tabs and wrap at the ends, and onChange never sees a disabled id.
      - Dialog: role="dialog" is named by its title and described by its
        description; focus moves inside on open; Tab from the last control
        and Shift+Tab from the first stay inside; the page behind stops
        scrolling; Escape closes it, restores scrolling and returns focus to
        the opener. A dialog with no title is named by `label`.
      - Drawer: named by its title; focus moves inside; Tab stays inside;
        Escape returns focus to the opener.
      - QuantityStepper: ArrowUp/Down step, Home/End jump to min/max,
        PageUp and typed values clamp, the limit buttons turn aria-disabled,
        and at min an onRemove stepper's minus becomes Remove (keeping
        focus) while ArrowDown never removes.
      - Rating input: one roving tab stop that follows the chosen star;
        arrows choose and focus, wrapping; Home/End.
      - VariantPicker: arrows choose and focus, skipping unavailable options
        and wrapping; Home/End; one roving tab stop; an unavailable option
        is named "…, unavailable" and never reaches onChange.
      - ProductGallery: Next/Previous change the image and aria-current and
        wrap; thumbnail arrows, Home and End move focus and show the image;
        one roving tab stop; the live region reads "Image n of total".
      - ProductCard: one link, named by the product (the stretched copy is
        aria-hidden); the quick-add button is its own tab stop and its click
        does not follow the link.

   Exits 1 if any assertion fails or the page logs a script error. Set
   KEEP_TMP=1 to keep dist/.behavior/. */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve, ROOT } from "./serve.mjs";

const DIR = path.join(ROOT, "dist", ".behavior");
const URL_PATH = "/dist/.behavior/index.html";

let failures = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};

async function step(title, fn) {
  console.log(title);
  try {
    await fn();
  } catch (err) {
    fail(String(err && err.message ? err.message : err).split("\n").slice(0, 4).join("\n        "));
    /* A failed step may leave an overlay open; close it so the next step
       reports its own result rather than a blocked click. */
    if (page) await page.keyboard.press("Escape").catch(() => {});
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* The page: plain createElement, no JSX, no bundler. */
const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dovetail behaviour check</title>
<link rel="stylesheet" href="../styles.css">
<script src="../../system/components/lib/react.production.min.js"></script>
<script src="../../system/components/lib/react-dom.production.min.js"></script>
<script type="importmap">{"imports":{"react":"./react.js","react-dom/client":"./react-dom-client.js","@dovetail-ds/react":"../react/index.js"}}</script>
</head><body>
<div id="root"></div>
<div id="commerce-root"></div>
<div id="product-root"></div>
<div style="height:3000px"></div>
<script type="module">
import React from "react";
import { createRoot } from "react-dom/client";
import { Button, Dialog, Drawer, Input, Section, Stack, TabPanel, Tabs } from "@dovetail-ds/react";
const h = React.createElement;
window.__changes = [];
function App() {
  const [tab, setTab] = React.useState("overview");
  const [dialog, setDialog] = React.useState(false);
  const [bare, setBare] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const onChange = (id) => { window.__changes.push(id); setTab(id); };
  return h(Section, null, h(Stack, { gap: "md" },
    h(Tabs, { label: "Views", value: tab, onChange, tabs: [
      { id: "overview", label: "Overview" },
      { id: "off", label: "Unavailable", disabled: true },
      { id: "details", label: "Details" },
      { id: "archived", label: "Archived", disabled: true },
    ] }),
    h(TabPanel, { id: "overview", value: tab }, "Overview content"),
    h(TabPanel, { id: "off", value: tab }, "Disabled content must not show"),
    h(TabPanel, { id: "details", value: tab }, "Details content"),
    h(TabPanel, { id: "archived", value: tab }, "Archived content must not show"),
    h(Button, { onClick: () => setDialog(true) }, "Open dialog"),
    h(Button, { onClick: () => setBare(true) }, "Open bare dialog"),
    h(Button, { onClick: () => setDrawer(true) }, "Open drawer"),
    h(Button, null, "After the openers"),
    h(Dialog, { open: dialog, onClose: () => setDialog(false), title: "Test dialog", description: "Modal behaviour",
      footer: h(Button, { onClick: () => setDialog(false) }, "Confirm") }, h(Input, { label: "Name" })),
    h(Dialog, { open: bare, onClose: () => setBare(false), label: "Unnamed dialog" }, h(Button, { onClick: () => setBare(false) }, "Done")),
    h(Drawer, { open: drawer, onClose: () => setDrawer(false), title: "Filters",
      footer: h(Button, { onClick: () => setDrawer(false) }, "Apply") }, h(Input, { label: "Search" })),
  ));
}
createRoot(document.getElementById("root")).render(h(App));
window.__ready = true;
</script>
<script type="module">
/* Commerce: QuantityStepper and Rating, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { QuantityStepper, Rating } from "@dovetail-ds/react";
const h = React.createElement;
window.__commerce = { removed: 0, ratings: [] };
function Commerce() {
  const [qty, setQty] = React.useState(2);
  const [line, setLine] = React.useState(2);
  const [stars, setStars] = React.useState(0);
  return h("div", null,
    h(QuantityStepper, { label: "Test quantity", value: qty, onChange: setQty, min: 1, max: 5 }),
    h(QuantityStepper, { label: "Test line", removeLabel: "Remove test line", value: line, onChange: setLine,
      onRemove: () => { window.__commerce.removed++; } }),
    h(Rating, { label: "Test rating", value: stars, onChange: (n) => { window.__commerce.ratings.push(n); setStars(n); } }));
}
createRoot(document.getElementById("commerce-root")).render(h(Commerce));
window.__commerceReady = true;
</script>
<script type="module">
/* Commerce: VariantPicker, ProductGallery and ProductCard, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductCard, ProductGallery, VariantPicker } from "@dovetail-ds/react";
const h = React.createElement;
window.__product = { sizes: [], images: [], quickAdds: 0 };
const img = (n) => "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><text y='8'>" + n + "</text></svg>");
function Product() {
  const [size, setSize] = React.useState("s");
  const [index, setIndex] = React.useState(0);
  return h("div", null,
    h(VariantPicker, { label: "Test size", value: size, onChange: (v) => { window.__product.sizes.push(v); setSize(v); }, options: [
      { value: "xs", label: "XS", disabled: true },
      { value: "s", label: "S" },
      { value: "m", label: "M", disabled: true },
      { value: "l", label: "L" },
      { value: "xl", label: "XL" },
      { value: "xxl", label: "XXL", disabled: true },
    ] }),
    h(ProductGallery, { label: "Test gallery", value: index, onChange: (i) => { window.__product.images.push(i); setIndex(i); },
      images: [1, 2, 3, 4, 5].map((n) => ({ src: img(n), alt: "Test view " + n })) }),
    h("div", { style: { width: "240px" } },
      h(ProductCard, { name: "Test mug", href: "#test-mug", price: 24, image: { src: img("M"), alt: "" },
        onQuickAdd: () => { window.__product.quickAdds++; } })));
}
createRoot(document.getElementById("product-root")).render(h(Product));
window.__productReady = true;
</script>
</body></html>
`;

await step("build", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "build-package.mjs")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`build-package exited ${r.status}:\n${r.stderr}${r.stdout}`);
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, "index.html"), PAGE);
  fs.writeFileSync(path.join(DIR, "react.js"), "export default window.React;\n");
  fs.writeFileSync(path.join(DIR, "react-dom-client.js"), "export const createRoot = window.ReactDOM.createRoot;\n");
  ok("dist/react built; page written to dist/.behavior/ (import map, vendored React, no network)");
});

const server = await serve(0);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
let page;

try {
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(4000);
  page.on("pageerror", (e) => errors.push("script error: " + String(e.message || e).split("\n")[0]));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text().slice(0, 160));
  });
  await page.goto(server.origin + URL_PATH);
  await page.waitForFunction(() => window.__ready === true);

  const active = () => page.evaluate(() => {
    const a = document.activeElement;
    return a ? (a.getAttribute("aria-label") || a.textContent || a.tagName).trim() : "";
  });
  const activeInside = (role, name) => page.getByRole(role, { name }).evaluate((el) => el.contains(document.activeElement));
  const bodyOverflow = () => page.evaluate(() => getComputedStyle(document.body).overflow);

  await step("Tabs: keys skip disabled tabs and wrap", async () => {
    const tab = (name) => page.getByRole("tab", { name });
    const selected = async (name) => (await tab(name).getAttribute("aria-selected")) === "true";
    await tab("Overview").focus();
    await page.keyboard.press("ArrowRight");
    expect(await selected("Details"), "ArrowRight from Overview should select Details, skipping the disabled tab");
    expect((await active()) === "Details", "ArrowRight should also focus Details");
    expect((await page.getByRole("tabpanel").textContent()) === "Details content", "the Details panel should show");
    ok("ArrowRight skips a disabled tab");
    await page.keyboard.press("ArrowRight");
    expect(await selected("Overview"), "ArrowRight from the last enabled tab should wrap to the first, skipping the disabled last tab");
    ok("ArrowRight wraps past a disabled last tab");
    await page.keyboard.press("ArrowLeft");
    expect(await selected("Details"), "ArrowLeft from the first tab should wrap to the last enabled tab");
    ok("ArrowLeft wraps to the last enabled tab");
    await page.keyboard.press("Home");
    expect(await selected("Overview"), "Home should select the first enabled tab");
    await page.keyboard.press("End");
    expect(await selected("Details"), "End should select the last enabled tab, not the disabled one");
    ok("Home and End land on enabled tabs");
    const changes = await page.evaluate(() => window.__changes);
    const bad = changes.filter((id) => id === "off" || id === "archived");
    expect(bad.length === 0, `onChange was called with a disabled id: ${bad.join(", ")}`);
    ok(`onChange saw ${changes.length} changes, none disabled`);
  });

  await step("Dialog: name, description, focus, trap, Escape", async () => {
    await page.getByRole("button", { name: "Open dialog", exact: true }).click();
    expect((await page.getByRole("dialog", { name: "Test dialog" }).count()) === 1, "no role=dialog named by its title");
    ok('role="dialog" is named "Test dialog" by its title');
    const described = await page.getByRole("dialog").evaluate((el) => {
      const id = el.getAttribute("aria-describedby");
      return id && document.getElementById(id) ? document.getElementById(id).textContent : null;
    });
    expect(described === "Modal behaviour", `aria-describedby should resolve to the description, got ${JSON.stringify(described)}`);
    ok("aria-describedby resolves to the description");
    expect(await activeInside("dialog", "Test dialog"), `focus should move into the dialog on open, but it is on "${await active()}"`);
    ok("focus moves into the dialog on open");
    expect((await bodyOverflow()) === "hidden", "the page behind should stop scrolling while the dialog is open");
    ok("body scrolling is locked while open");
    await page.getByRole("button", { name: "Confirm", exact: true }).focus();
    await page.keyboard.press("Tab");
    expect(await activeInside("dialog", "Test dialog"), `Tab after the last control should stay inside, but focus is on "${await active()}"`);
    expect((await active()) === "Close", `Tab after the last control should wrap to the close button, got "${await active()}"`);
    ok("Tab from the last control wraps to the first");
    await page.keyboard.press("Shift+Tab");
    expect((await active()) === "Confirm", `Shift+Tab from the first control should wrap to the last, got "${await active()}"`);
    ok("Shift+Tab from the first control wraps to the last");
    await page.keyboard.press("Escape");
    expect((await page.getByRole("dialog").count()) === 0, "Escape should close the dialog");
    expect((await active()) === "Open dialog", `focus should return to the opener, got "${await active()}"`);
    expect((await bodyOverflow()) !== "hidden", "the page should scroll again once the dialog closes");
    ok("Escape closes it, focus returns to the opener, scrolling is restored");
  });

  await step("Dialog without a title: label names it", async () => {
    await page.getByRole("button", { name: "Open bare dialog", exact: true }).click();
    expect((await page.getByRole("dialog", { name: "Unnamed dialog" }).count()) === 1, "a dialog with no title should be named by label");
    expect(await activeInside("dialog", "Unnamed dialog"), "focus should move into the bare dialog");
    await page.keyboard.press("Escape");
    expect((await page.getByRole("dialog").count()) === 0, "Escape should close the bare dialog");
    ok('a title-less dialog is named by label="Unnamed dialog"');
  });

  await step("Drawer: name, focus, trap, Escape", async () => {
    await page.getByRole("button", { name: "Open drawer", exact: true }).click();
    expect((await page.getByRole("dialog", { name: "Filters" }).count()) === 1, "the drawer should be named by its title");
    expect(await activeInside("dialog", "Filters"), `focus should move into the drawer, but it is on "${await active()}"`);
    ok("the drawer is named by its title and takes focus");
    await page.getByRole("button", { name: "Apply", exact: true }).focus();
    await page.keyboard.press("Tab");
    expect(await activeInside("dialog", "Filters"), `Tab after the last control should stay inside the drawer, but focus is on "${await active()}"`);
    ok("Tab from the last control stays inside the drawer");
    await page.keyboard.press("Escape");
    expect((await page.getByRole("dialog").count()) === 0, "Escape should close the drawer");
    expect((await active()) === "Open drawer", `focus should return to the drawer's opener, got "${await active()}"`);
    ok("Escape closes the drawer and focus returns to the opener");
  });

  await step("QuantityStepper: keys step and clamp, limits, remove at min", async () => {
    await page.waitForFunction(() => window.__commerceReady === true);
    const group = page.getByRole("group", { name: "Test quantity", exact: true });
    const field = page.getByRole("spinbutton", { name: "Test quantity", exact: true });
    const now = async () => Number(await field.getAttribute("aria-valuenow"));
    const off = async (name) => (await group.getByRole("button", { name, exact: true }).getAttribute("aria-disabled")) === "true";
    expect((await field.getAttribute("aria-valuemin")) === "1" && (await field.getAttribute("aria-valuemax")) === "5",
      "the spinbutton should carry aria-valuemin 1 and aria-valuemax 5");
    await field.focus();
    await page.keyboard.press("ArrowUp");
    expect((await now()) === 3, `ArrowUp from 2 should give 3, got ${await now()}`);
    await page.keyboard.press("ArrowDown");
    expect((await now()) === 2, `ArrowDown from 3 should give 2, got ${await now()}`);
    ok("ArrowUp and ArrowDown step by one");
    await page.keyboard.press("End");
    expect((await now()) === 5, `End should jump to max 5, got ${await now()}`);
    await page.keyboard.press("ArrowUp");
    expect((await now()) === 5, `ArrowUp at max should stay at 5, got ${await now()}`);
    expect(await off("Increase quantity"), "the increase button should be aria-disabled at max");
    ok("End jumps to max; ArrowUp clamps there and the increase button turns off");
    await page.keyboard.press("Home");
    expect((await now()) === 1, `Home should jump to min 1, got ${await now()}`);
    await page.keyboard.press("ArrowDown");
    expect((await now()) === 1, `ArrowDown at min should stay at 1, got ${await now()}`);
    expect(await off("Decrease quantity"), "the decrease button should be aria-disabled at min");
    ok("Home jumps to min; ArrowDown clamps there and the decrease button turns off");
    await page.keyboard.press("PageUp");
    expect((await now()) === 5, `PageUp from 1 should clamp at 5, got ${await now()}`);
    await field.fill("9");
    await page.keyboard.press("Enter");
    expect((await now()) === 5 && (await field.inputValue()) === "5", "a typed 9 should commit on Enter, clamped to 5");
    await field.fill("3");
    await field.blur();
    expect((await now()) === 3, `a typed 3 should commit on blur, got ${await now()}`);
    ok("PageUp clamps; a typed value commits on Enter or blur, clamped");

    const line = page.getByRole("group", { name: "Test line", exact: true });
    await line.getByRole("button", { name: "Decrease quantity", exact: true }).click();
    const lineField = page.getByRole("spinbutton", { name: "Test line", exact: true });
    expect((await lineField.getAttribute("aria-valuenow")) === "1", "decrease from 2 should give 1");
    expect((await line.getByRole("button", { name: "Decrease quantity", exact: true }).count()) === 0,
      "at min with onRemove there should be no decrease button");
    const remove = line.getByRole("button", { name: "Remove test line", exact: true });
    expect((await remove.count()) === 1, "at min with onRemove the minus should become a button named by removeLabel");
    expect(await remove.evaluate((el) => el === document.activeElement), "focus should stay on the button as it becomes remove");
    await lineField.focus();
    await page.keyboard.press("ArrowDown");
    expect((await page.evaluate(() => window.__commerce.removed)) === 0, "ArrowDown at min must not call onRemove");
    await remove.click();
    expect((await page.evaluate(() => window.__commerce.removed)) === 1, "pressing remove should call onRemove once");
    ok("at min the minus becomes Remove, keeps focus, and calls onRemove; ArrowDown never removes");
  });

  await step("Rating input: arrows choose, one roving tab stop", async () => {
    const group = page.getByRole("radiogroup", { name: "Test rating", exact: true });
    const star = (n) => group.getByRole("radio", { name: `${n} ${n === 1 ? "star" : "stars"}`, exact: true });
    const checked = async (n) => (await star(n).getAttribute("aria-checked")) === "true";
    const stops = () => group.evaluate((el) => [...el.querySelectorAll('[role="radio"]')].map((r) => r.tabIndex));
    expect((await group.getByRole("radio").count()) === 5, "a five-star input should have five radios");
    expect(JSON.stringify(await stops()) === "[0,-1,-1,-1,-1]", `with nothing chosen only the first star should be a tab stop, got ${JSON.stringify(await stops())}`);
    ok("five radios; with nothing chosen the first star is the one tab stop");
    await star(1).focus();
    await page.keyboard.press("ArrowRight");
    expect(await checked(2), "ArrowRight from the first star should choose 2 stars");
    expect((await active()) === "2 stars", `ArrowRight should move focus to 2 stars, got "${await active()}"`);
    expect(JSON.stringify(await stops()) === "[-1,0,-1,-1,-1]", `the tab stop should follow the chosen star, got ${JSON.stringify(await stops())}`);
    ok("ArrowRight chooses and focuses the next star; the tab stop follows it");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    expect(await checked(5), "ArrowLeft from the first star should wrap to the last");
    await page.keyboard.press("Home");
    expect(await checked(1) && (await active()) === "1 star", "Home should choose and focus the first star");
    await page.keyboard.press("End");
    expect(await checked(5) && (await active()) === "5 stars", "End should choose and focus the last star");
    ok("ArrowLeft wraps; Home and End choose the first and last");
    const seen = await page.evaluate(() => window.__commerce.ratings);
    expect(seen.every((n) => Number.isInteger(n) && n >= 1 && n <= 5), `onChange got out-of-range values: ${seen.join(", ")}`);
    ok(`onChange saw ${seen.join(", ")}`);
  });

  await step("VariantPicker: arrows choose, skip unavailable, one roving tab stop", async () => {
    await page.waitForFunction(() => window.__productReady === true);
    const group = page.getByRole("radiogroup", { name: "Test size", exact: true });
    const radio = (name) => group.getByRole("radio", { name, exact: true });
    const checked = async (name) => (await radio(name).getAttribute("aria-checked")) === "true";
    const stops = () => group.evaluate((el) => [...el.querySelectorAll('[role="radio"]')].map((r) => r.tabIndex));
    expect((await group.getByRole("radio").count()) === 6, "six options should render six radios, unavailable ones included");
    expect((await radio("M, unavailable").getAttribute("aria-disabled")) === "true", 'an unavailable option should be named "M, unavailable" and be aria-disabled');
    expect(JSON.stringify(await stops()) === "[-1,0,-1,-1,-1,-1]", `only the chosen S should be a tab stop, got ${JSON.stringify(await stops())}`);
    ok('six radios; unavailable ones are named "…, unavailable" and aria-disabled; the chosen one is the one tab stop');
    await radio("S").focus();
    await page.keyboard.press("ArrowRight");
    expect(await checked("L"), "ArrowRight from S should choose L, skipping the unavailable M");
    expect((await active()) === "L", `ArrowRight should move focus to L, got "${await active()}"`);
    expect(JSON.stringify(await stops()) === "[-1,-1,-1,0,-1,-1]", `the tab stop should follow the chosen option, got ${JSON.stringify(await stops())}`);
    ok("ArrowRight skips an unavailable option, chooses and focuses the next; the tab stop follows");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    expect(await checked("S"), "ArrowRight from XL should wrap to S, skipping the unavailable XXL and XS");
    await page.keyboard.press("ArrowLeft");
    expect(await checked("XL"), "ArrowLeft from S should wrap back to XL");
    await page.keyboard.press("Home");
    expect(await checked("S") && (await active()) === "S", "Home should choose and focus the first available option, S");
    await page.keyboard.press("End");
    expect(await checked("XL") && (await active()) === "XL", "End should choose and focus the last available option, XL");
    ok("arrows wrap past unavailable options; Home and End land on available ones");
    await radio("M, unavailable").click({ force: true });
    expect(await checked("XL"), "clicking an unavailable option should not choose it");
    const seen = await page.evaluate(() => window.__product.sizes);
    const bad = seen.filter((v) => v === "xs" || v === "m" || v === "xxl");
    expect(bad.length === 0, `onChange was called with an unavailable value: ${bad.join(", ")}`);
    ok(`onChange saw ${seen.join(", ")}, none unavailable`);
  });

  await step("ProductGallery: buttons and thumbnail arrows change the image and aria state", async () => {
    const gallery = page.getByRole("region", { name: "Test gallery", exact: true });
    const thumbs = gallery.getByRole("group", { name: "Thumbnails", exact: true });
    const mainAlt = () => gallery.locator("img").first().getAttribute("alt");
    const current = () => thumbs.evaluate((el) => [...el.querySelectorAll("button")].findIndex((b) => b.getAttribute("aria-current") === "true"));
    const stops = () => thumbs.evaluate((el) => [...el.querySelectorAll("button")].map((b) => b.tabIndex));
    expect((await thumbs.getByRole("button").count()) === 5, "five images should give five thumbnails");
    expect((await mainAlt()) === "Test view 1" && (await current()) === 0, "the gallery should start on the first image, its thumbnail aria-current");
    await gallery.getByRole("button", { name: "Next image", exact: true }).click();
    expect((await mainAlt()) === "Test view 2", `Next image should show the second image, got alt ${JSON.stringify(await mainAlt())}`);
    expect((await current()) === 1, "the second thumbnail should become aria-current");
    await gallery.getByRole("button", { name: "Previous image", exact: true }).click();
    await gallery.getByRole("button", { name: "Previous image", exact: true }).click();
    expect((await mainAlt()) === "Test view 5" && (await current()) === 4, "Previous image from the first should wrap to the last");
    ok("Next and Previous change the image and aria-current, and wrap");
    expect(JSON.stringify(await stops()) === "[-1,-1,-1,-1,0]", `only the shown thumbnail should be a tab stop, got ${JSON.stringify(await stops())}`);
    await thumbs.getByRole("button").nth(4).focus();
    await page.keyboard.press("ArrowRight");
    expect((await current()) === 0 && (await mainAlt()) === "Test view 1", "ArrowRight on the last thumbnail should wrap to the first and show it");
    expect((await active()) === "Test view 1 (1 of 5)", `focus should follow to the first thumbnail, got "${await active()}"`);
    await page.keyboard.press("ArrowRight");
    expect((await current()) === 1 && (await mainAlt()) === "Test view 2", "ArrowRight should show the next image");
    await page.keyboard.press("ArrowLeft");
    expect((await current()) === 0, "ArrowLeft should show the previous image");
    await page.keyboard.press("End");
    expect((await current()) === 4 && (await mainAlt()) === "Test view 5", "End should show the last image");
    await page.keyboard.press("Home");
    expect((await current()) === 0, "Home should show the first image");
    expect(JSON.stringify(await stops()) === "[0,-1,-1,-1,-1]", `the tab stop should follow the shown thumbnail, got ${JSON.stringify(await stops())}`);
    ok("thumbnail arrows, Home and End move focus and show the image; one roving tab stop");
    const live = await gallery.locator('[aria-live="polite"]').textContent();
    expect(live === "Image 1 of 5", `the live region should read "Image 1 of 5", got ${JSON.stringify(live)}`);
    ok('a polite live region announces "Image 1 of 5"');
  });

  await step("ProductCard: one link named by the product; quick add separately focusable", async () => {
    const root = page.locator("#product-root");
    const links = root.getByRole("link");
    expect((await links.count()) === 1, `the card should expose exactly one link, got ${await links.count()}`);
    expect((await links.first().textContent()) === "Test mug", `the link should be named by the product, got ${JSON.stringify(await links.first().textContent())}`);
    const anchors = await root.evaluate((el) => [...el.querySelectorAll("a")].map((a) => ({ hidden: a.getAttribute("aria-hidden"), tab: a.tabIndex })));
    expect(anchors.length === 2 && anchors.filter((a) => a.hidden === "true" && a.tab === -1).length === 1,
      `the stretched copy should be aria-hidden and out of the tab order, got ${JSON.stringify(anchors)}`);
    ok('one link, "Test mug"; the stretched copy is aria-hidden with tabindex -1');
    const add = root.getByRole("button", { name: "Add Test mug to cart", exact: true });
    expect((await add.count()) === 1, 'the quick-add button should be named "Add Test mug to cart"');
    await links.first().focus();
    await page.keyboard.press("Tab");
    expect((await active()) === "Add Test mug to cart" || (await add.evaluate((el) => el === document.activeElement)),
      `Tab from the link should reach the quick-add button, got "${await active()}"`);
    await page.keyboard.press("Shift+Tab");
    expect((await active()) === "Test mug", `Shift+Tab from quick add should return to the link, got "${await active()}"`);
    await add.click();
    expect((await page.evaluate(() => window.__product.quickAdds)) === 1, "clicking quick add should call onQuickAdd, above the stretched link");
    expect(!(await page.evaluate(() => location.hash === "#test-mug")), "clicking quick add must not follow the card's link");
    ok("quick add is its own tab stop and its click reaches onQuickAdd, not the link");
  });

  await step("page errors", () => {
    if (errors.length) throw new Error(errors.join("\n"));
    ok("no script or console errors");
  });
} finally {
  await browser.close();
  server.close();
  if (process.env.KEEP_TMP) console.log(`\nkept ${path.relative(ROOT, DIR)}`);
  else fs.rmSync(DIR, { recursive: true, force: true });
}

console.log(failures ? `\nbehavior check: ${failures} failure${failures === 1 ? "" : "s"}` : "\nbehavior check: passed");
process.exit(failures ? 1 : 0);
