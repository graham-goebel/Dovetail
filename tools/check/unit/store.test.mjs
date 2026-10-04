/* Projects: the store's own calls, run over its localStorage fallback (the
   same calls the IndexedDB backend answers). Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { makeStore, localBackend, VERSIONS_MAX } from "../../../assets/builder/model/store.js";
import { make, makeFrame } from "../../../assets/builder/model/tree.js";

const doc = (name = "Home") => { const f = makeFrame(name, "desktop"); f.root.children = [make("Heading", { children: name })]; return { frames: [f], active: f.id }; };
const fresh = () => { window.localStorage.removeItem("dovetail-builder-store"); return makeStore(localBackend()); };

test("projects are made, listed newest first, renamed and loaded", async () => {
  const s = fresh();
  const a = await s.createProject("Kiln site", doc("Kiln"));
  await new Promise((r) => setTimeout(r, 5));
  const b = await s.createProject("Shop", doc("Shop"));
  assert.deepEqual((await s.listProjects()).map((p) => p.name), ["Shop", "Kiln site"]);
  await new Promise((r) => setTimeout(r, 5));
  await s.saveDoc(a.id, doc("Kiln two"));
  assert.equal((await s.listProjects())[0].id, a.id, "a save moves it to the top");
  assert.equal((await s.renameProject(b.id, "  Shop front  ")).name, "Shop front");
  const loaded = await s.loadDoc(a.id);
  assert.equal(loaded.frames[0].root.children[0].props.children, "Kiln two");
});

test("duplicate copies the document; delete takes the project and its versions", async () => {
  const s = fresh();
  const a = await s.createProject("Kiln site", doc());
  const copy = await s.duplicateProject(a.id);
  assert.equal(copy.name, "Kiln site copy");
  assert.equal((await s.loadDoc(copy.id)).frames[0].name, "Home");
  await s.addVersion(a.id, doc(), "Saved by you");
  await s.deleteProject(a.id);
  assert.equal(await s.getProject(a.id), undefined);
  assert.equal((await s.listVersions(a.id)).length, 0);
  assert.equal((await s.listProjects()).length, 1);
});

test("versions come back newest first, at most " + VERSIONS_MAX, async () => {
  const s = fresh();
  const a = await s.createProject("Kiln site", doc());
  for (let i = 0; i < VERSIONS_MAX + 3; i++) await s.addVersion(a.id, doc("v" + i), "v" + i);
  const vs = await s.listVersions(a.id);
  assert.equal(vs.length, VERSIONS_MAX);
  assert.equal(vs[0].label, "v" + (VERSIONS_MAX + 2));
  assert.equal((await s.loadVersion(vs[0].key)).frames[0].name, "v" + (VERSIONS_MAX + 2));
});

test("work saved before projects moves into a project, with its backup as a version", async () => {
  const s = fresh();
  window.localStorage.setItem("dovetail-builder", JSON.stringify(doc("My old page")));
  window.localStorage.setItem("dovetail-builder-previous", JSON.stringify(doc("Older")));
  await s.migrate();
  const [p] = await s.listProjects();
  assert.equal(p.name, "My old page");
  assert.equal(s.lastOpened(), p.id);
  assert.equal((await s.listVersions(p.id))[0].label, "Before projects");
  assert.equal(window.localStorage.getItem("dovetail-builder"), null, "the old entry is cleared once copied");
  await s.migrate();
  assert.equal((await s.listProjects()).length, 1, "migrating twice makes nothing new");
});

test("a saved document is cleaned when it loads", async () => {
  const s = fresh();
  const bad = doc();
  bad.frames[0].root.children.push({ type: "Sparkle", props: {} }, { type: "Button", props: { onClick: "alert(1)", children: "Go" } });
  const a = await s.createProject("Odd", bad);
  const loaded = await s.loadDoc(a.id);
  assert.deepEqual(loaded.frames[0].root.children.map((c) => c.type), ["Heading", "Button"]);
  assert.equal(loaded.frames[0].root.children[1].props.onClick, undefined);
});
