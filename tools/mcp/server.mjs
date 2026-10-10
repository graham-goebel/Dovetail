#!/usr/bin/env node
/* Dovetail as an MCP server, so a coding agent elsewhere can build with the
   system: its rules, components (props and docs), tokens, guidelines and
   section layouts, and a spec of any frame in an exported .dovetail file.

   It speaks MCP's JSON-RPC over stdio, one message per line, with no
   dependencies. The answers come from the same code the Builder's own
   assistant uses (assets/builder/model/agent.js), reading the system from
   this checkout: assets/builder-data.js, system/manifest.json, the
   components' .md files and system/guidelines. Run `npm run build` first if
   the system has changed. See docs/mcp.md. */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* The Builder's model runs in a page; give it the little of one it reads. */
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/builder-data.js"), "utf8"), { window: win });
globalThis.window = Object.assign(globalThis.window || {}, {
  DovetailBuilderData: win.DovetailBuilderData,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  matchMedia: () => ({ matches: false }),
});
globalThis.document = { getElementById: () => null, currentScript: null, createElement: () => ({}) };
globalThis.React = { createElement: () => null, useState: () => [], useEffect: () => {}, useRef: () => ({}), useCallback: (f) => f, useMemo: (f) => f(), Component: class {} };
if (!globalThis.location) globalThis.location = { hash: "", pathname: "/builder.html", search: "" };

const { TOOLS: BUILDER_TOOLS, outline, plainGuide, runTool, systemPrompt } = await import("../../assets/builder/model/agent.js");
const { emptyDoc } = await import("../../assets/builder/model/tree.js");
const { specOf, specText } = await import("../../assets/builder/model/spec.js");

const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, "system/manifest.json"), "utf8"));

/* What the Builder's read tools need, from disk. */
const api = {
  doc: () => emptyDoc(),
  componentDoc(name) {
    const file = (MANIFEST.files || []).find((f) => new RegExp("^components/[^/]+/" + name + "\\.md$").test(f));
    return file ? fs.promises.readFile(path.join(ROOT, "system", file), "utf8").catch(() => null) : null;
  },
  guideline(g) { return fs.promises.readFile(path.join(ROOT, "system/guidelines", g.file), "utf8").then((t) => plainGuide(g.file, t)); },
};

/* The Builder's own tools that only read the system, offered as they are. */
const SHARED = ["search_components", "read_component", "list_tokens", "read_guideline", "search_layouts"];
const builderTool = (name) => BUILDER_TOOLS.find((t) => t.name === name);

/* A .dovetail file: its pages and their frames. */
function readFile(file) {
  const where = path.resolve(process.cwd(), String(file || ""));
  if (!/\.(dovetail|json)$/i.test(where)) throw new Error("Give the path of a .dovetail file, as the Builder's Download saves it.");
  const data = JSON.parse(fs.readFileSync(where, "utf8"));
  const pages = Array.isArray(data.pages) && data.pages.length ? data.pages : data.doc ? [{ name: "Page 1", doc: data.doc }] : [];
  if (!pages.length) throw new Error("That file has no pages. It may be a project bundle; download a single file from the Builder.");
  return { name: data.name || path.basename(where), pages, library: { components: data.components || [] } };
}
const pick = (list, want, label) => {
  if (!want) return list[0];
  const w = String(want).toLowerCase();
  const hit = list.find((x) => x.id === want) || list.find((x) => String(x.name || "").toLowerCase() === w) || list.find((x) => String(x.name || "").toLowerCase().includes(w));
  if (!hit) throw new Error(`There's no ${label} "${want}". There are: ${list.map((x) => x.name).join(", ")}.`);
  return hit;
};

const TOOLS = [
  { name: "dovetail_rules", description: "Dovetail's rules for building with it: the three token tiers, scoped dark mode, accessibility, and every component with when to use it and when not, plus each token family's values and what they're for. Read it once before building UI with Dovetail.", inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => systemPrompt() },
  ...SHARED.map((name) => {
    const t = builderTool(name);
    return { name, description: t.description, inputSchema: t.input_schema, run: async (input) => { const r = await runTool(api, { name, input }); if (!r.ok) throw new Error(r.result); return typeof r.result === "string" ? r.result : JSON.stringify(r.result); } };
  }),
  { name: "list_frames", description: "The pages and frames in a .dovetail file (the Builder's Download), with each frame's mode, width and layer count.", inputSchema: { type: "object", properties: { file: { type: "string", description: "Path to the .dovetail file" } }, required: ["file"], additionalProperties: false },
    run: ({ file }) => {
      const f = readFile(file);
      return [`# ${f.name}`].concat(f.pages.map((pg) => `\n## ${pg.name}\n` + ((pg.doc && pg.doc.frames) || []).map((fr) => `- ${fr.name} (${fr.mode || "free"}, ${fr.width} wide, ${specOf(fr, f.library).layers} layers)`).join("\n"))).join("\n");
    } },
  { name: "frame_spec", description: "A frame from a .dovetail file as a spec to build from: the Dovetail components it uses and the variants each is set to, the tokens behind its styles, the file's own components in it, and its layers in order with their props. Build it with the components and tokens named, not raw values; read_component gives each one's props and examples.", inputSchema: { type: "object", properties: { file: { type: "string", description: "Path to the .dovetail file" }, page: { type: "string", description: "Page name; the first page when left out" }, frame: { type: "string", description: "Frame name or id; the page's first frame when left out" } }, required: ["file"], additionalProperties: false },
    run: ({ file, page, frame }) => {
      const f = readFile(file);
      const pg = pick(f.pages, page, "page");
      const frames = (pg.doc && pg.doc.frames) || [];
      if (!frames.length) throw new Error(`The page "${pg.name}" has no frames.`);
      const fr = pick(frames, frame, "frame");
      const doc = { frames: [fr], active: fr.id };
      return specText(specOf(fr, f.library), outline(doc, fr.id).split("\n").slice(1).join("\n"), null);
    } },
];

/* ---------------------------------------------------------------- MCP */

const PROTOCOL = "2025-06-18";
const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const error = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg || {};
  const isCall = id !== undefined && id !== null;
  try {
    if (method === "initialize") {
      return reply(id, { protocolVersion: (params && params.protocolVersion) || PROTOCOL, capabilities: { tools: {} },
        serverInfo: { name: "dovetail", version: PKG.version },
        instructions: "Dovetail is a design system. Call dovetail_rules once before building UI with it, search_components and read_component for what to use, list_tokens for allowed values, and frame_spec to build a frame someone designed in the Dovetail Builder. Use the system's components and tokens, never raw colours or sizes." });
    }
    if (method === "ping") return reply(id, {});
    if (method === "tools/list") return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    if (method === "tools/call") {
      const tool = TOOLS.find((t) => t.name === (params && params.name));
      if (!tool) return error(id, -32602, `There's no tool ${params && params.name}.`);
      try {
        const text = await tool.run((params && params.arguments) || {});
        return reply(id, { content: [{ type: "text", text: String(text) }] });
      } catch (err) {
        return reply(id, { content: [{ type: "text", text: String((err && err.message) || err) }], isError: true });
      }
    }
    if (!isCall) return; /* notifications, such as notifications/initialized */
    return error(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    if (isCall) error(id, -32603, String((err && err.message) || err));
  }
}

let buffer = "";
/* Calls still answering, so the server doesn't close under them. */
const running = new Set();
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let at;
  while ((at = buffer.indexOf("\n")) >= 0) {
    const lineText = buffer.slice(0, at).trim();
    buffer = buffer.slice(at + 1);
    if (!lineText) continue;
    let msg;
    try { msg = JSON.parse(lineText); } catch { error(null, -32700, "That message isn't JSON."); continue; }
    const job = handle(msg).finally(() => running.delete(job));
    running.add(job);
  }
});
process.stdin.on("end", () => { Promise.allSettled([...running]).then(() => process.exit(0)); });
