# MenuBlock

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Blocks family. Files: [MenuBlock.jsx](https://graham-goebel.github.io/Dovetail/system/components/blocks/MenuBlock.jsx), [MenuBlock.d.ts](https://graham-goebel.github.io/Dovetail/system/components/blocks/MenuBlock.d.ts), [MenuBlock.md](https://graham-goebel.github.io/Dovetail/system/components/blocks/MenuBlock.md).

Live page: https://graham-goebel.github.io/Dovetail/components/MenuBlock.html

## Guidelines

A restaurant's ordering page body: the store's `StoreHeader`, an optional delivery or pickup `FulfilmentToggle`, a sticky row of category pills that follows the reader down the menu, and the menu as `MenuSection`s of `MenuItem`s. Reach for it for the main screen of a food ordering app or site.

### Use it when
- A store's menu is the page: a restaurant, a café, a bakery taking orders.
- The menu has a few categories and people jump between them.

### Don't use it when
- It is a product catalogue with filters and a grid of products. Use `ProductCard`s in a `Grid`.
- It is a printed-style menu with nothing to order. Use `MenuSection` and `MenuItem` without callbacks, or `List`.
- You need one dish on its own. Use `MenuItem`.

### Example
```jsx
const [how, setHow] = React.useState("delivery");
const [basket, setBasket] = React.useState({});

<AppShell scroll="contained" title="Bangkok Kitchen" bottomNav={nav}>
  <MenuBlock
    spacing="compact"
    stickyTop="var(--dt-appshell-bar-height)"
    locale="en-US"
    store={{ name: "Bangkok Kitchen", rating: { value: 4.6, count: 1284 }, meta: ["Thai", "$$"], deliveryTime: "25–35 min", status: { open: true, label: "Open until 10pm" } }}
    fulfilment={{ value: how, onChange: setHow }}
    sections={[
      { id: "popular", title: "Popular", items: [{ id: "pad-thai", name: "Pad thai", price: 12.5 }] },
      { id: "noodles", title: "Noodles", items: [{ id: "see-ew", name: "Pad see ew", price: 12 }] },
    ]}
    quantities={basket}
    onItemSelect={(id) => openSheet(id)}
    onItemAdd={(id) => openSheet(id)}
    onQuantityChange={(id, n) => setBasket((b) => ({ ...b, [id]: n }))}
  />
</AppShell>
```

### Variants
| Prop | What it is for |
|---|---|
| `layout="list"` | The default and the phone layout: dishes stacked with dividers. |
| `layout="grid"` | Dishes as cards, two up when there is room, one up on a phone. For a wide web ordering page. |
| `fulfilment` | Shows the toggle. Leave it out when the store only delivers or only collects. |
| `stickyTop` | Where the category row sticks. `0px` on a page; `var(--dt-appshell-bar-height)` under an AppShell's bar. |

### The category nav
- One pill per section, shown when there are two or more. It sticks to the top of whatever scrolls (the page, or a contained AppShell) and scrolls sideways when the pills don't fit.
- Pressing a pill scrolls its section to just under the row (smoothly, or at once under reduced motion) and moves focus to the section, so the next Tab continues from there.
- While the reader scrolls, the pill of the section under the row is highlighted and kept in view. It is watched with an IntersectionObserver created in an effect, so server rendering is unaffected.

### Composition
A `Section`, like every block, so it stacks with others and takes `tone`, `dark`, `spacing` and `width`. Inside an `AppShell`, pass `spacing="compact"` and a `stickyTop`. The basket lives in your app: pass `quantities` and do the sums yourself; pair it with `BasketBar` and a `Sheet` of `ModifierGroup`s for the dish's options.

### Tokens
None of its own. The pills read `--dt-surface-inverse` and `--dt-text-inverse` when current, `--dt-border-subtle` and `--dt-text-secondary` otherwise, at `--dt-size-control-sm` tall with `--dt-radius-pill`. The row is glass (`--dt-surface-glass`, `--dt-backdrop-glass`, `--dt-border-glass`) and bleeds to the section's edges through `--dt-space-gutter`. The rest comes through `StoreHeader`, `FulfilmentToggle`, `MenuSection` and `MenuItem` (`--dt-store-*`, `--dt-fulfilment-*`, `--dt-menu-*`).

### Accessibility
- The row is a `<nav>` named by `navLabel` ("Menu categories"), a list of links; the current one carries `aria-current="true"`, and it is marked by fill and weight, not colour alone.
- Each section is a `<section>` with a heading (level 2 under the store's level 1) and `tabindex="-1"`, so a pill can move focus to it.
- Dishes keep MenuItem's contract: the row and the add button are separate targets, each named after the dish.

### Content
- Section titles are short nouns, sentence case: "Popular", "Noodles", "Drinks". They are the pills' labels too.
- Put the most ordered dishes first, in a "Popular" section.

## Props

```ts
import * as React from "react";
import type { StoreHeaderProps } from "../commerce/StoreHeader";
import type { FulfilmentOption } from "../commerce/FulfilmentToggle";
import type { MenuItemProps } from "../commerce/MenuItem";

/** Delivery or pickup, shown as a FulfilmentToggle under the store's header. */
export interface MenuBlockFulfilment {
  /** The chosen option's value. Controlled. */
  value: string;
  /** Called with the newly chosen value. */
  onChange: (value: string) => void;
  /** The segments. @default Delivery and Pickup */
  options?: FulfilmentOption[];
  /** The toggle's accessible name. @default "How to get your order" */
  label?: string;
}

/** One dish in a MenuBlock section: MenuItem's props plus an id. */
export type MenuBlockItem = MenuItemProps & {
  /** Unique within the menu. Passed back to onItemSelect, onItemAdd and onQuantityChange, and the key into quantities. */
  id: string;
};

/** One category of the menu, with a pill in the sticky category nav. */
export interface MenuBlockSection {
  /** Unique within the menu. Also the section's anchor, prefixed so two menus on a page never share an id. */
  id: string;
  /** The heading, and the pill's label: "Popular", "Noodles", "Drinks". */
  title: string;
  /** One line under the heading: "Served with jasmine rice". */
  description?: string;
  /** The dishes, in order. */
  items: MenuBlockItem[];
}

/** A restaurant's ordering page body: StoreHeader, an optional FulfilmentToggle, a sticky category nav and the menu. */
export interface MenuBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The store, rendered as a StoreHeader at the top. Its headingLevel defaults to 1: the name is the page's heading. */
  store?: StoreHeaderProps;
  /** Shows a FulfilmentToggle under the header. Omit when the store offers one way only. */
  fulfilment?: MenuBlockFulfilment;
  /** The menu's categories, each a MenuSection with a pill in the category nav (shown when there are two or more). */
  sections: MenuBlockSection[];
  /** Makes each dish's row a button; called with the dish's and its section's ids. Usually opens a Sheet of options. */
  onItemSelect?: (itemId: string, sectionId: string) => void;
  /** Shows each dish's add button; called with the dish's and its section's ids. */
  onItemAdd?: (itemId: string, sectionId: string) => void;
  /** How many of each dish (by id) are in the basket. Overrides an item's own quantity. */
  quantities?: Record<string, number>;
  /** With a quantity above 0, shows the dish's in-basket stepper; called with the dish's id and the next quantity (0 removes it). */
  onQuantityChange?: (itemId: string, next: number) => void;
  /** list: dishes stacked with dividers, the phone layout. grid: dishes as cards, two up when there is room. @default "list" */
  layout?: "list" | "grid";
  /** ISO 4217 currency code for the store and every dish that does not set its own. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the store and every dish that does not set its own. Set it when server rendering. */
  locale?: string;
  /** Accessible name of the category nav. @default "Menu categories" */
  navLabel?: string;
  /**
   * How far from the top of the scrolling area the category nav sticks, as a CSS length. Inside an
   * AppShell, pass "var(--dt-appshell-bar-height)" so it sits under the top bar. @default "0px"
   */
  stickyTop?: string;
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

export declare function MenuBlock(props: MenuBlockProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-backdrop-glass` | semantic | `saturate(1.6) blur(var(--dt-blur-glass))` |
| `--dt-border-glass` | semantic | `color-mix(in oklab, var(--dt-text-primary) 10%, transparent)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-space-gutter` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-xl` | semantic | `var(--dt-dim-10)` |
| `--dt-surface-glass` | semantic | `color-mix(in oklab, var(--dt-surface-overlay) 72%, transparent)` |
| `--dt-surface-inverse` | semantic | `var(--dt-color-neutral-900)` |
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
| `--dt-z-sticky` | semantic | `100` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";
import { Section } from "../primitives/Section.jsx";
import { StoreHeader } from "../commerce/StoreHeader.jsx";
import { FulfilmentToggle } from "../commerce/FulfilmentToggle.jsx";
import { MenuSection } from "../commerce/MenuSection.jsx";
import { MenuItem } from "../commerce/MenuItem.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

const GLASS = "var(--dt-backdrop-glass)";

/* The nearest ancestor that scrolls vertically: the AppShell in a device
   frame, a dialog, or none (the document). Read in effects and handlers only. */
function scrollParent(el) {
  for (let node = el && el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) { return false; }
}

/* A restaurant's ordering page: the store's header, delivery or pickup, a
   sticky row of categories that follows the reader down the menu, and the
   menu itself. Everything is data and callbacks; the basket lives in the app. */
export function MenuBlock({
  store,
  fulfilment,
  sections = [],
  onItemSelect,
  onItemAdd,
  quantities,
  onQuantityChange,
  layout = "list",
  currency,
  locale,
  navLabel = "Menu categories",
  stickyTop = "0px",
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anchor = (id) => `${uid}-${id}`;
  const navRef = React.useRef(null);
  const listRef = React.useRef(null);
  const pending = React.useRef(null);
  const ids = sections.map((s) => s.id);
  const key = ids.join("|");
  const [active, setActive] = React.useState(ids[0]);
  const current = ids.includes(active) ? active : ids[0];

  /* The section in view: the first one crossing the band just under the
     sticky nav. Created in an effect, so a server render never touches it. */
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === "undefined") return undefined;
    const root = scrollParent(nav);
    const top = parseFloat(getComputedStyle(nav).top) || 0;
    const offset = Math.round(top + nav.offsetHeight);
    const visible = new Set();
    const els = ids.map((id) => document.getElementById(anchor(id))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) visible.add(en.target.id); else visible.delete(en.target.id);
      }
      const first = els.find((el) => visible.has(el.id));
      if (!first) return;
      const id = ids[els.indexOf(first)];
      if (pending.current) {
        if (pending.current === id) pending.current = null;
        return;
      }
      setActive(id);
    }, { root, rootMargin: `-${offset}px 0px -55% 0px`, threshold: 0 });
    els.forEach((el) => io.observe(el));
    /* A reader who scrolls by hand takes over from a jump still in flight. */
    const release = () => { pending.current = null; };
    const target = root || window;
    target.addEventListener("wheel", release, { passive: true });
    target.addEventListener("touchstart", release, { passive: true });
    target.addEventListener("keydown", release);
    return () => {
      io.disconnect();
      target.removeEventListener("wheel", release);
      target.removeEventListener("touchstart", release);
      target.removeEventListener("keydown", release);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stickyTop, uid]);

  /* Keep the current pill in view inside the row, sideways only. */
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const link = list.querySelector('[aria-current="true"]');
    if (!link) return;
    const l = link.offsetLeft, r = l + link.offsetWidth;
    if (l < list.scrollLeft || r > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, l - (list.clientWidth - link.offsetWidth) / 2), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }, [current]);

  const jump = (e, id) => {
    const el = document.getElementById(anchor(id));
    const nav = navRef.current;
    if (!el || !nav) return;
    e.preventDefault();
    pending.current = id;
    setActive(id);
    const root = scrollParent(nav);
    const rootTop = root ? root.getBoundingClientRect().top : 0;
    const stuck = rootTop + (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight;
    /* A little air between the nav and the heading: the row's own inset. */
    const gap = listRef.current ? parseFloat(getComputedStyle(listRef.current).paddingTop) || 0 : 0;
    const delta = el.getBoundingClientRect().top - stuck - gap;
    const behavior = reducedMotion() ? "auto" : "smooth";
    (root || window).scrollBy({ top: delta, behavior });
    try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
  };

  const pill = (on) => ({
    ...role("label-md"),
    display: "inline-flex", alignItems: "center", boxSizing: "border-box", whiteSpace: "nowrap",
    minHeight: "var(--dt-size-control-sm)", padding: "0 var(--dt-space-inset-sm)",
    borderRadius: "var(--dt-radius-pill)",
    border: `var(--dt-border-width-default) solid ${on ? "var(--dt-surface-inverse)" : "var(--dt-border-subtle)"}`,
    background: on ? "var(--dt-surface-inverse)" : "transparent",
    color: on ? "var(--dt-text-inverse)" : "var(--dt-text-secondary)",
    fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-font-weight-medium)",
    textDecoration: "none",
    transition: "background var(--dt-motion-micro), color var(--dt-motion-micro), border-color var(--dt-motion-micro)",
  });

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)", minWidth: 0 }}>
        {store && <StoreHeader locale={locale} currency={currency} {...store} />}
        {fulfilment && (
          <FulfilmentToggle
            label={fulfilment.label || "How to get your order"}
            value={fulfilment.value}
            onChange={fulfilment.onChange}
            options={fulfilment.options}
          />
        )}
        {sections.length > 1 && (
          <nav
            ref={navRef}
            aria-label={navLabel}
            style={{
              position: "sticky", top: stickyTop, zIndex: "var(--dt-z-sticky)",
              marginInline: "calc(-1 * var(--dt-space-gutter))",
              background: "var(--dt-surface-glass)",
              backdropFilter: GLASS, WebkitBackdropFilter: GLASS,
              borderBottom: "var(--dt-border-width-default) solid var(--dt-border-glass)",
            }}
          >
            <ul
              ref={listRef}
              role="list"
              style={{
                listStyle: "none", margin: 0, display: "flex", gap: "var(--dt-space-inline-xs)",
                overflowX: "auto", scrollbarWidth: "none", overscrollBehaviorX: "contain",
                padding: "var(--dt-space-inset-xs) var(--dt-space-gutter)",
              }}
            >
              {sections.map((s) => {
                const on = s.id === current;
                return (
                  <li key={s.id} style={{ flex: "none", display: "flex" }}>
                    <a href={`#${anchor(s.id)}`} aria-current={on ? "true" : undefined} onClick={(e) => jump(e, s.id)} style={pill(on)}>
                      {s.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)", minWidth: 0 }}>
          {sections.map((s) => (
            <MenuSection key={s.id} id={anchor(s.id)} tabIndex={-1} title={s.title} description={s.description} layout={layout} style={{ outline: "none" }}>
              {(s.items || []).map(({ id, ...item }) => (
                <MenuItem
                  key={id}
                  currency={currency}
                  locale={locale}
                  {...item}
                  quantity={quantities && quantities[id] != null ? quantities[id] : item.quantity}
                  onSelect={onItemSelect ? () => onItemSelect(id, s.id) : item.onSelect}
                  onAdd={onItemAdd ? () => onItemAdd(id, s.id) : item.onAdd}
                  onQuantityChange={onQuantityChange ? (n) => onQuantityChange(id, n) : item.onQuantityChange}
                />
              ))}
            </MenuSection>
          ))}
        </div>
      </div>
    </Section>
  );
}
```
