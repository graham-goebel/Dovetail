# ProductGridBlock

A page section with a header over a responsive grid of `ProductCard`s. Reach for it for a collection page, search results, or a "You may also like" row under a product.

## Use it when
- A page shows a set of products to browse: a collection, a category, results, related products.
- The products are the section's point and each links to its own page.

## Don't use it when
- There is one product to sell. Use `ProductDetailBlock`.
- The items are dishes on a menu. Use `MenuSection` with `MenuItem`.
- The grid is not products (features, articles). Use `FeatureGridBlock`, or a `Grid` of `Card`s.

## Example
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

## Variants
| Prop | What it is for |
| --- | --- |
| `columns` 4 (default) | A shop or collection grid. |
| `columns` 3 or 2 | A short editorial row, such as related products under a product page. |
| `emptyState` | Shown when `products` is empty: a filter that matched nothing, a collection not stocked yet. Defaults to an `EmptyState`, "No products to show". |
| `action` | Sits at the end of the header row: a "View all" `Link`, a sort `Select`. It wraps under the header on a phone. |

`columns` is the count on a wide screen. Every card keeps a least width (three large controls), so the grid drops columns as the width runs out and shows two cards side by side on a 390px phone.

## Composition
A `Section` holding a `BlockHeader` and a `<ul>` of `ProductCard`s, each rendered as the list item (`as="li"`). Each entry of `products` is spread into a `ProductCard`, so every `ProductCard` prop is available (`badge`, `swatches`, `soldOut`, `action`, `onQuickAdd`, `ratio`, `layout`); `id` is the React key and is not passed on. Stack it with other blocks: it takes the same `tone`, `dark`, `texture`, `spacing` and `width` props as every block.

## Title size
Set `titleSize` to move the title along the type scale, from `display-lg` down to `heading-md`. It defaults to `heading-lg`. Only its size changes: the heading level stays what the block renders.

## Tokens
Has none of its own. The gap between the header and the grid is `--dt-layout-module-gap`, so the Configure sheet's module spacing reaches it; the grid gaps are `--dt-space-stack-lg` and `--dt-space-inline-md`. The cards read the `--dt-card-*` and `--dt-product-*` tokens through `ProductCard`.

## Accessibility
- A `<section>` whose title is an `h2` by default; set `level` to fit the page outline (`1` on a collection page with no other h1).
- The grid is a list (`role="list"`, kept under `list-style: none`), so a screen reader announces how many products there are.
- Give every product an `href`: the card is then one link, named by the product, with the quick-add button and action as separate tab stops.
- Image alt text describes the photo, not the name, which is already read. Pass `alt: ""` when the photo would only repeat it.

## Content
- Title in sentence case, a few words: "New this season", "You may also like".
- One ratio and one add affordance across a grid, or the rows go ragged.
- An empty state says what to do next: clear a filter, browse another collection.
