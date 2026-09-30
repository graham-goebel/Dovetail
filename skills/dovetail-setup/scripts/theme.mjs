#!/usr/bin/env node
/* The dovetail-setup skill's helper. Runs the docs site's Configure panel code
   from the installed package, headless, so a theme built here is the same file
   Configure's "Download theme.css" gives for the same choices.

     node theme.mjs options
         Every choice as JSON: its default, allowed values and labels.

     node theme.mjs build <answers.json | -> [--out <file>] [--brand-name <name>]
         Builds a theme from answers (a JSON object of choices; "-" reads
         stdin). Writes it to --out, or prints it. The answers are kept in
         the theme's first comment, so the theme can be changed and rebuilt
         later. Then reports contrast and how to load the fonts.

     node theme.mjs check <theme.css>
         Checks a theme file (a Configure download, or one built here):
         errors for anything that is not a token declaration, warnings for
         tokens the installed Dovetail does not know. Reports its primary
         colour, its choices comment if it has one, and its fonts. Exits 1
         on errors.

   The package is found from the current directory, the way the app finds it.
   Set DOVETAIL_PACKAGE to a package directory to point elsewhere. */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const MARK = "dovetail-setup choices:";

function fail(msg) {
  console.error(`theme: ${msg}`);
  process.exit(1);
}

function packageDir() {
  if (process.env.DOVETAIL_PACKAGE) return path.resolve(process.env.DOVETAIL_PACKAGE);
  try {
    const req = createRequire(path.join(process.cwd(), "noop.js"));
    return path.dirname(req.resolve("@dovetail-ds/react/package.json"));
  } catch {
    fail("@dovetail-ds/react is not installed here. Run this from the app's root after `npm install @dovetail-ds/react`.");
  }
}

async function loadCore() {
  const dir = packageDir();
  const core = path.join(dir, "dist", "configure", "core.js");
  if (!fs.existsSync(core)) {
    const v = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).version;
    fail(`@dovetail-ds/react ${v} has no theme builder (dist/configure/core.js). It arrived in 0.5.0: run \`npm install @dovetail-ds/react@latest\`.`);
  }
  return { dir, core: await import(pathToFileURL(core).href) };
}

/* ------------------------------------------------------------------ options */

function describe(core) {
  const { choices, defaults, data } = core;
  const labels = {
    primary: Object.fromEntries(data.brandRamps.map((r) => [r.id, r.label]).concat([["custom", "Custom (set primaryHex)"]])),
    font: Object.fromEntries(Object.entries(data.fonts).map(([k, f]) => [k, f.label])),
    radius: Object.fromEntries(Object.entries(data.radii).map(([k, r]) => [k, r.label])),
  };
  labels.secondary = { ...labels.primary, custom: "Custom (set secondaryHex)" };
  labels.displayFont = { "": "None: headings use the body face", ...labels.font };
  labels.secondaryFont = { "": "None", ...labels.font };
  labels.codeFont = labels.font;
  const out = {};
  for (const key of Object.keys(choices)) {
    out[key] = { default: defaults[key], values: choices[key] };
    if (labels[key]) out[key].labels = labels[key];
  }
  out.primaryHex = { default: defaults.primaryHex, values: "#rrggbb, used when primary is custom" };
  out.secondaryHex = { default: defaults.secondaryHex, values: "#rrggbb, used when secondary is custom" };
  out.primaryEdits = { default: {}, values: '{ "<step>": "#rrggbb" }: moves one step of the primary ramp, as a contrast fix does' };
  out.secondaryEdits = { default: {}, values: '{ "<step>": "#rrggbb" }' };
  out.baseUnit = { default: defaults.baseUnit, values: "px per grid step (4 is the system's)" };
  out.focusRing = { default: defaults.focusRing, values: "focus ring width in px" };
  out.density = { default: defaults.density, values: [false, true] };
  out.mono = { default: defaults.mono, values: [false, true] };
  out.steps = { default: defaults.steps, values: "0 for every step, or 4 to 10 steps kept per ramp" };
  return out;
}

/* -------------------------------------------------------------------- build */

const FREE = new Set(["primaryHex", "secondaryHex", "primaryEdits", "secondaryEdits", "baseUnit", "focusRing", "density", "mono", "steps"]);
const HEX = /^#[0-9a-f]{6}$/i;

function validate(core, answers) {
  const errors = [];
  for (const [key, value] of Object.entries(answers)) {
    if (core.choices[key]) {
      if (!core.choices[key].includes(value)) errors.push(`${key}: ${JSON.stringify(value)} is not one of ${core.choices[key].map((v) => JSON.stringify(v)).join(", ")}`);
    } else if (FREE.has(key)) {
      if (/Hex$/.test(key) && !HEX.test(value)) errors.push(`${key}: ${JSON.stringify(value)} is not a #rrggbb colour`);
      if (/Edits$/.test(key)) {
        for (const [step, hex] of Object.entries(value || {})) {
          if (!core.data.steps.includes(step) || !HEX.test(hex)) errors.push(`${key}: ${step} → ${hex} needs a step (${core.data.steps.join(", ")}) and a #rrggbb colour`);
        }
      }
      if ((key === "baseUnit" || key === "focusRing") && !(Number(value) > 0)) errors.push(`${key}: ${JSON.stringify(value)} is not a positive number`);
      if (key === "steps" && !(value === 0 || (value >= 4 && value <= 10))) errors.push(`steps: ${value} is not 0 or 4 to 10`);
    } else {
      errors.push(`${key}: not a choice. Run \`theme.mjs options\` for the list.`);
    }
  }
  for (const which of ["primary", "secondary"]) {
    if (answers[which] === "custom" && !answers[which + "Hex"]) errors.push(`${which} is custom, so ${which}Hex needs a colour`);
    if (answers[which + "Hex"] && answers[which] === undefined) answers[which] = "custom";
  }
  return errors;
}

/* Which faces a configuration names, and how each one loads: Geist and Geist
   Mono come from the package's fonts.css, the others from Google Fonts. */
function fontReport(core, faces) {
  const lines = [];
  const geist = faces.filter((k) => k === "sans" || k === "mono");
  const google = faces.filter((k) => core.data.fonts[k] && core.data.fonts[k].googleFont);
  if (geist.length) lines.push(`fonts: import "@dovetail-ds/react/fonts.css" before styles.css (${geist.map((k) => core.data.fonts[k].label.split(" — ")[1]).join(", ")})`);
  if (google.length) {
    const href = "https://fonts.googleapis.com/css2?family=" + [...new Set(google.map((k) => core.data.fonts[k].googleFont))].join("&family=") + "&display=swap";
    lines.push(`fonts: load from Google Fonts (${google.map((k) => core.data.fonts[k].label.split(" — ")[1]).join(", ")}): ${href}`);
  }
  if (faces.includes("system")) lines.push("fonts: System UI needs nothing loaded");
  return lines;
}

function contrastReport(core, answers) {
  const lines = [];
  for (const group of core.checks(answers)) {
    const failed = group.results.filter((r) => !r.pass);
    if (group.ramp === "secondary" && !answers.secondary && !answers.secondaryHex) continue;
    if (!failed.length) lines.push(`contrast: ${group.ramp} passes all ${group.results.length} pairs`);
    for (const r of failed) lines.push(`contrast: FAIL ${group.ramp} "${r.label}" is ${r.ratio}:1, needs ${r.min}:1`);
    /* One fix per step: when two pairs fail on the same step, the fix for the
       stricter minimum clears both. */
    const edits = {};
    const bar = {};
    for (const r of failed) {
      if (r.fix && !(bar[r.step] >= r.min)) {
        edits[r.step] = r.fix;
        bar[r.step] = r.min;
      }
    }
    if (Object.keys(edits).length) lines.push(`contrast: to fix, add "${group.ramp}Edits": ${JSON.stringify(edits)} and rebuild`);
  }
  return lines;
}

async function build(args) {
  const src = args[0];
  if (!src) fail("build needs an answers file (or - for stdin)");
  const outAt = args.indexOf("--out");
  const nameAt = args.indexOf("--brand-name");
  let answers;
  try {
    answers = JSON.parse(src === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(src, "utf8"));
  } catch (e) {
    fail(`could not read answers from ${src}: ${e.message}`);
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) fail("answers must be a JSON object of choices");
  const { core } = await loadCore();
  const errors = validate(core, answers);
  if (errors.length) fail("these answers can't be built:\n  " + errors.join("\n  "));

  const brand = nameAt > -1 ? { name: args[nameAt + 1] } : {};
  const css = `/* ${MARK} ${JSON.stringify(answers)} */\n` + core.css(answers, brand) + "\n";
  if (outAt > -1) {
    const out = args[outAt + 1];
    if (!out) fail("--out needs a file");
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, css);
    console.log(`wrote ${out} (${css.split("\n").length} lines)`);
  } else {
    process.stdout.write(css);
  }
  const full = { ...core.defaults, ...answers };
  const faces = [...new Set([full.font, full.displayFont, full.secondaryFont, full.codeFont].filter(Boolean))];
  for (const line of [...fontReport(core, faces), ...contrastReport(core, answers)]) console.error(line);
}

/* -------------------------------------------------------------------- check */

function parseBlocks(css) {
  const blocks = [];
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const imports = [...bare.matchAll(/@import[^;]*;/g)].map((m) => m[0]);
  const body = bare.replace(/@import[^;]*;/g, "");
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = m[2]
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const i = d.indexOf(":");
        return i > 0 ? { name: d.slice(0, i).trim(), value: d.slice(i + 1).trim() } : { name: d, value: "" };
      });
    blocks.push({ selector: m[1].trim(), decls });
  }
  const stray = body.replace(/([^{}]+)\{([^{}]*)\}/g, "").trim();
  return { blocks, imports, stray };
}

async function check(args) {
  const file = args[0];
  if (!file) fail("check needs a theme file");
  if (!fs.existsSync(file)) fail(`${file} does not exist`);
  const css = fs.readFileSync(file, "utf8");
  const { dir, core } = await loadCore();
  /* Known tokens: every one the stylesheet declares or reads, plus every one
     Configure can write. Some exist only once a theme sets them, like
     --dt-font-family-display for a display face. */
  const sheet = fs.readFileSync(path.join(dir, "dist", "styles.css"), "utf8");
  const known = new Set([...sheet.matchAll(/(--dt-[a-z0-9-]+)\s*[:)]/g)].map((m) => m[1]));
  const everything = {
    primary: "custom", primaryHex: "#1f6feb", secondary: "custom", secondaryHex: "#8a4fd6", actions: "brand",
    displayFont: "fraunces", secondaryFont: "inter", baseUnit: 5, focusRing: 3, density: true, mono: true,
    brandFill: "quiet", pageTint: "muted", texture: "dots", iconSize: "large", iconStroke: 1.5, mediaRadius: "pill",
    whitespace: "airy", textSpacing: "open", moduleSpacing: "open", headlineColor: "primary", wordmarkColor: "primary",
  };
  for (const name of Object.keys(core.vars(everything))) known.add(name);
  const { blocks, imports, stray } = parseBlocks(css);
  const errors = [];
  const warnings = [];

  if (!blocks.length) errors.push("no rules found: a theme is a :root block of --dt-* declarations");
  if (stray) errors.push(`text outside any rule: ${stray.slice(0, 80)}`);
  for (const i of imports) warnings.push(`${i} : load fonts from the app root instead, so the theme stays tokens only`);
  let tokens = 0;
  for (const b of blocks) {
    if (b.selector.startsWith("@")) {
      errors.push(`${b.selector}: at-rules don't belong in a theme`);
      continue;
    }
    const scoped = b.selector === ":root" || b.selector === ".dark";
    if (!scoped) warnings.push(`${b.selector}: a Dovetail theme sets tokens on :root and .dark; other selectors are app CSS`);
    for (const d of b.decls) {
      if (!d.name.startsWith("--")) {
        errors.push(`${b.selector} { ${d.name}: ${d.value} }: not a token. Themes restyle through tokens only; move this to the app's own CSS or find the token that expresses it`);
      } else if (!known.has(d.name)) {
        warnings.push(`${d.name} is not a token this version of Dovetail declares (a typo, or a theme from a newer version)`);
      } else {
        tokens++;
      }
    }
  }

  const decl = (name) => blocks.filter((b) => b.selector === ":root").flatMap((b) => b.decls).find((d) => d.name === name);
  const choices = css.match(new RegExp("/\\*\\s*" + MARK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*(\\{[\\s\\S]*?\\})\\s*\\*/"));
  console.log(`${file}: ${tokens} token overrides in ${blocks.length} block${blocks.length === 1 ? "" : "s"}`);
  if (choices) console.log(`choices: ${choices[1]}`);
  else console.log("choices: none recorded (a Configure download, or written by hand)");
  const p = decl("--dt-color-primary-600");
  if (p) console.log(`primary 600: ${p.value}`);

  const byValue = new Map(Object.entries(core.data.fonts).map(([k, f]) => [f.value, k]));
  const faces = [];
  for (const name of ["--dt-font-family-sans", "--dt-font-family-display", "--dt-font-family-secondary", "--dt-font-family-mono"]) {
    const d = decl(name);
    if (!d) continue;
    const key = byValue.get(d.value);
    if (key) faces.push(key);
    else console.log(`fonts: ${name} is ${d.value.split(",")[0]}, not one of Configure's faces: load it with the app's own @font-face`);
  }
  if (!decl("--dt-font-family-sans")) faces.push("sans");
  if (!decl("--dt-font-family-mono")) faces.push("mono");
  for (const line of fontReport(core, [...new Set(faces)])) console.log(line);
  if (choices) {
    try {
      for (const line of contrastReport(core, JSON.parse(choices[1]))) console.log(line);
    } catch {
      warnings.push("the choices comment is not valid JSON");
    }
  }

  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  console.log(errors.length ? `\n${errors.length} error${errors.length === 1 ? "" : "s"}` : "\nok: a valid Dovetail theme");
  process.exit(errors.length ? 1 : 0);
}

/* --------------------------------------------------------------------- main */

const [command, ...rest] = process.argv.slice(2);
if (command === "options") {
  const { core } = await loadCore();
  console.log(JSON.stringify(describe(core), null, 2));
} else if (command === "build") {
  await build(rest);
} else if (command === "check") {
  await check(rest);
} else {
  console.error("usage: theme.mjs options | build <answers.json|-> [--out file] [--brand-name name] | check <theme.css>");
  process.exit(command ? 1 : 0);
}
