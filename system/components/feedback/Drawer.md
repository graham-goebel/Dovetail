# Drawer

Modal side panel for detail views, filters, and secondary forms that need more room than
a Popover and less interruption than a full page.

## Rules

- Escape closes, the scrim closes, and focus returns to the trigger. That is built in;
  do not add a second close path that skips focus restoration.
- Use `right` for detail and editing, `left` for navigation on narrow screens, and
  `bottom` for mobile sheets.
- Actions go in `footer`, not loose at the end of the body. The footer stays visible
  while the body scrolls.
- A drawer is modal. If the user needs to reference the page behind it while working,
  use an inline panel instead.

## Tradeoffs

Drawers preserve page context but cover a third of the screen and trap focus. For tasks
longer than a couple of fields, a dedicated page respects the browser's back button.
