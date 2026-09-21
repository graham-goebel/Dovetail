# List

Presents a sequence of comparable records — files, members, notifications, settings.
Use it when rows share a shape and the user scans down one column.

## Rules

- `label` is required. An unlabelled list gives a screen reader no context for the count
  it announces.
- Set `interactive` only when rows navigate or select. A row that looks clickable and
  does nothing is worse than a plain row.
- One trailing action per row. Two competing controls in a row make the hit target
  ambiguous on touch.
- Keep `description` to one line. If a row needs more, it is a Card, not a list item.

## Tradeoffs

Lists scan faster than tables but carry less data per row. Once you need more than a
title, a description, and one piece of metadata, move to Table.
