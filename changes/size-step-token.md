---
type: added
bump: minor
area: tokens
components: []
tokens: [--dt-size-step]
visual: false
---
`--dt-size-step` is the step of the size grid: a box drawn on a canvas is a whole multiple of it. It points at `--dt-size-control-lg` (48px) and moves with it, but it reads as what it is for, so a layout sized in steps doesn't borrow a control's name. The Builder's size steps read it.
