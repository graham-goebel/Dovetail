/* Context docs and skills (model/context.js) and reading a skill's zip
   (model/unzip.js). */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { contextFor, contextText, docFromMarkdown, readSkillMd, skillFromFiles, cleanItem } from "../../../assets/builder/model/context.js";
import { safePath, unzip } from "../../../assets/builder/model/unzip.js";
import { zip, crc32 } from "../../../assets/builder/model/zip.js";

test("a SKILL.md gives its name, description (folded lines too) and instructions", () => {
  const s = readSkillMd("---\nname: brand-review\ndescription: Use when a change\n  touches copy.\n---\n# Brand review\nRules.");
  assert.equal(s.name, "brand-review");
  assert.equal(s.description, "Use when a change touches copy.");
  assert.match(s.body, /^# Brand review/);
});

test("a skill from a folder roots at its SKILL.md and keeps paths under it", () => {
  const s = skillFromFiles([
    { path: "brand-review/SKILL.md", body: "---\nname: Brand Review\ndescription: Use when copy changes.\n---\nx" },
    { path: "brand-review/refs/voice.md", body: "v" },
    { path: "other/README.md", body: "not part of it" },
  ]);
  assert.equal(s.name, "brand-review");
  assert.equal(s.description, "Use when copy changes.");
  assert.deepEqual(s.files.map((f) => f.path), ["SKILL.md", "refs/voice.md"]);
  assert.match(skillFromFiles([{ path: "a.md", body: "" }]).error, /SKILL\.md/);
});

test("a markdown file becomes a doc titled by its first heading", () => {
  assert.equal(docFromMarkdown("notes.md", "intro\n# Home goals\nbody").title, "Home goals");
  assert.equal(docFromMarkdown("brand-voice.md", "no heading").title, "brand-voice");
});

test("what a page sends: docs used always or attached, enabled skills, for that page or every page", () => {
  const by = {
    file: [cleanItem({ id: "d1", kind: "doc", title: "Home", body: "abcd", pages: ["main"] }), cleanItem({ id: "d2", kind: "doc", title: "Pricing", body: "x", pages: ["pricing"] })],
    project: [cleanItem({ id: "d3", kind: "doc", title: "Brief", body: "x", use: "attach" })],
    team: [cleanItem({ id: "d4", kind: "doc", title: "Voice", body: "x", use: "off" }), cleanItem({ id: "s1", kind: "skill", name: "brand-review", description: "Use when copy changes.", files: [] }), cleanItem({ id: "s2", kind: "skill", name: "off", enabled: false })],
  };
  const ctx = contextFor(by, "main");
  assert.deepEqual(ctx.docs.map((d) => d.id), ["d1"]);
  assert.deepEqual(ctx.skills.map((s) => s.id), ["s1"]);
  assert.deepEqual(contextFor(by, "main", ["d3"]).docs.map((d) => d.id), ["d1", "d3"]);
  assert.ok(ctx.tokens > 0);
  const text = contextText(ctx);
  assert.match(text, /## Home\n\nabcd/);
  assert.match(text, /- brand-review: Use when copy changes\./);
});

test("a zip unpacks, stored or deflated, and names that climb out are skipped", async () => {
  const enc = new TextEncoder();
  const stored = zip([{ name: "skill/SKILL.md", data: enc.encode("---\nname: s\n---\n") }, { name: "skill/a.md", data: enc.encode("A") }]);
  const files = await unzip(stored);
  assert.deepEqual(files.map((f) => f.path).sort(), ["skill/SKILL.md", "skill/a.md"]);
  /* One deflated entry, built by hand. */
  const raw = enc.encode("deflated body ".repeat(20));
  const def = zlib.deflateRawSync(raw);
  const name = enc.encode("x/SKILL.md");
  const local = new Uint8Array(30 + name.length + def.length), lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true); lv.setUint16(8, 8, true); lv.setUint32(14, crc32(raw), true); lv.setUint32(18, def.length, true); lv.setUint32(22, raw.length, true); lv.setUint16(26, name.length, true);
  local.set(name, 30); local.set(def, 30 + name.length);
  const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true); cv.setUint16(10, 8, true); cv.setUint32(16, crc32(raw), true); cv.setUint32(20, def.length, true); cv.setUint32(24, raw.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, 0, true);
  central.set(name, 46);
  const endRec = new Uint8Array(22), ev = new DataView(endRec.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, 1, true); ev.setUint16(10, 1, true); ev.setUint32(12, central.length, true); ev.setUint32(16, local.length, true);
  const all = new Uint8Array(local.length + central.length + 22); all.set(local); all.set(central, local.length); all.set(endRec, local.length + central.length);
  const got = await unzip(all);
  assert.equal(got[0].body, "deflated body ".repeat(20));
  assert.equal(safePath("../evil.md"), null);
  assert.equal(safePath("/abs.md"), null);
  assert.equal(safePath("__MACOSX/x.md"), null);
  assert.equal(safePath("ok/refs/a.md"), "ok/refs/a.md");
  await assert.rejects(unzip(new TextEncoder().encode("not a zip")), /isn't a zip/);
});
