/* The canvas icons the builder uses. tools/build-builder.mjs fills this in
   when it bundles, from canvas/ and use.json (see tools/canvas-icons.mjs).
   As it stands, it keeps the modules loadable on their own, as the unit
   tests load them, and every icon falls back to its path in ui/icons.js. */
export var CI_USE = {};
export var CI_MARKUP = {};
export var CI_CSS = "";
