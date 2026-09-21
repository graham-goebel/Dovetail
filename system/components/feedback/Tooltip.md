# Tooltip

Names a control whose purpose is not obvious from its face — most often an IconButton.

## Rules

- Tooltips are supplementary, never the only source of a label. An IconButton still needs
  its own `label` prop; the tooltip repeats it for sighted users.
- Never put an action, a link, or anything the user must read inside a tooltip. It is
  unreachable on touch and invisible to keyboard users who do not focus the trigger.
- The trigger must be focusable. A tooltip on a plain `span` never opens for keyboard
  users.
- A few words. Anything longer is a Popover.

## Tradeoffs

Tooltips do not exist on touch devices. Any information you put in one is information a
phone user will not get — plan the mobile affordance separately.
