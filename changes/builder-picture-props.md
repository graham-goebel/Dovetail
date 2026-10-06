---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), Fit, Radius and Ratio are pictures instead of dropdowns, wherever a component has them (`Image`, `Video`, `Cover`, `AspectRatio`, `Carousel`, the product blocks, `AmbientBorder`).
- **Fit** shows a small photo in a square box, drawn with each `object-fit` value itself: Cover, Contain, Fill, None and Shrink (`scale-down`).
- **Radius** shows the corner each `--dt-radius-*` token gives.
- **Ratio** shows each shape, from 1:1 to 21:9 and 9:16.
Each picture has its value written beneath it, and the row slides and drags like any other segmented control.
