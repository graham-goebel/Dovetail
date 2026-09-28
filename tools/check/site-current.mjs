#!/usr/bin/env node
/* Fails if the generated site is behind its sources.

   Runs the site build and compares every file it could touch before and
   after. Anything that changed means a source was edited without rebuilding;
   the rebuilt files are left in place, ready to commit. Unlike a plain
   `git diff`, this works with uncommitted edits in the tree. */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { ROOT } from "./serve.mjs";

function snapshot() {
  const out = new Map();
  (function walk(dir) {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (/^(\.git|node_modules)/.test(rel)) continue;
      if (e.isDirectory()) walk(rel);
      else if (/\.(html|js|json|md)$/.test(e.name)) out.set(rel, crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex"));
    }
  })("");
  return out;
}

const before = snapshot();
execFileSync(process.execPath, [path.join(ROOT, "tools", "build-site.mjs")], { stdio: "ignore" });
const after = snapshot();
const changed = [...after.keys()].filter((f) => before.get(f) !== after.get(f));

if (changed.length) {
  console.error(`The generated site was out of date; rebuilt ${changed.length} file(s):`);
  changed.slice(0, 20).forEach((f) => console.error("  " + f));
  console.error("Commit the rebuilt files (or run `npm run build` and commit).");
  process.exit(1);
}
console.log("site is current");
