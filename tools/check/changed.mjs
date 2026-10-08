#!/usr/bin/env node
/* Which browser checks a pull request needs, from the files it changes.

   The build job always runs: it's thirty seconds and it checks the generated
   files and the changelog. The browser checks are the slow part, and a pull
   request that only adds a changelog entry, edits a Markdown page, or is the
   release itself has nothing for them to find. Generated pages count as
   changes, so a docs edit that rebuilt a guide page still gets the site
   check, and an edit that forgot to rebuild fails the build job as before.

     node tools/check/changed.mjs origin/main     decide from the diff
     node tools/check/changed.mjs --all           everything (main, dispatch)

   Prints `site=`, `behavior=` and `builder=` lines, and appends them to
   $GITHUB_OUTPUT when set. classify() is exported for the unit test. */

import { execFileSync } from "node:child_process";
import fs from "node:fs";

/* A file that touches nothing a browser check looks at. */
const QUIET = [
  /^changes\//, /^CHANGELOG\.md$/, /^docs\//, /^LICENSE/, /^\.gitignore$/, /^\.editorconfig$/,
  /^\.github\/(?!workflows\/checks\.yml)/, /^\.claude\//, /^skills-lock\.json$/,
  /^tools\/check\/unit\//, /^tools\/changelog\.mjs$/, /^tools\/check\/changed\.mjs$/,
  /\.md$/, /^llms\.txt$/, /^guide\/changelog\.html$/,
  /* Generated from page content by any docs edit; nothing reads them for layout. */
  /^assets\/search-data\.js$/, /^assets\/graph-data\.js$/,
];

/* A file every check depends on. */
const EVERYTHING = [/^\.github\/workflows\/checks\.yml$/, /^package-lock\.json$/, /^tools\/check\/serve\.mjs$/, /^tools\/check\/all\.mjs$/];

/* What the builder page loads and the builder check drives. */
const BUILDER = [
  /^builder\.html$/, /^assets\/builder/, /^assets\/theme\.js$/, /^assets\/configure-data\.js$/, /^assets\/specimens\.js$/,
  /^assets\/(site|menu|search)\.js$/, /^assets\/site\.css$/,
  /^system\/components\//, /^system\/manifest\.json$/, /^system\/styles\.css$/, /^system\/tokens\//, /^system\/templates\/_support\//, /^system\/_ds_bundle\.js$/,
  /^tools\/build-(builder|bundle|package)\.mjs$/, /^tools\/check\/(builder|typecheck)\.mjs$/,
];

/* What the behaviour check renders: the package, built from the system. */
const BEHAVIOR = [/^system\/components\//, /^system\/styles\.css$/, /^system\/tokens\//, /^tools\/build-package\.mjs$/, /^tools\/check\/behavior\.mjs$/, /^dist\//];

const hits = (file, list) => list.some((re) => re.test(file));

/* The files a release touches, where a change to the version lines alone is
   no change for the browser checks. */
const VERSIONED = ["package.json", "package-lock.json"];

/* files: paths relative to the repository root. versionOnly: those of the
   VERSIONED files whose only change is their version lines. */
export function classify(files, { versionOnly = [] } = {}) {
  const all = { site: true, behavior: true, builder: true };
  files = files.filter((f) => !versionOnly.includes(f));
  if (files.some((f) => hits(f, EVERYTHING))) return all;
  if (files.includes("package.json")) return all;
  const live = files.filter((f) => !hits(f, QUIET));
  if (!live.length) return { site: false, behavior: false, builder: false };
  return {
    site: true,
    behavior: live.some((f) => hits(f, BEHAVIOR) && !/\.md$/.test(f)),
    builder: live.some((f) => hits(f, BUILDER) && !/\.md$/.test(f)),
  };
}

/* Whether a file's diff changes anything but its version lines. */
function changedBeyondVersion(base, file) {
  const diff = execFileSync("git", ["diff", `${base}...HEAD`, "--", file], { encoding: "utf8" });
  return diff.split("\n").some((l) => /^[+-](?![+-])/.test(l) && !/^[+-]\s*"version":/.test(l));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const base = process.argv[2];
  let out;
  if (!base || base === "--all") out = { site: true, behavior: true, builder: true };
  else {
    const files = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { encoding: "utf8" }).split("\n").filter(Boolean);
    const versionOnly = VERSIONED.filter((f) => files.includes(f) && !changedBeyondVersion(base, f));
    out = classify(files, { versionOnly });
    console.log(`${files.length} file(s) changed against ${base}`);
  }
  const lines = Object.entries(out).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join("\n"));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
}
