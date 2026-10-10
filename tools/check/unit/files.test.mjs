/* Files in the cloud (cloud/files.js, cloud/mirror.js): the store watched
   by the mirror, over its localStorage fallback and a stand-in client with
   the three tables, counting page versions as schema.sql's trigger does.
   Run with npm run check:unit. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { makeStore, localBackend } from "../../../assets/builder/model/store.js";
import { make, makeFrame } from "../../../assets/builder/model/tree.js";
import { createMirrorHub, watchStore } from "../../../assets/builder/cloud/mirror.js";
import { settingsFor, metaFromRow, THUMB_MAX } from "../../../assets/builder/cloud/files.js";

const doc = (name = "Home") => { const f = makeFrame(name, "desktop"); f.root.children = [make("Heading", { children: name })]; return { frames: [f], active: f.id }; };
const headingOf = (d) => d.frames[0].root.children[0].props.children;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const freshStore = () => { window.localStorage.removeItem("dovetail-builder-store"); return makeStore(localBackend()); };

/* A stand-in for the three tables: insert, update, delete, select with eq
   filters, order, single/maybeSingle; pages count versions on update. */
function fakeClient(me = "u1") {
  let seq = 1;
  const db = { projects: [], pages: [], file_groups: [] };
  const uuid = () => `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;
  const from = (table) => {
    let op = "select", payload = null, single = false, maybe = false;
    const filters = [];
    const match = (r) => filters.every(([k, v]) => r[k] === v);
    const api = {
      select() { if (op === "select") return api; api.wantRows = true; return api; },
      order() { return api; },
      insert(p) { op = "insert"; payload = p; return api; },
      update(p) { op = "update"; payload = p; return api; },
      delete() { op = "delete"; return api; },
      eq(k, v) { filters.push([k, v]); return api; },
      single() { single = true; return api; },
      maybeSingle() { maybe = true; return api; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    const run = () => {
      if (op === "insert") {
        const rows = [].concat(payload).map((p) => {
          if (table === "pages") {
            if (db.pages.some((x) => x.project_id === p.project_id && x.page_id === p.page_id)) return null;
            return { ...p, version: 1, updated_at: new Date().toISOString() };
          }
          return { id: uuid(), owner: me, updated_at: new Date().toISOString(), group_id: null, ...p };
        });
        if (rows.some((r) => !r)) return { data: null, error: { message: "duplicate key value violates unique constraint" } };
        db[table].push(...rows);
        return { data: single ? rows[0] : rows, error: null };
      }
      if (op === "update") {
        const hit = db[table].filter(match);
        hit.forEach((r) => { Object.assign(r, payload); if (table === "pages") r.version += 1; r.updated_at = new Date().toISOString(); });
        return { data: hit.map((r) => ({ ...r })), error: null };
      }
      if (op === "delete") {
        const gone = db[table].filter(match);
        db[table] = db[table].filter((r) => !match(r));
        if (table === "projects") db.pages = db.pages.filter((p) => !gone.some((g) => g.id === p.project_id));
        if (table === "file_groups") db.projects.forEach((p) => { if (gone.some((g) => g.id === p.group_id)) p.group_id = null; });
        return { data: null, error: null };
      }
      const rows = db[table].filter(match).map((r) => ({ ...r }));
      if (single || maybe) return { data: rows[0] || null, error: single && !rows[0] ? { message: "no rows" } : null };
      return { data: rows, error: null };
    };
    return api;
  };
  return { db, from };
}

/* A store, its hub and a client, with the hub started and the first sync done. */
async function started(me = "u1", seed) {
  const local = freshStore();
  const hub = createMirrorHub();
  const store = watchStore(local, hub);
  if (seed) await seed(store);
  const sb = fakeClient(me);
  const events = [];
  await hub.start(sb, { me, onPageReplaced: (pid, pg, d) => events.push(["replaced", pid, pg, headingOf(d)]), onFilesChanged: () => events.push(["files"]) });
  return { store, hub, sb, events };
}

test("settings carry the file's pages, folders, colour and theme, and a small picture; the row reads back as a record", () => {
  const meta = { name: "Kiln site", pages: [{ id: "main", name: "Home" }], folders: [], page: "main", stage: "#112233", theme: { config: {}, brand: {}, media: {}, context: "" }, thumb: "data:image/jpeg;base64,abc", thumbSet: true, createdAt: 5 };
  const s = settingsFor(meta);
  assert.equal(s.thumb, meta.thumb);
  assert.equal(settingsFor({ ...meta, thumb: "x".repeat(THUMB_MAX + 1) }).thumb, undefined, "a large picture stays home");
  const back = metaFromRow({ id: "c1", name: "Kiln site", settings: s, owner: "u1" }, "g9");
  assert.equal(back.cloud, "c1"); assert.equal(back.group, "g9"); assert.equal(back.stage, "#112233"); assert.equal(back.createdAt, 5);
});

test("signing in uploads the files here, and a save follows with its version", async () => {
  const { store, hub, sb } = await started("u1", async (s) => { await s.createProject("Kiln site", doc("Kiln")); });
  assert.equal(sb.db.projects.length, 1, "the file is in the cloud");
  assert.equal(sb.db.pages.length, 1);
  const meta = (await store.listProjects())[0];
  assert.equal(meta.cloud, sb.db.projects[0].id);
  assert.deepEqual(meta.cloudVersions, { main: 1 });
  await store.saveDoc(meta.id, doc("Kiln two"));
  await tick(900);
  await hub.sync();
  assert.equal(headingOf(sb.db.pages[0].doc), "Kiln two", "the save went up");
  assert.equal(sb.db.pages[0].version, 2);
  assert.deepEqual((await store.getProject(meta.id)).cloudVersions, { main: 2 }, "and the version it made is remembered");
  assert.equal(hub.state().status, "synced");
});

test("a file from elsewhere comes down whole, into a matching project", async () => {
  const local = freshStore();
  const hub = createMirrorHub();
  const store = watchStore(local, hub);
  const sb = fakeClient("u1");
  sb.db.file_groups.push({ id: "g-cloud", name: "Shop work", owner: "u1" });
  sb.db.projects.push({ id: "f-cloud", name: "Shop", owner: "u1", group_id: "g-cloud", settings: { pages: [{ id: "main", name: "Front" }, { id: "n2", name: "About" }], folders: [], page: "n2", stage: "" } });
  sb.db.pages.push({ project_id: "f-cloud", page_id: "main", doc: doc("Front"), version: 3 }, { project_id: "f-cloud", page_id: "n2", doc: doc("About"), version: 1 });
  await hub.start(sb, { me: "u1" });
  const files = await store.listProjects();
  assert.equal(files.length, 1);
  assert.equal(files[0].name, "Shop"); assert.equal(files[0].cloud, "f-cloud"); assert.equal(files[0].page, "n2");
  assert.deepEqual(files[0].cloudVersions, { main: 3, n2: 1 });
  assert.equal(headingOf(await store.loadDoc(files[0].id, "n2")), "About");
  const groups = await store.listGroups();
  assert.equal(groups.length, 1); assert.equal(groups[0].cloud, "g-cloud"); assert.equal(files[0].group, groups[0].id);
  assert.equal(sb.db.projects.length, 1, "nothing was uploaded twice");
});

test("the cloud wins a page both changed: what was here is kept as a version, then replaced", async () => {
  const { store, hub, sb, events } = await started("u1", async (s) => { await s.createProject("Kiln site", doc("Kiln")); });
  const meta = (await store.listProjects())[0];
  /* Someone else saved first. */
  const row = sb.db.pages[0];
  row.doc = doc("Theirs"); row.version = 2;
  hub.stop();
  await store.saveDoc(meta.id, doc("Mine, offline"));
  assert.deepEqual((await store.getProject(meta.id)).cloudDirty, { main: true }, "a save while signed out is marked to go up");
  await hub.start(sb, { me: "u1", onPageReplaced: (pid, pg, d) => events.push(["replaced", pid, pg, headingOf(d)]) });
  assert.equal(headingOf(await store.loadDoc(meta.id)), "Theirs", "the cloud's copy is what's here now");
  const versions = await store.listVersions(meta.id);
  assert.ok(versions.some((v) => v.label === "Before reloading from the cloud" && headingOf(v.doc) === "Mine, offline"), "and the local copy is a version");
  assert.deepEqual(events.filter((x) => x[0] === "replaced"), [["replaced", meta.id, "main", "Theirs"]], "the Builder is told, so the canvas can follow");
  assert.equal(headingOf(sb.db.pages[0].doc), "Theirs", "nothing was pushed over it");
});

test("a page added here while away goes up on the next sync; renames and deletes follow", async () => {
  const { store, hub, sb } = await started("u1", async (s) => { await s.createProject("Kiln site", doc("Kiln")); });
  const meta = (await store.listProjects())[0];
  hub.stop();
  await store.addPage(meta.id, "Contact", doc("Contact"));
  await store.renameProject(meta.id, "Kiln shop");
  await hub.start(sb, { me: "u1" });
  assert.equal(sb.db.pages.length, 2, "the new page is in the cloud");
  assert.equal(sb.db.projects[0].name, "Kiln shop", "and so is the new name");
  assert.equal(sb.db.projects[0].settings.pages.length, 2);
  await store.deleteProject(meta.id);
  await tick(10);
  await hub.sync();
  assert.equal(sb.db.projects.length, 0, "deleting here deletes there");
  assert.equal(sb.db.pages.length, 0);
});

test("the Playground stays in this browser", async () => {
  const { sb } = await started("u1", async (s) => {
    const g = await s.createGroup("Playground", { kind: "playground" });
    await s.createProject("Getting started", doc("Hi"), { group: g.id });
  });
  assert.equal(sb.db.projects.length, 0);
  assert.equal(sb.db.file_groups.length, 0);
});
