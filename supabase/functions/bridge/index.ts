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
const SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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
    "- The session ends after an hour without a step, or when the person ends it.",
    "",
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let sid = "", key = "", body: Record<string, unknown> = {};
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;
    sid = q.get("s") ?? "";
    key = q.get("k") ?? "";
  } else if (req.method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { error: "That step is too big. Send a smaller edit, or split it." });
    try { body = JSON.parse(raw); } catch { return json(400, { error: "Send JSON: { s, k, call: { name, input } }." }); }
    sid = String(body.s ?? "");
    key = String(body.k ?? "");
  } else return json(405, { error: "Use GET for how to call, POST for a step." });

  if (!SESSION.test(sid) || key.length < 20) return json(401, { error: "That link is missing its session or key." });
  const { data: session } = await admin.from("bridge_sessions").select("id, key_hash, paused, last_call, ended_at").eq("id", sid).maybeSingle();
  if (!session || session.key_hash !== await sha256(key)) return json(401, { error: "That session or key isn't right. Ask for a new link." });
  if (session.ended_at || Date.now() - new Date(session.last_call).getTime() > IDLE_MS) return json(410, { error: "This session has ended. Ask the person to start a new one." });

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
