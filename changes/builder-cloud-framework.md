---
type: added
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), an Account button at the foot of the left rail, and a Sign in button on Home, open the groundwork for the Builder's cloud: accounts, projects kept online, sharing and live editing, on Supabase.

- The cloud is off until a Supabase project's address and public key go in `assets/builder/cloud/config.js`. Until then the Account dialog says so, and the Builder fetches nothing new.
- Once it's on, the dialog signs in with an email and password, makes accounts (confirmed by email), sends a link to reset a password and takes the new one when that link comes back. Signing in accepts any invites waiting for that address.
- `supabase/schema.sql` makes the tables and the access rules: projects, their members, invites by email, each page's document, and private live channels per page. `supabase/tests/run.sh` tries the rules against a local Postgres.
- `assets/builder/cloud/sync.js` is the live-editing engine: each edit goes to everyone else on the page as small changes, once and in order.
- The guide page `guide/cloud.html` (from `docs/cloud.md`) walks through connecting a Supabase project.
