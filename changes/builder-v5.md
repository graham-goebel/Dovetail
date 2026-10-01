---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) gets drawing tools and a more visual inspector.

- **Tools:** a bar along the canvas's foot draws primitives where they're pressed: Select (V), Hand (H), Frame (F), Container (B), Rectangle (R), Ellipse (O), Text (T) and Image (I). A drag sizes a container, rectangle or ellipse in whole steps of `--dt-size-control-lg`. A click gives it a default size. Text opens for typing straight away. Frame adds a frame, sized by the drag.
- **Shape:** a new builder primitive, a rectangle or ellipse with no content. It is painted and sized only by the Size and Appearance tokens, and exports as a styled `div`.
- **Layout tab:**
  - **Flex layout:** direction, wrap, a 3 × 3 alignment pad, the gap, and Stretch and Space between.
  - **Size:** a two-by-two grid of width, height, min width and min height. Width now offers fixed steps too (`control-lg × 1` to `× 12`).
  - **Align self:** start, center, end or stretch.
  - **Spacing:** a box model with margin around padding. Click a side to set it, or the ring's name to set every side.
- **Appearance tab:**
  - **Fill:** a swatch field.
  - **Border:** added and removed from its section's title.
  - **Corners and shadow:** radius and shadow picked from pictures drawn with each token.
  - **Mode:** Inherit or Dark band.
- **Sections** fold away, and the builder remembers which are folded.
- **Frames:** a frame's actions (duplicate, rename, zoom to, delete) sit behind an ellipsis, in the inspector and beside its name on the canvas.
- **No auto wrap:** Groups stay on one line unless Wrap is on, and an Inline added from the panel starts with `wrap={false}`.
