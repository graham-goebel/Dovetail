/* Names worked out for unnamed layers (model/names.js). */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make } from "../../../assets/builder/model/tree.js";
import { autoName, layerName } from "../../../assets/builder/model/names.js";

const shape = (shape, style = {}, props = {}) => { const n = make("Shape", { shape, ...props }); n.style = style; return n; };

test("a container is called after its first heading, else its first text", () => {
  const tile = make("Group", {}, [make("Text", { variant: "eyebrow", children: "Spent in October" }), make("Heading", { children: "$6,214" })]);
  assert.equal(autoName(tile), "$6,214");
  assert.equal(autoName(make("Group", {}, [make("Text", { children: "Saved this month" })])), "Saved this month");
  const deep = make("Section", {}, [make("Group", {}, [make("Heading", { children: "Where it lives" })])]);
  assert.equal(autoName(deep), "Where it lives section", "a heading further in names the wrapper with its layout");
  assert.equal(autoName(deep.children[0]), "Where it lives", "the layer that holds the heading takes its words");
});

test("long words are cut, and hidden layers don't count", () => {
  const g = make("Group", {}, [make("Heading", { children: "Dining is $60 over with 19 days to go this month" })]);
  assert.equal(autoName(g), "Dining is $60 over with 19…");
  const hid = make("Heading", { children: "Secret" }); hid.hide = true;
  assert.equal(autoName(make("Group", {}, [hid, make("Text", { children: "Shown" })])), "Shown");
});

test("a container of like things is counted, and an empty one keeps its type", () => {
  assert.equal(autoName(make("Group", {}, [make("Button", {}), make("Button", {}), make("Button", {})])), "3 Buttons");
  assert.equal(autoName(make("Group", {}, [shape("rectangle", { w: "fill", height: "x2" }), shape("rectangle", { w: "fill", height: "x4" })])), "2 Bars");
  assert.equal(autoName(make("Group", {}, [])), "");
  assert.equal(layerName(make("Group", {}, [])), "Group");
});

test("what a container is, when that shows: chips, tiles, a bar chart, a ring", () => {
  const chip = (t) => { const g = make("Group", {}, [make("Text", { children: t })]); g.style = { radius: "pill" }; return g; };
  assert.equal(autoName(make("Group", {}, [chip("Overview"), chip("Plans")])), "Chips");
  assert.equal(autoName(chip("Overview")), "Overview");
  const tile = () => { const g = make("Group", {}, [make("Text", { children: "x" })]); g.style = { surface: "raised", radius: "overlay" }; return g; };
  assert.equal(autoName(make("Grid", {}, [tile(), tile(), tile()])), "Tiles");
  const bars = make("Group", {}, [0, 1, 2].map(() => make("Group", {}, [shape("rectangle", { w: "fill", height: "x3" })])));
  assert.equal(autoName(make("Group", { direction: "column" }, [bars, make("Text", { children: "Rent" })])), "Bar chart");
  const ring = make("Group", {}, [make("Heading", { children: "31%" })]); ring.style = { radius: "pill", w: "x4", height: "x4" };
  assert.equal(autoName(ring), "Ring");
});

test("a shape is called by what it looks like", () => {
  assert.equal(autoName(shape("ellipse", { blur: "glass", w: "x6", height: "x6" })), "Glow");
  assert.equal(autoName(shape("ellipse", { w: "x4", height: "x4" })), "Circle");
  assert.equal(autoName(shape("ellipse", { w: "x6", height: "x4" })), "Ellipse");
  assert.equal(autoName(shape("line", {}, { end: "arrow" })), "Arrow");
  assert.equal(autoName(shape("line")), "Line");
  assert.equal(autoName(shape("rectangle", { radius: "pill" })), "Pill");
  assert.equal(autoName(shape("rectangle")), "Rectangle");
});

test("a given name wins, and text components keep their type with their words beside it", () => {
  const g = make("Group", {}, [make("Heading", { children: "Hero" })]); g.name = "Top";
  assert.equal(autoName(g), "");
  assert.equal(layerName(g), "Top");
  assert.equal(autoName(make("Heading", { children: "Hello" })), "");
  assert.equal(layerName(make("Heading", { children: "Hello" })), "Heading");
});

test("a plain wrapper doesn't share a name with what it wraps, rows read with their label, and a list is named by its items", () => {
  const tile = make("Group", {}, [make("Group", {}, [make("Text", { children: "Spent" }), make("Heading", { children: "$6,214" })]), make("Group", {}, [make("Heading", { children: "$6,214" })])]);
  const outer = make("Group", {}, [tile]);
  assert.equal(autoName(tile), "$6,214 row");
  assert.equal(autoName(outer), "$6,214 wrapper");
  const row = (label, amount) => make("Group", {}, [make("Group", {}, [make("Shape", { shape: "ellipse" }), make("Text", { children: label })]), make("Text", { children: amount })]);
  assert.equal(autoName(row("Rent", "$2,400")), "Rent · $2,400");
  assert.equal(autoName(make("Group", {}, [row("Rent", "$2,400"), row("Food", "$1,310"), row("Travel", "$880")])), "Rent, Food, Travel");
});

test("a carousel is called by what its slides are", () => {
  assert.equal(autoName(make("Carousel", {}, [make("Cover", { title: "Fern" }), make("Cover", { title: "Tide" })])), "Covers carousel");
});
