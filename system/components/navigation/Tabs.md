# Tabs

Switches between sibling views that share a purpose. Use tabs when the user compares or
alternates between panels, not to sequence a task.

## Rules

- `label` is required. A tablist with no name gives a screen reader nothing to announce
  before the tab count.
- Arrow keys move between tabs and Home/End jump to the ends. That behaviour is built in;
  do not intercept keydown on the tablist.
- Pair every `Tabs` with `TabPanel`. The panel wires `aria-controls` and
  `aria-labelledby`; a bare div loses the relationship.
- Three to six tabs. Beyond that use a Sidebar; tabs that scroll horizontally hide options.
- Use `underline` inside page content and `pill` for compact filter switches in toolbars.

## Tradeoffs

Tabs hide everything but one panel, so users miss content they did not think to look for.
When the panels are short and related, stacking them with headings scans better.
