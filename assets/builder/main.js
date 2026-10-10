/* The builder: a canvas to arrange Dovetail components and blocks into new
   screens, with an inspector that offers only tokens.

   This page owns the document, the selection, the history and every control.
   The canvas is an open surface that pans and zooms, with every frame laid
   out side by side. Each frame is a page of its own (assets/builder-frame.html),
   so a phone frame is really 390px wide; it renders its tree with the real
   components, answers geometry questions through window.BuilderFrame, and
   reports presses, drags, picks, gestures and double-clicks back through
   window.BuilderHost, bound to that frame. The frames share the docs site's
   origin, so the Configure panel's theme reaches them; this page's own chrome
   stays fixed (data-theme-fixed) so the tools look the same whatever is tried;
   it is dark unless this browser's Dark mode switch says otherwise.

   What the builder may place, each component's props (read from its .d.ts),
   the frame sizes and the token options with the declarations each sets come
   from assets/builder-data.js, which the site build writes and checks: a token
   that doesn't exist fails the build.

   The document: { frames, active }. A frame is { id, name, width, height,
   hug, dark, surface, spacing, gap, mode, root } and maybe canvas, lock, x, y
   and bare. mode is "free" (place anything anywhere, custom colours) or
   "structured" (everything sits in Groups, tokens only); x and y put a frame
   anywhere on the canvas; a bare frame is a loose object with no page around
   it. root is { id: "root", type:
   "Root", children } and each node is { id, type, name?, props, style,
   children? }. props holds only what the reader changed, as plain strings,
   numbers and booleans (plus an uploaded image as a data URL); style holds
   token option names. Nothing else survives a save, a share link or an import
   (see clean()), so a link can't smuggle a value or a handler in. */

import { mountEl, e } from "./config.js";
import { App } from "./app/App.js";
import { installTips } from "./ui/tips.js";
import { openStore } from "./model/store.js";
import { openStart } from "./model/share.js";
import { createMirrorHub, watchStore } from "./cloud/mirror.js";

/* The store opens first (IndexedDB is asynchronous), then the project to
   show; the page says it's loading until then. The mirror watches the
   store from the start, and begins sending once someone signs in. */
if (mountEl && window.DovetailBuilderData && window.React && window.ReactDOM) {
  installTips();
  openStore().then(function (local) {
    var mirror = createMirrorHub();
    var store = watchStore(local, mirror);
    return openStart(store).then(function (init) {
      mountEl.textContent = "";
      ReactDOM.createRoot(mountEl).render(e(App, { init: init, store: store, mirror: mirror }));
    });
  }).catch(function (err) {
    mountEl.textContent = "The builder couldn't open: " + (err && err.message ? err.message : err) + ". Reload to try again.";
  });
}
