# Rating

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [Rating.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/Rating.jsx), [Rating.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/Rating.d.ts), [Rating.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/Rating.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Rating.html

## Guidelines

A star rating: a read-only display of an average, with half stars and a review count, or, given `onChange`, a radio group the user sets.

### Use it when
- Showing a product's, a place's or a dish's average review score (display).
- Asking the user to score something on a short scale, in a review form (input).

### Don't use it when
- The scale is not a quality score. Use `Progress` for completion and levels.
- You need more than about ten steps, or labelled options ("Poor", "Fair", "Good"). Use `RadioGroup` or `Slider`.
- The score is the thing being read closely, as in a review summary table. Show the number in `Text` beside the stars too.

### Example
```jsx
{/* Display: "4.5 out of 5 stars, 128 reviews" */}
<Rating value={4.4} count={128} />

{/* Input: a radio group named "Your rating" */}
<Rating label="Your rating" value={stars} onChange={setStars} size="lg" />
```

### Variants
| Mode | How you get it | What it renders |
|---|---|---|
| Display | No `onChange` | `role="img"`. `value` is rounded to the nearest half star. `count` shows "(128)" after the stars. |
| Input | `onChange` and `label` | `role="radiogroup"` of whole stars, each `role="radio"`. Hovering previews a score. |

Sizes: `sm` (16px stars, for cards and dense lists), `md` (20px, default), `lg` (24px, a product page or review form). In an input each star sits in a control-sized box (24, 32 or 40px), so it is easy to hit.

`max` sets the number of stars (default 5).

### Composition
Inline. It sits beside a `Price` on a product card, under a title in a `Card`, or in a `Field`-style row of a review form with a visible label. Other commerce components (product cards, menus) show their ratings with it in display mode.

### Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-rating-color` (`--dt-surface-warning`): the filled star.
- `--dt-rating-empty-color` (`--dt-border-strong`): the unfilled part of the scale.
- `--dt-rating-count-color` (`--dt-text-secondary`): the review count.

Star sizes read `--dt-size-icon-sm|md|lg`; input boxes read `--dt-size-control-xs|sm|md`; the count reads `--dt-text-body-xs|sm|md-*`. A half star clips the filled glyph over the empty one in CSS, so it needs no SVG ids and follows the tokens into a dark band.

### Accessibility
- **Display:** one `role="img"` element named "4.5 out of 5 stars", plus ", 128 reviews" when `count` is given. The stars and the visible count are not read separately. Pass `label` to replace the name, for example to translate it.
- **Input:** `role="radiogroup"` named by the required `label` prop (the types make it required whenever `onChange` is present). Each star is `role="radio"` named "1 star", "2 stars"… with `aria-checked`.
- **Keyboard (input):** one tab stop, on the checked star (the first star when nothing is chosen). ArrowRight / ArrowUp choose the next star and ArrowLeft / ArrowDown the previous, wrapping at the ends; Home and End choose the first and last. Arrows follow reading direction inside `dir="rtl"`. Space or Enter chooses the focused star. Focus shows the system focus ring.
- Colour is not the only signal: filled and empty stars differ in colour, and the accessible name carries the number.

### Content
- An input's `label` names the question in sentence case: "Your rating", "Rate your order".
- Show `count` whenever you have it. Five stars from two reviews and from two thousand are not the same claim.

## Props

```ts
import * as React from "react";

interface RatingBaseProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "role" | "children"> {
  /**
   * The rating, from 0 to max. A display rounds it to the nearest half star; an input
   * rounds it to a whole star. 0 in an input means nothing is chosen yet.
   */
  value: number;
  /** Number of stars in the scale. @default 5 */
  max?: number;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** BCP 47 locale for the numbers in the count and the accessible name. Defaults to the runtime's locale. */
  locale?: string;
}

/** A read-only star rating: role="img", named like "4.5 out of 5 stars, 128 reviews". */
export interface RatingDisplayProps extends RatingBaseProps {
  /** Omit onChange for a display. */
  onChange?: undefined;
  /** Number of reviews, shown as "(128)" after the stars and added to the accessible name. */
  count?: number;
  /** Replaces the generated accessible name, e.g. to translate it. */
  label?: string;
}

/** A star rating the user sets: a radio group of whole stars. */
export interface RatingInputProps extends RatingBaseProps {
  /** Called with the chosen number of stars, from 1 to max. Its presence makes the rating an input. */
  onChange: (value: number) => void;
  /** The radio group's accessible name, e.g. "Your rating". Required for an input. */
  label: string;
  /** The review count is display only. */
  count?: undefined;
}

/** A star rating: a display when onChange is absent, a radio-group input when it is given. */
export type RatingProps = RatingDisplayProps | RatingInputProps;

export declare function Rating(props: RatingProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-rating-color` | component | `var(--dt-surface-warning)` |
| `--dt-rating-count-color` | component | `var(--dt-text-secondary)` |
| `--dt-rating-empty-color` | component | `var(--dt-border-strong)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-control-md` | semantic | `var(--dt-dim-10)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-size-control-xs` | semantic | `var(--dt-dim-6)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-artboard-body-line` | semantic | `calc(var(--dt-line-height-md) * 2.35)` |
| `--dt-text-artboard-body-size` | semantic | `calc(var(--dt-font-size-md) * 2.5)` |
| `--dt-text-artboard-display-family` | semantic | `var(--dt-text-display-lg-family)` |
| `--dt-text-artboard-display-line` | semantic | `calc(var(--dt-line-height-7xl) * 2.55)` |
| `--dt-text-artboard-display-size` | semantic | `calc(var(--dt-font-size-7xl) * 2.8)` |
| `--dt-text-artboard-display-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-artboard-display-weight` | semantic | `var(--dt-text-display-lg-weight)` |
| `--dt-text-artboard-meta-size` | semantic | `calc(var(--dt-font-size-sm) * 2.2)` |
| `--dt-text-artboard-meta-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-artboard-title-line` | semantic | `calc(var(--dt-line-height-7xl) * 1.7)` |
| `--dt-text-artboard-title-size` | semantic | `calc(var(--dt-font-size-7xl) * 1.75)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |

## Source

```jsx
import React from "react";

/* A star on the 24-unit icon grid, filled and stroked with round joins so its
   points are softened the way the rest of the system's icons are. */
const STAR =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

/* The star, the box an input star sits in (a comfortable hit area), and the
   count's type role. */
const SIZES = {
  sm: { star: "var(--dt-size-icon-sm)", box: "var(--dt-size-control-xs)", text: "body-xs" },
  md: { star: "var(--dt-size-icon-md)", box: "var(--dt-size-control-sm)", text: "body-sm" },
  lg: { star: "var(--dt-size-icon-lg)", box: "var(--dt-size-control-md)", text: "body-md" },
};

function Glyph({ size }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size, maxWidth: "none" }}
    >
      <path d={STAR} />
    </svg>
  );
}

/* fill is 0, 0.5 or 1. A half star lays the filled glyph over the empty one
   and clips it to its inline-start half, so it needs no SVG ids, follows the
   colour tokens into a dark band, and fills from the right in RTL. */
function Star({ fill, size }) {
  return (
    <span style={{ position: "relative", display: "block", flex: "none", width: size, height: size }}>
      <span style={{ display: "block", color: fill === 1 ? "var(--dt-rating-color)" : "var(--dt-rating-empty-color)", transition: "color var(--dt-motion-micro)" }}>
        <Glyph size={size} />
      </span>
      {fill === 0.5 && (
        <span style={{ position: "absolute", insetBlockStart: 0, insetInlineStart: 0, width: "50%", height: "100%", overflow: "hidden", color: "var(--dt-rating-color)" }}>
          <Glyph size={size} />
        </span>
      )}
    </span>
  );
}

const fillFor = (shown, n) => (shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0);

export function Rating({ value = 0, max = 5, count, size = "md", onChange, label, locale, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(null);
  const refs = React.useRef([]);
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const num = React.useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);

  if (!onChange) {
    const rounded = Math.round(Math.min(Math.max(value, 0), max) * 2) / 2;
    const reviews = typeof count === "number" ? `, ${num.format(count)} ${count === 1 ? "review" : "reviews"}` : "";
    return (
      <span
        role="img"
        aria-label={label || `${num.format(rounded)} out of ${max} stars${reviews}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", verticalAlign: "middle", ...style }}
        {...rest}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {stars.map((n) => <Star key={n} fill={fillFor(rounded, n)} size={s.star} />)}
        </span>
        {typeof count === "number" && (
          <span
            style={{
              fontFamily: `var(--dt-text-${s.text}-family)`, fontSize: `var(--dt-text-${s.text}-size)`,
              lineHeight: `var(--dt-text-${s.text}-line)`, color: "var(--dt-rating-count-color)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ({num.format(count)})
          </span>
        )}
      </span>
    );
  }

  /* Input: a radio group of whole stars. The checked star is the one tab
     stop (the first when nothing is chosen yet); arrows move and select. */
  const selected = Math.min(Math.max(Math.round(value), 0), max);
  const shown = hover != null ? hover : selected;
  const tabStop = selected || 1;

  const choose = (n) => {
    const next = Math.min(Math.max(n, 1), max);
    if (next !== selected) onChange(next);
    const el = refs.current[next];
    if (el) el.focus();
  };

  const onKeyDown = (e, n) => {
    const rtl = !!(e.currentTarget.closest && e.currentTarget.closest('[dir="rtl"]'));
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = null;
    if (e.key === fwd || e.key === "ArrowUp") next = n >= max ? 1 : n + 1;
    else if (e.key === back || e.key === "ArrowDown") next = n <= 1 ? max : n - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = max;
    else if (e.key === " " || e.key === "Enter") next = n;
    if (next == null) return;
    e.preventDefault();
    choose(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHover(null)}
      style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", ...style }}
      {...rest}
    >
      {stars.map((n) => (
        <span
          key={n}
          ref={(el) => { refs.current[n] = el; }}
          role="radio"
          aria-checked={n === selected}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => choose(n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          onMouseEnter={() => setHover(n)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: s.box, height: s.box, borderRadius: "var(--dt-radius-control)", cursor: "pointer",
          }}
        >
          <Star fill={fillFor(shown, n)} size={s.star} />
        </span>
      ))}
    </div>
  );
}
```
