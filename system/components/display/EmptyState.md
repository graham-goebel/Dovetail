# EmptyState

Turns a blank region into an instruction. Use it for first-run views, cleared filters,
zero search results, and permission gaps.

## Rules

- The three empties are different. First run needs a create action; no results needs a
  way to widen the search; no access needs a way to request it. Do not ship one generic
  empty state for all three.
- `description` says why it is empty and what happens next. "No data" says neither.
- One primary action. If there are two equal paths forward, the view has a design
  problem upstream.
- Size `sm` for empties inside a card or panel, `md` for a full page region.

## Tradeoffs

An illustrated empty state is memorable on first run and tiresome on the fiftieth. For
states a user hits routinely — a cleared filter, an empty inbox — keep it to text and one
control.
