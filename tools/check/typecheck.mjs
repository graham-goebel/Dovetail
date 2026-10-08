/* Type-checks consumer code against the built package, the way an app that
   installs @dovetail-ds/react would see it. Shared by the package check (a
   hand-written consumer) and the builder check (the code the builder
   exports).

     import { hasReactTypes, buildPackage, typecheck } from "./typecheck.mjs";

   - hasReactTypes(): whether @types/react (or types inside react) can be
     found. Every .d.ts in the package imports "react", so without them tsc
     can't check anything.
   - buildPackage(dir): runs tools/build-package.mjs --out dir, so the check
     reads declarations nobody else rebuilds while it runs.
   - typecheck(files, { pkg }): writes each { "src/Name.tsx": source } into a
     fresh directory under dist/ (inside the repo, so "react" and
     react/jsx-runtime resolve through node_modules), maps
     "@dovetail-ds/react" onto pkg/index.d.ts, and
     runs `tsc --noEmit`: strict, jsx react-jsx, bundler resolution,
     skipLibCheck off. It resolves to { diagnostics, output }, where each
     diagnostic is { file, line, column, code, message, source } and source
     is the line it points at. */

import fs from "node:fs";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(path.join(ROOT, "package.json"));
export const PACKAGE_NAME = "@dovetail-ds/react";

export function hasReactTypes() {
  try {
    require.resolve("@types/react/package.json");
    return true;
  } catch {}
  const r = require("react/package.json");
  return Boolean(r.types || r.typings);
}

export function buildPackage(dir) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "build-package.mjs"), "--out", dir], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`build-package exited ${r.status}:\n${`${r.stderr}${r.stdout}`.trim()}`);
  if (!fs.existsSync(path.join(dir, "index.d.ts"))) throw new Error(`${path.relative(ROOT, dir)}/index.d.ts was not written`);
  return `${r.stdout}`.trim();
}

/* tsc's own lines, `src/A.tsx(3,7): error TS2322: ...`, with the indented
   lines after one that carry the rest of its message. */
function parse(output, dir) {
  const out = [];
  for (const line of output.split("\n")) {
    const m = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line);
    if (m) out.push({ file: m[1], line: Number(m[2]), column: Number(m[3]), code: m[4], message: m[5] });
    else if (out.length && /^\s+\S/.test(line)) out[out.length - 1].message += "\n" + line.trimEnd();
    else if (line.trim()) out.push({ file: "", line: 0, column: 0, code: "", message: line.trim() });
  }
  for (const d of out) {
    if (!d.file) continue;
    const abs = path.resolve(dir, d.file);
    d.file = path.relative(dir, abs).split(path.sep).join("/");
    try { d.source = fs.readFileSync(abs, "utf8").split("\n")[d.line - 1]; } catch { d.source = ""; }
  }
  return out;
}

export function typecheck(files, { pkg }) {
  fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, "dist", ".typecheck-"));
  for (const [name, source] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), source);
  }
  const entry = path.relative(dir, path.join(pkg, "index.d.ts")).split(path.sep).join("/");
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
          paths: { [PACKAGE_NAME]: [entry.startsWith(".") ? entry : "./" + entry] },
        },
        files: Object.keys(files),
      },
      null,
      2,
    ),
  );
  /* The package's own bin, which its exports map doesn't list. */
  const tsc = path.join(path.dirname(require.resolve("typescript/package.json")), "bin", "tsc");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsc, "--noEmit", "--pretty", "false", "-p", path.join(dir, "tsconfig.json")], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    child.on("error", (err) => { fs.rmSync(dir, { recursive: true, force: true }); reject(err); });
    child.on("close", (code) => {
      const diagnostics = parse(output, dir);
      if (code !== 0 && !diagnostics.length) diagnostics.push({ file: "", line: 0, column: 0, code: "", message: `tsc exited ${code} with no output` });
      if (!process.env.KEEP_TMP) fs.rmSync(dir, { recursive: true, force: true });
      resolve({ diagnostics, output, dir });
    });
  });
}

/* One diagnostic as a check prints it: where, the code, the message, and the
   line it points at. */
export function describe(d) {
  if (!d.file) return d.message;
  /* A long line (a style object) is cut to the part around the column. */
  let src = d.source || "";
  const from = Math.max(0, d.column - 1 - 60), to = d.column - 1 + 100;
  if (src.length > 170) src = (from > 0 ? "..." : "") + src.slice(from, to) + (to < src.length ? "..." : "");
  return `${d.file}:${d.line}:${d.column} ${d.code} ${d.message}` + (src.trim() ? `\n    > ${src.trim()}` : "");
}
