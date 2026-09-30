import React from "react";
import { Section } from "../primitives/Section.jsx";
import { ProductCard } from "../commerce/ProductCard.jsx";
import { EmptyState } from "../display/EmptyState.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The least width a card may take before the grid drops a column: three
   large controls, so a 390px phone still fits two cards side by side and a
   card never gets too thin for its name and price. */
const MIN_CARD = "calc(var(--dt-size-control-lg) * 3)";
const GAP = "var(--dt-space-inline-md)";

/* A header over a grid of ProductCards. columns is the count on a wide
   screen; each track is at least a share of the row and at least MIN_CARD,
   so the grid gives up columns as the width runs out and lands on two on a
   phone. */
export function ProductGridBlock({ eyebrow, title, lead, products = [], columns = 4, action, emptyState, level = 2, tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const n = [2, 3, 4].includes(columns) ? columns : 4;
  const hasHeader = !!(eyebrow || title || lead || action);
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {hasHeader && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", columnGap: "var(--dt-space-inline-lg)", rowGap: "var(--dt-space-stack-sm)" }}>
            {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} level={level} style={{ flex: "1 1 auto", minWidth: 0 }} />}
            {action && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)" }}>{action}</div>}
          </div>
        )}
        {products.length === 0 ? (
          emptyState || <EmptyState title="No products to show" description="Try another filter, or check back soon." />
        ) : (
          <ul
            role="list"
            style={{
              listStyle: "none", margin: 0, padding: 0,
              display: "grid", alignItems: "stretch",
              gap: `var(--dt-space-stack-lg) ${GAP}`,
              gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, max(${MIN_CARD}, calc((100% - ${n - 1} * ${GAP}) / ${n}))), 1fr))`,
            }}
          >
            {products.map(({ id, ...card }, i) => (
              <ProductCard key={id != null ? id : i} as="li" {...card} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
