import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canvasIcons, readIcon } from "../../canvas-icons.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("an icon's CSS is scoped to its data-ci name and moves only when its control is hovered", () => {
  const svg = '<svg class="ci layers" viewBox="0 0 24 24"><style>.layers .top{animation:a 1s}.layers .motion{transform-origin:12px 12px}@keyframes a{0%{opacity:1}}@media(prefers-reduced-motion:reduce){.layers *{animation:none!important}}</style><g class="top"><path d="M1 1"/></g></svg>';
  const { markup, css } = readIcon("layers", svg);
  assert.equal(markup, '<g class="top"><path d="M1 1"/></g>');
  assert.match(css, /:hover,:focus-visible\),\.ci-play\) \[data-ci="layers"\] \.top\{animation:a 1s\}/);
  assert.match(css, /\}\[data-ci="layers"\] \.motion\{/, "a rule without motion isn't gated");
  assert.ok(!/\.layers\b/.test(css), "the bare class is gone, so it can't catch other elements");
  assert.match(css, /@keyframes a\{/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\[data-ci="layers"\] \*\{animation:none!important\}\}/);
});

test("every name in use.json is a canvas icon, and each bundles markup", () => {
  const { use, markup, css } = canvasIcons(ROOT);
  for (const [name, ci] of Object.entries(use)) assert.ok(markup[ci], `${name} → ${ci} has markup`);
  assert.ok(!/<script|href=|url\(/i.test(Object.values(markup).join("") + css), "nothing loads or runs from an icon");
});
