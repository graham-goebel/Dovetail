# FulfilmentToggle

A segmented control for how an order reaches its buyer, delivery or pickup, with radio semantics and an optional detail line under each segment.

## Use it when
- A store page or checkout lets people switch between delivery and pickup, and the page's times and fees depend on the choice.
- There are two or three ways to receive an order: add "Dine in" through `options`.

## Don't use it when
- It switches views of content. Use `Tabs`.
- There are more than three choices, or the choices need descriptions. Use `RadioGroup`.
- It is an on/off setting. Use `Switch`.

## Example
```jsx
const [how, setHow] = React.useState("delivery");

<FulfilmentToggle
  label="How to get your order"
  value={how}
  onChange={setHow}
  options={[
    { value: "delivery", label: "Delivery", detail: "25–35 min" },
    { value: "pickup", label: "Pickup", detail: "Ready in 15" },
  ]}
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `options` | The segments. Defaults to Delivery and Pickup with no detail. Each takes a `detail` line for a time or a fee. |
| `fullWidth` | On by default: the segments share the container's width, which is what a phone wants. `false` sizes it to its segments. |
| `disabled` | Turns every segment off, for a store that offers only one way. Prefer hiding the toggle when there is no choice. |

## Composition
Sits under the `StoreHeader` on a store page, or at the top of a checkout. Controlled: the choice lives in your app, which changes the `deliveryTime` and `deliveryFee` it passes to `StoreHeader` and the totals it shows.

## Tokens
Tier 3, in `tokens/component/commerce.css`; the colour ones are repeated under `.dark`:
- `--dt-fulfilment-track-bg` (`--dt-surface-sunken`), `--dt-fulfilment-thumb-bg` (`--dt-surface-raised`), `--dt-fulfilment-thumb-shadow` (`--dt-elevation-1`).
- `--dt-fulfilment-fg` (`--dt-text-secondary`), `--dt-fulfilment-fg-selected` (`--dt-text-primary`), `--dt-fulfilment-detail-color` (`--dt-text-tertiary`), `--dt-fulfilment-detail-color-selected` (`--dt-text-secondary`).
- `--dt-fulfilment-inset` (`--dt-space-inset-2xs`), `--dt-fulfilment-radius` (`--dt-radius-container`), `--dt-fulfilment-thumb-radius` (`--dt-radius-media`).

Each segment is at least `--dt-size-touch-target` tall. The label is `--dt-text-label-md-*`, semibold when chosen; the detail is `--dt-text-body-xs-*`. Motion is `--dt-motion-micro`, which is instant under reduced motion.

## Accessibility
- A `role="radiogroup"` named by the required `label`; each segment is a `role="radio"` button with `aria-checked`.
- One tab stop, on the chosen segment. The arrow keys move and choose together and wrap at the ends; Home and End jump to the first and last; in a right-to-left page the horizontal arrows follow the reading direction.
- The chosen segment is marked by a raised surface and a heavier label, and announced as checked.
- The detail line is part of each segment's name: "Delivery 25–35 min".

## Content
- Labels are one word, sentence case: "Delivery", "Pickup", "Dine in".
- Details are short and concrete: "25–35 min", "Ready in 15", "Free".
- The group `label` is a question or a noun phrase: "How to get your order".
