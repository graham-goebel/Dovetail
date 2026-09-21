# Table

Compares records across several fields at once. Use it when the user reads across a row
as often as down a column.

## Rules

- Give every table a `caption`. It is the accessible name and it tells a scanning reader
  what the rows are before they parse the headers.
- Right-align numbers. The component turns on tabular figures for right-aligned columns
  so digits line up.
- Use `dense` for data tables over roughly fifteen rows. Use the default padding for
  short summary tables where each row is a decision.
- `zebra` and hairlines are alternatives, not a pair. Stripes plus borders on every row
  reads as noise.

## Tradeoffs

Tables do not reflow. Below roughly 600px a multi-column table either scrolls sideways or
has to become a List. Decide which before you ship a responsive view.
