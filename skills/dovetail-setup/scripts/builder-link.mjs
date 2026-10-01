#!/usr/bin/env node
/* Turns a builder layout into a link that opens it on the Dovetail builder's
   canvas, as layers to keep editing.

     node builder-link.mjs layout.json        print the link
     node builder-link.mjs - < layout.json    read the layout from stdin
     --site https://example.com/dovetail/     a different copy of the docs site

   A layout is JSON in the format at
   https://graham-goebel.github.io/Dovetail/assets/builder-layouts.md: frames
   holding nodes, each a component with its props and token style names. This
   checks the shape and flags values that are plainly not tokens. The builder
   itself leaves out anything it can't set when the link opens, and says what. */

import fs from "node:fs";

const SITE = "https://graham-goebel.github.io/Dovetail/";
const args = process.argv.slice(2);
const siteAt = args.indexOf("--site");
const site = siteAt >= 0 ? String(args.splice(siteAt, 2)[1] || "") : SITE;
const file = args[0];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!file) fail("give a layout file, or - to read stdin. See the header of this script.");
let text;
try {
  text = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
} catch (err) {
  fail(`can't read ${file}: ${err.message}`);
}

let layout;
try {
  layout = JSON.parse(text);
} catch (err) {
  fail(`${file} isn't JSON: ${err.message}`);
}

/* The builder also takes one frame, one node or a list of nodes. */
if (Array.isArray(layout)) layout = { frames: [{ name: "Layout", hug: true, root: { children: layout } }] };
else if (layout && typeof layout === "object" && !Array.isArray(layout.frames)) {
  if (layout.type) layout = { frames: [{ name: "Layout", hug: true, root: { children: [layout] } }] };
  else if (layout.root || layout.children) layout = { frames: [layout] };
}
if (!layout || !Array.isArray(layout.frames) || !layout.frames.length) fail("no frames or nodes found");

const RAW = /\d(px|rem|em|vh|vw|%)\b|#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i;
const warnings = [];
let count = 0;
function walk(node, where) {
  if (!node || typeof node !== "object" || typeof node.type !== "string") {
    warnings.push(`${where}: a node needs a "type"`);
    return;
  }
  count++;
  for (const [key, value] of Object.entries(node.style || {})) {
    if (typeof value !== "string" || RAW.test(value)) warnings.push(`${where} ${node.type}: style ${key} ${JSON.stringify(value)} should be a token option name, like "md"`);
  }
  for (const [key, value] of Object.entries(node.props || {})) {
    if (value && typeof value === "object") warnings.push(`${where} ${node.type}: prop ${key} should be text, a number or true/false`);
  }
  if (node.children !== undefined && typeof node.children !== "string" && !Array.isArray(node.children)) warnings.push(`${where} ${node.type}: children should be an array of nodes`);
  if (Array.isArray(node.children)) node.children.forEach((c, i) => walk(c, `${where}.${i}`));
}
layout.frames.forEach((frame, i) => {
  const kids = (frame && frame.root && frame.root.children) || (frame && frame.children) || [];
  if (!Array.isArray(kids)) warnings.push(`frame ${i}: root.children should be an array of nodes`);
  else kids.forEach((c, j) => walk(c, `frame ${i} node ${j}`));
});
if (!count) fail("the layout has no nodes");

const link = `${site.replace(/\/?$/, "/")}builder.html#b=${Buffer.from(JSON.stringify(layout)).toString("base64url")}`;
console.log(link);
console.error(`ok: ${layout.frames.length} frame${layout.frames.length === 1 ? "" : "s"}, ${count} node${count === 1 ? "" : "s"}, a ${link.length}-character link`);
if (link.length > 30000) console.error("warning: a link this long can be cut short when pasted into some apps. In the builder, Start from, then Paste a layout, takes the JSON itself.");
for (const w of warnings) console.error(`warning: ${w}`);
