/* Comparing frames (model/compare.js) and the assistant's compare_frames
   tool: variants that only changed copy read as alike, ones with different
   layouts and bands don't. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, make } from "../../../assets/builder/model/tree.js";
import { likeness, sections, compareText } from "../../../assets/builder/model/compare.js";
import { runTool } from "../../../assets/builder/model/agent.js";

function frame(name, children, id) {
  const f = emptyDoc().frames[0];
  f.name = name;
  if (id) f.id = id;
  f.root.children = children;
  return f;
}
const page = () => [make("HeroBlock", { layout: "split", title: "Made slowly" }), make("FeatureGridBlock", { variant: "cards" }), make("CtaBlock", { tone: "brand" })];

test("copy changes keep sections alike; a new layout, band or tone doesn't", () => {
  const a = frame("Welcome", page());
  const b = frame("Welcome · Copy", page());
  b.root.children[0].props.title = "Something else entirely";
  assert.equal(likeness(a, b).ratio, 1, "only the words changed");
  const c = frame("Welcome · Bold", page());
  c.root.children[0].props.layout = "centered";
  c.root.children[2].props.tone = "brand-muted";
  const l = likeness(a, c);
  assert.equal(l.same, 1);
  assert.equal(l.total, 3);
});

test("a structured frame's sections are inside its one Content group", () => {
  const f = frame("Page", [make("Group", { direction: "column" }, page())]);
  assert.deepEqual(sections(f).map((n) => n.type), ["HeroBlock", "FeatureGridBlock", "CtaBlock"]);
});

test("compareText flags pairs too alike, naming what stayed the same", () => {
  const a = frame("Welcome", page()), b = frame("Welcome · Motion", page());
  b.root.children[2].props.tone = "subtle";
  const out = compareText([a, b], (n) => n.type);
  assert.equal(out.alike.length, 1);
  assert.match(out.lines[0], /2 of 3 sections the same \(too alike: HeroBlock, FeatureGridBlock unchanged\)/);
});

test("compare_frames compares the frame you're in with its variants: a picture, the checks and the likeness for each", async () => {
  const doc = emptyDoc();
  const a = frame("Welcome", page(), "fa");
  const b = frame("Welcome · Bold", [make("HeroBlock", { layout: "centered", tone: "brand" }), make("StatsBlock", {}), make("CtaBlock", { dark: true })], "fb");
  const other = frame("Pricing", page(), "fp");
  doc.frames = [a, b, other];
  doc.active = "fa";
  const shots = [];
  const api = {
    doc: () => doc,
    screenshot: (fid, id, opts) => { shots.push([fid, opts]); return Promise.resolve({ media_type: "image/jpeg", data: "AAAA", width: 640, height: 900, url: "x" }); },
    runChecks: (fid) => Promise.resolve({ rows: fid === "fb" ? [{ status: "fail", title: "Something overflows at 390px" }] : [{ status: "pass", title: "ok" }], text: "" }),
  };
  const r = await runTool(api, { name: "compare_frames", input: { width: 390 } });
  assert.ok(r.ok, JSON.stringify(r.result));
  assert.deepEqual(shots.map((s) => s[0]), ["fa", "fb"], "the variants, not the unrelated frame");
  assert.equal(shots[0][1].width, 390);
  const text = r.result.filter((x) => x.type === "text").map((x) => x.text).join("\n");
  assert.equal(r.result.filter((x) => x.type === "image").length, 2);
  assert.match(text, /Welcome \(fa\): every check passes/);
  assert.match(text, /Welcome · Bold \(fb\): FAIL Something overflows at 390px/);
  assert.match(text, /Welcome and Welcome · Bold: 0 of 3 sections the same\./);
  assert.match(text, /Grade each from 1 to 5/);
  const one = await runTool({ doc: () => ({ frames: [other], active: "fp" }) }, { name: "compare_frames", input: {} });
  assert.equal(one.ok, false, "one frame alone can't be compared");
});
