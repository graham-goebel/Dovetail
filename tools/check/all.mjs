#!/usr/bin/env node
/* Every check, as `npm run check` runs them: the quick ones first, in series,
   then the browser checks side by side where the machine has the cores for
   it, since they share nothing. A check that runs beside others has its
   output kept until it ends, so their lines don't interleave; the summary
   says how long each one took.

     npm run check          everything
     npm run check:fast     just the quick ones (about fifteen seconds)
     ONLY=<text> npm run check:builder   one step of the builder check */

import { spawn } from "node:child_process";
import os from "node:os";

const FAST = ["check:build", "check:changes", "check:unit", "check:ssr", "check:package", "check:consumer"];
/* Three browsers want more than four cores: with fewer, the builder check's
   waits time out under the others, so it runs on its own after them. */
const cores = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
const BROWSER = cores >= 8 ? [["check:browser", "check:behavior", "check:builder"]] : [["check:browser", "check:behavior"], ["check:builder"]];
const fastOnly = process.argv.includes("--fast");

const seconds = (ms) => (ms / 1000).toFixed(1).replace(/\.0$/, "") + "s";

/* One npm script, with its output captured; live when asked. */
function run(script, { live }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "-s", script], {
      env: process.env,
      stdio: live ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let out = "";
    if (!live) {
      child.stdout.on("data", (d) => { out += d; });
      child.stderr.on("data", (d) => { out += d; });
    }
    child.on("close", (code) => resolve({ script, code: code ?? 1, out, ms: Date.now() - started }));
  });
}

const results = [];
let failed = false;

for (const script of FAST) {
  console.log(`\n── ${script}`);
  const r = await run(script, { live: true });
  results.push(r);
  if (r.code !== 0) { failed = true; break; }
}

if (!failed && !fastOnly) {
  for (const group of BROWSER) {
    console.log(`\n── ${group.join(", ")}${group.length > 1 ? " (side by side)" : ""}`);
    const rs = await Promise.all(group.map((s) => run(s, { live: group.length === 1 })));
    for (const r of rs) {
      if (group.length > 1) {
        console.log(`\n── ${r.script} (${seconds(r.ms)})`);
        process.stdout.write(r.out.endsWith("\n") ? r.out : r.out + "\n");
      }
      results.push(r);
      if (r.code !== 0) failed = true;
    }
  }
}

console.log("\n── summary");
for (const r of results) console.log(`  ${r.code === 0 ? "ok  " : "FAIL"}  ${r.script.padEnd(16)} ${seconds(r.ms)}`);
console.log(`  ${failed ? "check: failed" : "check: passed"} in ${seconds(results.reduce((t, r) => t + r.ms, 0))} of work, ${seconds(performance.now())} wall`);
process.exit(failed ? 1 : 0);
