/* Projects: the store's own calls, run over its localStorage fallback (the
   same calls the IndexedDB backend answers). Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { makeStore, localBackend, pagesOf, pageOf, foldersOf, itemsOf, MAIN, VERSIONS_MAX } from "../../../assets/builder/model/store.js";
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

test("pages: each its own canvas, added, renamed, moved, copied and removed", async () => {
  const s = fresh();
  const a = await s.createProject("Kiln site", doc("Home"));
  assert.deepEqual(pagesOf(a).map((p) => p.name), ["Page 1"], "a new project has one page");
  const added = await s.addPage(a.id, "About", doc("About"));
  const about = added.page.id;
  assert.deepEqual(pagesOf(added.meta).map((p) => p.name), ["Page 1", "About"]);
  assert.equal((await s.loadDoc(a.id)).frames[0].root.children[0].props.children, "Home", "the first page is the project's own document");
  assert.equal((await s.loadDoc(a.id, about)).frames[0].root.children[0].props.children, "About", "a page has its own");
  await s.saveDoc(a.id, doc("About again"), about);
  assert.equal((await s.loadDoc(a.id, about)).frames[0].root.children[0].props.children, "About again");
  assert.equal((await s.loadDoc(a.id)).frames[0].root.children[0].props.children, "Home", "saving one page leaves the other");
  assert.equal((await s.getProject(a.id)).frames, 2, "the project counts frames across its pages");
  await s.renamePage(a.id, MAIN, "Home");
  const moved = await s.movePage(a.id, about, -1);
  assert.deepEqual(pagesOf(moved).map((p) => p.name), ["About", "Home"]);
  const copy = await s.duplicatePage(a.id, about);
  assert.deepEqual(pagesOf(copy.meta).map((p) => p.name), ["About", "About copy", "Home"], "a copy goes right after the page it copies");
  await s.addVersion(a.id, doc("About v"), "Saved", about);
  assert.equal((await s.listVersions(a.id, about)).length, 1, "versions are kept per page");
  assert.equal((await s.listVersions(a.id, MAIN)).length, 0);
  await s.setPage(a.id, about);
  assert.equal(pageOf(await s.getProject(a.id)), about, "the project opens on the page last open");
  const after = await s.deletePage(a.id, about);
  assert.deepEqual(pagesOf(after).map((p) => p.name), ["About copy", "Home"]);
  assert.equal(await s.loadDoc(a.id, about), null, "its document goes");
  assert.equal((await s.listVersions(a.id, about)).length, 0, "and its versions");
  assert.notEqual(pageOf(after), about, "the project opens elsewhere");
  const last = await s.deletePage(a.id, copy.page.id);
  assert.equal(pagesOf(await s.deletePage(a.id, MAIN)).length, 1, "the last page can't be removed");
  assert.ok(last);
});

test("pages: a project saved before pages is one page, and copies and deletes take every page", async () => {
  const s = fresh();
  const a = await s.createProject("Old", doc("Old"));
  /* As saved before pages: no pages list. */
  const raw = JSON.parse(window.localStorage.getItem("dovetail-builder-store"));
  delete raw.projects[a.id].pages; delete raw.projects[a.id].page; delete raw.projects[a.id].pageFrames;
  window.localStorage.setItem("dovetail-builder-store", JSON.stringify(raw));
  const old = await s.getProject(a.id);
  assert.deepEqual(pagesOf(old).map((p) => p.id), [MAIN]);
  assert.equal(pageOf(old), MAIN);
  const p2 = (await s.addPage(a.id, "Two", doc("Two"))).page.id;
  assert.equal((await s.getProject(a.id)).frames, 2, "the old page's frames still count");
  const copy = await s.duplicateProject(a.id);
  assert.deepEqual(pagesOf(copy).map((p) => p.name), ["Page 1", "Two"]);
  const copyTwo = pagesOf(copy)[1].id;
  assert.equal((await s.loadDoc(copy.id, copyTwo)).frames[0].root.children[0].props.children, "Two");
  await s.deleteProject(a.id);
  assert.equal(await s.loadDoc(a.id, p2), null, "deleting a project takes every page");
  assert.equal(await s.loadDoc(a.id), null);
});

test("pages: folders group pages, which move between and within them", async () => {
  const s = fresh();
  const a = await s.createProject("Kiln site", doc("Home"));
  const about = (await s.addPage(a.id, "About", doc("About"))).page.id;
  const shop = (await s.addPage(a.id, "Shop", doc("Shop"))).page.id;
  const made = await s.addFolder(a.id, "Marketing");
  const fid = made.folder.id;
  assert.deepEqual(foldersOf(made.meta).map((f) => f.name), ["Marketing"], "a folder is added, open");
  let m = await s.placePage(a.id, about, 0, fid);
  assert.deepEqual(pagesOf(m).map((p) => p.name + (p.folder ? "/" + p.folder : "")), ["About/" + fid, "Page 1", "Shop"], "a page goes first, into the folder");
  m = await s.placePage(a.id, shop, 1, fid);
  assert.deepEqual(pagesOf(m).map((p) => p.name), ["About", "Shop", "Page 1"]);
  assert.deepEqual(itemsOf(pagesOf(m)).map((it) => (it.folder || "loose") + ":" + it.pages.length), [fid + ":2", "loose:1"], "the folder's pages sit together as one item");
  m = await s.placePage(a.id, shop, 99, "nope");
  assert.deepEqual(pagesOf(m).map((p) => p.name + (p.folder ? "/f" : "")), ["About/f", "Page 1", "Shop"], "an index past the end goes last; an unknown folder means loose");
  m = await s.renamePage(a.id, about, "Story");
  assert.equal(pagesOf(m)[0].folder, fid, "renaming keeps the folder");
  const inFolder = await s.addPage(a.id, "Press", doc("Press"), about);
  assert.equal(inFolder.page.folder, fid, "a page added after one in a folder joins it");
  m = await s.moveFolder(a.id, fid, 1);
  assert.deepEqual(pagesOf(m).map((p) => p.name), ["Page 1", "Story", "Press", "Shop"], "a folder moves past the loose page beside it, pages together");
  m = await s.foldFolder(a.id, fid, false);
  assert.equal(foldersOf(m)[0].open, false, "a folder closes");
  m = await s.renameFolder(a.id, fid, "Brand");
  assert.equal(foldersOf(m)[0].name, "Brand");
  const copy = await s.duplicateProject(a.id);
  assert.deepEqual(foldersOf(copy).map((f) => f.name), ["Brand"], "a copy of the project keeps the folder");
  assert.deepEqual(pagesOf(copy).map((p) => p.name + (p.folder ? "/f" : "")), ["Page 1", "Story/f", "Press/f", "Shop"], "and which pages are in it");
  m = await s.deleteFolder(a.id, fid);
  assert.deepEqual(foldersOf(m), []);
  assert.deepEqual(pagesOf(m).map((p) => p.name + (p.folder ? "/f" : "")), ["Page 1", "Story", "Press", "Shop"], "deleting a folder leaves its pages where they were, loose");
  m = await s.setFolders(a.id, [{ id: "x1", name: "Given" }, { id: "bad id", name: "No" }, null]);
  assert.deepEqual(foldersOf(m), [{ id: "x1", name: "Given" }], "setFolders keeps only well-formed folders");
});
