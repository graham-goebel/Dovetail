/* JSX and pasted layouts, read into the same nodes a saved layout gives. */

import { DATA, MEDIA_URL, META, isContainer } from "../config.js";
import { decode } from "./share.js";
import { clean, note } from "./tree.js";

/* ---------------------------------------------------------------- JSX */

/* JSX from the docs, Claude or the Code dialog, read into the same nodes a
   pasted layout gives, so the same cleaning decides what comes in. Only
   what is written out comes in: tags, text and literal props. Code (a
   .map(), a variable, a handler) can't run here, so it is listed instead.
   Throws an Error with a reason when the markup itself can't be read. */
function readJsxElements(src) {
  var s = src, i = 0, out = [];
  var ws = function () { while (i < s.length && /\s/.test(s[i])) i++; };
  var skipString = function (q) {
    i++;
    while (i < s.length && s[i] !== q) {
      if (s[i] === "\\") i += 2;
      else if (q === "`" && s[i] === "$" && s[i + 1] === "{") { i += 2; braces(); }
      else i++;
    }
    i++;
  };
  var skipComment = function () {
    if (s[i + 1] === "/") { while (i < s.length && s[i] !== "\n") i++; return true; }
    if (s[i + 1] === "*") { var end = s.indexOf("*/", i + 2); i = end < 0 ? s.length : end + 2; return true; }
    return false;
  };
  /* A < starts markup where an expression could start, not after a value. */
  var opensTag = function () {
    var c = s[i + 1] || "";
    if (!/[A-Za-z>]/.test(c)) return false;
    /* The last thing before it, past spaces and comments. */
    var j = i - 1;
    for (;;) {
      while (j >= 0 && /\s/.test(s[j])) j--;
      if (j > 0 && s[j] === "/" && s[j - 1] === "*") { var open = s.lastIndexOf("/*", j - 2); j = open < 0 ? -1 : open - 1; continue; }
      var lineStart = s.lastIndexOf("\n", j) + 1;
      var slash = s.slice(lineStart, j + 1).indexOf("//");
      if (slash >= 0 && !/["'`]/.test(s.slice(lineStart, lineStart + slash))) { j = lineStart + slash - 1; continue; }
      break;
    }
    if (j < 0) return true;
    if (/[(,=?:{[&|>;}]/.test(s[j])) return true;
    return /\breturn$/.test(s.slice(Math.max(0, j - 6), j + 1));
  };
  /* After an opening {: up to its closing }, returned as source. */
  var braces = function () {
    var depth = 1, start = i;
    while (i < s.length) {
      var c = s[i];
      if (c === '"' || c === "'" || c === "`") { skipString(c); continue; }
      if (c === "/" && skipComment()) continue;
      if (c === "<" && opensTag()) { element(); continue; }
      if (c === "{") depth++;
      else if (c === "}" && !--depth) break;
      i++;
    }
    if (i >= s.length) throw new Error("A { is never closed");
    var body = s.slice(start, i);
    i++;
    return body;
  };
  var text = function (t) {
    var decoded = t.replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, function (m, e) { return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" }[e]; });
    if (!/\n/.test(decoded)) return /\S/.test(decoded) ? decoded : "";
    return decoded.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).join(" ");
  };
  var children = function (tag) {
    var kids = [], buf = "";
    var flush = function () { var t = text(buf); if (t) kids.push({ text: t }); buf = ""; };
    while (i < s.length) {
      if (s[i] === "<" && s[i + 1] === "/") {
        flush();
        var close = /^<\/\s*([\w$.:-]*)\s*>/.exec(s.slice(i));
        if (!close) throw new Error("A closing tag after <" + (tag || "") + "> can't be read");
        if (close[1] !== tag) throw new Error("<" + (tag || "") + "> is closed by </" + close[1] + ">");
        i += close[0].length;
        return kids;
      }
      if (s[i] === "<") { flush(); kids.push(element()); continue; }
      if (s[i] === "{") { flush(); i++; kids.push({ expr: braces() }); continue; }
      buf += s[i++];
    }
    throw new Error("<" + (tag || "") + "> is never closed");
  };
  var element = function () {
    i++;
    if (s[i] === ">") { i++; return { tag: "", attrs: [], children: children("") }; }
    var m = /^[A-Za-z_$][\w$.:-]*/.exec(s.slice(i));
    if (!m) throw new Error("A tag near \"" + s.slice(i - 1, i + 12) + "\" can't be read");
    var tag = m[0], attrs = [];
    i += tag.length;
    for (;;) {
      ws();
      if (i >= s.length) throw new Error("<" + tag + "> is never finished");
      if (s[i] === "/" && s[i + 1] === ">") { i += 2; return { tag: tag, attrs: attrs, children: [] }; }
      if (s[i] === ">") { i++; break; }
      if (s[i] === "{") { i++; attrs.push({ spread: braces() }); continue; }
      var an = /^[A-Za-z_$][\w$:-]*/.exec(s.slice(i));
      if (!an) throw new Error("An attribute of <" + tag + "> can't be read");
      i += an[0].length;
      ws();
      if (s[i] !== "=") { attrs.push({ name: an[0], bool: true }); continue; }
      i++;
      ws();
      if (s[i] === '"' || s[i] === "'") { var st = i + 1; skipString(s[i]); attrs.push({ name: an[0], str: text(s.slice(st, i - 1)) || s.slice(st, i - 1) }); }
      else if (s[i] === "{") { i++; attrs.push({ name: an[0], expr: braces() }); }
      else throw new Error(tag + ": " + an[0] + "= needs a quoted value or { }");
    }
    return { tag: tag, attrs: attrs, children: children(tag) };
  };
  while (i < s.length) {
    var c = s[i];
    if (c === '"' || c === "'" || c === "`") { skipString(c); continue; }
    if (c === "/" && skipComment()) continue;
    if (c === "<" && opensTag()) { out.push(element()); continue; }
    i++;
  }
  return out;
}

/* A literal written in code: text, a number, true, false, null, or arrays
   and objects of those. Anything else is code, and isn't read. */
function readLiteral(src) {
  var s = String(src), i = 0, FAIL = {};
  var ws = function () {
    for (;;) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] === "/" && s[i + 1] === "/") { while (i < s.length && s[i] !== "\n") i++; continue; }
      if (s[i] === "/" && s[i + 1] === "*") { var e = s.indexOf("*/", i + 2); if (e < 0) throw FAIL; i = e + 2; continue; }
      return;
    }
  };
  var str = function () {
    var q = s[i++], out = "";
    while (i < s.length && s[i] !== q) {
      if (q === "`" && s[i] === "$" && s[i + 1] === "{") throw FAIL;
      if (s[i] === "\\") { var n = s[i + 1]; out += n === "n" ? "\n" : n === "t" ? "\t" : n; i += 2; continue; }
      out += s[i++];
    }
    if (s[i] !== q) throw FAIL;
    i++;
    return out;
  };
  var value = function () {
    ws();
    var c = s[i];
    if (c === '"' || c === "'" || c === "`") return str();
    if (c === "[") {
      i++;
      var arr = [];
      for (;;) { ws(); if (s[i] === "]") { i++; return arr; } arr.push(value()); ws(); if (s[i] === ",") i++; else if (s[i] !== "]") throw FAIL; }
    }
    if (c === "{") {
      i++;
      var obj = {};
      for (;;) {
        ws();
        if (s[i] === "}") { i++; return obj; }
        var key;
        if (s[i] === '"' || s[i] === "'") key = str();
        else { var km = /^[A-Za-z_$][\w$]*|^\d+/.exec(s.slice(i)); if (!km) throw FAIL; key = km[0]; i += km[0].length; }
        ws();
        if (s[i] !== ":") throw FAIL;
        i++;
        obj[key] = value();
        ws();
        if (s[i] === ",") i++; else if (s[i] !== "}") throw FAIL;
      }
    }
    var m = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (m) { i += m[0].length; return Number(m[0]); }
    var w = /^(true|false|null|undefined)\b/.exec(s.slice(i));
    if (w) { i += w[0].length; return { "true": true, "false": false, "null": null, "undefined": undefined }[w[0]]; }
    throw FAIL;
  };
  try {
    var v = value();
    ws();
    return i === s.length ? { ok: true, value: v } : { ok: false };
  } catch (err) { if (err === FAIL) return { ok: false }; throw err; }
}

/* An inline style as the builder's own token choices: each option whose CSS
   the style carries, the widest first; whatever is left is reported. */
var TOKEN_CSS = null;
function tokensFromCss(css, who, report) {
  if (!TOKEN_CSS) {
    TOKEN_CSS = [];
    Object.keys(DATA.tokens).forEach(function (k) {
      DATA.tokens[k].options.forEach(function (o) { if (o.css && Object.keys(o.css).length) TOKEN_CSS.push({ key: k, value: o.value, css: o.css }); });
    });
    TOKEN_CSS.sort(function (a, b) { return Object.keys(b.css).length - Object.keys(a.css).length; });
  }
  var left = Object.assign({}, css), style = {};
  var same = function (a, b) { return String(a).replace(/\s+/g, "") === String(b).replace(/\s+/g, ""); };
  TOKEN_CSS.forEach(function (t) {
    if (style[t.key] !== undefined) return;
    var keys = Object.keys(t.css);
    if (keys.every(function (p) { return left[p] !== undefined && same(left[p], t.css[p]); })) {
      style[t.key] = t.value;
      keys.forEach(function (p) { delete left[p]; });
    }
  });
  Object.keys(left).forEach(function (p) { note(report, who + ": style " + p + ": " + JSON.stringify(left[p]) + " isn't a token the builder sets"); });
  return style;
}

var GROUP_GAP_VAR = /^var\(--dt-space-(?:inline|stack)-([\w]+)\)$/;
var short = function (code) { var t = String(code).replace(/\s+/g, " ").trim(); return t.length > 40 ? t.slice(0, 38) + "…" : t; };

/* Parsed elements as builder nodes. A tag the builder doesn't place lets
   what's inside it through; a <div> is a Group. */
function jsxNodes(els, report) {
  var out = [];
  els.forEach(function (el) {
    if (el.text !== undefined || el.expr !== undefined) return;
    if (!el.tag) { out = out.concat(jsxNodes(el.children, report)); return; }
    var tag = el.tag;
    /* An <img> is an Image, keeping its own ratio where Image names it. */
    if (tag === "img" && META.Image) {
      var img = { type: "Image", props: {}, style: {} };
      el.attrs.forEach(function (a) {
        if ((a.name === "src" || a.name === "alt") && a.str !== undefined) img.props[a.name] = a.str;
        if (a.name === "style" && a.expr) {
          var sl = readLiteral(a.expr.trim());
          var ar = sl.ok && sl.value && String(sl.value.aspectRatio || "").replace(/\s+/g, "");
          var named = ar ? (ar === "1/1" ? "square" : ar.replace("/", ":")) : null;
          var ratio = (META.Image.props.filter(function (p) { return p.name === "ratio"; })[0] || {}).options || [];
          if (named && ratio.indexOf(named) >= 0) img.props.ratio = named;
        }
      });
      if (img.props.src && !MEDIA_URL.test(img.props.src)) { note(report, "Image: src takes an https URL"); delete img.props.src; }
      out.push(img);
      return;
    }
    var isDiv = tag === "div";
    if (!isDiv && !META[tag]) {
      note(report, "<" + tag + "> isn't something the builder places, so what was inside it came in without it");
      out = out.concat(jsxNodes(el.children.filter(function (c) { return c.tag !== undefined; }), report));
      return;
    }
    if (isDiv && el.attrs.some(function (a) { return a.name === "role" && a.str === "presentation"; })) {
      note(report, "A shape (<div role=\"presentation\">) doesn't come back from code; draw it with the shape tools");
      return;
    }
    var type = isDiv ? "Group" : tag;
    var meta = META[type];
    var node = { type: type, props: {}, style: {} };
    var slots = [];
    el.attrs.forEach(function (a) {
      var name = a.name;
      if (a.spread !== undefined) { note(report, type + ": {" + short(a.spread) + "} spreads props from code, so they were left out"); return; }
      if (name === "key" || name === "ref") return;
      if (/^on[A-Z]/.test(name)) { note(report, type + ": " + name + " is a handler, and handlers aren't kept"); return; }
      if (name === "className") {
        var cls = String(a.str || "").split(/\s+/);
        if (cls.indexOf("dark") >= 0) node.style.dark = true;
        if (cls.some(function (c) { return c && c !== "dark"; }) || a.expr !== undefined) note(report, type + ": classes other than dark aren't kept");
        return;
      }
      var v;
      if (a.bool) v = true;
      else if (a.str !== undefined) v = a.str;
      else {
        var code = a.expr.trim();
        if (code.charAt(0) === "<") {
          var parsed = jsxNodes(readJsxElements(code), report);
          slots.push({ type: "Slot", props: { name: name }, children: parsed });
          return;
        }
        var lit = readLiteral(code);
        if (!lit.ok) { note(report, type + ": " + name + "={" + short(code) + "} is code, so it was left out"); return; }
        v = lit.value;
      }
      if (name === "style") {
        if (!v || typeof v !== "object" || Array.isArray(v)) { note(report, type + ": style takes an object"); return; }
        var css = Object.assign({}, v);
        if (isDiv) {
          if (css.flexDirection === "column" || css.flexDirection === "row") node.props.direction = css.flexDirection;
          else if (css.display !== "flex") node.props.direction = "column";
          if (css.flexWrap === "wrap") node.props.wrap = true;
          if (css.alignItems) node.props.align = css.alignItems;
          if (css.justifyContent) node.props.justify = css.justifyContent;
          var gm = GROUP_GAP_VAR.exec(String(css.gap || "").replace(/\s+/g, ""));
          if (gm) node.props.gap = gm[1];
          else if (css.display === "flex" && css.gap === undefined) node.props.gap = "none";
          ["display", "flexDirection", "flexWrap", "alignItems", "justifyContent", "position"].forEach(function (p) { delete css[p]; });
          if (gm) delete css.gap;
        }
        Object.assign(node.style, tokensFromCss(css, type, report));
        return;
      }
      if (v === null || v === undefined) return;
      /* level={2} where the options are "2": the option, not the number. */
      var spec = meta && meta.props.filter(function (p) { return p.name === name; })[0];
      if (spec && spec.kind === "enum" && spec.options.indexOf(v) < 0) {
        var hit = spec.options.filter(function (o) { return String(o) === String(v); })[0];
        if (hit !== undefined) v = hit;
      }
      node.props[name] = v;
    });
    if (isDiv && node.props.direction === undefined) node.props.direction = "column";

    /* Children: written text, string literals, nested tags. */
    var parts = [];
    el.children.forEach(function (c) {
      if (c.text !== undefined) { parts.push({ text: c.text }); return; }
      if (c.expr !== undefined) {
        var code = c.expr.trim();
        if (!code || /^\/\*[\s\S]*\*\/$/.test(code)) return;
        if (code.charAt(0) === "<") { parts = parts.concat(readJsxElements(code)); return; }
        /* items.map((it) => <Card …/>): the card a few times, from its
           defaults, since the items themselves live in code. */
        var mapped = /\.map\(\s*(?:\([^)]*\)|[\w$]+)\s*=>\s*\(?\s*(<[\s\S]*>)\s*\)?\s*\)\s*$/.exec(code);
        if (mapped) {
          var made = [];
          try { made = jsxNodes(readJsxElements(mapped[1]), []); } catch (err) { made = []; }
          if (made.length) {
            var times = type === "Carousel" ? 5 : 3;
            for (var r = 0; r < times; r++) parts.push({ made: JSON.parse(JSON.stringify(made)) });
            note(report, type + ": {" + short(code) + "} came in as " + times + " sample " + made[0].type + (made.length > 1 ? " groups" : "") + ", filled from defaults; the real items live in code");
            return;
          }
        }
        var lit = readLiteral(code);
        if (lit.ok && (typeof lit.value === "string" || typeof lit.value === "number")) { parts.push({ text: String(lit.value) }); return; }
        note(report, type + ": {" + short(code) + "} is code, so what it makes was left out");
        return;
      }
      parts.push(c);
    });
    var words = parts.filter(function (p) { return p.text !== undefined; }).map(function (p) { return p.text; }).join(" ").replace(/\s+/g, " ").trim();
    var tags = parts.filter(function (p) { return p.tag !== undefined || p.made; });
    if (isContainer(type)) {
      var kids = [];
      parts.forEach(function (p) {
        if (p.made) kids = kids.concat(p.made);
        else if (p.text !== undefined) { if (p.text.trim() && META.Text) kids.push({ type: "Text", props: { children: p.text.trim() }, style: {} }); }
        else kids = kids.concat(jsxNodes([p], report));
      });
      node.children = slots.concat(kids);
    } else {
      if (words && node.props.children === undefined) node.props.children = words;
      if (tags.length) {
        /* A component holding one element where its slot would be: the slot. */
        note(report, type + ": the elements inside it (" + tags.map(function (t) { return "<" + (t.made ? t.made[0].type : t.tag || "") + ">"; }).slice(0, 3).join(", ") + ") were left out; it takes text there");
      }
      if (slots.length) node.children = slots;
    }
    out.push(node);
  });
  return out;
}

/* JSX as a layout: one frame holding what was written. A whole page from
   the Code dialog (one <div> carrying the page's settings) becomes the
   frame itself. */
function readJsx(text, report) {
  var els = readJsxElements(text);
  if (!els.length) return null;
  var frame = { name: "Pasted", hug: true, root: { children: [] } };
  var page = els.length === 1 && els[0].tag === "div" && els[0].attrs.some(function (a) { return a.name === "data-layout" || a.name === "data-type-scale"; })
    || (els.length === 1 && els[0].tag === "div" && /export\s+(default\s+)?function/.test(text) && !els[0].attrs.some(function (a) { return a.name === "role"; }));
  if (page) {
    var root = els[0];
    root.attrs.forEach(function (a) {
      if (a.name === "className" && /\bdark\b/.test(a.str || "")) frame.dark = true;
      if (a.name === "data-layout" && a.str) frame.spacing = a.str;
      if (a.name === "data-type-scale" && a.str === "social") frame.typeScale = "social";
    });
    frame.root.children = jsxNodes(root.children.filter(function (c) { return c.tag !== undefined; }), report);
  } else frame.root.children = jsxNodes(els, report);
  var name = /export\s+(?:default\s+)?function\s+([A-Z]\w*)/.exec(text);
  if (name) frame.name = name[1].replace(/([a-z])([A-Z])/g, "$1 $2");
  return { frames: [frame] };
}

/* A pasted layout: a builder link, or JSON for a whole layout, one frame,
   one node or a list of nodes, or JSX. Returns { doc, report } or { error }. */
function readLayout(text) {
  var t = String(text || "").trim();
  if (!t) return null;
  var data = null;
  var report = [];
  var m = /#b=([\w-]+)/.exec(t);
  var body = t.replace(/^```[\w-]*\s*|\s*```$/g, "");
  if (m) {
    data = decode(m[1]);
    if (!data) return { error: "That link doesn't hold a layout the builder can read." };
  } else if (/^[{[]/.test(body) && !/<[A-Za-z>]/.test(body)) {
    try { data = JSON.parse(body); } catch (err) { return { error: "That isn't JSON, JSX or a builder link. " + String(err.message || "").split("\n")[0] }; }
  } else if (/^[{[]/.test(body) && (function () { try { data = JSON.parse(body); return true; } catch (err) { return false; } })()) {
    /* JSON that happens to hold markup in its text. */
  } else if (/</.test(body)) {
    try { data = readJsx(body, report); } catch (err) { return { error: "That JSX can't be read: " + String(err.message || err) + "." }; }
    if (!data) return { error: "No JSX tags found." };
  } else return { error: "That isn't JSON, JSX or a builder link." };
  if (Array.isArray(data)) data = { frames: [{ name: "Pasted", hug: true, root: { children: data } }] };
  else if (data && typeof data === "object" && !Array.isArray(data.frames)) {
    if (data.type) data = { frames: [{ name: "Pasted", hug: true, root: { children: [data] } }] };
    else if (data.root || data.children) data = { frames: [data] };
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.frames) || !data.frames.length) return { error: "No frames or nodes found. See the layout format for what the builder reads." };
  var doc = clean(data, report);
  var layers = 0;
  doc.frames.forEach(function (f) { (function walk(n) { (n.children || []).forEach(function (c) { layers++; walk(c); }); })(f.root); });
  return { doc: doc, report: report, layers: layers };
}

export { GROUP_GAP_VAR, TOKEN_CSS, jsxNodes, readJsx, readJsxElements, readLayout, readLiteral, short, tokensFromCss };
