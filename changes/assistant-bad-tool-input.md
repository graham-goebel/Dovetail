---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's Agent no longer stops with "Unable to parse tool parameter JSON from model" when the model writes a tool call whose input isn't valid JSON. The assistant function now relays the model's events as they come, and the Builder answers the broken call with an error the model can retry, so the turn carries on.
