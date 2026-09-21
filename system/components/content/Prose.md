# Prose

Wraps long-form editorial text — articles, documentation, changelogs — in a readable
measure with consistent vertical rhythm.

## Rules

- Cap the measure. The default 68ch is the upper bound for comfortable reading; do not
  raise it past 75ch to fill a wide column.
- Prose owns the gap between blocks. Do not add margins to the paragraphs inside it.
- Use `lg` for a standalone article page and `md` inside product UI. `sm` is for
  footnotes and sidebars only.
- Content inside Prose comes from a CMS or Markdown. Do not put interactive controls in
  it; compose those outside.

## Tradeoffs

A fixed measure leaves white space on wide screens. That space is the point — full-width
text at 1400px is unreadable regardless of how empty the margins look.
