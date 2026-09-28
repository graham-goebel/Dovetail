#!/usr/bin/env node
/* Loads the site in a real browser and reports anything broken.

     npm run check:browser
     node tools/check/browser.mjs --only=cards     just the preview cards
     node tools/check/browser.mjs --only=pages     just the site pages
     node tools/check/browser.mjs --only=links     just the link check (no browser)

   What counts as a problem:
     cards   a script error, a local file that 404s, a component that threw
             while the bundle loaded, or the card's own "could not load the
             design system" notice.
     pages   a script error, a local file that 404s, or a console error that
             is not about a third-party font or CDN.
     links   an href or src on a generated page that points at a local file
             that does not exist, or a card that pastes in a copy of shared
             code (the system CSS, the card kit, the theme scripts) instead
             of linking it.

   Chromium comes from Playwright (`npx playwright install chromium`). To use
   a browser already on the machine instead, set CHROMIUM_PATH to its binary. */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { serve, ROOT } from "./serve.mjs";

const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const run = (name) => !only || only === name;
const NS_KEY = "BeamMobileDesignSystem_e33121";
const THIRD_PARTY = /fonts\.googleapis|fonts\.gstatic|ERR_CERT|jsdelivr|unpkg|cdnjs|lucide|net::ERR_(NAME|INTERNET|CONNECTION|TUNNEL|PROXY)/i;
const CARD_FAILED = "This card could not load the design system";

/* The generated site: every page outside previews/ (the cards), system/ (the
   package itself) and examples/ (sites built with the system, checked on
   their own). */
function sitePages() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (/^(\.|node_modules|previews|system|examples)/.test(rel)) continue;
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".html")) out.push(rel.split(path.sep).join("/"));
    }
  })("");
  return out.sort();
}

function cards() {
  return fs.readdirSync(path.join(ROOT, "previews")).filter((f) => f.endsWith(".html")).sort().map((f) => "previews/" + f);
}

function checkLinks() {
  const problems = [];
  let checked = 0;
  const pages = sitePages();
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), "utf8");
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      let u = m[1];
      if (/^(https?:|data:|mailto:|tel:|#|javascript:)/.test(u) || u.includes("${")) continue;
      u = decodeURIComponent(u.split("#")[0].split("?")[0]);
      if (!u) continue;
      checked++;
      if (!fs.existsSync(path.normalize(path.join(ROOT, path.dirname(p), u)))) problems.push(`${p}: missing ${m[1]}`);
    }
  }
  console.log(`links: ${checked} local links on ${pages.length} pages, ${problems.length} missing`);
  return problems;
}

async function visit(ctx, origin, url, kind) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on("pageerror", (e) => errs.push("script error: " + String(e.message || e).split("\n")[0].slice(0, 160)));
  pg.on("console", (m) => {
    if (m.type() === "error" && !THIRD_PARTY.test(m.text()) && !/Failed to load resource/.test(m.text())) errs.push("console: " + m.text().slice(0, 160));
  });
  pg.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(origin) && !u.endsWith("/favicon.ico")) errs.push(`${r.status()} ${u.slice(origin.length)}`);
  });
  try {
    await pg.goto(`${origin}/${url}`, { waitUntil: "load", timeout: 30000 });
    await pg.waitForTimeout(kind === "card" ? 900 : 400);
    if (kind === "card") {
      const state = await pg.evaluate(
        ([key, failed]) => ({
          bundleErrors: ((window[key] && window[key].__errors) || []).map((e) => e.path + ": " + e.error),
          failed: document.body.innerText.includes(failed),
        }),
        [NS_KEY, CARD_FAILED]
      );
      if (state.failed) errs.push("card could not load the design system");
      state.bundleErrors.forEach((e) => errs.push("bundle: " + e));
    }
  } catch (e) {
    errs.push("did not load: " + e.message.split("\n")[0]);
  }
  await pg.close();
  return errs.map((e) => `${url}: ${e}`);
}

/* A few pages at a time: fast enough, and gentle on a small CI runner. */
async function visitAll(ctx, origin, urls, kind) {
  const problems = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < urls.length) problems.push(...(await visit(ctx, origin, urls[next++], kind)));
    })
  );
  return problems;
}

/* Cards share the system's CSS and the card kit by reference. A pasted copy
   goes stale the moment a token changes, and makes every edit to shared code
   an edit to dozens of files, so it counts as a problem. */
const INLINED = [
  [/<style[^>]*>\s*\/\* Dovetail — global entry point/, "an inlined copy of system/styles.css; link ../system/styles.css"],
  [/<style id="__dt-inline">/, "a frozen copy of the tokens; link ../system/styles.css"],
  [/<style[^>]*>\/\* TIER 1 — PRIMITIVE COLOR/, "an inlined copy of the tokens; link ../system/styles.css"],
  [/<script>\s*\/\* Card kit — shared chrome/, "an inlined card kit; load ../system/templates/_support/card-kit.js"],
  [/<script>\s*\/\* Theme runtime — applies a saved configurator theme/, "an inlined theme runtime; load ../system/templates/_support/theme-runtime.js"],
  [/<script>\s*\/\* (The Design System page|The card)'s theme picker sets data-theme/, "an inlined theme sync; load ../system/templates/_support/card-theme-sync.js"],
];

function checkInlined() {
  const problems = [];
  for (const card of cards()) {
    const html = fs.readFileSync(path.join(ROOT, card), "utf8");
    for (const [pattern, what] of INLINED) if (pattern.test(html)) problems.push(`${card}: ${what}`);
  }
  console.log(`shared code: ${cards().length} cards, ${problems.length} with inlined copies`);
  return problems;
}

const problems = [];
if (run("links")) problems.push(...checkLinks(), ...checkInlined());

if (run("cards") || run("pages")) {
  const server = await serve(0);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  try {
    if (run("cards")) {
      const list = cards();
      const found = await visitAll(ctx, server.origin, list, "card");
      console.log(`cards: ${list.length} checked, ${found.length} problems`);
      problems.push(...found);
    }
    if (run("pages")) {
      const list = sitePages();
      const found = await visitAll(ctx, server.origin, list, "page");
      console.log(`pages: ${list.length} checked, ${found.length} problems`);
      problems.push(...found);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (problems.length) {
  console.error("\n" + problems.join("\n"));
  process.exit(1);
}
console.log("no problems");
