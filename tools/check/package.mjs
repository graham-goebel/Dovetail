#!/usr/bin/env node
/* Checks the installable package that tools/build-package.mjs writes.

     node tools/check/package.mjs

   1. Runs the package build into dist/react/.
   2. Imports dist/react/index.js in Node and asserts that every component in
      system/manifest.json is exported as a function.
   3. Renders Button and Stack with react-dom/server, which only works if the
      compiled files resolve React as an external dependency.
   4. Type-checks a small consumer .tsx against dist/react/index.d.ts with
      `tsc --noEmit` (strict, skipLibCheck off). The declarations import
      "react", so this needs @types/react; without it the step is skipped
      with a message, not failed.

   Exits 1 if any step fails. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = path.join(ROOT, "dist", "react");
const require = createRequire(path.join(ROOT, "package.json"));

let failures = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const skip = (msg) => console.log(`  skip  ${msg}`);

async function step(title, fn) {
  console.log(title);
  try {
    await fn();
  } catch (err) {
    fail(err && err.stack ? err.stack.split("\n").slice(0, 6).join("\n        ") : String(err));
  }
}

let pkg = null;

await step("build", () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "build-package.mjs")], { cwd: ROOT, encoding: "utf8" });
  const lines = `${r.stderr}${r.stdout}`.trim().split("\n").filter(Boolean);
  if (r.status !== 0) throw new Error(`build-package exited ${r.status}:\n${lines.join("\n")}`);
  for (const line of lines) {
    if (line.startsWith("warning: ")) console.log(`  warn  ${line.slice("warning: ".length)}`);
    else ok(line);
  }
  for (const f of ["index.js", "index.d.ts"]) {
    if (!fs.existsSync(path.join(DIST, f))) throw new Error(`dist/react/${f} was not written`);
  }
});

await step("exports", async () => {
  pkg = await import(pathToFileURL(path.join(DIST, "index.js")).href);
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "system", "manifest.json"), "utf8"));
  const names = manifest.components.map((c) => c.name);
  const bad = names.filter((n) => typeof pkg[n] !== "function");
  if (bad.length) fail(`not exported as a function: ${bad.join(", ")}`);
  else ok(`all ${names.length} manifest components are exported functions`);
  const extra = Object.keys(pkg).filter((n) => !names.includes(n));
  if (extra.length) ok(`also exported, not in the manifest: ${extra.join(", ")}`);
});

await step("server render (React external)", async () => {
  if (!pkg) throw new Error("dist/react/index.js did not import");
  const React = (await import("react")).default;
  const { renderToString } = await import("react-dom/server");
  const html = renderToString(
    React.createElement(pkg.Stack, { gap: "sm" }, React.createElement(pkg.Button, { variant: "secondary" }, "Save changes")),
  );
  if (!/<button[^>]*>/.test(html) || !html.includes("Save changes")) throw new Error(`unexpected markup: ${html.slice(0, 200)}`);
  ok(`Stack > Button renders (${html.length} chars): ${html.slice(0, 80)}...`);

  /* One React only: the compiled files must import the same module the
     consumer does, or hooks throw. Button uses useState, so the render above
     already proves it; this makes the reason explicit. */
  const resolved = require.resolve("react");
  ok(`react resolves to ${resolved}`);
});

await step("types (tsc --noEmit on a consumer .tsx)", () => {
  const hasTypes = (() => {
    try {
      require.resolve("@types/react/package.json");
      return true;
    } catch {}
    const r = require("react/package.json");
    return Boolean(r.types || r.typings);
  })();
  if (!hasTypes) {
    skip(
      "@types/react is not installed and react ships no types of its own. Every .d.ts in the package does\n" +
        '        `import * as React from "react"` and uses the global JSX namespace, and the consumer needs\n' +
        '        react/jsx-runtime types, so tsc cannot check anything without it. Add "@types/react" (18.x)\n' +
        "        to devDependencies to enable this step.",
    );
    return;
  }

  /* Inside the repo, so "react" and react/jsx-runtime resolve from the
     consumer and from dist/react through node_modules. dist/ is ignored. */
  const dir = fs.mkdtempSync(path.join(ROOT, "dist", ".package-check-"));
  try {
    const entry = path.relative(dir, path.join(DIST, "index.js")).split(path.sep).join("/");
    fs.writeFileSync(
      path.join(dir, "consumer.tsx"),
      `import { Button, Stack, Heading, Text, type ButtonProps } from "${entry.startsWith(".") ? entry : "./" + entry}";

const props: ButtonProps = { variant: "primary", size: "lg", loading: false };

export function Example() {
  return (
    <Stack gap="md" layer="block" align="start">
      <Heading level={2}>Settings</Heading>
      <Text variant="lead">Changes apply to every workspace.</Text>
      <Button {...props} onClick={() => undefined}>Save</Button>
      <Button variant="ghost" as="a" fullWidth>Cancel</Button>
    </Stack>
  );
}
`,
    );
    fs.writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            lib: ["ES2022", "DOM"],
            jsx: "react-jsx",
            moduleResolution: "bundler",
            strict: true,
            skipLibCheck: false,
            noEmit: true,
          },
          files: ["consumer.tsx"],
        },
        null,
        2,
      ),
    );
    try {
      execFileSync("npx", ["--no-install", "tsc", "--noEmit", "-p", path.join(dir, "tsconfig.json")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      ok("consumer.tsx type-checks against dist/react/index.d.ts");
    } catch (err) {
      fail(`tsc reported errors:\n${String(err.stdout || "") + String(err.stderr || "")}`.trim().replace(/\n/g, "\n        "));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(failures ? `\npackage check: ${failures} failure${failures === 1 ? "" : "s"}` : "\npackage check: passed");
process.exit(failures ? 1 : 0);
