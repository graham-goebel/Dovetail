# Breadcrumbs

Tells the user where they are in a nested structure and gives them one click back up.
Use it for hierarchies at least three levels deep.

## Rules

- The last crumb is the current page. It renders as text with `aria-current="page"`,
  never as a link to itself.
- Breadcrumbs reflect hierarchy, not history. Do not build them from the back stack;
  that is what the browser button is for.
- Keep labels short. Truncate long titles rather than wrapping the trail onto two lines.
- Two levels does not need a trail. Use a single back link instead.

## Tradeoffs

Deep trails eat a row of vertical space on every page to serve a minority of navigation
events. On mobile, consider collapsing the middle crumbs to an ellipsis.
