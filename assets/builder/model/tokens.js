/* How much a conversation with the assistant uses, in tokens: the counts
   the model reports for each request (what was sent, what came from the
   prompt cache, what was written to it, and what it wrote back), and an
   estimate where there are none: before a request answers, and in practice
   mode, where nothing is sent. A reply adds up its requests (one per round
   of tool calls); a conversation adds up its replies. */

/* About four characters a token for text; a picture by its size (about
   width × height / 750, as the API counts them), or 1,600 when unknown. */
function textTokens(s) { return Math.ceil(String(s == null ? "" : s).length / 4); }
function pictureTokens(b) {
  var w = b && (b.width || (b.source && b.source.width)), h = b && (b.height || (b.source && b.source.height));
  return w && h ? Math.ceil((w * h) / 750) : 1600;
}
function blockTokens(b) {
  if (!b) return 0;
  if (typeof b === "string") return textTokens(b);
  if (b.type === "image") return pictureTokens(b);
  if (b.type === "text") return textTokens(b.text);
  if (b.type === "thinking") return textTokens(b.thinking);
  if (b.type === "tool_use") return textTokens(b.name) + textTokens(JSON.stringify(b.input || {}));
  if (b.type === "tool_result") return Array.isArray(b.content) ? b.content.reduce(function (n, c) { return n + blockTokens(c); }, 0) : textTokens(b.content);
  return textTokens(JSON.stringify(b));
}

/* What a request sends: the brief, the tools and every message so far. */
function estimateRequest(req) {
  var n = textTokens(req && req.stable) + textTokens(req && req.system) + textTokens(JSON.stringify((req && req.tools) || []));
  ((req && req.messages) || []).forEach(function (m) {
    n += typeof m.content === "string" ? textTokens(m.content) : (m.content || []).reduce(function (a, b) { return a + blockTokens(b); }, 0);
  });
  return n;
}
/* What a reply wrote back, from its content blocks. */
function estimateReply(content) { return (content || []).reduce(function (n, b) { return n + blockTokens(b); }, 0); }

var ZERO = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, requests: 0, estimated: false };

/* One request's counts, from the usage the model reported (message_start's
   and message_delta's, merged), or estimated from what went and came. */
function requestUsage(reported, req, content) {
  if (reported && (reported.input_tokens != null || reported.output_tokens)) {
    return { input: reported.input_tokens || 0, cacheRead: reported.cache_read_input_tokens || 0, cacheWrite: reported.cache_creation_input_tokens || 0,
      output: reported.output_tokens || 0, requests: 1, estimated: false };
  }
  return { input: estimateRequest(req), cacheRead: 0, cacheWrite: 0, output: estimateReply(content), requests: 1, estimated: true };
}

function addUsage(a, b) {
  a = a || ZERO; b = b || ZERO;
  return { input: a.input + b.input, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite, output: a.output + b.output,
    requests: a.requests + b.requests, estimated: !!(a.estimated || b.estimated) };
}
/* Every token a reply or conversation used: sent (fresh, cached and
   written to the cache) and written back. */
function totalOf(u) { return u ? u.input + u.cacheRead + u.cacheWrite + u.output : 0; }

/* A conversation's total, from its replies. */
function threadUsage(thread) {
  var sum = null, replies = 0;
  (thread || []).forEach(function (t) { if (t && t.role === "assistant" && t.usage) { sum = addUsage(sum, t.usage); replies++; } });
  return sum ? Object.assign(sum, { replies: replies }) : null;
}

/* 812, 12.4k, 124k, 1.2M. */
function shortCount(n) {
  n = Math.max(0, Math.round(n || 0));
  if (n < 1000) return String(n);
  if (n < 100000) return (Math.round(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1000000) return Math.round(n / 1000) + "k";
  return (Math.round(n / 100000) / 10).toFixed(1).replace(/\.0$/, "") + "M";
}
function fullCount(n) { return String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

/* "12.4k tokens", with ≈ when any of it is an estimate; and a line saying
   what made it up, for a tooltip. */
function usageLabel(u, live) {
  var n = totalOf(u) + (live || 0);
  return (u && u.estimated || live ? "≈ " : "") + shortCount(n) + " tokens";
}
function usageDetail(u) {
  if (!u) return "";
  var parts = ["Sent " + fullCount(u.input + u.cacheRead + u.cacheWrite)];
  if (u.cacheRead) parts.push(fullCount(u.cacheRead) + " of them from the cache");
  if (u.cacheWrite) parts.push(fullCount(u.cacheWrite) + " written to the cache");
  parts.push("wrote back " + fullCount(u.output));
  return parts.join(", ") + " in " + u.requests + (u.requests === 1 ? " request" : " requests") + (u.estimated ? ". Estimated: about four characters a token." : ".");
}

export { addUsage, estimateReply, estimateRequest, fullCount, requestUsage, shortCount, threadUsage, totalOf, usageDetail, usageLabel };
