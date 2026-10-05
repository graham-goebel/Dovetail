---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), the canvas controls are tighter.
- **Handles** are smaller and outline-only, with a grab area that stays easy to hit. Hovering one, or pulling it, enlarges it and dims the others. On a layer that's small on screen, the handles step outward, so a press in its middle still moves it.
- **Freeform sizes** take any multiple of 4px. Pulling a handle sets the width and height in 4px steps and holds the opposite side where it was, even when the pull reaches the canvas's top or left edge. The W and H fields take a typed value (rounded to the nearest 4), a drag on the letter, or the arrows (4px, 16px with Shift). Layouts store these as `style.fw` and `style.fh`, whole steps of `--dt-space-inset-2xs`, only in freeform frames. Structured frames keep their size tokens.
- **Rotation** in freeform frames: drag just outside a corner to turn a layer about its centre, with Shift to snap to 15°, or type the angle. A turned layer resizes along its own sides. Layouts store it as `style.rot`, whole degrees.
- **A readout** by the pointer shows the size while resizing, the position while moving, and the angle while turning.
- **Against the frame's edge:** a layer flush with a frame's edge now resizes itself from its own handle. The frame's edge grips sit just outside the frame, and its corner grip stays.
- Pasting a style carries a freeform layer's own size, turn and opacity.
