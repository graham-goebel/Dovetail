# MenuBlock

A restaurant's ordering page body: the store's `StoreHeader`, an optional delivery or pickup `FulfilmentToggle`, a sticky row of category pills that follows the reader down the menu, and the menu as `MenuSection`s of `MenuItem`s. Reach for it for the main screen of a food ordering app or site.

## Use it when
- A store's menu is the page: a restaurant, a café, a bakery taking orders.
- The menu has a few categories and people jump between them.

## Don't use it when
- It is a product catalogue with filters and a grid of products. Use `ProductCard`s in a `Grid`.
- It is a printed-style menu with nothing to order. Use `MenuSection` and `MenuItem` without callbacks, or `List`.
- You need one dish on its own. Use `MenuItem`.

## Example
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

## Variants
| Prop | What it is for |
|---|---|
| `layout="list"` | The default and the phone layout: dishes stacked with dividers. |
| `layout="grid"` | Dishes as cards, two up when there is room, one up on a phone. For a wide web ordering page. |
| `fulfilment` | Shows the toggle. Leave it out when the store only delivers or only collects. |
| `stickyTop` | Where the category row sticks. `0px` on a page; `var(--dt-appshell-bar-height)` under an AppShell's bar. |

## The category nav
- One pill per section, shown when there are two or more. It sticks to the top of whatever scrolls (the page, or a contained AppShell) and scrolls sideways when the pills don't fit.
- Pressing a pill scrolls its section to just under the row (smoothly, or at once under reduced motion) and moves focus to the section, so the next Tab continues from there.
- While the reader scrolls, the pill of the section under the row is highlighted and kept in view. It is watched with an IntersectionObserver created in an effect, so server rendering is unaffected.

## Composition
A `Section`, like every block, so it stacks with others and takes `tone`, `dark`, `spacing` and `width`. Inside an `AppShell`, pass `spacing="compact"` and a `stickyTop`. The basket lives in your app: pass `quantities` and do the sums yourself; pair it with `BasketBar` and a `Sheet` of `ModifierGroup`s for the dish's options.

## Tokens
None of its own. The pills read `--dt-surface-inverse` and `--dt-text-inverse` when current, `--dt-border-subtle` and `--dt-text-secondary` otherwise, at `--dt-size-control-sm` tall with `--dt-radius-pill`. The row is glass (`--dt-surface-glass`, `--dt-backdrop-glass`, `--dt-border-glass`) and bleeds to the section's edges through `--dt-space-gutter`. The rest comes through `StoreHeader`, `FulfilmentToggle`, `MenuSection` and `MenuItem` (`--dt-store-*`, `--dt-fulfilment-*`, `--dt-menu-*`).

## Accessibility
- The row is a `<nav>` named by `navLabel` ("Menu categories"), a list of links; the current one carries `aria-current="true"`, and it is marked by fill and weight, not colour alone.
- Each section is a `<section>` with a heading (level 2 under the store's level 1) and `tabindex="-1"`, so a pill can move focus to it.
- Dishes keep MenuItem's contract: the row and the add button are separate targets, each named after the dish.

## Content
- Section titles are short nouns, sentence case: "Popular", "Noodles", "Drinks". They are the pills' labels too.
- Put the most ordered dishes first, in a "Popular" section.
