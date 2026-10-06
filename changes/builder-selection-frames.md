---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
In the Builder (`builder.html`), frames have the controls layers do, and every selection shows its corners.
- **Corner dots** on every selection, in the flow or free, and on a picked frame. A frame now resizes from any edge or corner; pulling its left or top edge moves it too.
- **Auto layout on frames**: direction, wrap, alignment, gap and padding, from the same tokens a Group uses. Layouts store it as `frame.flow`. The frame's gap moves here from Page layout.
- **Overflow on frames**: Clip content, and Scroll none, vertical or horizontal, for a frame with a fixed height. Layouts store them as `frame.clip` and `frame.scroll`, and the exported code carries them.
- **A ⋯ on the selection's tag** opens that layer's actions, the same as a right-click.
