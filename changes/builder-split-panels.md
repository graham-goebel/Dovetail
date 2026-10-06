---
type: changed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's left panels move out of the App into their own memoized components, Layers, Pages, Assets and Content (`assets/builder/app/Layers.js`, `Pages.js`, `Assets.js`, `Content.js`; Pages owns its page drag, Assets its variables scope), so a panel redraws when what it shows changes, not when the canvas pans or the inspector edits. The helpers panels share (`nodeLabel`, `typeIcon`, `isOwner`, `hasTitlePart`, `nodeIsOpen`, `frameSize`) are pure functions in `config.js`. Nothing changes on screen.
