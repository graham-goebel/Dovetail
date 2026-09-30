---
type: added
bump: minor
area: components
components: [Checkbox, Radio, CheckboxGroup, RadioGroup]
tokens: []
visual: false
---
`Checkbox`, `Radio`, `CheckboxGroup` and `RadioGroup` take `labelPosition="start"`, which puts the label on the left and the control at the right edge of the row, so the labels in a vertical group line up with the question above them instead of indenting. It matches `Switch`'s prop of the same name. Set it on a group and every option follows. The default, `"end"`, keeps the control first as before.
