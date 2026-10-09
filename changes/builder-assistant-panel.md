---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder has an Assistant panel in its left rail for asking for design changes. A reply can change the selection, or the page, through tools that only accept the design system's token values and components' own props, and add new layers written as JSX. It lists what it changed, and Keep, Undo all or Retry acts on the whole reply. The message box carries the selection, the context docs being sent and the skills on offer as chips, and a chip can be dropped from the next message. It runs in practice mode for now: a scripted assistant carries out a few plain requests with the real tools, so nothing is sent to a model or charged.
