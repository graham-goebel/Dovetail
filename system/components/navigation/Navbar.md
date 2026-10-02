# Navbar

Top-level navigation for marketing pages and product shells with few destinations.

## Rules

- Five links or fewer. A navbar is a shortlist, not a sitemap; deeper structures belong
  in a Sidebar or a footer.
- The active link carries `aria-current="page"` and a visible underline. Colour alone
  does not mark position.
- One primary action in `actions`, at most. Two filled buttons side by side means
  neither is primary.
- Do not put the current page's own section links here. Those are Tabs.

## Surfaces
`surface` sets the bar's fill, and the menu that opens on a narrow screen takes the same one.
- `base` (default): the page surface with a subtle bottom border.
- `brand`: the strong brand fill. Text, links, the current link's mark and the buttons in `actions` turn to `--dt-text-on-brand`; a primary `Button` turns light with the brand as its label, the same as on a brand `Section`.
- `brand-muted`: the pale tint. Text keeps the brand's ink (`--dt-text-on-brand-muted`), and a primary `Button` takes the brand colour.
- `glass`: the page shows through, blurred. Use it for a sticky bar over a picture or a long page.

```jsx
<Navbar surface="brand" brand="Kiln & Co." links={links} current="shop"
  actions={<><Badge tone="brand">New</Badge><Button size="sm">Sign in</Button></>} />
```

## Tradeoffs

Horizontal bars run out of room fast. Below `collapseBelow` (640px by default) the link
row becomes a menu button that opens the same links in a Drawer, with `actions` moved to
the drawer's footer, so a phone never gets a sideways-scrolling strip of links. Pass
`collapseBelow={0}` only when the bar holds so few links it fits at every width.
