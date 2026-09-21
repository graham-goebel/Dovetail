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

Lowercase, hyphen-delimited, one convention throughout. Names are stable API — renaming
a token is a migration, so name it carefully the first time.

---

## Tier 1 — Primitive

### Colour

Seven ramps of eleven steps (`050`–`950`), all OKLCH.

`neutral` · `accent` · `green` · `amber` · `red` · `cyan` · `violet`

OKLCH because lightness is perceptually uniform. Step 600 in any ramp carries the same
visual weight, so a brand hue dropped into the accent ramp inherits the contrast behaviour
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
else. This is the one place the modular scale and the 4px grid are reconciled by hand —
forcing font sizes themselves onto 4px multiples produces a lumpy, unusable scale.

### Motion and elevation

Durations 0–600ms. Four easing curves: `standard`, `decelerate`, `accelerate`, `emphasis`.

Six raw shadows, each a two-layer recipe — a tight contact shadow plus a soft ambient one.
Single-layer shadows read as flat stickers once they get large.

---

## Tier 2 — Semantic

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

Plus `action-disabled`, which is shared — a disabled button looks the same regardless of
what variant it would otherwise be.

### Space

Three axes. `16px` does not say what the gap is for; `--dt-space-stack-md` does.

- `inset-*` — padding inside a container
- `stack-*` — vertical gap between blocks
- `inline-*` — horizontal gap between siblings

Naming the axis also lets a density theme retune one axis without touching the others.

### Size

Control heights on the 4px grid: 24 / 32 / 40 / 48. Icon sizes 12 / 16 / 20 / 24 / 32.
`--dt-size-touch-target` (44px) is the minimum hit area on touch surfaces.

### Shape

Radius is named by what it wraps: `control`, `container`, `overlay`, `media`, `pill`.
A square-cornered theme flattens the entire system by re-pointing five lines.

### Elevation

Six levels, and a z-index ladder to match. Keep every fixed-position layer on the ladder —
hand-picked z-index values are how overlay bugs start.

```
0 flush        3 sticky headers, dropdowns
1 cards        4 dialogs, drawers
2 hover, popovers   5 toasts
```

### Motion

Four roles. `micro` for state changes on screen, `enter` for arrivals, `exit` for
departures, `emphasis` for changes that must be noticed. Exits are faster than entrances:
people wait for arrivals, not departures.

All four collapse to zero under `prefers-reduced-motion`.

---

## Tier 3 — Component

Authored only for Button, Input, Card, Dialog, and Table — the components with a real
override need. Adding Tier 3 to every component is a maintenance tax most teams never
cash in.

The cascade is the point:

```css
/* Move every action surface in the system */
--dt-surface-action: var(--dt-color-accent-700);

/* Move only Button */
--dt-button-primary-bg: var(--dt-color-accent-700);
```

`input.css` is shared by Input, Textarea, Select, and Combobox so every field in a form
has identical geometry. A field 1px taller than its neighbour is the most visible failure
a design system can ship.

---

## Adding a token

1. Pick the tier. If it has a usage meaning, it is semantic. If it is a raw value, it is
   primitive. If only one component will ever read it, it is component.
2. Add it to `tokens/dovetail.tokens.json` first — a semantic `$value` must be a reference,
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
