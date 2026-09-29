---
type: added
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The package is ready to publish as `@dovetail-ds/react`, still private until the first release. `@dovetail-ds/react/styles.css` is `system/styles.css` with every local `@import` inlined (one external Google Fonts `@import` for Geist stays at the top), `@dovetail-ds/react/tokens/*` maps onto the token build's `dist/tokens/`, and `package.json` gains `license` (MIT, with a `LICENSE` file), `repository`, `homepage`, `keywords`, `browserslist` (Safari 16.4, Chrome 111, Firefox 113: the CSS uses `oklch()` and `color-mix()`) and `publishConfig`. `tools/check/consumer.mjs` packs the tarball, installs it into a clean project and renders, resolves and type-checks from there, and the Release workflow publishes to npm with provenance after it tags a release, when the package is not private.
