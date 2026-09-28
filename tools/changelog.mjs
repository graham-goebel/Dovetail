#!/usr/bin/env node
/* Dovetail's changelog tool. The strategy behind it is in docs/changelog.md.

   Every pull request that changes what the system ships adds one small file
   to changes/, instead of editing CHANGELOG.md. Entries never conflict with
   each other, each is reviewed with the code it describes, and a release
   compiles them into CHANGELOG.md in one step.

     npm run change -- my-slug             start an entry: changes/my-slug.md
     npm run changelog                     preview the next release's notes
     npm run check:changes                 validate every entry
     node tools/changelog.mjs --check --base origin/main
                                           also fail if system sources changed
                                           since that ref and no entry was added
     node tools/changelog.mjs --release    compile entries into CHANGELOG.md,
                                           bump package.json, delete the entries
       [--version 1.4.0] [--date 2026-10-01] [--dry-run]

   An entry is Markdown with a small front matter block:

     ---
     type: added          added | changed | deprecated | removed | fixed | security
     bump: minor          major | minor | patch | none
     area: components     tokens | components | styles | themes | templates | site | tooling
     components: [Thinking]
     tokens: [--dt-thinking-screen-light]
     visual: true         optional: the change is visible without any code change
     ---
     One sentence, in the consumer's terms.

     Optional detail. A major entry must include a "## Migration" section. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "changes");
const LOG = path.join(ROOT, "CHANGELOG.md");
const PKG = path.join(ROOT, "package.json");

const TYPES = ["added", "changed", "deprecated", "removed", "fixed", "security"];
const BUMPS = ["major", "minor", "patch", "none"];
const AREAS = ["tokens", "components", "styles", "themes", "templates", "site", "tooling"];
const HEADINGS = { added: "Added", changed: "Changed", deprecated: "Deprecated", removed: "Removed", fixed: "Fixed", security: "Security" };

/* What "changes what the system ships" means for the --base check: sources
   under system/ and the site's own behaviour, but not files a build writes. */
const SHIPPED = /^(system\/(components|tokens|templates|kits|styles\.css|tokens\.css|tokens\.json|support\.js)|assets\/(theme|site)\.(js|css))/;
const GENERATED = /(^system\/components\/bundle\.js$|^system\/_ds_bundle\.js$|^system\/templates\/_support\/card-kit\.js$)/;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function parse(file) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { file, errors: ["no front matter block (--- … ---) at the top"] };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*?)\s*(#.*)?$/);
    if (!kv) continue;
    let v = kv[2];
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "true" || v === "false") v = v === "true";
    meta[kv[1]] = v;
  }
  const body = m[2].trim();
  const [summary, ...rest] = body.split(/\n\s*\n/);
  const entry = { file, slug: path.basename(file, ".md"), ...meta, summary: (summary || "").replace(/\s*\n\s*/g, " ").trim(), detail: rest.join("\n\n").trim(), errors: [] };
  if (!TYPES.includes(entry.type)) entry.errors.push(`type must be one of ${TYPES.join(", ")}`);
  if (!BUMPS.includes(entry.bump)) entry.errors.push(`bump must be one of ${BUMPS.join(", ")}`);
  if (entry.area && !AREAS.includes(entry.area)) entry.errors.push(`area must be one of ${AREAS.join(", ")}`);
  if (!entry.summary || /^TODO/i.test(entry.summary)) entry.errors.push("needs a one-sentence summary under the front matter");
  if (entry.bump === "major" && !/^##\s+Migration/im.test(entry.detail)) entry.errors.push('a major change needs a "## Migration" section');
  if (entry.type === "removed" && entry.bump !== "major" && entry.bump !== "none") entry.errors.push("removing something consumers use is a major change");
  if (entry.type === "deprecated" && !/remov/i.test(entry.summary + entry.detail)) entry.errors.push("say when the deprecated thing will be removed");
  return entry;
}

function entries() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md").sort().map((f) => parse(path.join(DIR, f)));
}

function nextVersion(current, list) {
  const [maj, min, pat] = current.split(".").map(Number);
  const has = (b) => list.some((e) => e.bump === b);
  /* Below 1.0 the leading zero means "unstable": a breaking change bumps the
     minor number and everything else bumps the patch. */
  if (maj === 0) {
    if (has("major") || has("minor")) return `0.${min + 1}.0`;
    return has("patch") ? `0.${min}.${pat + 1}` : current;
  }
  if (has("major")) return `${maj + 1}.0.0`;
  if (has("minor")) return `${maj}.${min + 1}.0`;
  if (has("patch")) return `${maj}.${min}.${pat + 1}`;
  return current;
}

function line(e) {
  const tags = [...(e.components || []).map((c) => "`" + c + "`"), ...(e.tokens || []).map((t) => "`" + t + "`")];
  const visual = e.visual ? " *(visual)*" : "";
  return `- ${e.summary}${visual}${tags.length ? " " + tags.join(" ") : ""}`;
}

function indent(text) {
  return text
    .split("\n")
    .map((l) => (l ? "  " + l.replace(/^##\s+/, "**").replace(/^(\*\*.*)$/, "$1**") : l))
    .join("\n");
}

function notes(version, date, list) {
  const shown = list.filter((e) => e.bump !== "none" || e.type === "security");
  const out = [`## ${version} - ${date}`, ""];
  const breaking = shown.filter((e) => e.bump === "major");
  if (breaking.length) {
    out.push("### Breaking changes", "");
    for (const e of breaking) out.push(line(e), "", indent(e.detail), "");
  }
  for (const type of TYPES) {
    const group = shown.filter((e) => e.type === type && e.bump !== "major");
    if (!group.length) continue;
    out.push(`### ${HEADINGS[type]}`, "");
    for (const e of group) {
      out.push(line(e));
      if (e.detail) out.push("", indent(e.detail), "");
    }
    out.push("");
  }
  if (!shown.length) out.push("Maintenance only; nothing a consumer needs to act on.", "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function changedSince(base) {
  const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRD", `${base}...HEAD`], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

/* ------------------------------------------------------------------ commands */

const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
const list = entries();

if (flag("--new")) {
  const slug = (option("--new") || "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  if (!slug) {
    console.error("Give the entry a short slug: npm run change -- thinking-light-screen");
    process.exit(1);
  }
  const file = path.join(DIR, slug + ".md");
  if (fs.existsSync(file)) {
    console.error(`changes/${slug}.md already exists`);
    process.exit(1);
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(
    file,
    `---
type: ${option("--type") || "added"}
bump: ${option("--bump") || "minor"}
area: ${option("--area") || "components"}
components: []
tokens: []
visual: false
---
TODO: one sentence, in the consumer's terms: what changed and what they can now do.
`
  );
  console.log(`Created changes/${slug}.md. Fill it in and commit it with your change.`);
} else if (flag("--check")) {
  const errors = list.flatMap((e) => e.errors.map((err) => `changes/${path.basename(e.file)}: ${err}`));
  const base = option("--base");
  if (base) {
    const changed = changedSince(base);
    const shipped = changed.filter((f) => SHIPPED.test(f) && !GENERATED.test(f));
    const added = changed.filter((f) => /^changes\/.+\.md$/.test(f) && !f.endsWith("README.md"));
    if (shipped.length && !added.length) {
      errors.push(
        `This branch changes what the system ships (${shipped.slice(0, 3).join(", ")}${shipped.length > 3 ? ", …" : ""}) but adds no changes/ entry.\n` +
          "  Add one with `npm run change -- <slug>`. If nothing a consumer sees changed, use `bump: none`."
      );
    }
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`changes: ${list.length} entr${list.length === 1 ? "y" : "ies"}, all valid`);
} else if (flag("--release")) {
  const bad = list.filter((e) => e.errors.length);
  if (bad.length) {
    console.error("Fix these entries first:\n" + bad.map((e) => `  changes/${path.basename(e.file)}: ${e.errors.join("; ")}`).join("\n"));
    process.exit(1);
  }
  if (!list.length) {
    console.error("No entries in changes/; nothing to release.");
    process.exit(1);
  }
  const version = option("--version") || nextVersion(pkg.version, list);
  const date = option("--date") || new Date().toISOString().slice(0, 10);
  const section = notes(version, date, list);
  const log = fs.readFileSync(LOG, "utf8");
  const at = log.search(/^## /m);
  const updated = at === -1 ? log.trimEnd() + "\n\n" + section : log.slice(0, at) + section + "\n" + log.slice(at);
  if (flag("--dry-run")) {
    console.log(section);
  } else {
    fs.writeFileSync(LOG, updated);
    pkg.version = version;
    fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + "\n");
    for (const e of list) fs.unlinkSync(e.file);
    console.log(`Released ${version}: ${list.length} entries compiled into CHANGELOG.md, package.json bumped.`);
    console.log(`Next: commit "Release ${version}", tag v${version}, and publish the section as a GitHub release.`);
  }
} else {
  if (!list.length) console.log(`No unreleased changes since ${pkg.version}.`);
  else console.log(notes(nextVersion(pkg.version, list) + " (unreleased)", new Date().toISOString().slice(0, 10), list));
}
