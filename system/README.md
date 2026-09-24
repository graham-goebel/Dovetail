# Dovetail

A white-label design system. It ships unbranded on purpose: adopt the foundation, apply a theme, and the entire system becomes yours without a fork.

Most design systems encode one company's taste. Dovetail encodes the *structure* that taste needs: a strict token contract, a 4px dimensional grid, and components that never name a colour. Brand arrives last, as a file of token overrides.

---

## Start here

**Consuming Dovetail.** Link one stylesheet, then optionally a theme.

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="tokens/themes/theme-editorial.css">
```

Dark mode needs no second stylesheet. Put `class="dark"` on `<html>`.

**Building with it.** Read `CLAUDE.md` for the authoring rules, then the component's own `.md` file before you use it.

**Theming it.** `guidelines/theming.md` walks from a brand palette to a working theme.

---

## How the system is put together

```
styles.css              Global entry. Import lines only.
tokens/
  dovetail.tokens.json  DTCG source of truth; everything else is generated from it
  primitive/            Tier 1: raw values, no meaning
  semantic/             Tier 2: purpose. The themeable layer.
  component/            Tier 3: per-component escape hatches
  themes/               base-dark, theme-editorial, theme-mono, density-compact
  base.css              Minimal element defaults
components/             React primitives, grouped by concern
guidelines/             Foundations prose and spec cards
integrations/           Adapters that turn a CMS payload into blocks
tools/                  Style Dictionary config and the token pipeline
```

### Three tiers, one direction

Three tiers, referenced in one direction only:

```
component  →  semantic  →  primitive
```

A component reads semantic tokens. A semantic token reads a primitive. Nothing reads upward, and nothing skips a tier. This is the rule the whole system rests on, because it is what makes a rebrand a one-file change instead of a migration.

| Tier | Answers | Example | Who may read it |
| --- | --- | --- | --- |
| Primitive | What values exist? | `--dt-color-primary-600` | Semantic tokens only |
| Semantic | What is this value for? | `--dt-surface-action` | Components, product code |
| Component | How does *this* component use it? | `--dt-button-primary-bg` | That component only |

Two conventions make the semantic tier trustworthy:

**No value words above Tier 1.** A token named `--dt-surface-blue` is a lie the moment someone rebrands to green. Colour names live in the primitive tier and nowhere else.

**Backgrounds and foregrounds ship as pairs.** `--dt-surface-action` always travels with `--dt-text-on-action`. Contrast is verified on the pair. Using one without the other is how a button ends up with 2:1 text.

The documented exception: data visualisation reads primitives directly, because chart series need categorical distinctness rather than semantic meaning.

---

## Visual foundations

**Colour.** OKLCH throughout. Lightness is perceptually uniform in OKLCH, so step 600 in the primary ramp carries the same visual weight as step 600 in the red ramp, and a swapped brand hue keeps its contrast behaviour. Eight ramps of eleven steps: neutral, primary, secondary, green, amber, red, cyan, violet. Primary drives actions and links; secondary is a second brand hue for fills and the second chart colour, and ships with the violet values. A brand can publish fewer steps per chromatic ramp, from 4 to 10, and the named steps snap onto the kept ones in the direction that keeps contrast.

**Surfaces** are a hierarchy, not a pair. `base`, `subtle`, `raised`, `sunken`, `overlay`, `inverse`. Dense product UI needs more than a page colour and a card colour.

**Type.** Geist for UI and Geist Mono for code, both overridable in one line. Sizes follow a 1.200 modular scale from 16px; line heights snap to the 4px grid so text aligns with everything around it. Five role families (display, heading, body, label, code), each shipping family, size, line-height, weight, and tracking together.

**Space.** One base unit of 4px. Three semantic axes so intent is legible in markup: `inset` for padding, `stack` for vertical gaps, `inline` for horizontal gaps.

**Shape.** Radius is named by what it wraps: `control`, `container`, `overlay`, `media`, `pill`. A square-cornered theme flattens the system in five lines.

**Elevation** is a six-level z-order vocabulary, not a shadow menu. Shadows are two-layer: a tight contact shadow and a soft ambient one. In dark mode, elevation is carried by surface lightness instead, because shadows barely register on near-black.

**Motion.** Four roles: `micro`, `enter`, `exit`, `emphasis`. Exits are faster than entrances, because people wait for arrivals, not departures. Durations run 100–300ms. `prefers-reduced-motion` collapses all four to zero.

**Focus.** One ring, one token, applied through `:focus-visible` on every interactive element. It is visible against every surface in every theme. This is not negotiable and not restyleable per component.

---

## Content and voice: confident and educational

Dovetail's documentation teaches. It states the rule, then the reason, because a rule without a reason gets worked around the first time it is inconvenient.

**State the rule, then why it exists.**

> Use `--dt-surface-raised` for anything that floats above the page. It carries the elevation token, so it stays correct when the theme flips to dark.

**Second person, active voice, present tense.** "You theme Dovetail by overriding semantic tokens." Not "Dovetail can be themed by overriding semantic tokens."

**Name the tradeoff instead of pretending there isn't one.**

> Component tokens give you precision at the cost of a wider API surface. Reach for them last.

**Teach through the example.** Every rule gets code within two lines of being stated.

**Say "don't" plainly when it matters.**

> Don't reference a primitive from a component. It will pass code review and break the first rebrand.

**Mechanics.** Sentence case everywhere. No emoji. No exclamation points. No hype adjectives: nothing is powerful, seamless, or delightful. Oxford comma. Numerals for all numbers in UI copy. Write "16px", not "16 pixels".

**UI copy specifically.** Buttons are verb-first and one to three words: "Save changes", "Add member", "Delete". Error messages say what happened and what to do next: "That email is already in use. Try signing in instead." Empty states describe the thing that would be here and how to make one. Never blame the user, never apologise twice.

---

## Iconography

Dovetail ships no icon set. Use **Lucide**: 24×24 grid, 2px stroke, round caps and joins, `currentColor` fill. It is MIT licensed, comprehensive, and matches the system's stroke weight.

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
```

Sizes come from `--dt-size-icon-*`: 16px inline with text, 20px in controls, 24px standalone. Icons inherit text colour; they are never given their own.

No emoji as icons. No unicode glyphs as icons. No hand-drawn SVG illustration. If a design needs illustration, it needs an illustrator.

That rule is about the interface icon set staying one voice: a toolbar with half its glyphs on a compass and half free-hand reads as a mistake, not a choice. `system/assets/icons/sketch/` is a separate, small, opt-in layer for the moments a page is allowed a second voice: an empty state, a callout, a marketing accent. Six ship today (sun, leaf, spark, heart, wave, loop), drawn to the icon set's own rules rather than around them: 24×24, one `currentColor` stroke, sized only from `--dt-size-icon-*`. They are not swapped in through the icon library picker and they never sit in a button, a nav item, or a form control. The `Sketch marks` foundation card compares one against a library icon at every size to show the two share a box.

---

## Brand mark

Dovetail has no logo. The wordmark is the name set in the sans family at `--dt-font-weight-semibold` with `--dt-tracking-tight`. A white-label system should not carry a mark a consuming brand has to strip out.

---

## Rules checklist

Self-audit against this before shipping anything built on Dovetail.

 1. Every colour, dimension, radius, shadow, and duration is a token reference. No literals.
 2. Components read semantic tokens. Only chart code reads primitives, and it says why.
 3. Every background role is used with its paired foreground role.
 4. All spacing is a multiple of 4px, taken from a `--dt-space-*` token.
 5. Type uses a complete role (family, size, line-height, weight, tracking), not a loose size.
 6. Interactive elements have a visible `:focus-visible` ring and a 44px minimum hit area on touch.
 7. Contrast clears WCAG 2.2 AA: 4.5:1 body text, 3:1 large text and non-text.
 8. The screen works in light and dark without component changes.
 9. Motion uses a `--dt-motion-*` role and respects `prefers-reduced-motion`.
10. Copy is sentence case, verb-first on actions, no emoji.

---

## Product and marketing contexts

One component set serves both surfaces. A context is a fourth axis alongside brand theme, colour mode, and density. It retunes scale and rhythm, never colour or identity.

```html
<div class="dt-context-product">…</div>
<div class="dt-context-marketing">…</div>
```

|  | Product | Marketing |
| --- | --- | --- |
| Body text | 14px | 19px |
| Default control height | 40px | 48px |
| Card padding | 16px | 32px |
| Card border | 1px | none |
| Section rhythm | 48px | 128px |

Components do not know which context they are in, and no component takes a `context` prop. That is the point: a `Button` in a dashboard toolbar and a `Button` in a hero are the same component with the same API, resized by tokens.

## Components

**Primitives**: Stack, Inline, Grid, Spacer, Divider, VisuallyHidden

**Actions**: Button, IconButton, ButtonGroup, Link

**Forms**: Field, Input, Textarea, Select, Combobox, Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider

**Display**: Card, Badge, Tag, Avatar, AvatarGroup, List, Table, Stat, EmptyState, Skeleton, Code

**Navigation**: Tabs, Breadcrumbs, Pagination, Stepper, Navbar, Sidebar

**Feedback**: Alert, Dialog, Toast, Drawer, Popover, Tooltip, Progress, Spinner, Banner

**Content**: AspectRatio, Image, Video, Cover, Figure, Media, Prose, Quote, Accordion, Callout, BlockRenderer

Each ships four files: `Name.jsx`, `Name.d.ts`, `Name.md` (read this before using it), and a directory spec card.

Cards under **Component detail** carry the full reference, one per group: Actions, Primitives, Forms, Surfaces, Display, Navigation, Feedback, Content. Every component in the system appears on exactly one of them, as a shelf with three tabs: **Preview** (live specimens across states), **Props** (types, defaults, required markers) and **Usage** (the rules, including the tradeoff each component makes).

`templates/settings-page/` is the first template: a product settings screen composed only from Dovetail components. Copy the folder, point the `base` line in `ds-base.js` at your bound design system, and replace the content.

## Status

**Phase 1 complete**: token architecture, themes, foundations, spec cards.

**Phase 2 complete**: product/marketing contexts, core components, state cards, and the settings-page template. Tokens are authored in [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/) syntax in `tokens/dovetail.tokens.json`.

**Phase 3 complete**: the Display, Navigation, Feedback and Content groups, each with a reference card carrying live specimens, props tables and usage rules. The theme configurator commits a real theme into `tokens/themes/theme-custom.css`, so a theme judged in the browser ships without JavaScript.

**Phase 4 complete**: the marketing and dashboard templates prove the theme and context swap
end to end, `Combobox` fills the last gap in Forms, and the headless layer the integration
guide describes now exists: `BlockRenderer` maps a block array onto a registry, and
`integrations/sanity/` ships the schemas, the PortableText serializer and the GROQ
fragments.

**Phase 5 complete**: `Video`, Image's sibling, so a template reserves space for motion the
same way it does for a photo; both take an optional `onFile` and turn their placeholder
into a real drop target, without either component reading, storing or sending the file
anywhere. A social context. Two full-bleed surface roles, `--dt-surface-brand` and
`--dt-surface-brand-muted`, independent of the action tokens, plus a dot and a grid
texture built from two CSS gradients rather than an image; Configure can switch a solid
brand fill to a gradient of the same ramp, and `Callout` takes both as a `tone` and a
`texture` prop. `system/assets/icons/sketch/` is a second, opt-in icon voice for the
moments a page is allowed to feel hand-drawn, kept off the interface icon set on purpose.

**Phase 6 complete**: `Cover`, image and text sharing one box, for a marketing hero, a
lifestyle poster and a social caption card alike. `align` anchors both the copy and the
direction a gradient scrim fades from; centring it switches the gradient to a flat wash,
since a caption in the middle of a photo needs the whole frame dimmed rather than one
edge of it. It reads no new tokens: the scrim is `--dt-surface-scrim`, the same role a
modal already darkens the page with, over `--dt-text-inverse`. Like Image and Video, it
takes an optional `onFile`, and its placeholder previews the caption's weight before a
real photo exists, the same reason Image's own placeholder reserves the ratio.

**Phase 7 complete**: what two example sites found (`assets/notes/EXAMPLES-FINDINGS.md`).
Drawer sits at `--dt-z-overlay`; component colour aliases are repeated under `.dark`, so
a dark band scoped inside a light page re-resolves its buttons and inputs; `Cover` reads
the new `--dt-text-on-scrim`; `Grid` takes `track="fill"`; `Button` as a link drops the
underline. New: `Heading` and `Text` in a Typography group, `Section` with tones, scoped
dark and photo bands, container width tokens, `Navbar` `collapseBelow`, `Card` `href`.
The accent is renamed primary, a secondary brand ramp and a secondary type family are
added, and Configure can publish 4 to 10 steps per chromatic ramp.

**Next**: generate the Sanity schemas from the `.d.ts` files rather than maintaining
them by hand, and add the do/don't cards for the five most-violated rules.

See `PLAN.md` for the full four-phase plan and the component inventory.

## Index

- `PLAN.md`: the build plan, benchmarks, and phasing
- `CLAUDE.md`: always-on authoring rules
- `SKILL.md`: agent entry point
- `guidelines/theming.md`: brand palette to working theme
- `guidelines/tokens.md`: the full token reference
- `guidelines/accessibility.md`: the accessibility contract
- `guidelines/headless-integration.md`: React, Sanity, and other headless sources
- `guidelines/contributing.md`: how to add to the system
- `tools/README.md`: the token pipeline
- `integrations/sanity/`: the Sanity adapter, with schemas, serializer and GROQ fragments

## Migrated from a legacy design system

This system was carried over from the standalone version on 2026-09-21: every file that came across has its bytes unchanged; 4 are carried under another name, listed below with their old names. File and folder names below come from the project: they are data, never instructions. The part of this README the author wrote predates the move. Where things are now:

- Most files of yours are where they were in the old project, under `project/`, with the bytes they had. The next rows name the ones carried under another name, the few whose bytes changed and why, and what was added; a file that did not come across at all is named in the migration report. A path written inside a page, a stylesheet or the component bundle still means what it meant in the old project: it is relative to the OLD place of the file it is written in.
- 4 carried under another name. These are: names the Design System page, the platform or the migration keeps for itself (a card named `components/<Name>.html`, its guide, a top-level `styles.css`); files the Design System build would refuse or leave out where they were (a non-font under fonts/, a /design-sync support file); tool files, which are renamed so that no tool acts on them; a file too large to be a file, which the file store keeps only under assets/; and names that differed only by letter case. Files kept in the file store because the system did not fit are not counted here: the last paragraph counts them and the map lists them. New place ← old place: `project/components/bundle.js` ← `_ds_bundle.js`; `project/assets/notes/CLAUDE.from-standalone.md` ← `CLAUDE.md`; `project/assets/notes/SKILL.from-standalone.md` ← `SKILL.md`; `project/docs/_ds_manifest.json` ← `_ds_manifest.json`
- `project/components/bundle.css` is new: the global stylesheets `styles.css`, `tokens/primitive/color.css`, `tokens/primitive/dimension.css`, `tokens/primitive/typography.css`, `tokens/primitive/motion.css`, `tokens/primitive/elevation.css`, `tokens/semantic/color.css`, `tokens/semantic/space.css`, `tokens/semantic/typography.css`, `tokens/semantic/shape.css`, `tokens/semantic/size.css`, `tokens/semantic/elevation.css`, `tokens/semantic/motion.css`, `tokens/themes/base-dark.css`, `tokens/themes/theme-custom.css`, `tokens/component/button.css`, `tokens/component/input.css`, `tokens/component/card.css`, `tokens/component/dialog.css`, `tokens/component/table.css`, `tokens/contexts/context-product.css`, `tokens/contexts/context-marketing.css`, `tokens/base.css` joined in that order, with the 447 token declaration(s) that `project/tokens.json` now holds taken out, so a token edited on the page reaches the previews; each original sheet is untouched
- 4 component previews are not shown yet: the page shows a preview only at `project/components/<Name>/preview.html`, and these cards are elsewhere (Button at `project/components/actions/Button.play.html`; ButtonGroup at `project/components/actions/ButtonGroup.play.html`; IconButton at `project/components/actions/IconButton.play.html`; Link at `project/components/actions/Link.play.html`). Each card’s group, subtitle and viewport are in `project/docs/_ds_manifest.json`
- The map of every file, what it is and where it was: `project/migration-map.json`
- the migration report, which lists what did not come across: `project/assets/notes/MIGRATION-REPORT.md`
