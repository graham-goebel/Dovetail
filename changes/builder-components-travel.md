---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's My components travel with the work: a downloaded `.dovetail` file and a share link now carry the components their instances are made from, so an instance opened in another browser still knows its component (one already in the library stays as it is). A component's revision survives a reload. An instance added into one of its own instances goes beside it instead, and an instance holding one can't become the component's next revision. A link to a page that was removed says so in the inspector and is left out of the exported code.
