#!/usr/bin/env node
/* Builds the static Dovetail documentation site from `system/` and `previews/`.
   No dependencies: run `node tools/build-site.mjs` and open index.html.

   Inputs
     system/     the design system itself, exactly as it was authored
     previews/   the @dsCard preview documents; patched in place so each one
                 loads React and the component bundle on its own

   Outputs
     index.html, foundations/, components/, showcase/, guide/, tokens.html

   Everything the generator writes is derived. Edit the system, not the output. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYS = path.join(ROOT, "system");
const PREVIEWS = path.join(ROOT, "previews");

const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
const write = (rel, html) => {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  written.push(rel);
};
const written = [];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = (s) => esc(s).replace(/'/g, "&#39;");
const slug = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------------------------------------------------------------- markdown */

/* A small CommonMark subset: headings, fenced code, tables, lists, quotes,
   rules, and the inline set the system's own documentation uses. */
function inlineMd(t) {
  /* Some of the system's markdown escapes its backticks, an artefact of files
     that once lived inside template literals. Unescaping first is what turns
     `\`Checkbox\`` back into the code span it was written to be, rather than a
     pair of stray backslashes on the page. */
  const spans = [];
  let s = String(t).replace(/\\`/g, "`").replace(/`([^`]+)`/g, (_, code) => {
    spans.push(`<code>${esc(code)}</code>`);
    return `\u0000${spans.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => `<a href="${attr(href)}">${label}</a>`);
  s = s.replace(/(^|\W)\*\*([^*]+)\*\*/g, "$1<strong>$2</strong>");
  s = s.replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => spans[Number(n)]);
  return s;
}

function markdown(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const inline = inlineMd;

  const tableRow = (line) =>
    line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(
        `<pre class="code"${lang ? ` data-lang="${attr(lang)}"` : ""}><code>${esc(body.join("\n"))}</code></pre>`
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = inline(h[2]);
      const id = slug(h[2]);
      out.push(`<h${level} id="${attr(id)}">${text}</h${level}>`);
      i++;
      continue;
    }

    if (/^(\s*)(---|\*\*\*|___)\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    if (/^\s*\|/.test(line) && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] || "")) {
      const head = tableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(tableRow(lines[i++]));
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head
          .map((c) => `<th>${inline(c)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${markdown(body.join("\n"))}</blockquote>`);
      continue;
    }

    const bullet = /^\s*([-*+]|\d+[.)])\s+/;
    if (bullet.test(line)) {
      const ordered = /^\s*\d+[.)]\s/.test(line);
      const items = [];
      while (i < lines.length && (bullet.test(lines[i]) || (/^\s+\S/.test(lines[i]) && items.length))) {
        if (bullet.test(lines[i])) items.push(lines[i].replace(bullet, ""));
        else items[items.length - 1] += " " + lines[i].trim();
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|\s*\||\s*>)/.test(lines[i]) && !bullet.test(lines[i])) {
      para.push(lines[i++]);
    }
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

/* Splits a markdown document into its `## ` sections, so pages can reuse a
   section verbatim instead of paraphrasing it. */
function sections(src) {
  const map = new Map();
  const parts = src.split(/^## /m);
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    map.set(part.slice(0, nl).trim(), part.slice(nl + 1).trim());
  }
  return map;
}

/* -------------------------------------------------------------------- icons */

/* Dovetail ships no icon set. The README says to load one, and the media lab is
   where you try them. These are the site's own chrome: drawn on the same 24px
   grid with round caps and joins, inherited colour, and no fill, which is the
   convention Lucide and Heroicons share and the one the system documents. They
   are inline so a page needs no script and no CDN to show them, and they are
   stroked, so the icon controls in the Configure sheet move them with everything
   else. They are not copies of any library's glyphs. */
const ICONS = {
  compass: ['<circle cx="12" cy="12" r="9"/>', '<path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>'],
  layers: ['<path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/>', '<path d="m3 16.5 9 4.5 9-4.5"/>', '<path d="m3 12 9 4.5L21 12"/>'],
  blocks: [
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/>',
    '<rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/>',
    '<rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    '<rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  ],
  braces: [
    '<path d="M9 3H8a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/>',
    '<path d="M15 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>',
  ],
  monitor: ['<rect x="2.5" y="3.5" width="19" height="13" rx="2"/>', '<path d="M8.5 20.5h7"/>', '<path d="M12 16.5v4"/>'],
  book: ['<path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>', '<path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5Z"/>'],
  download: ['<path d="M12 3.5v11"/>', '<path d="m7.5 10 4.5 4.5L16.5 10"/>', '<path d="M4.5 20.5h15"/>'],
  droplet: ['<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-2-1.2-3.8-3-5.4C13.6 8 12.5 5.6 12 3c-.5 2.6-1.6 5-3.5 6.6-1.8 1.6-3 3.4-3 5.4a6.5 6.5 0 0 0 6.5 6.5Z"/>'],
  type: ['<path d="M4.5 7V4.5h15V7"/>', '<path d="M9.5 19.5h5"/>', '<path d="M12 4.5v15"/>'],
  ruler: ['<path d="m17.5 8 4 4-4 4"/>', '<path d="M2.5 12h19"/>', '<path d="m6.5 8-4 4 4 4"/>'],
  square: ['<rect x="3.5" y="3.5" width="17" height="17" rx="4"/>'],
  scale: ['<path d="M20.5 3.5 3.5 20.5"/>', '<path d="M20.5 9.5v-6h-6"/>', '<path d="M3.5 14.5v6h6"/>'],
  zap: ['<path d="M13 2.5 4 13.5h7l-1 8 9-11h-7l1-8Z"/>'],
  blend: ['<circle cx="9" cy="9" r="6"/>', '<circle cx="15" cy="15" r="6"/>'],
  box: ['<path d="m20.5 7.5-8.5-4.5-8.5 4.5v9l8.5 4.5 8.5-4.5v-9Z"/>', '<path d="m3.5 7.5 8.5 4.5 8.5-4.5"/>', '<path d="M12 12v9"/>'],
  list: ['<path d="M8.5 6h12"/>', '<path d="M8.5 12h12"/>', '<path d="M8.5 18h12"/>', '<path d="M3.5 6h.01"/>', '<path d="M3.5 12h.01"/>', '<path d="M3.5 18h.01"/>'],
  sliders: [
    '<path d="M5 21v-6"/>', '<path d="M5 11V3"/>', '<path d="M12 21v-9"/>', '<path d="M12 8V3"/>',
    '<path d="M19 21v-4"/>', '<path d="M19 13V3"/>', '<path d="M2.5 15h5"/>', '<path d="M9.5 8h5"/>', '<path d="M16.5 17h5"/>',
  ],
  layout: ['<rect x="3.5" y="3.5" width="17" height="17" rx="2"/>', '<path d="M3.5 9.5h17"/>', '<path d="M9.5 20.5v-11"/>'],
  file: ['<path d="M13.5 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5l-6-6Z"/>', '<path d="M13.5 2.5v6h6"/>'],
  wrench: ['<path d="M20.5 4.5 17 8l-1-1 3.5-3.5a5.5 5.5 0 0 0-7 7l-8 8a2 2 0 0 0 2.8 2.8l8-8a5.5 5.5 0 0 0 7-7l-1.8 1.8"/>'],
};

function icon(name) {
  const paths = ICONS[name];
  if (!paths) return "";
  return `<svg class="tile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.join("")}</svg>`;
}

/* ------------------------------------------------------------ preview cards */

/* Every preview opens with an `@dsCard` comment carrying its group, intended
   size and subtitle. That comment is the site's navigation data. */
function parseCard(html) {
  const first = html.slice(0, html.indexOf("\n"));
  const m = first.match(/@dsCard\s+(.*?)\s*-->/);
  if (!m) return null;
  const spec = m[1];
  const get = (key) => {
    const q = spec.match(new RegExp(`${key}="([^"]*)"`));
    if (q) return q[1];
    const n = spec.match(new RegExp(`${key}=(\\d+)`));
    return n ? Number(n[1]) : undefined;
  };
  return { group: get("group") || "Other", height: get("height") || 600, width: get("width"), subtitle: get("subtitle") || "", name: get("name") };
}

const RUNTIME_MARKER = "dovetail-site-runtime";

/* The previews were authored against a host that pre-loaded React and the
   component bundle. Standalone they have to load both themselves. */
function patchPreview(file) {
  const src = read(file);
  let out = src;

  if (!out.includes(RUNTIME_MARKER)) {
    const inject = `<!-- ${RUNTIME_MARKER}: added by tools/build-site.mjs so this card runs on its own -->
<script src="../system/components/lib/react.production.min.js"></script>
<script src="../system/components/lib/react-dom.production.min.js"></script>
<script src="../system/components/bundle.js"></script>
`;
    out = out.replace(/<head>/i, `<head>\n${inject}`);
  }

  /* A card was written from its place in the project, so the few resources it
     loads by path need re-pointing at system/. Each rewrite stops matching once
     it has run, which is what keeps a rebuild a no-op. Paths quoted inside
     documentation and code samples are left alone: they tell the reader what to
     write in their own project, and there they are correct. */
  out = out.replace(/src="templates\/_support\//g, 'src="../system/templates/_support/');
  out = out.replace(/"\.\/templates\/settings-page\//g, '"../system/templates/settings-page/');

  if (out === src) return false;
  fs.writeFileSync(file, out);
  return true;
}

/* --------------------------------------------------------------- configure data */

/* The Configure panel offers the same choices as the theme configurator card, so it
   reads them from the configurator rather than keeping a second copy that could
   drift. These are static object literals in a file of ours, so evaluating them
   at build time is reading data, not running someone else's code. */
function literal(src, name) {
  const at = src.indexOf(`const ${name} = `);
  if (at === -1) throw new Error(`theme-configurator.html has no ${name}`);
  let i = src.indexOf("=", at) + 1;
  while (/\s/.test(src[i])) i++;
  const start = i;
  let depth = 0;
  let quote = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`could not read ${name} from theme-configurator.html`);
}

/* The icon libraries are the media lab's, read from the card for the same reason
   the theme choices are read from the configurator: one source, no drift. */
function iconLibraries() {
  const src = read(path.join(PREVIEWS, "MediaLab.html"));
  const libs = new Function(`return ${literal(src, "LIBS")}`)();
  return {
    lucide: {
      label: libs.lucide.label,
      note: libs.lucide.note,
      licence: `v${libs.lucide.version} · ${libs.lucide.licence}`,
      stroke: 2,
      include: `<script src="${libs.lucide.url}"></script>`,
    },
    heroicons: {
      label: `${libs.heroicons.label} (outline)`,
      note: libs.heroicons.note,
      licence: `v${libs.heroicons.version} · ${libs.heroicons.licence}`,
      stroke: 1.5,
      include: `import { BellIcon } from "@heroicons/react@${libs.heroicons.version}/24/outline";`,
    },
  };
}

function buildConfigureData() {
  const src = read(path.join(SYS, "theme-configurator.html"));
  const take = (name) => new Function(`return ${literal(src, name)}`)();

  /* Each preset's label carries its kind, which is what sorts twenty-two
     families into the three selects: text faces for body, everything but the
     code faces for display, code faces for code. */
  const fonts = take("FONT_PRESETS");
  const kindOf = (key) => (fonts[key].label.match(/^(Sans|Serif|Display|Mono)/) || [, "Sans"])[1];
  const grouped = (kinds) =>
    kinds
      .map((kind) => ({
        group: kind === "Display" ? "Display faces" : kind + " faces",
        options: Object.keys(fonts)
          .filter((key) => kindOf(key) === kind)
          .map((key) => ({ value: key, label: fonts[key].label.replace(/^(Sans|Serif|Display|Mono) . /, "") })),
      }))
      .filter((g) => g.options.length);

  const data = {
    steps: take("STEPS"),
    ramps: take("RAMPS"),
    accents: take("ACCENTS"),
    radii: take("RADIUS_PRESETS"),
    fonts,
    bodyFonts: grouped(["Sans", "Serif"]),
    displayFonts: grouped(["Sans", "Serif", "Display"]),
    codeFonts: grouped(["Mono"]),
    density: take("DENSITY_OVERRIDES"),
    monochrome: take("MONO_OVERRIDES"),
    presets: take("THEME_PRESETS"),
    icons: iconLibraries(),
    /* The dimension scale, by the multiplier in each name. Re-deriving it from a
       different base unit is what the naming convention is for. */
    dimSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64],
  };

  write(
    "assets/configure-data.js",
    `/* Generated by tools/build-site.mjs from system/theme-configurator.html.\n   Edit the configurator, not this file. */\nwindow.DovetailConfigure = ${JSON.stringify(data, null, 2)};\n`
  );
}

/* ----------------------------------------------------------- legacy bundle */

/* The component bundle was authored at the project root as `_ds_bundle.js` and
   renamed to components/bundle.js on the way here. The settings-page loader and
   the authored `.card.html` documents still ask for the original name, so it is
   restored beside the system from the one copy under version control. */
function syncLegacyBundle() {
  const from = path.join(SYS, "components", "bundle.js");
  const to = path.join(SYS, "_ds_bundle.js");
  const body = read(from);
  if (!exists(to) || read(to) !== body) fs.writeFileSync(to, body);
}

/* ------------------------------------------------------------- system model */

const manifest = JSON.parse(read(path.join(SYS, "manifest.json")));
const tokens = JSON.parse(read(path.join(SYS, "tokens.json")));
const readme = read(path.join(SYS, "README.md"));

const GROUP_ORDER = ["primitives", "actions", "forms", "display", "navigation", "feedback", "content"];
const GROUP_LABEL = {
  primitives: "Primitives",
  actions: "Actions",
  forms: "Forms",
  display: "Display",
  navigation: "Navigation",
  feedback: "Feedback",
  content: "Content",
};
/* One sentence per family, so the heading says what the group is for rather
   than only naming it. What each family owns, and what it deliberately leaves
   to another. */
const GROUP_BLURB = {
  primitives: "Layout with no opinion about content. These own spacing, stacking and rhythm, and they draw almost nothing themselves.",
  actions: "Everything a person can press. One visual hierarchy across all of them, so importance reads the same whether the target is a button or a link.",
  forms: "Inputs and the structure around them. Field owns the label, hint and error for every control, so validation looks and announces the same everywhere.",
  display: "Read-only presentation of data that already exists. They render what they are given and never fetch, sort or filter it.",
  navigation: "Moving between places, and showing where you are. Each one takes the current location as a prop rather than reading the URL, so they suit any router.",
  feedback: "Telling someone what happened, or asking before it does. Severity is a prop, and the overlays share one layer, focus trap and dismissal behaviour.",
  content: "Long-form and editorial shapes, including the pieces a CMS drives. Media reserves its space before it loads, so a page never jumps.",
};

const GROUP_DETAIL = {
  actions: ["ActionsDetail"],
  content: ["ContentDetail"],
  display: ["DisplayDetail", "SurfacesDetail"],
  feedback: ["FeedbackDetail", "SurfacesDetail"],
  forms: ["FormsDetail"],
  navigation: ["NavigationDetail"],
  primitives: ["PrimitivesDetail"],
};
/* Two components are exported from a sibling's source file. */
const EXPORTED_FROM = { ToastRegion: ["feedback", "Toast"], TabPanel: ["navigation", "Tabs"] };

const cards = new Map();
for (const file of fs.readdirSync(PREVIEWS).filter((f) => f.endsWith(".html")).sort()) {
  const full = path.join(PREVIEWS, file);
  patchPreview(full);
  const name = file.replace(/\.html$/, "");
  const card = parseCard(read(full));
  if (card) cards.set(name, { ...card, id: name, href: `previews/${file}` });
}

const components = [];
for (const { name } of manifest.components) {
  let group = null;
  for (const g of GROUP_ORDER) {
    if (exists(path.join(SYS, "components", g, `${name}.jsx`))) { group = g; break; }
  }
  const alias = EXPORTED_FROM[name];
  const sourceName = alias ? alias[1] : name;
  if (!group && alias) group = alias[0];
  if (!group) continue;
  const base = path.join(SYS, "components", group);
  const guidePath = path.join(base, `${sourceName}.md`);
  const guide = exists(guidePath) ? read(guidePath) : "";
  const summary = guide
    .split("\n")
    .slice(1)
    .find((l) => l.trim() && !l.startsWith("#")) || "";
  components.push({
    name,
    group,
    sourceName,
    guide,
    summary: summary.trim(),
    types: exists(path.join(base, `${sourceName}.d.ts`)) ? `system/components/${group}/${sourceName}.d.ts` : null,
    source: exists(path.join(base, `${sourceName}.jsx`)) ? `system/components/${group}/${sourceName}.jsx` : null,
    guideFile: exists(guidePath) ? `system/components/${group}/${sourceName}.md` : null,
    exportedFrom: alias ? alias[1] : null,
    card: cards.get(name) || null,
    playground: cards.get(`${name}Playground`) || null,
  });
}
const byGroup = (g) => components.filter((c) => c.group === g);

/* Foundation and showcase cards, in the order they should be read. */
const FOUNDATIONS = [
  ["Foundations", "foundations", "The contract the rest of the system rests on.", "compass"],
  ["Color", "color", "Seven OKLCH ramps, six surface levels, and the pairing rule.", "droplet"],
  ["Type", "type", "A 1.200 scale from 16px, with line heights on the 4px grid.", "type"],
  ["Space", "space", "One 4px base unit, read through three semantic axes.", "ruler"],
  ["Shape", "shape", "Radius named by what it wraps, and one focus ring.", "square"],
  ["Size", "size", "Control heights and icon sizes, all on the grid.", "scale"],
  ["Elevation", "elevation", "Six levels of z-order, not a menu of shadows.", "layers"],
  ["Motion", "motion", "Four roles. Exits are faster than entrances.", "zap"],
  ["Themes", "themes", "Brand and density skins, each a file of token overrides.", "blend"],
];
const SHOWCASE = [
  ["Components", "overviews", "Each component family at a glance.", "box"],
  ["Component detail", "detail", "Full reference cards: specimens, props and usage rules.", "list"],
  ["Playground", "playground", "Controls you can drive, with the code that produced them.", "sliders"],
  ["UI kits", "ui-kits", "Whole screens built only from Dovetail components.", "layout"],
  ["Templates", "templates", "Starting points to copy into a product.", "file"],
  ["Tools", "tools", "The theme configurator and the media lab.", "wrench"],
];
const cardsInGroup = (group) => [...cards.values()].filter((c) => c.group === group);

const GUIDE_PAGES = [
  ["readme", "README", "system/README.md", "The system's own manifest and design guide."],
  ["tokens", "Token reference", "system/guidelines/tokens.md", "Every token, tier by tier."],
  ["theming", "Theming", "system/guidelines/theming.md", "From a brand palette to a working theme."],
  ["accessibility", "Accessibility", "system/guidelines/accessibility.md", "What the system guarantees, and what you owe."],
  ["headless-integration", "Headless integration", "system/guidelines/headless-integration.md", "React, Sanity, and other content sources."],
  ["contributing", "Contributing", "system/guidelines/contributing.md", "How to add a component or a token."],
  ["token-pipeline", "Token pipeline", "system/tools/README.md", "DTCG source of truth and the Style Dictionary build."],
  ["authoring-rules", "Authoring rules", "system/assets/notes/CLAUDE.from-standalone.md", "The always-on rules for building with Dovetail."],
  ["plan", "Build plan", "system/PLAN.md", "The four-phase plan, benchmarks and inventory."],
  ["provenance", "Provenance", "system/assets/notes/MIGRATION-REPORT.md", "Where these files came from, file by file."],
];

/* ------------------------------------------------------------------- layout */

function nav(root, active) {
  const item = (href, label, id, extra = "") =>
    `<li><a href="${root}${href}"${id === active ? ' aria-current="page"' : ""}${extra}>${esc(label)}</a></li>`;

  const section = (title, items) =>
    `<details class="nav-section" open><summary>${esc(title)}</summary><ul>${items.join("")}</ul></details>`;

  const componentItems = GROUP_ORDER.map((g) => {
    const items = byGroup(g).map((c) => item(`components/${c.name}.html`, c.name, `component:${c.name}`));
    return `<li class="nav-group">${esc(GROUP_LABEL[g])}</li>${items.join("")}`;
  });

  return `<nav class="sidebar" id="sidebar" aria-label="Documentation">
  <div class="nav-filter">
    <label class="visually-hidden" for="nav-search">Filter navigation</label>
    <input id="nav-search" type="search" placeholder="Filter…" autocomplete="off">
  </div>
  <ul class="nav-top">
    ${item("index.html", "Overview", "home")}
    ${item("tokens.html", "Tokens", "tokens")}
    ${item("downloads.html", "Download", "downloads")}
  </ul>
  ${section(
    "Foundations",
    [item("foundations/index.html", "All foundations", "foundations")].concat(
      FOUNDATIONS.map(([group, s]) => item(`foundations/${s}.html`, group, `foundations:${s}`))
    )
  )}
  ${section(
    "Components",
    [item("components/index.html", "All components", "components")].concat(componentItems)
  )}
  ${section(
    "Showcase",
    [item("showcase/index.html", "All showcases", "showcase")].concat(
      SHOWCASE.map(([group, s]) => item(`showcase/${s}.html`, group, `showcase:${s}`))
    )
  )}
  ${section(
    "Guide",
    GUIDE_PAGES.map(([s, label]) => item(`guide/${s}.html`, label, `guide:${s}`))
  )}
</nav>`;
}

const ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1d4ed8"/><path d="M9 22 16 9l7 13z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>`
)}`;

function page({ title, lede, body, active, root, wide = false, scripts = "" }) {
  const heading = title === "Dovetail" ? "Dovetail" : `${title} · Dovetail`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(heading)}</title>
<meta name="description" content="${attr(lede || "Dovetail: a white-label design system.")}">
<link rel="icon" href="${ICON}">
<link rel="stylesheet" href="${root}system/styles.css">
<link rel="stylesheet" href="${root}assets/site.css">
<script>
  /* The saved configure, applied before first paint so no page flashes the default
     theme on its way to the chosen one. assets/theme.js owns everything after. */
  try {
    var r = document.documentElement;
    var cfg = JSON.parse(localStorage.getItem("dovetail-theme-config") || "null");
    var ctx = localStorage.getItem("dovetail-docs-context") || "";
    if (cfg && cfg.vars) for (var k in cfg.vars) r.style.setProperty(k, cfg.vars[k]);
    if (cfg && cfg.dark) r.classList.add("dark");
    if (ctx) r.classList.add(ctx);
    r.setAttribute("data-theme", cfg && cfg.dark ? "dark" : ctx || "light");
  } catch (e) {}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="wordmark" href="${root}index.html">
    <img class="wordmark-mark" alt="" hidden>
    <span class="wordmark-text">Dovetail</span>
  </a>
  <span class="wordmark-note">White-label design system</span>
  <div class="header-controls">
    <button id="nav-toggle" type="button" class="nav-toggle" aria-expanded="false" aria-controls="sidebar">Menu</button>
  </div>
</header>
<div class="layout">
${nav(root, active)}
<main id="main" class="${wide ? "main wide" : "main"}">
${body}
</main>
</div>
<footer class="site-footer">
  <code class="colophon"><span class="colophon-mark" aria-hidden="true">/*</span>form follows function<span class="colophon-mark" aria-hidden="true">*/</span></code>
</footer>
${scripts}<script src="${root}assets/configure-data.js" defer></script>
<script src="${root}assets/theme.js" defer></script>
<script src="${root}assets/site.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------ token usage */

/* Which tokens a component actually resolves, read out of its source rather
   than out of its guide, so the list cannot fall behind the code. Every value
   in a component is a custom property, so the references are all there is to
   find. */
const TOKEN_TIER_DIRS = [
  ["primitive", "primitive"],
  ["semantic", "semantic"],
  ["component", "component"],
];
const TIER_RANK = { component: 0, semantic: 1, primitive: 2, undefined: 3 };

const tokenDefs = new Map();
for (const [dir, tier] of TOKEN_TIER_DIRS) {
  const dirPath = path.join(SYS, "tokens", dir);
  if (!exists(dirPath)) continue;
  for (const file of fs.readdirSync(dirPath).filter((f) => f.endsWith(".css")).sort()) {
    const css = read(path.join(dirPath, file));
    for (const m of css.matchAll(/(--dt-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      /* First definition wins: later files are themes and overrides of a token
         the tier already declared. */
      if (!tokenDefs.has(m[1])) tokenDefs.set(m[1], { tier, value: m[2].trim().replace(/\s+/g, " ") });
    }
  }
}

/* The names that have a row on the tokens page, so a link only ever points at
   an anchor that exists. */
const tokenRows = new Set();
for (const family of Object.values(tokens)) {
  if (family && Array.isArray(family.tokens)) for (const t of family.tokens) tokenRows.add("dt-" + String(t.name).replace(/^dt-/, ""));
}

function tokensUsedBy(relSource) {
  const src = read(path.join(ROOT, relSource));
  const used = new Map();
  for (const m of src.matchAll(/--dt-[a-z0-9-]*/g)) {
    const raw = m[0];
    /* A size or variant suffix is interpolated: `--dt-button-height-${size}`.
       The prefix is real, so it stands for every token that starts with it. */
    const interpolated = src.slice(m.index + raw.length, m.index + raw.length + 2) === "${";
    if (interpolated || (raw.endsWith("-") && !tokenDefs.has(raw))) {
      for (const [name, def] of tokenDefs) if (name.startsWith(raw)) used.set(name, def);
      continue;
    }
    used.set(raw, tokenDefs.get(raw) || null);
  }
  return [...used.entries()]
    .map(([name, def]) => ({ name, tier: def ? def.tier : "undefined", value: def ? def.value : null }))
    .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name));
}

const TIER_NOTE = {
  component: "Its own tier. Override one of these and only this component moves.",
  semantic: "Shared roles. Override one and everything using that role moves with it.",
  primitive: "Raw values. A component reading one directly is a deliberate exception.",
  undefined: "Referenced by the source but declared by no tier, so it resolves to nothing.",
};

function tokenUsageSection(c, root) {
  if (!c.source) return "";
  const used = tokensUsedBy(c.source);
  if (!used.length) {
    return `<section class="prose">
  <h2 id="tokens-used">Tokens it reads</h2>
  <p class="muted">None. <code>${esc(path.basename(c.source))}</code> resolves no custom property: it sets structure and nothing a theme can move.</p>
</section>`;
  }
  const tiers = ["component", "semantic", "primitive", "undefined"].filter((t) => used.some((u) => u.tier === t));
  const rows = used
    .map((u) => {
      const bare = u.name.slice(2);
      const label = tokenRows.has(bare)
        ? `<a href="${root}tokens.html#token-${attr(bare)}"><code>${esc(u.name)}</code></a>`
        : `<code>${esc(u.name)}</code>`;
      const value = u.value ? `${swatch(u.value)}<code>${esc(u.value)}</code>` : `<span class="token-undefined">not declared</span>`;
      return `<tr id="uses-${attr(bare)}"><th scope="row">${label}</th><td>${esc(u.tier === "undefined" ? "none" : u.tier)}</td><td>${value}</td></tr>`;
    })
    .join("");
  const counts = tiers.map((t) => `${used.filter((u) => u.tier === t).length} ${t === "undefined" ? "undeclared" : t}`);
  return `<section class="prose">
  <h2 id="tokens-used">Tokens it reads</h2>
  <p class="muted">Every custom property <code>${esc(path.basename(c.source))}</code> resolves, read from the source: ${esc(counts.join(", "))}. Component tier first, because that is the one to reach for.</p>
  <ul class="tier-key">${tiers.map((t) => `<li><strong>${esc(t === "undefined" ? "none" : t)}</strong> ${esc(TIER_NOTE[t])}</li>`).join("")}</ul>
  <div class="table-wrap"><table class="tokens"><thead><tr><th>Token</th><th>Tier</th><th>Declared as</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

/* A card's file name is its identifier, and a few of them are not sentences a
   reader wants as a heading. The card keeps its name; the heading gets one. */
const CARD_TITLE = {
  TierContract: "The three tiers",
};

function cardBlock(card, root, { heading = null, level = 2 } = {}) {
  if (!card) return "";
  const title = heading || CARD_TITLE[card.id] || card.name || card.id;
  const height = Math.min(Number(card.height) || 600, 1100);
  const id = slug(title);
  return `<section class="card-block" id="${attr(id)}">
  <div class="card-head">
    <h${level}>${esc(title)}</h${level}>
    <a class="card-open" href="${root}${card.href}" target="_blank" rel="noopener">Open full card</a>
  </div>
  ${card.subtitle ? `<p class="card-sub">${esc(card.subtitle)}</p>` : ""}
  <div class="frame" style="height:${height}px">
    <iframe src="${root}${card.href}" title="${attr(title + " preview")}" loading="lazy"></iframe>
  </div>
</section>`;
}

function codeBlock(relPath, lang) {
  const body = read(path.join(ROOT, relPath));
  return `<pre class="code" data-lang="${attr(lang)}"><code>${esc(body.trimEnd())}</code></pre>`;
}

function breadcrumb(root, trail) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail
    .map((t) =>
      t.href ? `<li><a href="${root}${t.href}">${esc(t.label)}</a></li>` : `<li aria-current="page">${esc(t.label)}</li>`
    )
    .join("")}</ol></nav>`;
}

/* --------------------------------------------------------------- home page */

function buildHome() {
  const s = sections(readme);
  const tiles = [
    ["foundations/index.html", "Foundations", "Colour, type, space, shape, elevation and motion, each with live spec cards.", "layers"],
    ["components/index.html", "Components", `${components.length} components across seven families, with props, source and usage rules.`, "blocks"],
    ["tokens.html", "Tokens", "Every token in the system, with its value in each theme.", "braces"],
    ["showcase/index.html", "Showcase", "Detail cards, playgrounds, UI kits and templates.", "monitor"],
    ["guide/index.html", "Guide", "Theming, accessibility, contribution and the token pipeline.", "book"],
    ["downloads.html", "Download", "Take the stylesheets, tokens and components into your project.", "download"],
  ];
  const body = `
<section class="hero">
  <p class="eyebrow">Design system</p>
  <h1>Dovetail</h1>
  <p class="hero-lede">A white-label design system. It ships unbranded on purpose: adopt the foundation, apply a theme, and the entire system becomes yours without a fork.</p>
  <p class="hero-sub">Most design systems encode one company's taste. Dovetail encodes the structure that taste needs: a strict token contract, a 4px dimensional grid, and components that never name a colour. Brand arrives last, as a file of token overrides.</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="foundations/index.html">Read the foundations</a>
    <a class="btn" href="components/index.html">Browse components</a>
  </div>
  <p class="hero-note">Open <strong>Configure</strong> in the corner to set the accent, radius, type, density and mode. Every page and every live card on this site follows, and the panel hands you the theme file at the end.</p>
</section>

<section class="tiles">
  ${tiles
    .map(
      ([href, title, text, glyph]) =>
        `<a class="tile" href="${href}">${icon(glyph)}<h2>${esc(title)}</h2><p>${esc(text)}</p></a>`
    )
    .join("\n  ")}
</section>

<section class="prose">
  <h2 id="start-here">Start here</h2>
  ${markdown(s.get("Start here") || "")}
</section>

${cardBlock(cards.get("TierContract"), "", { heading: "The three tiers" })}

<section class="prose">
  <h2 id="how-the-system-is-put-together">How the system is put together</h2>
  ${markdown(s.get("How the system is put together") || "")}
</section>

<section class="prose">
  <h2 id="rules-checklist">Rules checklist</h2>
  ${markdown(s.get("Rules checklist") || "")}
  <p><a href="guide/readme.html">Read the full README</a> · <a href="guide/authoring-rules.html">Authoring rules</a></p>
</section>
`;
  write("index.html", page({ title: "Dovetail", lede: "A white-label design system: a strict token contract, a 4px grid, and components that never name a colour.", body, active: "home", root: "" }));
}

/* -------------------------------------------------------- foundation pages */

function buildFoundations() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Foundations" }])}
<h1>Foundations</h1>
<p class="lede">The visual and structural decisions every component inherits. Each card below is live: switch the colour mode or context in the header and watch it follow.</p>
<div class="tiles">
${FOUNDATIONS.map(([group, s, text, glyph]) => {
  const n = cardsInGroup(group).length;
  return `<a class="tile" href="${s}.html">${icon(glyph)}<h2>${esc(group)}</h2><p>${esc(text)}</p><p class="tile-meta">${n} card${n === 1 ? "" : "s"}</p></a>`;
}).join("\n")}
</div>`;
  write("foundations/index.html", page({ title: "Foundations", lede: "The visual and structural decisions every component inherits.", body: index, active: "foundations", root: "../" }));

  for (const [group, s, text] of FOUNDATIONS) {
    const list = cardsInGroup(group);
    const body = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Foundations", href: "foundations/index.html" }, { label: group }])}
<h1>${esc(group)}</h1>
<p class="lede">${esc(text)}</p>
${list.map((c) => cardBlock(c, "../")).join("\n")}
`;
    write(`foundations/${s}.html`, page({ title: group, lede: text, body, active: `foundations:${s}`, root: "../" }));
  }
}

/* --------------------------------------------------------- component pages */

function buildComponents() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Components" }])}
<h1>Components</h1>
<p class="lede">${components.length} components in seven families. Each ships a guide, a typed props contract, source, and a live card. Read the guide before you use one: it carries the rules the types cannot.</p>
${GROUP_ORDER.map((g) => {
  const list = byGroup(g);
  return `<section class="group">
  <h2 id="${attr(g)}">${esc(GROUP_LABEL[g])}</h2>
  <p class="group-note">${esc(GROUP_BLURB[g])}</p>
  <div class="tiles compact">
  ${list
    .map((c) => {
      /* The card is not a link any more: it holds one. A menu button cannot sit
         inside an anchor, so the heading's link is stretched over the card and
         the button is raised above it. */
      const files = [
        c.guideFile ? `data-md="../${attr(c.guideFile)}"` : "",
        c.types ? `data-types="../${attr(c.types)}"` : "",
        c.source ? `data-source="../${attr(c.source)}"` : "",
      ].filter(Boolean).join(" ");
      return (
        `<article class="tile tile-component">` +
        `<div class="tile-specimen" data-specimen="${attr(c.name)}" aria-hidden="true"></div>` +
        `<div class="tile-head">` +
        `<h3><a class="tile-link" href="${c.name}.html">${esc(c.name)}</a></h3>` +
        `<button type="button" class="tile-menu-btn" aria-haspopup="menu" aria-expanded="false"` +
        ` aria-label="Files for ${attr(c.name)}" data-component="${attr(c.name)}" ${files}>` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">` +
        `<path d="M5 12h.01"/><path d="M12 12h.01"/><path d="M19 12h.01"/></svg>` +
        `</button>` +
        `</div>` +
        `<p class="tile-desc">${inlineMd(c.summary)}</p></article>`
      );
    })
    .join("\n  ")}
  </div>
</section>`;
}).join("\n")}
`;
  /* The specimens run from the same bundle the preview cards use. One React
     root per card is heavier than a static list and lighter than 56 iframes,
     which is the only other way to show the real component. */
  const specimenScripts =
    `<script src="../system/components/lib/react.production.min.js" defer></script>\n` +
    `<script src="../system/components/lib/react-dom.production.min.js" defer></script>\n` +
    `<script src="../system/components/bundle.js" defer></script>\n` +
    `<script src="../assets/specimens.js" defer></script>\n` +
    `<script src="../assets/file-menu.js" defer></script>\n`;

  write(
    "components/index.html",
    page({
      title: "Components",
      lede: "Every Dovetail component, with guides, props and live cards.",
      body: index,
      active: "components",
      root: "../",
      scripts: specimenScripts,
    })
  );

  for (const c of components) {
    const detail = (GROUP_DETAIL[c.group] || []).map((id) => cards.get(id)).filter(Boolean);
    const guideHtml = c.guide ? markdown(c.guide.replace(/^#\s+.*\n/, "")) : "<p class='muted'>No guide file ships for this component.</p>";
    const body = `
${breadcrumb("../", [
  { label: "Dovetail", href: "index.html" },
  { label: "Components", href: "components/index.html" },
  { label: c.name },
])}
<h1>${esc(c.name)}</h1>
<p class="lede">${inlineMd(c.summary)}</p>
<p class="meta">
  <span class="pill">${esc(GROUP_LABEL[c.group])}</span>
  ${c.exportedFrom ? `<span class="pill">exported from ${esc(c.exportedFrom)}.jsx</span>` : ""}
  ${c.source ? `<a href="../${c.source}">${esc(c.sourceName)}.jsx</a>` : ""}
  ${c.types ? `<a href="../${c.types}">${esc(c.sourceName)}.d.ts</a>` : ""}
  ${c.guideFile ? `<a href="../${c.guideFile}">${esc(c.sourceName)}.md</a>` : ""}
</p>

${cardBlock(c.card, "../", { heading: "Live" })}
${c.playground ? cardBlock(c.playground, "../", { heading: "Playground" }) : ""}

<section class="prose">
  <h2 id="guidelines">Guidelines</h2>
  ${guideHtml}
</section>

${
  c.types
    ? `<section class="prose">
  <h2 id="props">Props</h2>
  <p class="muted">The typed contract, from <code>${esc(path.basename(c.types))}</code>.</p>
  ${codeBlock(c.types, "ts")}
</section>`
    : ""
}

${tokenUsageSection(c, "../")}

${
  c.source
    ? `<section class="prose">
  <h2 id="source">Source</h2>
  <p class="muted">React only, no dependencies, every value a token.</p>
  ${codeBlock(c.source, "jsx")}
</section>`
    : ""
}

${
  detail.length
    ? `<section class="prose">
  <h2 id="in-context">In context</h2>
  <p>${esc(c.name)} also appears on the ${GROUP_LABEL[c.group].toLowerCase()} reference cards, alongside the rest of its family.</p>
  <ul>${detail.map((d) => `<li><a href="../showcase/detail.html#${attr(slug(d.name || d.id))}">${esc(d.name || d.id)}</a></li>`).join("")}</ul>
</section>`
    : ""
}
`;
    write(`components/${c.name}.html`, page({ title: c.name, lede: c.summary.replace(/`/g, ""), body, active: `component:${c.name}`, root: "../" }));
  }
}

/* ----------------------------------------------------------- showcase pages */

function buildShowcase() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Showcase" }])}
<h1>Showcase</h1>
<p class="lede">The system assembled: family reference cards, driveable playgrounds, whole screens, and the tools that produce a theme.</p>
<div class="tiles">
${SHOWCASE.map(([group, s, text, glyph]) => {
  const n = cardsInGroup(group).length;
  return `<a class="tile" href="${s}.html">${icon(glyph)}<h2>${esc(group)}</h2><p>${esc(text)}</p><p class="tile-meta">${n} card${n === 1 ? "" : "s"}</p></a>`;
}).join("\n")}
</div>`;
  write("showcase/index.html", page({ title: "Showcase", lede: "Reference cards, playgrounds, UI kits and templates.", body: index, active: "showcase", root: "../" }));

  for (const [group, s, text] of SHOWCASE) {
    const list = cardsInGroup(group);
    const body = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Showcase", href: "showcase/index.html" }, { label: group }])}
<h1>${esc(group)}</h1>
<p class="lede">${esc(text)}</p>
${list.map((c) => cardBlock(c, "../")).join("\n")}
`;
    write(`showcase/${s}.html`, page({ title: group, lede: text, body, active: `showcase:${s}`, root: "../", wide: true }));
  }
}

/* -------------------------------------------------------------- guide pages */

function buildGuide() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Guide" }])}
<h1>Guide</h1>
<p class="lede">The prose that travels with the system: how to theme it, what it guarantees, and how to add to it.</p>
<div class="tiles">
${GUIDE_PAGES.map(([s, label, , text]) => `<a class="tile" href="${s}.html">${icon("book")}<h2>${esc(label)}</h2><p>${esc(text)}</p></a>`).join("\n")}
</div>`;
  write("guide/index.html", page({ title: "Guide", lede: "Theming, accessibility, contribution and the token pipeline.", body: index, active: "guide", root: "../" }));

  for (const [s, label, file, text] of GUIDE_PAGES) {
    const src = read(path.join(ROOT, file));
    const body = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Guide", href: "guide/index.html" }, { label }])}
<article class="prose doc">
${markdown(src)}
</article>
<p class="muted">Source: <a href="../${file}">${esc(file)}</a></p>
`;
    write(`guide/${s}.html`, page({ title: label, lede: text, body, active: `guide:${s}`, root: "../" }));
  }
}

/* -------------------------------------------------------------- token page */

function swatch(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!/^(#|oklch|rgb|hsl|color\()/i.test(v)) return "";
  return `<span class="swatch" style="background:${attr(v)}"></span>`;
}

function tokenTable(list, themes) {
  const heads = themes ? themes.map((t) => `<th>${esc(t.name)}</th>`).join("") : "<th>Value</th>";
  const rows = list
    .map((t) => {
      const cells = themes
        ? themes
            .map((th) => {
              const v = typeof t.value === "object" && t.value ? t.value[th.id] ?? "" : th.id === themes[0].id ? t.value : "";
              return `<td>${v ? `${swatch(v)}<code>${esc(v)}</code>` : '<span class="muted">—</span>'}</td>`;
            })
            .join("")
        : `<td><code>${esc(typeof t.value === "object" ? JSON.stringify(t.value) : t.value)}</code></td>`;
      return `<tr id="token-${attr(t.name)}"><th scope="row"><code>--${esc(t.name)}</code></th>${cells}<td class="usage">${esc(t.usage || "")}</td></tr>`;
    })
    .join("");
  return `<div class="table-wrap"><table class="tokens"><thead><tr><th>Token</th>${heads}<th>Usage</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* The export names its themes after the selectors they came from. */
const THEME_LABEL = {
  light: "Light",
  dark: "Dark",
  "dt-context-product": "Product context",
  "dt-context-marketing": "Marketing context",
};

function buildTokens() {
  const themes = ((tokens.color && tokens.color.themes) || [{ id: "light", name: "Light" }]).map((t) => ({
    ...t,
    name: THEME_LABEL[t.id] || t.name,
  }));
  const families = [
    ["color", "Colour", tokens.color && tokens.color.tokens, themes],
    ["spacing", "Spacing and dimension", tokens.spacing && tokens.spacing.tokens, null],
    ["radius", "Radius", tokens.radius && tokens.radius.tokens, null],
    ["motion", "Motion", tokens.motion && tokens.motion.tokens, null],
    ["lineHeight", "Line height", tokens.lineHeight && tokens.lineHeight.tokens, null],
    ["fontWeight", "Font weight", tokens.fontWeight && tokens.fontWeight.tokens, null],
    ["letterSpacing", "Letter spacing", tokens.letterSpacing && tokens.letterSpacing.tokens, null],
    ["other", "Elevation, z-order and the rest", tokens.other && tokens.other.tokens, null],
  ].filter(([, , list]) => Array.isArray(list) && list.length);

  const typeStyles = (tokens.type && tokens.type.groups) || [];
  const body = `
${breadcrumb("", [{ label: "Dovetail", href: "index.html" }, { label: "Tokens" }])}
<h1>Tokens</h1>
<p class="lede">Every token the system declares, with its value in each theme. Components read the semantic tier; only chart code reads a primitive, and it says why.</p>
<p class="meta">
  <a href="system/tokens/dovetail.tokens.json">dovetail.tokens.json (DTCG source)</a>
  <a href="system/tokens.json">tokens.json</a>
  <a href="system/tokens.css">tokens.css</a>
  <a href="system/styles.css">styles.css</a>
</p>

<nav class="toc" aria-label="Token families">
  <ul>${families.map(([id, label, list]) => `<li><a href="#${attr(id)}">${esc(label)} <span class="muted">${list.length}</span></a></li>`).join("")}
  <li><a href="#type">Type styles</a></li></ul>
</nav>

${families
  .map(
    ([id, label, list, th]) => `<section class="prose">
  <h2 id="${attr(id)}">${esc(label)}</h2>
  <p class="muted">${list.length} tokens.${th ? " A blank cell means the token keeps the value it has in the first theme." : ""}${
      id === "color" ? " These are the values the system ships with; the Configure panel previews an override without changing them." : ""
    }</p>
  ${tokenTable(list, th)}
</section>`
  )
  .join("\n")}

<section class="prose">
  <h2 id="type">Type styles</h2>
  <p class="muted">Families and the complete roles the system ships. A role travels as a set: family, size, line height, weight and tracking.</p>
  <div class="table-wrap"><table class="tokens"><thead><tr><th>Family</th><th>Stack</th></tr></thead><tbody>
  ${Object.entries((tokens.type && tokens.type.families) || {})
    .map(([k, v]) => `<tr><th scope="row"><code>--${esc(k)}</code></th><td><code>${esc(v)}</code></td></tr>`)
    .join("")}
  </tbody></table></div>
  ${typeStyles
    .map(
      (g) => `<h3>${esc(g.name)}</h3>
  <div class="table-wrap"><table class="tokens"><thead><tr><th>Style</th><th>Size</th><th>Line height</th><th>Weight</th><th>Tracking</th></tr></thead><tbody>
  ${(g.styles || [])
    .map(
      (st) =>
        `<tr><th scope="row"><code>${esc(st.name)}</code></th><td>${esc(st.fontSize ?? "—")}</td><td>${esc(
          st.lineHeight ?? "—"
        )}</td><td>${esc(st.fontWeight ?? "—")}</td><td>${esc(st.letterSpacing ?? "—")}</td></tr>`
    )
    .join("")}
  </tbody></table></div>`
    )
    .join("\n")}
</section>
`;
  write("tokens.html", page({ title: "Tokens", lede: "Every token in the system, with its value in each theme.", body, active: "tokens", root: "", wide: true }));
}

/* ----------------------------------------------------------- download page */

function buildDownloads() {
  const groups = [
    [
      "Stylesheets",
      [
        ["system/styles.css", "The single entry point. Import lines only."],
        ["system/tokens/base.css", "Minimal element defaults."],
        ["system/tokens.css", "Every token as flat custom properties."],
        ["system/components/bundle.css", "The global sheets joined into one file."],
      ],
    ],
    [
      "Tokens",
      [
        ["system/tokens/dovetail.tokens.json", "DTCG source of truth."],
        ["system/tokens.json", "The token list this site renders from."],
        ["system/templates/_support/style-dictionary.config.cjs", "Style Dictionary build config."],
      ],
    ],
    [
      "Themes",
      [
        ["system/tokens/themes/base-dark.css", "Dark mode. Re-points the same semantic names."],
        ["system/tokens/themes/theme-editorial.css", "Warm accent, serif headings, pill controls."],
        ["system/tokens/themes/theme-mono.css", "No brand hue, square corners, borders over shadows."],
        ["system/tokens/themes/density-compact.css", "Compact control heights and insets."],
        ["system/tokens/themes/theme-custom.css", "Where the configurator commits a theme."],
      ],
    ],
    [
      "Components",
      [
        ["system/components/bundle.js", "Every component, pre-built, assigned to one global."],
        ["system/components/lib/react.production.min.js", "React 18.3.1, as the previews load it."],
        ["system/components/lib/react-dom.production.min.js", "React DOM 18.3.1."],
      ],
    ],
    [
      "Templates and tools",
      [
        ["system/templates/settings-page/SettingsPage.dc.html", "A product settings screen, composed from Dovetail only."],
        ["system/theme-configurator.html", "Tune a theme live and export the CSS."],
        ["system/tearsheet.html", "Every component, token and style on one filterable page."],
      ],
    ],
  ];
  const body = `
${breadcrumb("", [{ label: "Dovetail", href: "index.html" }, { label: "Download" }])}
<h1>Take it with you</h1>
<p class="lede">The whole system is served from this site under <code>system/</code>, at the paths it was authored with. Link one stylesheet and you have the tokens; add a theme file and the system is yours.</p>

<pre class="code" data-lang="html"><code>${esc(`<link rel="stylesheet" href="system/styles.css">
<link rel="stylesheet" href="system/tokens/themes/theme-editorial.css">`)}</code></pre>
<p>Dark mode needs no second stylesheet. Put <code>class="dark"</code> on <code>&lt;html&gt;</code>.</p>

${groups
  .map(
    ([label, files]) => `<section class="prose">
  <h2 id="${attr(slug(label))}">${esc(label)}</h2>
  <div class="table-wrap"><table><thead><tr><th>File</th><th>What it is</th></tr></thead><tbody>
  ${files
    .filter(([f]) => exists(path.join(ROOT, f)))
    .map(
      ([f, what]) =>
        `<tr><th scope="row"><a href="${attr(f)}"><code>${esc(f.replace(/^system\//, ""))}</code></a></th><td>${esc(what)}</td></tr>`
    )
    .join("")}
  </tbody></table></div>
</section>`
  )
  .join("\n")}

<section class="prose">
  <h2 id="everything">Everything else</h2>
  <p>Component sources, typed contracts, per-component guides, the foundation spec cards and the UI kits all sit under <code>system/</code> in the repository, unchanged from how they were authored. The preview documents in <code>previews/</code> are the same cards with three script tags added so each one runs on its own.</p>
</section>
`;
  write("downloads.html", page({ title: "Download", lede: "Take the stylesheets, tokens and components into your project.", body, active: "downloads", root: "" }));
}

/* -------------------------------------------------------------------- run */

syncLegacyBundle();
buildConfigureData();
buildHome();
buildFoundations();
buildComponents();
buildShowcase();
buildGuide();
buildTokens();
buildDownloads();

console.log(`Built ${written.length} pages from ${components.length} components and ${cards.size} cards.`);
