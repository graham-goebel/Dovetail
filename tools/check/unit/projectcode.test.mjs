/* A project as code (model/projectcode.js): which files the download holds,
   what goes in each, and how pictures, page links and components are carried
   across pages. The frame's exporter is stood in for, so this checks the
   files and what's handed to it, not the JSX. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { make, makeFrame, fresh } from "../../../assets/builder/model/tree.js";
import { projectFiles, routes } from "../../../assets/builder/model/projectcode.js";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const seen = [];
const exporter = {
  jsx(tree, name, opts) { seen.push({ kind: "page", tree, name, opts }); return "export function " + name.replace(/\W/g, "") + "() {}\n"; },
  jsxComponent(c, from) { seen.push({ kind: "component", c, from }); return "export function " + c.name + "() {}\n"; },
};
const frame = (name, children) => { const f = makeFrame(name, "desktop"); f.root.children = children; return f; };
const doc = (...frames) => ({ frames, active: frames[0].id });

test("routes: the first page is /, the rest are named after themselves and never clash", () => {
  assert.deepEqual(routes([{ id: "a", name: "Home" }, { id: "b", name: "About us" }, { id: "c", name: "About us" }, { id: "d", name: "" }]),
    { a: { file: "index", path: "/" }, b: { file: "about-us", path: "/about-us" }, c: { file: "about-us-2", path: "/about-us-2" }, d: { file: "page-4", path: "/page-4" } });
});

test("a file per frame, a file per component, theme.css, pictures in assets/, README first", () => {
  seen.length = 0;
  const tile = make("Group", { direction: "column" }, [make("Heading", { children: "Mug" }), make("Image", { src: PNG, alt: "Mug" })], { padding: "md" });
  const inst = (id, text) => { const n = Object.assign(fresh(tile), { id, inst: { of: "c1", rev: 1 } }); if (text) n.children[0].props.children = text; return n; };
  const pages = [
    { id: "p1", name: "Home", doc: doc(frame("Home", [make("Section", {}, [inst("a"), make("Button", { children: "About", href: "#page:p2" })])])) },
    { id: "p2", name: "About us", doc: doc(frame("Desktop", [inst("b", "Jug")]), frame("Phone", [make("Button", { children: "Gone", href: "#page:zzz" })])) },
  ];
  const library = { components: [{ id: "c1", name: "Product tile", node: tile, tokens: [], rev: 1 }], images: [{ id: "i1", name: "Mug photo", src: PNG }] };
  const got = projectFiles({ name: "Kiln", pages, library, themeCss: ":root { --x: 1; }", exporter });
  assert.deepEqual(got.entries.map((e) => e.name), ["README.md", "theme.css", "pages/index.jsx", "pages/about-us-desktop.jsx", "pages/about-us-phone.jsx", "components/ProductTile.jsx", "assets/mug-photo.png"]);
  assert.ok(got.entries[6].data instanceof Uint8Array && got.entries[6].data[1] === 0x50, "the picture is its bytes");

  const pagesSeen = seen.filter((s) => s.kind === "page");
  assert.ok(pagesSeen.every((s) => s.opts.localFrom === "../components/"), "pages import their components from components/");
  const home = JSON.stringify(pagesSeen[0].tree);
  assert.ok(/"href":"\/about-us"/.test(home), "a link to a page is its route");
  assert.ok(!/data:image/.test(home), "no picture inline");
  assert.ok(!/"href"/.test(JSON.stringify(pagesSeen[2].tree)), "a link to a page that's gone is left out");
  assert.ok(/"__Call"/.test(home) && /"__Call"/.test(JSON.stringify(pagesSeen[1].tree)), "instances on both pages are calls");

  const comp = seen.find((s) => s.kind === "component");
  assert.equal(comp.from, "./");
  assert.deepEqual(comp.c.params, [{ name: "title", def: "Mug" }], "a text one page changes is a prop of the component everywhere");
  assert.ok(/"src":"\.\.\/assets\/mug-photo\.png"/.test(JSON.stringify(comp.c.node)), "the component's picture points at assets/");

  const readme = got.entries[0].data;
  assert.ok(/# Kiln/.test(readme) && /npm install @dovetail-ds\/react/.test(readme) && /import "\.\/theme\.css";/.test(readme), readme);
  assert.ok(/- Home: `\/`/.test(readme) && /- About us: `\/about-us`/.test(readme) && /`ProductTile` \(title\)/.test(readme), readme);
});

test("no theme, no theme.css; the same picture twice is one file", () => {
  seen.length = 0;
  const pages = [{ id: "p1", name: "Home", doc: doc(frame("Home", [make("Image", { src: PNG, alt: "a" }), make("Image", { src: PNG, alt: "b" })])) }];
  const got = projectFiles({ name: "Bare", pages, library: {}, themeCss: "", exporter });
  assert.deepEqual(got.entries.map((e) => e.name), ["README.md", "pages/index.jsx", "assets/picture.png"]);
  assert.ok(!/theme\.css/.test(got.entries[0].data));
});
