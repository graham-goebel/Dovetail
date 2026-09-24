# What the examples found

Two full sites were built on Dovetail to see what a real brand hits: **Low Meadow**
(`examples/dispensary/`), a four-page dispensary, and **Meridian**
(`examples/travel/`), one immersive vacation-rental homepage. A third, smaller test,
**Solace** (`examples/wellness/`), recreates a single dark mobile-app screen. None of
them touched `system/`. This file is what came back — every bug confirmed against the current
source, every gap felt twice, and the patterns that showed up independently in both
builds and are worth folding into the system itself. Each item cites the file and line
so a fix can start without re-deriving it.

Read this as a punch list, not a verdict. Both sites shipped and both look and work
the way they're supposed to; everything here is what would have made that easier, or
what the next brand will hit the same way these two did.

---

## Bugs

Ranked by how badly they surprise you. All six reproduce in the unmodified system —
neither example's own code is the cause.

### 1. Drawer's z-index is a literal 60, and it sits under sticky page chrome

`system/components/feedback/Drawer.jsx:16`:

```js
<div style={{ position: "fixed", inset: 0, zIndex: 60, ... }}>
```

Two problems in one line. `60` is a literal — every other overlay in the system reads
a `--dt-z-*` token (`Dialog.jsx:17` correctly uses `var(--dt-z-dialog)`, which is
`400`), so this is also the one place Rule 1 of the system's own checklist
("every colour, dimension, radius, shadow, and duration is a token reference") is
broken. And `60` sits below `--dt-z-sticky` (`100`, `tokens/semantic/elevation.css:23`),
so a Drawer opens *underneath* any `position: sticky` or `position: fixed` header, nav,
or filter bar already on the page. Meridian hit this directly: the booking Drawer sits
below the page's fixed header, so the header floats over the Drawer's own scrim.

A third example (`examples/wellness/`), built against the system before the fix
landed, hit it again: its sticky tab bar sat above every bottom-sheet Drawer and blocked
the sheet's own Save button, found by an automated click test rather than by eye.

**Status: fixed** in `3980b72` (Drawer now reads `--dt-z-overlay`); the wellness tab bar
uses `--dt-z-sticky` again.

Fix: `zIndex: "var(--dt-z-overlay)"` (`300`), which is where Drawer already sits
conceptually next to Popover and Tooltip in the z-scale, and above every sticky
role in the system.

**Worked around in both examples**: neither actually patches this — both instead drop
their own page header to `--dt-z-base` while any overlay (Drawer, Dialog, or their
own saved-list panel) is open, via a `data-overlay` attribute on `<html>` the CSS
keys off. That's a page-level fix for a component-level bug; it stops working the
moment two independently-authored components on the same page both need to sit above
sticky chrome and neither knows about the other's flag.

### 2. Component-tier tokens don't re-resolve under a `.dark` scoped to a subtree

The component tier (`tokens/component/*.css`) is declared once, on `:root`, as aliases
of semantic roles — `--dt-button-ghost-fg: var(--dt-text-on-action-ghost);` and 48 more
like it across button, card, dialog, input, and table. A custom property resolves
**where it is declared**, not where it's read. When `.dark` sits on `<html>`, the
aliases are re-declared on that same element and everything downstream follows. But
scope `.dark` to a subtree instead — a header over a photograph, a full-bleed band, a
hero — and the semantic roles underneath it re-point correctly while the component
aliases keep whatever they resolved to at `:root`. A ghost button inside a `.dark`
scoped band measured at **1.1:1** contrast in testing: its background token followed
the scope, its text token (an alias, not a role) did not.

This is the single largest finding from either build. It is not a corner case — it's
the mechanism every "dark band on a light page" pattern in the system depends on
(`Cover`'s own scrim treatment implies the same assumption; see #3), and it silently
breaks any component placed inside one.

Two fixes, not mutually exclusive:
- **Move the aliases to `:root, .dark` in each `tokens/component/*.css` file**, so a
  scoped `.dark` re-declares them the same way it re-declares the semantic tier. This
  is the structural fix and belongs in the system.
- **Document the limitation** in `guidelines/theming.md` if the alias tier stays
  `:root`-only by design, so a theme author knows to re-declare the aliases themselves
  (Meridian's `theme.css` does this today, as a 48-line stopgap scoped to `.dark`
  purely because the page needs it, with a comment saying the fix belongs upstream).

Either way, a component-tier token needs a documented rule about *where* it's allowed
to be declared, because right now "works everywhere `.dark` is used" is true by
accident, not by contract.

### 3. `Cover`'s caption hardcodes `--dt-text-inverse`, which is dark in dark mode

`system/components/content/Cover.jsx:84,89,94` — the eyebrow, title, and body all read
`color: "var(--dt-text-inverse)"` directly. `--dt-text-inverse` means "opposite of the
current page surface," which is exactly wrong for text meant to sit on a photograph
under a scrim: in dark mode the page is already dark, so `text-inverse` flips *light*,
and Cover's own caption goes dark-on-dark and disappears against its own scrim.

Cover needs a role that means "light text over a darkened image," not "opposite of the
page." That role doesn't exist in the semantic tier today. A concrete proposal:
`--dt-text-on-scrim` (and `-secondary`), declared once as a fixed light value — because
a scrim over a photo is dark regardless of page mode, the same way the fixed-card
pattern in #6 below is light regardless of page mode — paired with `--dt-surface-scrim`
the way every other background role is paired with its foreground.

**Worked around in Low Meadow**: `.lm-on-photo { color: var(--dt-color-neutral-050); }`,
applied wherever a `Cover` sits over a photo — a primitive read directly, bypassing the
semantic tier the system otherwise insists on, because no semantic role fits.

### 4. `Grid`'s `auto-fit` stretches a lone remaining card across the whole row

`system/components/primitives/Grid.jsx:5`: `minColumnWidth` always compiles to
`repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`. `auto-fit` collapses
empty tracks and lets the *existing* tracks grow to fill the space — correct for a
grid whose count never changes, wrong the moment a filter or a "related items" list can
land on exactly one result: that one card stretches to the full row width instead of
sitting at its intended size.

Fix: a `track` prop, `"fit" | "fill"`, defaulting to `"fit"` so nothing existing
changes; `"fill"` emits `auto-fill` instead, which reserves the empty tracks and stops
the stretch.

**Worked around in Low Meadow**: an inline `style` override
(`gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))"`) on every
`Grid` that could plausibly land on one item — two call sites, each repeating the same
fix because the component doesn't offer it. Meridian's one `Grid` (the amenities list)
never lands on a single item, so it didn't need the workaround; the bug is confirmed
against the source either way.

### 5. `Button` rendered `as="a"` has no underline override, so it inherits one

`system/tokens/base.css:33-39` sets `text-decoration: underline` on every anchor,
correctly, as the system's global link affordance. `Button.jsx` never sets
`textDecoration` at all, so a `Button` rendered `as="a"` — the documented way to make a
primary or secondary CTA a real link — picks up that underline and reads as a link
wearing a button's clothes.

Fix: `Button` sets `textDecoration: "none"` unconditionally; `Link` is the component
that keeps the underline, and nothing else in the system renders `as="a"` today.

**Worked around in both examples**: `a.lm-btn, a.lm-btn:hover { text-decoration: none; }`
/ `a.mv-btn, a.mv-btn:hover { text-decoration: none; }` — the identical two-line rule,
under the identical name pattern, written independently in both brands' `theme.css`.

### 6. `base-dark.css` sets the selected surface as a literal

`system/tokens/themes/base-dark.css:61-62` declares `--dt-surface-selected` and
`--dt-surface-selected-hover` as literal `oklch(...)` values with a fixed blue hue (259),
rather than as steps of the accent ramp the light theme reads. So a brand that retunes
its accent ramp still gets a blue selected chip in dark mode (a selected `Tag`, a
selected `Card`). Found by the wellness example, whose accent is deliberately
colourless; it overrides both roles in its own theme. Fix: point both at accent steps
(for example `--dt-color-accent-900` / `-800`), the way every other dark-mode action
role in the same file already does.

---

## Gaps

Not bugs — things the system doesn't offer yet, confirmed by two brands needing the
same workaround independently.

### Navbar has no responsive collapse

`Navbar.jsx`'s link row already sets `overflowX: "auto"` and `minWidth: 0`
(`Navbar.jsx:13`), so it doesn't overflow the page — it becomes a horizontally
scrolling strip of nav links on a narrow screen, which is not a standard mobile nav
pattern and gives no visual hint that there's more to scroll to. Both examples built
their own fix, differently: Meridian added a `collapseBelow`-style breakpoint that
moves the links into a `Drawer` behind a menu button; Low Meadow simply dropped a link
so the row fit. Neither is a component-level answer. A `collapseBelow` prop (default
a sensible breakpoint, e.g. 640px) that swaps the inline link row for a menu button +
`Drawer` internally would remove this from every brand's plate at once.

### No page-width or container tokens

Both brands needed a handful of fixed content widths (a page shell, a wide hero, a
narrow reading column) and both invented their own — `--mv-measure` custom properties
in Meridian, literal pixel widths in Low Meadow's `.lm-shell` rules. Semantic
`--dt-measure-narrow / -default / -wide` already exist
(`tokens/primitive/typography.css:62-64`) for *text* line length and are the right
shape for this; there is nothing equivalent for a *layout* width (a page shell wider
than 68ch, e.g. 1120–1320px). A `--dt-size-container-narrow / -default / -wide` triplet,
sibling to the measure tokens, would give every brand the same three answers instead
of three invented ones.

### No `Heading` or `Text` component

This is the gap with the most surface area. An early audit of Low Meadow, before any
Dovetail changes, found **69% of on-screen elements** were built by Dovetail
components and **31%** were custom — and of the custom 31%, headings, eyebrows, leads,
fine print, and prices accounted for the largest share by a wide margin (**61% of all
on-screen text, by character count**, was inside a plain `<h1>`/`<h2>`/`<p>`/`<span>`
carrying a hand-written class, not a component). Both brands ended up with a near-
identical private type-role system: `.lm-h1/.lm-h2/.lm-h3/.lm-eyebrow/.lm-lead/
.lm-small/.lm-fine/.lm-price` in one, `.mv-eyebrow/.mv-display/.mv-h2/.mv-h3/.mv-lead/
.mv-small/.mv-fine` in the other — same roles, same token reads
(`var(--dt-text-heading-lg-size)` etc.), different names, written twice. That's the
signature of a missing component, not a one-off need.

A `Heading` (`level` 1–6 sets the tag, `size` sets the type role, so a page's document
outline and its visual scale can differ on purpose) and a `Text` (`variant`:
`eyebrow | lead | body | small | fine`, `tone`: `primary | secondary | tertiary |
link`, `measure`: `narrow | default | wide | none`) would absorb both private systems
into one, and would be the single highest-leverage addition this file recommends.

### No `Section` / `Container`, and no full-bleed photo band

Both brands also independently built a page-section primitive and, on top of it, a
full-bleed photo band with a scrim and dark-scoped content: `LM.Section` / `LM.Bleed`
in Low Meadow, a `.mv-sec` class + `Section`'s own JS wrapper in Meridian. Both read
`--dt-space-section`, both take a `tone`-like `alt`/wash prop, both scope `.dark` to
the band (see bug #2). A `Section` (page-width, vertical rhythm, an optional tone) and
a photo-band variant of it (`media`, `scrim`, `minHeight`) would give brands the
scaffold neither had to invent, and would be the natural home for whatever fixes bug
#2 gets — the band component is where that scoping decision actually needs to live.

### `Card` has no `href`

Neither example's `Card` usage needed this directly (both wrap `Card` in an `<a>`
instead, or use a separate full-cover click-catcher `<button>` inside the card), but
it's the same pattern the system's own component-index cards already use ("a link
now rather than being one: a menu button cannot sit inside an anchor, so the heading's
link is stretched over the card," per `system/README.md`). Giving `Card` an `href` that
stretches a link over the whole card, with room left for a real button inside it, would
let brands reach for the documented pattern instead of re-deriving it.

---

## Patterns worth productizing

Not gaps in the sense of "brands had to work around a missing thing" — closer to
"brands independently arrived at the same solution, which usually means the system
should just offer it."

**Pixel-measured contrast, not token-pair contrast.** Both brands checked text-over-
photograph contrast by screenshotting the rendered page with the text hidden, sampling
the real pixels behind where the text was, and computing the worst-case ratio from
that — because a scrim's advertised alpha doesn't say what's actually behind any given
run of text on a *specific* photograph. This is how Meridian's hero scrim ended up
three gradient layers deep instead of one: one pass of `--dt-surface-scrim` measured
well short of AA against the brightest patch of a real photo. Worth writing up as a
documented QA method in `guidelines/accessibility.md` — "how to verify contrast over
imagery" is a real gap in the current guide, which otherwise assumes a solid surface
behind text.

**A "fixed card" token-pinning pattern, for content that shouldn't follow page mode.**
Both brands eventually needed a band that reads as a *fixed* light or dark card —
Meridian's tan "house of the season" band, its dark "atmosphere" stage — rather than
one that flips with the visitor's light/dark toggle, the way a printed card or a
cinema doesn't relight when you turn a lamp on at home. The pattern that emerged:
pin `--dt-text-primary/-secondary/-tertiary` to specific neutral-ramp steps, scoped to
the band's own selector, and build the band's background from a primitive rather than
a semantic surface role (so it doesn't swap either). It works, and every component
inside the band that reads the semantic text roles — `Stat` included — picks it up
correctly with no per-component styling. Worth a name and a guideline entry
(`guidelines/color-*.html` already documents the "why" for every other pairing rule;
this is the missing "when a section should *not* follow the page" case), even if it
never becomes an actual component.

**A mobile carousel, built twice.** Both brands turned a card grid into a swipeable,
scroll-snapped, auto-advancing row below a phone breakpoint, with dot indicators and
pause-on-interaction — Low Meadow's product grids (documented in `system/README.md`
already, "every card grid becomes one swipeable row"), Meridian's collection tiles.
The system's own docs site already believes in this pattern for its component index;
a real `Carousel` (or a `track="swipe"` mode on `Grid` itself, active only below a
breakpoint) would mean the autoplay-and-pause state machine gets written once.

---

## Where to start

Roughly in order of how much it saves the next brand:

1. **Fix #1 and #4–5 now** (Drawer's z-index, Grid's `track` prop, Button's underline).
   Small, isolated, no design decision required, and #4–5 are each already duplicated
   verbatim across both examples.
2. **Fix #2** (component-tier tokens under scoped `.dark`), because it's the one that
   fails silently and would keep failing for every brand that builds a photo band —
   which, per the pattern section above, is most of them.
3. **Give `Cover` a real "text on scrim" role** (#3) rather than `--dt-text-inverse`,
   ideally the same role #2's fix and the "fixed card" pattern above end up sharing.
4. **Ship `Heading` and `Text`.** This is the one both brands rebuilt in full, and it's
   the highest-leverage single addition in this list.
5. **`Section` / `Container` and a page-width token triplet**, once `Heading`/`Text`
   exist to fill them.
6. **`Navbar`'s `collapseBelow` and `Card`'s `href`** — smaller, but each removes a
   real, duplicated piece of per-brand code.

The carousel and the "fixed card" pattern are worth a decision rather than an
immediate build: both are proven by two independent implementations, but neither
blocks a brand the way the six items above do.
