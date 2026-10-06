---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's left panels move out of the App into their own memoized components, starting with Layers (`assets/builder/app/Layers.js`), so a panel redraws when what it shows changes, not when the canvas pans or the inspector edits. The helpers panels share (`nodeLabel`, `typeIcon`, `isOwner`, `hasTitlePart`, `nodeIsOpen`, `frameSize`) are pure functions in `config.js`. Nothing changes on screen.
