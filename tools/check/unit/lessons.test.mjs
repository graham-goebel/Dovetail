/* Lessons: rules the person taught the assistant, kept in a doc in the
   file's or project's context (model/context.js addLesson), and the
   remember tool that keeps them (model/agent.js). Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS, addLesson, contextFor, contextText, lessonsOf } from "../../../assets/builder/model/context.js";
import { emptyDoc } from "../../../assets/builder/model/tree.js";
import { TOOLS, practiceScript, runTool, systemPrompt } from "../../../assets/builder/model/agent.js";

test("the first lesson makes a Lessons doc sent with every request; later ones add a line, and a repeat isn't added", () => {
  const mine = { id: "d1", kind: "doc", source: "written", use: "always", pages: [], title: "Voice", body: "Warm.", updatedAt: 1 };
  const a = addLesson([mine], "  - Never use brand fills on cards ");
  assert.ok(a.added);
  assert.equal(a.count, 1);
  assert.equal(a.items.length, 2);
  assert.equal(a.items[0], mine, "the person's own docs are left as they are");
  const doc = a.items[1];
  assert.equal(doc.title, LESSONS);
  assert.equal(doc.source, "generated");
  assert.deepEqual(lessonsOf(doc), ["Never use brand fills on cards"]);
  const b = addLesson(a.items, "Headlines are sentence case");
  assert.deepEqual(lessonsOf(b.items[1]), ["Never use brand fills on cards", "Headlines are sentence case"]);
  assert.equal(b.items.length, 2, "one Lessons doc, not two");
  const again = addLesson(b.items, "never use BRAND fills on cards!");
  assert.ok(!again.added);
  assert.equal(again.count, 2);
  assert.equal(addLesson(b.items, "   ").added, false);
  const sent = contextText(contextFor({ file: b.items }, "p1"));
  assert.match(sent, /## Lessons[\s\S]*- Headlines are sentence case/);
});

test("remember keeps a lesson through the app, says where, and shows as a step, not a canvas change", () => {
  assert.ok(TOOLS.some((t) => t.name === "remember"));
  assert.ok(TOOLS.length <= 40);
  assert.match(systemPrompt(), /call remember/);
  let items = [];
  const api = { doc: () => emptyDoc(), remember: (lesson, scope) => { const r = addLesson(items, lesson); items = r.items; return { added: r.added, count: r.count, lesson: r.lesson, scope }; } };
  const r = runTool(api, { name: "remember", input: { lesson: "Buttons are sentence case" } });
  assert.ok(r.ok && /this file's Lessons/.test(r.result) && /Kept a lesson/.test(r.step), JSON.stringify(r));
  assert.equal(r.change, undefined, "nothing for Undo all to take back on the canvas");
  const p = runTool(api, { name: "remember", input: { lesson: "Buttons are sentence case", scope: "project" } });
  assert.match(p.result, /already in the project's Lessons/);
  assert.equal(runTool({ doc: api.doc }, { name: "remember", input: { lesson: "x" } }).ok, false);
});

test("practice mode keeps what it's asked to remember", () => {
  const script = practiceScript([]);
  const r = script({ tools: TOOLS, messages: [{ role: "user", content: "Remember that cards never get brand fills." }] });
  assert.deepEqual(r.calls, [{ name: "remember", input: { lesson: "cards never get brand fills" } }]);
});
