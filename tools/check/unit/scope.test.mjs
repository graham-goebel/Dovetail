/* Which tokens a layer is offered (assets/builder/config.js scopeOf and
   optionAllowed): sizes and spacing that suit its kind, on the right axis,
   and what a mixed selection has in common. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { DATA, optionAllowed, roleOf, scopeOf } from "../../../assets/builder/config.js";

const offered = (key, types, opts) => { const sc = scopeOf(types, opts); return DATA.tokens[key].options.filter((o) => optionAllowed(key, o, sc)).map((o) => o.value); };

test("each type has a role; a container at the top of a frame is a band", () => {
  assert.equal(roleOf("Button"), "control");
  assert.equal(roleOf("Avatar"), "avatar");
  assert.equal(roleOf("Text"), "text");
  assert.equal(roleOf("Image"), "media");
  assert.equal(roleOf("Section"), "band");
  assert.equal(roleOf("HeroBlock"), "band");
  assert.equal(roleOf("Group"), "container");
  assert.equal(roleOf("Group", true), "band");
  assert.equal(roleOf("Card", true), "container");
});

test("a page width never sizes a height", () => {
  for (const t of ["Text", "Group", "Section", "Image", "Button"]) {
    assert.ok(!offered("height", [t]).includes("narrow"), t + " height offers a page width");
    assert.ok(!offered("h", [t]).includes("narrow"), t + " min height offers a page width");
  }
  assert.ok(offered("w", ["Group"]).includes("default"), "a Group's width offers the page column");
});

test("control, icon and avatar sizes only reach their own components", () => {
  assert.ok(offered("w", ["Button"]).includes("control-md"));
  assert.ok(!offered("w", ["Text"]).some((v) => /^(control|icon|avatar)-/.test(v)), "a Text's width offers a component size");
  assert.ok(!offered("height", ["Group"]).some((v) => /^(control|icon|avatar)-/.test(v)), "a Group's height offers a component size");
  assert.ok(offered("w", ["Avatar"]).includes("avatar-md") && !offered("w", ["Avatar"]).includes("control-md"));
  assert.ok(offered("height", ["Icon"]).includes("icon-md"));
});

test("artboard sizes only on a social frame", () => {
  assert.ok(!offered("height", ["Image"]).some((v) => /^artboard/.test(v)));
  assert.ok(offered("height", ["Image"], { social: true }).includes("artboard-story"));
  assert.ok(offered("height", ["Image"]).includes("media-min"));
});

test("section padding, the gutter and the layout layers only reach containers and bands", () => {
  for (const t of ["Button", "Text", "Image", "Avatar"]) {
    const pad = offered("padding", [t]);
    assert.ok(!pad.some((v) => /^module/.test(v) || ["related", "group", "block", "section"].includes(v)), t + " padding offers " + pad.join(","));
    assert.ok(!offered("paddingLeft", [t]).includes("gutter"), t + " padding left offers the gutter");
  }
  assert.ok(offered("padding", ["Section"]).includes("module-lg"));
  assert.ok(offered("padding", ["Group"]).includes("block"));
  assert.ok(offered("paddingTop", ["Group"]).includes("module-xl"));
  assert.ok(offered("paddingLeft", ["Group"]).includes("gutter"));
});

test("a module padding step never pads a side", () => {
  for (const k of ["paddingLeft", "paddingRight"]) {
    assert.ok(!offered(k, ["Section"]).some((v) => /^module($|-(sm|lg|xl)$)/.test(v)), k + " offers a module step");
    assert.ok(offered(k, ["Section"]).includes("module-inset"));
  }
});

test("a mixed selection is offered what its layers have in common", () => {
  const both = offered("w", ["Button", "Text"]);
  assert.ok(!both.includes("control-md"), "Button and Text together offer a control size");
  assert.ok(both.includes("hug") && both.includes("x2"));
  assert.deepEqual(scopeOf(["Group", "Text"]).space.slice().sort(), ["inset", "space"]);
  assert.ok(!offered("padding", ["Group", "Button"]).includes("block"));
});

test("steps of the size grid read --dt-size-step, not a control's name", () => {
  const o = DATA.tokens.w.options.find((x) => x.value === "x2");
  assert.equal(JSON.stringify(o.tokens), JSON.stringify(["--dt-size-step"]), "the builder data comes from another realm, so compare it as JSON");
  assert.equal(o.label, "step × 2");
});
