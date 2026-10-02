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
      - Composer: Enter sends the text and the consumer can clear it;
        Shift+Enter inserts a newline; Enter during IME composition or with
        only whitespace does not send; send is disabled while empty.
      - MessageList: role="log" named by label; MessageDivider is a named
        separator; pinned to the bottom, and scrolled up a new message shows
        New messages, which jumps down and leaves focus on the log.
      - QuickReplies: a named group; Tab reaches each chip in order; Enter
        and Space select.
      - VariantPicker: arrows choose and focus, skipping unavailable options
        and wrapping; Home/End; one roving tab stop; an unavailable option
        is named "…, unavailable" and never reaches onChange.
      - ProductGallery: Next/Previous change the image and aria-current and
        wrap; thumbnail arrows, Home and End move focus and show the image;
        one roving tab stop; the live region reads "Image n of total".
      - ProductCard: one link, named by the product (the stretched copy is
        aria-hidden); the quick-add button is its own tab stop and its click
        does not follow the link.
      - FulfilmentToggle: one tab stop; arrow keys choose, focus and wrap,
        and onChange reports each value.
      - MenuItem: the row button and the add button are two separate focus
        targets, neither inside the other, each calling its own callback.
      - ModifierGroup: single mode is a radio group that arrows move through;
        multiple mode stops at max and disables the rest, saying why; a
        required group's error is linked by aria-describedby and marks the
        group aria-invalid.
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
      - CheckboxGroup and RadioGroup: the group is named by its label and
        described by its hint.
      - CheckboxGroup and RadioGroup with labelPosition="start": each label
        lines up with the group's question and the control sits at the
        row's right edge; clicking the label text still toggles or picks.
      - ChatBlock: a run of three from one author is first/middle/last
        (data-grouped); exactly one day divider per day change, and an event
        breaks a run; sending through its composer calls onSend. Mounted on
        demand and unmounted after, so its Send button and log never meet
        the Composer and MessageList checks above.
      - Food kit blocks: MenuBlock's category nav scrolls to a section,
        focuses it and marks its link aria-current; BasketBar renders
        nothing at count 0, then is named by label, count and total and
        calls onClick; OrderTrackingBlock's courier buttons are named.
      - CheckoutBlock: in a narrow box the order summary is a disclosure
        whose button toggles aria-expanded and shows its panel; the email
        field has autocomplete="email"; choosing a delivery option calls
        onDeliveryChange with its id.
      - Carousel: a region named by label with "carousel" as its role
        description; each item is a named slide and one is aria-current;
        only that item's content is live (the rest inert); ArrowRight and
        Next move it, call onChange and are announced; the live item's
        button presses; Pause holds an auto carousel still and Play
        resumes it; under reduced motion it no longer moves by itself.

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
<div id="food-root"></div>
<div id="checkout-root"></div>
<div id="forms-root" style="width:360px"></div>
<div id="chat-kit-root"></div>
<div id="foodkit-root"></div>
<div id="store-checkout-root"></div>
<div id="carousel-root"></div>
<div style="height:3000px"></div>
<script type="module">
import React from "react";
import { createRoot } from "react-dom/client";
import { Button, Dialog, Drawer, Input, Section, Stack, TabPanel, Tabs } from "@dovetail-ds/react";
import { ChatHeader, Composer, MessageBubble, MessageDivider, MessageList, QuickReplies } from "@dovetail-ds/react";
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

/* Chat family: its own root after the main one, so it stays out of the way
   of the modal checks above. */
window.__sent = [];
window.__picked = [];
function ChatApp() {
  const [draft, setDraft] = React.useState("");
  const [items, setItems] = React.useState(() => Array.from({ length: 30 }, (_, i) => "Seed message " + (i + 1)));
  React.useEffect(() => { window.__addMessage = (t) => setItems((xs) => xs.concat(t)); }, []);
  return h("div", { style: { display: "flex", flexDirection: "column", height: "400px" } },
    h(ChatHeader, { title: "Maya Chen", presence: "online" }),
    h(MessageList, { label: "Conversation with Maya", style: { flex: "1 1 auto" } },
      h(MessageDivider, null, "Today"),
      items.map((t, i) => h(MessageBubble, { key: i, from: i % 2 ? "me" : "them" }, t))),
    h(QuickReplies, { label: "Suggested replies", onSelect: (id) => window.__picked.push(id),
      options: [{ id: "track", label: "Track my order" }, { id: "person", label: "Talk to a person" }] }),
    h(Composer, { label: "Message Maya", value: draft, onChange: setDraft, onSend: (t) => { window.__sent.push(t); setDraft(""); } }));
}
const chatHost = document.createElement("div");
document.getElementById("root").after(chatHost);
createRoot(chatHost).render(h(ChatApp));
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
<script type="module">
/* Food ordering: FulfilmentToggle, MenuItem and ModifierGroup, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { FulfilmentToggle, MenuItem, ModifierGroup } from "@dovetail-ds/react";
const h = React.createElement;
window.__food = { how: [], selected: 0, added: 0 };
const EXTRAS = [
  { id: "egg", label: "Fried egg", price: 2 },
  { id: "tofu", label: "Extra tofu", price: 1.5 },
  { id: "peanuts", label: "Peanuts", price: 0.5 },
  { id: "prawns", label: "Prawns", price: 3 },
];
function Food() {
  const [how, setHow] = React.useState("delivery");
  const [size, setSize] = React.useState([]);
  const [extras, setExtras] = React.useState([]);
  return h("div", null,
    h(FulfilmentToggle, { label: "Test fulfilment", value: how, onChange: (v) => { window.__food.how.push(v); setHow(v); },
      options: [{ value: "delivery", label: "Delivery", detail: "25–35 min" }, { value: "pickup", label: "Pickup" }, { value: "dine-in", label: "Dine in" }] }),
    h(MenuItem, { name: "Test noodles", price: 12.5, locale: "en-US",
      onSelect: () => { window.__food.selected++; }, onAdd: () => { window.__food.added++; } }),
    h(ModifierGroup, { title: "Test portion", mode: "single", required: true, value: size, onChange: setSize, locale: "en-US",
      error: size.length ? undefined : "Choose a size",
      options: [{ id: "s", label: "Small" }, { id: "m", label: "Medium", price: 1 }, { id: "l", label: "Large", price: 2 }] }),
    h(ModifierGroup, { title: "Test extras", mode: "multiple", max: 2, value: extras, onChange: setExtras, options: EXTRAS, locale: "en-US" }));
}
createRoot(document.getElementById("food-root")).render(h(Food));
window.__foodReady = true;
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
<script type="module">
/* Forms: CheckboxGroup and RadioGroup with the control at the end. */
import React from "react";
import { createRoot } from "react-dom/client";
import { CheckboxGroup, RadioGroup } from "@dovetail-ds/react";
const h = React.createElement;
window.__forms = { checks: [], radio: [] };
createRoot(document.getElementById("forms-root")).render(h("div", null,
  h(CheckboxGroup, { label: "Test end checkboxes", hint: "Test checkbox hint", labelPosition: "start", defaultValue: ["a"],
    onChange: (v) => window.__forms.checks.push(v.join(",")),
    options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta", hint: "With a hint" }] }),
  h(RadioGroup, { label: "Test end radios", hint: "Test radio hint", labelPosition: "start", defaultValue: "a",
    onChange: (v) => window.__forms.radio.push(v),
    options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] })));
window.__formsReady = true;
</script>
<script type="module">
/* ChatBlock, on its own root, mounted only by its own step. */
import React from "react";
import { createRoot } from "react-dom/client";
import { ChatBlock } from "@dovetail-ds/react";
const h = React.createElement;
window.__chatKit = { sent: [], retried: [] };
const CHAT_KIT_MESSAGES = [
  { id: "ck1", from: "them", day: "Chat kit day one", text: "Chat kit first" },
  { id: "ck2", from: "them", day: "Chat kit day one", text: "Chat kit middle" },
  { id: "ck3", from: "them", text: "Chat kit last" },
  { id: "ck4", from: "me", text: "Chat kit reply", status: "failed" },
  { id: "ck5", kind: "event", text: "Chat kit tester joined" },
  { id: "ck6", from: "them", day: "Chat kit day one", text: "Chat kit after event" },
  { id: "ck7", from: "them", day: "Chat kit day two", text: "Chat kit next day" },
  { id: "ck8", from: "them", day: "Chat kit day two", text: "Chat kit same day" },
];
function ChatKit() {
  const [draft, setDraft] = React.useState("");
  return h(ChatBlock, { title: "Chat kit tester", height: 480, messages: CHAT_KIT_MESSAGES,
    onRetry: (id) => window.__chatKit.retried.push(id),
    composer: { value: draft, onChange: setDraft, onSend: (t) => { window.__chatKit.sent.push(t); setDraft(""); } } });
}
let chatKitRoot = null;
window.__chatKitMount = () => { chatKitRoot = createRoot(document.getElementById("chat-kit-root")); chatKitRoot.render(h(ChatKit)); };
window.__chatKitUnmount = () => { if (chatKitRoot) chatKitRoot.unmount(); chatKitRoot = null; };
window.__chatKitReady = true;
</script>
<script type="module">
/* Food kit blocks: MenuBlock, BasketBar and OrderTrackingBlock, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { BasketBar, MenuBlock, OrderTrackingBlock } from "@dovetail-ds/react";
const h = React.createElement;
window.__foodkit = { opened: 0, calls: [] };
const dishes = (prefix) => Array.from({ length: 4 }, (_, i) => ({ id: prefix + i, name: "Food kit " + prefix + " " + (i + 1), description: "A dish for the behaviour check.", price: 10 + i }));
function FoodKit() {
  const [count, setCount] = React.useState(0);
  return h("div", null,
    h(MenuBlock, { spacing: "none", locale: "en-US", navLabel: "Food kit categories",
      store: { name: "Food kit store", headingLevel: 2 },
      sections: [
        { id: "mains", title: "Food kit mains", items: dishes("main") },
        { id: "sides", title: "Food kit sides", items: dishes("side") },
        { id: "desserts", title: "Food kit desserts", items: dishes("dessert") },
      ] }),
    h("button", { type: "button", onClick: () => setCount((n) => n + 1) }, "Food kit add"),
    h(BasketBar, { count, total: count * 12.5, locale: "en-US", label: "Food kit basket", onClick: () => { window.__foodkit.opened++; } }),
    h(OrderTrackingBlock, { spacing: "none", locale: "en-US", headingLevel: 2, title: "Food kit order", eta: "Arriving soon",
      status: { current: "b", steps: [{ id: "a", label: "Placed" }, { id: "b", label: "On the way" }, { id: "c", label: "Delivered" }] },
      courier: { name: "Food kit courier", vehicle: "Bike", onCall: () => window.__foodkit.calls.push("call"), onMessage: () => window.__foodkit.calls.push("message") },
      lines: [{ name: "Food kit noodles", price: 12.5, quantity: 1 }],
      summary: { lines: [{ label: "Subtotal", amount: 12.5 }], total: { amount: 12.5 } } }));
}
createRoot(document.getElementById("foodkit-root")).render(h(FoodKit));
window.__foodkitReady = true;
</script>
<script type="module">
/* Store blocks: CheckoutBlock in a phone-width box, on its own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { CheckoutBlock } from "@dovetail-ds/react";
const h = React.createElement;
window.__store = { delivery: [], emails: [] };
function StoreCheckout() {
  const [email, setEmail] = React.useState("");
  const [delivery, setDelivery] = React.useState("store-standard");
  return h("div", { style: { width: "360px" } },
    h(CheckoutBlock, { title: "Store test checkout", locale: "en-US", collapseBelow: 600,
      email, onEmailChange: (v) => { window.__store.emails.push(v); setEmail(v); }, emailLabel: "Store email",
      deliveryLegend: "Store delivery", delivery, onDeliveryChange: (id) => { window.__store.delivery.push(id); setDelivery(id); },
      deliveryOptions: [{ id: "store-standard", label: "Store standard", price: 0 }, { id: "store-express", label: "Store express", price: 12 }],
      lines: [{ id: "store-mug", name: "Store test mug", price: 24, quantity: 2, lineTotal: 48 }],
      summary: { title: "Store test summary", lines: [{ label: "Subtotal", amount: 48 }], total: { amount: 48 } } }));
}
createRoot(document.getElementById("store-checkout-root")).render(h(StoreCheckout));
window.__storeReady = true;
</script>
<script type="module">
/* Carousel: a manual, controlled one and an auto one, on their own root. */
import React from "react";
import { createRoot } from "react-dom/client";
import { Carousel } from "@dovetail-ds/react";
const h = React.createElement;
window.__carousel = { changes: [], pressed: [] };
const tile = (n) => h("div", { key: "t" + n, style: { display: "grid", placeItems: "center", background: "var(--dt-surface-raised)" } },
  h("button", { type: "button", onClick: () => window.__carousel.pressed.push(n) }, "Tile " + n));
function CarouselApp() {
  const [index, setIndex] = React.useState(0);
  return h("div", { style: { width: "640px" } },
    h(Carousel, { label: "Test carousel", layout: "coverflow", drive: "manual", entrance: false, value: index,
      onChange: (i) => { window.__carousel.changes.push(i); setIndex(i); } }, [1, 2, 3, 4, 5].map(tile)),
    h(Carousel, { label: "Test auto carousel", layout: "marquee", drive: "auto", entrance: false, expression: "none" }, [1, 2, 3, 4].map(tile)));
}
createRoot(document.getElementById("carousel-root")).render(h(CarouselApp));
window.__carouselReady = true;
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

  /* Chat family: Composer keys, the MessageList log and QuickReplies. */
  const composer = () => page.getByRole("textbox", { name: "Message Maya" });
  const sendButton = () => page.getByRole("button", { name: "Send", exact: true });
  const sent = () => page.evaluate(() => window.__sent.slice());

  await step("Composer: Enter sends, Shift+Enter breaks the line, whitespace and IME never send", async () => {
    await composer().scrollIntoViewIfNeeded();
    expect(await sendButton().isDisabled(), "the send button should be disabled while the field is empty");
    ok("send is disabled while empty");
    await composer().click();
    await page.keyboard.type("Hello there");
    expect(!(await sendButton().isDisabled()), "the send button should enable once there is text");
    await page.keyboard.press("Enter");
    let s = await sent();
    expect(s.length === 1 && s[0] === "Hello there", `Enter should call onSend("Hello there"), got ${JSON.stringify(s)}`);
    expect((await composer().inputValue()) === "", "the consumer's onSend cleared value, so the field should be empty");
    expect(await sendButton().isDisabled(), "send should disable again once the consumer clears the text");
    ok("typing then Enter calls onSend with the text, and the consumer can clear it");
    await page.keyboard.type("Line one");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("Line two");
    expect((await composer().inputValue()) === "Line one\nLine two", `Shift+Enter should insert a newline, got ${JSON.stringify(await composer().inputValue())}`);
    expect((await sent()).length === 1, "Shift+Enter must not send");
    ok("Shift+Enter inserts a newline and does not send");
    await composer().evaluate((el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true })));
    expect((await sent()).length === 1, "Enter during IME composition must not send");
    ok("Enter while composing (IME) does not send");
    await page.keyboard.press("Enter");
    s = await sent();
    expect(s[1] === "Line one\nLine two", `Enter should send the multi-line text, got ${JSON.stringify(s)}`);
    await page.keyboard.type("   ");
    await page.keyboard.press("Enter");
    expect((await sent()).length === 2, "Enter with only whitespace must not send");
    expect((await composer().inputValue()) === "   ", "Enter with only whitespace must not insert a newline either");
    expect(await sendButton().isDisabled(), "send should be disabled while the text is only whitespace");
    ok("Enter with only whitespace does not send, and send stays disabled");
    await composer().fill("");
  });

  await step("MessageList: a named log, pinned to the bottom, with a jump when scrolled up", async () => {
    const log = page.getByRole("log", { name: "Conversation with Maya" });
    expect((await log.count()) === 1, 'no role="log" named "Conversation with Maya"');
    expect((await log.getAttribute("aria-live")) === "polite", 'the log should be aria-live="polite"');
    ok('role="log" is named by label and polite');
    expect((await page.getByRole("separator", { name: "Today" }).count()) === 1, 'MessageDivider should be role="separator" named by its text');
    ok('MessageDivider is a separator named "Today"');
    const gap = () => log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);
    expect((await gap()) <= 8, `the log should start scrolled to the bottom, ${await gap()}px short`);
    await page.evaluate(() => window.__addMessage("Pinned arrival"));
    await page.waitForFunction(() => { const el = document.querySelector('[role="log"]'); return el.scrollHeight - el.scrollTop - el.clientHeight <= 8 && el.textContent.includes("Pinned arrival"); });
    ok("at the bottom, a new message keeps it pinned");
    await log.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event("scroll")); });
    await page.evaluate(() => window.__addMessage("Arrived while reading history"));
    const jumpBtn = page.getByRole("button", { name: "New messages" });
    await jumpBtn.waitFor({ state: "visible" });
    expect((await log.evaluate((el) => el.scrollTop)) < 50, "scrolled up, a new message must not pull the reader down");
    ok("scrolled up, a new message leaves the reader in place and shows New messages");
    await jumpBtn.click();
    await page.waitForFunction(() => { const el = document.querySelector('[role="log"]'); return el.scrollHeight - el.scrollTop - el.clientHeight <= 8; });
    await jumpBtn.waitFor({ state: "detached" });
    expect((await active()) === "Conversation with Maya", `after the jump, focus should be on the log, got "${await active()}"`);
    ok("New messages scrolls to the bottom, goes away, and leaves focus on the log");
  });

  await step("QuickReplies: Tab reaches each chip in order, Enter and Space select", async () => {
    expect((await page.getByRole("group", { name: "Suggested replies" }).count()) === 1, "QuickReplies should be a group named by label");
    await page.getByRole("log", { name: "Conversation with Maya" }).focus();
    await page.keyboard.press("Tab");
    expect((await active()) === "Track my order", `Tab from the log should reach the first chip, got "${await active()}"`);
    await page.keyboard.press("Tab");
    expect((await active()) === "Talk to a person", `a second Tab should reach the second chip, got "${await active()}"`);
    ok("Tab reaches each chip in order");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Space");
    const picked = await page.evaluate(() => window.__picked.slice());
    expect(picked.join(",") === "person,track", `Enter and Space should select, onSelect saw ${JSON.stringify(picked)}`);
    ok("Enter and Space call onSelect with the chip's id");
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

  await step("FulfilmentToggle: one tab stop, arrows choose and wrap", async () => {
    await page.waitForFunction(() => window.__foodReady === true);
    const group = page.getByRole("radiogroup", { name: "Test fulfilment", exact: true });
    const radio = (name) => group.getByRole("radio", { name: new RegExp("^" + name) });
    const checked = async (name) => (await radio(name).getAttribute("aria-checked")) === "true";
    const stops = () => group.evaluate((el) => [...el.querySelectorAll('[role="radio"]')].map((r) => r.tabIndex));
    expect((await group.getByRole("radio").count()) === 3, "three options should give three radios");
    expect(JSON.stringify(await stops()) === "[0,-1,-1]", `only the chosen segment should be a tab stop, got ${JSON.stringify(await stops())}`);
    ok("three radios; the chosen segment is the one tab stop");
    await radio("Delivery").focus();
    await page.keyboard.press("ArrowRight");
    expect(await checked("Pickup"), "ArrowRight from Delivery should choose Pickup");
    expect((await active()) === "Pickup", `ArrowRight should move focus to Pickup, got "${await active()}"`);
    expect(JSON.stringify(await stops()) === "[-1,0,-1]", `the tab stop should follow the choice, got ${JSON.stringify(await stops())}`);
    ok("ArrowRight chooses and focuses the next segment; the tab stop follows");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    expect(await checked("Delivery"), "ArrowRight from the last segment should wrap to the first");
    await page.keyboard.press("ArrowLeft");
    expect(await checked("Dine in"), "ArrowLeft from the first segment should wrap to the last");
    await page.keyboard.press("Home");
    expect(await checked("Delivery"), "Home should choose the first segment");
    ok("arrows wrap both ways; Home chooses the first");
    const seen = await page.evaluate(() => window.__food.how);
    expect(JSON.stringify(seen) === JSON.stringify(["pickup", "dine-in", "delivery", "dine-in", "delivery"]), `onChange should report each value, got ${JSON.stringify(seen)}`);
    ok(`onChange reported ${seen.join(", ")}`);
  });

  await step("MenuItem: row and add are separate targets with their own callbacks", async () => {
    const row = page.getByRole("button", { name: "Test noodles", exact: true });
    const add = page.getByRole("button", { name: "Add Test noodles", exact: true });
    expect((await row.count()) === 1 && (await add.count()) === 1, "there should be one row button and one add button");
    const nested = await row.evaluate((r) => {
      const a = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === "Add Test noodles");
      return r.contains(a) || a.contains(r);
    });
    expect(!nested, "the add button and the row button must not be nested");
    await row.focus();
    await page.keyboard.press("Tab");
    expect((await active()) === "Add Test noodles", `Tab from the row should reach the add button, got "${await active()}"`);
    ok("two focus targets, not nested; Tab goes from the row to add");
    await page.keyboard.press("Enter");
    let f = await page.evaluate(() => window.__food);
    expect(f.added === 1 && f.selected === 0, `Enter on add should call onAdd only, got added ${f.added}, selected ${f.selected}`);
    await row.focus();
    await page.keyboard.press("Enter");
    f = await page.evaluate(() => window.__food);
    expect(f.selected === 1 && f.added === 1, `Enter on the row should call onSelect only, got added ${f.added}, selected ${f.selected}`);
    ok("the keyboard reaches each; add calls onAdd, the row calls onSelect");
    const item = row.locator("xpath=ancestor::div[.//button[@aria-label='Add Test noodles']][1]");
    const box = await item.boundingBox();
    await page.mouse.click(box.x + 4, box.y + box.height - 4);
    await add.click();
    f = await page.evaluate(() => window.__food);
    expect(f.selected === 2 && f.added === 2, `a click on the row's corner should select and a click on add should only add, got added ${f.added}, selected ${f.selected}`);
    ok("a click anywhere on the row selects; a click on add only adds");
  });

  await step("ModifierGroup: radios, max, required error", async () => {
    const size = page.getByRole("radiogroup", { name: /^Test portion/ });
    expect((await size.count()) === 1, "single mode should be a radiogroup named by its legend");
    const desc = await size.evaluate((el) => (el.getAttribute("aria-describedby") || "").split(" ").map((id) => document.getElementById(id)).filter(Boolean).map((n) => n.textContent).join(" "));
    expect(desc.includes("Choose a size"), `the error should be linked by aria-describedby, got ${JSON.stringify(desc)}`);
    expect((await size.getAttribute("aria-invalid")) === "true", "a group with an error should be aria-invalid");
    expect((await size.getAttribute("aria-required")) === "true", "a required single group should be aria-required");
    ok("named by its legend; the error is linked by aria-describedby; aria-invalid and aria-required are set");
    const radio = (name) => size.getByRole("radio", { name: new RegExp("^" + name) });
    await radio("Small").focus();
    await page.keyboard.press("Space");
    expect(await radio("Small").isChecked(), "Space should choose Small");
    await page.keyboard.press("ArrowDown");
    expect(await radio("Medium").isChecked() && !(await radio("Small").isChecked()), "ArrowDown should move the choice to Medium");
    expect((await size.getAttribute("aria-invalid")) === null, "the error should clear once something is chosen");
    ok("Space chooses; ArrowDown moves the single choice; the error clears");

    const extras = page.getByRole("group", { name: /^Test extras/ });
    const box = (name) => extras.getByRole("checkbox", { name: new RegExp("^" + name) });
    await box("Fried egg").check();
    await box("Extra tofu").check();
    const off = await extras.evaluate((el) => [...el.querySelectorAll("input")].filter((i) => i.disabled).length);
    expect(off === 2, `at max 2 the two unchosen options should be disabled, got ${off}`);
    const limitName = await box("Prawns").evaluate((el) => el.labels[0].textContent);
    expect(/limit of 2 reached/.test(limitName), `a disabled option should say why in its name, got ${JSON.stringify(limitName)}`);
    await box("Extra tofu").uncheck();
    const offAfter = await extras.evaluate((el) => [...el.querySelectorAll("input")].filter((i) => i.disabled).length);
    expect(offAfter === 0, `below max no option should be disabled, got ${offAfter}`);
    ok("multiple mode stops at max, disables the rest with the reason in their names, and frees them below max");
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

  await step("Checkbox and Radio groups: named by the label, described by the hint", async () => {
    await page.waitForFunction(() => window.__formsReady === true);
    for (const [role, name, hint] of [["group", "Test end checkboxes", "Test checkbox hint"], ["radiogroup", "Test end radios", "Test radio hint"]]) {
      const group = page.getByRole(role, { name, exact: true });
      expect((await group.count()) === 1, `role="${role}" should be named "${name}" by the group's label`);
      const described = await group.evaluate((el) => (el.getAttribute("aria-describedby") || "").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
      expect(described === hint, `the ${role} should be described by its hint, got "${described}"`);
      ok(`role="${role}" named "${name}", described by "${hint}"`);
    }
  });

  await step("Checkbox and Radio groups: labelPosition start puts the control at the end", async () => {
    for (const name of ["Test end checkboxes", "Test end radios"]) {
      /* The group's Field: its question label, then the rows. */
      const layout = await page.getByText(name, { exact: true }).evaluate((question) => {
        const left = Math.round(question.getBoundingClientRect().left);
        const right = Math.round(question.parentElement.getBoundingClientRect().right);
        return [...question.parentElement.querySelectorAll("input + label")].map((label) => {
          const box = label.querySelector("[aria-hidden=true]").getBoundingClientRect();
          const text = label.querySelector("span:not([aria-hidden]) > span").getBoundingClientRect();
          return { indent: Math.round(text.left) - left, gap: right - Math.round(box.right), after: box.left > text.right };
        });
      });
      expect(layout.length === 2, `${name}: expected 2 rows, got ${layout.length}`);
      for (const r of layout) {
        expect(r.indent === 0, `${name}: each label should line up with the question, got an indent of ${r.indent}px`);
        expect(r.gap === 0 && r.after, `${name}: each control should sit at the row's right edge, after its label (${JSON.stringify(r)})`);
      }
      ok(`${name}: labels line up with the question, controls at the right edge`);
    }
    await page.locator("#forms-root").getByText("Beta", { exact: true }).first().click();
    expect(await page.getByRole("checkbox", { name: /^Beta/ }).isChecked(), "clicking a checkbox label should check it");
    await page.locator("#forms-root").getByText("Beta", { exact: true }).last().click();
    expect(await page.getByRole("radio", { name: "Beta", exact: true }).isChecked(), "clicking a radio label should pick it");
    const calls = await page.evaluate(() => window.__forms);
    expect(calls.checks.join("|") === "a,b" && calls.radio.join("|") === "b", `onChange should report a,b and b, got ${JSON.stringify(calls)}`);
    ok("clicking the label text toggles and picks, and onChange reports it");
  });

  await step("Chat kit ChatBlock: computed runs, one divider per day change, composer sends", async () => {
    await page.waitForFunction(() => window.__chatKitReady === true);
    await page.evaluate(() => window.__chatKitMount());
    try {
      const log = page.getByRole("log", { name: "Conversation with Chat kit tester", exact: true });
      await log.waitFor();
      const grouped = await log.evaluate((el) => Object.fromEntries([...el.querySelectorAll("[data-message-id]")].map((n) => [n.dataset.messageId, n.dataset.grouped])));
      const want = { ck1: "first", ck2: "middle", ck3: "last", ck4: "single", ck6: "single", ck7: "first", ck8: "last" };
      expect(JSON.stringify(grouped) === JSON.stringify(want), `data-grouped should be ${JSON.stringify(want)}, got ${JSON.stringify(grouped)}`);
      ok("a run of three is first/middle/last; an event and a day change end a run");
      const seps = await log.evaluate((el) => [...el.querySelectorAll('[role="separator"]')].map((n) => n.getAttribute("aria-label")));
      expect(JSON.stringify(seps) === JSON.stringify(["Chat kit day one", "Chat kit tester joined", "Chat kit day two"]),
        `expected one divider per day change plus the event, got ${JSON.stringify(seps)}`);
      ok("exactly one day divider per day change, and the event as a separator");
      await log.getByRole("button", { name: "Retry", exact: true }).click();
      expect(JSON.stringify(await page.evaluate(() => window.__chatKit.retried)) === '["ck4"]', "Retry should call onRetry with the failed message's id");
      ok("Retry calls onRetry(id)");
      const field = page.getByRole("textbox", { name: "Message Chat kit tester", exact: true });
      await field.fill("Chat kit hello");
      await field.press("Enter");
      const sentNow = await page.evaluate(() => window.__chatKit.sent.slice());
      expect(sentNow.length === 1 && sentNow[0] === "Chat kit hello", `the composer should call onSend("Chat kit hello"), got ${JSON.stringify(sentNow)}`);
      expect((await field.inputValue()) === "", "the consumer cleared the draft, so the field should be empty");
      ok("sending through its composer calls onSend with the text");
    } finally {
      await page.evaluate(() => window.__chatKitUnmount());
    }
  });

  await step("Food kit blocks: category nav, basket bar, courier buttons", async () => {
    await page.waitForFunction(() => window.__foodkitReady === true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const nav = page.getByRole("navigation", { name: "Food kit categories", exact: true });
    expect((await nav.getByRole("link").count()) === 3, "the category nav should hold one link per section");
    const link = nav.getByRole("link", { name: "Food kit desserts", exact: true });
    await link.click();
    await page.waitForFunction(() => {
      const a = document.activeElement;
      return a && a.tagName === "SECTION" && /Food kit desserts/.test(a.querySelector("h1,h2,h3,h4,h5,h6").textContent);
    });
    ok("pressing a pill moves focus to its section");
    expect((await link.getAttribute("aria-current")) === "true", "the pressed pill should carry aria-current=\"true\"");
    const others = await nav.locator('[aria-current="true"]').count();
    expect(others === 1, `exactly one pill should be current, got ${others}`);
    ok('its link is the one aria-current="true"');
    const gap = await page.evaluate(() => {
      const n = document.querySelector('nav[aria-label="Food kit categories"]').getBoundingClientRect();
      const sec = document.activeElement.getBoundingClientRect();
      return Math.round(sec.top - n.bottom);
    });
    expect(gap >= -2 && gap <= 40, `the section should land just under the sticky nav, it is ${gap}px away`);
    ok(`the section scrolled to just under the sticky nav (${gap}px)`);
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const bar = () => page.getByRole("button", { name: /^Food kit basket/ });
    expect((await bar().count()) === 0, "BasketBar should render nothing at count 0");
    ok("BasketBar renders nothing at count 0");
    await page.getByRole("button", { name: "Food kit add", exact: true }).click();
    const name = await bar().getAttribute("aria-label");
    expect(name === "Food kit basket, 1 item, $12.50", `BasketBar should be named by label, count and total, got ${JSON.stringify(name)}`);
    await bar().click();
    expect((await page.evaluate(() => window.__foodkit.opened)) === 1, "clicking BasketBar should call onClick once");
    ok(`"${name}" calls onClick`);

    await page.getByRole("button", { name: "Call Food kit courier", exact: true }).click();
    await page.getByRole("button", { name: "Message Food kit courier", exact: true }).click();
    const calls = await page.evaluate(() => window.__foodkit.calls.join(","));
    expect(calls === "call,message", `the courier buttons should call onCall and onMessage, got ${calls}`);
    ok('courier buttons are named "Call Food kit courier" and "Message Food kit courier" and call back');
  });

  await step("CheckoutBlock: summary disclosure, email autocomplete, delivery callback", async () => {
    await page.waitForFunction(() => window.__storeReady === true);
    const toggle = page.getByRole("button", { name: /^Show order summary/ });
    await toggle.waitFor();
    expect((await toggle.getAttribute("aria-expanded")) === "false", "in a narrow box the summary disclosure should start collapsed");
    const panel = page.locator("#" + (await toggle.getAttribute("aria-controls")).replace(/:/g, "\\:"));
    expect(!(await panel.isVisible()), "the summary panel should be hidden while collapsed");
    const name = await toggle.textContent();
    expect(/\$48\.00/.test(name), `the disclosure should carry the total, got ${JSON.stringify(name)}`);
    await toggle.click();
    const open = page.getByRole("button", { name: /^Hide order summary/ });
    expect((await open.getAttribute("aria-expanded")) === "true", "clicking should set aria-expanded to true");
    expect(await panel.isVisible(), "the summary panel should show once expanded");
    expect((await panel.getByRole("heading", { name: "Store test summary" }).count()) === 1, "the panel should hold the order summary");
    await open.click();
    expect((await page.getByRole("button", { name: /^Show order summary/ }).getAttribute("aria-expanded")) === "false", "a second click should collapse it");
    ok(`the disclosure "${name.trim()}" toggles aria-expanded and its panel`);
    const email = page.getByRole("textbox", { name: "Store email" });
    const attrs = await email.evaluate((el) => `${el.type}:${el.getAttribute("autocomplete")}`);
    expect(attrs === "email:email", `the email field should be type email with autocomplete email, got ${attrs}`);
    await email.fill("ana@example.com");
    expect((await page.evaluate(() => window.__store.emails.pop())) === "ana@example.com", "typing should call onEmailChange with the text");
    ok('the email field is type="email" autocomplete="email" and calls onEmailChange');
    const express = page.getByRole("radio", { name: /^Store express/ });
    await page.getByText("Store express", { exact: true }).click();
    const seen = await page.evaluate(() => window.__store.delivery);
    expect(seen.length === 1 && seen[0] === "store-express", `choosing Store express should call onDeliveryChange("store-express"), got ${JSON.stringify(seen)}`);
    expect(await express.isChecked(), "Store express should be checked after choosing it");
    const group = await page.getByRole("group", { name: "Store delivery", exact: true }).count();
    expect(group === 1, "the delivery options should be a group named by its legend");
    ok('choosing a delivery option calls onDeliveryChange("store-express"); the options are grouped by their legend');
  });

  await step("Carousel: named slides, only the focused one live, keyboard and buttons move it, pause holds it", async () => {
    await page.waitForFunction(() => window.__carouselReady === true);
    const car = page.locator('[aria-roledescription="carousel"][aria-label="Test carousel"]');
    await car.scrollIntoViewIfNeeded();
    const state = () => car.evaluate((el) => {
      const slides = [...el.querySelectorAll('[aria-roledescription="slide"]')];
      return {
        names: slides.map((s) => s.getAttribute("aria-label")),
        current: slides.findIndex((s) => s.getAttribute("aria-current") === "true"),
        live: slides.map((s) => !s.querySelector("button").closest("[inert]")),
      };
    });
    const settle = () => page.waitForTimeout(1400);
    await settle();
    let st = await state();
    expect(st.names.join("|") === "1 of 5|2 of 5|3 of 5|4 of 5|5 of 5", `slides should be named "1 of 5"…, got ${st.names.join("|")}`);
    expect(st.current === 0, `the first slide should be aria-current, got ${st.current}`);
    expect(st.live.filter(Boolean).length === 1 && st.live[0], `only the current slide's content should be live, got ${JSON.stringify(st.live)}`);
    ok('a region named "Test carousel", five slides "1 of 5"…, the first aria-current and the only live one');
    await car.focus();
    await page.keyboard.press("ArrowRight");
    await settle();
    st = await state();
    expect(st.current === 1 && st.live[1] && !st.live[0], `ArrowRight should move focus to the second slide and make it live, got current ${st.current}`);
    const live = await car.locator('[aria-live="polite"]').textContent();
    expect(live === "2 of 5", `the live region should read "2 of 5", got ${JSON.stringify(live)}`);
    await car.getByRole("button", { name: "Next item", exact: true }).click();
    await settle();
    st = await state();
    const changes = await page.evaluate(() => window.__carousel.changes.slice());
    expect(st.current === 2 && changes.join(",") === "1,2", `Next should move to the third slide and onChange should have seen 1, 2; got current ${st.current}, changes ${changes.join(",")}`);
    ok('ArrowRight and Next move it, onChange sees 1 then 2, and the move is announced "2 of 5"');
    await car.getByRole("button", { name: "Tile 3", exact: true }).click();
    const pressed = await page.evaluate(() => window.__carousel.pressed.slice());
    expect(pressed.join(",") === "3", `the live slide's button should press, got ${pressed.join(",")}`);
    ok("the live slide's own button presses");
    const auto = page.locator('[aria-roledescription="carousel"][aria-label="Test auto carousel"]');
    await auto.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const first = () => auto.evaluate((el) => el.querySelector('[aria-roledescription="slide"]').style.transform);
    const a0 = await first(); await page.waitForTimeout(500); const a1 = await first();
    expect(a0 !== a1, "an auto carousel should move by itself");
    await auto.getByRole("button", { name: "Pause", exact: true }).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(900);
    const p0 = await first(); await page.waitForTimeout(500); const p1 = await first();
    expect(p0 === p1, "after Pause it should hold still");
    await auto.getByRole("button", { name: "Play", exact: true }).click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    const r0 = await first(); await page.waitForTimeout(400); const r1 = await first();
    expect(r0 !== r1, "after Play it should move again");
    ok("an auto carousel moves by itself; Pause (renamed Play) holds it still and Play resumes it");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    const m0 = await first(); await page.waitForTimeout(500); const m1 = await first();
    const pauseShown = await auto.getByRole("button", { name: "Pause", exact: true }).count();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    expect(m0 === m1 && pauseShown === 0, `under reduced motion it should not move by itself or offer Pause, moved ${m0 !== m1}, pause ${pauseShown}`);
    ok("under reduced motion it holds still and drops the Pause button");
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
