// The Builder's assistant, as a Supabase Edge Function (Deno).
//
// It holds the model key (the ANTHROPIC_API_KEY secret, set in the Supabase
// dashboard or with `supabase secrets set`), so no browser ever sees it. A
// signed-in person's request comes in with their session; the function
// checks who they are and how many requests they've made this hour, sends
// the conversation on to the model with the Builder's tools, and streams
// the model's events back as server-sent events. The tools run in the
// browser, on the canvas: this function only relays.
//
// Deploy: supabase functions deploy assistant
// Secrets: ANTHROPIC_API_KEY (required); ASSISTANT_HOURLY_LIMIT (default 60);
// ASSISTANT_ORIGINS, a comma-separated list of the sites allowed to call it.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are given to
// every function by Supabase. See docs/cloud.md.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-5-5";
const MAX_TOKENS = 16000;
const HOURLY = Number(Deno.env.get("ASSISTANT_HOURLY_LIMIT") ?? "60");
const ORIGINS = (Deno.env.get("ASSISTANT_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
// Room for the pictures the assistant takes of the canvas (each at most
// 1280×2000, as a JPEG) as the conversation goes on.
const MAX_BODY = 8_000_000;
const MAX_STABLE = 200_000;
const MAX_MESSAGES = 120;
const MAX_TOOLS = 24;

// What the assistant is, whatever the Builder sends after it.
const PREAMBLE = "You edit designs in the Dovetail Builder through the tools you're given. " +
  "Work on what the person selected unless they ask for more. Use only the design system's tokens and components: " +
  "never invent colours, sizes or components. Say in a sentence or two what you changed.";

function cors(origin: string | null): Record<string, string> {
  const allowed = origin && (ORIGINS.length === 0 || ORIGINS.includes(origin)) ? origin : ORIGINS[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

type Tool = { name: string; description?: string; input_schema: Record<string, unknown> };

// The request the Builder sends: its brief (stable: the system's rules,
// components and tokens, the same on every request), its system text for
// this request (the context docs and the selection), the conversation, its
// tools, and the file it's working on.
function readRequest(raw: unknown): { stable: string; system: string; messages: unknown[]; tools: Tool[]; fileId: string | null } | string {
  if (!raw || typeof raw !== "object") return "The request isn't JSON.";
  const r = raw as Record<string, unknown>;
  const stable = typeof r.stable === "string" ? r.stable : "";
  if (stable.length > MAX_STABLE) return "The brief is too long.";
  const system = typeof r.system === "string" ? r.system : "";
  const messages = Array.isArray(r.messages) ? r.messages : null;
  const tools = Array.isArray(r.tools) ? r.tools : [];
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) return `Send 1 to ${MAX_MESSAGES} messages.`;
  if (tools.length > MAX_TOOLS) return `Send at most ${MAX_TOOLS} tools.`;
  for (const t of tools) {
    if (!t || typeof t !== "object" || typeof (t as Tool).name !== "string" || typeof (t as Tool).input_schema !== "object") return "Each tool needs a name and an input_schema.";
  }
  const fileId = typeof r.file_id === "string" && /^[0-9a-f-]{36}$/.test(r.file_id) ? r.file_id : null;
  return { stable, system, messages, tools: tools as Tool[], fileId };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json(405, { error: "Use POST." }, headers);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json(503, { error: "The assistant isn't set up: its key is missing." }, headers);

  // Who's asking, from their own session.
  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json(401, { error: "Sign in to use the assistant." }, headers);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // How many requests they've made in the last hour.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("assistant_runs").select("id", { count: "exact", head: true }).eq("user_id", who.user.id).gte("created_at", since);
  if ((count ?? 0) >= HOURLY) return json(429, { error: `That's ${HOURLY} requests this hour. Try again later.` }, headers);

  const text = await req.text();
  if (text.length > MAX_BODY) return json(413, { error: "The request is too large." }, headers);
  let parsed: ReturnType<typeof readRequest>;
  try { parsed = readRequest(JSON.parse(text)); } catch { parsed = "The request isn't JSON."; }
  if (typeof parsed === "string") return json(400, { error: parsed }, headers);

  // A file named must be one they're on.
  if (parsed.fileId) {
    const { data: member } = await asUser.rpc("is_member", { pid: parsed.fileId });
    if (!member) return json(403, { error: "That file isn't shared with you." }, headers);
  }

  const { data: run } = await admin.from("assistant_runs").insert({ user_id: who.user.id, file_id: parsed.fileId, model: MODEL }).select("id").single();
  const client = new Anthropic({ apiKey: key });
  const enc = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      let status = "failed", input = 0, output = 0;
      try {
        // Fallbacks: if a safety check declines, the API retries the request
        // on another model inside the same call. Thinking shows as short
        // progress notes between tool calls, which the Builder shows as steps.
        // Caching: the tools and the brief never change, so they're cached
        // for an hour; the conversation so far is cached as it grows.
        const system = [{ type: "text", text: PREAMBLE + (parsed.stable ? "\n\n" + parsed.stable : ""), cache_control: { type: "ephemeral", ttl: "1h" } }];
        if (parsed.system) system.push({ type: "text", text: parsed.system } as typeof system[number]);
        const params = {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          betas: ["server-side-fallback-2026-07-01", "thinking-display-updates-2026-08-18"],
          fallbacks: "default",
          thinking: { type: "adaptive", display: "updates" },
          output_config: { effort: "medium" },
          cache_control: { type: "ephemeral" },
          system,
          messages: parsed.messages,
          tools: parsed.tools.map((t) => ({ ...t, eager_input_streaming: true })),
        };
        const stream = client.beta.messages.stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0], { signal: req.signal });
        for await (const event of stream) send(event);
        const final = await stream.finalMessage();
        input = final.usage?.input_tokens ?? 0;
        output = final.usage?.output_tokens ?? 0;
        status = final.stop_reason === "refusal" ? "refused" : "done";
      } catch (err) {
        send({ type: "error", error: { message: err instanceof Error ? err.message : "The assistant stopped." } });
      } finally {
        if (run) await admin.from("assistant_runs").update({ status, input_tokens: input, output_tokens: output }).eq("id", run.id);
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { ...headers, "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
});
