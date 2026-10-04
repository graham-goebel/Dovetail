/* What a project uses of the system (assets/builder/model/usage.js), which
   the inspector lists when nothing is selected. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, makeFrame } from "../../../assets/builder/model/tree.js";
import { mergeUsage, usageOf, usesToken } from "../../../assets/builder/model/usage.js";

const doc = (...children) => { const f = makeFrame("Home", "desktop"); f.root.children = children; return { frames: [f], active: f.id }; };

test("usage: the components placed, the tokens their styles name, the frame's surface, and text styles", () => {
  const g = make("Group", { direction: "column" }, [make("Heading", { size: "heading-lg" })], { padding: "md", radius: "lg", elevation: "2" });
  const hero = make("HeroBlock");
  const u = usageOf([doc(g, hero)]);
  assert.ok(u.types.Group && u.types.Heading && u.types.HeroBlock, "each type placed");
  assert.ok(!u.types.Root, "not the frame's own root");
  assert.ok(usesToken(u, "padding", "md") && usesToken(u, "radius", "lg") && usesToken(u, "elevation", "2"), "the token options styles name");
  assert.ok(usesToken(u, ["padding", "paddingTop"], "md") && !usesToken(u, "padding", "lg"), "under any of the keys asked about, and nothing else");
  assert.ok(usesToken(u, "surface", "base"), "the frame's surface");
  assert.ok(u.text["heading-lg"], "a text style a prop names");
  assert.ok(u.text["display-sm"], "and one a component takes by default (the hero's title)");
});

test("usage across pages: two usages as one", () => {
  const a = usageOf([doc(make("Heading"))]);
  const b = usageOf([doc(make("Text", {}, null, { padding: "sm" }))]);
  const both = mergeUsage(a, b);
  assert.ok(both.types.Heading && both.types.Text && usesToken(both, "padding", "sm"));
  assert.ok(!mergeUsage(a, null).types.Text, "with nothing from elsewhere, just the one");
  assert.deepEqual(usageOf([null, { frames: "no" }]), { types: {}, tokens: {}, text: {} }, "anything that isn't a document is passed over");
});
