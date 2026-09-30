import React from "react";
import { Section } from "../primitives/Section.jsx";
import { EmptyState } from "../display/EmptyState.jsx";
import { CartLine } from "../commerce/CartLine.jsx";
import { OrderSummary } from "../commerce/OrderSummary.jsx";
import { PromoCode } from "../commerce/PromoCode.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The summary column's width. The lines take the rest, and when they would
   get narrower than they are wide enough for, the summary wraps below them. */
const SUMMARY = "calc(var(--dt-size-media-min) * 1.375)";
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;

/* The cart page: the lines on the left, the summary on the right (sticky, so
   the checkout button stays in reach down a long cart), wrapping below the
   lines on a narrow screen. The block adds nothing up: lines, their totals
   and the summary's figures are the cart's, passed in as they are. */
export function CartBlock({
  eyebrow,
  title = "Your cart",
  lead,
  action,
  lines = [],
  summary,
  checkoutAction,
  promo,
  emptyState,
  level = 1,
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const empty = lines.length === 0;
  const s = summary || { lines: [], total: { amount: 0 } };
  const footer = (checkoutAction || promo || s.footer) ? (
    <>
      {promo && <PromoCode {...promo} />}
      {checkoutAction}
      {s.footer}
    </>
  ) : undefined;

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {(eyebrow || title || lead || action) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", columnGap: "var(--dt-space-inline-lg)", rowGap: "var(--dt-space-stack-sm)" }}>
            {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} level={level} style={{ flex: "1 1 auto", minWidth: 0 }} />}
            {action && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)" }}>{action}</div>}
          </div>
        )}

        {empty ? (
          emptyState || <EmptyState title="Your cart is empty" description="Items you add will show here." />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: scaled("--dt-layout-inline-section") }}>
            <ul
              role="list"
              style={{
                listStyle: "none", margin: 0, padding: 0,
                flex: `999 1 0`, minWidth: `min(100%, calc(${SUMMARY} * 1.25))`,
                borderBlockStart: "var(--dt-border-width-default) solid var(--dt-cart-line-divider)",
              }}
            >
              {lines.map(({ id, ...line }, i) => (
                <li key={id != null ? id : i}>
                  <CartLine divider {...line} />
                </li>
              ))}
            </ul>
            <div
              style={{
                flex: `1 1 ${SUMMARY}`, minWidth: 0,
                position: "sticky", insetBlockStart: "var(--dt-space-stack-lg)",
              }}
            >
              <OrderSummary headingLevel={level + 1 > 6 ? 6 : level + 1} {...s} footer={footer} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
