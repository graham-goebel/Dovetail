---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) names its pieces consistently and lets them turn into one another.

- What's what:
  - A frame is a screen on the canvas. It is freeform (place anything anywhere) or structured (everything in auto-layout Groups, ready for code).
  - A tall frame grows as tall as what's on it.
  - A Group is a box that lays out what it holds in a row or a column.
  - A loose object sits on the canvas outside any frame.
  - A page is one of a project's canvases.
- New offers a Freeform frame and a Structured frame. The bar's Page tool is now Tall frame, so "page" only ever means a project's page. New frames are all named Frame 2, Frame 3, and so on.
- A selected Group, Section, Stack, Inline, Grid or Card has Turn into in the inspector. It can become any of the others, keeping what's in it, its name and its place. A Group comes laid out: a column, or a row from an Inline, with padding where a Section or Card had it. Turn into a frame puts the layer in a frame of its own beside the one it was in.
- A frame's menu has Turn into a group. Its contents become one Group, loose on the canvas where the frame was, ready to drop into another frame. A loose object's menu has Turn into a frame.
- In a structured frame, grouping or wrapping in a Group gives the new Group auto layout straight away, as adding one does.
