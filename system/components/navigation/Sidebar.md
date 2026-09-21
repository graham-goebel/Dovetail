# Sidebar

Persistent navigation for products with more destinations than a Navbar can hold.

## Rules

- Group with `sections` once you pass roughly seven items. The section eyebrow is the
  one place uppercase is allowed.
- Icons are optional but all-or-nothing within a section. A mixed column reads as broken.
- The active item carries `aria-current="page"` plus a filled surface. Do not rely on
  the surface alone.
- Counts go in `trailing` as a Badge. Do not append them to the label string — they
  break truncation.
- Below roughly 900px, move the sidebar into a Drawer rather than shrinking it.

## Tradeoffs

A sidebar costs 240px of every screen forever in exchange for one-click access. On
content-heavy pages, a collapsible rail buys the width back at the cost of a click.
