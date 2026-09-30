# MenuSection

A titled group of menu items, such as "Starters" or "Noodles", laid out as a list or as a grid of cards.

## Use it when
- Showing a menu category on a store page, one section per category, in the kitchen's order.
- A category nav or a list of chips should be able to jump to a category: give each section an `id`.

## Don't use it when
- The items are not dishes or products with a price. Use `List` or `Grid`.
- It is a page section of a landing page. Use `Section` and a block.

## Example
```jsx
<MenuSection id="noodles" title="Noodles" description="All noodles can be made with tofu instead of egg.">
  <MenuItem name="Pad thai" price={12.5} onAdd={() => openOptions("pad-thai")} />
  <MenuItem name="Pad see ew" price={12} onAdd={() => openOptions("see-ew")} />
</MenuSection>

<MenuSection title="Popular" layout="grid">…</MenuSection>
```

## Variants
| Prop | What it is for |
|---|---|
| `layout="list"` | Default. Dishes stacked with dividers between them: the phone layout, and any narrow column. |
| `layout="grid"` | Dishes as cards, two up when each column can be at least `--dt-menu-grid-min` wide, one up on a phone. For a wide screen, where a list would put the thumbnail far from the name. |
| `headingLevel` | The heading level, 2 by default. Each `MenuItem` name is set one level below. |

## Composition
Holds `MenuItem`s as its children. It passes `layout` and a `headingLevel` one below its own to each `MenuItem` that does not set them. Other children are allowed and are wrapped in list items the same way. Sections follow the `StoreHeader` and `FulfilmentToggle` on a store page, inside an `AppShell` on a phone.

## Tokens
Tier 3, in `tokens/component/commerce.css`:
- `--dt-menu-section-gap` (`--dt-space-stack-sm`): between the heading and the dishes.
- `--dt-menu-item-divider` (`--dt-border-subtle`, repeated under `.dark`): the rule between dishes in a list.
- `--dt-menu-grid-min` (0.4 × `--dt-size-container-narrow`): the narrowest a grid column may be.

The title is `--dt-text-heading-sm-*`; the description `--dt-text-body-sm-*` in `--dt-text-secondary`.

## Accessibility
- The title is a heading (`h2` by default), so people can move between categories by heading.
- The dishes are a list (`role="list"`, kept explicit because the list style is removed), so a screen reader says how many dishes the section holds.
- The `id` sits on the `<section>`, so an in-page link moves focus and scroll to it.

## Content
- Titles are the category's name, sentence case, one to three words: "Starters", "Noodles and rice".
- The description is one line and says something that applies to every dish: a side that comes with them, a swap on offer.
