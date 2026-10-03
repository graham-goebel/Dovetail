/* The builder's model runs in a browser page. For these tests it gets the
   little of one it reads when it loads: the builder data, a document with no
   mount point, and React's createElement. Import this before any module. */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "assets/builder-data.js"), "utf8"), { window: win });
const store = new Map();
globalThis.window = Object.assign(globalThis.window || {}, {
  DovetailBuilderData: win.DovetailBuilderData,
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  matchMedia: () => ({ matches: false }),
});
globalThis.document = { getElementById: () => null, currentScript: null, createElement: () => ({}) };
globalThis.React = { createElement: () => null, useState: () => [], useEffect: () => {}, useRef: () => ({}), useCallback: (f) => f, useMemo: (f) => f(), Component: class {} };
if (!globalThis.location) globalThis.location = { hash: "", pathname: "/builder.html", search: "" };
