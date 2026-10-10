---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's live assistant no longer fails on the second message of a conversation ("Invalid `signature` in `thinking` block"). Its system prompt stays the same for the whole conversation, the canvas and context docs go in the person's message when they change, and any earlier thinking that no longer matches is dropped rather than failing the request.
