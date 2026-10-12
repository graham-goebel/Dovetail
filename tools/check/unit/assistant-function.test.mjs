/* The assistant Edge Function (supabase/functions/assistant/index.ts): it
   relays the model's stream events to the Builder as they come and puts
   nothing back together itself, so a tool call whose streamed input isn't
   valid JSON reaches the Builder (which asks the model to send it again)
   instead of ending the turn with an error. The function's own code runs
   here, its TypeScript stripped by esbuild, with the model and the database
   stood in for. Run with npm run check:unit. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";
import { collector, eventReader } from "../../../assets/builder/model/assistant.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/* Enough of the Supabase client for the function: who's signed in, the
   hourly counts, and the run it records. */
function fakeDb() {
  const runs = [];
  const from = () => {
    let op = "select", payload = null;
    const q = {
      select() { return q; }, eq() { return q; }, gte() { return q; }, single() { return q; },
      insert(p) { op = "insert"; payload = p; return q; },
      update(p) { op = "update"; payload = p; return q; },
      then(res, rej) {
        let out = { count: 0, error: null };
        if (op === "insert") { runs.push(Object.assign({ id: runs.length + 1 }, payload)); out = { data: { id: runs.length }, error: null }; }
        if (op === "update") { Object.assign(runs[runs.length - 1], payload); out = { data: null, error: null }; }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return q;
  };
  return { runs, client: { auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) }, from, rpc: async () => ({ data: true }) } };
}

/* The model, as the SDK's raw stream: the events given, one by one. The
   accumulating helper is left out on purpose, so a test fails if the
   function goes back to it. */
function fakeModel(events, seen) {
  return class {
    constructor() {
      this.beta = { messages: {
        create: async (params) => {
          seen.push(params);
          return { async *[Symbol.asyncIterator]() { for (const ev of events) yield ev; } };
        },
      } };
    }
  };
}

async function load(db, Model) {
  const src = fs.readFileSync(path.join(ROOT, "supabase/functions/assistant/index.ts"), "utf8")
    .replace(/^import Anthropic from "npm:@anthropic-ai\/sdk";$/m, "const Anthropic = globalThis.__assistantModel;")
    .replace(/^import \{ createClient \} from "npm:@supabase\/supabase-js@2";$/m, "const createClient = () => globalThis.__assistantDb;");
  assert.ok(!/from "npm:/.test(src), "every import is stood in for");
  const { code } = await transform(src, { loader: "ts", format: "esm" });
  let handler = null;
  const env = { ANTHROPIC_API_KEY: "k", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s" };
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h; } };
  globalThis.__assistantDb = db.client;
  globalThis.__assistantModel = Model;
  await import("data:text/javascript;base64," + Buffer.from(code + "\n//" + Math.random()).toString("base64"));
  return handler;
}

const ask = (h) => h(new Request("https://x.supabase.co/functions/v1/assistant", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer t" },
  body: JSON.stringify({ stable: "brief", messages: [{ role: "user", content: "Retitle both" }], tools: [{ name: "set_prop", input_schema: { type: "object" } }] }),
}));

/* A reply whose tool input streams in as JSON with a value missing. */
const BROKEN = [
  { type: "message_start", message: { id: "m", role: "assistant", content: [], usage: { input_tokens: 120 } } },
  { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t1", name: "set_prop", input: {} } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"ids": ["nj7a0j2c","nj7a0j2l"], "name": "title", ' } },
  { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '"value": }' } },
  { type: "content_block_stop", index: 0 },
  { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 30 } },
  { type: "message_stop" },
];

test("a tool input that isn't valid JSON is relayed, not turned into an error that ends the turn", async () => {
  const db = fakeDb(), seen = [];
  const h = await load(db, fakeModel(BROKEN, seen));
  const res = await ask(h);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /event-stream/);
  const events = [];
  eventReader((ev) => events.push(ev))(await res.text() + "\n\n");
  assert.deepEqual(events.map((e) => e.type), BROKEN.map((e) => e.type), "every event comes through, in order, and no error is added");
  assert.equal(seen[0].stream, true, "the raw stream is asked for");
  assert.ok(seen[0].tools.every((t) => t.eager_input_streaming === true), "tool inputs still stream as they're written");

  const c = collector();
  events.forEach(c.add);
  const r = c.result();
  assert.equal(r.error, null);
  assert.equal(r.stop, "tool_use");
  assert.equal(r.tools.length, 1);
  assert.equal(r.tools[0].bad, true, "the Builder marks the call as one to send again, rather than running it");

  assert.equal(db.runs[0].status, "done", "the run is recorded as done");
  assert.equal(db.runs[0].input_tokens, 120);
  assert.equal(db.runs[0].output_tokens, 30);
});

test("a refusal is recorded as one, and a failure mid-stream reaches the Builder as an error event", async () => {
  let db = fakeDb();
  let h = await load(db, fakeModel([
    { type: "message_start", message: { usage: { input_tokens: 5 } } },
    { type: "message_delta", delta: { stop_reason: "refusal" }, usage: { output_tokens: 1 } },
    { type: "message_stop" },
  ], []));
  await (await ask(h)).text();
  assert.equal(db.runs[0].status, "refused");

  db = fakeDb();
  const Failing = class { constructor() { this.beta = { messages: { create: async () => ({ async *[Symbol.asyncIterator]() { yield { type: "message_start", message: {} }; throw new Error("Overloaded"); } }) } }; } };
  h = await load(db, Failing);
  const events = [];
  eventReader((ev) => events.push(ev))(await (await ask(h)).text() + "\n\n");
  assert.deepEqual(events.map((e) => e.type), ["message_start", "error"]);
  assert.equal(events[1].error.message, "Overloaded");
  assert.equal(db.runs[0].status, "failed");
});
