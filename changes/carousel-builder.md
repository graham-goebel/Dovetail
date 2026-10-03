---
type: added
bump: none
area: site
components: [Carousel, Thinking]
tokens: []
visual: false
---
The Builder page (`builder.html`) offers `Carousel`.

- A new Carousel arrives with five `Cover` items, ready for pictures. Any component can be an item: add or drop it into the Carousel.
- While you edit, the items lie flat in a row, in frames of the Carousel's `itemRatio`, so each one can be selected, edited, reordered and dropped between. Play shows the moving carousel.
- The inspector sets `layout`, `drive`, `feel`, `expression`, `itemRatio`, `ratio`, `controls`, `entrance`, `focusOnly`, `reverse` and the labels. `pace`, `spread`, `depth` and `itemSize` are steps, and `defaultIndex` picks an item. `value` and `paused` are for an app to drive, so the inspector leaves them out.
- Code exports the items as the Carousel's children.
- `Thinking` now offers its `state` (connecting, listening, thinking, searching, speaking) in the inspector too.
