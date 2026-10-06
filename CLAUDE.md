# Dovetail: notes for Claude

Dovetail is a white-label design system (`system/`) with a static documentation site generated from it (GitHub Pages). Several people work here at once, each with their own Claude sessions. Read CONTRIBUTING.md for the full workflow; these are the rules to hold every session to.

## Before you change anything

- Work on your own branch, never directly on `main`, and never on a branch another session is using.
- Keep one topic per branch and per pull request.
- Merge `origin/main` into your branch rather than rebasing shared history.

## Build and check

```sh
npm ci                 # once per checkout
npm run build          # tools/build-bundle.mjs, tools/build-builder.mjs, then tools/build-site.mjs
npm run check:fast     # the quick checks, about fifteen seconds; run it often
npm run check          # all of them, must pass before you push
```

- Never hand-edit generated files:
  - the site pages: `index.html`, `components/`, `foundations/`, `showcase/`, `guide/`, `tokens.html`, `downloads.html`, `builder.html`;
  - `system/components/bundle.js` and `system/_ds_bundle.js`;
  - `assets/builder.js`, bundled from the modules in `assets/builder/` (edit those);
  - `system/templates/_support/card-kit.js`;
  - `assets/configure-data.js`, `assets/graph-data.js`, `assets/search-data.js`, `assets/builder-data.js`, `assets/builder-layouts.md` and `llms.txt`;
  - the style block and app script of `previews/MarketingKit.html` and `previews/DashboardKit.html`. Edit `system/kits/` instead.
- For a merge conflict in a generated file, take either side, run `npm run build` and commit.
- Commit sources and rebuilt output together.
- Browser checks need Chromium. If Playwright's download isn't available, set `CHROMIUM_PATH` to an installed binary.

## Changelog

Any change a consumer of `system/` would notice needs an entry in `changes/` (`npm run change -- <slug>`). The rules are in docs/changelog.md:

- **major:** a renamed or removed token, component, prop or prop value; a changed token meaning; a changed default. Needs a `## Migration` section.
- **minor:** a new component, prop, token or option, a deprecation, or a deliberate visual refresh.
- **patch:** fixes.
- **none:** tooling or refactors nobody sees.

Mark `visual: true` when something looks different without code changes. Write the summary for the people using the system, in present tense, naming the exact API.

A release is a pull request titled `Release x.y.z` carrying only the output of `node tools/changelog.mjs --release`. Never push tags. The Release workflow tags and publishes once that pull request merges into `main`.

## System rules

- **Three token tiers.** Primitive holds raw values. Semantic roles are the only thing that may reference primitives. Component tokens alias semantic roles. Components never read primitives.
- **Scoped dark.** Custom properties resolve where declared, so every colour alias that must follow `.dark` is repeated under `.dark` in its own file. Test inside a dark `Section` band, not only with the whole page dark.
- **A component** has `Name.jsx` (a named export, React only, styles inline from tokens), `Name.d.ts` (JSDoc on every prop) and `Name.md` (when to use, examples, tokens, accessibility). It also needs a card in `previews/`, an entry in `system/manifest.json` and a specimen in `assets/specimens.js`. See system/guidelines/contributing.md.
- **Cards** load shared code by `<script src>` / `<link>`, never inline copies: `../system/styles.css`, `../system/templates/_support/card-theme-sync.js`, `card-kit.js` and `card-kit.css`. Edit the kit in `card-kit.jsx`.
- Every change must work at 390px wide and in dark mode, and respect `prefers-reduced-motion`.

## Writing

- Never name other software in the repo or in pull requests: code, comments, docs, changelog entries, check titles, PR text. Describe what the thing does, not which product it copies.

## Pull requests

- Fill in the template: what changed, the bump, and how you verified it.
- Report checks honestly. If something was skipped, say so.
- Don't merge your own pull request. A code owner reviews it.
