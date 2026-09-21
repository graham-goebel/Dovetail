# Dovetail — white-label design system
## Build plan for review

Draft v1 · prepared from the Beam Mobile system as a structural starting point

---

## 1. What Dovetail is

Dovetail is a **white-label design system**: an unbranded, production-grade foundation that a team adopts and then skins. Beam Mobile was a single opinionated brand. Dovetail inverts that — the system ships neutral, and brand is a *theme layer* applied on top without touching a single component.

Three consequences drive every decision below:

1. **Nothing in a component may know a brand.** No magenta, no Barlow, no "beam". Components reference semantic tokens only.
2. **Theming is the product.** A theme is a small file of token overrides. Swapping it restyles everything.
3. **Content is external.** Components accept content as props/slots so they can be driven by React state, Sanity, Contentful, or static markup interchangeably.

### Benchmarks studied

| System | What we take |
|---|---|
| **shadcn/ui** | `background`/`foreground` pairing convention; OKLCH color; `.dark` class overriding the same semantic names; copy-in (not npm-locked) distribution; per-component docs pages |
| **Atlassian Design System** | Strict semantic naming with no value words; documented token deprecation path |
| **IBM Carbon** | Multi-theme architecture (white / g10 / g90 / g100) from one token contract |
| **Material 3** | Role-based color (`surface-container-high`, `on-surface-variant`) — richer surface hierarchy than most systems ship |
| **Polaris / Spectrum** | Content & voice guidelines treated as first-class system documentation, not an afterthought |
| **W3C DTCG** | Token file format as the interchange layer, so Figma and code cannot drift |

---

## 2. Token architecture

Three tiers, referenced in one direction only: **component → semantic → primitive**. A component never reads a primitive. This is the consensus architecture across the systems above and the thing that makes white-labeling work at all.

```
tokens/
  primitive/          Tier 1 — raw values, no meaning
    color.css           --dt-color-neutral-050 … 950, and 6 hue ramps × 11 steps (OKLCH)
    dimension.css       --dt-dim-0 … --dt-dim-96  (4px scale, see §3)
    typography.css      --dt-font-family-*, --dt-font-size-*, --dt-line-height-*, --dt-font-weight-*, --dt-tracking-*
    duration.css        --dt-duration-*, --dt-easing-*
    elevation.css       --dt-shadow-raw-*
  semantic/           Tier 2 — purpose. THE themeable layer. No value words, ever.
    color.css           surface / text / border / action / feedback / focus roles
    space.css           --dt-space-inset-*, --dt-space-stack-*, --dt-space-inline-*
    typography.css      --dt-text-display-*, --dt-text-heading-*, --dt-text-body-*, --dt-text-label-*, --dt-text-code-*
    shape.css           --dt-radius-*, --dt-border-width-*
    elevation.css       --dt-elevation-0 … 5
    motion.css          --dt-motion-enter / exit / emphasis
  component/          Tier 3 — per-component escape hatches
    button.css, input.css, card.css, dialog.css, table.css, …
  themes/             Brand skins: override Tier 2 only
    base-light.css, base-dark.css
    theme-example-a.css, theme-example-b.css   (two demo brands proving the swap)
    density-compact.css, density-comfortable.css
```

### Naming grammar

`--dt-[tier?]-[category]-[role]-[variant]-[state]`

- `--dt-color-neutral-600` — primitive (category + hue + step)
- `--dt-surface-raised` — semantic
- `--dt-text-on-action` — semantic, pairing convention
- `--dt-button-primary-bg-hover` — component

Rules the linter will enforce:
- **No value words above Tier 1.** Never `--dt-surface-blue`. A `gray-blue` that renders green after a rebrand is the classic failure.
- **Every background role has a paired foreground role** (shadcn's convention, adopted wholesale). `--dt-surface-action` always ships with `--dt-text-on-action`, contrast-verified.
- Lowercase, hyphen-delimited, one convention across the whole set.

### Color

- **OKLCH throughout.** Perceptually uniform lightness means a generated ramp has even visual steps and contrast is predictable when a brand hue is swapped in.
- **Neutral ramp + 6 functional hues** (accent, success, warning, danger, info, plus one spare for data-viz) × 11 steps each.
- **Surface hierarchy borrowed from Material 3** — `surface-base`, `surface-subtle`, `surface-raised`, `surface-sunken`, `surface-inverse`, `surface-overlay`. Deeper than shadcn's flat `background`/`card`, which pays off in dense product UI.
- **Dark mode is not a second system.** `.dark` (and `@media (prefers-color-scheme)`) re-point the *same* semantic names at different primitives. Components are untouched.
- **Contrast is a build-time check**, not a review comment: every semantic pair must clear WCAG 2.2 AA (4.5:1 body, 3:1 large text and non-text).

### Open question → §7
Whether we also ship a **DTCG JSON source of truth** with a Style Dictionary build (CSS + JSON + Figma Variables + iOS/Android out of one file), or keep CSS as the single source. JSON is the 2026 standard and the right answer if Figma parity matters; it adds a build step.

---

## 3. The 4px scale

One base unit: **4px**. Every dimension primitive is a multiple. No exceptions, no one-off paddings.

```
--dt-dim-0   0       --dt-dim-5   20px     --dt-dim-16  64px
--dt-dim-1   4px     --dt-dim-6   24px     --dt-dim-20  80px
--dt-dim-2   8px     --dt-dim-8   32px     --dt-dim-24  96px
--dt-dim-3   12px    --dt-dim-10  40px     --dt-dim-32  128px
--dt-dim-4   16px    --dt-dim-12  48px     --dt-dim-40  160px
```

Half-steps (`2px`) exist **only** for border widths and hairline offsets, named separately so they can't leak into layout.

Semantic spacing sits on top, so intent is readable in the markup:
- `--dt-space-inset-{xs…2xl}` — padding inside a container
- `--dt-space-stack-{xs…2xl}` — vertical rhythm between blocks
- `--dt-space-inline-{xs…2xl}` — horizontal gaps between siblings

The scale also governs **component sizing**: control heights 24 / 32 / 40 / 48, icon sizes 16 / 20 / 24 / 32, touch targets never below 44px (WCAG 2.2 §2.5.8 asks 24px minimum; 44px is the humane floor).

**Type is the one place the 4px grid bends.** Font sizes follow a modular ratio (1.200 minor third), then line-heights snap to the 4px grid so text blocks still align to the baseline. This is standard practice — forcing font sizes onto 4px multiples produces an ugly scale.

---

## 4. Component inventory

Grouped by concern. Each component ships: `Name.jsx` · `Name.d.ts` (props contract) · `Name.prompt.md` (when/how) · a spec card in the Design System tab.

**Primitives** — Box, Stack, Inline, Grid, Divider, Spacer, VisuallyHidden
**Actions** — Button, IconButton, ButtonGroup, Link, Menu, DropdownMenu
**Forms** — Input, Textarea, Select, Combobox, Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider, DatePicker, FileUpload, Field (label/hint/error wrapper), Form
**Display** — Card, Badge, Tag, Avatar, AvatarGroup, List, Table, DataGrid, Stat, EmptyState, Skeleton, Code
**Navigation** — Tabs, Breadcrumbs, Pagination, Sidebar, Navbar, Stepper, CommandPalette
**Feedback** — Alert, Toast, Dialog, Drawer, Popover, Tooltip, Progress, Spinner, Banner
**Content** — Prose (rich-text renderer), Media, Figure, Quote, Accordion, Callout

That is ~50 components. **Proposed phasing** — see §6; I would not build all 50 before you've reviewed the first 12.

### Accessibility baked in, not bolted on
- Focus ring is a semantic token (`--dt-focus-ring`), applied identically everywhere, visible against every surface.
- Every interactive component has a documented keyboard contract in its `.d.ts`.
- Labels are required props, not optional. `IconButton` without `label` is a type error.

---

## 5. Headless / CMS readiness

The ask is "React components or Sanity or other headless options." Three deliverables:

1. **Content-agnostic props.** No component hard-codes copy. Everything renders from props; rich text goes through a `Prose` component that accepts either HTML or a portable-text-style node array.
2. **A Sanity schema pack** — `integrations/sanity/` — schema definitions mirroring the component props, so a `Card` in Sanity Studio produces exactly the props `Card.jsx` expects. Plus a `PortableText` serializer mapping Sanity blocks to Dovetail components.
3. **A generic block renderer** — `<BlockRenderer blocks={…} />` that maps a `{_type, …props}` array to components. This is the layer that makes Contentful, Storyblok, Payload, or a plain JSON file work identically. Sanity is then just one adapter, not the assumption.

Documented in `guidelines/headless-integration.md`, with a worked example: the same page rendered from static props and from a Sanity payload.

---

## 6. Documentation & governance

This is where world-class systems separate from good ones, and it's what "zero drift" actually requires.

- **`readme.md`** — the manifest and design guide.
- **`CLAUDE.md`** — always-on authoring rules (rewritten for Dovetail; the current one is Beam-specific).
- **`guidelines/`** — foundations prose: color, type, space, motion, elevation, accessibility, content & voice, headless integration, theming, contribution.
- **Spec cards** (~30) in the Design System tab — primitive ramps, semantic role maps, the 4px scale, type scale, elevation, motion, focus states, and per-component state matrices.
- **Do/Don't cards** — visual wrong-vs-right for the five most-violated rules.
- **Templates** — `templates/<slug>/` starting points: marketing page, app shell + dashboard, settings, auth, article/CMS page. Templates are the strongest anti-drift tool; a consumer starting from one cannot get the structure wrong.
- **`SKILL.md`** — agent entry point, cross-compatible with Claude Code.
- **A theming guide** that walks a team from "we have a brand" to "we have a theme file" in about 20 minutes.

### Tone of voice: confident and educational

Rewriting the voice guidance per your note. The register:

- **State the rule, then the reason.** "Use `surface-raised` for anything that floats above the page. It carries the elevation token, so it stays correct in dark mode." Confident = no hedging. Educational = the *why* travels with the *what*.
- **Second person, active, present tense.** "You theme Dovetail by overriding semantic tokens." Not "Dovetail can be themed."
- **Name the tradeoff instead of pretending there isn't one.** "Component tokens give you precision at the cost of a wider API surface. Reach for them last."
- **Sentence case. No exclamation points. No emoji. No hype adjectives** — nothing is "powerful", "seamless", or "delightful".
- **Teach through the example, not around it.** Every rule gets a code sample within two lines of being stated.
- **Say "don't" plainly when it matters.** "Don't reference a primitive from a component. It will survive code review and break the first rebrand."

Applied consistently across readme, guidelines, prompt files, component descriptions, and the sample content inside UI kits.

---

## 7. Phasing

I'd rather ship four reviewable milestones than one 50-component drop.

**Phase 1 — Foundation** (review gate)
Full three-tier token set, 4px scale, base light + dark themes, two demo brand themes, ~30 spec cards, readme + CLAUDE.md + voice guidelines rewritten. No components yet. *You review the foundation before anything is built on it.*

**Phase 2 — Core components** (review gate)
Primitives, Actions, Forms, plus Card / Badge / Alert / Dialog. ~20 components with full docs and state cards. Enough to build a real screen.

**Phase 3 — Full inventory + UI kits**
Remaining components. Two UI kits proving the theme swap: one marketing site, one app dashboard, each rendered under both demo brands.

**Phase 4 — Headless + governance**
Sanity schema pack, BlockRenderer, integration docs, templates, do/don't cards, contribution guide, SKILL.md.

---

## 8. Decisions I need from you

These change the build, so I'd like answers before Phase 1 — I've marked my recommendation on each.

1. **Token source of truth** — CSS only (simple, no build step) *or* DTCG JSON + Style Dictionary (Figma parity, multi-platform output). **Rec: DTCG JSON** if this is meant to be world-class and outlive one codebase.
2. **Default typeface** — Dovetail ships unbranded, so the default should be a neutral, license-free workhorse. **Rec: Inter Variable for UI + a variable serif for editorial, with a documented one-line swap.** (Noting the house guidance against Inter — for a *white-label* default its neutrality is the point, but say the word and I'll pick a different neutral.)
3. **Component tokens (Tier 3) — all components or only complex ones?** **Rec: only where a real override need exists** (Button, Input, Card, Table, Dialog). Tier 3 everywhere is a maintenance tax most teams never cash in.
4. **How many demo themes?** **Rec: two**, deliberately far apart (e.g. a warm editorial brand and a cool dense enterprise one) — that's what proves the white-label claim.
5. **Density modes** — ship compact/comfortable from day one, or later? **Rec: build the token hooks in Phase 1, ship the compact theme in Phase 3.**
6. **Full 50 components, or a tighter 30?** **Rec: 50 is right for "world class", but Phase 2's 20 will tell us whether the pace is working.**
7. **Keep or delete the Beam Mobile content?** **Rec: delete.** Dovetail should not carry a magenta telecom brand in its history. I'll archive it if you want it retained.

---

## 9. What I cannot do

- **No logo.** Dovetail gets a wordmark set in the default typeface. If you want a mark, it needs a designer or a file.
- **No imagery or illustration.** UI kits will use labelled placeholders. I can't generate images, and hand-drawn SVG would undercut the quality bar.
- **No Figma file.** I can produce the DTCG JSON that Figma Variables imports, but I can't author the Figma library itself.
