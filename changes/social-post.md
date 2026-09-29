---
type: added
bump: minor
area: components
components: [SocialPost]
tokens: [--dt-dim-artboard-width, --dt-dim-artboard-square, --dt-dim-artboard-portrait, --dt-dim-artboard-story, --dt-size-artboard-width, --dt-size-artboard-square, --dt-size-artboard-portrait, --dt-size-artboard-story, --dt-text-artboard-display-size, --dt-text-artboard-title-size, --dt-text-artboard-body-size, --dt-text-artboard-meta-size, --dt-space-artboard, --dt-space-artboard-gap, --dt-social-width, --dt-social-padding, --dt-social-display-size, --dt-social-bg, --dt-social-fg, --dt-social-on-image]
visual: false
---
New `SocialPost` component for Instagram stories (9:16) and grid posts (4:5 or 1:1). It draws at native pixel size (1080 wide) and scales to fit, in ten layouts that share one frame and editorial type scale: `headline`, `quote`, `stat`, `list` and `announcement` on a `tone`, and `cover`, `split`, `framed`, `card` and `poster` around an `image`.

Its sizes come from new artboard tokens (`--dt-size-artboard-*`, `--dt-text-artboard-*`, `--dt-space-artboard*`), drawn for a 1080px canvas and never retuned by a context; its colours alias the ordinary roles, so a theme rebrands every post. A new "Social templates" template shows all ten as stories, a 4:5 grid and squares.
