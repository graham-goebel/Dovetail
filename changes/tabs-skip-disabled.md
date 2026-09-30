---
type: fixed
bump: patch
area: components
components: [Tabs]
tokens: []
visual: false
---
`Tabs` skips disabled tabs from the keyboard: ArrowLeft, ArrowRight, Home and End move only among enabled tabs, wrapping at the ends, and `onChange` is never called with a disabled tab's id. Before this, ArrowRight from a tab next to a disabled one selected the disabled tab and showed its panel.
