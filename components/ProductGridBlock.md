# ProductGridBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [ProductGridBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductGridBlock.jsx), [ProductGridBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductGridBlock.d.ts), [ProductGridBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/ProductGridBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ProductGridBlock.html

## Guidelines

A page section with a header over a responsive grid of `ProductCard`s. Reach for it for a collection page, search results, or a "You may also like" row under a product.

### Use it when
- A page shows a set of products to browse: a collection, a category, results, related products.
- The products are the section's point and each links to its own page.

### Don't use it when
- There is one product to sell. Use `ProductDetailBlock`.
- The items are dishes on a menu. Use `MenuSection` with `MenuItem`.
- The grid is not products (features, articles). Use `FeatureGridBlock`, or a `Grid` of `Card`s.

### Example
```jsx
<ProductGridBlock
  eyebrow="Shop"
  title="New this season"
  lead="Glazed by hand in small batches."
  action={<Link href="/shop" underline="hover">View all</Link>}
  products={products.map((p) => ({
    id: p.handle,
    name: p.name,
    href: `/products/${p.handle}`,
    price: p.price,
    compareAt: p.compareAt,
    image: { src: p.image, alt: "" },
    onQuickAdd: () => addToCart(p),
  }))}
/>
```

### Variants
| Prop | What it is for |
| --- | --- |
| `columns` 4 (default) | A shop or collection grid. |
| `columns` 3 or 2 | A short editorial row, such as related products under a product page. |
| `emptyState` | Shown when `products` is empty: a filter that matched nothing, a collection not stocked yet. Defaults to an `EmptyState`, "No products to show". |
| `action` | Sits at the end of the header row: a "View all" `Link`, a sort `Select`. It wraps under the header on a phone. |

`columns` is the count on a wide screen. Every card keeps a least width (three large controls), so the grid drops columns as the width runs out and shows two cards side by side on a 390px phone.

### Composition
A `Section` holding a `BlockHeader` and a `<ul>` of `ProductCard`s, each rendered as the list item (`as="li"`). Each entry of `products` is spread into a `ProductCard`, so every `ProductCard` prop is available (`badge`, `swatches`, `soldOut`, `action`, `onQuickAdd`, `ratio`, `layout`); `id` is the React key and is not passed on. Stack it with other blocks: it takes the same `tone`, `dark`, `texture`, `spacing` and `width` props as every block.

### Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `heading-lg`. Only its size changes: the heading level stays what the block renders.

### Tokens
Has none of its own. The gap between the header and the grid is `--dt-layout-module-gap`, so the Configure sheet's module spacing reaches it; the grid gaps are `--dt-space-stack-lg` and `--dt-space-inline-md`. The cards read the `--dt-card-*` and `--dt-product-*` tokens through `ProductCard`.

### Accessibility
- A `<section>` whose title is an `h2` by default; set `level` to fit the page outline (`1` on a collection page with no other h1).
- The grid is a list (`role="list"`, kept under `list-style: none`), so a screen reader announces how many products there are.
- Give every product an `href`: the card is then one link, named by the product, with the quick-add button and action as separate tab stops.
- Image alt text describes the photo, not the name, which is already read. Pass `alt: ""` when the photo would only repeat it.

### Content
- Title in sentence case, a few words: "New this season", "You may also like".
- One ratio and one add affordance across a grid, or the rows go ragged.
- An empty state says what to do next: clear a filter, browse another collection.

## Props

```ts
import * as React from "react";
import type { ProductCardProps } from "../commerce/ProductCard";

/** One product in a ProductGridBlock: ProductCard's props, plus a stable id. */
export interface ProductGridItem extends ProductCardProps {
  /** A stable, unique id, such as the product's handle or SKU. It is the React key and is not rendered. */
  id: string;
}

/** A header over a responsive grid of ProductCards: a collection, search results, "You may also like". */
export interface ProductGridBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** The products, each spread into a ProductCard rendered as a list item. Give every one an href so the card is a link. */
  products: ProductGridItem[];
  /** Columns on a wide screen. Each card keeps a least width, so the grid gives up columns as the width runs out and shows two on a phone. @default 4 */
  columns?: 2 | 3 | 4;
  /** Beside the header, at its end: a "View all" Link, a sort Select. */
  action?: React.ReactNode;
  /** Shown instead of the grid when products is empty. @default an EmptyState, "No products to show" */
  emptyState?: React.ReactNode;
  /** The title's heading level, for the page outline. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function ProductGridBlock(props: ProductGridBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-layout-module-gap` | semantic | `var(--dt-space-stack-xl)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |

## Source

```jsx
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
export function ProductGridBlock({ eyebrow, title, titleSize = "heading-lg", lead, products = [], columns = 4, action, emptyState, level = 2, tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const n = [2, 3, 4].includes(columns) ? columns : 4;
  const hasHeader = !!(eyebrow || title || lead || action);
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)" }}>
        {hasHeader && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", columnGap: "var(--dt-space-inline-lg)", rowGap: "var(--dt-space-stack-sm)" }}>
            {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} level={level} style={{ flex: "1 1 auto", minWidth: 0 }} />}
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
```
