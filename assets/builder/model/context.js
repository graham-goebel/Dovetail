/* What the assistant reads besides the canvas: context docs (markdown) and
   skills (a SKILL.md and the files beside it). Each belongs to one scope:
   the file, its project (on Home, the group it's in), or the team. Docs are
   sent with every request on the pages they're for; a skill's description
   is sent, and the rest only when a request fits it. Nothing here touches
   the page or the store; App and the Context panel do. */

import { uid } from "./tree.js";

var SCOPES = ["file", "project", "team"];
var DOC_USES = ["always", "attach", "off"];
var LIMIT = { body: 200000, title: 120, files: 60, description: 1024 };

function words(text) { var m = String(text || "").match(/\S+/g); return m ? m.length : 0; }
/* About a token for every four characters: enough for a meter. */
function tokens(text) { return Math.ceil(String(text || "").length / 4); }

/* A SKILL.md's front matter (name, description) and the instructions under it. */
function readSkillMd(text) {
  var src = String(text || "").replace(/^﻿/, "");
  var m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  var meta = {};
  if (m) {
    var key = null;
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (kv) { key = kv[1].toLowerCase(); meta[key] = kv[2].replace(/^["']|["']$/g, "").trim(); }
      else if (key && /^\s+\S/.test(line)) meta[key] = (meta[key] + " " + line.trim()).trim();
    });
  }
  return { name: meta.name || "", description: meta.description || "", body: m ? src.slice(m[0].length) : src };
}

function skillName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "skill";
}

/* A skill from its files ([{ path, body }], from a folder or a zip): the
   folder holding SKILL.md is its root, and paths are kept relative to it.
   Returns the skill, or { error } to show. */
function skillFromFiles(files, fallbackName) {
  var list = (files || []).filter(function (f) { return f && typeof f.path === "string"; });
  var md = list.filter(function (f) { return /(^|\/)SKILL\.md$/i.test(f.path); })
    .sort(function (a, b) { return a.path.split("/").length - b.path.split("/").length; })[0];
  if (!md) return { error: "There's no SKILL.md in it. A skill is a folder with a SKILL.md at its top." };
  var root = md.path.replace(/SKILL\.md$/i, "");
  var kept = list.filter(function (f) { return f.path.indexOf(root) === 0; }).map(function (f) { return { path: f.path.slice(root.length), body: String(f.body) }; });
  if (kept.length > LIMIT.files) return { error: "A skill can hold up to " + LIMIT.files + " files." };
  if (kept.some(function (f) { return f.body.length > LIMIT.body; })) return { error: "One of its files is too large." };
  var meta = readSkillMd(md.body);
  kept.sort(function (a, b) { return a.path === md.path.slice(root.length) ? -1 : b.path === md.path.slice(root.length) ? 1 : a.path < b.path ? -1 : 1; });
  return {
    id: uid(), kind: "skill", source: "uploaded", enabled: true, pages: [],
    name: skillName(meta.name || root.replace(/\/$/, "").split("/").pop() || fallbackName),
    description: meta.description.slice(0, LIMIT.description),
    files: kept.map(function (f) { return /^skill\.md$/i.test(f.path) ? { path: "SKILL.md", body: f.body } : f; }),
    updatedAt: Date.now(),
  };
}

/* A doc from a markdown file: its first heading, else the file's name. */
function docFromMarkdown(fileName, text) {
  var body = String(text || "").slice(0, LIMIT.body);
  var h = body.match(/^#\s+(.+)$/m);
  var title = (h ? h[1] : String(fileName || "Doc").replace(/\.(md|markdown|txt)$/i, "")).trim().slice(0, LIMIT.title) || "Doc";
  return { id: uid(), kind: "doc", source: "uploaded", use: "always", pages: [], title: title, body: body, updatedAt: Date.now() };
}

function newDoc(title) { return { id: uid(), kind: "doc", source: "written", use: "always", pages: [], title: title || "Untitled doc", body: "", updatedAt: Date.now() }; }
function newSkill(name) {
  var n = skillName(name || "new-skill");
  return { id: uid(), kind: "skill", source: "written", enabled: true, pages: [], name: n, description: "",
    files: [{ path: "SKILL.md", body: "---\nname: " + n + "\ndescription: \n---\n\n# " + n + "\n\nWhat to do, step by step.\n" }], updatedAt: Date.now() };
}

/* A stored item made safe to use: known fields, sizes kept to their limits. */
function cleanItem(it) {
  if (!it || typeof it !== "object" || typeof it.id !== "string") return null;
  var pages = Array.isArray(it.pages) ? it.pages.filter(function (p) { return typeof p === "string"; }).slice(0, 200) : [];
  if (it.kind === "doc") {
    return { id: it.id, kind: "doc", source: it.source === "uploaded" || it.source === "generated" ? it.source : "written",
      use: DOC_USES.indexOf(it.use) >= 0 ? it.use : "always", pages: pages,
      title: String(it.title || "Untitled doc").slice(0, LIMIT.title), body: String(it.body || "").slice(0, LIMIT.body), updatedAt: Number(it.updatedAt) || 0 };
  }
  if (it.kind === "skill") {
    var files = (Array.isArray(it.files) ? it.files : []).filter(function (f) { return f && typeof f.path === "string"; }).slice(0, LIMIT.files)
      .map(function (f) { return { path: String(f.path).slice(0, 200), body: String(f.body || "").slice(0, LIMIT.body) }; });
    return { id: it.id, kind: "skill", source: it.source === "uploaded" ? "uploaded" : "written", enabled: it.enabled !== false, pages: pages,
      name: skillName(it.name), description: String(it.description || "").slice(0, LIMIT.description), files: files, updatedAt: Number(it.updatedAt) || 0 };
  }
  return null;
}

/* Lessons: rules the person taught the assistant, kept as one doc in a
   scope so every later request carries them. A lesson is one short line;
   one already there (by its words, whatever the case) isn't added twice.
   Returns { items, added, count, lesson } with the scope's items updated. */
var LESSONS = "Lessons";
var LESSONS_HEAD = "# Lessons\n\nRules the person taught the assistant while working. Edit or remove any of them; the assistant follows what's here.\n";
function lessonLine(text) { return String(text || "").replace(/\s+/g, " ").replace(/^[-*•\s]+/, "").trim().slice(0, 300); }
function lessonsOf(doc) { return doc ? doc.body.split("\n").filter(function (l) { return /^- /.test(l); }).map(function (l) { return l.slice(2).trim(); }) : []; }
function addLesson(items, text) {
  var lesson = lessonLine(text);
  var list = (items || []).slice();
  if (!lesson) return { items: list, added: false, count: 0, lesson: "" };
  var at = -1;
  list.forEach(function (it, i) { if (at < 0 && it.kind === "doc" && it.source === "generated" && it.title === LESSONS) at = i; });
  var doc = at >= 0 ? list[at] : Object.assign(newDoc(LESSONS), { source: "generated", body: LESSONS_HEAD });
  var have = lessonsOf(doc);
  var key = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };
  if (have.some(function (l) { return key(l) === key(lesson); })) return { items: list, added: false, count: have.length, lesson: lesson };
  var body = (doc.body.replace(/\s+$/, "") + "\n" + (have.length ? "" : "\n") + "- " + lesson + "\n").slice(0, LIMIT.body);
  var next = Object.assign({}, doc, { body: body, use: doc.use === "off" ? "always" : doc.use, updatedAt: Date.now() });
  if (at >= 0) list[at] = next; else list.push(next);
  return { items: list, added: true, count: have.length + 1, lesson: lesson };
}

/* Whether an item is for a page: one with no pages listed is for them all. */
function forPage(it, pageId) { return !it.pages.length || it.pages.indexOf(pageId) >= 0; }

/* What goes with a request on a page: the docs used always (and those
   attached by hand), and the skills on offer, with a token count for the
   meter. byScope: { file: [...], project: [...], team: [...] }. */
function contextFor(byScope, pageId, attached) {
  var docs = [], skills = [];
  attached = attached || [];
  SCOPES.forEach(function (scope) {
    ((byScope && byScope[scope]) || []).forEach(function (it) {
      if (it.kind === "doc" && it.use !== "off" && forPage(it, pageId) && (it.use === "always" || attached.indexOf(it.id) >= 0)) docs.push(Object.assign({ scope: scope }, it));
      if (it.kind === "skill" && it.enabled && forPage(it, pageId)) skills.push(Object.assign({ scope: scope }, it));
    });
  });
  var count = docs.reduce(function (n, d) { return n + tokens(d.title) + tokens(d.body); }, 0) + skills.reduce(function (n, s) { return n + tokens(s.name) + tokens(s.description); }, 0);
  return { docs: docs, skills: skills, tokens: count };
}

/* The system text a request carries: the docs in full and each skill's name
   and description, which the assistant asks to read when one fits. */
function contextText(ctx) {
  var out = [];
  if (ctx.docs.length) out.push("# Context\n\n" + ctx.docs.map(function (d) { return "## " + d.title + "\n\n" + d.body.trim(); }).join("\n\n"));
  if (ctx.skills.length) out.push("# Skills\n\nRead a skill's files with read_skill when a request fits its description.\n\n" + ctx.skills.map(function (s) { return "- " + s.name + ": " + s.description; }).join("\n"));
  return out.join("\n\n");
}

export { DOC_USES, LESSONS, LIMIT, SCOPES, addLesson, cleanItem, lessonsOf, contextFor, contextText, docFromMarkdown, forPage, newDoc, newSkill, readSkillMd, skillFromFiles, skillName, tokens, words };
