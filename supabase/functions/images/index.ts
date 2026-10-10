// Stock photos for the Builder's assistant, as a Supabase Edge Function (Deno).
//
// When nothing in a file's Content uploads fits, the assistant searches a
// stock photo service through this function, which holds the service's key
// so no browser sees it. Only signed-in people can search. The service is
// set by secrets, not named here:
//   STOCK_PHOTO_URL: the service's photo search address; the query goes on
//     as ?query=…&per_page=…&orientation=…
//   STOCK_PHOTO_KEY: its access key, sent as "Authorization: Client-ID <key>"
//     (STOCK_PHOTO_AUTH changes "Client-ID" for a service that differs).
// A search answers { photos: [{ id, alt, url, thumb, width, height, credit,
// creditUrl, page, download }] }. A POST with { used: <download> } tells the
// service a photo was put on a page, as its terms ask; it's only called on
// the search address's own host, so the key goes nowhere else. Without the
// secrets it answers 503, and the Builder offers only uploads.
//
// Deploy: supabase functions deploy images. See docs/cloud.md.

import { createClient } from "npm:@supabase/supabase-js@2";

const SEARCH = Deno.env.get("STOCK_PHOTO_URL") ?? "";
const KEY = Deno.env.get("STOCK_PHOTO_KEY") ?? "";
const SCHEME = Deno.env.get("STOCK_PHOTO_AUTH") ?? "Client-ID";
const ORIGINS = (Deno.env.get("ASSISTANT_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ORIENTATIONS = ["landscape", "portrait", "squarish"];

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

type Found = { id: string; alt: string; url: string; thumb: string; width: number; height: number; credit: string; creditUrl: string; page: string; download: string };

// One result from the service, in the shape the Builder reads.
function photo(r: Record<string, any>): Found | null {
  const urls = r && r.urls;
  if (!r || typeof r.id !== "string" || !urls || typeof urls.regular !== "string") return null;
  return {
    id: r.id,
    alt: String(r.alt_description || r.description || "").slice(0, 200),
    url: urls.regular,
    thumb: typeof urls.small === "string" ? urls.small : urls.regular,
    width: Number(r.width) || 0,
    height: Number(r.height) || 0,
    credit: String((r.user && r.user.name) || "").slice(0, 80),
    creditUrl: String((r.user && r.user.links && r.user.links.html) || ""),
    page: String((r.links && r.links.html) || ""),
    download: String((r.links && r.links.download_location) || ""),
  };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json(405, { error: "Use POST." }, headers);
  if (!SEARCH || !KEY) return json(503, { error: "Stock photos aren't set up." }, headers);

  const auth = req.headers.get("Authorization") ?? "";
  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json(401, { error: "Sign in to search stock photos." }, headers);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(400, { error: "The request isn't JSON." }, headers); }
  const service = { Authorization: `${SCHEME} ${KEY}`, "Accept-Version": "v1" };

  // A photo was used: pass that on, to the service's own host only.
  if (typeof body.used === "string") {
    let at: URL | null = null;
    try { at = new URL(body.used); } catch { at = null; }
    if (!at || at.protocol !== "https:" || at.host !== new URL(SEARCH).host) return json(400, { error: "That isn't the service's address." }, headers);
    await fetch(at, { headers: service }).catch(() => null);
    return json(200, { ok: true }, headers);
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
  if (!query) return json(400, { error: "Send a query." }, headers);
  const count = Math.max(1, Math.min(12, Number(body.count) || 6));
  const url = new URL(SEARCH);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(count));
  if (typeof body.orientation === "string" && ORIENTATIONS.includes(body.orientation)) url.searchParams.set("orientation", body.orientation);
  const resp = await fetch(url, { headers: service }).catch(() => null);
  if (!resp || !resp.ok) return json(502, { error: resp && resp.status === 403 ? "The stock photo service's hourly limit is reached. Try again later." : "The stock photo service couldn't be reached." }, headers);
  const data = await resp.json().catch(() => ({}));
  const results: unknown[] = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
  const photos = results.map((r) => photo(r as Record<string, any>)).filter(Boolean);
  return json(200, { photos }, headers);
});
