# Pagination

Moves through a result set one page at a time. Use it when the user needs a stable
position they can return to or cite.

## Rules

- Pages are 1-indexed, matching what the user reads.
- Show the total. A user who cannot see how much is left cannot decide whether to page
  or to filter.
- Disable, never hide, the previous and next controls at the ends. A control that
  vanishes shifts the row under the cursor.
- Every number is labelled "Page N" for screen readers; the current one carries
  `aria-current="page"`.

## Tradeoffs

Pagination beats infinite scroll for findability and deep linking, and loses to it for
casual browsing. Use it for tables and search results, not for feeds.
