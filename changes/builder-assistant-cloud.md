---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's cloud can hold the design assistant. `supabase/assistant.sql` adds teams with owner, editor and viewer roles, project groups, and context docs and skills that each belong to one team, one project group or one file, with row-level security for each. `supabase/functions/assistant` relays requests to the model, keeps its key server side, and limits each person's requests per hour. In the Builder, assistant requests run in practice mode by default: a scripted assistant answers in the browser, so nothing is sent or charged until live mode is turned on. docs/cloud.md says how to set it up.
