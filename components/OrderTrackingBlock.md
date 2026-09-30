# OrderTrackingBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [OrderTrackingBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/OrderTrackingBlock.jsx), [OrderTrackingBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/OrderTrackingBlock.d.ts), [OrderTrackingBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/OrderTrackingBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/OrderTrackingBlock.html

## Guidelines

The screen after checkout: when the order arrives, how far it has got, a map, who is bringing it, and what was ordered. Two columns when there is room (progress on the left, the order on the right), one on a phone.

### Use it when
- Tracking a delivery or collection order in the minutes after it is placed.

### Don't use it when
- It is a parcel over days with no courier. Use `OrderStatus` with `CartLine`s and an `OrderSummary` on an order page.
- It is the order history. Use a `List` of orders that each link here.

### Example
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

### Variants
| Prop | What it is for |
|---|---|
| `status.status` | `delayed` or `cancelled` turn the current step amber or red with a badge; change `title` and `eta` to say what happens next. |
| `map` | A live map from your provider, filling the 16:10 slot. Without it the slot shows a drawn street map in the system's colours with the courier placed along the route by the current step. |
| `courier` | The courier's card. Leave it out before one is assigned. `onCall` and `onMessage` each add a button. |
| `help` | A "Get help" `Link`, a cancel `Button`: whatever goes under the order. |

### Composition
A `Section`, like every block, taking `tone`, `dark`, `spacing` and `width`. It composes `OrderStatus`, `Avatar`, `IconButton`, read-only compact `CartLine`s and `OrderSummary`. Everything is data: your app polls the order and passes the next `status`, `eta` and `title`.

### Tokens
None of its own. The courier card reads the card tokens (`--dt-card-bg`, `--dt-card-fg`, `--dt-card-border-*`, `--dt-card-radius`) with `--dt-space-inset-md` padding; the map slot `--dt-radius-container`, `--dt-border-subtle` and `--dt-surface-sunken`. The drawn map uses `--dt-surface-sunken`, `--dt-surface-base`, `--dt-surface-success-subtle`, `--dt-surface-info-subtle`, `--dt-surface-inverse` and `--dt-surface-action`, so it follows the theme and dark mode. Columns split at the same point as `HeroBlock`, with `--dt-layout-module-gap` between rows.

### Accessibility
- The title and ETA sit in a polite live region, so a change ("Your order is running late") is announced.
- `OrderStatus` is an ordered list named "Order progress" with one step `aria-current="step"`.
- The Call and Message buttons are named after the courier: "Call Sam", "Message Sam".
- The drawn map is decoration and hidden from assistive technology; the ETA and status say everything it shows. A live map you pass is yours to label.

### Content
- Title says the state in plain words: "Your order is on its way", "Your order is running late".
- ETA is a window, not a countdown: "Arriving 7:45–7:55 pm".
- The courier's first name only, and the vehicle as the courier would describe it.

## Props

```ts
import * as React from "react";
import type { OrderStatusProps } from "../commerce/OrderStatus";
import type { CartLineProps } from "../commerce/CartLine";
import type { OrderSummaryProps } from "../commerce/OrderSummary";

/** The person bringing the order. */
export interface OrderTrackingCourier {
  /** Their first name, as the app shows it: "Sam". Also goes into the Call and Message buttons' names. */
  name: string;
  /** Their picture. Without src, Avatar shows the initials of name. */
  avatar?: { src?: string; name: string };
  /** How they travel, shown under the name: "Blue e-bike · KX12". */
  vehicle?: string;
  /** Shows a Call IconButton, named `Call ${name}`. */
  onCall?: () => void;
  /** Shows a Message IconButton, named `Message ${name}`. */
  onMessage?: () => void;
  /** Replaces the Call button's accessible name. @default `Call ${name}` */
  callLabel?: string;
  /** Replaces the Message button's accessible name. @default `Message ${name}` */
  messageLabel?: string;
}

/** After checkout: the ETA and progress, a map slot, the courier and the order, in two columns when there is room. */
export interface OrderTrackingBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The page's heading: "Your order is on its way". Announced politely when it changes. */
  title?: React.ReactNode;
  /** When it arrives, as display text: "Arriving 7:45–7:55 pm". Shown under the title and announced with it. */
  eta?: string;
  /** The progress timeline, passed to OrderStatus. Its label defaults to "Order progress". */
  status: Omit<OrderStatusProps, "label"> & { label?: string };
  /** Shows a card with the courier's Avatar, name, vehicle, and Message and Call buttons. */
  courier?: OrderTrackingCourier;
  /** A live map. The system ships none: without it the slot shows an illustrated street map with the courier along the route. */
  map?: React.ReactNode;
  /** The order's lines, shown read-only and compact (CartLine readOnly, size sm). */
  lines?: CartLineProps[];
  /** The money breakdown, passed to OrderSummary. Its headingLevel defaults to one below the title. */
  summary?: OrderSummaryProps;
  /** Under the order: a "Get help" Link, a cancel Button. */
  help?: React.ReactNode;
  /** Heading over the lines. @default "Your order" */
  orderTitle?: string;
  /** The small line over the courier's name. @default "Your courier" */
  courierLabel?: string;
  /** Level of the title's heading; the order's headings are one below. @default 1 */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  /** ISO 4217 currency code for the lines and summary that do not set their own. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the lines and summary that do not set their own. Set it when server rendering. */
  locale?: string;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function OrderTrackingBlock(props: OrderTrackingBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-card-bg` | component | `var(--dt-surface-raised)` |
| `--dt-card-border-color` | component | `var(--dt-border-default)` |
| `--dt-card-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-card-fg` | component | `var(--dt-text-primary)` |
| `--dt-card-radius` | component | `var(--dt-radius-container)` |
| `--dt-border-default` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-2xl` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-info-subtle` | semantic | `var(--dt-color-cyan-050)` |
| `--dt-surface-inverse` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-success-subtle` | semantic | `var(--dt-color-green-050)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { AspectRatio } from "../content/AspectRatio.jsx";
import { Avatar } from "../display/Avatar.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { OrderStatus } from "../commerce/OrderStatus.jsx";
import { CartLine } from "../commerce/CartLine.jsx";
import { OrderSummary } from "../commerce/OrderSummary.jsx";

const ICONS = {
  phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"],
  message: ["M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }}
    >
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/* The route on the placeholder map, store to door, and a point along it. */
const ROUTE = [[44, 164], [44, 116], [132, 116], [132, 68], [236, 68], [236, 40], [276, 40]];
function along(p) {
  const segs = ROUTE.slice(1).map((pt, i) => [ROUTE[i], pt, Math.hypot(pt[0] - ROUTE[i][0], pt[1] - ROUTE[i][1])]);
  let left = Math.max(0, Math.min(1, p)) * segs.reduce((s, x) => s + x[2], 0);
  for (const [a, b, len] of segs) {
    if (left <= len) return [a[0] + ((b[0] - a[0]) * left) / len, a[1] + ((b[1] - a[1]) * left) / len];
    left -= len;
  }
  return ROUTE[ROUTE.length - 1];
}

/* A drawn street map in the system's colours, standing in for a live map.
   It says nothing a sighted reader needs, so it is hidden from assistive
   technology; the status and the ETA carry the information. */
function MapPlaceholder({ progress }) {
  const [cx, cy] = along(progress);
  const pts = ROUTE.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
      <rect width="320" height="200" style={{ fill: "var(--dt-surface-sunken)" }} />
      <rect x="160" y="96" width="96" height="64" rx="8" style={{ fill: "var(--dt-surface-success-subtle)" }} />
      <path d="M0 184 C 80 176, 120 196, 200 188 S 300 176, 320 182 L 320 200 L 0 200 Z" style={{ fill: "var(--dt-surface-info-subtle)" }} />
      <g style={{ stroke: "var(--dt-surface-base)", fill: "none", strokeLinecap: "round" }}>
        <path d="M0 116 H320 M0 68 H320 M44 0 V200 M132 0 V200 M236 0 V200" strokeWidth="12" />
        <path d="M0 24 H320 M0 150 H320 M88 0 V200 M184 0 V200 M284 0 V200" strokeWidth="5" />
      </g>
      <polyline points={pts} fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--dt-surface-action)" }} />
      <circle cx="44" cy="164" r="9" style={{ fill: "var(--dt-surface-inverse)" }} />
      <circle cx="44" cy="164" r="3.5" style={{ fill: "var(--dt-surface-base)" }} />
      <path d="M276 22 a12 12 0 0 1 12 12 c0 9 -12 20 -12 20 s-12 -11 -12 -20 a12 12 0 0 1 12 -12 z" style={{ fill: "var(--dt-surface-action)" }} />
      <circle cx="276" cy="34" r="4.5" style={{ fill: "var(--dt-surface-base)" }} />
      <circle cx={cx} cy={cy} r="11" style={{ fill: "var(--dt-surface-base)", stroke: "var(--dt-surface-action)" }} strokeWidth="3" />
      <circle cx={cx} cy={cy} r="4.5" style={{ fill: "var(--dt-surface-action)" }} />
    </svg>
  );
}

/* After checkout: when it arrives, where it has got to, who is bringing it,
   and what was ordered. Two columns when there is room (progress on the
   left, the order on the right), one on a phone. */
export function OrderTrackingBlock({
  title,
  eta,
  status,
  courier,
  map,
  lines = [],
  summary,
  help,
  orderTitle = "Your order",
  courierLabel = "Your courier",
  headingLevel = 1,
  currency,
  locale,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const level = Math.min(Math.max(Math.round(headingLevel) || 1, 1), 5);
  const steps = (status && status.steps) || [];
  const at = Math.max(0, steps.findIndex((s) => s.id === (status && status.current)));
  const progress = steps.length > 1 ? at / (steps.length - 1) : 0;
  const card = {
    boxSizing: "border-box", minWidth: 0,
    padding: "var(--dt-space-inset-md)",
    background: "var(--dt-card-bg)", color: "var(--dt-card-fg)",
    border: "var(--dt-card-border-width) solid var(--dt-card-border-color)",
    borderRadius: "var(--dt-card-radius)",
  };
  const round = { boxShadow: "inset 0 0 0 var(--dt-border-width-default) var(--dt-border-default)" };

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "var(--dt-layout-module-gap) var(--dt-space-inline-2xl)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)", minWidth: 0 }}>
          {(title || eta) && (
            <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
              {title && <Heading level={level} size="heading-lg" balance>{title}</Heading>}
              {eta && <Text variant="lead" tone="secondary">{eta}</Text>}
            </div>
          )}
          {status && <OrderStatus label="Order progress" {...status} />}
          <AspectRatio
            ratio={1.6}
            style={{ borderRadius: "var(--dt-radius-container)", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)", background: "var(--dt-surface-sunken)" }}
          >
            {map || <MapPlaceholder progress={progress} />}
          </AspectRatio>
          {courier && (
            <div style={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-sm)" }}>
              <Avatar name={(courier.avatar && courier.avatar.name) || courier.name} src={courier.avatar && courier.avatar.src} size="lg" />
              {/* The name keeps room for a few words; below that the buttons wrap under it. */}
              <div style={{ flex: "1 1 calc(3 * var(--dt-size-control-lg))", minWidth: 0, display: "flex", flexDirection: "column" }}>
                <Text variant="small" tone="tertiary">{courierLabel}</Text>
                <Text variant="label" weight="semibold" style={{ overflowWrap: "anywhere" }}>{courier.name}</Text>
                {courier.vehicle && <Text variant="small" tone="secondary" style={{ overflowWrap: "anywhere" }}>{courier.vehicle}</Text>}
              </div>
              {(courier.onCall || courier.onMessage) && (
                <div style={{ flex: "none", display: "flex", gap: "var(--dt-space-inline-xs)", marginInlineStart: "auto" }}>
                  {courier.onMessage && (
                    <IconButton label={courier.messageLabel || `Message ${courier.name}`} onClick={courier.onMessage} style={round}><Icon name="message" /></IconButton>
                  )}
                  {courier.onCall && (
                    <IconButton label={courier.callLabel || `Call ${courier.name}`} onClick={courier.onCall} style={round}><Icon name="phone" /></IconButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)", minWidth: 0 }}>
          {lines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
              <Heading level={level + 1} size="heading-sm">{orderTitle}</Heading>
              <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, minWidth: 0 }}>
                {lines.map((line, i) => (
                  <li key={line.name + i} style={{ minWidth: 0 }}>
                    <CartLine currency={currency} locale={locale} size="sm" {...line} readOnly divider={i < lines.length - 1} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary && <OrderSummary currency={currency} locale={locale} headingLevel={level + 1} {...summary} />}
          {help && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)", alignItems: "center" }}>{help}</div>}
        </div>
      </div>
    </Section>
  );
}
```
