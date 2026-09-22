# Dovetail documentation site

A standalone static site for **Dovetail**, a white-label design system. No build tooling,
no framework, no dependencies: HTML, CSS, and one Node script that regenerates the pages.

The site is the design system. Every page is styled with Dovetail's own tokens, so a
broken token shows up as a broken page.

## What is here

```
index.html          Overview
foundations/        Colour, type, space, shape, size, elevation, motion, themes
components/         One page per component: live card, guidelines, props, source
showcase/           Family reference cards, playgrounds, templates, tools
guide/              README, theming, accessibility, contributing, token pipeline
tokens.html         Every token, with its value in each theme
downloads.html      How to take the system into a project

system/             The design system itself, at the paths it was authored with
previews/           The @dsCard preview documents, one per card
assets/             Site chrome: site.css, site.js, theme.js (Configure), specimens.js,
                    file-menu.js, graph.js (the node visualiser)
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
writes the pages listed above. Everything it writes is derived: edit the system, not
the output, then rebuild.

To read the site locally, serve the directory rather than opening the files directly, so
the previews can load the component bundle:

```bash
python3 -m http.server 8000
```

## Publishing

Pages has to be switched on once, in **Settings → Pages**. A workflow cannot do it for
you: the token Actions runs with is not allowed to create the Pages site, so the first
run fails with *Create Pages site failed: resource not accessible by integration* until
someone with repository admin makes the choice. There are two ways to make it.

**Source: GitHub Actions.** `.github/workflows/pages.yml` builds the site and deploys
the repository root on every push to `main` or the development branch, and fails the
build if the committed pages are out of date with `system/`, so what is deployed always
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

Each card also carries a files menu, the ellipsis, that opens the component's guide,
typed contract or source in a reader without leaving the index. It fetches the real file
from `system/`, at the path the system was authored with, so it cannot show something the
repository does not hold. The menu is drawn on `<body>` rather than inside the card,
because on a phone the card sits in a scroller that would clip it, and it follows its
button on scroll rather than closing, since a tap inside a scroller often scrolls a
little.

A card holds a link now rather than being one: a menu button cannot sit inside an anchor,
so the heading's link is stretched over the card and the button is raised above it.
Descriptions are clamped to three lines, so one long summary cannot make a card twice the
height of its neighbour. The whole thing is on the component's own page.

## Letting someone upload media

`Image`, `Video` and `Cover` take an optional `onFile`, and their placeholder becomes a
real drop target: drag a file onto it or click through to a picker, and it hands back the
browser's own `File`. None of the three reads it, stores it or sends it anywhere; a
template derives an object URL for a live preview and passes that back in as `src` once
it has one. This is the system's card on the request for upload, and it stops exactly
where a design system should: at the file, not at storage.

## Text over an image

`Cover` is the one component for a hero band, a lifestyle poster and a social caption
card, because the difference between the three is a ratio and an anchor, not a different
piece of markup. `align` anchors both the text block and the direction a gradient scrim
fades from; `scrim` chooses none, a directional gradient, or a flat, caption-bar solid.
Choosing `align="center"` turns a gradient scrim into a flat wash automatically, because a
caption in the middle of a photo needs the whole frame dimmed, not one edge of it. Its
`previews/Cover.html` card carries six specimens: a marketing hero, a centred lifestyle
poster, a social caption bar, a name-and-handle bar over a portrait, a badge with no scrim
at all, and the same upload-ready placeholder Image and Video use. Like both of those, the
placeholder and the caption preview together before a real photo exists, so a template
can see the words holding their weight before wiring the image in.

## Cards on a phone

Every card grid becomes one swipeable row per group, in the manner of a product page:
cards are equal height because the row is a flex line, the next card peeks past the edge
so the swipe is discoverable, and the row bleeds to the page edges so nothing looks
cropped by the gutter. Scroll snapping makes each swipe land on a card. It saves most of
the vertical space a stacked grid costs: 60 components in seven rows rather than 60
screens of scrolling.

## Chrome icons

The tiles on the overview, foundations, showcase and guide pages carry inline SVG icons
drawn on the same 24px grid the system documents: round caps, inherited colour, no fill.
They are the site's own chrome, not copies of a library's glyphs: Dovetail ships no icon
set, and the media lab is where you try real ones. They are stroked, so the icon controls
in the Configure sheet move them, and their weight follows whichever library is selected:
2px for Lucide, 1.5px for Heroicons.

## Sketch marks

`system/assets/icons/sketch/` is a second icon voice: six hand-drawn marks (sun, leaf,
spark, heart, wave, loop) built to the same rules as the interface set, 24×24, one
`currentColor` stroke, sized only from `--dt-size-icon-*`, so they sit in a sentence next
to a library glyph without a size mismatch. They are not interface icons and are never
swapped in through the library picker: a hand-drawn line in a toolbar reads as a mistake.
They exist for the moments a page is allowed to feel like a person drew it: an empty
state, a callout, a marketing accent. The `Sketch marks` foundation card compares one
against a library icon at every step of the scale.

## The Configure panel

Every page carries a floating toolbar in the corner. It flips the colour mode, and it
opens **Configure**, a sheet holding the decisions a brand actually makes, grouped the way
the system is. The toolbar hides itself while the sheet is open, since the sheet's own
close button already gets you back to it, and **Reset** lives in the sheet's own header,
where it is always in reach rather than buried at the bottom of one tab:

| Tab | Sets |
| --- | --- |
| Brand | Name and mark, accent ramp, ramp hues, monochrome, fill, texture |
| Shape | Radius roles, media radius, focus ring width |
| Type | Body family, display family, code family |
| Space | Whitespace, control density, base unit |
| Media | Photo, illustration, icon library, icon stroke, icon size, media blocks |
| View | Colour mode, context |
| Export | The theme as a file of token overrides, copyable or downloadable |

Changes apply live to the page, to the sidebar and chrome, and to every preview card on
it, then follow you to every other page.

**Type** is two families, not one. The system points every role at one sans face;
choosing a display family adds `--dt-font-family-display` and re-points the roles that
carry a page's voice, which are the three display sizes, the five heading sizes and the
eyebrow. Body, label and code stay where they are, because a display face set at 14px is
a legibility problem rather than a brand. Left on *Same as body* the panel writes nothing
and the page runs on one family, which is how the system ships. Twenty-two families are
on offer, grouped as sans, serif, display and code, and they come from the configurator
like every other preset.

The **base unit** is the one worth trying first: every dimension token is a multiple and
the number in each name is the multiplier, so moving the unit re-derives the whole scale
and the names stay true. **Whitespace** moves the three space axes and the page rhythm
together, landing every value on that same grid. **Icons** come from the media lab:
picking a library sets the stroke it is drawn at, and the stroke applies to every icon
already on the page and in the cards, since the system ships no icon set of its own.
**Name and mark** are the white-label test. Set both and the header, the breadcrumb and
the page title are someone else's, with nothing forked.

**Media blocks** has two states, not a range. Dovetail ships no photography, so its cards
reserve a box where a picture goes rather than drawing one; hiding them takes every image,
video and reserved box out of the page and the cards at once, which answers whether the
layout still works as words. There is no richer step because nothing in the repository
would fill it. Bring your own imagery in the media lab.

**Ramp hues** shift any of the seven named ramps, not only whichever one is chosen as the
accent: dragging green's swatch also retunes success, amber retunes warning, red retunes
danger, cyan retunes info. Each shift keeps the ramp's own lightness and chroma per step,
the same math the custom accent colour already uses, so contrast and the eleven steps hold
while only the hue moves toward the brand.

**Photo** and **illustration** are two separate uploads, held in this browser rather than
sent anywhere, because a reader often wants one without the other: a photo for the
marketing template's hero, an illustration for artwork that should read as drawn rather
than shot. Both are wired into the marketing template live, the same way a mark or an
accent already is: the template reads the same localStorage key across the same origin, so
a new upload reaches it through the browser's own `storage` event with no extra wiring in
the page. **Icon library** now includes a **Custom** option: pick it and a text field
appears for the script tag, package import, or CDN URL of your own icon set, carried into
the exported theme's iconography note in place of Lucide or Heroicons.

**Fill** sets `--dt-surface-brand`, a full-bleed role independent of the buttons: solid is
one step of the accent ramp, gradient sweeps two. **Texture** sets `--dt-surface-texture`
to a dot or line pattern built from two CSS gradients, in the border-strength colour, so
it never becomes a second colour decision. Both are read straight off the ramp, so
changing the accent moves them with everything else; neither is a range, because a section
either wants the brand's presence or it does not.

It works by writing one localStorage key, `dovetail-theme-config`, the key the system's
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
file, not a token, and it has no business in a theme stylesheet. The photo and
illustration uploads share a third key, `dovetail-docs-media`, each capped at 768KB, for
the same reason: content, not tokens.

`assets/configure-data.js` is generated from `system/theme-configurator.html` and
`previews/MediaLab.html`, so the panel offers exactly the configurator's presets and the
lab's icon libraries and can't drift from either. Two refinements over the configurator
card: the monochrome preset is carried into what gets saved and exported, where the card
only previews it, and the type control is split so a mono face sets
`--dt-font-family-mono` instead of the sans family.

What the panel deliberately does not take from the media lab is sample photography. Those
photos belong to the layouts the lab renders, and there is no honest way to push them into
a card that was authored with its own content, so the lab keeps them, and the sheet links
to it.

The **Export** field at the bottom of the sheet is the theme as a file of token
overrides. Paste it into `system/tokens/themes/theme-custom.css` and the theme ships with
the repository, needing no JavaScript. Nothing in the panel edits a file; it is a preview
held in one browser.

## Tokens on a component page

Each component page lists every custom property its source resolves, read out of the
`.jsx` at build time rather than out of the guide, so the list cannot fall behind the
code. Interpolated names are expanded: `--dt-button-height-${size}` stands for every
token that starts with it. Rows are ordered component tier first, then semantic, then
primitive, because that is the order to reach for them in, and each one links to its row
on the tokens page.

A token the source asks for that no tier declares is marked *not declared* rather than
left blank. There are ten of them across the system, among them
`--dt-motion-duration-fast` and `--dt-surface-hover`, and they silently resolve to
nothing today. Surfacing them is the point of reading the source rather than the guide.

## Contexts

Three now, not two: product, marketing and **social**. A context is a fourth axis beside
brand theme, colour mode and density, and it retunes scale and rhythm rather than colour.
Social is a feed read on a phone with one thumb, so the furniture recedes (a post is a
borderless, unshadowed Card separated by space), the body runs at 16px because the text is
what someone came for, targets are thumb-sized, and actions take the pill shape the
convention expects. It is the one context that moves a shape role, and
`system/tokens/contexts/context-social.css` says why in the file.

Two things fell out of adding it. The context columns on the tokens page were empty:
`tokens.json` carries light and dark but not one context value, so Product and Marketing
had been three hundred dashes. The values live in the stylesheets the browser loads, so
they are read from there and merged in at build time, and each family now shows only the
columns that say something in it. And switching context did not reach inside a preview
card: each card inlines its own copy of the system CSS, where the context rules sit
*before* the `:root` they override and a class beats `:root` only on source order. All
three context stylesheets are now linked in at the end of each card's head, so a context
change moves the card as well as the page around it.

## Copying code

Every code block carries a copy button, added by `assets/site.js` rather than emitted into
the markup: the generator writes a `<pre>` in three places, the file viewer writes a
fourth at runtime, and a button that does nothing without JavaScript has no business in
the HTML. The async clipboard needs a secure context, which a site opened from a file or
served over plain HTTP on a LAN is not, so the old selection trick is the fallback rather
than a failure.

## The node graph

The tier rule is a claim about direction, so the site draws the graph the claim
describes. Every row on the tokens page and in a component's token table carries a
button, and both pages carry one at the top. It opens a dialog with the selected node in
the middle, what it resolves through on the left, and what consumes it on the right.
Click any node to walk to it.

Right is the direction worth walking. Starting from `--dt-font-family-sans` you can see
the eighteen roles that carry it and, in the footer, that it reaches 42 components that
never name a font. Starting from a component and walking left gives the chain the rule
promises: `Button` to `--dt-button-border-width` to `--dt-border-width-default` to
`--dt-dim-hair`, component to semantic to primitive, nothing skipped.

Nodes are coloured on their left edge by tier and say it in words underneath, along with
how many things consume them. A token declared by no tier is marked in red, because a
dead end is the thing worth seeing.

`assets/graph-data.js` holds 596 nodes and 1,343 edges, generated from `system/tokens/`
and the component sources. At 96KB it is the largest file the site produces, so it is
fetched the first time someone opens the visualiser and never on an ordinary page load.
Edges between tokens come from the `var()` references in their declared values; edges
from a component come from the same source scan the token table uses.

The wires are orthogonal rather than curved. Forty edges leaving one node span the whole
column vertically and only a gutter horizontally, which turns beziers into a vertical
smear; a bus with square corners stays readable at any fan-out. On a phone the three
columns stack and the wires are dropped, since the headings already say which side you
are reading.

## The menu on a phone

The navigation drawer covers the page instead of pushing it down. It is fixed below the
header, fills the rest of the viewport, and locks the page behind it so a scroll does not
run underneath. The header stays visible and on top, which keeps the way out in the same
place as the way in. Escape closes it, and widening the window past 900px drops the open
state along with the drawer.

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
`system/_ds_bundle.js`, a copy of `system/components/bundle.js` under the name the
bundle was authored with, which is what the settings-page template and the authored
`.card.html` documents ask for.

Each card watches `data-theme` on its own `<html>`, which is how the theme controls in
the site header reach inside the frames: the cards are same-origin, so the page sets
the attribute directly.

Two cards reach outside the site for third-party scripts: the media lab loads icon
libraries from a CDN, and the settings-page template loads React from unpkg. Both are
authored that way and both need network access to render fully.

## The footer

One line, set as the comment it is. The delimiters are dimmer than the words and hidden
from assistive technology, which would otherwise spell them out.

## Templates, and the name UI kits

Templates and UI kits were two showcase groups, which was a distinction without a
difference: both are whole screens assembled from the system. They are one group now,
Templates. The name **UI kits** is held back for what it usually means, a kit for one
surface or vertical such as a voice-only interface, and nothing in the repository is that
yet. The cards keep their authored group in `previews/`; the generator aliases it, so
nothing in the artifact content had to be rewritten to make the change.

## Provenance

The contents of `previews/` come from the Dovetail DS design system artifact, unchanged
apart from the three script tags described above. `system/` came from the same place and
has been edited since: phase 4 added `Combobox`, `BlockRenderer` and `integrations/`, the
configurator carries fourteen more font presets, and the guides have had a copy pass. The
card documents in `previews/` keep their own voice, including the `Name — description`
form their subtitles use. `system/assets/notes/`
carries the original authoring rules and the migration report that came with it.
