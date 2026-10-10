/* The assistant's replies, read as Markdown: paragraphs, headings, lists,
   quotes, code blocks and the inline marks (bold, italic, code, links).
   It returns plain data, never HTML, so the panel draws it with React and
   nothing in a reply can become markup. Unfinished marks, as a reply
   streams in, are left as the characters they are. */

/* Blocks: [{ type: "p" | "h" | "ul" | "ol" | "quote" | "code", ... }].
   p, h and quote carry text; h a level (1 to 3); ul and ol their items as
   text (ol with the number it starts at); code its lines. */
function mdBlocks(src) {
  var lines = String(src == null ? "" : src).replace(/\r\n?/g, "\n").split("\n");
  var out = [], para = [], list = null, quote = null, code = null;
  var flush = function () {
    if (para.length) { out.push({ type: "p", text: para.join("\n") }); para = []; }
    if (list) { out.push(list); list = null; }
    if (quote) { out.push({ type: "quote", text: quote.join("\n") }); quote = null; }
  };
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (code) {
      if (/^\s*```/.test(line)) { out.push(code); code = null; } else code.lines.push(line);
      continue;
    }
    var fence = /^\s*```\s*([\w-]*)\s*$/.exec(line);
    if (fence) { flush(); code = { type: "code", lang: fence[1] || "", lines: [] }; continue; }
    if (!line.trim()) { flush(); continue; }
    var h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { flush(); out.push({ type: "h", level: Math.min(3, h[1].length), text: h[2] }); continue; }
    var ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    var ol = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      var kind = ul ? "ul" : "ol";
      if (para.length || quote || (list && list.type !== kind)) flush();
      if (!list) list = ol ? { type: "ol", start: Number(ol[1]), items: [] } : { type: "ul", items: [] };
      list.items.push(ul ? ul[1] : ol[2]);
      continue;
    }
    var q = /^\s*>\s?(.*)$/.exec(line);
    if (q) {
      if (para.length || list) flush();
      quote = (quote || []).concat([q[1]]);
      continue;
    }
    /* A line that carries on a list item, indented under it. */
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] += " " + line.trim(); continue; }
    if (list || quote) flush();
    para.push(line);
  }
  if (code) out.push(code);
  flush();
  return out;
}

/* Inline marks in a run of text: [{ t: "text" | "b" | "i" | "code" | "a"
   | "br", text, href }]. Links keep only http, https and mailto addresses;
   anything else stays as its words. */
var INLINE = /(`+)([^`]+?)\1|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|\*([^*\s][^*\n]*?)\*|(^|[^\w])_([^_\s][^_\n]*?)_(?!\w)|\[([^\]\n]+)\]\(([^)\s]+)\)|\n/g;
function mdInline(text) {
  var s = String(text == null ? "" : text), out = [], last = 0, m;
  INLINE.lastIndex = 0;
  var push = function (part) {
    var prev = out[out.length - 1];
    if (part.t === "text" && prev && prev.t === "text") prev.text += part.text; else out.push(part);
  };
  while ((m = INLINE.exec(s))) {
    var start = m.index;
    if (m[6] != null) start += m[6].length;
    if (start > last) push({ t: "text", text: s.slice(last, start) });
    if (m[2] != null) push({ t: "code", text: m[2] });
    else if (m[3] != null || m[4] != null) push({ t: "b", text: m[3] != null ? m[3] : m[4] });
    else if (m[5] != null) push({ t: "i", text: m[5] });
    else if (m[7] != null) push({ t: "i", text: m[7] });
    else if (m[8] != null) {
      var href = m[9];
      if (/^(https?:\/\/|mailto:)/i.test(href)) push({ t: "a", text: m[8], href: href });
      else push({ t: "text", text: m[8] });
    } else push({ t: "br" });
    last = INLINE.lastIndex;
  }
  if (last < s.length) push({ t: "text", text: s.slice(last) });
  return out;
}

export { mdBlocks, mdInline };
