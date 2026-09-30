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
      - CartLine: the stepper and remove are named after the item and call
        back; at 1 the stepper's minus becomes remove too.
      - PromoCode: the disclosure opens (aria-expanded) and focuses the
        field; Enter applies the trimmed code; the chip's "Remove code …"
        calls onRemove and returns focus to the field.
      - PaymentFields: a typed number groups in fours (Amex 4-6-5), expiry
        reads MM / YY, and the cc-* autocomplete tokens are set.
      - OrderStatus: exactly one step is aria-current="step"; horizontal
        turns vertical at 390px and back.
      - AddressFields: every field carries its autocomplete token.

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
<div id="checkout-root"></div>
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
/* Cart and checkout: CartLine, PromoCode, PaymentFields, OrderStatus and
   AddressFields, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { AddressFields, CartLine, OrderStatus, PaymentFields, PromoCode } from "@dovetail-ds/react";
const h = React.createElement;
window.__checkout = { quantities: [], removed: 0, applied: [], promoRemoved: 0 };
function Checkout() {
  const [qty, setQty] = React.useState(2);
  const [code, setCode] = React.useState("");
  const [applied, setApplied] = React.useState(null);
  const [card, setCard] = React.useState({ number: "", expiry: "", cvc: "" });
  const [address, setAddress] = React.useState({ name: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "" });
  return h("div", null,
    h(CartLine, { name: "Test shirt", price: 20, quantity: qty, locale: "en-US",
      onQuantityChange: (n) => { window.__checkout.quantities.push(n); setQty(n); },
      onRemove: () => { window.__checkout.removed++; } }),
    h(PromoCode, { value: code, onChange: setCode, applied: applied || undefined,
      onApply: (c) => { window.__checkout.applied.push(c); setApplied({ code: c.toUpperCase(), description: "10% off" }); },
      onRemove: () => { window.__checkout.promoRemoved++; setApplied(null); setCode(""); } }),
    h(PaymentFields, { value: card, onChange: setCard, legend: "Test card" }),
    h(OrderStatus, { label: "Test order", current: "shipped", steps: [
      { id: "ordered", label: "Ordered" }, { id: "shipped", label: "Shipped" }, { id: "delivered", label: "Delivered" }] }),
    h(OrderStatus, { label: "Test order, horizontal", current: "ordered", status: "delayed", orientation: "horizontal", steps: [
      { id: "ordered", label: "Ordered" }, { id: "shipped", label: "Shipped" }, { id: "delivered", label: "Delivered" }] }),
    h(AddressFields, { value: address, onChange: setAddress, legend: "Test address" }),
    h(AddressFields, { value: address, onChange: setAddress, legend: "Test address, countries", fields: { phone: false, line2: false },
      countries: [{ value: "US", label: "United States" }, { value: "CA", label: "Canada" }] }));
}
createRoot(document.getElementById("checkout-root")).render(h(Checkout));
window.__checkoutReady = true;
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

  await step("CartLine: controls carry the item name and call back", async () => {
    await page.waitForFunction(() => window.__checkoutReady === true);
    const group = page.getByRole("group", { name: "Quantity, Test shirt", exact: true });
    expect((await group.count()) === 1, 'the stepper should be a group named "Quantity, Test shirt"');
    await group.getByRole("button", { name: "Increase quantity, Test shirt", exact: true }).click();
    const seen = await page.evaluate(() => window.__checkout.quantities);
    expect(seen.length === 1 && seen[0] === 3, `increase from 2 should call onQuantityChange(3), got ${JSON.stringify(seen)}`);
    ok("the stepper is named after the item, and increase calls onQuantityChange(3)");
    const removes = page.getByRole("button", { name: "Remove Test shirt", exact: true });
    expect((await removes.count()) === 1, "above the minimum there should be one Remove Test shirt button, beside the stepper");
    await removes.click();
    expect((await page.evaluate(() => window.__checkout.removed)) === 1, "Remove Test shirt should call onRemove once");
    await group.getByRole("button", { name: "Decrease quantity, Test shirt", exact: true }).click();
    await group.getByRole("button", { name: "Decrease quantity, Test shirt", exact: true }).click();
    expect((await removes.count()) === 2, "at 1 the stepper's minus should also become Remove Test shirt");
    await group.getByRole("button", { name: "Remove Test shirt", exact: true }).click();
    expect((await page.evaluate(() => window.__checkout.removed)) === 2, "the stepper's remove should call onRemove");
    ok("Remove Test shirt calls onRemove, from the button and from the stepper at 1");
  });

  await step("PromoCode: disclosure, Enter applies, the chip removes", async () => {
    const toggle = page.getByRole("button", { name: "Have a promo code?", exact: true });
    expect((await toggle.getAttribute("aria-expanded")) === "false", "the disclosure should start collapsed");
    expect((await page.getByRole("textbox", { name: "Promo code", exact: true }).count()) === 0, "the field should be hidden while collapsed");
    await toggle.click();
    const field = page.getByRole("textbox", { name: "Promo code", exact: true });
    expect((await toggle.getAttribute("aria-expanded")) === "true", "aria-expanded should turn true");
    expect(await field.evaluate((el) => el === document.activeElement), "opening should move focus to the field");
    ok("the disclosure opens with aria-expanded and focuses the field");
    await page.keyboard.type("  summer10 ");
    await page.keyboard.press("Enter");
    const applied = await page.evaluate(() => window.__checkout.applied);
    expect(applied.length === 1 && applied[0] === "summer10", `Enter should call onApply with the trimmed code, got ${JSON.stringify(applied)}`);
    const remove = page.getByRole("button", { name: "Remove code SUMMER10", exact: true });
    expect((await remove.count()) === 1, 'the applied chip should have a button named "Remove code SUMMER10"');
    ok('Enter calls onApply("summer10"); the chip shows a Remove code SUMMER10 button');
    await remove.click();
    expect((await page.evaluate(() => window.__checkout.promoRemoved)) === 1, "the chip's remove should call onRemove");
    expect(await page.getByRole("textbox", { name: "Promo code", exact: true }).evaluate((el) => el === document.activeElement),
      "after removing, focus should move to the field");
    ok("the chip's remove calls onRemove and focus moves to the field");
  });

  await step("PaymentFields: formats as the user types", async () => {
    const number = page.getByRole("textbox", { name: "Card number", exact: true });
    await number.click();
    await page.keyboard.type("4242424242424242");
    expect((await number.inputValue()) === "4242 4242 4242 4242", `a typed Visa number should read "4242 4242 4242 4242", got "${await number.inputValue()}"`);
    expect((await page.getByText("Visa", { exact: true }).count()) === 1, "a number starting 4 should show the Visa badge");
    ok("16 digits group in fours, and the Visa badge shows");
    await number.fill("");
    await number.click();
    await page.keyboard.type("378282246310005");
    expect((await number.inputValue()) === "3782 822463 10005", `an Amex number should group 4-6-5, got "${await number.inputValue()}"`);
    ok("an Amex number groups 4-6-5");
    const expiry = page.getByRole("textbox", { name: "Expiry date", exact: true });
    await expiry.click();
    await page.keyboard.type("1228");
    expect((await expiry.inputValue()) === "12 / 28", `expiry 1228 should read "12 / 28", got "${await expiry.inputValue()}"`);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    expect((await expiry.inputValue()) === "12", `two Backspaces should leave "12", got "${await expiry.inputValue()}"`);
    await expiry.fill("");
    await expiry.click();
    await page.keyboard.type("4");
    expect((await expiry.inputValue()) === "04", `a single 4 should become "04", got "${await expiry.inputValue()}"`);
    ok("expiry reads MM / YY, Backspace passes the separator, and 4 becomes 04");
    const attrs = await page.getByRole("group", { name: "Test card", exact: true }).evaluate((el) =>
      [...el.querySelectorAll("input")].map((i) => `${i.autocomplete}:${i.inputMode || "-"}`).join(" "));
    expect(attrs === "cc-number:numeric cc-exp:numeric cc-csc:numeric cc-name:-", `autocomplete and inputMode should be cc-number, cc-exp, cc-csc (numeric) and cc-name, got ${attrs}`);
    ok(attrs);
  });

  await step("OrderStatus: one aria-current step; horizontal collapses when narrow", async () => {
    const list = page.getByRole("list", { name: "Test order", exact: true });
    const current = await list.evaluate((el) => [...el.querySelectorAll('[aria-current="step"]')].map((li) => li.textContent));
    expect(current.length === 1 && /Shipped/.test(current[0]), `exactly one step, Shipped, should be aria-current="step", got ${JSON.stringify(current)}`);
    expect((await list.getByRole("listitem").count()) === 3, "each step should be a listitem of the ordered list");
    ok('exactly one listitem, "Shipped", has aria-current="step"');
    const wrap = page.getByRole("list", { name: "Test order, horizontal", exact: true }).locator("xpath=..");
    expect((await wrap.getAttribute("data-orientation")) === "horizontal", "a horizontal timeline at 1280px should stay horizontal");
    await page.setViewportSize({ width: 390, height: 800 });
    await page.waitForFunction(() => document.querySelector('[aria-label="Test order, horizontal"]').parentElement.dataset.orientation === "vertical");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForFunction(() => document.querySelector('[aria-label="Test order, horizontal"]').parentElement.dataset.orientation === "horizontal");
    ok("horizontal turns vertical at 390px and back at 1280px");
  });

  await step("AddressFields: autocomplete tokens", async () => {
    const tokens = (legend) => page.getByRole("group", { name: legend, exact: true }).evaluate((el) =>
      [...el.querySelectorAll("input, select")].map((i) => i.getAttribute("autocomplete")).join(" "));
    const all = await tokens("Test address");
    expect(all === "name address-line1 address-line2 address-level2 address-level1 postal-code country-name tel",
      `every field should carry its token, got "${all}"`);
    const listed = await tokens("Test address, countries");
    expect(listed === "name address-line1 address-level2 address-level1 postal-code country",
      `with countries and phone and line2 hidden, got "${listed}"`);
    const tel = await page.getByRole("textbox", { name: "Phone (optional)", exact: true }).evaluate((el) => `${el.type}:${el.inputMode}`);
    expect(tel === "tel:tel", `phone should be type tel with inputMode tel, got ${tel}`);
    ok(all);
    ok(`${listed} (country is a select)`);
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
