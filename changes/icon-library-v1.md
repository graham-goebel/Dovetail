---
type: added
bump: minor
area: components
components: [Icon]
tokens: []
visual: false
---
Adds Dovetail Icons v1, the system's own icon library: 320 icons, each drawn for a 16px grid with 1px strokes and a 24px grid with 1.5px strokes, in `system/assets/icons/dovetail/` as SVGs and one sprite sheet per size (ids `dt-NAME-16` and `dt-NAME-24`). The new `Icon` component draws any of them by `name` and defaults to `size="lg"` (24px). Sizes follow `--dt-size-icon-*`, `xs` and `sm` use the 16px drawings, and colour is `currentColor`. A `label` gives it an accessible name; without one it is decorative. `Icon.names` lists every icon, and `Icon.groups` lists them by category. Configure offers Dovetail Icons as its first icon library and starts with it selected, so an exported theme's iconography note names it. In the Builder, the Images and media tray has an Icon, Content's Icons gallery holds the library to drag or press onto a frame, and the inspector swaps an Icon for any other in the library.
