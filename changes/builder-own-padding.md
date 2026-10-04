---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On the Builder page (`builder.html`), a component that pads itself from its own tokens names that padding as its default. A Card's Padding reads "Default: card padding" rather than "None", and a Button's reads "Default: button padding md". The Variables panel offers it as a dashed "Default" entry that clears Padding so the component's own applies. It only appears for that component: another type or a mixed selection never sees it. The builder data records each component's padding token (`ownPadding`), read from its source.
