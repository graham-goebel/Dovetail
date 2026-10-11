/* The bridge Edge Function (supabase/functions/bridge/index.ts) as Claude
   reaches it through a connector: MCP over HTTP at /mcp/<session>.<key>.
   The function's own code runs here, its TypeScript stripped by esbuild,
   against an in-memory stand-in for the database; a pretend Builder tab
   answers the steps it writes. Run with npm run check:unit. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

/* A little of the Supabase client: enough of from(), select, eq, gte,
   insert, update, single, maybeSingle and rpc for the function. */
function fakeDb() {
  const db = { bridge_sessions: [], bridge_calls: [] };
  let next = 1;
  const onInsert = [];
  const from = (table) => {
    let op = "select", payload = null, single = false, head = false;
    const filters = [];
    const q = {
      select(_cols, opts) { if (opts && opts.head) head = true; return q; },
      insert(p) { op = "insert"; payload = p; return q; },
      update(p) { op = "update"; payload = p; return q; },
      eq(k, v) { filters.push((r) => r[k] === v); return q; },
      gte(k, v) { filters.push((r) => String(r[k]) >= v); return q; },
      single() { single = true; return q; },
      maybeSingle() { single = true; return q; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    const run = () => {
      const rows = db[table];
      if (op === "insert") {
        const row = Object.assign({ id: next++, status: "waiting", result: null, created_at: new Date().toISOString() }, payload);
        rows.push(row);
        onInsert.forEach((f) => f(table, row));
        return { data: single ? { id: row.id } : [row], error: null };
      }
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") { hit.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
      if (head) return { count: hit.length, error: null };
      return { data: single ? hit[0] || null : hit, error: null };
    };
    return q;
  };
  return { db, onInsert, client: { from, rpc: async () => ({ data: 0 }) } };
}

/* The function, loaded with Deno and the client stood in for. */
async function load(fake) {
  const src = fs.readFileSync(path.join(ROOT, "supabase/functions/bridge/index.ts"), "utf8")
    .replace(/^import \{ createClient \} from "npm:@supabase\/supabase-js@2";$/m, "const createClient = () => globalThis.__bridgeFake;");
  const { code } = await transform(src, { loader: "ts", format: "esm" });
  let handler = null;
  globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "s" })[k] }, serve: (h) => { handler = h; } };
  globalThis.__bridgeFake = fake.client;
  await import("data:text/javascript;base64," + Buffer.from(code + "\n//" + Math.random()).toString("base64"));
  return handler;
}

const SID = "c0ffee00-0000-4000-8000-000000000001", KEY = "k".repeat(32);
function setup(fields) {
  const fake = fakeDb();
  fake.db.bridge_sessions.push(Object.assign({ id: SID, key_hash: sha(KEY), connector: true, paused: false, ended_at: null, last_call: new Date().toISOString(),
    tab: "tab1", tab_seen: new Date().toISOString(),
    tools: [{ name: "describe", description: "The brief", input_schema: { type: "object", properties: {} } }, { name: "read_page", description: "Read the page", input_schema: { type: "object", properties: {} } }] }, fields || {}));
  return fake;
}
const rpc = (h, body, url = `https://x.supabase.co/bridge/mcp/${SID}.${KEY}`) =>
  h(new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

test("a connector says what it is, lists the tools its owner's tab left, and adds wait_for_step", async () => {
  const fake = setup();
  const h = await load(fake);
  const init = await (await rpc(h, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "c", version: "1" } } })).json();
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.ok(init.result.capabilities.tools);
  assert.match(init.result.instructions, /describe first/);
  const odd = await (await rpc(h, { jsonrpc: "2.0", id: 9, method: "initialize", params: { protocolVersion: "1999-01-01" } })).json();
  assert.equal(odd.result.protocolVersion, "2025-06-18", "an unknown version gets the newest it speaks");
  const note = await rpc(h, { jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(note.status, 202, "a notification gets no answer");
  const list = await (await rpc(h, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
  const names = list.result.tools.map((t) => t.name);
  assert.deepEqual(names, ["describe", "read_page", "wait_for_step"]);
  assert.deepEqual(list.result.tools[1].inputSchema, { type: "object", properties: {} }, "input_schema becomes inputSchema");
});

test("a tool call goes to the tab as a step and comes back as text and a picture", async () => {
  const fake = setup();
  fake.onInsert.push((table, row) => {
    if (table !== "bridge_calls") return;
    setTimeout(() => Object.assign(row, { status: "done", result: { ok: true, result: "Hero, 3 layers", image: "data:image/png;base64,AAAA" } }), 50);
  });
  const h = await load(fake);
  const r = await (await rpc(h, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_page", arguments: { frame: "Home" } } })).json();
  assert.deepEqual(fake.db.bridge_calls[0].call, { name: "read_page", input: { frame: "Home" } }, "the step carries the tool and its arguments");
  assert.equal(r.result.isError, false);
  assert.deepEqual(r.result.content[0], { type: "text", text: "Hero, 3 layers" });
  assert.deepEqual(r.result.content[1], { type: "image", mimeType: "image/png", data: "AAAA" });
});

test("with no Builder tab open, or paused, a call says so and writes no step", async () => {
  const gone = setup({ tab_seen: new Date(Date.now() - 5 * 60_000).toISOString() });
  let h = await load(gone);
  let r = await (await rpc(h, { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "read_page", arguments: {} } })).json();
  assert.equal(r.result.isError, true);
  assert.match(r.result.content[0].text, /isn't open/);
  assert.equal(gone.db.bridge_calls.length, 0);
  const paused = setup({ paused: true });
  h = await load(paused);
  r = await (await rpc(h, { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "read_page", arguments: {} } })).json();
  assert.match(r.result.content[0].text, /paused/);
  assert.equal(paused.db.bridge_calls.length, 0);
});

test("a wrong key, a revoked connector or a plain session isn't a connector; GET isn't served", async () => {
  for (const fields of [{ key_hash: sha("other".repeat(8)) }, { ended_at: new Date().toISOString() }, { connector: false }]) {
    const h = await load(setup(fields));
    const res = await rpc(h, { jsonrpc: "2.0", id: 6, method: "tools/list" });
    assert.equal(res.status, 404, JSON.stringify(fields));
    assert.match((await res.json()).error.message, /Connect Claude/);
  }
  const h = await load(setup());
  const get = await h(new Request(`https://x.supabase.co/bridge/mcp/${SID}.${KEY}`, { method: "GET" }));
  assert.equal(get.status, 405);
  const bad = await (await rpc(h, { jsonrpc: "2.0", id: 7, method: "nope" })).json();
  assert.equal(bad.error.code, -32601);
});
