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
assets/             Site chrome: site.css, site.js, theme.js (bases), specimens.js
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

## Live specimens

The component index renders each component into its own card, from the same bundle the
preview cards use, so a card cannot show something the component no longer does. One
React root per card is heavier than a static list and much lighter than 56 iframes, which
is the only other way to show the real thing. `assets/specimens.js` holds one entry per
component: the smallest honest use of it, with real props and real content.

Four cards carry a line of text instead. Dialog, Drawer and ToastRegion mount fixed to
the viewport, so a specimen would cover the page rather than sit in a card, and
VisuallyHidden renders nothing by design.

## Chrome icons

The tiles on the overview, foundations, showcase and guide pages carry inline SVG icons
drawn on the same 24px grid the system documents — round caps, inherited colour, no fill.
They are the site's own chrome, not copies of a library's glyphs: Dovetail ships no icon
set, and the media lab is where you try real ones. They are stroked, so the icon controls
in the bases sheet move them, and their weight follows whichever library is selected —
2px for Lucide, 1.5px for Heroicons.

## The bases panel

Every page carries a floating toolbar in the corner. It flips the colour mode, and it
opens **Bases** — a sheet holding the decisions a brand actually makes, grouped the way
the system is:

| Tab | Sets |
| --- | --- |
| Brand | Name and mark, accent ramp, monochrome |
| Shape | Radius roles, media radius, focus ring width |
| Type | Interface family, code family |
| Space | Whitespace, control density, base unit |
| Media | Icon library, icon stroke, icon size, media blocks |
| View | Colour mode, context |
| Export | The theme as a file of token overrides |

The theme preset sits above the tabs, because it sets several of them at once.

Changes apply live to the page, to the sidebar and chrome, and to every preview card on
it, then follow you to every other page.

The **base unit** is the one worth trying first: every dimension token is a multiple and
the number in each name is the multiplier, so moving the unit re-derives the whole scale
and the names stay true. **Whitespace** moves the three space axes and the page rhythm
together, landing every value on that same grid. **Icons** come from the media lab:
picking a library sets the stroke it is drawn at, and the stroke applies to every icon
already on the page and in the cards, since the system ships no icon set of its own.
**Name and mark** are the white-label test — set both and the header, the breadcrumb and
the page title are someone else's, with nothing forked.

**Media blocks** has two states, not a range. Dovetail ships no photography, so its cards
reserve a box where a picture goes rather than drawing one; hiding them takes every image,
video and reserved box out of the page and the cards at once, which answers whether the
layout still works as words. There is no richer step because nothing in the repository
would fill it. Bring your own imagery in the media lab.

It works by writing one localStorage key, `dovetail-theme-config` — the key the system's
own `templates/_support/theme-runtime.js` already reads. Using that key rather than a
site-only one is what makes a change reach the whole system, including the tearsheet, the
settings-page template, and the theme configurator card in the showcase, which writes the
same payload when you press Save there. Set an accent in the configurator card and the
site follows; set it in the sheet and the configurator agrees.

The sheet never dims or blocks the page, because watching the system change is the point
of the control. On a wide screen it floats over the page as frosted glass, so what is
behind it stays readable through the blur; where `backdrop-filter` is unsupported the
surface goes solid, since unreadable chrome is worse than flat chrome. On a narrow screen
it docks to the bottom at a little over half the height and the page gains matching
padding, so anything on it can be scrolled into the space above and watched while the
controls move.

The mark is held in a second key, `dovetail-docs-brand`, and capped at 512KB: it is a
file, not a token, and it has no business in a theme stylesheet.

`assets/bases-data.js` is generated from `system/theme-configurator.html` and
`previews/MediaLab.html`, so the panel offers exactly the configurator's presets and the
lab's icon libraries and can't drift from either. Two refinements over the configurator
card: the monochrome preset is carried into what gets saved and exported, where the card
only previews it, and the type control is split so a mono face sets
`--dt-font-family-mono` instead of the sans family.

What the panel deliberately does not take from the media lab is sample photography. Those
photos belong to the layouts the lab renders, and there is no honest way to push them into
a card that was authored with its own content — so the lab keeps them, and the sheet links
to it.

The **Export** field at the bottom of the sheet is the theme as a file of token
overrides. Paste it into `system/tokens/themes/theme-custom.css` and the theme ships with
the repository, needing no JavaScript. Nothing in the panel edits a file; it is a preview
held in one browser.

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
