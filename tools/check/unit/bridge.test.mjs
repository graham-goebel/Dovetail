/* The live canvas bridge (model/bridge.js, cloud/bridge.js): which tools a
   session offers, what may run, how each step reads, and the key. */
import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, emptyDoc } from "../../../assets/builder/model/tree.js";
import { TOOLS } from "../../../assets/builder/model/agent.js";
import { PICTURE_MAX, agentFrom, allowed, bridgeTools, describeText, isRead, pictureFrom, rowsOf, targetsOf } from "../../../assets/builder/model/bridge.js";
import { randomKey, sha256 } from "../../../assets/builder/cloud/bridge.js";

test("a session offers the assistant's tools less those that answer in its panel, plus edit_by_name; a look-only session only the reading ones", () => {
  const names = bridgeTools(TOOLS, true).map((t) => t.name);
  assert.ok(names.includes("set_style") && names.includes("screenshot") && names.includes("edit_by_name"));
  assert.ok(!names.includes("propose_plan") && !names.includes("ask_user"), "no plan or question cards: Claude asks in its own conversation");
  const look = bridgeTools(TOOLS, false).map((t) => t.name);
  assert.ok(look.includes("read_page") && look.includes("lint") && look.includes("screenshot"));
  assert.ok(look.every((n) => isRead(n)), `only reading tools, got ${look.filter((n) => !isRead(n))}`);
});

test("what may run, and why not in words", () => {
  const tools = bridgeTools(TOOLS, false);
  assert.equal(allowed({ name: "describe" }, { canEdit: false }, tools), null);
  assert.equal(allowed({ name: "read_page" }, { canEdit: false }, tools), null);
  assert.match(allowed({ name: "set_style" }, { canEdit: false }, tools), /no tool called set_style/);
  assert.match(allowed({ name: "rm_rf" }, { canEdit: true }, bridgeTools(TOOLS, true)), /no tool called rm_rf.*describe/);
  assert.match(allowed({ name: "set_style" }, { canEdit: false }, bridgeTools(TOOLS, true)), /can only look/);
});

test("describe carries the brief, the session's terms and every tool with its schema", () => {
  const text = describeText("BRIEF", bridgeTools(TOOLS, true), { label: "Ledger", canEdit: true, askFirst: true });
  assert.match(text, /live session on Ledger/);
  assert.match(text, /waits for the person to apply it/);
  assert.match(text, /\nBRIEF\n/);
  const tools = JSON.parse(text.split("## Tools\n")[1]);
  assert.ok(tools.some((t) => t.name === "edit_by_name" && t.input_schema.required[0] === "edit"));
});

test("each step reads as a row with an icon for its kind; a batch as its steps; an edit by name as its changes", () => {
  const d = emptyDoc();
  const hero = make("Group", {}, [make("Heading", { children: "$284,120" })]); hero.name = "Hero";
  d.frames[0].root.children = [hero];
  const name = (id) => (id === hero.id ? "Hero" : id);
  assert.deepEqual(rowsOf({ name: "set_style", input: { ids: [hero.id], family: "padding", value: "xl" } }, name, d), [{ icon: "sliders", title: "Hero", detail: "Padding → xl" }]);
  assert.equal(rowsOf({ name: "set_style", input: { ids: [hero.id], family: "z", value: "behind" } }, name, d)[0].icon, "layers2");
  assert.equal(rowsOf({ name: "remove", input: { ids: [hero.id] } }, name, d)[0].icon, "trash");
  assert.deepEqual(rowsOf({ name: "screenshot", input: { width: 390 } }, name, d)[0], { icon: "phone", title: "Looked at the frame", detail: "at 390px" });
  const batch = rowsOf({ name: "batch", input: { calls: [{ name: "set_text", input: { id: hero.id, text: "Hi" } }, { name: "remove", input: { ids: [hero.id] } }] } }, name, d);
  assert.deepEqual(batch.map((r) => r.icon), ["type", "trash"]);
  const byName = rowsOf({ name: "edit_by_name", input: { edit: '## Edit\n- Hero: padding xl\n- "$284,120": size display-2xl' } }, name, d);
  assert.deepEqual(byName.map((r) => r.icon), ["sliders", "fit"]);
  assert.match(byName[1].detail, /display-2xl/);
});

test("the key is long and random, and only its hash is stored", async () => {
  const a = randomKey(), b = randomKey();
  assert.ok(a.length >= 32 && /^[\w-]+$/.test(a) && a !== b);
  const h = await sha256("abc");
  assert.equal(h, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("an agent's name and mark are kept only when safe to show", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  assert.deepEqual(agentFrom({ name: "  Image\n agent  ", mark: png }), { name: "Image agent", mark: png, markRefused: false });
  assert.equal(agentFrom({ name: "x".repeat(80) }).name.length, 40);
  const svg = agentFrom({ name: "A", mark: "data:image/svg+xml;base64,PHN2Zz4=" });
  assert.equal(svg.mark, ""); assert.equal(svg.markRefused, true);
  assert.equal(agentFrom({ name: "A", mark: "https://example.com/logo.png" }).mark, "", "no address that would fetch from elsewhere");
  assert.equal(agentFrom({ name: "A", mark: "data:image/png;base64," + "A".repeat(70000) }).mark, "", "no mark over 48 KB");
  assert.ok(bridgeTools(TOOLS, false).some((t) => t.name === "hello"), "even a look-only session can say hello");
});

test("the layers a step means to change, so two agents don't change one at once", () => {
  const d = emptyDoc();
  const hero = make("Group", {}, [make("Heading", { children: "$284,120" })]); hero.name = "Hero";
  d.frames[0].root.children = [hero];
  const head = hero.children[0];
  assert.deepEqual(targetsOf({ name: "set_style", input: { ids: [hero.id], family: "padding", value: "xl" } }, d), [hero.id]);
  assert.deepEqual(targetsOf({ name: "insert_jsx", input: { parent: hero.id, jsx: "<Text/>" } }, d), [hero.id]);
  assert.deepEqual(targetsOf({ name: "batch", input: { calls: [{ name: "set_text", input: { id: head.id, text: "Hi" } }, { name: "remove", input: { ids: [hero.id] } }] } }, d), [head.id, hero.id]);
  assert.deepEqual(targetsOf({ name: "edit_by_name", input: { edit: '## Edit\n- "$284,120": size display-2xl' } }, d), [head.id]);
  assert.deepEqual(targetsOf({ name: "read_page", input: {} }, d), []);
  assert.deepEqual(targetsOf({ name: "set_style", input: { ids: ["root"], family: "padding", value: "xl" } }, d), [], "the frame itself is never held");
});

test("a picture an agent sends is checked before it's opened", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  assert.deepEqual(pictureFrom({ image: png, id: "n1", alt: "  A red\n kite " }), { image: png, alt: "A red kite" });
  assert.equal(pictureFrom({ image: png, parent: "root" }).image, png);
  assert.match(pictureFrom({ image: png }).why, /id .* or parent/, "it needs somewhere to go");
  assert.match(pictureFrom({ image: png, id: "n1", parent: "n2" }).why, /one of them/);
  assert.match(pictureFrom({ image: "https://example.com/a.png", id: "n1" }).why, /aren't fetched/, "no address that would fetch from elsewhere");
  assert.match(pictureFrom({ image: "data:image/svg+xml;base64,PHN2Zz4=", id: "n1" }).why, /png, jpeg or webp/, "no drawings that could carry script");
  assert.match(pictureFrom({ image: "data:image/jpeg;base64," + "A".repeat(PICTURE_MAX), id: "n1" }).why, /over 5 MB/);
  assert.match(pictureFrom({ id: "n1" }).why, /Send image/);
});

test("pictures and working_on are offered only where changes are, hold their layer and read as rows", () => {
  assert.ok(bridgeTools(TOOLS, true).some((t) => t.name === "place_image") && bridgeTools(TOOLS, true).some((t) => t.name === "working_on"));
  assert.ok(!bridgeTools(TOOLS, false).some((t) => t.name === "place_image" || t.name === "working_on"));
  assert.match(allowed({ name: "place_image" }, { canEdit: false }, bridgeTools(TOOLS, false)), /no tool called place_image/);
  const d = emptyDoc();
  const pic = make("Image", {}); pic.name = "Hero picture";
  d.frames[0].root.children = [pic];
  assert.deepEqual(targetsOf({ name: "place_image", input: { image: "x", id: pic.id } }, d), [pic.id]);
  assert.deepEqual(targetsOf({ name: "working_on", input: { id: pic.id, text: "Making a picture" } }, d), [pic.id]);
  const name = (id) => (id === pic.id ? "Hero picture" : id);
  assert.deepEqual(rowsOf({ name: "place_image", input: { id: pic.id, alt: "A kite" } }, name, d), [{ icon: "image", title: "Hero picture", detail: "Picture placed: A kite" }]);
  assert.deepEqual(rowsOf({ name: "place_image", input: { parent: "root" } }, name, d), [{ icon: "image", title: "A new picture", detail: "Added to the page" }]);
  assert.deepEqual(rowsOf({ name: "working_on", input: { id: pic.id, text: "Making a picture" } }, name, d), [{ icon: "wand", title: "Hero picture", detail: "Making a picture" }]);
});
