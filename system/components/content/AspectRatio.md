# AspectRatio

Reserves a fixed proportion of space before its content loads. Use it around every image, video, and map. Without it the page reflows when media arrives, which costs you layout stability and reads as a broken load.

## Ratios

The system ships seven. Pick by role, not by taste.

| Ratio | Use for |
|---|---|
| \`square\` | Avatars, product tiles, gallery grids |
| \`4:3\` | Editorial photography, screenshots |
| \`3:2\` | Standard camera output, blog headers |
| \`16:9\` | Video, hero imagery, cards. The default. |
| \`21:9\` | Full-bleed banners and page headers |
| \`3:4\` / \`9:16\` | Portrait and mobile-first placements |

A raw number is allowed for a one-off crop, but prefer a named ratio so a template stays consistent when its content changes.

## Rules

Give it a width; it derives its own height. Never set a height on an AspectRatio; that defeats the reservation. Children are absolutely positioned against it, so a single child with \`inset: 0\` fills it exactly. That is what \`Image\` does.
