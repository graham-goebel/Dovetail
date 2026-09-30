# OrderStatus

A timeline of an order's or a delivery's progress: completed steps with a check, the current step, and the steps still to come, with times and a line of detail. It can say an order is delayed or cancelled. It is presentational: it shows the steps and the current id you pass, and never tracks, polls or fetches anything.

## Use it when
- An order page, a confirmation email's web view or an account's order history shows where an order is.
- A delivery or a food order moves through a few known stages: ordered, packed, shipped, out for delivery, delivered.
- A return or refund moves through stages the customer waits on.

## Don't use it when
- The user moves through the steps themselves, as in a checkout. Use `Stepper`.
- The steps are a history of events with no fixed end (an activity feed). Use `List`.
- Progress is a percentage. Use `Progress`.

## Example
```jsx
<OrderStatus
  label="Order 1042 progress"
  current="shipped"
  steps={[
    { id: "ordered", label: "Ordered", time: "Sep 28, 10:42" },
    { id: "packed", label: "Packed", time: "Sep 28, 16:05" },
    { id: "shipped", label: "Shipped", time: "Sep 29, 08:30", description: "Left the Leeds depot" },
    { id: "out", label: "Out for delivery" },
    { id: "delivered", label: "Delivered", time: "Expected Oct 2" },
  ]}
/>

<OrderStatus label="Order 1042 progress" current="shipped" status="delayed" steps={steps} orientation="horizontal" />
```

## Variants
| Prop | What it is for |
|---|---|
| `status="active"` | Default. The current step is a ring with a filled centre in the action colour. |
| `status="delayed"` | The current step turns the warning colour with a "!" icon, its label takes warning text, and a warning `Badge` says "Delayed". |
| `status="cancelled"` | The current step turns the danger colour with a "×" icon and a "Cancelled" `Badge`; the steps after it fade, since they will not happen. |
| `statusText` | Replaces the badge text: "Delayed by weather", "Cancelled by you". |
| `orientation="vertical"` | Default. Markers down the inline start, joined by a line, text beside them. Best for order pages and anything with descriptions. |
| `orientation="horizontal"` | Markers across the top joined by a line, text under each. It turns vertical by itself when its box is narrower than every step's least width side by side (`--dt-order-status-step-min-width` each), so four or five steps collapse at 390px. It measures its own box, not the viewport, so it also collapses in a narrow column. |

Completed steps show a filled disc with a check, and the line after them takes the complete colour. Upcoming steps show an empty ring. A `current` that matches no step shows every step as upcoming.

## Composition
Stands on its own under an order heading, in a `Card` on an order page, or in a `Drawer` for a live order. Put order-level actions (track with carrier, cancel) in a `ButtonGroup` next to it, not inside it. `time` is display text: format dates in your app, in the customer's locale and time zone.

## Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-order-status-complete` (`--dt-surface-action`) and `--dt-order-status-on-complete` (`--dt-text-on-action`): a completed marker, its check, and the line after it.
- `--dt-order-status-current` (`--dt-surface-action`): the current step's ring and centre.
- `--dt-order-status-upcoming` (`--dt-border-strong`): an upcoming step's ring.
- `--dt-order-status-line` (`--dt-border-default`): the line between steps not yet reached.
- `--dt-order-status-delayed` (`--dt-surface-warning`), `--dt-order-status-on-delayed` (`--dt-text-on-warning`), `--dt-order-status-delayed-text` (`--dt-text-warning`).
- `--dt-order-status-cancelled` (`--dt-surface-danger`), `--dt-order-status-on-cancelled` (`--dt-text-on-danger`), `--dt-order-status-cancelled-text` (`--dt-text-danger`).
- `--dt-order-status-marker-size` (`--dt-size-icon-lg`), `--dt-order-status-line-width` (`--dt-border-width-strong`), `--dt-order-status-step-min-width` (`calc(var(--dt-size-control-lg) * 3)`).

Labels read `--dt-text-label-md-*` in `--dt-text-primary` (`--dt-text-secondary` upcoming), times `--dt-text-body-xs-*` in `--dt-text-tertiary`, descriptions `--dt-text-body-sm-*` in `--dt-text-secondary`. Marker colour changes use `--dt-motion-micro`, which is instant under `prefers-reduced-motion`.

## Accessibility
- An ordered list (`<ol>`) named by the required `label`, one `<li>` per step, in order.
- The current step has `aria-current="step"`; exactly one step has it when `current` matches.
- Completed steps begin with a visually hidden "Completed:" and upcoming ones with "Upcoming:", so the state is not carried by the icon and colour alone. A delayed or cancelled order says so in visible text (the badge).
- Markers and lines are decorative and hidden from assistive technology.

## Content
- Step labels are short, sentence case, and name a state: "Ordered", "Shipped", "Out for delivery", "Delivered".
- `time` is what happened when, or what is expected: "Sep 29, 08:30", "Expected Oct 2".
- `description` is one line of detail, no full stop: "Left the Leeds depot", "Handed to the courier".
