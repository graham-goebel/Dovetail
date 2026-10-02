---
type: added
bump: minor
area: tokens
components: []
tokens: [--dt-type-scale-body, --dt-type-scale-heading, --dt-type-scale-display]
visual: false
---
`data-type-scale="social"` scales type for a social artboard: a 1080px post read in a feed at about a third of its size. Every text role is declared again inside it. Body, label, eyebrow and code roles grow 2.5x (`--dt-type-scale-body`), headings 2.75x (`--dt-type-scale-heading`) and display 3x (`--dt-type-scale-display`), so headlines climb a steeper ladder than body and still win at a glance. Line heights move with their sizes. `--dt-layout-scale` takes the body factor, so `Stack` and `Inline` gaps keep their proportion. The page's context doesn't carry into a scaled region; families, weights and tracking still follow the theme. See the type scale section of the token reference.
