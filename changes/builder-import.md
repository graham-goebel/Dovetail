---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) takes layouts written elsewhere, by hand or by Claude.

- **Paste a layout:** a new item under Start from. Paste builder JSON (a whole layout, one frame, one node or a list of nodes, fenced or not) or a builder link. A summary says how many frames and layers come in and lists everything it will leave out, such as an unknown prop, a raw value or an unknown component. Then add the frames beside yours, or replace them.
- **Copy layout JSON:** a new button in the Code dialog copies every frame as builder JSON, to paste back or hand to Claude.
- **Share links** that carried something the builder can't set now say so when they open.
- **The format:** `assets/builder-layouts.md` documents it. The build generates it from the builder's own components, props and tokens, and checks its example layout. `llms.txt` links to it.
