#!/usr/bin/env node
/* Checks what a real install of the package gets, with no network.

     node tools/check/consumer.mjs [--list]

   tools/check/package.mjs tests dist/ where it was built, inside the repo.
   That cannot see a file that `files` leaves out of the tarball, an `exports`
   entry that points at nothing, or types that only resolve because the repo's
   node_modules is next door. This check does what `npm install <name>` does:

   1. Runs the package build, then `npm pack` into a temp directory.
   2. Fails if the tarball holds anything but dist/, skills/, package.json,
      README.md, LICENSE and CHANGELOG.md, or lacks the files the exports map
      points at, the Configure core or the dovetail-setup skill.
   3. Creates a temp consumer project and installs the tarball into it with
      `npm install --no-save --offline`. React, react-dom and their types are
      symlinked in from the repo's node_modules,
      because the registry is not reachable; their real paths are the same
      files the package's own imports resolve, so there is still one React.
   4. From the consumer, imports the package by name, renders Button, Section
      and Stack with react-dom/server and asserts on the HTML, require()s it
      (Node 22.12+ loads the ES module through the "default" condition), and resolves
      <name>/styles.css and <name>/fonts.css through the exports map:
      styles.css must hold no @import at all, fonts.css only https ones. It
      also asserts that hook-using modules start with "use client" and pure
      layout ones don't, and that Navbar and Sheet server-render the same
      markup whatever matchMedia would say, so hydration matches.
   5. Type-checks a consumer .tsx that imports from the package name, with
      `tsc --noEmit` (jsx react-jsx, moduleResolution bundler, strict), once
      against @types/react 18 and once against 19 (devDependency
      @types/react-19). It also asserts that a wrong prop is an error, so
      passing means the declarations really resolved and are not silently
      `any`.

   --list prints every file in the tarball. The temp directories are removed on
   the way out; set KEEP_TMP=1 to keep them and print where they are. Exits 1
   if any step fails. */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const NAME = pkg.name;
const LIST = process.argv.includes("--list");

let failures = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const skip = (msg) => console.log(`  skip  ${msg}`);
const indent = (text) => String(text).trim().replace(/\n/g, "\n        ");

async function step(title, fn) {
  console.log(title);
  try {
    await fn();
  } catch (err) {
    fail(indent(err && err.stack ? err.stack.split("\n").slice(0, 8).join("\n") : err));
  }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dovetail-consumer-"));
const PACK = path.join(TMP, "pack");
const CONSUMER = path.join(TMP, "consumer");
/* npm gets its own cache so the check neither reads nor fills the developer's. */
const env = { ...process.env, npm_config_cache: path.join(TMP, "npm-cache"), npm_config_update_notifier: "false", npm_config_fund: "false", npm_config_audit: "false" };

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", env, ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited ${r.status}\n${`${r.stdout || ""}${r.stderr || ""}`.trim()}`);
  }
  return r;
}

const ALLOWED = new Set(["package.json", "README.md", "LICENSE", "CHANGELOG.md"]);
let tarball = null;
let tarFiles = [];
let installed = null;

try {
  await step("build", () => {
    const r = run(process.execPath, [path.join(ROOT, "tools", "build-package.mjs")], { cwd: ROOT });
    for (const line of `${r.stderr}${r.stdout}`.trim().split("\n").filter(Boolean)) {
      if (line.startsWith("warning: ")) console.log(`  warn  ${line.slice("warning: ".length)}`);
      else ok(line);
    }
  });

  await step("pack", () => {
    fs.mkdirSync(PACK, { recursive: true });
    const r = run("npm", ["pack", "--json", "--ignore-scripts", "--offline", "--pack-destination", PACK], { cwd: ROOT });
    const info = JSON.parse(r.stdout)[0];
    tarball = path.join(PACK, info.filename);
    tarFiles = info.files.map((f) => f.path);
    ok(`${info.filename}: ${info.entryCount} files, ${(info.size / 1024).toFixed(1)} kB packed, ${(info.unpackedSize / 1024).toFixed(1)} kB unpacked`);
    if (LIST) for (const f of info.files) console.log(`          ${String(f.size).padStart(8)}  ${f.path}`);
    else {
      const by = {};
      for (const f of tarFiles) {
        const k = f.startsWith("dist/") ? f.split("/").slice(0, 2).join("/") : f;
        by[k] = (by[k] || 0) + 1;
      }
      ok(Object.entries(by).map(([k, n]) => (n > 1 ? `${k} (${n})` : k)).join(", "));
    }
  });

  await step("tarball contents", () => {
    if (!tarFiles.length) throw new Error("no tarball to inspect");
    const stray = tarFiles.filter((f) => !f.startsWith("dist/") && !f.startsWith("skills/") && !ALLOWED.has(f));
    if (stray.length) fail(`outside dist/, skills/, package.json, README.md, LICENSE, CHANGELOG.md: ${stray.join(", ")}`);
    else ok("only dist/, skills/, package.json, README.md, LICENSE and CHANGELOG.md");
    const want = [
      "package.json", "README.md", "dist/react/index.js", "dist/react/index.d.ts", "dist/styles.css", "dist/fonts.css",
      "dist/configure/core.js", "skills/dovetail-setup/SKILL.md", "skills/dovetail-setup/scripts/theme.mjs", "skills/dovetail-setup/scripts/builder-link.mjs", "skills/dovetail-setup/references/wiring.md",
    ];
    for (const f of ["LICENSE", "CHANGELOG.md"]) if (fs.existsSync(path.join(ROOT, f))) want.push(f);
    const missing = want.filter((f) => !tarFiles.includes(f));
    if (missing.length) fail(`missing from the tarball: ${missing.join(", ")}`);
    else ok(`has ${want.join(", ")}`);
    if (pkg.license && !tarFiles.includes("LICENSE")) fail(`package.json says license ${pkg.license} but the tarball has no LICENSE`);
    const junk = tarFiles.filter((f) => /\.(map|test\.\w+|jsx)$|(^|\/)node_modules\//.test(f));
    if (junk.length) fail(`build leftovers in the tarball: ${junk.slice(0, 5).join(", ")}`);
  });

  await step("install into a clean consumer", () => {
    if (!tarball) throw new Error("no tarball to install");
    fs.mkdirSync(CONSUMER, { recursive: true });
    fs.writeFileSync(path.join(CONSUMER, "package.json"), JSON.stringify({ name: "dovetail-consumer-check", version: "0.0.0", private: true, type: "module" }, null, 2));
    /* --legacy-peer-deps: npm would otherwise try to fetch react for the peer
       dependency range, and there is no registry. The peers are linked below. */
    const args = ["install", "--no-save", "--offline", "--ignore-scripts", "--legacy-peer-deps", tarball];
    let how = "npm install --no-save --offline";
    try {
      run("npm", args, { cwd: CONSUMER });
    } catch (err) {
      const dest = path.join(CONSUMER, "node_modules", ...NAME.split("/"));
      fs.rmSync(dest, { recursive: true, force: true });
      fs.mkdirSync(dest, { recursive: true });
      run("tar", ["-xzf", tarball, "-C", dest, "--strip-components=1"]);
      how = "tar extract into node_modules";
      console.log(`  warn  npm install --offline could not install the tarball, so it was extracted instead:\n        ${indent(String(err.message).split("\n").slice(0, 4).join("\n"))}`);
    }
    const dir = path.join(CONSUMER, "node_modules", ...NAME.split("/"));
    installed = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    ok(`${installed.name}@${installed.version} is in consumer/node_modules (${how})`);

    /* Peers: link the repo's copies. realpath, so React and react-dom see the
       same react whichever of the two paths resolves it. */
    const peers = ["react", "react-dom", "@types/react", "@types/react-dom"];
    for (const dep of peers) {
      const from = fs.realpathSync(path.join(ROOT, "node_modules", dep));
      const to = path.join(CONSUMER, "node_modules", dep);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.rmSync(to, { recursive: true, force: true });
      fs.symlinkSync(from, to, "dir");
    }
    ok(`peers linked from the repo: ${peers.join(", ")}`);
    const declared = Object.keys(installed.peerDependencies || {});
    if (!declared.includes("react")) fail("peerDependencies does not list react");
    if (installed.engines) fail(`the installed package.json has engines ${JSON.stringify(installed.engines)}; a browser library shouldn't warn about Node versions`);
    const ex = installed.exports || {};
    /* The token subpath is required once the token build puts dist/tokens in
       the package; until then an export pointing at nothing would be a lie. */
    const wants = [".", "./styles.css", "./fonts.css"].concat(tarFiles.includes("dist/tokens/tokens.css") ? ["./tokens/*"] : []);
    for (const k of wants) if (!(k in ex)) fail(`the installed package.json has no exports["${k}"]`);
  });

  await step(`render from "${NAME}" (server) and resolve ${NAME}/styles.css`, () => {
    if (!installed) throw new Error("nothing installed");
    const hasTokens = tarFiles.includes("dist/tokens/tokens.css");
    fs.writeFileSync(
      path.join(CONSUMER, "check.mjs"),
      `import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Section, Stack } from ${JSON.stringify(NAME)};

const NAME = ${JSON.stringify(NAME)};
const say = (m) => console.log("  ok    " + m);
const h = React.createElement;

const entry = import.meta.resolve(NAME);
assert.match(entry, new RegExp("/node_modules/" + NAME + "/dist/react/index\\\\.js$"), "the bare name resolves into node_modules: " + entry);
say("import from the package name resolves " + entry.slice(entry.indexOf("node_modules")));

const button = renderToStaticMarkup(h(Button, { variant: "primary" }, "Save changes"));
assert.match(button, /^<button[ >]/);
assert.ok(button.includes(">Save changes</button>"), button);
assert.ok(button.includes("var(--dt-button-primary-bg)"), "Button reads its component token: " + button);
say("Button renders a <button> that reads --dt-button-primary-bg");

const stack = renderToStaticMarkup(h(Stack, { gap: "sm" }, h("i", null, "a"), h("i", null, "b")));
assert.ok(stack.includes("flex-direction:column"), stack);
assert.ok(stack.includes("var(--dt-space-stack-sm)"), stack);
assert.ok(stack.includes("<i>a</i><i>b</i>"), stack);
say("Stack renders a column with --dt-space-stack-sm and both children");

const band = renderToStaticMarkup(h(Section, { dark: true, tone: "brand" }, h(Stack, null, h(Button, null, "Go"))));
assert.match(band, /^<section class="dark"/, band);
assert.ok(band.includes("<button"), band);
assert.ok(band.includes("padding-inline:var(--dt-layout-page-gutter)") && band.includes("max-width:var(--dt-layout-page-width)"), band);
say("Section dark renders <section class=\\"dark\\"> around Stack and Button, in the page column");

const inset = renderToStaticMarkup(h(Section, { bleed: "inset", tone: "brand", spacingTop: "xl" }, "x"));
assert.ok(inset.startsWith('<section style="padding-inline:var(--dt-layout-page-gutter)') && inset.includes("border-radius:var(--dt-radius-container)") && inset.includes("padding-top:var(--dt-layout-module-padding-xl)") && inset.includes("padding-inline:var(--dt-layout-module-inset)"), inset);
say("Section bleed=\\"inset\\" sets its band in by the gutter, with the container radius and its own top step");

const plain = renderToStaticMarkup(h(Section, null, "x"));
assert.ok(!/class="[^"]*dark/.test(plain), plain);
say("Section without dark carries no dark class");

/* The "default" export condition: require() loads the ES module on a Node
   with require(esm) (22.12+), so CommonJS tooling needs no separate build. */
if (process.features.require_module) {
  const { createRequire } = await import("node:module");
  const cjs = createRequire(import.meta.url)(NAME);
  assert.equal(typeof cjs.Button, "function", "require() gives Button");
  say('require("' + NAME + '") loads the package (Node ' + process.version + ')');
} else {
  say("require(): this Node cannot require an ES module, so not checked");
}

const cssUrl = import.meta.resolve(NAME + "/styles.css");
const cssPath = fileURLToPath(cssUrl);
assert.ok(fs.existsSync(cssPath), cssPath + " does not exist");
assert.match(cssUrl, new RegExp("/node_modules/" + NAME + "/dist/styles\\\\.css$"));
const css = fs.readFileSync(cssPath, "utf8");
const bare = css.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");
const IMPORT = /@import\\s+(?:url\\(\\s*)?["']?([^"')\\s;]+)/g;
const imports = [...bare.matchAll(IMPORT)].map((m) => m[1]);
assert.deepEqual(imports, [], "styles.css makes no request of its own, but it imports: " + imports.join(", "));
assert.ok(bare.includes("--dt-button-primary-bg:") || bare.includes("--dt-button-primary-bg :"), "styles.css declares --dt-button-primary-bg");
assert.ok(/\\.dark\\b/.test(bare), "styles.css has .dark rules");
assert.ok(css.includes("/* from system/styles.css */"), "styles.css keeps its from-markers");
say("styles.css resolves to " + cssPath.slice(cssPath.indexOf("node_modules")) + " (" + css.length + " bytes), with no @import");

const fontsPath = fileURLToPath(import.meta.resolve(NAME + "/fonts.css"));
const fonts = fs.readFileSync(fontsPath, "utf8").replace(/\\/\\*[\\s\\S]*?\\*\\//g, "").trim();
const fontImports = [...fonts.matchAll(IMPORT)].map((m) => m[1]);
assert.ok(fontImports.length > 0, "fonts.css imports nothing");
assert.ok(fontImports.every((s) => /^https:\\/\\//.test(s)), "fonts.css imports must be https: " + fontImports.join(", "));
assert.ok(fonts.split("\\n").every((l) => l.startsWith("@import ")), "fonts.css holds only @import lines: " + fonts);
say("fonts.css resolves and holds " + fontImports.length + " https @import");

/* React Server Components: a module that calls hooks must be a client module,
   and a pure layout one stays a server module. */
const firstStatement = (name) => {
  const file = fileURLToPath(new URL("./" + name + ".js", entry));
  return fs.readFileSync(file, "utf8").replace(/^\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*/, "").split("\\n")[0];
};
for (const m of ["actions/Button", "feedback/Dialog", "navigation/Tabs", "navigation/Navbar", "feedback/Sheet", "forms/Input"]) {
  assert.equal(firstStatement(m), '"use client";', m + ".js does not start with \\"use client\\"");
}
for (const m of ["primitives/Stack", "primitives/Section", "typography/Heading", "typography/Text"]) {
  assert.notEqual(firstStatement(m), '"use client";', m + ".js is marked \\"use client\\" but needs no browser");
}
say("hook-using modules start with \\"use client\\"; Stack, Section, Heading and Text stay server components");

/* Hydration: the server has no matchMedia, so the first client render must
   not read it either. Render with a narrow, reduced-motion matchMedia in
   place and without one; the markup must be the same. */
const { Navbar, Sheet } = await import(NAME);
const views = () => [
  renderToStaticMarkup(h(Navbar, { brand: "Acme", links: [{ id: "a", label: "Docs", href: "#a" }], collapseBelow: 10000 })),
  renderToStaticMarkup(h(Sheet, { open: true, title: "Filters", onClose() {} }, "Body")),
];
const bareViews = views();
globalThis.window = { matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) };
const narrowViews = views();
delete globalThis.window;
assert.equal(narrowViews[0], bareViews[0], "Navbar renders differently when matchMedia matches, so hydration would not match");
assert.equal(narrowViews[1], bareViews[1], "Sheet renders differently when matchMedia matches, so hydration would not match");
say("Navbar and Sheet server-render the same markup whatever matchMedia says");

${
  hasTokens
    ? `const tok = fileURLToPath(import.meta.resolve(NAME + "/tokens/tokens.css"));
assert.ok(fs.existsSync(tok), tok + " does not exist");
say("tokens/tokens.css resolves through exports");`
    : `say("tokens/*: dist/tokens is not in the tarball yet (the token build writes it), so it is not resolved here");`
}
`,
    );
    const r = spawnSync(process.execPath, ["check.mjs"], { cwd: CONSUMER, encoding: "utf8", env });
    process.stdout.write(r.stdout || "");
    if (r.status !== 0) throw new Error(`the consumer script exited ${r.status}\n${(r.stderr || "").trim()}`);
  });

  /* The skill's script, run the way the skill runs it: from the consumer's
     root, finding the package through node_modules, with nothing from the
     repo on its path. */
  await step("the dovetail-setup skill builds and checks a theme from the installed package", () => {
    if (!installed) throw new Error("nothing installed");
    const script = path.join(CONSUMER, "node_modules", ...NAME.split("/"), "skills", "dovetail-setup", "scripts", "theme.mjs");
    const node = (args, input) => {
      const r = spawnSync(process.execPath, [script, ...args], { cwd: CONSUMER, encoding: "utf8", env: { ...env, DOVETAIL_PACKAGE: "" }, input });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    };
    const opts = node(["options"]);
    if (opts.code !== 0) throw new Error(`options exited ${opts.code}:\n${indent(opts.out)}`);
    const choices = JSON.parse(opts.out);
    if (!choices.radius || !choices.font || !choices.primary.values.includes("custom")) throw new Error("options is missing radius, font or a custom primary");
    ok(`options lists ${Object.keys(choices).length} choices from the installed package`);

    const answers = { primaryHex: "#1f6feb", actions: "brand", font: "inter", radius: "soft" };
    const built = node(["build", "-", "--out", "dovetail-theme.css"], JSON.stringify(answers));
    if (built.code !== 0) throw new Error(`build exited ${built.code}:\n${indent(built.out)}`);
    const theme = fs.readFileSync(path.join(CONSUMER, "dovetail-theme.css"), "utf8");
    if (!theme.startsWith("/* dovetail-setup choices: ")) throw new Error("the theme does not record its choices");
    if (!/--dt-color-primary-600: #1f6feb;/.test(theme)) throw new Error("the brand colour is not at primary 600");
    if (!/fonts\.googleapis\.com\/css2\?family=Inter/.test(built.out)) throw new Error(`build did not report the Inter font URL:\n${indent(built.out)}`);
    ok("build writes a theme with the brand colour at primary 600, records its choices, and reports the Inter URL");

    const checked = node(["check", "dovetail-theme.css"]);
    if (checked.code !== 0 || !/ok: a valid Dovetail theme/.test(checked.out) || /warning:/.test(checked.out)) throw new Error(`check did not pass it cleanly:\n${indent(checked.out)}`);
    fs.appendFileSync(path.join(CONSUMER, "dovetail-theme.css"), "\n.button { border-radius: 0; }\n");
    const bad = node(["check", "dovetail-theme.css"]);
    if (bad.code !== 1 || !/not a token/.test(bad.out)) throw new Error(`check did not reject a component rule:\n${indent(bad.out)}`);
    ok("check passes the built theme with no warnings, and rejects a component rule");

    const wrong = node(["build", "-"], JSON.stringify({ radius: "round" }));
    if (wrong.code !== 1 || !/"round" is not one of/.test(wrong.out)) throw new Error(`build accepted an invalid choice:\n${indent(wrong.out)}`);
    ok("build rejects an invalid choice and lists the valid ones");

    const linker = path.join(path.dirname(script), "builder-link.mjs");
    const layout = { frames: [{ name: "Home", width: 390, hug: true, root: { children: [{ type: "Heading", props: { children: "Hi" }, style: { padding: "10px" } }] } }] };
    const r = spawnSync(process.execPath, [linker, "-"], { cwd: CONSUMER, encoding: "utf8", env, input: JSON.stringify(layout) });
    const url = (r.stdout || "").trim();
    const m = /builder\.html#b=([\w-]+)$/.exec(url);
    if (r.status !== 0 || !m) throw new Error(`builder-link didn't print a link:\n${indent(`${r.stdout}${r.stderr}`)}`);
    if (JSON.stringify(JSON.parse(Buffer.from(m[1], "base64url").toString("utf8"))) !== JSON.stringify(layout)) throw new Error("the link doesn't decode to the layout it was given");
    if (!/style padding "10px" should be a token option name/.test(r.stderr)) throw new Error(`builder-link didn't flag a raw value:\n${indent(r.stderr)}`);
    const none = spawnSync(process.execPath, [linker, "-"], { cwd: CONSUMER, encoding: "utf8", env, input: "{}" });
    if (none.status !== 1) throw new Error("builder-link accepted a layout with nothing in it");
    ok("builder-link turns a layout into a builder link that decodes to it, flags a raw value, and refuses an empty layout");
  });

  await step(`types (tsc --noEmit on a consumer .tsx importing "${NAME}")`, () => {
    if (!installed) throw new Error("nothing installed");
    fs.writeFileSync(
      path.join(CONSUMER, "consumer.tsx"),
      `import { Button, Section, Stack, Heading, Text, type ButtonProps } from ${JSON.stringify(NAME)};

const props: ButtonProps = { variant: "primary", size: "lg", loading: false };

/* If the declarations did not resolve, Button would be any and this would not
   be an error, and tsc would report the directive itself as unused. */
// @ts-expect-error "nope" is not a Button variant
const wrong: ButtonProps = { variant: "nope" };

export function Example() {
  return (
    <Section dark tone="brand">
      <Stack gap="md" align="start">
        <Heading level={2}>Settings</Heading>
        <Text variant="lead">Changes apply to every workspace.</Text>
        <Button {...props} onClick={() => undefined}>Save</Button>
        <Button variant="ghost" fullWidth>Cancel</Button>
      </Stack>
    </Section>
  );
}

export { wrong };
`,
    );
    fs.writeFileSync(
      path.join(CONSUMER, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: { target: "ES2022", module: "ESNext", lib: ["ES2022", "DOM"], jsx: "react-jsx", moduleResolution: "bundler", strict: true, skipLibCheck: false, noEmit: true },
          include: ["consumer.tsx"],
        },
        null,
        2,
      ),
    );
    /* tsc is the repo's: the consumer has none and there is no registry. It
       still resolves everything from the consumer's own node_modules, because
       the project file lives there. */
    const r = spawnSync("npx", ["--no-install", "tsc", "--noEmit", "-p", path.join(CONSUMER, "tsconfig.json")], { cwd: ROOT, encoding: "utf8", env });
    if (r.status !== 0) fail(`tsc reported errors:\n${indent(`${r.stdout}${r.stderr}`)}`);
    else ok("consumer.tsx type-checks against the installed declarations with @types/react 18 (and a wrong prop is an error)");

    /* Again with React 19's types, which dropped the global JSX namespace.
       "types": [] keeps tsc from pulling in @types/react-dom 18 on its own. */
    const types19 = path.join(ROOT, "node_modules", "@types", "react-19");
    if (!fs.existsSync(types19)) {
      skip("@types/react-19 is not installed (npm ci), so the React 19 types pass is skipped");
      return;
    }
    const link = path.join(CONSUMER, "node_modules", "@types", "react");
    fs.rmSync(link, { recursive: true, force: true });
    fs.symlinkSync(fs.realpathSync(types19), link, "dir");
    const conf = JSON.parse(fs.readFileSync(path.join(CONSUMER, "tsconfig.json"), "utf8"));
    conf.compilerOptions.types = [];
    fs.writeFileSync(path.join(CONSUMER, "tsconfig.19.json"), JSON.stringify(conf, null, 2));
    const v = JSON.parse(fs.readFileSync(path.join(types19, "package.json"), "utf8")).version;
    const r19 = spawnSync("npx", ["--no-install", "tsc", "--noEmit", "-p", path.join(CONSUMER, "tsconfig.19.json")], { cwd: ROOT, encoding: "utf8", env });
    if (r19.status !== 0) fail(`tsc reported errors with @types/react ${v}:\n${indent(`${r19.stdout}${r19.stderr}`)}`);
    else ok(`consumer.tsx type-checks against the installed declarations with @types/react ${v}`);
  });
} finally {
  if (process.env.KEEP_TMP) console.log(`\nkept ${TMP}`);
  else fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(failures ? `\nconsumer check: ${failures} failure${failures === 1 ? "" : "s"}` : "\nconsumer check: passed");
process.exit(failures ? 1 : 0);
