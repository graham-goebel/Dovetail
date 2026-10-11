// The live canvas bridge, as a Supabase Edge Function (Deno).
//
// Claude, working outside the Builder, edits a person's open canvas through
// this function. The person starts a session in the Builder, which gives
// them a link: this function's address with the session id and a random
// key. Claude reads the link (GET) for how to call, then sends each step
// (POST): the function checks the key against the hash in bridge_sessions,
// writes the step to bridge_calls, and waits for the person's Builder tab
// to run it on the canvas and write the answer back. The tools are the
// Builder assistant's own, and they run in the browser: this function only
// relays, and holds no file.
//
// A connector (connector = true) is the same thing kept open: its owner
// makes it once in the Builder's Connect Claude, and adds its address, this
// function's /mcp/<session>.<key>, to Claude as a custom connector. Claude
// then speaks MCP (Streamable HTTP, JSON answers, no server session) to it:
// tools/list gives the tools the owner's open Builder tab left on the
// session, and tools/call relays each step to that tab as above. It lasts
// until its owner revokes it.
//
// Deploy: supabase functions deploy bridge --no-verify-jwt
// (Claude has no Supabase session; the session key is what it holds.)
// Secrets: BRIDGE_HOURLY_LIMIT (steps per session per hour, default 900).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are given to every function by
// Supabase. Run supabase/bridge.sql first. See docs/cloud.md.

import { createClient } from "npm:@supabase/supabase-js@2";

const HOURLY = Number(Deno.env.get("BRIDGE_HOURLY_LIMIT") ?? "900");
const IDLE_MS = 60 * 60 * 1000;
const WAIT_MS = 25_000;
const MAX_BODY = 1_000_000;
// place_image carries a picture the agent made: up to 5 MB, about 7 MB as base64.
const MAX_PICTURE = 7_200_000;
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, mcp-session-id, mcp-protocol-version, last-event-id",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
// A connector's tab is there while it has said so in the last 75 seconds
// (it does every 30). An MCP step waits up to 50 seconds for the canvas.
const TAB_GONE_MS = 75_000;
const MCP_WAIT_MS = 50_000;
const CONNECTOR = /\/mcp\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{20,})\/?$/;
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

async function sha256(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// How to use the link, for Claude: plain text it can read with a fetch.
function howTo(link: string): string {
  return [
    "# Dovetail Builder: live session",
    "",
    "Someone has opened their Dovetail Builder canvas to you. Each step you send runs on their open canvas, with the tools the Builder's own assistant has, and they watch it happen. They can pause or end the session, and undo any step.",
    "",
    "## Calling",
    "",
    "POST JSON to this same address, with the session and key from the link:",
    "",
    "```sh",
    `curl -s -X POST '${link.split("?")[0]}' -H 'content-type: application/json' \\`,
    `  -d '{"s":"${new URL(link).searchParams.get("s")}","k":"<the k from the link>","call":{"name":"describe","input":{}}}'`,
    "```",
    "",
    "- Start with `describe`: it answers with the brief (the design system's rules, components and tokens) and every tool you can call, with its input schema.",
    "- Each answer is JSON: `{ \"ok\": true, \"result\": \"…\" }`, or `ok: false` with why. A picture comes as `image`, a `data:image/jpeg;base64,` address; save it to a file to look at it.",
    "- A step waits up to 25 seconds for the canvas. If it's still running, the answer is `{ \"waiting\": true, \"id\": 12 }`: send `{ \"s\", \"k\", \"wait\": 12 }` to keep waiting.",
    "- `edit_by_name` takes an edit in the Markdown or JSON the Builder's Paste a layout reads, naming layers the way Layers does. It's the quickest way to change several layers.",
    "- `place_image` puts a picture you made on the canvas: a `data:image/png`, `jpeg` or `webp` address up to 5 MB, into an Image layer (`id`) or as a new Image (`parent`). Call `working_on` first to show the person where it's coming.",
    "- Other agents may be on the same canvas. Call `hello` with your name first; a layer another agent is changing is held for a moment.",
    "- The session ends after an hour without a step, or when the person ends it.",
    "",
  ].join("\n");
}

type Admin = ReturnType<typeof createClient>;
type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type Answer = { ok?: boolean; result?: unknown; image?: string };

// A step, written for the tab and waited on: its answer, or null while the
// canvas is still on it after ms.
async function waitFor(admin: Admin, sid: string, id: number, ms: number): Promise<Answer | null | "missing"> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const { data: row } = await admin.from("bridge_calls").select("status, result").eq("id", id).eq("session_id", sid).maybeSingle();
    if (!row) return "missing";
    if (row.status === "done") return (row.result as Answer) ?? { ok: false, result: "The canvas sent no answer." };
    await sleep(300);
  }
  return null;
}

// A canvas answer as MCP content: its words, and a picture as an image.
function content(a: Answer) {
  const text = typeof a.result === "string" ? a.result : JSON.stringify(a.result ?? "");
  const out: Record<string, unknown>[] = [{ type: "text", text }];
  const pic = typeof a.image === "string" ? /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(a.image) : null;
  if (pic) out.push({ type: "image", mimeType: pic[1], data: pic[2] });
  return { content: out, isError: !a.ok };
}
const said = (text: string, isError = true) => ({ content: [{ type: "text", text }], isError });

const WAIT_TOOL = {
  name: "wait_for_step",
  description: "Keep waiting for a step that was still running on the canvas when its call came back. Give the id the earlier answer named.",
  inputSchema: { type: "object", properties: { id: { type: "integer" } }, required: ["id"], additionalProperties: false },
};
const NOT_OPEN = "Dovetail Builder isn't open for this connector's owner. Ask them to open the Builder, signed in, and keep the tab open; then try again.";

// A connector: MCP over Streamable HTTP, one JSON answer per request.
async function connector(req: Request, admin: Admin, sid: string, key: string): Promise<Response> {
  const reply = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
  const { data: session } = await admin.from("bridge_sessions").select("id, key_hash, connector, paused, ended_at, tab, tab_seen, tools").eq("id", sid).maybeSingle();
  if (!session || !session.connector || session.key_hash !== await sha256(key) || session.ended_at) {
    return reply(404, { jsonrpc: "2.0", id: null, error: { code: -32001, message: "This connector isn't right, or was revoked. Make a new one in the Dovetail Builder (Agent panel, Connect Claude)." } });
  }
  const raw = await req.text();
  if (raw.length > MAX_PICTURE) return reply(413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "That request is too big." } });
  let msg: Rpc | Rpc[];
  try { msg = JSON.parse(raw); } catch { return reply(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Send JSON-RPC." } }); }
  const list = Array.isArray(msg) ? msg : [msg];
  const tabOpen = () => !!session.tab && !!session.tab_seen && Date.now() - new Date(session.tab_seen).getTime() < TAB_GONE_MS;
  const tools = () => {
    const own = Array.isArray(session.tools) ? session.tools as { name: string; description?: string; input_schema?: unknown }[] : [];
    const base = own.length ? own : [{ name: "describe", description: "The brief (the design system's rules, components and tokens) and every tool, once the owner's Builder is open.", input_schema: { type: "object", properties: {} } }];
    return base.map((t) => ({ name: t.name, description: t.description ?? "", inputSchema: t.input_schema ?? { type: "object", properties: {} } })).concat([WAIT_TOOL]);
  };

  const answer = async (m: Rpc): Promise<unknown> => {
    const p = m.params ?? {};
    switch (m.method) {
      case "initialize": {
        const want = String(p.protocolVersion ?? "");
        return {
          protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "dovetail-builder", version: "1.0.0" },
          instructions: "Dovetail Builder: you edit its owner's open canvas with the Builder's own tools, and they watch each step land. Call describe first for the design system's rules and the tools, then hello with your name. Work in small steps and look (screenshot, lint) after visible changes. The tools only work while the owner has the Builder open.",
        };
      }
      case "ping": return {};
      case "tools/list": return { tools: tools() };
      case "resources/list": return { resources: [] };
      case "prompts/list": return { prompts: [] };
      case "tools/call": {
        const name = String(p.name ?? "");
        const input = (p.arguments ?? {}) as Record<string, unknown>;
        if (name === "wait_for_step") {
          const id = Number(input.id);
          if (!Number.isInteger(id)) return said("wait_for_step takes the id of a step that's still running.");
          const got = await waitFor(admin, sid, id, MCP_WAIT_MS);
          if (got === "missing") return said("There's no step with that id.");
          return got ? content(got) : said(`Step ${id} is still running on the canvas. Call wait_for_step with id ${id} again.`, false);
        }
        if (!/^[a-z_]{1,40}$/.test(name)) return said("That isn't one of the tools. Call describe for the list.");
        if (!tabOpen()) return said(NOT_OPEN);
        if (session.paused) return said("The person paused Claude. Wait a minute and try again, or ask them to resume.");
        if (name === "place_image" ? raw.length > MAX_PICTURE : raw.length > MAX_BODY) return said("That step is too big. A picture can be up to 5 MB; an edit, 1 MB.");
        const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
        const { count } = await admin.from("bridge_calls").select("id", { count: "exact", head: true }).eq("session_id", sid).gte("created_at", hourAgo);
        if ((count ?? 0) >= HOURLY) return said(`That's ${HOURLY} steps this hour, the most a connector takes. Wait a while.`);
        const { data: made, error } = await admin.from("bridge_calls").insert({ session_id: sid, call: { name, input } }).select("id").single();
        if (error || !made) return said("The step couldn't be sent. Try again.");
        await admin.from("bridge_sessions").update({ last_call: new Date().toISOString() }).eq("id", sid);
        if (Math.random() < 0.02) await admin.rpc("bridge_tidy");
        const got = await waitFor(admin, sid, made.id, MCP_WAIT_MS);
        if (got === "missing") return said("The step went missing. Try again.");
        return got ? content(got) : said(`The canvas is still on it (step ${made.id}). Call wait_for_step with id ${made.id} for its answer.`, false);
      }
      default: throw Object.assign(new Error("There's no method " + m.method + "."), { code: -32601 });
    }
  };

  const out: unknown[] = [];
  for (const m of list) {
    if (!m || typeof m !== "object" || typeof m.method !== "string") { out.push({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Send a JSON-RPC request." } }); continue; }
    if (m.id === undefined || m.id === null) continue;
    try { out.push({ jsonrpc: "2.0", id: m.id, result: await answer(m) }); }
    catch (err) { out.push({ jsonrpc: "2.0", id: m.id, error: { code: (err as { code?: number }).code ?? -32603, message: err instanceof Error ? err.message : "Something went wrong." } }); }
  }
  if (!out.length) return reply(202, null);
  return reply(200, Array.isArray(msg) ? out : out[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const conn = CONNECTOR.exec(new URL(req.url).pathname);
  if (conn) return connector(req, admin, conn[1], conn[2]);

  let sid = "", key = "", body: Record<string, unknown> = {};
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;
    sid = q.get("s") ?? "";
    key = q.get("k") ?? "";
  } else if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_PICTURE) return json(413, { error: "That step is too big. A picture can be up to 5 MB; an edit, 1 MB." });
    try { body = JSON.parse(raw); } catch { return json(400, { error: "Send JSON: { s, k, call: { name, input } }." }); }
    const name = (body.call as { name?: unknown } | undefined)?.name;
    if (raw.length > MAX_BODY && name !== "place_image") return json(413, { error: "That step is too big. Send a smaller edit, or split it." });
    sid = String(body.s ?? "");
    key = String(body.k ?? "");
  } else return json(405, { error: "Use GET for how to call, POST for a step." });

  if (!SESSION.test(sid) || key.length < 20) return json(401, { error: "That link is missing its session or key." });
  const { data: session } = await admin.from("bridge_sessions").select("id, key_hash, paused, last_call, ended_at, connector").eq("id", sid).maybeSingle();
  if (!session || session.key_hash !== await sha256(key)) return json(401, { error: "That session or key isn't right. Ask for a new link." });
  if (session.ended_at || (!session.connector && Date.now() - new Date(session.last_call).getTime() > IDLE_MS)) return json(410, { error: "This session has ended. Ask the person to start a new one." });

  if (req.method === "GET") {
    const link = `${url}/functions/v1/bridge?s=${sid}&k=${key}`;
    return new Response(howTo(link), { status: 200, headers: { ...headers, "Content-Type": "text/markdown; charset=utf-8" } });
  }

  let id: number;
  if (body.wait != null) {
    id = Number(body.wait);
    if (!Number.isInteger(id)) return json(400, { error: "wait takes the id of a step that's still running." });
  } else {
    const call = body.call as { name?: unknown; input?: unknown } | undefined;
    if (!call || typeof call.name !== "string" || !/^[a-z_]{1,40}$/.test(call.name)) return json(400, { error: "Send a call: { name, input }. Start with describe." });
    if (session.paused) return json(200, { ok: false, result: "The person paused the session. Wait a minute and try again, or ask them to resume it." });
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await admin.from("bridge_calls").select("id", { count: "exact", head: true }).eq("session_id", sid).gte("created_at", hourAgo);
    if ((count ?? 0) >= HOURLY) return json(429, { error: `That's ${HOURLY} steps this hour, the most a session takes. Wait a while.` });
    const { data: made, error } = await admin.from("bridge_calls").insert({ session_id: sid, call: { name: call.name, input: call.input ?? {} } }).select("id").single();
    if (error || !made) return json(500, { error: "The step couldn't be sent. Try again." });
    id = made.id;
    await admin.from("bridge_sessions").update({ last_call: new Date().toISOString() }).eq("id", sid);
    if (Math.random() < 0.02) await admin.rpc("bridge_tidy");
  }

  const until = Date.now() + WAIT_MS;
  while (Date.now() < until) {
    const { data: row } = await admin.from("bridge_calls").select("status, result").eq("id", id).eq("session_id", sid).maybeSingle();
    if (!row) return json(404, { error: "There's no step with that id in this session." });
    if (row.status === "done") return json(200, row.result ?? { ok: false, result: "The canvas sent no answer." });
    await sleep(300);
  }
  return json(202, { waiting: true, id, note: "The canvas hasn't answered yet. If this keeps happening, the Builder tab may be closed or asleep." });
});
