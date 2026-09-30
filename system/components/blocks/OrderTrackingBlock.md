# OrderTrackingBlock

The screen after checkout: when the order arrives, how far it has got, a map, who is bringing it, and what was ordered. Two columns when there is room (progress on the left, the order on the right), one on a phone.

## Use it when
- Tracking a delivery or collection order in the minutes after it is placed.

## Don't use it when
- It is a parcel over days with no courier. Use `OrderStatus` with `CartLine`s and an `OrderSummary` on an order page.
- It is the order history. Use a `List` of orders that each link here.

## Example
```jsx
<OrderTrackingBlock
  locale="en-US"
  title="Your order is on its way"
  eta="Arriving 7:45–7:55 pm"
  status={{ current: "on-the-way", steps: [
    { id: "placed", label: "Order placed", time: "7:12 pm" },
    { id: "preparing", label: "Preparing", time: "7:15 pm" },
    { id: "on-the-way", label: "On the way", description: "Sam picked it up at 7:31 pm" },
    { id: "delivered", label: "Delivered" },
  ] }}
  courier={{ name: "Sam", vehicle: "Blue e-bike", onCall: call, onMessage: message }}
  lines={[{ name: "Pad thai", details: ["Large", "Fried egg"], price: 16.5, quantity: 1 }]}
  summary={{ lines: [{ label: "Subtotal", amount: 16.5 }, { label: "Delivery", amount: 2.99 }], total: { amount: 19.49 } }}
  help={<Link href="/help">Get help with this order</Link>}
/>
```

## Variants
| Prop | What it is for |
|---|---|
| `status.status` | `delayed` or `cancelled` turn the current step amber or red with a badge; change `title` and `eta` to say what happens next. |
| `map` | A live map from your provider, filling the 16:10 slot. Without it the slot shows a drawn street map in the system's colours with the courier placed along the route by the current step. |
| `courier` | The courier's card. Leave it out before one is assigned. `onCall` and `onMessage` each add a button. |
| `help` | A "Get help" `Link`, a cancel `Button`: whatever goes under the order. |

## Composition
A `Section`, like every block, taking `tone`, `dark`, `spacing` and `width`. It composes `OrderStatus`, `Avatar`, `IconButton`, read-only compact `CartLine`s and `OrderSummary`. Everything is data: your app polls the order and passes the next `status`, `eta` and `title`.

## Tokens
None of its own. The courier card reads the card tokens (`--dt-card-bg`, `--dt-card-fg`, `--dt-card-border-*`, `--dt-card-radius`) with `--dt-space-inset-md` padding; the map slot `--dt-radius-container`, `--dt-border-subtle` and `--dt-surface-sunken`. The drawn map uses `--dt-surface-sunken`, `--dt-surface-base`, `--dt-surface-success-subtle`, `--dt-surface-info-subtle`, `--dt-surface-inverse` and `--dt-surface-action`, so it follows the theme and dark mode. Columns split at the same point as `HeroBlock`, with `--dt-layout-module-gap` between rows.

## Accessibility
- The title and ETA sit in a polite live region, so a change ("Your order is running late") is announced.
- `OrderStatus` is an ordered list named "Order progress" with one step `aria-current="step"`.
- The Call and Message buttons are named after the courier: "Call Sam", "Message Sam".
- The drawn map is decoration and hidden from assistive technology; the ETA and status say everything it shows. A live map you pass is yours to label.

## Content
- Title says the state in plain words: "Your order is on its way", "Your order is running late".
- ETA is a window, not a countdown: "Arriving 7:45–7:55 pm".
- The courier's first name only, and the vehicle as the courier would describe it.
