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
