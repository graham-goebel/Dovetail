---
type: changed
bump: none
area: tooling
components: []
tokens: []
visual: false
---
The builder is rebuilt on new foundations, with no change to how it looks or works.

- Its code lives in modules under `assets/builder/`: `model/` (the document, cleaning and paste), `ui/` (controls) and `app/` (the app). `tools/build-builder.mjs` bundles them with esbuild into `assets/builder.js`, which is now a generated file, and `npm run check:build` fails if it's stale.
- Edits go through immer. A new document shares everything an edit didn't touch, so an edit no longer deep-copies the whole layout, and undo keeps up to 200 steps that each cost only what changed. Documents are frozen, so a stray write fails loudly instead of rewriting history.
- `npm run check:unit` runs fast unit tests on the model: building nodes, tree operations, cleaning, links, and pasted JSON and JSX. CI runs them too.
- Pasted JSX with a `//` comment just before the markup now reads correctly.
