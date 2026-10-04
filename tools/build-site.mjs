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
import crypto from "node:crypto";
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
/* A documentation page: page() needs its own path for the links that leave
   the site. */
/* Every local stylesheet and script a page loads carries a hash of its
   contents (?v=…), so a deploy can't pair new HTML with a browser's cached
   copy of old CSS or JS. The data files are written before any page, so the
   hash is of what ships. */
const stamps = new Map();
function stampAssets(rel, html) {
  const dir = path.dirname(path.join(ROOT, rel));
  return html.replace(/(<(?:link[^>]*?href|script[^>]*?src)=")([^"?#:]+\.(?:css|js))"/g, (m, lead, url) => {
    const file = path.resolve(dir, url);
    if (!stamps.has(file)) stamps.set(file, fs.existsSync(file) ? crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10) : null);
    const v = stamps.get(file);
    return v ? `${lead}${url}?v=${v}"` : m;
  });
}
/* A preview card is its own document with its own script tags, so the stamps
   above never reach inside it. A link to one carries a stamp of the card, v,
   and one of the component bundle, b, which the card hands on to the bundle
   (RUNTIME_BUNDLE), so every card on a page shares one download of it. A new
   component then can't meet a cached bundle from before it existed, which
   leaves its card waiting on a component that never comes. */
const hashOf = (...files) => {
  const h = crypto.createHash("sha1");
  for (const f of files) if (fs.existsSync(f)) h.update(fs.readFileSync(f));
  return h.digest("hex").slice(0, 10);
};
function stampPreviews(rel, html) {
  const dir = path.dirname(path.join(ROOT, rel));
  const bundle = path.join(ROOT, "system/components/bundle.js");
  return html.replace(/((?:src|href)=")((?:\.\.\/)*previews\/[^"?#:]+\.html)(?=[#"])/g, (m, lead, url) => {
    const file = path.resolve(dir, url);
    if (!fs.existsSync(file)) return m;
    if (!stamps.has(file)) stamps.set(file, hashOf(file));
    if (!stamps.has(bundle)) stamps.set(bundle, hashOf(bundle));
    return `${lead}${url}?v=${stamps.get(file)}&amp;b=${stamps.get(bundle)}`;
  });
}
const writePage = (rel, opts) => write(rel, stampPreviews(rel, stampAssets(rel, page({ ...opts, pageUrl: rel }))));

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
      /* Nested by indentation: a bullet indented past its parent opens a list
         inside that item, and an indented plain line continues the item. */
      const depth = (l) => l.match(/^\s*/)[0].length;
      const list = (at) => {
        const indent = depth(lines[at]);
        const tag = /^\s*\d+[.)]\s/.test(lines[at]) ? "ol" : "ul";
        const items = [];
        while (at < lines.length) {
          const l = lines[at];
          const d = depth(l);
          if (bullet.test(l) && d === indent) {
            items.push({ text: l.replace(bullet, ""), kids: "" });
            at++;
          } else if (bullet.test(l) && d > indent && items.length) {
            const [html, next] = list(at);
            items[items.length - 1].kids += html;
            at = next;
          } else if (!bullet.test(l) && /^\s+\S/.test(l) && d > indent && items.length) {
            items[items.length - 1].text += " " + l.trim();
            at++;
          } else break;
        }
        return [`<${tag}>${items.map((t) => `<li>${inline(t.text)}${t.kids}</li>`).join("")}</${tag}>`, at];
      };
      const [html, next] = list(i);
      out.push(html);
      i = next;
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

/* Moves every heading down a level, outside code fences. A component guide's
   own sections sit under the page's "Guidelines" heading, so its ## becomes
   an h3 and the outline (and "On this page") nests the way it reads. */
function shiftHeadings(src, by = 1) {
  let fenced = false;
  return src
    .split("\n")
    .map((line) => {
      if (/^```/.test(line)) fenced = !fenced;
      if (fenced || !/^#{1,5}\s/.test(line)) return line;
      return "#".repeat(by) + line;
    })
    .join("\n");
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
  copy: ['<rect x="8.5" y="8.5" width="12" height="12" rx="2"/>', '<path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'],
  link: ['<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/>', '<path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'],
  external: ['<path d="M13.5 3.5h7v7"/>', '<path d="M20.5 3.5 11 13"/>', '<path d="M18.5 14v4.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2H10"/>'],
  sparkle: ['<path d="M12 3.5c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/>', '<path d="M19 17.5v3"/>', '<path d="M17.5 19h3"/>'],
  more: ['<path d="M5 12h.01"/>', '<path d="M12 12h.01"/>', '<path d="M19 12h.01"/>'],
  check: ['<path d="m5 12.5 4.5 4.5L19 7.5"/>'],
  image: ['<rect x="3.5" y="3.5" width="17" height="17" rx="2"/>', '<circle cx="9" cy="9" r="1.5"/>', '<path d="m20.5 15-4.5-4.5-10 10"/>'],
  menu: ['<path d="M4 8.5h16"/>', '<path d="M4 15.5h16"/>'],
  x: ['<path d="M6 6l12 12"/>', '<path d="M18 6 6 18"/>'],
  home: ['<path d="M3.5 10.5 12 3.5l8.5 7"/>', '<path d="M5.5 9v11.5h13V9"/>', '<path d="M10 20.5v-6h4v6"/>'],
  search: ['<path d="M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"/>', '<path d="m20.5 20.5-5-5"/>'],
  arrowRight: ['<path d="M4.5 12h15"/>', '<path d="m13.5 6 6 6-6 6"/>'],
  shield: ['<path d="M12 21s7.5-3.5 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.5 12 21 12 21Z"/>', '<path d="m9 12 2 2 4-4"/>'],
  wrench: ['<path d="M20.5 4.5 17 8l-1-1 3.5-3.5a5.5 5.5 0 0 0-7 7l-8 8a2 2 0 0 0 2.8 2.8l8-8a5.5 5.5 0 0 0 7-7l-1.8 1.8"/>'],
};

function icon(name) {
  const paths = ICONS[name];
  if (!paths) return "";
  return `<svg class="tile-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.join("")}</svg>`;
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
const CONTEXT_LINKS =
  '<link rel="stylesheet" href="../system/tokens/contexts/context-product.css">' +
  '<link rel="stylesheet" href="../system/tokens/contexts/context-marketing.css">' +
  '<link rel="stylesheet" href="../system/tokens/contexts/context-social.css">' +
  '<link rel="stylesheet" href="../system/tokens/contexts/type-scale.css">';

/* The bundle is loaded with the stamp the site's link to this card carries
   (stampPreviews), written in as a parser-blocking script so it still runs
   before the card's own. Opened bare, the card loads it unstamped. */
const PLAIN_BUNDLE = '<script src="../system/components/bundle.js"></script>';
const RUNTIME_BUNDLE =
  "<script>(function(){var b=/[?&]b=(\\w+)/.exec(location.search);" +
  "document.write('<script src=\"../system/components/bundle.js'+(b?'?v='+b[1]:'')+'\"><\\/script>')})()</script>";

/* The previews were authored against a host that pre-loaded React and the
   component bundle. Standalone they have to load both themselves. */
function patchPreview(file) {
  const src = read(file);
  let out = src;

  /* Without this a phone lays a card out at 980px and shrinks it to fit, so
     none of its media queries ever run and it only looks responsive when a
     desktop window is dragged narrow. */
  if (!/<meta[^>]+name=["']viewport["']/i.test(out)) {
    out = out.replace(/<head>/i, '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">');
  }

  if (!out.includes(RUNTIME_MARKER)) {
    const inject = `<!-- ${RUNTIME_MARKER}: added by tools/build-site.mjs so this card runs on its own -->
<script src="../system/components/lib/react.production.min.js"></script>
<script src="../system/components/lib/react-dom.production.min.js"></script>
${RUNTIME_BUNDLE}
`;
    out = out.replace(/<head>/i, `<head>\n${inject}`);
  }
  out = out.replace(PLAIN_BUNDLE, RUNTIME_BUNDLE).replace(/<script>\(function\(\)\{[^\n]*?components\/bundle\.js[^\n]*?<\/script>/g, RUNTIME_BUNDLE);

  /* A card was written from its place in the project, so the few resources it
     loads by path need re-pointing at system/. Each rewrite stops matching once
     it has run, which is what keeps a rebuild a no-op. Paths quoted inside
     documentation and code samples are left alone: they tell the reader what to
     write in their own project, and there they are correct. */
  out = out.replace(/src="templates\/_support\//g, 'src="../system/templates/_support/');
  out = out.replace(/"\.\/templates\/settings-page\//g, '"../system/templates/settings-page/');

  /* Cards link ../system/styles.css near the top of the head. The contexts
     override :root with a class, which wins only on source order, so all three
     context files are linked last in the head, after everything else a card
     loads. Switching context then reaches inside a card rather than only
     around it. */
  if (!out.includes(CONTEXT_LINKS)) {
    out = out.replace(/<link rel="stylesheet" href="\.\.\/system\/tokens\/contexts\/[^"]+">/g, "");
    out = out.replace(/<\/head>/i, `${CONTEXT_LINKS}\n</head>`);
  }

  /* The same cards sync a data-theme attribute onto the html element against a
     hardcoded list of contexts. Adding one to the system means adding it here
     too, or the card ignores it. */
  out = out.replace(/\['dt-context-product','dt-context-marketing'\]/g, "['dt-context-product','dt-context-marketing','dt-context-social']");

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
    brandRamps: take("BRAND_RAMPS"),
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

const GROUP_ORDER = ["primitives", "typography", "actions", "forms", "display", "navigation", "feedback", "content", "commerce", "chat", "blocks"];
const FAMILIES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][GROUP_ORDER.length] || String(GROUP_ORDER.length);
const GROUP_LABEL = {
  primitives: "Primitives",
  typography: "Typography",
  actions: "Actions",
  forms: "Forms",
  display: "Display",
  navigation: "Navigation",
  feedback: "Feedback",
  content: "Content",
  commerce: "Commerce",
  chat: "Chat",
  blocks: "Blocks",
};
/* One sentence per family, so the heading says what the group is for rather
   than only naming it. What each family owns, and what it deliberately leaves
   to another. */
const GROUP_BLURB = {
  primitives: "Layout with no opinion about content. These own spacing, stacking and rhythm, and they draw almost nothing themselves.",
  typography: "Headings and running text, set from the type roles. Level and size are separate props, so a page's outline and its visual scale can each be right.",
  actions: "Everything a person can press. One visual hierarchy across all of them, so importance reads the same whether the target is a button or a link.",
  forms: "Inputs and the structure around them. Field owns the label, hint and error for every control, so validation looks and announces the same everywhere.",
  display: "Read-only presentation of data that already exists. They render what they are given and never fetch, sort or filter it.",
  navigation: "Moving between places, and showing where you are. Each one takes the current location as a prop rather than reading the URL, so they suit any router.",
  feedback: "Telling someone what happened, or asking before it does. Severity is a prop, and the overlays share one layer, focus trap and dismissal behaviour.",
  content: "Long-form and editorial shapes, including the pieces a CMS drives. Media reserves its space before it loads, so a page never jumps.",
  commerce: "Buying things: prices, products, carts, checkout and food ordering. Each renders what it is given and calls back on change, so the cart, the payment and the order stay in your app.",
  chat: "Conversations, with a person or an assistant. Messages, presence and status are props; sending, storing and streaming stay in your app.",
  blocks: "Page sections that stack into a landing page. Each is a Section with its layout decided and its content as props, so a page is a list of blocks.",
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
const EXPORTED_FROM = { ToastRegion: ["feedback", "Toast"], TabPanel: ["navigation", "Tabs"],
  MessageDivider: ["chat", "MessageList"] };

const GROUP_ALIAS = { "UI kits": "Templates" };

const cards = new Map();
for (const file of fs.readdirSync(PREVIEWS).filter((f) => f.endsWith(".html")).sort()) {
  const full = path.join(PREVIEWS, file);
  patchPreview(full);
  const name = file.replace(/\.html$/, "");
  const card = parseCard(read(full));
  /* The two kit cards were authored into a group of their own. They are whole
     screens assembled from the system, which is what a template is, so they
     join Templates. The name UI kits is being kept for what it usually means:
     a kit for a particular surface or vertical, a voice-only interface say,
     which is a different thing and does not exist yet. */
  if (card) cards.set(name, { ...card, group: GROUP_ALIAS[card.group] || card.group, id: name, href: `previews/${file}` });
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
  });
}
const byGroup = (g) => components.filter((c) => c.group === g);

/* Foundation and showcase cards, in the order they should be read. */
const FOUNDATIONS = [
  ["Foundations", "foundations", "The contract the rest of the system rests on.", "compass"],
  ["Color", "color", "Seven OKLCH ramps, six surface levels, and the pairing rule.", "droplet"],
  ["Type", "type", "A 1.200 scale from 16px, with line heights on the 4px grid.", "type"],
  ["Layout", "layout", "One 4px unit, read as three axes and four layers, tight to open.", "ruler"],
  ["Shape", "shape", "Radius named by what it wraps, and one focus ring.", "square"],
  ["Size", "size", "Control heights and icon sizes, all on the grid.", "scale"],
  ["Elevation", "elevation", "Six levels of z-order, not a menu of shadows.", "layers"],
  ["Motion", "motion", "Four roles. Exits are faster than entrances.", "zap"],
  ["Themes", "themes", "Brand and density skins, each a file of token overrides.", "blend"],
];
const SHOWCASE = [
  ["Components", "overviews", "Each component family at a glance.", "box"],
  ["Component detail", "detail", "Full reference cards: specimens, props and usage rules.", "list"],
  ["Templates", "templates", "Product screens, marketing pages and social posts, built only from Dovetail components.", "layout"],
  ["Tools", "tools", "The theme configurator and the media lab.", "wrench"],
];
const cardsInGroup = (group) => [...cards.values()].filter((c) => c.group === group);

/* Some foundation pages are two subjects in one list. Colour is the clear case:
   seven raw ramps and seven semantic roles, interleaved by whatever order the
   cards happened to sort in. Named here, the page reads as the tiers do. */
const CARD_SECTIONS = {
  Layout: [
    ["Scale and axes", "One base unit, and three axes that say which way a gap runs: inset, stack and inline.",
      ["SpaceScale", "SpaceAxes"]],
    ["Layers", "Four layers say how closely two things belong together, and text and modules add the gaps inside a block of text and the room a module takes. The layout's character moves them as one: tight and technical, balanced, or open with room to breathe. Stack and Inline take a layer and a spacing prop.",
      ["LayoutLayers", "LayoutModules", "SpaceInUse"]],
  ],
  Color: [
    ["Ramps", "The raw hues, eleven steps each. Nothing in a component names one.",
      ["ColorNeutral", "ColorPrimary", "ColorSecondary", "ColorRed", "ColorAmber", "ColorGreen", "ColorCyan", "ColorViolet"]],
    ["Roles", "What a component actually reads. Each one resolves to a step of a ramp above.",
      ["ColorSurfaces", "ColorText", "ColorBorders", "ColorPairs", "ColorActions", "ColorFeedback", "ColorDark"]],
    ["Brand and texture", "Full-bleed roles for a section, not a control: a solid or gradient fill, a muted tint, and a pattern built from two gradients rather than an image.",
      ["BrandFills"]],
  ],
};

const GUIDE_PAGES = [
  ["readme", "README", "system/README.md", "The system's own manifest and design guide."],
  ["tokens", "Token reference", "system/guidelines/tokens.md", "Every token, tier by tier."],
  ["theming", "Theming", "system/guidelines/theming.md", "From a brand palette to a working theme."],
  ["accessibility", "Accessibility", "system/guidelines/accessibility.md", "What the system guarantees, and what you owe."],
  ["headless-integration", "Headless integration", "system/guidelines/headless-integration.md", "React, Sanity, and other content sources."],
  ["contributing", "Contributing", "system/guidelines/contributing.md", "How to add a component or a token."],
  ["working-together", "Working together", "CONTRIBUTING.md", "Branches, pull requests, builds and checks for everyone working on Dovetail."],
  ["changelog", "Changelog", "CHANGELOG.md", "What changed in each release, newest first."],
  ["changelog-strategy", "Changelog strategy", "docs/changelog.md", "How changes are recorded, versioned and announced."],
  ["cloud", "Builder cloud", "docs/cloud.md", "Accounts, cloud projects and live editing for the Builder, on Supabase."],
  ["token-pipeline", "Token pipeline", "system/tools/README.md", "DTCG source of truth and the Style Dictionary build."],
  ["authoring-rules", "Authoring rules", "system/assets/notes/CLAUDE.from-standalone.md", "The always-on rules for building with Dovetail."],
  ["plan", "Build plan", "system/PLAN.md", "The four-phase plan, benchmarks and inventory."],
  ["provenance", "Provenance", "system/assets/notes/MIGRATION-REPORT.md", "Where these files came from, file by file."],
];

/* Guide pages that are built and linkable but kept out of the menu, the
   sidebar, the guide index and search for now: notes for the people working
   on Dovetail rather than for the people using it. */
const GUIDE_HIDDEN = new Set(["working-together", "changelog-strategy", "cloud", "authoring-rules", "plan", "provenance", "token-pipeline"]);
const GUIDE_SHOWN = GUIDE_PAGES.filter(([sl]) => !GUIDE_HIDDEN.has(sl));
const GUIDE_ICON = { readme: "book", tokens: "braces", theming: "blend", accessibility: "shield", "headless-integration": "link", contributing: "blocks", changelog: "list", "token-pipeline": "sliders" };

/* ------------------------------------------------------------------- layout */

function nav(root, active) {
  const item = (href, label, id, extra = "") =>
    `<li><a href="${root}${href}"${id === active ? ' aria-current="page"' : ""}${extra}>${esc(label)}</a></li>`;

  const section = (title, items) =>
    `<details class="nav-section" open><summary>${esc(title)}</summary><ul>${items.join("")}</ul></details>`;

  const componentItems = GROUP_ORDER.filter((g) => g !== "blocks").map((g) => {
    const items = byGroup(g).map((c) => item(`components/${c.name}.html`, c.name, `component:${c.name}`));
    return `<li class="nav-group">${esc(GROUP_LABEL[g])}</li>${items.join("")}`;
  });

  return `<nav class="sidebar" id="sidebar" aria-label="Documentation">
  <ul class="nav-top">
    ${item("index.html", "Overview", "home")}
    ${item("downloads.html", "Download", "downloads")}
    ${item("builder.html", "Builder", "builder")}
  </ul>
  ${section(
    "Foundations",
    [item("foundations/index.html", "All foundations", "foundations")].concat(
      FOUNDATIONS.map(([group, s]) => item(`foundations/${s}.html`, group, `foundations:${s}`)),
      [item("tokens.html", "Tokens", "tokens")]
    )
  )}
  ${section(
    "Components",
    [item("components/index.html", "All components", "components")].concat(componentItems)
  )}
  ${section(
    "Blocks",
    [item("components/index.html#blocks", "All blocks", "blocks")].concat(
      byGroup("blocks").map((c) => item(`components/${c.name}.html`, c.name, `component:${c.name}`))
    )
  )}
  ${section(
    "Templates",
    [item("showcase/templates.html", "All templates", "showcase:templates")].concat(
      TEMPLATE_KINDS.map(([kind, label]) => {
        const list = templateCards().filter((t) => t.kind === kind);
        return list.length ? `<li class="nav-group">${esc(label)}</li>` + list.map((t) => item(`showcase/templates.html#${t.anchor}`, t.title, `template:${t.id}`)).join("") : "";
      })
    )
  )}
  ${section(
    "Guide",
    GUIDE_SHOWN.map(([s, label]) => item(`guide/${s}.html`, label, `guide:${s}`))
  )}
</nav>`;
}

const ICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1d4ed8"/><path d="M9 22 16 9l7 13z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>`
)}`;

/* The published site, for links that leave it: "Open in Claude" hands Claude
   an absolute URL to read. The page script swaps in the address the page was
   actually served from, so a fork or a local server points at itself. */
const SITE_URL = "https://graham-goebel.github.io/Dovetail/";

/* "On this page": the page's own section headings, in document order. A card
   block carries its id on the section and a bare heading inside, so it is
   matched as a unit; every other entry is an h2 or h3 with an id. Headings
   inside a card's iframe never reach here, because they are not in the page. */
function tocFrom(body) {
  const entries = [];
  const re = /<section class="card-block" id="([^"]+)">\s*<div class="card-head">\s*<h([23])>([\s\S]*?)<\/h\2>|<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\4>/g;
  for (const m of body.matchAll(re)) {
    const [id, level, html] = m[1] ? [m[1], m[2], m[3]] : [m[5], m[4], m[6]];
    const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (id && text) entries.push({ id, level: Number(level), text });
  }
  /* An h3 is shown nested under the h2 before it; one with no h2 before it is
     shown at the top level rather than lost. */
  let seenH2 = false;
  return entries.map((e) => {
    if (e.level === 2) seenH2 = true;
    return { ...e, nested: e.level === 3 && seenH2 };
  });
}

function tocAside(entries) {
  return `<aside class="page-toc" aria-labelledby="page-toc-title">
  <p class="page-toc-title" id="page-toc-title">On this page</p>
  <ol>
    ${entries
      .map((e) => `<li${e.nested ? ' class="nested"' : ""}><a href="#${attr(e.id)}">${inlineTocText(e.text)}</a></li>`)
      .join("\n    ")}
  </ol>
</aside>`;
}

/* Heading text arrives escaped already; this only keeps it that way. */
function inlineTocText(text) {
  return text.replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, "&amp;");
}

/* The prompt behind every "Open in Claude" link. It sends Claude to the
   docs map first (llms.txt, raw Markdown links for everything), then the page
   the reader was on, then the authoring rules, and gives it the rules that
   most often go wrong in generated code. It ends on "My task:" so the reader
   only has to type what they want. assets/site.js builds the same prompt for
   a copy of the site served from anywhere else; keep the two in step. */
function claudePrompt(site, subject, title) {
  return [
    `I'm building with Dovetail, a white-label React design system: primitive tokens, semantic roles and components, rebranded by a theme file of token overrides.`,
    ``,
    `Read these first, in order:`,
    `1. ${site}llms.txt: the map of the docs, with raw Markdown links to every guide, token file and component (its .md guide, .d.ts props and .jsx source).`,
    `2. ${subject}: the "${title}" page I'm looking at.`,
    `3. ${site}system/assets/notes/CLAUDE.from-standalone.md: the authoring rules. Follow them.`,
    ``,
    `When you write code:`,
    `- Use Dovetail's components and --dt-* tokens. No literal colours, sizes, radii, shadows or durations.`,
    `- Product code reads semantic (--dt-surface-*, --dt-text-*) or component tokens, never primitives (--dt-color-*).`,
    `- Check every prop against the component's .d.ts, and follow the rules in its .md.`,
    `- Rebrand by overriding tokens in a theme file, not by editing components.`,
    `- Make it work at 390px, in dark mode (.dark) and with reduced motion.`,
    `- If the docs don't cover something, say so rather than inventing an API or a token.`,
    ``,
    `My task: `,
  ].join("\n");
}

/* llms.txt: the docs map an agent reads first (https://llmstxt.org). Every
   link is raw Markdown or JSON, so an agent reads the source, not a page. */
function buildLlmsTxt() {
  const link = (label, rel, note) => `- [${label}](${SITE_URL}${rel})${note ? `: ${note}` : ""}`;
  const lines = [
    `# Dovetail`,
    ``,
    `> A white-label design system: a strict three-tier token contract (primitive, semantic, component), a 4px grid, and ${components.length} React components that never name a colour. Brand arrives last, as a theme file of token overrides.`,
    ``,
    `Link \`system/styles.css\` for every token and base style; put \`class="dark"\` on an element to scope dark mode to it. Components are React (inline styles read from tokens) in \`system/components/<family>/\`, each with a \`.md\` guide, a \`.d.ts\` props contract and the \`.jsx\` source. Read a component's guide before using it: it holds the rules the types cannot.`,
    ``,
    `## Start here`,
    ``,
    link("Authoring rules", "system/assets/notes/CLAUDE.from-standalone.md", "the always-on rules for building with Dovetail"),
    link("README", "system/README.md", "the system's manifest and design guide"),
    link("Token reference", "system/guidelines/tokens.md", "every token, tier by tier"),
    link("Theming", "system/guidelines/theming.md", "from a brand palette to a working theme file"),
    link("Accessibility", "system/guidelines/accessibility.md", "what the system guarantees and what you owe"),
    link("Headless integration", "system/guidelines/headless-integration.md", "React, Sanity and other content sources"),
    ``,
    `## Tokens`,
    ``,
    link("tokens.json", "system/tokens.json", "every token with its light and dark value"),
    link("dovetail.tokens.json", "system/tokens/dovetail.tokens.json", "the DTCG source of truth"),
    link("styles.css", "system/styles.css", "the one stylesheet to link"),
    ``,
  ];
  for (const g of GROUP_ORDER) {
    const list = byGroup(g);
    if (!list.length) continue;
    lines.push(`## Components: ${GROUP_LABEL[g]}`, ``, GROUP_BLURB[g] || "", ``);
    for (const c of list) {
      const summary = String(c.summary || "").replace(/\s+/g, " ").trim();
      const files = [c.types && `[props](${SITE_URL}${c.types})`, c.source && `[source](${SITE_URL}${c.source})`].filter(Boolean).join(", ");
      lines.push(`- [${c.name}](${SITE_URL}${c.guideFile || `components/${c.name}.md`})${summary ? `: ${summary}` : ""}${files ? ` (${files})` : ""}`);
    }
    lines.push(``);
  }
  lines.push(
    `## Builder`,
    ``,
    link("Builder layouts", "assets/builder-layouts.md", "the JSON a layout is written in, every component, prop and token the builder takes, and how to open one on its canvas as a link"),
    ``,
    `## Optional`,
    ``,
    link("Contributing a component", "system/guidelines/contributing.md"),
    link("Changelog", "CHANGELOG.md", "what changed in each release"),
    link("Token pipeline", "system/tools/README.md", "DTCG source and the Style Dictionary build"),
    ``
  );
  write("llms.txt", lines.join("\n"));
}

/* The page menu: copy or take the page as Markdown, where the page has a
   Markdown version, and hand it to Claude. The menu is plain markup that works
   as links without script; assets/site.js adds copying and keyboard handling. */
function pageActions({ title, root, md, mdName, pageUrl, sources = [], copies = [] }) {
  const mdUrl = md ? new URL(md, SITE_URL + pageUrl).href : null;
  const subject = mdUrl || SITE_URL + pageUrl;
  const claude = `https://claude.ai/new?q=${encodeURIComponent(claudePrompt(SITE_URL, subject, title))}`;
  const item = (glyph, label, attrs) => `<li><${attrs.href ? "a" : "button type=\"button\""} class="page-menu-item" ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${attr(v)}"`)
    .join(" ")}>${icon(glyph)}<span>${esc(label)}</span></${attrs.href ? "a" : "button"}></li>`;
  const items = [
    md && item("copy", "Copy page as Markdown", { "data-page-action": "copy-md", "data-md": md }),
    md && item("download", "Download Markdown", { href: md, download: mdName }),
    md && item("file", "View as Markdown", { href: md, target: "_blank", rel: "noopener" }),
    /* Plain text to copy, such as a component's import line. */
    ...copies.map(({ label, text, done }) => item("copy", label, { "data-page-action": "copy-text", "data-text": text, "data-done": done })),
    /* A component's source and its typed props, to copy or to read. */
    ...sources.flatMap(({ href, name, kind }) => [
      item("copy", `Copy ${name}`, { "data-page-action": "copy-md", "data-md": href, "data-done": `${kind} copied` }),
      item("braces", `View ${name}`, { href, target: "_blank", rel: "noopener" }),
    ]),
    item("sparkle", "Open in Claude", { href: claude, target: "_blank", rel: "noopener", "data-page-action": "claude", "data-title": title, ...(md ? { "data-md": md } : {}) }),
    item("link", "Copy link", { "data-page-action": "copy-link" }),
  ].filter(Boolean);
  const button = `<button type="button" class="page-actions-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="page-sheet" aria-label="Page actions">${icon("more").replace('class="tile-icon"', 'class="ic"')}</button>`;
  /* The actions open in a sheet (a bottom sheet on a phone, a small dialog
     on a wide screen) rather than a dropdown; assets/site.js drives it. */
  const sheet = `<div class="asheet-bg" id="page-sheet" hidden>
  <div class="asheet" role="dialog" aria-modal="true" aria-labelledby="page-sheet-title">
    <div class="asheet-head">
      <div class="asheet-titles"><h2 class="asheet-title" id="page-sheet-title">${esc(title)}</h2></div>
      <button type="button" class="asheet-x" data-sheet-close aria-label="Close">${icon("x").replace('class="tile-icon"', 'class="ic"')}</button>
    </div>
    <ul class="page-menu" id="page-menu">
      ${items.join("\n      ")}
    </ul>
    <p class="page-actions-status" role="status" aria-live="polite"></p>
  </div>
</div>`;
  return { button, sheet };
}

/* ------------------------------------------------------------ phone chrome */

/* On a phone the site takes the portfolio's app layout: a large page title,
   with no eyebrow over it, that shrinks into a compact bar on scroll, and the
   page actions beside it. None of it shows on a wide screen, where the header
   and sidebar already do these jobs. */

/* The top-level section a page belongs to. Blocks and templates are their
   own sections even though their pages live under components/ and
   showcase/; tokens belong to foundations. */
function sectionOf(active) {
  const a = String(active || "home");
  if (a.startsWith("component:")) {
    const c = components.find((x) => `component:${x.name}` === a);
    return c && c.group === "blocks" ? "blocks" : "components";
  }
  if (a === "showcase:templates") return "templates";
  if (a === "tokens") return "foundations";
  return a.split(":")[0];
}

/* The template cards, as the templates page titles and anchors them. */
function templateCards() {
  return cardsInGroup("Templates").map((c) => {
    const title = CARD_TITLE[c.id] || c.name || c.id;
    return { id: c.id, title, anchor: slug(title), kind: TEMPLATE_KIND[c.id] || "product" };
  });
}

function phoneChrome(root, active, title, actionsButton = "") {
  const sec = sectionOf(active);
  const pageTitle = sec === "home" ? "Dovetail" : title;
  return `<header class="app-head" id="app-head">
  <div class="h-txt"><p class="h-title" aria-hidden="true">${esc(pageTitle)}</p></div>
  ${actionsButton ? `<div class="head-r">${actionsButton}</div>` : ""}
</header>`;
}

/* The folio's floating pill: the menu button the menu sheet grows out of.
   assets/menu.js drives it and moves the Configure button in beside it on a
   phone. Search lives in the menu sheet's footer. */
function fab() {
  const g = (name) => icon(name).replace('class="tile-icon"', 'class="ic"');
  return `<div class="fab" id="fab">
  <button type="button" class="fab-btn fab-menu" data-fab-menu aria-haspopup="dialog" aria-label="Menu">${g("menu")}</button>
</div>`;
}

function page({ title, lede, body, active, root, wide = false, home = false, app = false, scripts = "", graph = false, md = null, mdName = null, pageUrl = "", sources = [], copies = [] }) {
  const heading = title === "Dovetail" ? "Dovetail" : `${title} · Dovetail`;
  const toc = tocFrom(body);
  const hasToc = !home && toc.length >= 3;
  const actions = pageActions({ title, root, md, mdName: mdName || (md ? md.split("/").pop() : null), pageUrl, sources, copies });
  return `<!doctype html>
<html lang="en"${app ? " data-theme-fixed" : ""}>
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
     theme on its way to the chosen one. assets/theme.js owns everything after.
     An app page (data-theme-fixed) keeps its own chrome and takes only dark mode;
     the theme reaches its frames instead. */
  try {
    var r = document.documentElement;
    var fixed = r.hasAttribute("data-theme-fixed");
    var cfg = JSON.parse(localStorage.getItem("dovetail-theme-config") || "null");
    var ctx = fixed ? "" : localStorage.getItem("dovetail-docs-context") || "";
    if (cfg && cfg.vars && !fixed) for (var k in cfg.vars) r.style.setProperty(k, cfg.vars[k]);
    if (cfg && cfg.dark) r.classList.add("dark");
    if (ctx) r.classList.add(ctx);
    r.setAttribute("data-theme", cfg && cfg.dark ? "dark" : ctx || "light");
  } catch (e) {}
</script>
</head>
<body${app ? ' class="page-app"' : ""}>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="wordmark" href="${root}index.html">
    <img class="wordmark-mark" alt="" hidden>
    <img class="wordmark-logo" alt="" hidden>
    <span class="wordmark-text">Dovetail</span>
  </a>
  <span class="wordmark-note">White-label design system</span>
  ${app ? '<div class="header-controls header-app" id="app-toolbar"></div>' : `<div class="header-controls">
    <button type="button" class="search-btn" data-open-search aria-label="Search components and pages">${icon("search").replace('class="tile-icon"', 'class="ic"')}<span>Search</span><kbd>/</kbd></button>
    ${actions.button}
  </div>`}
</header>
${phoneChrome(root, active, title, app ? "" : actions.button)}
<div class="layout">
${nav(root, active)}
<main id="main" class="${["main", wide ? "wide" : "", home ? "home" : "", app ? "app" : "", hasToc ? "has-toc" : ""].filter(Boolean).join(" ")}">
<div class="doc">
${body}
</div>
${hasToc ? tocAside(toc) : ""}
</main>
</div>
${graph ? GRAPH_SPRITE : ""}
<footer class="site-footer">
  <code class="colophon"><span class="colophon-mark" aria-hidden="true">/*</span>form follows function<span class="colophon-mark" aria-hidden="true">*/</span></code>
</footer>
${fab()}
${app ? "" : actions.sheet}
${scripts}<script src="${root}assets/configure-data.js" defer></script>
<script src="${root}assets/search-data.js" defer></script>
<script src="${root}assets/search.js" defer></script>
<script src="${root}assets/menu.js" defer></script>
<script src="${root}assets/theme.js" defer></script>
<script src="${root}assets/site.js" defer></script>
${graph ? `<script src="${root}assets/graph.js" defer></script>` : ""}
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

/* ------------------------------------------------------------ the graph */

/* One symbol per page rather than one SVG per row: the token tables carry
   hundreds of these buttons and an inlined glyph in each would weigh more than
   the graph data itself. */
const GRAPH_SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false"><symbol id="i-graph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.2 10.9 16.8 7.1M7.2 13.1l9.6 3.8"/></symbol></svg>`;

function graphButton(id, what) {
  return (
    `<button type="button" class="graph-btn" data-graph="${attr(id)}"` +
    ` title="Show what ${attr(what)} connects to" aria-label="Graph for ${attr(what)}">` +
    `<svg class="icon" aria-hidden="true"><use href="#i-graph"/></svg></button>`
  );
}

/* The tier rule is a claim about direction, and a claim is worth being able to
   check. This writes the reference graph the rule describes: every token, what
   it resolves through, and which components end up consuming it. The pages
   load it only when someone opens the visualiser, because it is the largest
   thing the site generates and most visits never ask for it. */
function buildGraphData() {
  const nodes = {};
  const consumes = {};

  for (const [name, def] of tokenDefs) {
    nodes[name] = { kind: "token", tier: def.tier, value: def.value };
    const refs = [];
    for (const m of def.value.matchAll(/var\((--dt-[a-z0-9-]+)/g)) {
      if (refs.indexOf(m[1]) === -1) refs.push(m[1]);
    }
    if (refs.length) consumes[name] = refs;
  }

  for (const c of components) {
    if (!c.source) continue;
    const used = tokensUsedBy(c.source);
    const id = "component:" + c.name;
    nodes[id] = { kind: "component", tier: "consumer", group: c.group, href: `components/${c.name}.html` };
    /* A token the source names but no tier declares still belongs on the graph:
       a dead end is the thing worth seeing. */
    for (const u of used) {
      if (!nodes[u.name]) nodes[u.name] = { kind: "token", tier: "undeclared", value: null };
    }
    if (used.length) consumes[id] = used.map((u) => u.name);
  }

  write(
    "assets/graph-data.js",
    "/* Generated by tools/build-site.mjs from system/tokens/ and the component sources.\n" +
      "   Edit the system, not this file. */\n" +
      "window.DovetailGraph = " +
      JSON.stringify({ nodes, consumes }) +
      ";\n"
  );
}

/* Where the page-level button starts you: the token with the most direct
   consumers, because an empty graph is a poor first impression. */
function busiestToken() {
  const counts = new Map();
  for (const [, def] of tokenDefs) {
    for (const m of def.value.matchAll(/var\((--dt-[a-z0-9-]+)/g)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  let best = "--dt-color-primary-600";
  let most = -1;
  for (const [name, n] of counts) if (n > most) ((most = n), (best = name));
  return best;
}

const TIER_NOTE = {
  component: "Its own tier. Override one of these and only this component moves.",
  semantic: "Shared roles. Override one and everything using that role moves with it.",
  primitive: "Raw values. A component reading one directly is a deliberate exception.",
  undefined: "Referenced by the source but declared by no tier, so it resolves to nothing.",
};

/* Every public component is a named export of the package root, including
   the two that live in a sibling's file, so one import line fits them all. */
const PACKAGE = "@dovetail-ds/react";
const importLine = (c) => `import { ${c.name} } from "${PACKAGE}";`;

/* How to get this component into an app: the install, its import, and the
   one-time stylesheet setup it depends on. */
function installSection(c) {
  return `<section class="prose">
  <h2 id="install">Install and import</h2>
  <p>${esc(c.name)} is in <a href="https://www.npmjs.com/package/${PACKAGE}"><code>${PACKAGE}</code></a>. Install it with React, if you haven't:</p>
</section>
<pre class="code" data-lang="sh"><code>npm install ${PACKAGE} react react-dom</code></pre>
<pre class="code" data-lang="jsx"><code>${esc(importLine(c))}</code></pre>
<p class="muted">Import <code>${PACKAGE}/styles.css</code> once at your app's root, then your theme after it. <a href="../downloads.html#npm">Setup</a> covers the stylesheets, fonts and dark mode.</p>`;
}

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
      return `<tr id="uses-${attr(bare)}"><th scope="row"><span class="token-cell">${label}${graphButton(u.name, u.name)}</span></th><td>${esc(u.tier === "undefined" ? "none" : u.tier)}</td><td>${value}</td></tr>`;
    })
    .join("");
  const counts = tiers.map((t) => `${used.filter((u) => u.tier === t).length} ${t === "undefined" ? "undeclared" : t}`);
  return `<section class="prose">
  <h2 id="tokens-used">Tokens it reads</h2>
  <p class="muted">Every custom property <code>${esc(path.basename(c.source))}</code> resolves, read from the source: ${esc(counts.join(", "))}. Component tier first, because that is the one to reach for.</p>
  <p class="meta"><button type="button" class="btn-graph" data-graph="component:${attr(c.name)}">Open the graph</button></p>
  <ul class="tier-key">${tiers.map((t) => `<li><strong>${esc(t === "undefined" ? "none" : t)}</strong> ${esc(TIER_NOTE[t])}</li>`).join("")}</ul>
  <div class="table-wrap"><table class="tokens"><thead><tr><th>Token</th><th>Tier</th><th>Declared as</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

/* A card's file name is its identifier, and a few of them are not sentences a
   reader wants as a heading. The card keeps its name; the heading gets one. */
const CARD_TITLE = {
  TierContract: "The three tiers",
  DashboardKit: "Dashboard screen",
  MarketingKit: "Marketing page",
  BlocksKit: "Landing page from blocks",
  SettingsPageTemplate: "Settings page",
  SocialKit: "Social templates",
  StoreKit: "Store",
  FoodKit: "Food ordering",
  ChatKit: "Chat",
};

/* Most cards open their subtitle with the name a reader wants: ColorCyan is
   subtitled "Cyan ramp — Info". That label is a better heading than the file
   name, so it is promoted and the rest stays as the subtitle. Component cards
   have no such label and keep their component name, which is what you want
   there anyway. */
function cardLabel(card) {
  const cut = String(card.subtitle || "").indexOf(" \u2014 ");
  if (cut < 1) return null;
  const label = card.subtitle.slice(0, cut).trim();
  /* A label as long as a sentence is not a label. */
  if (!label || label.length > 40) return null;
  return { label, rest: card.subtitle.slice(cut + 3).trim() };
}

function cardBlock(card, root, { heading = null, level = 2 } = {}) {
  if (!card) return "";
  const split = cardLabel(card);
  const title = heading || CARD_TITLE[card.id] || card.name || (split && split.label) || card.id;
  /* The reference cards subtitle themselves "Actions — detail — ...", and on
     the page that says Component detail at the top, the middle word is noise. */
  /* Whatever the heading ends up being, the subtitle should not repeat it. The
     one exception is a heading passed in by the caller, where the card's own
     label is still the useful sentence. */
  const subtitle = split && !heading ? split.rest.replace(/^detail \u2014 /, "") : card.subtitle;
  const height = Math.min(Number(card.height) || 600, 1100);
  const id = slug(title);
  return `<section class="card-block" id="${attr(id)}">
  <div class="card-head">
    <h${level}>${esc(title)}</h${level}>
    <a class="card-open" href="${root}${card.href}" target="_blank" rel="noopener">Open full card</a>
  </div>
  ${subtitle ? `<p class="card-sub">${esc(subtitle)}</p>` : ""}
  <div class="frame" style="height:${height}px">
    <iframe src="${root}${card.href}" title="${attr(title + " preview")}" loading="lazy"></iframe>
  </div>
</section>`;
}

/* A whole source file, marked so the site knows it's a listing, not an example. */
function codeBlock(relPath, lang) {
  const body = read(path.join(ROOT, relPath));
  return `<pre class="code" data-lang="${attr(lang)}" data-source="${attr(relPath)}"><code>${esc(body.trimEnd())}</code></pre>`;
}

function breadcrumb(root, trail) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail
    .map((t) =>
      t.href ? `<li><a href="${root}${t.href}">${esc(t.label)}</a></li>` : `<li aria-current="page">${esc(t.label)}</li>`
    )
    .join("")}</ol></nav>`;
}

/* The phone menu's subcopy: a few words under each row, enough to tell two
   neighbours apart. The pages keep their full sentences. Anything missing here
   falls back to the first clause of its own summary. */
const NAV_BLURB = {
  Foundations: "The token contract", Color: "Ramps and roles", Type: "Scale and roles", Layout: "Axes, layers, density",
  Shape: "Radius and focus", Size: "Controls and icons", Elevation: "Layers and shadow", Motion: "Duration and easing",
  Themes: "Brand and density", Tokens: "Every value, every theme",
  Divider: "A rule between groups", Grid: "Equal columns", Inline: "A row that wraps", Spacer: "Push siblings apart",
  Stack: "A vertical column", VisuallyHidden: "For screen readers only", Section: "A page band",
  Heading: "Level and size apart", Text: "Body, lead, eyebrow",
  Button: "The main action", ButtonGroup: "Related buttons", IconButton: "An icon-only action", Link: "Goes somewhere",
  Checkbox: "Yes or no", CheckboxGroup: "Several of many", Field: "Label, hint, error", Input: "One line of text",
  Radio: "One of a few", RadioGroup: "One of a few, grouped", Select: "Pick from a list", Slider: "A value on a range",
  Switch: "On or off, instantly", Textarea: "Several lines of text", Combobox: "Type to filter a list",
  Avatar: "A person at a glance", AvatarGroup: "Who is involved", Badge: "A status label", Card: "A content container",
  Code: "Literal text", EmptyState: "Nothing here yet", List: "Rows of records", Skeleton: "While it loads",
  Stat: "One key number", Table: "Compare across rows", Tag: "A removable chip",
  Breadcrumbs: "Where you are", Navbar: "Top navigation", Pagination: "Page through results", Sidebar: "Side navigation",
  Stepper: "Steps in a task", Tabs: "Sibling views", TabPanel: "A tab's content", AppShell: "A phone app frame",
  BottomNav: "Phone tab bar",
  Alert: "An inline message", Banner: "A page-wide message", Dialog: "Stop and decide", Drawer: "A side panel",
  Sheet: "A bottom panel", Popover: "Anchored detail", Progress: "How much is done", Spinner: "Please wait",
  Toast: "It worked", ToastRegion: "Where toasts appear", Tooltip: "Names a control", Thinking: "An assistant at work",
  Accordion: "Fold content away", AspectRatio: "Hold a shape", Cover: "Text over an image", Callout: "An aside",
  Figure: "Media and caption", Image: "A framed image", Video: "A framed video", Media: "Media beside copy",
  Prose: "Long-form text", Quote: "A pull quote", BlockRenderer: "Blocks from content", SocialPost: "Stories and grid posts",
  HeroBlock: "The top of a page", FeatureGridBlock: "Features in a grid", SplitBlock: "Copy beside media",
  StatsBlock: "Numbers that matter", TestimonialBlock: "What customers say", FaqBlock: "Common questions",
  CtaBlock: "The closing ask", BlockHeader: "Every block's heading", ChatBlock: "A whole conversation",
  Price: "Money, formatted", Rating: "Stars, shown or chosen", QuantityStepper: "How many",
  ProductCard: "A product in a grid", ProductGallery: "Product photos", VariantPicker: "Size, colour, material",
  CartLine: "A line in the cart", OrderSummary: "What it all costs", PromoCode: "Apply a code",
  AddressFields: "Where it's going", PaymentFields: "Card details", OrderStatus: "Where the order is",
  StoreHeader: "The top of a store", FulfilmentToggle: "Delivery or pickup", MenuSection: "A course of the menu",
  MenuItem: "One dish", ModifierGroup: "Sizes and extras",
  ChatHeader: "Who you're talking to", MessageList: "The conversation", MessageDivider: "Today, and events",
  MessageBubble: "One message", Composer: "Write and send", TypingIndicator: "They're typing", QuickReplies: "Suggested answers",
  README: "Start here", "Token reference": "Tier by tier", Theming: "Make it your brand", Accessibility: "What's guaranteed",
  "Headless integration": "Content sources", Contributing: "Add a component", "Working together": "Branches and reviews",
  Changelog: "What's new", "Changelog strategy": "How changes ship", "Token pipeline": "DTCG to CSS",
  "Authoring rules": "Always-on rules", "Build plan": "Phases and inventory", Provenance: "Where files came from",
};
const blurb = (name, text) =>
  NAV_BLURB[name] || String(text || "").replace(/[`*_]/g, "").split(/[.:;,(]| \u2014 /)[0].trim();

/* Templates sort into three kinds. The menu opens on the kinds and each kind
   lists its templates; the templates page is laid out the same way. */
const TEMPLATE_KINDS = [
  ["product", "Product", "App screens", "monitor"],
  ["marketing", "Marketing", "Pages and landing pages", "layout"],
  ["social", "Social", "Stories and posts", "image"],
];
const TEMPLATE_KIND = { DashboardKit: "product", SettingsPageTemplate: "product", MarketingKit: "marketing", BlocksKit: "marketing", SocialKit: "social", StoreKit: "product", FoodKit: "product", ChatKit: "product" };
const TEMPLATE_BLURB = { DashboardKit: "Metrics and tables", SettingsPageTemplate: "Forms and switches", MarketingKit: "A full marketing page", BlocksKit: "Stacked blocks", SocialKit: "Ten layouts", StoreKit: "Browse to checkout", FoodKit: "Menu to delivery", ChatKit: "Support and assistant" };

/* --------------------------------------------------------------- home page */

/* The search index: every component, foundation, showcase and guide page,
   as root-relative links. Written before any page, so pages stamp its hash. */
function buildSearchData() {
  const items = [
    ...components.map((c) => ({ t: c.name, s: `Component · ${GROUP_LABEL[c.group] || c.group}`, d: String(c.summary || "").replace(/[`*_]/g, ""), u: `components/${c.name}.html`, k: "component" })),
    ...FOUNDATIONS.map(([g, sl, text]) => ({ t: g, s: "Foundation", d: text, u: `foundations/${sl}.html`, k: "page" })),
    ...SHOWCASE.filter(([, sl]) => sl === "templates").map(([g, sl, text]) => ({ t: g, s: "Templates", d: text, u: `showcase/${sl}.html`, k: "page" })),
    ...GUIDE_SHOWN.map(([sl, label, , text]) => ({ t: label, s: "Guide", d: text, u: `guide/${sl}.html`, k: "page" })),
    { t: "Tokens", s: "Reference", d: "Every token in the system, with its value in each theme.", u: "tokens.html", k: "page" },
    { t: "Download", s: "Reference", d: "Take the stylesheets, tokens and components into your project.", u: "downloads.html", k: "page" },
    { t: "Builder", s: "Tool", d: "Drag components and blocks onto a canvas and arrange new screens, styled only with tokens.", u: "builder.html", k: "page" },
  ];
  /* The phone menu's tree: sections as big links, their pages (and, for
     components, their families) as the layers under them. */
  /* Home is the sheet's own button, top right, so it isn't a section here;
     Showcase is hidden for now. Foundations carry their icons (i). */
  const row = (t, d, u, i) => ({ t, d: blurb(t, d), u, ...(i ? { i: icon(i).replace('class="tile-icon"', 'class="ic"') } : {}) });
  const templates = templateCards();
  const navTree = [
    { id: "foundations", t: "Foundations", items: FOUNDATIONS.map(([g, sl, text, i]) => row(g, text, `foundations/${sl}.html`, i)).concat([row("Tokens", "", "tokens.html", "braces")]) },
    { id: "components", t: "Components", groups: GROUP_ORDER.filter((g) => g !== "blocks").map((g) => ({ id: g, t: GROUP_LABEL[g], items: byGroup(g).map((c) => row(c.name, c.summary, `components/${c.name}.html`)) })) },
    { id: "blocks", t: "Blocks", items: byGroup("blocks").map((c) => row(c.name, c.summary, `components/${c.name}.html`)) },
    { id: "templates", t: "Templates", drill: true, groups: TEMPLATE_KINDS.map(([id, t, d, i]) => ({
      id, t, d, u: `showcase/templates.html#${id}`, i: icon(i).replace('class="tile-icon"', 'class="ic"'),
      items: templates.filter((x) => x.kind === id).map((x) => row(x.title, TEMPLATE_BLURB[x.id], `showcase/templates.html#${x.anchor}`)),
    })).filter((g) => g.items.length) },
    /* Guide is laid out as cards: the README across the top, the rest two up. */
    { id: "guide", t: "Guide", cards: true, items: GUIDE_SHOWN.map(([sl, label, , text]) => row(label, text, `guide/${sl}.html`, GUIDE_ICON[sl] || "book")) },
  ];
  const extras = [row("Download", "", "downloads.html", "download"), row("Builder", "", "builder.html", "layout"), row("Changelog", "", "guide/changelog.html", "list")];
  write("assets/search-data.js", `/* GENERATED by tools/build-site.mjs: the site search index and the phone menu. Do not edit. */\nwindow.DovetailSearch = ${JSON.stringify(items)};\nwindow.DovetailNav = ${JSON.stringify({ tree: navTree, extras })};\n`);
}

/* The home page is laid out the way the marketing template is: alternating
   base and subtle sections, a two-column hero, centred section heads with a
   mono eyebrow, icon tiles, check lists and stats, and a closing call to
   action. It is the template's own pattern, applied to the system itself. */
function buildHome() {
  const s = sections(readme);
  const glyph = (name) => icon(name).replace('class="tile-icon"', 'class="ic"');
  const iconTile = (name) => `<span class="icon-tile">${glyph(name)}</span>`;
  const head = (eyebrow, title, lead = "", centred = true) =>
    `<div class="sec-head${centred ? " centred" : ""}"><span class="eyebrow">${esc(eyebrow)}</span><h2 class="sec-h">${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ""}</div>`;
  const checks = (items) => `<ul class="checks">${items.map((t) => `<li>${glyph("check")}${esc(t)}</li>`).join("")}</ul>`;
  const tiles = [
    ["foundations/index.html", "Foundations", "Colour, type, layout, shape, elevation and motion, each with live spec cards.", "layers"],
    ["components/index.html", "Components", `${components.length} components across ${FAMILIES} families, with props, source and usage rules.`, "blocks"],
    ["tokens.html", "Tokens", "Every token in the system, with its value in each theme.", "braces"],
    ["showcase/templates.html", "Templates", "Product screens, marketing pages and social posts.", "monitor"],
    ["guide/index.html", "Guide", "Theming, accessibility, contribution and the token pipeline.", "book"],
    ["downloads.html", "Download", "Take the stylesheets, tokens and components into your project.", "download"],
  ];
  /* Live specimens, rendered by assets/specimens.js from the same bundle as
     the cards: the home page shows the components, not pictures of them. */
  const has = (n) => components.some((c) => c.name === n);
  const stage = ["Button", "Tabs", "Switch", "Progress"].filter(has);
  const gallery = ["Badge", "Input", "AvatarGroup", "Alert"].filter(has);
  const specimen = (name) =>
    `<a class="home-spec" href="components/${name}.html"><div class="home-spec-stage" data-specimen="${attr(name)}" aria-hidden="true"></div><span class="home-spec-name">${esc(name)}</span></a>`;
  const frame = (id, label) =>
    `<a class="home-thumb" href="showcase/templates.html" aria-label="${attr(label)} template"><div class="home-thumb-frame"><iframe src="previews/${id}.html" title="${attr(label)} preview" loading="lazy" tabindex="-1" aria-hidden="true"></iframe></div></a>`;
  const sketch = read(path.join(SYS, "assets", "icons", "sketch", "spark.svg")).replace("<svg ", '<svg class="home-sketch" width="96" height="96" aria-hidden="true" focusable="false" ');
  const body = `
<section class="sec home-hero-sec">
  <div class="hero">
    <div class="hero-copy">
      <span class="eyebrow">White-label design system</span>
      <h1 class="hero-h">One component set. Every brand you ship.</h1>
      <p class="lead">Dovetail ships unbranded on purpose. Components read semantic tokens, tokens read a brand theme, and swapping the theme changes every surface at once, without a fork.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="components/index.html">Browse components ${glyph("arrowRight")}</a>
        <a class="btn" href="guide/index.html">${glyph("book")} Read the guide</a>
      </div>
      <pre class="code hero-install" data-lang="sh"><code>npm install @dovetail-ds/react react react-dom</code></pre>
      <p class="pills"><span>No lock-in</span><span>DTCG tokens</span><span>Light and dark</span></p>
    </div>
    <div class="hero-stage" aria-hidden="true">
      ${stage.map((n) => `<div class="hero-tile" data-specimen="${attr(n)}"></div>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="sec alt">
  ${head("Why it holds", "Three tiers, referenced one way")}
  <div class="three">
    <div class="feature">${iconTile("droplet")}<h3>Primitives name values</h3><p>A ramp of OKLCH colours, a dimension scale, a type scale. Nothing here knows what it is for.</p></div>
    <div class="feature">${iconTile("layers")}<h3>Semantics name jobs</h3><p>Surface, text, border, and their paired roles. This is the only tier a component is allowed to read.</p></div>
    <div class="feature">${iconTile("blocks")}<h3>Components name parts</h3><p>Button background, input border. Retuned per context without touching the component.</p></div>
  </div>
</section>

<section class="sec">
  <div class="two">
    ${frame("MarketingKit", "Marketing page")}
    <div class="stack">
      ${head("See it run", "Whole screens from the same parts", "A landing page and a product dashboard, composed only from Dovetail components. Nothing in them names a colour.", false)}
      ${checks(["Light and dark from the same roles", "Icons, photos, video and illustration slots", "Retheme both at once in Configure"])}
      <div class="hero-actions"><a class="btn" href="showcase/templates.html">${glyph("monitor")} See the templates</a></div>
    </div>
  </div>
</section>

<section class="sec alt">
  <div class="two">
    <div class="stack">
      ${head("Proof", "Real components, not pictures of them", "Every tile here is the live component, drawn from the same bundle you install. Change the theme and they all follow.", false)}
      <div class="stats">
        <div class="stat">${iconTile("box")}<span class="stat-label">Components</span><span class="stat-value">${components.length}</span><span class="stat-cap">across ${FAMILIES} families</span></div>
        <div class="stat">${iconTile("layers")}<span class="stat-label">Token tiers</span><span class="stat-value">3</span><span class="stat-cap">referenced one way</span></div>
        <div class="stat">${iconTile("shield")}<span class="stat-label">Contrast</span><span class="stat-value">AA</span><span class="stat-cap">checked on every pairing</span></div>
      </div>
    </div>
    <div class="home-gallery">
      ${gallery.map(specimen).join("\n      ")}
    </div>
  </div>
</section>

<section class="sec">
  ${head("Theming", "Your brand arrives last, as one file", "Components read semantic roles. Roles read your theme. Swap the theme and every surface changes at once, light and dark.")}
  <div class="three">
    <div class="feature">${iconTile("droplet")}<h3>Pick a brand colour</h3><p>An exact hex becomes a full ramp, with its contrast checked.</p></div>
    <div class="feature">${iconTile("sliders")}<h3>Set shape and type</h3><p>Radius, families, density and icons, all as tokens.</p></div>
    <div class="feature">${iconTile("download")}<h3>Export the theme</h3><p>A CSS file of overrides. No fork, no build step.</p></div>
  </div>
  <div class="hero-actions centred"><button type="button" class="btn btn-primary" data-open-configure>${glyph("sliders")} Open Configure</button></div>
</section>

<section class="sec alt">
  ${head("Documentation", "Everything in the docs")}
  <div class="tiles">
    ${tiles.map(([href, title, text, g]) => `<a class="tile" href="${href}">${icon(g)}<h3>${esc(title)}</h3><p>${esc(text)}</p></a>`).join("\n    ")}
  </div>
</section>

<section class="sec">
  <div class="narrow">
    <section class="prose">
      <h2 id="start-here">Start here</h2>
      ${markdown(s.get("Start here") || "")}
    </section>
    ${cardBlock(cards.get("TierContract"), "")}
    <section class="prose">
      <h2 id="how-the-system-is-put-together">How the system is put together</h2>
      ${markdown(s.get("How the system is put together") || "")}
    </section>
    <section class="prose">
      <h2 id="rules-checklist">Rules checklist</h2>
      ${markdown(s.get("Rules checklist") || "")}
      <p><a href="guide/readme.html">Read the full README</a> · <a href="guide/authoring-rules.html">Authoring rules</a></p>
    </section>
  </div>
</section>

<section class="sec alt">
  <div class="cta">
    <div class="stack">
      <h2 class="sec-h">Ship your brand, not ours</h2>
      <p class="lead">Free and open. Take the stylesheets and tokens, or theme it here first.</p>
      <div class="hero-actions"><button type="button" class="btn btn-primary" data-open-configure>Open Configure ${glyph("arrowRight")}</button><a class="btn" href="downloads.html">${glyph("download")} Download</a></div>
    </div>
    <div class="cta-art" data-home-illustration>${sketch}</div>
  </div>
</section>
`;
  const scripts =
    `<script src="system/components/lib/react.production.min.js" defer></script>\n` +
    `<script src="system/components/lib/react-dom.production.min.js" defer></script>\n` +
    `<script src="system/components/bundle.js" defer></script>\n` +
    `<script src="assets/specimens.js" defer></script>\n`;
  writePage("index.html", { title: "Dovetail", lede: "A white-label design system: a strict token contract, a 4px grid, and components that never name a colour.", body, active: "home", root: "", wide: true, home: true, scripts });
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
<a class="tile" href="../tokens.html">${icon("braces")}<h2>Tokens</h2><p>Every token in the system, with its value in each theme.</p></a>
</div>`;
  writePage("foundations/index.html", { title: "Foundations", lede: "The visual and structural decisions every component inherits.", body: index, active: "foundations", root: "../" });

  for (const [group, s, text] of FOUNDATIONS) {
    const list = cardsInGroup(group);
    const sections = CARD_SECTIONS[group];
    let cardsHtml;
    if (sections) {
      const placed = new Set(sections.flatMap(([, , ids]) => ids));
      const parts = sections.map(
        ([name, note, ids]) => `<section class="group">
  <h2 id="${attr(slug(name))}">${esc(name)}</h2>
  <p class="group-note">${esc(note)}</p>
  ${ids.map((id) => cards.get(id)).filter(Boolean).map((c) => cardBlock(c, "../", { level: 3 })).join("\n")}
</section>`
      );
      /* Anything a section does not name still gets shown: a new card must not
         be able to disappear because this list was not updated. */
      const rest = list.filter((c) => !placed.has(c.id));
      if (rest.length) {
        parts.push(`<section class="group">
  <h2 id="more">More</h2>
  ${rest.map((c) => cardBlock(c, "../", { level: 3 })).join("\n")}
</section>`);
      }
      cardsHtml = parts.join("\n");
    } else {
      cardsHtml = list.map((c) => cardBlock(c, "../")).join("\n");
    }
    const body = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Foundations", href: "foundations/index.html" }, { label: group }])}
<h1>${esc(group)}</h1>
<p class="lede">${esc(text)}</p>
${cardsHtml}
`;
    writePage(`foundations/${s}.html`, { title: group, lede: text, body, active: `foundations:${s}`, root: "../" });
  }

  /* Space became Layout, and the old address forwards to the new one. */
  write(
    "foundations/space.html",
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Layout · Dovetail</title>
<meta http-equiv="refresh" content="0; url=layout.html">
<link rel="canonical" href="${SITE_URL}foundations/layout.html">
</head>
<body>
<p>Space is now <a href="layout.html">Layout</a>.</p>
</body>
</html>
`
  );
}

/* --------------------------------------------------------- component pages */

/* The component page as one Markdown file, for "Copy page as Markdown",
   "Download Markdown" and "Open in Claude": the guide, the typed contract,
   the tokens it reads and the source, in the order the page shows them. It
   is written from the same sources as the page, so the two cannot drift. */
function componentMarkdown(c) {
  /* The guide opens with the summary sentence; print it only when there is no guide. */
  const out = [`# ${c.name}`, "", ...(c.guide ? [] : [String(c.summary).trim(), ""])];
  const files = [c.source, c.types, c.guideFile].filter(Boolean).map((f) => `[${path.basename(f)}](${SITE_URL}${f})`);
  out.push(`Part of the Dovetail design system (${SITE_URL}), in the ${GROUP_LABEL[c.group]} family.${files.length ? " Files: " + files.join(", ") + "." : ""}`, "");
  out.push(`Live page: ${SITE_URL}components/${c.name}.html`, "");
  if (c.guide) out.push("## Guidelines", "", shiftHeadings(c.guide.replace(/^#\s+.*\n/, "")).trim(), "");
  if (c.types) out.push("## Props", "", "```ts", read(path.join(ROOT, c.types)).trimEnd(), "```", "");
  if (c.source) {
    const used = tokensUsedBy(c.source);
    if (used.length) {
      out.push("## Tokens it reads", "", "| Token | Tier | Declared as |", "| --- | --- | --- |");
      for (const u of used) out.push(`| \`${u.name}\` | ${u.tier === "undefined" ? "none" : u.tier} | ${u.value ? "`" + u.value.replace(/\|/g, "\\|") + "`" : "not declared"} |`);
      out.push("");
    }
    out.push("## Source", "", "```jsx", read(path.join(ROOT, c.source)).trimEnd(), "```", "");
  }
  return out.join("\n");
}

function buildComponents() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Components" }])}
<h1>Components</h1>
<p class="lede">${components.length} components in ${FAMILIES} families. Each ships a guide, a typed props contract, source, and a live card. Read the guide before you use one: it carries the rules the types cannot.</p>
<div class="filter-chips" role="toolbar" aria-label="Filter by family">
  <button type="button" class="pan-opt" data-filter="all" aria-pressed="true">All<span class="n">${components.length}</span></button>
  ${GROUP_ORDER.map((g) => `<button type="button" class="pan-opt" data-filter="${attr(g)}" aria-pressed="false">${esc(GROUP_LABEL[g])}<span class="n">${byGroup(g).length}</span></button>`).join("\n  ")}
</div>
${GROUP_ORDER.map((g) => {
  const list = byGroup(g);
  return `<section class="group" data-group="${attr(g)}">
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
        `data-import="${attr(importLine(c))}"`,
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

  writePage("components/index.html", {
    title: "Components",
    lede: "Every Dovetail component, with guides, props and live cards.",
    body: index,
    active: "components",
    root: "../",
    scripts: specimenScripts,
  });

  for (const c of components) {
    const detail = (GROUP_DETAIL[c.group] || []).map((id) => cards.get(id)).filter(Boolean);
    const guideHtml = c.guide ? markdown(shiftHeadings(c.guide.replace(/^#\s+.*\n/, ""))) : "<p class='muted'>No guide file ships for this component.</p>";
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

${playgroundSection(c)}

${cardBlock(c.card, "../", { heading: "Live" })}

${installSection(c)}

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
    fs.writeFileSync(path.join(ROOT, "components", `${c.name}.md`), componentMarkdown(c));
    const playScripts = playgroundProps(c).length
      ? `<script src="../system/components/lib/react.production.min.js" defer></script>\n` +
        `<script src="../system/components/lib/react-dom.production.min.js" defer></script>\n` +
        `<script src="../system/components/bundle.js" defer></script>\n` +
        `<script src="../assets/specimens.js" defer></script>\n` +
        `<script src="../assets/playground.js" defer></script>\n`
      : "";
    const sources = [
      c.source && { href: `../${c.source}`, name: `${c.sourceName}.jsx`, kind: "JSX" },
      c.types && { href: `../${c.types}`, name: `${c.sourceName}.d.ts`, kind: "Types" },
    ].filter(Boolean);
    const copies = [{ label: "Copy import", text: importLine(c), done: "Import copied" }];
    writePage(`components/${c.name}.html`, { title: c.name, lede: c.summary.replace(/`/g, ""), body, active: `component:${c.name}`, root: "../", graph: true, md: `${c.name}.md`, scripts: playScripts, sources, copies });
  }
}

/* ------------------------------------------------------------- playground */

/* The props a reader can turn in the playground, read from the component's
   .d.ts: string unions become chips, booleans a switch, numbers a number
   field, and strings or ReactNode a text field. Functions, arrays, objects,
   style and as are left to the code, since there is no honest control for
   them. */
/* An interface's members, with those of any interface it extends that is
   declared in the same file (a shared base), base first. Library bases such
   as React.HTMLAttributes are left out: they are not the component's props. */
function interfaceBody(src, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const start = src.search(new RegExp(`(?:export\\s+)?interface ${name}\\b`));
  if (start < 0) return null;
  const open = src.indexOf("{", start);
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i; break; }
  }
  const ext = (src.slice(start, open).match(/extends\s+([\s\S]+)$/) || [])[1] || "";
  const bases = ext.split(",").map((b) => b.trim()).filter((b) => /^\w+$/.test(b));
  return bases.map((b) => interfaceBody(src, b, seen) || "").join("\n") + "\n" + src.slice(open + 1, end);
}

function playgroundProps(c) {
  if (!c.types) return [];
  const src = read(path.join(ROOT, c.types));
  /* Props are an interface, or a union of interfaces split on a discriminant
     (Rating: display or input). A playground shows the first member, the one
     that renders without callbacks. */
  const union = src.match(new RegExp(`export type ${c.name}Props\\s*=\\s*(\\w+)\\s*\\|`));
  const body = interfaceBody(src, union ? union[1] : `${c.name}Props`);
  if (body == null) return [];
  const out = [];
  const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?\n\s*([a-zA-Z]\w*)(\?)?:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) {
    const [, doc = "", name, , rawType] = m;
    const type = rawType.replace(/\s+/g, " ").trim();
    if (/^(style|as|className|id)$/.test(name) || /^on[A-Z]/.test(name)) continue;
    const def = (doc.match(/@default\s+([^\n*]+)/) || [])[1];
    /* @slot Button, Link: what an element prop takes in the builder. */
    const slot = (doc.match(/@slot\s+([^\n*@]+)/) || [])[1];
    const note = doc.replace(/^\s*\*\s?/gm, "").replace(/@default[^\n]*/g, "").replace(/@slot[^\n*@]*/g, "").replace(/\s+/g, " ").trim();
    let kind = null, options = null;
    if (/^("[^"]*"\s*\|\s*)+"[^"]*"$/.test(type)) { kind = "enum"; options = type.split("|").map((x) => x.trim().replace(/"/g, "")); }
    else if (type === "boolean") kind = "boolean";
    else if (type === "number" || type === "number | string" || type === "string | number") kind = "number";
    else if (type === "string") kind = "text";
    else if (type === "React.ReactNode") kind = "node";
    if (!kind) continue;
    const prop = { name, kind, options, default: def ? def.trim().replace(/^"|"$/g, "") : null, note: note.split(". ")[0].slice(0, 120) };
    if (slot && kind === "node") prop.accepts = slot.split(/[\s,]+/).filter(Boolean);
    out.push(prop);
  }
  return out;
}

/* The builder reads a few more prop types than the docs playground: a
   literal union with a free-form fallback ("4:3" | … | number) offers the
   named options, numbers count as literals (a heading's level), and an
   indexed type (AspectRatioProps["ratio"]) is looked up where it's declared. */
let typeIndex = null;
function allTypes() {
  if (typeIndex === null) typeIndex = components.filter((c) => c.types).map((c) => read(path.join(ROOT, c.types))).join("\n");
  return typeIndex;
}
function resolveIndexed(type) {
  /* A named union (export type CarouselLayout = "stack" | …) reads as itself. */
  const alias = /^[A-Z]\w*$/.test(type) && new RegExp(`export type ${type}\\s*=\\s*([^;]+);`).exec(allTypes());
  if (alias) return alias[1].replace(/\s+/g, " ").trim();
  const m = /^(\w+)\["(\w+)"\]$/.exec(type);
  if (!m) return type;
  const body = interfaceBody(allTypes(), m[1]);
  const mm = body && new RegExp(`\\n\\s*${m[2]}\\??:\\s*([^;]+);`).exec(body);
  return mm ? mm[1].replace(/\s+/g, " ").trim() : type;
}
function literalOptions(type) {
  const parts = type.split("|").map((x) => x.trim()).filter(Boolean);
  const lits = parts.filter((x) => /^"[^"]*"$/.test(x) || /^-?\d+(\.\d+)?$/.test(x));
  if (lits.length < 2 || parts.some((x) => !lits.includes(x) && !/^(string|number)$/.test(x))) return null;
  return lits.map((x) => (x[0] === '"' ? x.slice(1, -1) : Number(x)));
}
/* A list prop (an Accordion's items, a block's stats) becomes an editor whose
   fields come from the item's own type: text, numbers, switches and choices.
   A list whose items need something the builder can't edit (a nested list, an
   element) is left out, unless that part is optional, when it's skipped. */
function listFields(type) {
  type = type.replace(/\s+/g, " ").trim();
  const arr = /^(.+)\[\]$/.exec(type) || /^Array<(.+)>$/.exec(type);
  if (!arr) return null;
  const item = arr[1].trim();
  if (/^(string|React\.ReactNode)$/.test(item)) return { of: "text" };
  let body = null, only = null;
  const pick = /^Pick<(\w+),\s*(.+)>$/.exec(item);
  if (pick) { body = interfaceBody(allTypes(), pick[1]); only = literalOptions(pick[2]) || [pick[2].replace(/"/g, "")]; }
  else if (/^\w+$/.test(item)) body = interfaceBody(allTypes(), item);
  if (body == null) return null;
  const fields = [];
  const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?\n\s*([a-zA-Z]\w*)(\?)?:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) {
    const [, doc = "", name, opt, raw] = m;
    if (only && !only.includes(name)) continue;
    if (/^on[A-Z]/.test(name)) continue;
    const t = resolveIndexed(raw.replace(/\s+/g, " ").trim());
    let kind = null, options = null;
    if (t === "string" || t === "React.ReactNode") kind = /^(src|image|poster)$/.test(name) ? "media" : /^href$/.test(name) ? "url" : "text";
    else if (t === "number" || t === "number | string" || t === "string | number") kind = "number";
    else if (t === "boolean") kind = "boolean";
    else if ((options = literalOptions(t))) kind = "enum";
    /* A raw width or colour isn't a token, so it isn't a field. */
    if (kind !== "enum" && /^(width|height|minWidth|maxWidth|color|background)$/.test(name)) kind = null;
    if (!kind) { if (opt) continue; return null; }
    const f = { name, kind, optional: !!opt };
    if (options) f.options = options;
    const note = doc.replace(/^\s*\*\s?/gm, "").replace(/@\w+[^\n]*/g, "").replace(/\s+/g, " ").trim();
    if (note) f.note = note.split(". ")[0].slice(0, 80);
    fields.push(f);
  }
  /* Only an id (an item type that extends another, say) is nothing to edit. */
  return fields.some((f) => !/^(id|key)$/.test(f.name)) ? { fields } : null;
}

function builderExtraProps(c, have) {
  if (!c.types) return [];
  const src = read(path.join(ROOT, c.types));
  const union = src.match(new RegExp(`export type ${c.name}Props\\s*=\\s*(\\w+)\\s*\\|`));
  const body = interfaceBody(src, union ? union[1] : `${c.name}Props`);
  if (body == null) return [];
  const out = [];
  const re = /(?:\/\*\*([\s\S]*?)\*\/\s*)?\n\s*([a-zA-Z]\w*)(\?)?:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) {
    const [, doc = "", name, , rawType] = m;
    if (have.has(name) || /^(style|as|className|id|children)$/.test(name) || /^on[A-Z]/.test(name)) continue;
    /* A list, unless it's a controlled value or a free-form union. */
    const list = /^(value|default[A-Z]\w*|blocks|rows)$/.test(name) ? null : listFields(rawType);
    if (list) {
      const note0 = doc.replace(/^\s*\*\s?/gm, "").replace(/@\w+[^\n]*/g, "").replace(/\s+/g, " ").trim();
      out.push(Object.assign({ name, kind: "list", options: null, default: null, note: note0.split(". ")[0].slice(0, 120) }, list));
      continue;
    }
    const options = literalOptions(resolveIndexed(rawType.replace(/\s+/g, " ").trim()));
    if (!options) continue;
    let def = ((doc.match(/@default\s+([^\n*]+)/) || [])[1] || "").trim().replace(/^"|"$/g, "");
    def = def === "" ? null : typeof options[0] === "number" && /^-?\d/.test(def) ? Number(def) : def;
    const note = doc.replace(/^\s*\*\s?/gm, "").replace(/@\w+[^\n]*/g, "").replace(/\s+/g, " ").trim();
    out.push({ name, kind: "enum", options, default: def, note: note.split(". ")[0].slice(0, 120) });
  }
  return out;
}

function playgroundSection(c) {
  const props = playgroundProps(c);
  if (!props.length) return "";
  return `<section class="playground-wrap">
  <h2 id="playground">Playground</h2>
  <p class="muted">Change a prop and watch it. The code below follows along.</p>
  <div class="playground" data-playground="${attr(c.name)}" data-props="${attr(JSON.stringify(props))}">
    <div class="pg-stage" aria-live="polite"></div>
    <div class="pg-controls" role="group" aria-label="${attr(c.name)} props"></div>
    <pre class="pg-code"><code></code></pre>
  </div>
</section>`;
}

/* ----------------------------------------------------------- showcase pages */

/* A page that needs a paragraph the index tile should not carry. */
const SHOWCASE_NOTE = {};

function buildShowcase() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Showcase" }])}
<h1>Showcase</h1>
<p class="lede">The system assembled: family reference cards, whole screens, and the tools that produce a theme.</p>
<div class="tiles">
${SHOWCASE.map(([group, s, text, glyph]) => {
  const n = cardsInGroup(group).length;
  return `<a class="tile" href="${s}.html">${icon(glyph)}<h2>${esc(group)}</h2><p>${esc(text)}</p><p class="tile-meta">${n} card${n === 1 ? "" : "s"}</p></a>`;
}).join("\n")}
</div>`;
  writePage("showcase/index.html", { title: "Showcase", lede: "Reference cards, templates and tools.", body: index, active: "showcase", root: "../" });

  for (const [group, s, text] of SHOWCASE) {
    const list = cardsInGroup(group);
    /* Templates are laid out by kind, the same three the menu opens on, and
       sit at the top of the site rather than under Showcase. */
    const cardsHtml = group === "Templates"
      ? TEMPLATE_KINDS.map(([kind, label, d]) => {
          const mine = list.filter((c) => (TEMPLATE_KIND[c.id] || "product") === kind);
          return mine.length
            ? `<h2 id="${kind}" class="tpl-kind">${esc(label)}</h2>\n<p class="tpl-kind-sub">${esc(d)}</p>\n${mine.map((c) => cardBlock(c, "../", { level: 3 })).join("\n")}`
            : "";
        }).join("\n")
      : list.map((c) => cardBlock(c, "../")).join("\n");
    const trail = group === "Templates"
      ? [{ label: "Dovetail", href: "index.html" }, { label: group }]
      : [{ label: "Dovetail", href: "index.html" }, { label: "Showcase", href: "showcase/index.html" }, { label: group }];
    const body = `
${breadcrumb("../", trail)}
<h1>${esc(group)}</h1>
<p class="lede">${esc(text)}</p>
${SHOWCASE_NOTE[group] ? `<p class="group-note">${esc(SHOWCASE_NOTE[group])}</p>` : ""}
${cardsHtml}
`;
    writePage(`showcase/${s}.html`, { title: group, lede: text, body, active: `showcase:${s}`, root: "../", wide: true });
  }
}

/* -------------------------------------------------------------- guide pages */

function buildGuide() {
  const index = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Guide" }])}
<h1>Guide</h1>
<p class="lede">The prose that travels with the system: how to theme it, what it guarantees, and how to add to it.</p>
<div class="tiles">
${GUIDE_SHOWN.map(([s, label, , text]) => `<a class="tile" href="${s}.html">${icon(GUIDE_ICON[s] || "book")}<h2>${esc(label)}</h2><p>${esc(text)}</p></a>`).join("\n")}
</div>`;
  writePage("guide/index.html", { title: "Guide", lede: "Theming, accessibility, contribution and the token pipeline.", body: index, active: "guide", root: "../" });

  for (const [s, label, file, text] of GUIDE_PAGES) {
    const src = read(path.join(ROOT, file));
    /* Links in these files are relative to where the file lives. On the site
       a link to another guide source becomes that guide page, and anything
       else is re-pointed from guide/ back to the file itself. */
    const pages = new Map(GUIDE_PAGES.map(([slugName, , f]) => [f, `${slugName}.html`]));
    const html = markdown(src).replace(/href="([^"]+)"/g, (m, href) => {
      if (/^([a-z]+:|#|\/)/i.test(href)) return m;
      const [target, hash] = href.split("#");
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      /* The Pages upload leaves out .github/, so those files are linked on GitHub. */
      const to = pages.get(resolved) || (resolved.startsWith(".github/") ? `https://github.com/graham-goebel/Dovetail/blob/HEAD/${resolved}` : `../${resolved}`);
      return `href="${attr(to + (hash ? "#" + hash : ""))}"`;
    });
    const body = `
${breadcrumb("../", [{ label: "Dovetail", href: "index.html" }, { label: "Guide", href: "guide/index.html" }, { label }])}
<article class="prose doc">
${html}
</article>
<p class="muted">Source: <a href="../${file}">${esc(file)}</a></p>
`;
    writePage(`guide/${s}.html`, { title: label, lede: text, body, active: `guide:${s}`, root: "../", md: `../${file}`, mdName: `${s}.md` });
  }
}

/* -------------------------------------------------------------- token page */

function swatch(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!/^(#|oklch|rgb|hsl|color\(|linear-gradient\(|radial-gradient\()/i.test(v)) return "";
  return `<span class="swatch" style="background:${attr(v)}"></span>`;
}

/* system/tokens.json stores a colour value either as a literal or as the DTCG
   reference syntax its own pipeline uses, `{dt-color-primary-600}`, and neither
   the light nor the dark column ever resolved that reference to something a
   swatch could read: most of the colour cells on this page have been printing
   that placeholder text instead of a chip. tokenDefs already holds every value
   the CSS declares, keyed the same way the graph and the component token
   tables read it, so resolving here needs no second index. The dark column is
   the one exception: it has to prefer whatever base-dark.css re-points before
   falling back to the light-tier definition, or a dark cell that references
   another semantic role would resolve to that role's light value. */
const darkDefs = new Map();
{
  const darkFile = path.join(SYS, "tokens", "themes", "base-dark.css");
  if (exists(darkFile)) {
    for (const m of read(darkFile).matchAll(/(--dt-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      if (!darkDefs.has(m[1])) darkDefs.set(m[1], m[2].trim());
    }
  }
}

function lookupTokenValue(name, isDark) {
  const dark = isDark && darkDefs.get(name);
  if (dark) return dark;
  const def = tokenDefs.get(name);
  return def ? def.value : null;
}

function resolveTokenValue(value, isDark, depth) {
  if (typeof value !== "string" || (depth || 0) > 8) return value;
  const bareVar = value.match(/^var\((--dt-[a-z0-9-]+)\)$/);
  if (bareVar) {
    const next = lookupTokenValue(bareVar[1], isDark);
    return next != null ? resolveTokenValue(next, isDark, (depth || 0) + 1) : value;
  }
  /* A {ref} can sit alone or inside a larger shorthand, such as the two colour
     stops of a gradient token, so every occurrence in the string is a
     candidate, not only a whole-string match. */
  if (!/\{[a-z0-9.-]+\}/i.test(value)) return value;
  const substituted = value.replace(/\{([a-z0-9.-]+)\}/gi, (whole, ref) => {
    const name = "--dt-" + ref.replace(/^dt-/, "").replace(/\./g, "-");
    const next = lookupTokenValue(name, isDark);
    return next != null ? resolveTokenValue(next, isDark, (depth || 0) + 1) : whole;
  });
  return substituted === value ? value : resolveTokenValue(substituted, isDark, (depth || 0) + 1);
}

function tokenTable(list, themes) {
  const heads = themes ? themes.map((t) => `<th>${esc(t.name)}</th>`).join("") : "<th>Value</th>";
  const rows = list
    .map((t) => {
      const cells = themes
        ? themes
            .map((th) => {
              const raw = typeof t.value === "object" && t.value ? t.value[th.id] ?? "" : th.id === themes[0].id ? t.value : "";
              const v = resolveTokenValue(raw, th.id === "dark");
              return `<td>${v ? `${swatch(v)}<code>${esc(v)}</code>` : '<span class="muted">—</span>'}</td>`;
            })
            .join("")
        : `<td><code>${esc(typeof t.value === "object" ? JSON.stringify(t.value) : t.value)}</code></td>`;
      const id = "--" + t.name;
      return `<tr id="token-${attr(t.name)}"><th scope="row"><span class="token-cell"><code>${esc(id)}</code>${graphButton(id, id)}</span></th>${cells}<td class="usage">${esc(t.usage || "")}</td></tr>`;
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
  "dt-context-social": "Social context",
};

/* The context columns on the tokens page were empty: tokens.json carries the
   light and dark values but not a single context value, so Product and
   Marketing have been three hundred dashes since the page was built. The values
   do exist, in the stylesheets the browser loads, so they are read from there
   and merged in at build time. Social arrives the same way, which is also why
   it needed no hand-edit of a derived data file. */
function mergeContexts() {
  const dir = path.join(SYS, "tokens", "contexts");
  if (!exists(dir)) return;
  const columns = [];

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".css")).sort()) {
    const id = "dt-" + file.replace(/^context-/, "context-").replace(/\.css$/, "");
    const values = new Map();
    for (const m of read(path.join(dir, file)).matchAll(/(--dt-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      values.set(m[1].slice(2), m[2].trim());
    }
    if (!values.size) continue;
    columns.push([id, values]);
  }

  for (const family of Object.values(tokens)) {
    if (!family || !Array.isArray(family.tokens)) continue;
    for (const t of family.tokens) {
      for (const [id, values] of columns) {
        const hit = values.get(t.name);
        if (!hit) continue;
        if (typeof t.value !== "object" || !t.value) t.value = { light: t.value };
        t.value[id] = hit;
      }
    }
  }

  const list = tokens.color && tokens.color.themes;
  if (!list) return;
  for (const [id] of columns) {
    if (!list.some((t) => t.id === id)) list.push({ id, name: id });
  }
}

function buildTokens() {
  mergeContexts();
  const themes = ((tokens.color && tokens.color.themes) || [{ id: "light", name: "Light" }]).map((t) => ({
    ...t,
    name: THEME_LABEL[t.id] || t.name,
  }));
  /* A family gets a column per theme that actually says something in it. Colour
     is the only family light and dark both speak to; the contexts speak to
     spacing, size and type and say nothing about hue. Choosing the columns per
     family is what keeps the page from being mostly dashes. */
  const columnsFor = (list) => {
    const seen = new Set();
    for (const t of list) {
      if (t.value && typeof t.value === "object") for (const id of Object.keys(t.value)) seen.add(id);
      else seen.add("light");
    }
    const used = themes.filter((t) => seen.has(t.id));
    return used.length > 1 ? used : null;
  };

  const families = [
    ["color", "Colour", tokens.color && tokens.color.tokens],
    ["spacing", "Spacing and dimension", tokens.spacing && tokens.spacing.tokens],
    ["radius", "Radius", tokens.radius && tokens.radius.tokens],
    ["motion", "Motion", tokens.motion && tokens.motion.tokens],
    ["lineHeight", "Line height", tokens.lineHeight && tokens.lineHeight.tokens],
    ["fontWeight", "Font weight", tokens.fontWeight && tokens.fontWeight.tokens],
    ["letterSpacing", "Letter spacing", tokens.letterSpacing && tokens.letterSpacing.tokens],
    ["other", "Elevation, z-order and the rest", tokens.other && tokens.other.tokens],
    ["texture", "Texture", tokens.texture && tokens.texture.tokens],
  ]
    .filter(([, , list]) => Array.isArray(list) && list.length)
    .map(([id, label, list]) => [id, label, list, columnsFor(list)]);

  const typeStyles = (tokens.type && tokens.type.groups) || [];
  const body = `
${breadcrumb("", [{ label: "Dovetail", href: "index.html" }, { label: "Foundations", href: "foundations/index.html" }, { label: "Tokens" }])}
<h1>Tokens</h1>
<p class="lede">Every token the system declares, with its value in each theme. Components read the semantic tier; only chart code reads a primitive, and it says why.</p>
<p class="lede">The tier rule is a claim about direction, and the graph is where you check it.
Open the visualiser on any row to see what a token resolves through and, more to the point,
which roles and components consume it.</p>
<p class="meta">
  <button type="button" class="btn-graph" data-graph="${attr(busiestToken())}">Open the graph</button>
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
  writePage("tokens.html", { title: "Tokens", lede: "Every token in the system, with its value in each theme.", body, active: "tokens", root: "", wide: true, graph: true });
}

/* ----------------------------------------------------------- download page */

/* ------------------------------------------------------------------ builder */

/* The builder's choices are tokens, never values. Each option names the
   tokens it uses and the declarations it sets, and the build fails if a token
   doesn't exist, so a renamed token can't leave the inspector offering a value
   that resolves to nothing. The canvas (assets/builder-frame.js) applies these
   same declarations and the code export prints them, so the three can't
   disagree. A few CSS keywords appear (100%, auto, fit-content); a length or a
   colour never does. */
const cssVar = (t) => `var(${t})`;
const BUILDER_SPACE = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"];
const tokenOption = (value, tokens, css, label) => ({ value, tokens, css, ...(label ? { label } : {}) });
const inset = (o) => cssVar(`--dt-space-inset-${o}`);
const spaceOpts = (css) => BUILDER_SPACE.map((o) => tokenOption(o, [`--dt-space-inset-${o}`], css(inset(o))));
const borderOpts = (prop) => ["subtle", "default", "strong", "brand"]
  .map((o) => tokenOption(o, [`--dt-border-${o}`, "--dt-border-width-default"], { [prop]: `${cssVar("--dt-border-width-default")} solid ${cssVar(`--dt-border-${o}`)}` }));
/* Fixed sizes are whole multiples of the large control size, so a shape drawn
   on the canvas snaps to the system's own grid. */
const BUILDER_STEPS = [1, 2, 3, 4, 6, 8, 12];
/* Each option names its family, so the builder can offer the ones that suit
   what's selected first: control sizes for a Button, containers and layout
   layers for a Section, avatar sizes for an Avatar. */
const fam = (family, o) => Object.assign(o, { family });
/* Sizes from the semantic size tokens, as [value, token, name]. */
const SIZE_SET = {
  control: [["control-xs", "--dt-size-control-xs", "control-xs"], ["control-sm", "--dt-size-control-sm", "control-sm"], ["control-md", "--dt-size-control-md", "control-md"],
    ["control-lg", "--dt-size-control-lg", "control-lg"], ["touch", "--dt-size-touch-target", "touch-target"]],
  icon: ["xs", "sm", "md", "lg", "xl"].map((s) => [`icon-${s}`, `--dt-size-icon-${s}`, `icon-${s}`]),
  avatar: ["xs", "sm", "md", "lg", "xl"].map((s) => [`avatar-${s}`, `--dt-size-avatar-${s}`, `avatar-${s}`]),
};
const sizeOpts = (prop, sets) => sets.flatMap((set) => SIZE_SET[set].map(([v, t, name]) => fam(set, tokenOption(v, [t], { [prop]: cssVar(t) }, name))));
const stepOpts = (prop, steps = BUILDER_STEPS) => steps.map((n) => fam("step", tokenOption(`x${n}`, ["--dt-size-control-lg"], { [prop]: `calc(${cssVar("--dt-size-control-lg")} * ${n})` }, `control-lg × ${n}`)));
const media = (prop, list) => list.map(([v, t, name]) => fam("media", tokenOption(v, [t], { [prop]: cssVar(t) }, name)));
const HEIGHT_MEDIA = [["media-min", "--dt-size-media-min", "media-min"], ["artboard-square", "--dt-size-artboard-square", "artboard square"],
  ["artboard-portrait", "--dt-size-artboard-portrait", "artboard portrait"], ["artboard-story", "--dt-size-artboard-story", "artboard story"]];
/* Spacing: the inset scale for padding and the stack and inline scales for
   margin, and the layout layers (related, group, block, section) that move
   together with the layout's character, for bands and blocks. */
const LAYERS = ["related", "group", "block", "section"];
const insetOpts = (css) => BUILDER_SPACE.map((o) => fam("inset", tokenOption(o, [`--dt-space-inset-${o}`], css(inset(o)))));
const layerOpts = (axis, css) => LAYERS.map((o) => fam("layout", tokenOption(o, [`--dt-layout-${axis}-${o}`], css(cssVar(`--dt-layout-${axis}-${o}`)), `layout ${o}`)));
const layerBoth = (cssFor) => LAYERS.map((o) => fam("layout", tokenOption(o, [`--dt-layout-stack-${o}`, `--dt-layout-inline-${o}`], cssFor(cssVar(`--dt-layout-stack-${o}`), cssVar(`--dt-layout-inline-${o}`)), `layout ${o}`)));
const module = (css) => fam("layout", tokenOption("module", ["--dt-layout-module-padding"], css(cssVar("--dt-layout-module-padding")), "module padding"));
/* A band's padding: a module padding step above and below, and the page
   gutter at the sides, which is how a Section pads itself. md is "module",
   by its older name. */
const MODULE_STEPS = [["sm", "module-sm"], ["md", "module"], ["lg", "module-lg"], ["xl", "module-xl"]];
const bandPad = () => MODULE_STEPS.map(([step, v]) => fam("layout", tokenOption(v, [`--dt-layout-module-padding-${step}`, "--dt-layout-page-gutter"],
  { paddingBlock: cssVar(`--dt-layout-module-padding-${step}`), paddingInline: cssVar("--dt-layout-page-gutter") }, `section ${step}`)));
const stepPad = (prop) => MODULE_STEPS.filter(([step]) => step !== "md").map(([step, v]) => fam("layout", tokenOption(v, [`--dt-layout-module-padding-${step}`], { [prop]: cssVar(`--dt-layout-module-padding-${step}`) }, `module ${step}`)));
const sidePad = (prop) => [
  fam("layout", tokenOption("gutter", ["--dt-layout-page-gutter"], { [prop]: cssVar("--dt-layout-page-gutter") }, "page gutter")),
  fam("layout", tokenOption("module-inset", ["--dt-layout-module-inset"], { [prop]: cssVar("--dt-layout-module-inset") }, "module inset")),
];
const spaceOpts2 = (axis, css) => BUILDER_SPACE.map((o) => fam("space", tokenOption(o, [`--dt-space-${axis}-${o}`], css(cssVar(`--dt-space-${axis}-${o}`)))));
/* A pinned or floating item's distance from the edges it's pinned to. */
const OFFSET = "var(--bd-offset, 0)";
/* The same declarations Section's brand tones set (Section.jsx, fillTone):
   text on the fill, and buttons that read on it. A strong fill turns its
   primary and brand buttons to the fill's text colour; a pale one gives its
   buttons the brand colours. */
const BRAND_FILL = new Set(["brand", "brand-muted", "brand-secondary", "brand-secondary-muted"]);
const mixIn = (a, pct, b) => `color-mix(in oklab, ${a} ${pct}%, ${b})`;
const onStrong = (fg, fill) => {
  const out = {
    "--dt-text-link": fg, "--dt-border-subtle": mixIn(fg, 18, "transparent"), "--dt-border-default": mixIn(fg, 32, "transparent"),
    "--dt-border-selected": fg, "--dt-focus-ring-color": fg, "--dt-focus-ring-offset-color": fill,
  };
  for (const v of ["primary", "brand", "brand-secondary"]) {
    Object.assign(out, { [`--dt-button-${v}-bg`]: fg, [`--dt-button-${v}-bg-hover`]: mixIn(fg, 88, fill), [`--dt-button-${v}-bg-active`]: mixIn(fg, 76, fill), [`--dt-button-${v}-fg`]: fill, [`--dt-button-${v}-border`]: "transparent" });
  }
  return Object.assign(out, {
    "--dt-button-secondary-bg": "transparent", "--dt-button-secondary-bg-hover": mixIn(fg, 12, "transparent"), "--dt-button-secondary-bg-active": mixIn(fg, 20, "transparent"),
    "--dt-button-secondary-fg": fg, "--dt-button-secondary-border": mixIn(fg, 55, "transparent"),
    "--dt-button-ghost-bg-hover": mixIn(fg, 12, "transparent"), "--dt-button-ghost-bg-active": mixIn(fg, 20, "transparent"), "--dt-button-ghost-fg": fg,
  });
};
const buttonsIn = (lead, follow) => {
  const out = {};
  for (const [variant, hue] of [["primary", lead], ["secondary", follow]]) {
    const role = `--dt-surface-action-${hue}`;
    Object.assign(out, { [`--dt-button-${variant}-bg`]: cssVar(role), [`--dt-button-${variant}-bg-hover`]: cssVar(`${role}-hover`), [`--dt-button-${variant}-bg-active`]: cssVar(`${role}-active`),
      [`--dt-button-${variant}-fg`]: cssVar(`--dt-text-on-action-${hue}`), [`--dt-button-${variant}-border`]: "transparent" });
  }
  return out;
};
const FILL_BUTTONS = {
  brand: () => onStrong(cssVar("--dt-text-on-brand"), cssVar("--dt-surface-brand")),
  "brand-secondary": () => onStrong(cssVar("--dt-text-on-brand-secondary"), cssVar("--dt-surface-brand-secondary")),
  "brand-muted": () => buttonsIn("brand", "brand-secondary"),
  "brand-secondary-muted": () => buttonsIn("brand-secondary", "brand"),
};
const onFill = (fg) => ({
  color: fg,
  "--dt-text-primary": fg,
  "--dt-text-headline": fg,
  "--dt-text-secondary": `color-mix(in oklab, ${fg} 88%, transparent)`,
  "--dt-text-tertiary": `color-mix(in oklab, ${fg} 76%, transparent)`,
});
const BUILDER_TOKENS = {
  /* Where an item sits across its parent's flow: CSS keywords, no values. */
  self: { label: "Align self", section: "position", preview: "text",
    options: [["start", "flex-start", "Start"], ["center", "center", "Center"], ["end", "flex-end", "End"], ["stretch", "stretch", "Stretch"]]
      .map(([v, css, label]) => tokenOption(v, [], { alignSelf: css }, label)) },
  /* Out of the flow: sticky as the frame scrolls, pinned to the frame, or
     floating over its parent. The edges come from anchor, the distance from
     offset, both tokens. */
  position: { label: "Position", section: "position", preview: "text",
    options: [
      tokenOption("sticky", ["--dt-z-sticky"], { position: "sticky", top: OFFSET, zIndex: cssVar("--dt-z-sticky") }, "Sticky"),
      tokenOption("pinned", ["--dt-z-sticky"], { position: "fixed", zIndex: cssVar("--dt-z-sticky") }, "Pinned to the frame"),
      tokenOption("floating", ["--dt-z-raised"], { position: "absolute", zIndex: cssVar("--dt-z-raised") }, "Floating over its parent"),
    ] },
  anchor: { label: "Pin to", section: "position", preview: "text",
    options: [
      ["top-left", { top: OFFSET, left: OFFSET }, "Top left"], ["top", { top: OFFSET, left: "50%", transform: "translateX(-50%)" }, "Top"], ["top-right", { top: OFFSET, right: OFFSET }, "Top right"],
      ["left", { top: "50%", left: OFFSET, transform: "translateY(-50%)" }, "Left"], ["center", { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }, "Centre"], ["right", { top: "50%", right: OFFSET, transform: "translateY(-50%)" }, "Right"],
      ["bottom-left", { bottom: OFFSET, left: OFFSET }, "Bottom left"], ["bottom", { bottom: OFFSET, left: "50%", transform: "translateX(-50%)" }, "Bottom"], ["bottom-right", { bottom: OFFSET, right: OFFSET }, "Bottom right"],
      ["top-stretch", { top: OFFSET, left: OFFSET, right: OFFSET }, "Across the top"], ["bottom-stretch", { bottom: OFFSET, left: OFFSET, right: OFFSET }, "Across the bottom"],
    ].map(([v, css, label]) => tokenOption(v, [], css, label)) },
  offset: { label: "Offset", section: "position", preview: "space",
    options: BUILDER_SPACE.map((o) => fam("inset", tokenOption(o, [`--dt-space-inset-${o}`], { "--bd-offset": inset(o) }))) },
  /* A brand fill re-points the text roles on itself, the way Section's tones
     do, so a Heading or Text inside it reads on the fill without a prop. */
  surface: { label: "Fill", section: "appearance", preview: "color",
    options: ["base", "subtle", "raised", "sunken", "brand", "brand-muted", "brand-secondary", "brand-secondary-muted", "success-subtle", "warning-subtle", "danger-subtle", "info-subtle"]
      .map((o) => BRAND_FILL.has(o)
        ? tokenOption(o, [`--dt-surface-${o}`, `--dt-text-on-${o}`], Object.assign({ background: cssVar(`--dt-surface-${o}`) }, onFill(cssVar(`--dt-text-on-${o}`)), FILL_BUTTONS[o]()))
        : tokenOption(o, [`--dt-surface-${o}`], { background: cssVar(`--dt-surface-${o}`) })) },
  /* How a layer mixes with what's under it, and an inverted picture: CSS
     keywords and a filter, no values. */
  blend: { label: "Blend mode", section: "appearance", preview: "text",
    options: ["multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"]
      .map((o) => tokenOption(o, [], { mixBlendMode: o }, o.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()))) },
  invert: { label: "Invert", section: "appearance", preview: "text",
    options: [tokenOption("on", [], { filter: "invert(1)" }, "Inverted")] },
  /* How see-through a layer is: the four opacity roles, never a number. */
  opacity: { label: "Opacity", section: "appearance", preview: "text",
    options: [["ghost", "Ghost (20%)"], ["disabled", "Disabled (40%)"], ["muted", "Muted (60%)"], ["strong", "Strong (80%)"]]
      .map(([o, label]) => tokenOption(o, [`--dt-opacity-${o}`], { opacity: cssVar(`--dt-opacity-${o}`) }, label)) },
  border: { label: "Border", section: "appearance", preview: "color", sides: ["borderTop", "borderRight", "borderBottom", "borderLeft"], options: borderOpts("border") },
  borderTop: { label: "Border top", section: "appearance", preview: "color", side: "top", options: borderOpts("borderTop") },
  borderRight: { label: "Border right", section: "appearance", preview: "color", side: "right", options: borderOpts("borderRight") },
  borderBottom: { label: "Border bottom", section: "appearance", preview: "color", side: "bottom", options: borderOpts("borderBottom") },
  borderLeft: { label: "Border left", section: "appearance", preview: "color", side: "left", options: borderOpts("borderLeft") },
  radius: { label: "Radius", section: "appearance", preview: "radius",
    options: ["none", "control", "container", "overlay", "media", "pill"]
      .map((o) => tokenOption(o, [`--dt-radius-${o}`], { borderRadius: cssVar(`--dt-radius-${o}`), overflow: "hidden" })) },
  elevation: { label: "Shadow", section: "appearance", preview: "shadow",
    options: ["0", "1", "2", "3", "4", "5"].map((o) => tokenOption(o, [`--dt-elevation-${o}`], { boxShadow: cssVar(`--dt-elevation-${o}`) })) },
  /* Padding reads the inset scale, or the layout layers for a band; margin
     reads the stack scale above and below and the inline scale left and
     right, or the same layers. */
  padding: { label: "Padding", section: "spacing", preview: "space", sides: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
    options: insetOpts((v) => ({ padding: v })).concat(layerBoth((b, i) => ({ paddingBlock: b, paddingInline: i })), bandPad()) },
  paddingTop: { label: "Padding top", section: "spacing", preview: "space", side: "top", options: insetOpts((v) => ({ paddingTop: v })).concat(layerOpts("stack", (v) => ({ paddingTop: v })), [module((v) => ({ paddingTop: v }))], stepPad("paddingTop")) },
  paddingRight: { label: "Padding right", section: "spacing", preview: "space", side: "right", options: insetOpts((v) => ({ paddingRight: v })).concat(layerOpts("inline", (v) => ({ paddingRight: v })), [module((v) => ({ paddingRight: v }))], sidePad("paddingRight")) },
  paddingBottom: { label: "Padding bottom", section: "spacing", preview: "space", side: "bottom", options: insetOpts((v) => ({ paddingBottom: v })).concat(layerOpts("stack", (v) => ({ paddingBottom: v })), [module((v) => ({ paddingBottom: v }))], stepPad("paddingBottom")) },
  paddingLeft: { label: "Padding left", section: "spacing", preview: "space", side: "left", options: insetOpts((v) => ({ paddingLeft: v })).concat(layerOpts("inline", (v) => ({ paddingLeft: v })), [module((v) => ({ paddingLeft: v }))], sidePad("paddingLeft")) },
  margin: { label: "Margin", section: "spacing", preview: "space", sides: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
    options: BUILDER_SPACE.map((o) => fam("space", tokenOption(o, [`--dt-space-stack-${o}`, `--dt-space-inline-${o}`], { marginBlock: cssVar(`--dt-space-stack-${o}`), marginInline: cssVar(`--dt-space-inline-${o}`) })))
      .concat(layerBoth((b, i) => ({ marginBlock: b, marginInline: i }))) },
  marginTop: { label: "Margin top", section: "spacing", preview: "space", side: "top", options: spaceOpts2("stack", (v) => ({ marginTop: v })).concat(layerOpts("stack", (v) => ({ marginTop: v }))) },
  marginRight: { label: "Margin right", section: "spacing", preview: "space", side: "right", options: spaceOpts2("inline", (v) => ({ marginRight: v })).concat(layerOpts("inline", (v) => ({ marginRight: v }))) },
  marginBottom: { label: "Margin bottom", section: "spacing", preview: "space", side: "bottom", options: spaceOpts2("stack", (v) => ({ marginBottom: v })).concat(layerOpts("stack", (v) => ({ marginBottom: v }))) },
  marginLeft: { label: "Margin left", section: "spacing", preview: "space", side: "left", options: spaceOpts2("inline", (v) => ({ marginLeft: v })).concat(layerOpts("inline", (v) => ({ marginLeft: v }))) },
  w: { label: "Width", section: "size", preview: "text",
    options: [
      fam("fit", tokenOption("hug", [], { width: "fit-content" }, "Hug contents")),
      fam("fit", tokenOption("fill", [], { width: "100%" }, "Fill")),
      /* The page column: what Section reads, so a Group lines up with the
         bands around it, and Configure's Page width moves them together. */
      ...[["narrow", "--dt-layout-page-width-narrow", "page narrow"], ["default", "--dt-layout-page-width", "page"], ["wide", "--dt-layout-page-width-wide", "page wide"]]
        .map(([o, t, name]) => fam("container", tokenOption(o, [t], { width: "100%", maxWidth: cssVar(t), marginInline: "auto" }, name))),
      ...sizeOpts("width", ["control", "icon", "avatar"]),
      ...media("width", [["media-min", "--dt-size-media-min", "media-min"], ["artboard", "--dt-size-artboard-width", "artboard width"]]),
      ...stepOpts("width"),
    ] },
  minW: { label: "Min width", section: "size", preview: "text",
    options: [fam("container", tokenOption("narrow", ["--dt-size-container-narrow"], { minWidth: `min(100%, ${cssVar("--dt-size-container-narrow")})` }, "container narrow"))]
      .concat(sizeOpts("minWidth", ["control", "avatar"]), media("minWidth", [["media-min", "--dt-size-media-min", "media-min"]]), stepOpts("minWidth", [2, 3, 4, 6, 8])) },
  /* Fill takes the room its parent has: all of a set height, or the rest of
     a column (the frame, a Section, a column Group). */
  height: { label: "Height", section: "size", preview: "text",
    options: [
      fam("fit", tokenOption("hug", [], { height: "auto" }, "Hug contents")),
      fam("fit", tokenOption("fill", [], { height: "100%", flexGrow: "1" }, "Fill")),
      fam("container", tokenOption("narrow", ["--dt-size-container-narrow"], { height: cssVar("--dt-size-container-narrow") }, "container narrow")),
      ...sizeOpts("height", ["control", "icon", "avatar"]),
      ...media("height", HEIGHT_MEDIA),
      ...stepOpts("height"),
    ] },
  h: { label: "Min height", section: "size", preview: "text",
    options: [fam("container", tokenOption("narrow", ["--dt-size-container-narrow"], { minHeight: cssVar("--dt-size-container-narrow") }, "container narrow"))]
      .concat(sizeOpts("minHeight", ["control"]), media("minHeight", HEIGHT_MEDIA), stepOpts("minHeight", [2, 4, 6, 8])) },
};
/* The canvas's frame presets: the screens of real devices, not tokens. A
   frame can also take any width and height in between. */
const BUILDER_FRAMES = [
  { id: "phone", label: "Phone", width: 390, height: 844 },
  { id: "phone-lg", label: "Phone, large", width: 430, height: 932 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "laptop", label: "Laptop", width: 1024, height: 768 },
  { id: "desktop", label: "Desktop", width: 1280, height: 800 },
  { id: "wide", label: "Wide", width: 1440, height: 900 },
  /* Social artboards: authored at 1080 and read small, so they bring the
     social type scale with them. */
  { id: "post", label: "Social post", width: 1080, height: 1350, typeScale: "social" },
  { id: "square", label: "Social square", width: 1080, height: 1080, typeScale: "social" },
  { id: "story", label: "Story", width: 1080, height: 1920, typeScale: "social" },
];
/* The builder's own flex group: any components side by side or stacked, with
   a gap from the inline scale (in a row) or the stack scale (in a column). */
const BUILDER_GROUP = {
  blurb: "A flex group of anything",
  group: "layout",
  container: true,
  builder: true,
  href: null,
  props: [
    { name: "direction", kind: "enum", options: ["row", "column"], default: "row", note: "Side by side or stacked", tab: "layout" },
    { name: "gap", kind: "enum", options: ["none"].concat(BUILDER_SPACE, LAYERS), default: "sm", note: "From the inline scale in a row, the stack scale in a column; or a layout layer (related, group, block, section), which moves with the layout's character", tab: "layout" },
    { name: "align", kind: "enum", options: ["flex-start", "center", "flex-end", "stretch"], default: "stretch", note: "Cross axis", tab: "layout" },
    { name: "justify", kind: "enum", options: ["flex-start", "center", "flex-end", "space-between"], default: "flex-start", note: "Main axis", tab: "layout" },
    { name: "wrap", kind: "boolean", default: "false", note: "Let items wrap onto a new line", tab: "layout" },
  ],
};
/* The builder's own shape: a box or a circle with no content, sized and
   painted only by the Size and Appearance tokens. */
const BUILDER_SHAPE = {
  blurb: "A rectangle or ellipse, painted with tokens",
  group: "layout",
  container: false,
  builder: true,
  href: null,
  props: [
    { name: "shape", kind: "enum", options: ["rectangle", "ellipse"], default: "rectangle", note: "Its outline", tab: "appearance" },
  ],
};
/* Grid's minColumnWidth is a CSS length in the component. The builder offers
   it only as multiples of a size token. */
const BUILDER_COLUMN_WIDTHS = [3, 4, 5, 6].map((n) => ({ value: `calc(var(--dt-size-control-lg) * ${n})`, label: `control-lg × ${n}`, token: "--dt-size-control-lg" }));
/* The page root's gap reads a layout layer (builder-frame.js ROOT_GAP). */
const BUILDER_ROOT_GAPS = ["related", "group", "block", "section"];
/* Components the builder arranges children inside. */
const BUILDER_CONTAINERS = ["Group", "Section", "Stack", "Inline", "Grid", "Card"];
/* Components whose children are their items: containers too, but they stay in
   their own category rather than joining Layout. */
const BUILDER_ITEM_HOLDERS = ["Carousel"];
/* Fixed to the viewport when open, or invisible by design: nothing to place. */
const BUILDER_SKIP = new Set(["Dialog", "Drawer", "Sheet", "MenuSheet", "ToastRegion", "Toast", "VisuallyHidden", "Spacer"]);
/* Props a component takes from its app, never set by hand on a page: a
   carousel's controlled index and its outside pause. */
const BUILDER_APP_ONLY = { Carousel: ["value", "paused"] };
/* The inspector's tabs: how a component looks, how it lays out, and what it
   says. Every other prop is content. */
const BUILDER_APPEARANCE_PROPS = ["tone", "dark", "texture", "surface", "variant", "size", "titleSize", "scrim", "radius", "shape", "weight", "underline", "translucent", "dense", "zebra", "divided", "dot", "fit", "ratio", "drive", "feel", "expression", "pace", "entrance", "focusOnly"];
const BUILDER_LAYOUT_PROPS = ["direction", "width", "spacing", "spacingTop", "spacingBottom", "bleed", "layer", "gap", "columns", "track", "align", "justify", "wrap", "orientation", "layout", "labelPosition", "placement", "fullWidth", "reverse", "block", "sticky", "itemRatio", "itemSize", "spread", "depth"];
/* Stack, Inline and Grid type align and justify as CSS keywords. */
const BUILDER_KEYWORDS = {
  align: ["flex-start", "center", "flex-end", "stretch"],
  justify: ["flex-start", "center", "flex-end", "space-between"],
};

function declaredTokens() {
  const names = new Set();
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith(".css")) for (const m of read(full).matchAll(/(--dt-[\w-]+)\s*:/g)) names.add(m[1]);
    }
  };
  walk(path.join(SYS, "tokens"));
  return names;
}

/* A layout that shows the format, checked at build like everything else: a
   prop, enum value or token it names that doesn't exist fails the build, so
   the reference can't drift from what the builder accepts. */
const BUILDER_EXAMPLE = {
  frames: [{
    name: "Launch", width: 1280, height: 800, hug: true, surface: "base",
    root: { children: [
      { type: "HeroBlock", props: { eyebrow: "Early access", title: "Plan the week in one place", lead: "Tasks, notes and the calendar, side by side." } },
      { type: "Section", props: { width: "narrow" }, children: [
        { type: "Group", name: "Sign-up", props: { direction: "column", gap: "md" }, style: { padding: "lg", surface: "subtle", radius: "container" }, children: [
          { type: "Heading", props: { children: "Get on the list" } },
          { type: "Text", props: { children: "One email when it opens. Nothing else." } },
          { type: "Group", props: { direction: "row", gap: "sm", align: "center" }, children: [
            { type: "Shape", props: { shape: "ellipse" }, style: { w: "x1", height: "x1", surface: "brand-muted" } },
            { type: "Button", props: { children: "Join the list" } },
          ] },
        ] },
      ] },
    ] },
  }],
};

function checkLayout(layout, meta, tokens) {
  const problems = [];
  const walk = (n, where) => {
    const m = meta[n.type];
    if (!m) { problems.push(`${where}: unknown type ${n.type}`); return; }
    const names = m.props.map((p) => p.name).concat(m.builder ? [] : ["children"]);
    for (const [k, v] of Object.entries(n.props || {})) {
      const spec = m.props.find((p) => p.name === k);
      if (!names.includes(k)) problems.push(`${where} ${n.type}: no prop ${k}`);
      else if (spec && spec.kind === "enum" && !spec.options.includes(v)) problems.push(`${where} ${n.type}: ${k} "${v}" isn't one of ${spec.options.join(", ")}`);
    }
    for (const [k, v] of Object.entries(n.style || {})) {
      if (!tokens[k]) problems.push(`${where} ${n.type}: no style key ${k}`);
      else if (!tokens[k].options.some((o) => o.value === v)) problems.push(`${where} ${n.type}: ${k} "${v}" isn't a token option`);
    }
    if (n.children && !m.container) problems.push(`${where} ${n.type}: only containers hold children`);
    (n.children || []).forEach((c, i) => walk(c, `${where}.${i}`));
  };
  layout.frames.forEach((f, i) => (f.root.children || []).forEach((c, j) => walk(c, `frame ${i} child ${j}`)));
  if (problems.length) throw new Error(`builder: the example layout doesn't match the builder:\n  ${problems.join("\n  ")}`);
}

/* assets/builder-layouts.md: the builder's layout format, written from the
   same data the builder reads, for a person or an agent (Claude) composing a
   layout to open on the canvas. llms.txt and the dovetail-setup skill point
   here. */
function buildBuilderFormat(meta, groups, tokens) {
  checkLayout(BUILDER_EXAMPLE, meta, tokens);
  const link = `${SITE_URL}builder.html#b=${Buffer.from(JSON.stringify(BUILDER_EXAMPLE)).toString("base64url")}`;
  const code = (s) => "`" + s + "`";
  const list = (xs) => xs.map(code).join(", ");
  const containers = Object.keys(meta).filter((n) => meta[n].container);
  const propLine = (p) => {
    const slot = p.kind === "node" && (p.accepts || /^(actions|media|footer|aside|extra|start|end|leading|trailing)$/.test(p.name));
    const kind = p.kind === "enum" ? `one of ${list(p.options)}` : p.kind === "media" ? "an https URL" : p.kind === "url" ? "a link: #page:<page id> for a page of the project, or an https, /, # or relative address" : slot ? `a slot${p.accepts ? ` taking ${list(p.accepts)}` : ""}`
      : p.kind === "list" ? (p.of === "text" ? "a list of text" : `a list of { ${p.fields.map((f) => f.name + (f.optional ? "?" : "")).join(", ")} }`) : p.kind === "node" ? "text" : p.kind;
    return `${code(p.name)} (${kind}${p.default != null && p.default !== "" ? `; default ${code(p.default)}` : ""})`;
  };
  const lines = [
    `# Builder layouts`,
    ``,
    `<!-- GENERATED by tools/build-site.mjs (buildBuilderFormat) from the builder's own data. Do not edit. -->`,
    ``,
    `The Dovetail builder (${SITE_URL}builder.html) opens a layout written as JSON, so a screen composed elsewhere (by hand, or by Claude) arrives on its canvas as layers to keep editing. Every component, prop and token below is one the builder can set. Anything else in a layout is left out when it opens, and the builder lists what it left out.`,
    ``,
    `## Opening a layout`,
    ``,
    `- **As a link:** ${code(`${SITE_URL}builder.html#b=<layout>`)}, where ${code("<layout>")} is the layout's JSON, UTF-8 encoded, in base64url (no padding). In Node: ${code("Buffer.from(JSON.stringify(layout)).toString(\"base64url\")")}. The dovetail-setup skill's ${code("scripts/builder-link.mjs")} does this for a file.`,
    `- **By pasting:** in the builder, Start from, then Paste a layout. Paste the JSON, a link or JSX. Choose to add its frames beside yours or to replace them.`,
    `- **As JSX:** paste JSX that uses Dovetail components, or press Open in builder on a JSX example in the docs (${code(`${SITE_URL}builder.html#jsx=<jsx>`)}, the JSX in base64url), which adds it as a frame beside yours. Tags, text and literal props come in, a ${code("<div>")} becomes a Group, ${code("style={{ … }}")} values that match a token become that token, and a slot prop written as JSX (${code("actions={<>…</>}")}) fills the slot. Code can't run in the builder, so handlers, variables and spread props are listed and left out, and ${code("items.map((it) => <Card … />)")} comes in as sample Cards filled from their defaults. The Code dialog's JSX pastes back.`,
    ``,
    `A link carries no uploaded files, so give images an https URL.`,
    ``,
    `## The layout`,
    ``,
    "```json",
    `{ "frames": [ { "name": "Home", "width": 1280, "height": 800, "hug": true, "root": { "children": [ ...nodes ] } } ] }`,
    "```",
    ``,
    `The paste box also takes a single frame, a single node, or an array of nodes, and puts them in one frame.`,
    ``,
    `### Frame`,
    ``,
    `| Field | Value | Default |`,
    `|---|---|---|`,
    `| ${code("name")} | text | "Frame 1" |`,
    `| ${code("width")} | pixels, 16 to 3840 on a free frame, 200 to 3840 on a structured one | 1280 |`,
    `| ${code("height")} | pixels, 16 to 12000 on a free frame, 200 to 12000 on a structured one | 800 |`,
    `| ${code("hug")} | ${code("true")}: the height follows the content | ${code("false")} |`,
    `| ${code("dark")} | ${code("true")} for dark mode | ${code("false")} |`,
    `| ${code("surface")} | the page fill: ${list(tokens.surface.options.map((o) => o.value))} | ${code("base")} |`,
    `| ${code("spacing")} | layout character: ${list(["tight", "balanced", "open"])} | page default |`,
    `| ${code("gap")} | space between top-level blocks: ${list(BUILDER_ROOT_GAPS)} | none (${code("block")} on a new structured page) |`,
    `| ${code("typeScale")} | ${code("social")}: type sized for a 1080 artboard read in a feed (${code("data-type-scale=\"social\"")}) | page sizes |`,
    `| ${code("mode")} | ${code("free")}: items may sit anywhere on it and take custom colours; ${code("structured")}: everything sits in Groups, in the flow, with tokens only, and each Group gets a direction, ${code("gap")} and padding | ${code("free")} |`,
    `| ${code("canvas")} | a custom page colour, ${code("#rrggbb")}, in a free frame | none |`,
    `| ${code("lock")} | ${code("true")}: width and height keep their proportions | ${code("false")} |`,
    `| ${code("x")}, ${code("y")} | where the frame sits on the canvas, in pixels; leave them out to line frames up side by side | side by side |`,
    `| ${code("bare")} | ${code("true")}: a loose object on the canvas, with no frame around it, as wide as what's in it | ${code("false")} |`,
    `| ${code("root")} | ${code("{ \"children\": [ ...nodes ] }")} | empty |`,
    ``,
    `Device sizes: ${BUILDER_FRAMES.map((f) => `${f.label} ${f.width} × ${f.height}`).join(", ")}.`,
    ``,
    `### Node`,
    ``,
    "```json",
    `{ "type": "Heading", "props": { "children": "Hello" }, "style": { "padding": "md" } }`,
    "```",
    ``,
    `- ${code("type")}: a component from the list below.`,
    `- ${code("props")}: only the props listed for it, as plain strings, numbers and booleans, and an enum value only from its options. A prop marked "a list of { … }" takes an array of objects with those fields (a ${code("?")} marks one you may leave out), and "a list of text" an array of strings. A component's text is ${code("props.children")}. Leave a prop out to keep the sample content the builder starts it with.`,
    `- ${code("style")}: keys from the style table, each set to one of its option names. Never a CSS value, with three exceptions in a free frame: ${code("x")} and ${code("y")} place a top-level item (whole steps of ${code("--dt-space-inset-2xs")}), and ${code("fill")} and ${code("color")} take a custom ${code("#rrggbb")} background and text colour.`,
    `- ${code("children")}: an array of nodes, only on containers: ${list(containers)}.`,
    `- On any other component, ${code("children")} may hold its slots instead: ${code('{ "type": "Slot", "props": { "name": "actions" }, "children": [ ...nodes ] }')}. A slot stands for one of the component's element props (a hero's ${code("actions")} or ${code("media")}, marked "a slot" below). What's in it renders into that prop and exports as JSX in it. Leave a slot out to keep the sample's own content.`,
    `- ${code("name")}: a label for a container, shown in the layers.`,
    `- ${code("id")}: optional. The builder assigns one.`,
    ``,
    `Group is the builder's own flex container (a ${code("div")}), and Shape its rectangle or ellipse. Both export as plain elements styled with tokens.`,
    ``,
    `## Style keys`,
    ``,
    `| Key | What it sets | Options |`,
    `|---|---|---|`,
    ...Object.entries(tokens).map(([k, d]) => `| ${code(k)} | ${d.label} | ${list(d.options.map((o) => o.value))} |`),
    ``,
    `A side key (${code("paddingTop")}, ${code("borderLeft")} and the like) overrides the all-sides key for that side. Sizes named ${code("x1")} to ${code("x12")} are that many times ${code("--dt-size-control-lg")}.`,
    ``,
    `## Components`,
    ``,
  ];
  for (const g of groups) {
    lines.push(`### ${g.label}`, ``);
    for (const n of g.items) {
      const m = meta[n];
      const props = m.props.map(propLine);
      lines.push(`- **${n}**${m.container ? " (container)" : ""}: ${m.blurb || ""}.${props.length ? ` Props: ${props.join(", ")}.` : ""}`);
    }
    lines.push(``);
  }
  lines.push(
    `## Example`,
    ``,
    `[Open this layout in the builder](${link})`,
    ``,
    "```json",
    JSON.stringify(BUILDER_EXAMPLE, null, 2),
    "```",
    ``,
    `## What doesn't carry over`,
    ``,
    `- Raw values: pixels, custom CSS or class names, and colours outside a free frame. Use the style keys.`,
    `- Free positions inside a container or in a structured frame. Those sit in the flow.`,
    `- React elements in props that aren't slots (a popover's trigger, an icon). The component keeps its sample content there.`,
    `- Handlers, state and data mapped into lists.`,
    ``
  );
  write("assets/builder-layouts.md", lines.join("\n"));
}

function buildBuilder() {
  const declared = declaredTokens();
  const missing = [];
  const need = (t) => { if (!declared.has(t)) missing.push(t); return t; };
  const tokens = {};
  for (const [key, def] of Object.entries(BUILDER_TOKENS)) {
    def.options.forEach((o) => o.tokens.forEach(need));
    tokens[key] = def;
  }
  BUILDER_SPACE.forEach((g) => { need(`--dt-space-inline-${g}`); need(`--dt-space-stack-${g}`); });
  BUILDER_COLUMN_WIDTHS.forEach((w) => need(w.token));
  BUILDER_ROOT_GAPS.forEach((g) => need(`--dt-layout-stack-${g}`));
  if (missing.length) throw new Error(`builder: tokens that don't exist: ${missing.join(", ")}`);

  const meta = {};
  const groups = [];
  const entry = (c) => {
    /* A free-form length, URL or breakpoint isn't a token, so it isn't a
       control here: the inspector would be handing out raw values. Enums keep
       their names (Section's width is a token scale). children has its own
       Text field. */
    const appOnly = BUILDER_APP_ONLY[c.name] || [];
    let props = playgroundProps(c).filter((p) => p.name !== "children" && !appOnly.includes(p.name) &&
      !(p.kind !== "enum" && !(p.kind === "node" && p.name === "media") && /^(minHeight|minColumnWidth|media|href|src|poster|background\w*|collapseBelow|width|height|maxRows|position|imagePosition|stickyTop|radius|measure|htmlFor|labelId|messageId)$/.test(p.name)));
    props = props.concat(builderExtraProps(c, new Set(playgroundProps(c).map((p) => p.name).concat(appOnly))));
    props = props.map((p) => (BUILDER_KEYWORDS[p.name] && !p.options ? { ...p, kind: "enum", options: BUILDER_KEYWORDS[p.name] } : p));
    /* align and justify are CSSProperties types, which playgroundProps skips. */
    const src = c.types ? read(path.join(ROOT, c.types)) : "";
    for (const k of Object.keys(BUILDER_KEYWORDS)) {
      if (!props.some((p) => p.name === k) && new RegExp(`\\n\\s*${k}\\?:\\s*React\\.CSSProperties`).test(src)) {
        props.push({ name: k, kind: "enum", options: BUILDER_KEYWORDS[k], default: null, note: "" });
      }
    }
    props.forEach((p) => { p.tab = BUILDER_APPEARANCE_PROPS.includes(p.name) ? "appearance" : BUILDER_LAYOUT_PROPS.includes(p.name) ? "layout" : "content"; });
    /* An image or video source takes an upload or a URL, never typed CSS. */
    const media = ["Image", "Cover", "Video"].includes(c.name) ? ["src"].concat(c.name === "Video" ? ["poster"] : []) : [];
    media.forEach((name) => props.push({ name, kind: "media", options: null, default: null, note: name === "poster" ? "Shown before the video plays" : "The picture or clip", tab: "content" }));
    /* A link goes to one of the project's pages or a safe address, through
       the inspector's Link to control rather than typed CSS. */
    if (!props.some((p) => p.name === "href") && /\n\s*href\??:\s*string/.test(src)) props.push({ name: "href", kind: "url", options: null, default: null, note: "Where it goes: a page of the project, or a web address", tab: "content" });
    meta[c.name] = {
      blurb: NAV_BLURB[c.name] || String(c.summary || "").replace(/[`*_]/g, "").split(". ")[0],
      group: c.group,
      container: BUILDER_CONTAINERS.includes(c.name) || BUILDER_ITEM_HOLDERS.includes(c.name),
      href: `components/${c.name}.html`,
      props,
    };
    return c.name;
  };
  meta.Group = BUILDER_GROUP;
  meta.Shape = BUILDER_SHAPE;
  const layout = BUILDER_CONTAINERS.concat(["Divider"]).map((n) => components.find((c) => c.name === n)).filter(Boolean);
  groups.push({ id: "layout", label: "Layout", items: ["Group", "Shape"].concat(layout.map(entry)) });
  for (const g of GROUP_ORDER) {
    const items = byGroup(g).filter((c) => !BUILDER_SKIP.has(c.name) && !layout.includes(c)).map(entry);
    if (items.length) groups.push({ id: g, label: GROUP_LABEL[g], items });
  }

  write("assets/builder-data.js",
    "/* GENERATED by tools/build-site.mjs (buildBuilder): what the builder can place and the tokens it may offer. Do not edit. */\n" +
    `window.DovetailBuilderData = ${JSON.stringify({ groups, components: meta, tokens, columnWidths: BUILDER_COLUMN_WIDTHS, rootGaps: BUILDER_ROOT_GAPS, frames: BUILDER_FRAMES })};\n`);
  buildBuilderFormat(meta, groups, tokens);

  /* The canvas loads its own copies of the bundle, the specimens and its
     script; the stamps keep each one fresh after a deploy. */
  const frameSrc = `assets/builder-frame.html?b=${hashOf(path.join(ROOT, "system/components/bundle.js"))}` +
    `&s=${hashOf(path.join(ROOT, "assets/specimens.js"))}&d=${hashOf(path.join(ROOT, "assets/builder-data.js"))}` +
    `&f=${hashOf(path.join(ROOT, "assets/builder-frame.js"))}`;

  const body = `<link rel="stylesheet" href="assets/builder.css">
<h1 class="visually-hidden">Builder</h1>
<div class="builder" id="builder" data-frame="${attr(frameSrc)}">
  <noscript><p class="builder-noscript">The builder needs JavaScript.</p></noscript>
  <p class="builder-loading muted">Loading the builder…</p>
</div>`;
  const scripts =
    `<script src="system/components/lib/react.production.min.js" defer></script>\n` +
    `<script src="system/components/lib/react-dom.production.min.js" defer></script>\n` +
    `<script src="system/components/bundle.js" defer></script>\n` +
    `<script src="assets/specimens.js" defer></script>\n` +
    `<script src="assets/builder-data.js" defer></script>\n` +
    `<script src="assets/builder.js" defer></script>\n`;
  writePage("builder.html", {
    title: "Builder",
    lede: "Drag components and blocks onto a canvas and arrange new screens, styled only with tokens.",
    body,
    active: "builder",
    root: "",
    app: true,
    scripts,
  });
}

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
        ["system/tokens/themes/theme-editorial.css", "Warm primary colour, serif headings, pill controls."],
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
      ],
    ],
  ];
  const body = `
${breadcrumb("", [{ label: "Dovetail", href: "index.html" }, { label: "Download" }])}
<h1>Take it with you</h1>
<p class="lede">Install the React package from npm, or link the stylesheets straight from this site. Either way, add a theme file and the system is yours.</p>

<section class="prose">
  <h2 id="npm">Install from npm</h2>
  <p><a href="https://www.npmjs.com/package/@dovetail-ds/react"><code>@dovetail-ds/react</code></a> has every component, typed, with the stylesheets. React 18 or newer is the only peer dependency; install <code>react-dom</code> alongside, since your app renders with it and npm won't add it for you.</p>
</section>
<pre class="code" data-lang="sh"><code>npm install @dovetail-ds/react react react-dom</code></pre>
<p>Import the stylesheets once at your app's root, your theme last:</p>
<pre class="code" data-lang="jsx"><code>${esc(`import "@dovetail-ds/react/fonts.css"; // optional: Geist from Google Fonts
import "@dovetail-ds/react/styles.css";
import "./dovetail-theme.css"; // from Configure, or written by the setup skill

import { Button, Section, Stack } from "@dovetail-ds/react";`)}</code></pre>

<section class="prose">
  <h2 id="claude-code">Set up with Claude Code</h2>
  <p>The package ships a Claude Code skill that asks about your brand, or takes a theme you downloaded from Configure, then writes the theme and wires it into your app. Copy it in, then ask Claude to “set up Dovetail with our brand”.</p>
</section>
<pre class="code" data-lang="sh"><code>${esc(`mkdir -p .claude/skills
cp -r node_modules/@dovetail-ds/react/skills/dovetail-setup .claude/skills/`)}</code></pre>

<section class="prose">
  <h2 id="link">Link from this site</h2>
  <p>The whole system is served from this site under <code>system/</code>, at the paths it was authored with. Link one stylesheet and you have the tokens.</p>
</section>
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
  <p>Component sources, typed contracts, per-component guides, the foundation spec cards and the templates all sit under <code>system/</code> in the repository, unchanged from how they were authored. The preview documents in <code>previews/</code> are the same cards with three script tags added so each one runs on its own.</p>
</section>
`;
  writePage("downloads.html", { title: "Download", lede: "Take the stylesheets, tokens and components into your project.", body, active: "downloads", root: "" });
}

/* -------------------------------------------------------------------- run */

syncLegacyBundle();
buildConfigureData();
buildGraphData();
buildSearchData();
buildHome();
buildFoundations();
buildComponents();
buildShowcase();
buildGuide();
buildTokens();
buildDownloads();
buildBuilder();
buildLlmsTxt();

console.log(`Built ${written.length} pages from ${components.length} components and ${cards.size} cards.`);
