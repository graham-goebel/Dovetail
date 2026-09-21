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

## Tradeoffs

Horizontal bars run out of room fast and scroll badly on narrow screens. Plan the mobile
treatment — a Drawer — before you add the fourth link.
