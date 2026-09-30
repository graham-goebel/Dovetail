---
type: fixed
bump: minor
area: components
components: [CheckboxGroup, RadioGroup, Field]
tokens: []
visual: false
---
`CheckboxGroup` and `RadioGroup` now name their `role="group"` / `role="radiogroup"` element with their `label` and describe it with their `hint` or `error`, so a screen reader announces the question before the options. Before, the group had no accessible name. To make this work, `Field` takes two new optional props, `labelId` and `messageId`, which set the ids of its label and its hint or error line. Use them to wire any custom group the same way.
