# Rating

A star rating: a read-only display of an average, with half stars and a review count, or, given `onChange`, a radio group the user sets.

## Use it when
- Showing a product's, a place's or a dish's average review score (display).
- Asking the user to score something on a short scale, in a review form (input).

## Don't use it when
- The scale is not a quality score. Use `Progress` for completion and levels.
- You need more than about ten steps, or labelled options ("Poor", "Fair", "Good"). Use `RadioGroup` or `Slider`.
- The score is the thing being read closely, as in a review summary table. Show the number in `Text` beside the stars too.

## Example
```jsx
{/* Display: "4.5 out of 5 stars, 128 reviews" */}
<Rating value={4.4} count={128} />

{/* Input: a radio group named "Your rating" */}
<Rating label="Your rating" value={stars} onChange={setStars} size="lg" />
```

## Variants
| Mode | How you get it | What it renders |
|---|---|---|
| Display | No `onChange` | `role="img"`. `value` is rounded to the nearest half star. `count` shows "(128)" after the stars. |
| Input | `onChange` and `label` | `role="radiogroup"` of whole stars, each `role="radio"`. Hovering previews a score. |

Sizes: `sm` (16px stars, for cards and dense lists), `md` (20px, default), `lg` (24px, a product page or review form). In an input each star sits in a control-sized box (24, 32 or 40px), so it is easy to hit.

`max` sets the number of stars (default 5).

## Composition
Inline. It sits beside a `Price` on a product card, under a title in a `Card`, or in a `Field`-style row of a review form with a visible label. Other commerce components (product cards, menus) show their ratings with it in display mode.

## Tokens
Tier 3, in `tokens/component/commerce.css`, each repeated under `.dark`:
- `--dt-rating-color` (`--dt-surface-warning`): the filled star.
- `--dt-rating-empty-color` (`--dt-border-strong`): the unfilled part of the scale.
- `--dt-rating-count-color` (`--dt-text-secondary`): the review count.

Star sizes read `--dt-size-icon-sm|md|lg`; input boxes read `--dt-size-control-xs|sm|md`; the count reads `--dt-text-body-xs|sm|md-*`. A half star clips the filled glyph over the empty one in CSS, so it needs no SVG ids and follows the tokens into a dark band.

## Accessibility
- **Display:** one `role="img"` element named "4.5 out of 5 stars", plus ", 128 reviews" when `count` is given. The stars and the visible count are not read separately. Pass `label` to replace the name, for example to translate it.
- **Input:** `role="radiogroup"` named by the required `label` prop (the types make it required whenever `onChange` is present). Each star is `role="radio"` named "1 star", "2 stars"… with `aria-checked`.
- **Keyboard (input):** one tab stop, on the checked star (the first star when nothing is chosen). ArrowRight / ArrowUp choose the next star and ArrowLeft / ArrowDown the previous, wrapping at the ends; Home and End choose the first and last. Arrows follow reading direction inside `dir="rtl"`. Space or Enter chooses the focused star. Focus shows the system focus ring.
- Colour is not the only signal: filled and empty stars differ in colour, and the accessible name carries the number.

## Content
- An input's `label` names the question in sentence case: "Your rating", "Rate your order".
- Show `count` whenever you have it. Five stars from two reviews and from two thousand are not the same claim.
