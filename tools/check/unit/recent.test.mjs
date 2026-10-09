/* What the person changed since the assistant's last reply (model/recent.js). */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { produce } from "immer";
import { emptyDoc } from "../../../assets/builder/model/tree.js";
import { editsText, recentEdits } from "../../../assets/builder/model/recent.js";

function base() {
  const d = emptyDoc();
  d.frames[0].name = "Pricing";
  d.frames[0].root.children = [
    { id: "hero", type: "Section", name: "Hero", props: {}, style: {}, children: [
      { id: "h", type: "Heading", props: { children: "Pro is here" }, style: {} },
      { id: "b", type: "Button", props: { children: "Start", variant: "secondary" }, style: {} },
    ] },
    { id: "faq", type: "Section", name: "FAQ", props: {}, style: {}, children: [] },
    { id: "cmp", type: "Section", name: "Compare", props: {}, style: {}, children: [] },
    { id: "team", type: "Card", props: { title: "Team" }, style: {}, children: [] },
  ];
  return d;
}

test("nothing changed says nothing", () => {
  const d = base();
  assert.deepEqual(recentEdits(d, d), { count: 0, lines: [] });
  assert.equal(editsText(recentEdits(d, d)), "");
});

test("text, props, tokens, order, removal and additions read as one line each", () => {
  const a = base();
  const b = produce(a, (d) => {
    const kids = d.frames[0].root.children;
    kids[0].children[0].props.children = "Meet Pro";
    kids[0].children[1].props.variant = "primary";
    kids[0].style.surface = "brand-muted";
    const team = kids.pop();
    kids.splice(1, 2, kids[2], kids[1]);
    kids[0].children.push({ id: "n", type: "Badge", props: { children: "New" }, style: {}, children: [{ id: "n2", type: "Text", props: {}, style: {} }] });
    void team;
  });
  const ed = recentEdits(a, b);
  const all = ed.lines.join("\n");
  assert.match(all, /Heading: text “Pro is here” → “Meet Pro”/);
  assert.match(all, /Button “Start”: variant secondary → primary/);
  assert.match(all, /Hero: surface none → brand-muted/);
  assert.match(all, /Removed Card “Team”/);
  assert.match(all, /Moved Compare within the frame/);
  assert.match(all, /Added Badge “New” to Hero/);
  assert.ok(!/Text/.test(all), "a child added with its parent isn't listed on its own");
  assert.match(editsText(ed), /^Since your last reply, the person changed/);
});

test("moving a layer into another, renaming and hiding", () => {
  const a = base();
  const b = produce(a, (d) => {
    const kids = d.frames[0].root.children;
    const btn = kids[0].children.pop();
    kids[1].children.push(btn);
    kids[2].name = "Plans compared";
    kids[3].hidden = true;
  });
  const all = recentEdits(a, b).lines.join("\n");
  assert.match(all, /Moved Button “Start” into FAQ/);
  assert.match(all, /Plans compared: renamed from Compare/);
  assert.match(all, /Card “Team”: hidden/);
});

test("many changes are capped, with the rest counted", () => {
  const a = base();
  const b = produce(a, (d) => { for (let i = 0; i < 20; i++) d.frames[0].root.children.push({ id: "x" + i, type: "Text", props: { children: "t" + i }, style: {} }); });
  const ed = recentEdits(a, b, 5);
  assert.equal(ed.count, 20);
  assert.equal(ed.lines.length, 5);
  assert.match(editsText(ed), /and 15 more/);
});
