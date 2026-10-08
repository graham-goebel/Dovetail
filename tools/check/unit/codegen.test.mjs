/* What the code export makes of My components (model/codegen.js): an
   instance as a call, the texts it changed as props, anything else it
   changed listed as left out, and the component once, as a function. Run
   with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, fresh } from "../../../assets/builder/model/tree.js";
import { codeWithComponents, functionName } from "../../../assets/builder/model/codegen.js";

const card = () => make("Group", { direction: "column", gap: "sm" }, [
  make("Heading", { children: "Card title" }),
  make("Text", { children: "A line of copy." }),
  make("Button", { children: "Learn more", variant: "primary" }),
], { padding: "md", radius: "container" });
const lib = (...components) => ({ components });
const comp = (id, name, node) => ({ id, name, node, tokens: [], rev: 1 });
const inst = (node, id, of) => Object.assign(fresh(node), { id, inst: { of, rev: 1 } });
const section = (...children) => make("Section", {}, children);

test("an instance becomes a call; a text it changed becomes a prop with the component's text as default", () => {
  const m = card();
  const a = inst(m, "a", "c1"), b = inst(m, "b", "c1");
  b.children[0].props.children = "Second card";
  const got = codeWithComponents([section(a, b)], lib(comp("c1", "Promo card", m)));
  const [calls] = got.roots.map((r) => r.children);
  assert.deepEqual(calls.map((c) => [c.type, c.props.name, c.props.values]), [["__Call", "PromoCard", {}], ["__Call", "PromoCard", { title: "Second card" }]]);
  assert.equal(got.components.length, 1);
  assert.deepEqual(got.components[0].params, [{ name: "title", def: "Card title" }]);
  assert.deepEqual(got.components[0].node.children[0].props.children, { __expr: "title" }, "the component writes its param where the text was");
  assert.equal(got.components[0].node.children[1].props.children, "A line of copy.", "an unchanged text stays as it is");
  assert.equal(m.children[0].props.children, "Card title", "the library's component is untouched");
  assert.deepEqual(got.leftOut, []);
});

test("a change that isn't text is left out of the code, and said so", () => {
  const m = card();
  const a = inst(m, "a", "c1");
  a.style.padding = "lg";
  a.children[2].props.variant = "secondary";
  a.children[1].hide = true;
  const b = inst(m, "b", "c1");
  b.children.push(make("Badge", { children: "New" }));
  b.name = "Featured";
  const got = codeWithComponents([section(a, b)], lib(comp("c1", "Promo card", m)));
  assert.deepEqual(got.roots[0].children.map((c) => c.props.values), [{}, {}], "both are the component as it is");
  assert.equal(got.leftOut.length, 2);
  assert.equal(got.leftOut[0].name, "Promo card");
  assert.ok(got.leftOut[0].what.some((w) => /padding/.test(w)), got.leftOut[0].what.join("; "));
  assert.ok(got.leftOut[0].what.some((w) => /variant on Button/.test(w)), got.leftOut[0].what.join("; "));
  assert.ok(got.leftOut[0].what.some((w) => /hidden layer/.test(w)), got.leftOut[0].what.join("; "));
  assert.deepEqual(got.leftOut[1], { id: "b", name: "Featured", component: "PromoCard", what: ["a different set of layers inside"] });
});

test("an instance's place is its own; only its position comes along with the call", () => {
  const m = card();
  const a = inst(m, "a", "c1");
  Object.assign(a.style, { x: 10, y: 20, ch: "right" });
  const got = codeWithComponents([make("Root", {}, [a])], lib(comp("c1", "Promo card", m)));
  assert.deepEqual(got.roots[0].children[0].style, { x: 10, y: 20, ch: "right" });
  assert.deepEqual(got.leftOut, [], "being placed isn't a change to the component");
});

test("a component inside a component is a call there too, and each function appears once", () => {
  const badge = make("Group", { direction: "row" }, [make("Badge", { children: "Sale" })], { padding: "xs" });
  const outer = make("Group", { direction: "column" }, [make("Heading", { children: "Mug" }), inst(badge, "bi", "c2")], { padding: "md" });
  const a = inst(outer, "a", "c1"), b = inst(outer, "b", "c1");
  const got = codeWithComponents([section(a, b)], lib(comp("c1", "Product tile", outer), comp("c2", "Sale badge", badge)));
  assert.deepEqual(got.components.map((c) => c.name), ["ProductTile", "SaleBadge"]);
  assert.equal(got.components[0].node.children[1].type, "__Call");
  assert.equal(got.components[0].node.children[1].props.name, "SaleBadge");
});

test("an instance whose component is gone is written out in full", () => {
  const m = card();
  const a = inst(m, "a", "gone");
  const got = codeWithComponents([section(a)], lib());
  assert.equal(got.roots[0].children[0].type, "Group");
  assert.deepEqual(got.components, []);
});

test("function names: PascalCase, clear of the system's own components and of each other", () => {
  const taken = {};
  assert.equal(functionName("product card", taken), "MyProductCard", "the system has a ProductCard");
  assert.equal(functionName("Promo card", taken), "PromoCard");
  assert.equal(functionName("promo-card", taken), "PromoCard2");
  assert.equal(functionName("3 up", taken), "C3Up");
});

test("params take a layer's own name when it has one, and never clash", () => {
  const m = card();
  m.children[1].name = "Blurb";
  m.children.push(make("Heading", { children: "Second heading" }));
  const a = inst(m, "a", "c1");
  a.children[0].props.children = "One";
  a.children[1].props.children = "Two";
  a.children[3].props.children = "Three";
  const got = codeWithComponents([section(a)], lib(comp("c1", "Promo card", m)));
  assert.deepEqual(got.components[0].params.map((p) => p.name), ["title", "blurb", "title2"]);
  assert.deepEqual(got.roots[0].children[0].props.values, { title: "One", blurb: "Two", title2: "Three" });
});
