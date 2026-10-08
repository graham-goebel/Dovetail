---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
On a freeform canvas the Builder's align row has a *Spread with a gap* menu for two or more free layers: pick *Gap across* or *Gap down* and a spacing step (`--dt-space-inset-2xs` to `-2xl`), and the layers are set that far apart in the order they stand, from the first. Corners is now a menu, with an each-corner switch beside it, like Border's each-side one: four corner choices (`radiusTopLeft`, `radiusTopRight`, `radiusBottomLeft`, `radiusBottomRight`) on the same radius tokens, over the all-corners one, so a tab rounds its top corners only. They export as `borderTopLeftRadius` and its siblings after `borderRadius`; *Remove the corners* takes them all off.
