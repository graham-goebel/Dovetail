---
type: added
bump: minor
area: components
components: [Card]
tokens: [--dt-text-on-scrim-strong, --dt-text-on-scrim-brand, --dt-size-media-min, --dt-card-media-fg, --dt-card-media-fg-secondary, --dt-card-media-fg-strong, --dt-card-media-fg-brand, --dt-card-media-border, --dt-card-media-min-height]
visual: false
---
`Card` can sit on a picture: `background` fills it with an image and `backgroundVideo` with a muted looping video. It sets its content at the bottom over a `scrim` (`gradient`, `solid` or `none`), and `onMedia` sets the text in near-white, pure white or a brand-tinted title.

A pictured card is dark in both colour modes (it scopes `.dark`, so buttons in its footer read light on dark) and holds at least `--dt-card-media-min-height`. The video doesn't autoplay for someone who prefers reduced motion; they see `background` as its still. New semantic tokens `--dt-text-on-scrim-strong` (pure white) and `--dt-text-on-scrim-brand` (a light brand step) are available for any text over imagery.
