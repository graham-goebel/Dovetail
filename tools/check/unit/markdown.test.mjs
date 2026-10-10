/* The assistant's replies read as Markdown (model/markdown.js): blocks and
   inline marks as plain data, links kept only when they're safe. Run with
   npm run check:unit. */
import test from "node:test";
import assert from "node:assert/strict";
import { mdBlocks, mdInline } from "../../../assets/builder/model/markdown.js";

test("headings, lists, quotes, code and paragraphs become blocks", () => {
  const b = mdBlocks("## What changed\nThe hero is **bolder**.\n\n1. Brand fill\n2. Bigger type\n   on two lines\n- a point\n> a quote\n\n```jsx\n<Hero />\n```\nLast words");
  assert.deepEqual(b.map((x) => x.type), ["h", "p", "ol", "ul", "quote", "code", "p"]);
  assert.equal(b[0].level, 2);
  assert.deepEqual(b[2].items, ["Brand fill", "Bigger type on two lines"]);
  assert.equal(b[2].start, 1);
  assert.deepEqual(b[5].lines, ["<Hero />"]);
});

test("inline marks: bold, italic, code and safe links; words with underscores stay words", () => {
  assert.deepEqual(mdInline("a **b** *c* `d` [e](https://f.example)"), [
    { t: "text", text: "a " }, { t: "b", text: "b" }, { t: "text", text: " " }, { t: "i", text: "c" }, { t: "text", text: " " },
    { t: "code", text: "d" }, { t: "text", text: " " }, { t: "a", text: "e", href: "https://f.example" }]);
  assert.deepEqual(mdInline("brand_muted and _soft_"), [{ t: "text", text: "brand_muted and " }, { t: "i", text: "soft" }]);
  assert.ok(!mdInline("[x](javascript:alert)").some((r) => r.t === "a"), "only http, https and mailto links");
  assert.deepEqual(mdInline("half **done"), [{ t: "text", text: "half **done" }], "an unfinished mark, mid-stream, stays as written");
  assert.deepEqual(mdInline("one\ntwo").map((r) => r.t), ["text", "br", "text"]);
});

test("nothing is lost: plain text with no marks comes back as one paragraph", () => {
  assert.deepEqual(mdBlocks("Just a sentence."), [{ type: "p", text: "Just a sentence." }]);
  assert.deepEqual(mdBlocks(""), []);
});
