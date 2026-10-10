---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The builder can let Claude edit an open canvas from outside it. **Let Claude edit…** in a file's ⋯ menu starts a live session for a signed-in person, with a link to give Claude and switches for whether it may make changes and whether each change waits to be applied. Claude's steps run on the canvas with the assistant's own tools, plus `describe` and `edit_by_name`; the top bar shows the session with Pause and End, the Session panel lists each step with an undo, and the changed layers are labelled on the canvas. It runs through the cloud: `supabase/bridge.sql` and the `bridge` Edge Function, described in docs/cloud.md.
