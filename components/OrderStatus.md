# OrderStatus

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [OrderStatus.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderStatus.jsx), [OrderStatus.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderStatus.d.ts), [OrderStatus.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/OrderStatus.md).

Live page: https://graham-goebel.github.io/Dovetail/components/OrderStatus.html

## Guidelines

A timeline of an order's or a delivery's progress: completed steps with a check, the current step, and the steps still to come, with times and a line of detail. It can say an order is delayed or cancelled. It is presentational: it shows the steps and the current id you pass, and never tracks, polls or fetches anything.

### Use it when
- An order page, a confirmation email's web view or an account's order history shows where an order is.
- A delivery or a food order moves through a few known stages: ordered, packed, shipped, out for delivery, delivered.
- A return or refund moves through stages the customer waits on.

### Don't use it when
- The user moves through the steps themselves, as in a checkout. Use `Stepper`.
- The steps are a history of events with no fixed end (an activity feed). Use `List`.
- Progress is a percentage. Use `Progress`.

### Example
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

### Variants
| Prop | What it is for |
|---|---|
| `status="active"` | Default. The current step is a ring with a filled centre in the action colour. |
| `status="delayed"` | The current step turns the warning colour with a "!" icon, its label takes warning text, and a warning `Badge` says "Delayed". |
| `status="cancelled"` | The current step turns the danger colour with a "×" icon and a "Cancelled" `Badge`; the steps after it fade, since they will not happen. |
| `statusText` | Replaces the badge text: "Delayed by weather", "Cancelled by you". |
| `orientation="vertical"` | Default. Markers down the inline start, joined by a line, text beside them. Best for order pages and anything with descriptions. |
| `orientation="horizontal"` | Markers across the top joined by a line, text under each. It turns vertical by itself when its box is narrower than every step's least width side by side (`--dt-order-status-step-min-width` each), so four or five steps collapse at 390px. It measures its own box, not the viewport, so it also collapses in a narrow column. |

Completed steps show a filled disc with a check, and the line after them takes the complete colour. Upcoming steps show an empty ring. A `current` that matches no step shows every step as upcoming.

### Composition
Stands on its own under an order heading, in a `Card` on an order page, or in a `Drawer` for a live order. Put order-level actions (track with carrier, cancel) in a `ButtonGroup` next to it, not inside it. `time` is display text: format dates in your app, in the customer's locale and time zone.

### Tokens
Tier 3, in `tokens/component/commerce.css`, colours repeated under `.dark`:
- `--dt-order-status-complete` (`--dt-surface-action`) and `--dt-order-status-on-complete` (`--dt-text-on-action`): a completed marker, its check, and the line after it.
- `--dt-order-status-current` (`--dt-surface-action`): the current step's ring and centre.
- `--dt-order-status-upcoming` (`--dt-border-strong`): an upcoming step's ring.
- `--dt-order-status-line` (`--dt-border-default`): the line between steps not yet reached.
- `--dt-order-status-delayed` (`--dt-surface-warning`), `--dt-order-status-on-delayed` (`--dt-text-on-warning`), `--dt-order-status-delayed-text` (`--dt-text-warning`).
- `--dt-order-status-cancelled` (`--dt-surface-danger`), `--dt-order-status-on-cancelled` (`--dt-text-on-danger`), `--dt-order-status-cancelled-text` (`--dt-text-danger`).
- `--dt-order-status-marker-size` (`--dt-size-icon-lg`), `--dt-order-status-line-width` (`--dt-border-width-strong`), `--dt-order-status-step-min-width` (`calc(var(--dt-size-control-lg) * 3)`).

Labels read `--dt-text-label-md-*` in `--dt-text-primary` (`--dt-text-secondary` upcoming), times `--dt-text-body-xs-*` in `--dt-text-tertiary`, descriptions `--dt-text-body-sm-*` in `--dt-text-secondary`. Marker colour changes use `--dt-motion-micro`, which is instant under `prefers-reduced-motion`.

### Accessibility
- An ordered list (`<ol>`) named by the required `label`, one `<li>` per step, in order.
- The current step has `aria-current="step"`; exactly one step has it when `current` matches.
- Completed steps begin with a visually hidden "Completed:" and upcoming ones with "Upcoming:", so the state is not carried by the icon and colour alone. A delayed or cancelled order says so in visible text (the badge).
- Markers and lines are decorative and hidden from assistive technology.

### Content
- Step labels are short, sentence case, and name a state: "Ordered", "Shipped", "Out for delivery", "Delivered".
- `time` is what happened when, or what is expected: "Sep 29, 08:30", "Expected Oct 2".
- `description` is one line of detail, no full stop: "Left the Leeds depot", "Handed to the courier".

## Props

```ts
import * as React from "react";

/** One stage of an order or delivery. */
export interface OrderStatusStep {
  /** Unique id, matched against current. */
  id: string;
  /** The stage: "Ordered", "Shipped", "Out for delivery", "Delivered". */
  label: string;
  /** When it happened or is expected, as display text: "Sep 28, 10:42", "Expected Oct 2". */
  time?: string;
  /** A line of detail: "Left the Leeds depot". */
  description?: string;
}

/** A timeline of an order's progress: completed steps with checks, the current step, and the ones to come. */
export interface OrderStatusProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The stages, in order. */
  steps: OrderStatusStep[];
  /** id of the step the order is at. Steps before it show as completed, after it as upcoming. */
  current: string;
  /** delayed and cancelled change the current step's colour and icon and add a badge saying so. @default "active" */
  status?: "active" | "delayed" | "cancelled";
  /** horizontal turns vertical by itself when its box is narrower than every step's least width side by side. @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Accessible name of the list, e.g. "Order 1042 progress". */
  label: string;
  /** Replaces the badge text for a delayed or cancelled order. @default "Delayed" or "Cancelled" */
  statusText?: string;
}

export declare function OrderStatus(props: OrderStatusProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-order-status-cancelled` | component | `var(--dt-surface-danger)` |
| `--dt-order-status-cancelled-text` | component | `var(--dt-text-danger)` |
| `--dt-order-status-complete` | component | `var(--dt-surface-action)` |
| `--dt-order-status-current` | component | `var(--dt-surface-action)` |
| `--dt-order-status-delayed` | component | `var(--dt-surface-warning)` |
| `--dt-order-status-delayed-text` | component | `var(--dt-text-warning)` |
| `--dt-order-status-line` | component | `var(--dt-border-default)` |
| `--dt-order-status-line-width` | component | `var(--dt-border-width-strong)` |
| `--dt-order-status-marker-size` | component | `var(--dt-size-icon-lg)` |
| `--dt-order-status-on-cancelled` | component | `var(--dt-text-on-danger)` |
| `--dt-order-status-on-complete` | component | `var(--dt-text-on-action)` |
| `--dt-order-status-on-delayed` | component | `var(--dt-text-on-warning)` |
| `--dt-order-status-step-min-width` | component | `calc(var(--dt-size-control-lg) * 3)` |
| `--dt-order-status-upcoming` | component | `var(--dt-border-strong)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";
import { Badge } from "../display/Badge.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* Measuring the width happens before paint in the browser. On the server
   there is nothing to measure, and React warns about the layout hook there. */
const useMeasureEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

const ICONS = {
  check: ["M20 6 9 17l-5-5"],
  alert: ["M12 7v6", "M12 17h.01"],
  cross: ["M18 6 6 18", "m6 6 12 12"],
};

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)" }}
    >
      {ICONS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const STATUS_TEXT = { delayed: "Delayed", cancelled: "Cancelled" };

/* complete: a filled disc with a check. current: a ring with a filled centre,
   or for a delayed or cancelled order a filled disc with ! or ×. upcoming:
   an empty ring. */
function Marker({ state, status }) {
  const box = {
    display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxSizing: "border-box",
    width: "var(--dt-order-status-marker-size)", height: "var(--dt-order-status-marker-size)",
    borderRadius: "var(--dt-radius-pill)",
    transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
  };
  const ring = (color) => ({ ...box, border: `var(--dt-order-status-line-width) solid ${color}`, background: "var(--dt-surface-base)" });
  if (state === "complete") {
    return <span style={{ ...box, background: "var(--dt-order-status-complete)", color: "var(--dt-order-status-on-complete)" }}><Icon name="check" /></span>;
  }
  if (state === "current" && status === "delayed") {
    return <span style={{ ...box, background: "var(--dt-order-status-delayed)", color: "var(--dt-order-status-on-delayed)" }}><Icon name="alert" /></span>;
  }
  if (state === "current" && status === "cancelled") {
    return <span style={{ ...box, background: "var(--dt-order-status-cancelled)", color: "var(--dt-order-status-on-cancelled)" }}><Icon name="cross" /></span>;
  }
  if (state === "current") {
    return (
      <span style={ring("var(--dt-order-status-current)")}>
        <span style={{ width: "50%", height: "50%", borderRadius: "var(--dt-radius-pill)", background: "var(--dt-order-status-current)" }} />
      </span>
    );
  }
  return <span style={ring("var(--dt-order-status-upcoming)")} />;
}

export function OrderStatus({
  steps = [],
  current,
  status = "active",
  orientation = "vertical",
  label,
  statusText,
  style,
  ...rest
}) {
  const rootRef = React.useRef(null);
  const probeRef = React.useRef(null);
  const [fits, setFits] = React.useState(true);
  const wantsRow = orientation === "horizontal";

  /* A horizontal timeline needs every step's least width side by side. When
     the box is narrower than that it turns vertical, and turns back when it
     widens. The least width is a token, read off a hidden probe. */
  useMeasureEffect(() => {
    if (!wantsRow) return undefined;
    const el = rootRef.current;
    const probe = probeRef.current;
    if (!el || !probe) return undefined;
    const measure = () => setFits(el.clientWidth >= probe.offsetWidth * Math.max(steps.length, 1));
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wantsRow, steps.length]);

  const row = wantsRow && fits;
  const at = steps.findIndex((s) => s.id === current);
  const worded = status === "delayed" || status === "cancelled";
  const tone = status === "delayed" ? "warning" : "danger";
  const statusColor = status === "delayed" ? "var(--dt-order-status-delayed-text)" : "var(--dt-order-status-cancelled-text)";

  return (
    <div ref={rootRef} data-orientation={row ? "horizontal" : "vertical"} style={{ position: "relative", minWidth: 0, ...style }} {...rest}>
      {wantsRow && (
        <span
          ref={probeRef}
          aria-hidden="true"
          style={{ position: "absolute", visibility: "hidden", height: 0, overflow: "hidden", width: "var(--dt-order-status-step-min-width)" }}
        />
      )}
      {/* role="list" keeps the list a list in Safari, which drops the role
          from a list with list-style: none. */}
      <ol
        role="list"
        aria-label={label}
        style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: row ? "row" : "column" }}
      >
        {steps.map((step, i) => {
          const state = at < 0 || i > at ? "upcoming" : i < at ? "complete" : "current";
          const last = i === steps.length - 1;
          const lineColor = i < at ? "var(--dt-order-status-complete)" : "var(--dt-order-status-line)";
          const isCurrent = state === "current";
          const labelColor = state === "upcoming"
            ? status === "cancelled" ? "var(--dt-text-tertiary)" : "var(--dt-text-secondary)"
            : isCurrent && worded ? statusColor : "var(--dt-text-primary)";

          const text = (
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", paddingBlockEnd: !row && !last ? "var(--dt-space-stack-lg)" : 0, paddingInlineEnd: row ? "var(--dt-space-inline-sm)" : 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
                <span
                  style={{
                    fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                    lineHeight: "var(--dt-text-label-md-line)", letterSpacing: "var(--dt-text-label-md-tracking)",
                    fontWeight: isCurrent ? "var(--dt-font-weight-semibold)" : "var(--dt-text-label-md-weight)",
                    color: labelColor,
                  }}
                >
                  {state === "complete" && <VisuallyHidden>Completed: </VisuallyHidden>}
                  {state === "upcoming" && <VisuallyHidden>Upcoming: </VisuallyHidden>}
                  {step.label}
                </span>
                {isCurrent && worded && <Badge tone={tone}>{statusText || STATUS_TEXT[status]}</Badge>}
              </span>
              {step.time && (
                <span style={{ fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                  {step.time}
                </span>
              )}
              {step.description && (
                <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>
                  {step.description}
                </span>
              )}
            </div>
          );

          if (row) {
            return (
              <li key={step.id} aria-current={isCurrent ? "step" : undefined} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
                <span aria-hidden="true" style={{ display: "flex", alignItems: "center" }}>
                  <Marker state={state} status={status} />
                  {!last && <span style={{ flex: 1, height: "var(--dt-order-status-line-width)", marginInline: "var(--dt-space-inline-xs)", borderRadius: "var(--dt-radius-pill)", background: lineColor }} />}
                </span>
                {text}
              </li>
            );
          }
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              style={{ display: "grid", gridTemplateColumns: "var(--dt-order-status-marker-size) minmax(0, 1fr)", columnGap: "var(--dt-space-inline-sm)" }}
            >
              <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Marker state={state} status={status} />
                {!last && <span style={{ flex: 1, width: "var(--dt-order-status-line-width)", marginBlock: "var(--dt-space-stack-2xs)", borderRadius: "var(--dt-radius-pill)", background: lineColor }} />}
              </span>
              {text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```
