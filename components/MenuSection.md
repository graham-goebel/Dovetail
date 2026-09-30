# MenuSection

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Commerce family. Files: [MenuSection.jsx](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuSection.jsx), [MenuSection.d.ts](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuSection.d.ts), [MenuSection.md](https://graham-goebel.github.io/Dovetail/system/components/commerce/MenuSection.md).

Live page: https://graham-goebel.github.io/Dovetail/components/MenuSection.html

## Guidelines

A titled group of menu items, such as "Starters" or "Noodles", laid out as a list or as a grid of cards.

### Use it when
- Showing a menu category on a store page, one section per category, in the kitchen's order.
- A category nav or a list of chips should be able to jump to a category: give each section an `id`.

### Don't use it when
- The items are not dishes or products with a price. Use `List` or `Grid`.
- It is a page section of a landing page. Use `Section` and a block.

### Example
```jsx
<MenuSection id="noodles" title="Noodles" description="All noodles can be made with tofu instead of egg.">
  <MenuItem name="Pad thai" price={12.5} onAdd={() => openOptions("pad-thai")} />
  <MenuItem name="Pad see ew" price={12} onAdd={() => openOptions("see-ew")} />
</MenuSection>

<MenuSection title="Popular" layout="grid">…</MenuSection>
```

### Variants
| Prop | What it is for |
|---|---|
| `layout="list"` | Default. Dishes stacked with dividers between them: the phone layout, and any narrow column. |
| `layout="grid"` | Dishes as cards, two up when each column can be at least `--dt-menu-grid-min` wide, one up on a phone. For a wide screen, where a list would put the thumbnail far from the name. |
| `headingLevel` | The heading level, 2 by default. Each `MenuItem` name is set one level below. |

### Composition
Holds `MenuItem`s as its children. It passes `layout` and a `headingLevel` one below its own to each `MenuItem` that does not set them. Other children are allowed and are wrapped in list items the same way. Sections follow the `StoreHeader` and `FulfilmentToggle` on a store page, inside an `AppShell` on a phone.

### Tokens
Tier 3, in `tokens/component/commerce.css`:
- `--dt-menu-section-gap` (`--dt-space-stack-sm`): between the heading and the dishes.
- `--dt-menu-item-divider` (`--dt-border-subtle`, repeated under `.dark`): the rule between dishes in a list.
- `--dt-menu-grid-min` (0.4 × `--dt-size-container-narrow`): the narrowest a grid column may be.

The title is `--dt-text-heading-sm-*`; the description `--dt-text-body-sm-*` in `--dt-text-secondary`.

### Accessibility
- The title is a heading (`h2` by default), so people can move between categories by heading.
- The dishes are a list (`role="list"`, kept explicit because the list style is removed), so a screen reader says how many dishes the section holds.
- The `id` sits on the `<section>`, so an in-page link moves focus and scroll to it.

### Content
- Titles are the category's name, sentence case, one to three words: "Starters", "Noodles and rice".
- The description is one line and says something that applies to every dish: a side that comes with them, a swap on offer.

## Props

```ts
import * as React from "react";

/** A titled group of menu items: "Starters", "Noodles", "Drinks". */
export interface MenuSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The section's heading. */
  title: string;
  /** One line under the heading: "Served with jasmine rice". */
  description?: string;
  /** id of the section element, the anchor a category nav links to (href="#noodles"). */
  id?: string;
  /**
   * list: dishes stacked with dividers, the phone layout. grid: dishes as cards, two
   * up when there is room and one up on a phone. Passed on to each MenuItem child.
   * @default "list"
   */
  layout?: "list" | "grid";
  /** Level of the heading element. Each MenuItem's name is one level below. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  /** The MenuItems. Each becomes an item of a list, so its count is announced. */
  children?: React.ReactNode;
}

export declare function MenuSection(props: MenuSectionProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-menu-grid-min` | component | `calc(0.4 * var(--dt-size-container-narrow))` |
| `--dt-menu-item-divider` | component | `var(--dt-border-subtle)` |
| `--dt-menu-section-gap` | component | `var(--dt-space-stack-sm)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-text-artboard-body-line` | semantic | `calc(var(--dt-line-height-md) * 2.35)` |
| `--dt-text-artboard-body-size` | semantic | `calc(var(--dt-font-size-md) * 2.5)` |
| `--dt-text-artboard-display-family` | semantic | `var(--dt-text-display-lg-family)` |
| `--dt-text-artboard-display-line` | semantic | `calc(var(--dt-line-height-7xl) * 2.55)` |
| `--dt-text-artboard-display-size` | semantic | `calc(var(--dt-font-size-7xl) * 2.8)` |
| `--dt-text-artboard-display-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-artboard-display-weight` | semantic | `var(--dt-text-display-lg-weight)` |
| `--dt-text-artboard-meta-size` | semantic | `calc(var(--dt-font-size-sm) * 2.2)` |
| `--dt-text-artboard-meta-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-artboard-title-line` | semantic | `calc(var(--dt-line-height-7xl) * 1.7)` |
| `--dt-text-artboard-title-size` | semantic | `calc(var(--dt-font-size-7xl) * 1.75)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |

## Source

```jsx
import React from "react";
import { MenuItem } from "./MenuItem.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* Two up at most: a column is at least half the row (less the gap) and never
   narrower than --dt-menu-grid-min, so a narrow screen gets one column. */
const GRID_COLUMNS =
  "repeat(auto-fill, minmax(min(100%, max(var(--dt-menu-grid-min), calc((100% - var(--dt-space-inline-md)) / 2))), 1fr))";

export function MenuSection({
  title,
  description,
  id,
  layout = "list",
  headingLevel = 2,
  children,
  style,
  ...rest
}) {
  const grid = layout === "grid";
  const level = Math.min(Math.max(Math.round(headingLevel) || 2, 1), 5);
  const H = `h${level}`;
  const items = React.Children.toArray(children).filter((c) => c != null && c !== false);

  return (
    <section
      id={id}
      style={{ display: "flex", flexDirection: "column", gap: "var(--dt-menu-section-gap)", minWidth: 0, ...style }}
      {...rest}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        <H style={{ ...role("heading-sm"), margin: 0, color: "var(--dt-text-primary)", overflowWrap: "anywhere" }}>{title}</H>
        {description && (
          <p style={{ ...role("body-sm"), margin: 0, color: "var(--dt-text-secondary)", maxWidth: "70ch" }}>{description}</p>
        )}
      </div>
      {/* A list, so a screen reader announces how many dishes the section
          holds before reading them. */}
      <ul
        role="list"
        style={{
          listStyle: "none", margin: 0, padding: 0, minWidth: 0,
          display: grid ? "grid" : "flex",
          flexDirection: grid ? undefined : "column",
          gridTemplateColumns: grid ? GRID_COLUMNS : undefined,
          gap: grid ? "var(--dt-space-inline-md)" : 0,
        }}
      >
        {items.map((child, i) => {
          const isItem = React.isValidElement(child) && child.type === MenuItem;
          const node = isItem
            ? React.cloneElement(child, {
                layout: child.props.layout || layout,
                headingLevel: child.props.headingLevel || level + 1,
              })
            : child;
          return (
            <li
              key={(React.isValidElement(child) && child.key) || i}
              style={{
                minWidth: 0,
                borderTop: !grid && i > 0 ? "var(--dt-border-width-default) solid var(--dt-menu-item-divider)" : undefined,
              }}
            >
              {node}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```
