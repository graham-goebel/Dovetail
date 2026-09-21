# Dovetail — documentation site

A standalone static site for **Dovetail**, a white-label design system. No build tooling,
no framework, no dependencies: HTML, CSS, and one Node script that regenerates the pages.

The site is the design system. Every page is styled with Dovetail's own tokens, so a
broken token shows up as a broken page.

## What is here

```
index.html          Overview
foundations/        Colour, type, space, shape, size, elevation, motion, themes
components/         One page per component: live card, guidelines, props, source
showcase/           Family reference cards, playgrounds, UI kits, templates, tools
guide/              README, theming, accessibility, contributing, token pipeline
tokens.html         Every token, with its value in each theme
downloads.html      How to take the system into a project

system/             The design system itself, at the paths it was authored with
previews/           The @dsCard preview documents, one per card
assets/             Site chrome: site.css, site.js
tools/build-site.mjs   The generator
```

`system/` is served as part of the site, so the stylesheets, tokens, component sources
and typed contracts are all fetchable at stable URLs:

```html
<link rel="stylesheet" href="system/styles.css">
<link rel="stylesheet" href="system/tokens/themes/theme-editorial.css">
```

Dark mode needs no second stylesheet. Put `class="dark"` on `<html>`.

## Building

```bash
node tools/build-site.mjs
```

Node 18 or newer, nothing to install. The script reads `system/` and `previews/` and
writes the pages listed above. Everything it writes is derived — edit the system, not
the output, then rebuild.

To read the site locally, serve the directory rather than opening the files directly, so
the previews can load the component bundle:

```bash
python3 -m http.server 8000
```

## Publishing

Pages has to be switched on once, in **Settings → Pages**. A workflow cannot do it for
you: the token Actions runs with is not allowed to create the Pages site, so the first
run fails with *Create Pages site failed — resource not accessible by integration* until
someone with repository admin makes the choice. There are two ways to make it.

**Source: GitHub Actions.** `.github/workflows/pages.yml` builds the site and deploys
the repository root on every push to `main` or the development branch, and fails the
build if the committed pages are out of date with `system/` — so what is deployed always
matches what is in the repository. Pick this one, then re-run the workflow.

**Source: Deploy from a branch**, with the branch set and the folder set to `/ (root)`.
The whole site is committed, so this publishes with no build and no Actions run at all.
The trade-off is that nothing then checks the pages against `system/` after an edit.

Either way the site lands at `https://<owner>.github.io/<repo>/`.

`.nojekyll` is committed because the system has paths that begin with an underscore, and
Jekyll would drop them.

## How the previews work

Each card in `previews/` is a complete HTML document with the system's CSS inlined. Three
script tags were added to every one of them so it runs on its own:

```html
<script src="../system/components/lib/react.production.min.js"></script>
<script src="../system/components/lib/react-dom.production.min.js"></script>
<script src="../system/components/bundle.js"></script>
```

The generator adds those on first build and leaves them alone afterwards. It also
re-points the handful of resources a card loads by project-relative path, and writes
`system/_ds_bundle.js` — a copy of `system/components/bundle.js` under the name the
bundle was authored with, which is what the settings-page template and the authored
`.card.html` documents ask for.

Each card watches `data-theme` on its own `<html>`, which is how the theme controls in
the site header reach inside the frames — the cards are same-origin, so the page sets
the attribute directly.

Two cards reach outside the site for third-party scripts: the media lab loads icon
libraries from a CDN, and the settings-page template loads React from unpkg. Both are
authored that way and both need network access to render fully.

## Provenance

The contents of `system/` and `previews/` come from the Dovetail DS design system
artifact, unchanged apart from the three script tags described above. `system/assets/notes/`
carries the original authoring rules and the migration report that came with it.
