/* The Playground: every page of every file is something the builder keeps
   whole, and it's made once per browser. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { clean } from "../../../assets/builder/model/tree.js";
import { makeStore, localBackend, pagesOf } from "../../../assets/builder/model/store.js";
import { PLAYGROUND_KEY, playground, seedPlayground, addPlayground } from "../../../assets/builder/model/playground.js";

const fresh = () => { window.localStorage.removeItem("dovetail-builder-store"); window.localStorage.removeItem(PLAYGROUND_KEY); return makeStore(localBackend()); };

test("every page of the Playground cleans with nothing left out", () => {
  const pg = playground();
  assert.equal(pg.files[0].name, "Start here");
  assert.ok(pg.files.length >= 6, "Start here and the examples");
  for (const file of pg.files) {
    assert.ok(file.pages.length >= 1, file.name + " has a page");
    for (const page of file.pages) {
      const report = [];
      const cleaned = clean(page.doc, report);
      assert.deepEqual(report, [], `${file.name} / ${page.name} keeps everything`);
      assert.equal(cleaned.frames.length, page.doc.frames.length, `${file.name} / ${page.name} keeps its frames`);
      assert.ok(cleaned.frames.every((f) => f.root.children.length), `${file.name} / ${page.name}: every frame holds something`);
      const ids = [];
      cleaned.frames.forEach((f) => (function walk(n) { ids.push(n.id); (n.children || []).forEach(walk); })(f.root));
      const nodeIds = ids.filter((x) => x !== "root");
      assert.equal(new Set(nodeIds).size, nodeIds.length, `${file.name} / ${page.name}: ids are unique`);
    }
  }
});

test("addPlayground makes the project with its files and pages, Start here most recent", async () => {
  const s = fresh();
  const made = await addPlayground(s);
  assert.equal(made.group.name, "Playground");
  assert.equal(made.group.kind, "playground");
  const files = await s.filesIn(made.group.id);
  assert.equal(files.length, playground().files.length);
  assert.equal(files[0].name, "Start here", "the newest file is Start here");
  assert.equal(made.first.name, "Start here");
  assert.deepEqual(pagesOf(made.first).map((p) => p.name), playground().files[0].pages.map((p) => p.name));
  const welcome = await s.loadDoc(made.first.id, pagesOf(made.first)[0].id);
  assert.equal(welcome.frames[0].name, "Welcome");
});

test("seedPlayground runs once, and not again after the project is deleted or the flag is lost", async () => {
  const s = fresh();
  const first = await seedPlayground(s);
  assert.ok(first && first.group, "a first visit gets the Playground");
  assert.equal(await seedPlayground(s), null, "a second visit doesn't");
  window.localStorage.removeItem(PLAYGROUND_KEY);
  assert.equal(await seedPlayground(s), null, "storage cleared, but the project is still there");
  assert.equal((await s.listGroups()).length, 1);
  await s.deleteGroup(first.group.id);
  assert.equal(await seedPlayground(s), null, "deleted on purpose, it stays deleted");
  assert.equal((await s.listGroups()).length, 0);
});
