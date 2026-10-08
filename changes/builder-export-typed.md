---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's exported code type-checks in a strict project: custom properties a brand fill sets (`--dt-text-primary` and the like) are written in a spread inside `style`, where a typed style object takes them, and a picked layer or frame named after a system component exports as `MyCard` rather than a `Card` function that clashes with the `Card` it imports.
