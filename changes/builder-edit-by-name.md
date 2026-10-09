---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
Paste a layout in the builder takes an edit by layer name as well as a whole layout: a "## Edit" heading and a list such as `- Hero: padding xl`, `- remove Spending` or `- add Heading "This week" to Bento, first`, or the same as JSON with `changes`. Layers are found by their name, the name Layers works out for them, their text or their type. The dialog lists each change with an icon for its kind and what it was and becomes, draws the frame before and after with the changed layers marked, asks which one when two layers share a name (or skip), and shows the edit as Markdown or JSON. It applies as one step; the canvas labels what changed, Layers marks it, and a toast offers Undo. The builder layouts guide describes the format.
