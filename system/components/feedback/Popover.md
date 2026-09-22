# Popover

Anchored panel holding secondary controls or detail: a filter set, a field explanation,
a small form. Opens on click, closes on outside click or Escape.

## Rules

- `label` is required. The panel is a dialog; an unnamed dialog is announced as nothing.
- Click, not hover. Hover-opened panels containing controls are unusable on touch and
  hostile with a trackpad.
- Keep it to one job. A popover with tabs inside it should be a Drawer or a Dialog.
- Do not nest popovers. The second one traps focus behind the first.

## Tradeoffs

Popovers stay anchored to their trigger, which keeps context but constrains size. Once
content exceeds roughly 320px tall, a Drawer gives the user a scrollable surface and a
clear way out.
