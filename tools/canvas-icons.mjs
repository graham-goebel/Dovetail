/* The builder's canvas icons: the animated SVGs in assets/builder/icons/canvas,
   turned into one module for the bundle. Each icon's own CSS is kept, but
   scoped to [data-ci="name"] in place of its class, and its animations run
   only while the control it sits in is hovered or focused, or carries
   .ci-play, so nothing loops at rest. Only the icons named in
   assets/builder/icons/use.json are bundled. */

import fs from "node:fs";
import path from "node:path";

/* Top-level CSS rules, with @-blocks kept whole. */
function rules(css) {
  const out = [];
  let depth = 0, start = 0, head = "";
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") { if (depth === 0) { head = css.slice(start, i).trim(); start = i + 1; } depth++; }
    else if (ch === "}") { depth--; if (depth === 0) { out.push({ head, body: css.slice(start, i) }); start = i + 1; } }
  }
  return out;
}

const TRIGGER = ":is(:is(button,a,label,summary,[role=button],[role=tab],[role=menuitem],[role=option]):is(:hover,:focus-visible),.ci-play)";

/* One SVG file to its markup and CSS. */
function readIcon(name, svg) {
  const open = svg.match(/<svg\b[^>]*>/);
  const cls = open && open[0].match(/class="([^"]*)"/);
  const base = cls && cls[1].split(/\s+/).filter((c) => c && c !== "ci")[0];
  if (!open || !base) throw new Error(`canvas icon ${name}: no <svg class> to scope it by`);
  const css = (svg.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "";
  const inner = svg.slice(open.index + open[0].length, svg.lastIndexOf("</svg>")).replace(/<style>[\s\S]*?<\/style>/, "").trim();
  const own = new RegExp("\\." + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-])", "g");
  const scoped = (sel) => sel.replace(own, `[data-ci="${name}"]`);
  const out = rules(css).map(({ head, body }) => {
    if (head.startsWith("@keyframes")) return `${head}{${body}}`;
    if (head.startsWith("@media")) return `${head}{${rules(body).map((r) => `${r.head.split(",").map(scoped).join(",")}{${r.body}}`).join("")}}`;
    const sels = head.split(",").map(scoped);
    /* Movement waits for the control to be hovered or focused. */
    const moves = /(^|;)\s*animation\s*:/.test(body);
    return `${sels.map((s) => (moves ? `${TRIGGER} ${s}` : s)).join(",")}{${body}}`;
  }).join("");
  return { markup: inner, css: out };
}

function canvasIcons(root) {
  const dir = path.join(root, "assets/builder/icons/canvas");
  const use = JSON.parse(fs.readFileSync(path.join(root, "assets/builder/icons/use.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const wanted = [...new Set(Object.values(use))].sort();
  const markup = {};
  let css = "";
  for (const name of wanted) {
    const entry = manifest[name];
    if (!entry) throw new Error(`assets/builder/icons/use.json names "${name}", which isn't in the canvas icons`);
    const icon = readIcon(name, fs.readFileSync(path.join(dir, entry.file.replace(/^svg\//, "")), "utf8"));
    markup[name] = icon.markup;
    css += icon.css;
  }
  return { use, markup, css };
}

export { canvasIcons, readIcon };
