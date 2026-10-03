// Server-render check: every component in the manifest must survive
// react-dom/server's renderToString with no throw, no console.error and no
// console.warn, the way a Next.js page would render it.
//
//   node tools/check/ssr.mjs
//
// The bundle and the specimens are loaded into a node:vm context that has
// `window` (the context itself), `React` and nothing DOM-shaped. There is no
// `document` and no `navigator`, so a render-time DOM access throws and fails
// the component. (specimens.js reads `document` once at load to find its
// slots; that file gets a throwaway stub for the load only, removed before
// anything renders.)
//
// Each component renders from its live specimen. Where there is none (the
// page-section blocks, Dialog, Drawer, Sheet, MenuSheet, ToastRegion, VisuallyHidden: see
// the header of assets/specimens.js), FALLBACKS below holds a small hand-written element
// with honest minimal props. A component with neither fails the check, so a
// new component can't slip past it.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);
const React = require("react");
const ReactDOM = require("react-dom");
const { renderToString } = require("react-dom/server");

const manifest = JSON.parse(readFileSync(path.join(root, "system/manifest.json"), "utf8"));
const names = manifest.components.map((c) => c.name);

/* The console the loaded code sees. Render-time output is captured by
   swapping the real console's methods, which is where React reports. */
const sandbox = { console, React };
const context = vm.createContext(sandbox);
sandbox.window = context;
sandbox.globalThis = context;
sandbox.self = context;

function load(file, extra) {
  Object.assign(sandbox, extra);
  vm.runInContext(readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const problems = [];
const fail = (name, message) => problems.push({ name, message });

load("system/components/bundle.js");
const NS = sandbox[manifest.namespace];
if (!NS) {
  console.error(`ssr: the bundle did not define ${manifest.namespace}`);
  process.exit(1);
}
for (const err of NS.__errors || []) fail("bundle", `${err.path}: ${err.error}`);

/* specimens.js finds its slots at load. No slots, and it does nothing else. */
sandbox.ReactDOM = ReactDOM;
load("assets/specimens.js", { document: { querySelectorAll: () => [] } });
delete sandbox.document;
const specimens = sandbox.DovetailSpecimens && sandbox.DovetailSpecimens.build;
if (!specimens) {
  console.error("ssr: assets/specimens.js did not define DovetailSpecimens");
  process.exit(1);
}

const e = React.createElement;
const noop = () => {};
const FALLBACKS = {
  Dialog: () => e(NS.Dialog, { open: true, onClose: noop, title: "Delete draft", description: "This can't be undone." }, "The draft and its comments are removed."),
  Drawer: () => e(NS.Drawer, { open: true, onClose: noop, title: "Filters" }, "Filter options."),
  Sheet: () => e(NS.Sheet, { open: true, onClose: noop, title: "Share route" }, "Choose who can see this route."),
  MenuSheet: () => e(NS.MenuSheet, { open: true, onClose: noop, label: "Menu", items: [{ label: "Shop", items: [{ label: "Mugs", href: "/mugs" }] }, { label: "Visit", href: "/visit", current: true }], links: [{ label: "Gift cards", href: "/gift" }] }),
  ToastRegion: () => e(NS.ToastRegion, null, e(NS.Toast, { title: "Saved" }, "Your changes are live.")),
  VisuallyHidden: () => e(NS.VisuallyHidden, null, "Skip to content"),
  /* Page sections: the specimens skip them because they are full-width. */
  BlockHeader: () => e(NS.BlockHeader, { eyebrow: "Routes", title: "Plan the trip", lead: "Huts, passes and weather." }),
  HeroBlock: () => e(NS.HeroBlock, { eyebrow: "Summer", title: "Walk the high route", lead: "Five nights above the treeline.", actions: e(NS.Button, null, "Plan a trip") }),
  FeatureGridBlock: () => e(NS.FeatureGridBlock, { title: "Why walkers stay", items: [{ title: "Huts", description: "Beds and a hot meal." }, { title: "Maps", description: "Offline and printed." }] }),
  SplitBlock: () => e(NS.SplitBlock, { title: "Hut to hut", body: "Carry less and sleep warm.", points: ["Beds booked", "Meals included"] }),
  StatsBlock: () => e(NS.StatsBlock, { title: "By the numbers", stats: [{ value: "62km", label: "Route length" }, { value: "5", label: "Nights" }] }),
  TestimonialBlock: () => e(NS.TestimonialBlock, { title: "Kind words", quotes: [{ quote: "Best week of the year.", name: "Ana", role: "Walker" }] }),
  FaqBlock: () => e(NS.FaqBlock, { title: "Questions", items: [{ id: "a", question: "Do huts take cards?", answer: "Most do." }, { id: "b", question: "Is there signal?", answer: "Rarely." }], defaultOpen: ["a"] }),
  CtaBlock: () => e(NS.CtaBlock, { title: "Ready to go?", lead: "Pick your dates.", actions: e(NS.Button, null, "Start") }),
  ChatBlock: () => e(NS.ChatBlock, { title: "Maya Chen", presence: "online", typing: "Maya", onRetry: noop,
    messages: [{ id: "a", from: "them", day: "Today", text: "How can I help?" }, { id: "e", kind: "event", text: "Maya joined the conversation" }, { id: "b", from: "me", text: "Where is my order?", status: "failed" }],
    quickReplies: { options: [{ id: "track", label: "Track my order" }], onSelect: noop }, composer: { value: "", onChange: noop, onSend: noop } }),
  /* Store blocks. */
  ProductGridBlock: () => e(NS.ProductGridBlock, { title: "New in", products: [{ id: "mug", name: "Stoneware mug", price: 24, href: "#mug", locale: "en-US" }, { id: "tote", name: "Canvas tote", price: 32, href: "#tote", locale: "en-US" }] }),
  ProductDetailBlock: () => e(NS.ProductDetailBlock, { name: "Stoneware mug", price: 24, locale: "en-US", images: [{ src: "mug.png", alt: "Front" }, { src: "mug-side.png", alt: "Side" }], quantity: 1, onQuantityChange: noop, onAddToCart: noop,
    variants: [{ label: "Glaze", value: "fern", onChange: noop, options: [{ value: "fern", label: "Fern" }, { value: "chalk", label: "Chalk" }] }], details: [{ title: "Care", content: "Dishwasher safe." }] }),
  CartBlock: () => e(NS.CartBlock, { lines: [{ id: "mug", name: "Stoneware mug", price: 24, quantity: 2, lineTotal: 48, locale: "en-US", onQuantityChange: noop, onRemove: noop }],
    summary: { locale: "en-US", lines: [{ label: "Subtotal", amount: 48 }], total: { amount: 48 } }, checkoutAction: e(NS.Button, { fullWidth: true }, "Check out") }),
  CheckoutBlock: () => e(NS.CheckoutBlock, { email: "", onEmailChange: noop, locale: "en-US", delivery: "standard", onDeliveryChange: noop,
    deliveryOptions: [{ id: "standard", label: "Standard", detail: "3–5 days", price: 0 }, { id: "express", label: "Express", price: 12 }],
    lines: [{ id: "mug", name: "Stoneware mug", price: 24, quantity: 2 }],
    summary: { locale: "en-US", lines: [{ label: "Subtotal", amount: 48 }], total: { amount: 48 } }, submitAction: e(NS.Button, { fullWidth: true }, "Place order") }),
};

function render(name) {
  const build = specimens[name] || FALLBACKS[name];
  if (!build) return fail(name, "no specimen and no fallback in tools/check/ssr.mjs");
  if (typeof NS[name] !== "function" && typeof NS[name] !== "object") return fail(name, "not exported on the namespace");

  const seen = [];
  const original = { error: console.error, warn: console.warn };
  const capture = (level) => (...args) => {
    seen.push(`console.${level}: ${args.map(String).join(" ").replace(/\s+/g, " ").trim()}`);
  };
  console.error = capture("error");
  console.warn = capture("warn");
  try {
    const html = renderToString(build());
    if (typeof html !== "string") seen.push("did not return a string");
  } catch (err) {
    seen.push(`threw: ${(err && err.message) || err}`);
  } finally {
    console.error = original.error;
    console.warn = original.warn;
  }
  for (const message of seen) fail(name, message);
}

for (const name of names) render(name);

/* A component can also fail after load, by pushing to __errors lazily. */
for (const err of NS.__errors || []) {
  if (!problems.some((p) => p.name === "bundle" && p.message === `${err.path}: ${err.error}`)) {
    fail("bundle", `${err.path}: ${err.error}`);
  }
}

for (const p of problems) console.log(`ssr: ${p.name}: ${p.message}`);
console.log(`ssr: ${names.length} rendered, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
