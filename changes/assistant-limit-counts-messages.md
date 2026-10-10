---
type: fixed
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's live assistant counts its hourly limit in messages you send (60 by default) rather than in requests: the rounds a reply takes while its tools run no longer use it up, and a reply under way never stops for it. A separate, higher ceiling (600 requests an hour by default, `ASSISTANT_HOURLY_ROUNDS`) still bounds every request.
