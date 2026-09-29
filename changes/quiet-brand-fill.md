---
type: added
bump: minor
area: styles
components: [Section, SocialPost]
tokens: []
visual: false
---
Configure's Fill has a Quiet option. `--dt-surface-brand` becomes the palest tint of the primary (`--dt-surface-brand-muted`, its 050 step, 950 in dark) and `--dt-text-on-brand` the text that belongs on it, so every band, block and social post on the brand tone goes quiet at once. The `-muted` tones stay as they are, for a single band. The choice is declared under `.dark` too, so a dark band inside a light page resolves its own tint; Gradient and Duotone now do the same.
