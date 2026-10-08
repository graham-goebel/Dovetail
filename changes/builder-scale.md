---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On a freeform canvas the Builder's align row has a *Scale* menu (50%, 75%, 125%, 150%, 200%) for the selected free layers. They scale together about their top left: their places, their own sizes (a shape always has one), and inside them every free layer's place and size. Spacing (padding and margin, every side) and type sizes (a Heading's `size`, a Text's `variant`) move to the nearest token at the new scale, never to a raw value, so a card scaled up keeps reading the system's steps.
