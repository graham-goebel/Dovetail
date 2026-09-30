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
