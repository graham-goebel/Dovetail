/* A frame as a spec to build from (model/spec.js) and the assistant's
   frame_spec tool. Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, make } from "../../../assets/builder/model/tree.js";
import { specOf, specText } from "../../../assets/builder/model/spec.js";
import { TOOLS, runTool } from "../../../assets/builder/model/agent.js";

function page() {
  const doc = emptyDoc();
  const f = doc.frames[0];
  f.name = "Launch";
  const card = make("Card", { title: "Kiln tour" }, null, { padding: "md", radius: "lg" });
  card.inst = { of: "c1", rev: 1 };
  f.root.children.push(
    make("Section", { tone: "brand" }, [make("Heading", { children: "Fired by hand", size: "display-md" }), make("Button", { variant: "secondary", children: "Shop" })], { paddingTop: "lg" }),
    make("Group", { direction: "row", gap: "md" }, [card]),
  );
  return { doc, f, library: { components: [{ id: "c1", name: "Tour card", node: card }] } };
}

test("a spec names the components and the variants each is set to, the tokens behind the styles, and the file's own components", () => {
  const { f, library } = page();
  const s = specOf(f, library);
  assert.equal(s.name, "Launch");
  assert.ok(s.layers >= 5);
  const by = Object.fromEntries(s.components.map((c) => [c.type, c]));
  assert.deepEqual(by.Section.variants.tone, ["brand"]);
  assert.deepEqual(by.Button.variants.variant, ["secondary"]);
  assert.ok(s.tokens.some((t) => /--dt-space-inline-md/.test(t.token) && t.families.includes("gap")), JSON.stringify(s.tokens));
  assert.ok(s.tokens.length > 1, "styles set to tokens are listed by their custom properties");
  assert.deepEqual(s.own, [{ name: "Tour card", count: 1 }]);
  const text = specText(s, "  - Section", "<Section />");
  assert.match(text, /^# Launch/);
  assert.match(text, /## Components[\s\S]*Button ×1: variant secondary/);
  assert.match(text, /## Code\n```jsx\n<Section \/>/);
});

test("frame_spec writes the spec with the frame's code, or one layer's", async () => {
  assert.ok(TOOLS.some((t) => t.name === "frame_spec"));
  assert.ok(TOOLS.length <= 40);
  const { doc, f, library } = page();
  const asked = [];
  const api = { doc: () => doc, library: () => library, frameCode: (fid, id) => { asked.push([fid, id]); return "<Launch />"; } };
  const r = await runTool(api, { name: "frame_spec", input: {} });
  assert.ok(r.ok && /# Launch/.test(r.result) && /```jsx\n<Launch \/>/.test(r.result) && /## Layers/.test(r.result), r.result.slice(0, 200));
  assert.deepEqual(asked[0], [f.id, null]);
  const part = await runTool(api, { name: "frame_spec", input: { id: f.root.children[0].id } });
  assert.ok(part.ok && /Heading ×1/.test(part.result) && !/Card ×1/.test(part.result), part.result.slice(0, 300));
  assert.equal(asked[1][1], f.root.children[0].id);
  assert.equal((await runTool(api, { name: "frame_spec", input: { id: "nope" } })).ok, false);
  const noCode = await runTool({ doc: () => doc }, { name: "frame_spec", input: {} });
  assert.ok(noCode.ok && !/## Code/.test(noCode.result), "without a drawn frame it still writes the spec");
});
