/* The Dovetail MCP server (tools/mcp/server.mjs), as a client would use it:
   started as a process, spoken to in JSON-RPC over stdio. Run with
   npm run check:unit. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function session(messages) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, "tools/mcp/server.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { err += d; });
    p.on("error", reject);
    p.on("close", () => {
      try { resolve({ replies: out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)), err }); } catch (e) { reject(new Error("stdout held something that isn't a message: " + out.slice(0, 200))); }
    });
    p.stdin.end(messages.map((m) => JSON.stringify(Object.assign({ jsonrpc: "2.0" }, m))).join("\n") + "\n");
  });
}
const byId = (replies, id) => replies.find((r) => r.id === id);
const text = (r) => r.result.content[0].text;

test("it starts, says what it is, and lists the system's tools and the frame tools", async () => {
  const { replies } = await session([
    { id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "1" } } },
    { method: "notifications/initialized" },
    { id: 2, method: "tools/list" },
    { id: 3, method: "ping" },
  ]);
  const init = byId(replies, 1).result;
  assert.equal(init.serverInfo.name, "dovetail");
  assert.ok(init.capabilities.tools);
  assert.match(init.instructions, /dovetail_rules/);
  const names = byId(replies, 2).result.tools.map((t) => t.name);
  assert.deepEqual(names, ["dovetail_rules", "search_components", "read_component", "list_tokens", "read_guideline", "search_layouts", "list_frames", "frame_spec"]);
  assert.ok(byId(replies, 2).result.tools.every((t) => t.inputSchema && t.inputSchema.type === "object" && t.description));
  assert.deepEqual(byId(replies, 3).result, {});
  assert.equal(replies.length, 3, "a notification gets no reply");
});

test("it answers from the system: rules, a component's docs, a guideline, tokens and layouts", async () => {
  const call = (id, name, args) => ({ id, method: "tools/call", params: { name, arguments: args } });
  const { replies } = await session([
    call(1, "dovetail_rules", {}), call(2, "read_component", { name: "Button" }), call(3, "read_guideline", { topic: "accessibility" }),
    call(4, "list_tokens", { family: "radius" }), call(5, "search_layouts", { kind: "hero" }), call(6, "read_component", { name: "Nope" }), call(7, "missing_tool", {}),
  ]);
  assert.match(text(byId(replies, 1)), /The system's rules/);
  assert.match(text(byId(replies, 2)), /"name":"Button"/);
  assert.match(text(byId(replies, 2)), /primary/i, "the component's own docs come with its props");
  assert.match(text(byId(replies, 3)), /^# Accessibility/);
  assert.ok(text(byId(replies, 4)).length > 20);
  assert.match(text(byId(replies, 5)), /hero-split/);
  assert.equal(byId(replies, 6).result.isError, true, "a tool that fails says so in its result");
  assert.equal(byId(replies, 7).error.code, -32602);
});

test("it reads a .dovetail file: its frames, and a frame as a spec", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dovetail-mcp-"));
  const file = path.join(dir, "kiln.dovetail");
  fs.writeFileSync(file, JSON.stringify({ format: "dovetail-project", version: 3, name: "Kiln", components: [], pages: [
    { name: "Home", doc: { active: "f1", frames: [{ id: "f1", name: "Landing", width: 1280, mode: "structured", root: { id: "root", type: "Root", props: {}, style: {}, children: [
      { id: "a", type: "Section", props: { tone: "brand" }, style: {}, children: [{ id: "b", type: "Button", props: { variant: "secondary", children: "Shop" }, style: {} }] }] } }] } },
    { name: "About", doc: { active: "f2", frames: [{ id: "f2", name: "Story", width: 1280, root: { id: "root", type: "Root", props: {}, style: {}, children: [] } }] } }] }));
  const call = (id, name, args) => ({ id, method: "tools/call", params: { name, arguments: args } });
  const { replies } = await session([call(1, "list_frames", { file }), call(2, "frame_spec", { file }), call(3, "frame_spec", { file, page: "about" }), call(4, "frame_spec", { file, frame: "Nope" }), call(5, "frame_spec", { file: path.join(dir, "notes.txt") })]);
  assert.match(text(byId(replies, 1)), /## Home\n- Landing \(structured, 1280 wide, 2 layers\)[\s\S]*## About/);
  const spec = text(byId(replies, 2));
  assert.match(spec, /^# Landing/);
  assert.match(spec, /Button ×1: variant secondary/);
  assert.match(spec, /Section ×1: tone brand/);
  assert.match(spec, /## Layers/);
  assert.match(text(byId(replies, 3)), /^# Story/);
  assert.ok(byId(replies, 4).result.isError && /There's no frame "Nope". There are: Landing/.test(text(byId(replies, 4))));
  assert.ok(byId(replies, 5).result.isError);
});
