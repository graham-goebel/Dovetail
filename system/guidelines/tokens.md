# Token reference

The full vocabulary, with the reasoning behind each group. For the architecture, see
`readme.md`. For how to override any of it, see `theming.md`.

## Naming grammar

```
--dt-[category]-[role]-[variant]-[state]
```

| Example | Tier | Reads as |
|---|---|---|
| `--dt-color-neutral-600` | Primitive | category, hue, step |
| `--dt-surface-action-hover` | Semantic | category, role, state |
| `--dt-text-on-action` | Semantic | the foreground paired with `surface-action` |
| `--dt-button-primary-bg-hover` | Component | component, variant, property, state |

Lowercase, hyphen-delimited, one convention throughout. Names are stable API, so renaming
a token is a migration, so name it carefully the first time.

---

## Tier 1: Primitive

### Colour

Seven ramps of eleven steps (`050`–`950`), all OKLCH.

`neutral` · `primary` · `secondary` · `green` · `amber` · `red` · `cyan` · `violet`

OKLCH because lightness is perceptually uniform. Step 600 in any ramp carries the same
visual weight, so a brand hue dropped into the primary ramp inherits the contrast behaviour
the system was tested against. A hex ramp gives you no such guarantee.

`violet` is the spare hue, reserved for data visualisation so charts never collide with
a semantic meaning.

### Dimension

One base unit: **4px**. The number in the name is the multiplier, so `--dt-dim-6` is 24px.
The name stays true if the base unit ever changes.

```
0  1  2  3  4  5  6  7  8  9  10  11  12  14  16  20  24  28  32  40  48  56  64
```

`--dt-dim-hair` (1px) and `--dt-dim-hair-2` (2px) are the only sub-unit values. They exist
for borders and optical nudges, and are named separately so they cannot leak into layout.

### Typography

Sizes follow a 1.200 modular scale from a 16px base, rounded to whole pixels. Two rounds
are deliberate: 13.33 → **14** because 14px is the workhorse UI size, and 57.33 → **58**
because half-pixel display type renders inconsistently across browsers.

| Token | Size | Line height |
|---|---|---|
| `2xs` | 11 | 16 |
| `xs` | 12 | 16 |
| `sm` | 14 | 20 |
| `md` | 16 | 24 |
| `lg` | 19 | 28 |
| `xl` | 23 | 32 |
| `2xl` | 28 | 36 |
| `3xl` | 33 | 40 |
| `4xl` | 40 | 48 |
| `5xl` | 48 | 52 |
| `6xl` | 58 | 64 |
| `7xl` | 69 | 76 |

Every line height is a multiple of 4, so text blocks align to the same grid as everything
else. This is the one place the modular scale and the 4px grid are reconciled by hand:
forcing font sizes themselves onto 4px multiples produces a lumpy, unusable scale.

### Motion and elevation

Durations 0–600ms. Four easing curves: `standard`, `decelerate`, `accelerate`, `emphasis`.

Six raw shadows, each a two-layer recipe: a tight contact shadow plus a soft ambient one.
Single-layer shadows read as flat stickers once they get large.

Opacity steps `--dt-opacity-0` to `--dt-opacity-100`, by tenths. Only the semantic opacity
roles read them.

---

## Tier 2: Semantic

The themeable layer. This is where a consumer spends their time.

### Surfaces

| Token | Use for |
|---|---|
| `--dt-surface-base` | the page |
| `--dt-surface-subtle` | a quiet section band |
| `--dt-surface-raised` | cards, anything with elevation |
| `--dt-surface-sunken` | wells, code blocks, inset areas |
| `--dt-surface-overlay` | dialogs, popovers, menus |
| `--dt-surface-inverse` | a dark band on a light page |
| `--dt-surface-scrim` | behind a modal |

The page is white and the quiet band grey, which is right for a product and flat for a brand. Set
`data-surface="brand-muted"` on `html` or `body` for a whole page, or on a section, and
`--dt-surface-base` becomes `--dt-surface-brand-muted` (the primary's 050 step, 950 in dark) while
`--dt-surface-subtle` steps a little toward ink so bands inside still read. Text keeps its ordinary
roles. For a band that also re-colours its text from the brand, use `Section tone="brand-muted"`. Configure's
Page and Sections controls do the same for the whole site.

Six surfaces rather than two, because dense product UI needs more than a page colour and
a card colour. A settings panel inside a card inside a dialog has three surfaces to
distinguish, and guessing at opacity values is how that goes wrong.

### Text

`primary` · `secondary` · `tertiary` · `disabled` · `inverse` · `link` · `link-hover` ·
`link-visited`

Plus the `on-` roles, which exist only as halves of a pair: `--dt-text-on-action`,
`--dt-text-on-success`, `--dt-text-on-selected`, and so on.

### Actions

Four variants, each with resting, hover, active, and foreground roles:
`action` · `action-secondary` · `action-ghost` · `action-danger`.

Plus `action-disabled`, which is shared, because a disabled button looks the same regardless of
what variant it would otherwise be.

### Layout

Three axes. `16px` does not say what the gap is for; `--dt-space-stack-md` does.

- `inset-*`: padding inside a container
- `stack-*`: vertical gap between blocks
- `inline-*`: horizontal gap between siblings

Naming the axis also lets a density theme retune one axis without touching the others.

Four layers say how closely the two things either side of a gap belong together:
`--dt-layout-stack-*` and `--dt-layout-inline-*` for `related` (parts of one thing), `group` (members
of a set), `block` (one unit from the next) and `section` (a theme from the next). The layout's
character moves them as one: `tight` for a technical screen, `balanced`, or `open` for breathing room,
where what is related stays close and the layers move apart. Set it on the page in Configure, or on
any region with `data-layout`; `Stack` and `Inline` take `layer` and `spacing` props for it.

Two more groups say what the gaps are between, for the two things a page is made of. **Text** is the
gaps between the items of a block of text: `--dt-layout-text-eyebrow` (an eyebrow and its heading),
`-subcopy` (a heading and the lead under it) and `-paragraph`. **Modules** is the room a module takes:
`--dt-layout-module-padding` above and below its content, and `--dt-layout-module-gap` between its own
parts. At the balanced character they are the space axes themselves, so a context still moves them.
The padding comes in four steps, `--dt-layout-module-padding-sm`, `-md` (the padding itself), `-lg` and
`-xl`, so one band can take more room than the next, or more above than below, and still move with the
character. `--dt-layout-module-inset` pads a band set in from the page edges.

**Page** is the column every page shares. `--dt-layout-page-width` is its width, so content lines up
from page to page without padding and margin doing the work; `-narrow` is a reading column and `-wide`
a hero or gallery. Configure's Page width moves the first for every page. `--dt-layout-page-gutter`
keeps the column off the screen's edge and moves with the character. `Section` and every block read
these, so a band's width and rhythm come from the page, not from the band.
`--dt-layout-scale` multiplies every layer in `Stack` and `Inline` (1 on a page), which is how a social
artboard drawn at 1080px keeps its proportions.

### Type scale

A social post is authored on a 1080px artboard and read in a feed about 390px wide, so at about a
third of its size. Type sized for a page all but disappears there. Set `data-type-scale="social"` on
the artboard and every text role grows for it:

| Roles | Factor | Display large / body on a 1080 post | Seen in a feed |
| --- | --- | --- | --- |
| body, label, eyebrow, code | 2.5x | body 40px | about 15px |
| heading | 2.75x | heading large 91px | about 33px |
| display | 3x | display large 207px | about 75px |

The logic, so another scale can follow it:

1. **Readable at the size it's seen.** Body near 15px, metadata no smaller than 12px and headlines from
   30px up after the artboard shrinks. At a third of the size, that is about two and a half times the
   page sizes.
2. **A steeper ladder for headings.** A feed is scanned, not read, so the headline has to win at a
   glance. Headings grow more than body and display more again. Display large to body goes from
   about 4.3 times on a page to about 5.2 times.
3. **Rhythm kept.** Line heights move with their sizes and tracking stays, so each role keeps its
   proportions at the larger size.
4. **Space follows type.** `--dt-layout-scale` takes the body factor, so `Stack` and `Inline` gaps keep
   their proportion to the words.

The factors are tokens (`--dt-type-scale-body`, `--dt-type-scale-heading`, `--dt-type-scale-display`)
declared with every role in `tokens/contexts/type-scale.css`. The roles are declared again there
because a custom property resolves where it's declared. The page's context doesn't carry into a scaled
region. Families, weights and tracking still follow the theme. `SocialPost` keeps its own artboard
roles (`--dt-text-artboard-*`).

### Size

Control heights on the 4px grid: 24 / 32 / 40 / 48. Icon sizes 12 / 16 / 20 / 24 / 32.
`--dt-size-touch-target` (44px) is the minimum hit area on touch surfaces. `--dt-size-step` is the step of the size grid: a box drawn on a canvas is a whole multiple of it. It is the large control height and moves with it, but reads as what it is for.

### Shape

Radius is named by what it wraps: `control`, `container`, `overlay`, `media`, `pill`.
A square-cornered theme flattens the entire system by re-pointing five lines.

### Elevation

Six levels, and a z-index ladder to match. Keep every fixed-position layer on the ladder;
hand-picked z-index values are how overlay bugs start.

```
0 flush        3 sticky headers, dropdowns
1 cards        4 dialogs, drawers
2 hover, popovers   5 toasts
```

### Opacity

Four roles, by purpose, so a theme tunes them in one place: `--dt-opacity-ghost` (0.2) for
watermarks and placeholders, `--dt-opacity-disabled` (0.4) for a control that can't be used
right now, `--dt-opacity-muted` (0.6) for secondary art that shouldn't compete with content,
and `--dt-opacity-strong` (0.8) for a layer over content that should still show what's
beneath. Opaque is the default and has no token. Never reach for a raw step: if none of the
four fits, the role is missing, not the number.

### Motion

Four roles. `micro` for state changes on screen, `enter` for arrivals, `exit` for
departures, `emphasis` for changes that must be noticed. Exits are faster than entrances:
people wait for arrivals, not departures.

All four collapse to zero under `prefers-reduced-motion`.

---

## Tier 3: Component

Authored only for Button, Input, Card, Dialog, and Table: the components with a real
override need. Adding Tier 3 to every component is a maintenance tax most teams never
cash in.

The cascade is the point:

```css
/* Move every action surface in the system */
--dt-surface-action: var(--dt-color-primary-700);

/* Move only Button */
--dt-button-primary-bg: var(--dt-color-primary-700);
```

`input.css` is shared by Input, Textarea, Select, and Combobox so every field in a form
has identical geometry. A field 1px taller than its neighbour is the most visible failure
a design system can ship.

---

## Adding a token

1. Pick the tier. If it has a usage meaning, it is semantic. If it is a raw value, it is
   primitive. If only one component will ever read it, it is component.
2. Add it to `tokens/dovetail.tokens.json` first, because a semantic `$value` must be a reference,
   never a literal.
3. Write the value in the DTCG type syntax for its `$type`, not as a CSS string. The file
   follows [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/):
   colours are `{ "colorSpace": "oklch", "components": [L, C, H] }` with an optional `alpha`,
   dimensions and durations are `{ "value", "unit" }` objects (`px`/`rem`, `ms`/`s`), easings are
   four-number `cubicBezier` arrays, and elevation levels are `shadow` composites. Tracking is a
   unitless `number` because DTCG dimension has no `em`; the CSS generator adds the unit.
4. Port it to the matching CSS file.
5. Add it to the relevant spec card so it is visible in the Design System tab.
6. If it is a colour, verify contrast against its pair before committing.
