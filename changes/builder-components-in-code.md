---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's exported code keeps My components as components: each instance is written as a call (`<ProductTile title="Tall jug" />`) and each component once, above the page, as a function whose props are the texts its instances changed, with the component's own text as the default. A component inside a component is a call too, and a placed instance keeps its position in a box around the call. Changes an instance makes beyond text aren't in the code; the Export dialog lists them under *Left out of the code*.
