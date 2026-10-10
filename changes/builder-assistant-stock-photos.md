---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
When nothing in a file's Content fits, the Builder's assistant searches stock photos through a new `images` Supabase function and offers them as `stock:<id>`, with what each shows and who took it. A stock photo it uses is kept in Content with its credit, and the service is told it was used. It's off until the function's `STOCK_PHOTO_URL` and `STOCK_PHOTO_KEY` secrets are set.
