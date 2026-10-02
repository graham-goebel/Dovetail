---
type: added
bump: minor
area: components
components: [Carousel]
tokens: [--dt-carousel-flow-stiffness, --dt-carousel-flow-damping, --dt-carousel-glide-stiffness, --dt-carousel-glide-damping, --dt-carousel-spring-stiffness, --dt-carousel-spring-damping, --dt-carousel-pace, --dt-carousel-expression, --dt-carousel-perspective, --dt-carousel-scroll-step, --dt-carousel-item-radius, --dt-carousel-item-shadow, --dt-carousel-control-surface, --dt-carousel-control-border, --dt-carousel-control-text, --dt-carousel-control-size]
visual: false
---
`Carousel` moves any components you put in it along a path, with spring motion.
- `layout` picks the path: `stack`, `grid`, `ring`, `arc`, `coverflow`, `fan`, `focus`, `wave`, `marquee`, `taper` or `scatter`. Changing it morphs from one path to the next.
- `drive` picks what moves it:
  - `auto` runs on its own and pauses on hover, keyboard focus or a held touch.
  - `manual` moves only on a click, drag, swipe or arrow key.
  - `both` runs on its own, lets a person take over, then resumes.
  - `scroll` pins the carousel and moves it as the page scrolls.
- `feel` (`flow`, `glide`, `spring`) and `expression` (`none`, `calm`, `lively`, `playful`) set how it moves.
- `pace`, `spread`, `depth`, `reverse`, `itemRatio` and `itemSize` fine-tune it.
- Only the item in focus is interactive unless `focusOnly` says otherwise.
- A pause button shows whenever it moves on its own. Under reduced motion nothing moves by itself.
- The spring settings, pace and expression are `--dt-carousel-*` tokens, so a theme or context can calm every carousel at once.
- The builder doesn't offer `Carousel` yet.
