/* A project's theme as the theme.css its downloaded code will carry
   (assets/builder/model/theme.js). The stylesheet comes from Configure's
   headless core, loaded here the way the package loads it: the data file
   and assets/theme.js in a window of their own. Run with npm run check:unit. */

import { ROOT } from "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { themeCss } from "../../../assets/builder/model/theme.js";

const own = { DovetailThemeHeadless: true };
vm.runInNewContext(
  fs.readFileSync(path.join(ROOT, "assets/configure-data.js"), "utf8") + "\n" + fs.readFileSync(path.join(ROOT, "assets/theme.js"), "utf8"),
  { window: own },
);
const core = own.DovetailThemeCore;

/* The declarations inside one block, by selector. */
function block(css, selector) {
  const m = css.match(new RegExp("(?:^|\\n)" + selector.replace(".", "\\.") + " \\{\\n([\\s\\S]*?)\\n\\}"));
  return m ? m[1] : null;
}

const SAVED = {
  config: { primary: "custom", primaryHex: "#1f6feb", radius: "sharp", brandFill: "quiet", pageTint: "muted" },
  brand: { name: "Acme", mark: "javascript:alert(1)", wordmark: "" },
  media: { photo: "", illustration: "" },
  context: "",
};

test("theme: a saved theme gives its overrides under :root, and the dark-following roles again under .dark", () => {
  const css = themeCss(SAVED, core);
  const root = block(css, ":root");
  assert.ok(root, "a :root block");
  assert.match(root, /--dt-color-primary-600: #1f6feb;/, "the custom colour at its anchor step");
  assert.match(root, /--dt-color-primary-050: oklch\(/, "and the rest of its ramp");
  assert.match(root, /--dt-color-secondary-500: /, "the secondary ramp");
  assert.match(root, /--dt-radius-control: var\(--dt-radius-raw-0\);/, "the shape chosen");
  assert.match(root, /--dt-surface-brand: var\(--dt-surface-brand-muted\);/, "the quiet fill");
  const dark = block(css, ".dark");
  assert.ok(dark, "a .dark block, since the tint and the fill must follow a dark band");
  assert.match(dark, /--dt-surface-base: var\(--dt-surface-brand-muted\);/);
  assert.match(dark, /--dt-text-on-brand: var\(--dt-text-on-brand-muted\);/);
  assert.match(css, /Name: Acme/, "the brand name in its note");
  assert.doesNotMatch(css, /javascript:/, "cleaned first: a mark that isn't image data is dropped");
});

test("theme: the same file Configure's download gives for those choices", () => {
  assert.equal(themeCss(SAVED, core), core.css(SAVED.config, { name: "Acme", mark: "", wordmark: "" }));
});

test("theme: no theme gives nothing; an empty one gives the defaults written out", () => {
  assert.equal(themeCss(undefined, core), "", "undefined: the system's own stylesheet already holds the defaults");
  assert.equal(themeCss(null, core), "");
  assert.equal(themeCss("dark", core), "", "not a theme");
  const empty = themeCss({}, core);
  assert.equal(empty, core.css({}), "an empty theme is every default");
  assert.ok(!block(empty, ".dark"), "with nothing that needs a .dark block");
  assert.equal(themeCss({ config: { radius: 42, primaryHex: "red; } body { x" } }, core), empty, "settings of the wrong type or shape are dropped, as loading would");
});

test("theme: on the builder page the Configure panel supplies the stylesheet", () => {
  assert.throws(() => themeCss(SAVED), /has not loaded/, "a theme with no Configure to write it is a fault, not an empty file");
  globalThis.window.DovetailConfigurePanel = { themeCss: core.themeCss };
  try {
    assert.equal(themeCss(SAVED), themeCss(SAVED, core));
  } finally {
    delete globalThis.window.DovetailConfigurePanel;
  }
});
