---
type: added
bump: minor
area: tooling
components: []
tokens: []
visual: false
---
The `dovetail-setup` skill can open a screen in the Dovetail builder. Its new `scripts/builder-link.mjs` turns a layout written as builder JSON into a link that opens it on the builder's canvas, as layers to keep editing. It flags style values that aren't token names. The skill reads the generated format at `assets/builder-layouts.md` on the docs site, and offers a builder link alongside the code when it designs a Dovetail screen.
