#!/usr/bin/env node
/* Builds the component bundle, and the card kit the preview cards share.

   Run it after editing any .jsx under system/components/ or the card kit:

     npm run build          (this, then the site build)
     node tools/build-bundle.mjs

   What it writes, all committed and all generated (never edit them by hand):

     system/components/bundle.js   every component, as one classic script
     system/_ds_bundle.js          the same file, for cards that load it by that name
     system/templates/_support/card-kit.js   compiled from card-kit.jsx

   The bundle keeps the shape the site and the cards already rely on: a header
   comment carrying a JSON manifest, a preamble that sets up the namespace, one
   try-wrapped block per source file, then the namespace assignments. Blocks
   keep their existing order, so a rebuild with no source changes is a no-op,
   and a new .jsx is found by scanning the folder and appended. Every export of
   a new file becomes a component on the namespace.

   With --check it writes nothing and exits 1 if any output is out of date,
   which is what CI runs. */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { transformSync } from "@babel/core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYS = path.join(ROOT, "system");
const BUNDLE = path.join(SYS, "components", "bundle.js");
const LEGACY = path.join(SYS, "_ds_bundle.js");
const KIT_SRC = path.join(SYS, "templates", "_support", "card-kit.jsx");
const KIT_OUT = path.join(SYS, "templates", "_support", "card-kit.js");
const CHECK = process.argv.includes("--check");

const REACT = [["@babel/preset-react", { runtime: "classic" }]];

function compile(src, plugins) {
  return transformSync(src, {
    presets: plugins ? [] : REACT,
    plugins: plugins || [],
    configFile: false,
    babelrc: false,
    comments: true,
  }).code;
}

/* Every .jsx under system/components/, as a path relative to system/. The
   vendored React in components/lib is plain .js and so never matches. */
function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".jsx")) out.push(path.relative(SYS, full).split(path.sep).join("/"));
    }
  })(path.join(SYS, "components"));
  return out.sort();
}

const exportsOf = (src) => [...src.matchAll(/^export (?:function|const|class|let|var) (\w+)/gm)].map((m) => m[1]);

function buildBundle() {
  const bundle = fs.readFileSync(BUNDLE, "utf8");
  const headerEnd = bundle.indexOf("*/") + 2;
  const manifest = JSON.parse(bundle.slice(0, headerEnd).match(/@ds-bundle:\s*([\s\S]*?)\s*\*\/$/)[1]);
  const body = bundle.slice(headerEnd);
  const firstBlock = body.indexOf("\n// components/");
  const firstNs = body.indexOf("\n__ds_ns.");
  const preamble = body.slice(0, firstBlock);
  let tail = body.slice(firstNs);

  /* Existing blocks first, in their order; then anything new on disk. A block
     whose source has been deleted is dropped. */
  const onDisk = new Set(sourceFiles());
  const existing = [...body.slice(firstBlock, firstNs).matchAll(/^\/\/ (components\/[^\n]+)$/gm)].map((m) => m[1]);
  const blockPaths = existing.filter((p) => onDisk.has(p));
  const added = [...onDisk].filter((p) => !existing.includes(p));
  blockPaths.push(...added);

  const sources = Object.fromEntries(blockPaths.map((p) => [p, fs.readFileSync(path.join(SYS, p), "utf8")]));
  const owner = {};
  for (const p of blockPaths) for (const n of exportsOf(sources[p])) owner[n] = p;

  const blocks = blockPaths.map((p) => {
    const src = sources[p];
    const names = exportsOf(src);
    const stripped = src.replace(/^import[^\n]*\n/gm, "").replace(/^export (function|const|class|let|var) /gm, "$1 ");
    let code = compile(stripped);
    /* A reference to another file's component becomes a lazy __ds_scope.X
       lookup, so a block may load before the block it depends on. */
    const siblings = new Set(Object.keys(owner).filter((n) => owner[n] !== p));
    code = compile(code, [
      ({ types: t }) => ({
        visitor: {
          Identifier(ref) {
            const n = ref.node.name;
            if (!siblings.has(n) || !ref.isReferencedIdentifier() || ref.scope.hasBinding(n)) return;
            ref.replaceWith(t.memberExpression(t.identifier("__ds_scope"), t.identifier(n)));
          },
        },
      }),
    ]);
    manifest.sourceHashes[p] = crypto.createHash("sha256").update(src).digest("hex").slice(0, 12);
    return (
      `// ${p}\n` +
      `try { (() => {\n${code}\nObject.assign(__ds_scope, { ${names.join(", ")} });\n` +
      `})(); } catch (e) { __ds_ns.__errors.push({ path: "${p}", error: String((e && e.message) || e) }); }`
    );
  });

  for (const p of Object.keys(manifest.sourceHashes)) if (!onDisk.has(p)) delete manifest.sourceHashes[p];
  for (const p of added) {
    for (const n of exportsOf(sources[p])) {
      if (!manifest.components.some((c) => c.name === n)) manifest.components.push({ name: n, sourcePath: p });
      if (!tail.includes(`__ds_ns.${n} = `)) tail = tail.replace(/\n\}\)\(\);\s*$/, `\n__ds_ns.${n} = __ds_scope.${n};\n\n})();\n`);
    }
  }

  return {
    text: `/* @ds-bundle: ${JSON.stringify(manifest)} */` + preamble + "\n" + blocks.join("\n") + tail,
    blocks: blocks.length,
    components: manifest.components.length,
    added,
  };
}

function buildKit() {
  const header =
    "/* GENERATED from card-kit.jsx by tools/build-bundle.mjs. Edit the .jsx and rebuild.\n" +
    "   Card kit: the shared chrome for @dsCard component pages (Shelf, PropTable,\n" +
    "   Guidance, Specimen, PageHead), as globals the cards call. */\n";
  return header + compile(fs.readFileSync(KIT_SRC, "utf8")) + "\n";
}

const bundle = buildBundle();
const outputs = [
  [BUNDLE, bundle.text],
  [LEGACY, bundle.text],
  [KIT_OUT, buildKit()],
];

const stale = outputs.filter(([file, text]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text);
if (CHECK) {
  if (stale.length) {
    console.error("Out of date: " + stale.map(([f]) => path.relative(ROOT, f)).join(", "));
    console.error("Run `npm run build` and commit the result.");
    process.exit(1);
  }
  console.log("bundle and card kit are current");
} else {
  for (const [file, text] of stale) fs.writeFileSync(file, text);
  console.log(
    `bundle: ${bundle.blocks} blocks, ${bundle.components} components` +
      (bundle.added.length ? ` (added ${bundle.added.join(", ")})` : "") +
      `; ${stale.length ? "wrote " + stale.map(([f]) => path.relative(ROOT, f)).join(", ") : "nothing changed"}`
  );
}
