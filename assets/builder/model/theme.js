/* A project's theme as the theme.css its downloaded code carries. The
   stylesheet is Configure's own: assets/theme.js cleans the saved theme and
   writes the same file its "Download theme.css" gives, a :root block of
   overrides and, where a choice must follow a dark band, the same roles
   again under .dark. Nothing here works out a token.

   theme.js is a page script, not a module, so it isn't bundled in: on the
   builder page it hands the function over as DovetailConfigurePanel.themeCss.
   The package's headless core (dist/configure/core.js, and theme.js loaded
   with DovetailThemeHeadless) carries the same function, which is how the
   unit test passes one in. */

/* theme: the project's meta.theme ({ config, brand, media, context }).
   No theme gives "": the project has made no choices, and the system's own
   stylesheet already holds its defaults. A theme object, even an empty one,
   gives the whole file, cleaned the way loading it would clean it. core is
   for a caller with no page; it defaults to the Configure panel's. */
function themeCss(theme, core) {
  if (!theme || typeof theme !== "object") return "";
  var source = core || (typeof window !== "undefined" ? window.DovetailConfigurePanel : null);
  if (!source || typeof source.themeCss !== "function") throw new Error("theme: Configure (assets/theme.js) has not loaded, so there is no stylesheet to write");
  return source.themeCss(theme);
}

export { themeCss };
