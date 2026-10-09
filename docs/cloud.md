# The Builder's cloud

The Builder keeps projects in the browser it runs in. Its cloud adds accounts
(email and password), projects kept online, sharing a project by email, and
editing a page together live. It runs on [Supabase](https://supabase.com), and
until one is connected the cloud is off: there's nothing to sign in to, nothing
is fetched, and the Builder works exactly as before.

Connecting one takes about fifteen minutes in Supabase's dashboard, and one
small change here.

## What's where

| File | What it does |
| --- | --- |
| `supabase/schema.sql` | The tables, the access rules and the live-editing rules. Run once in Supabase. |
| `supabase/tests/` | The same rules tried against a local Postgres: who can see, change and join what. |
| `assets/builder/cloud/config.js` | The project's address and public key. Empty means off. |
| `assets/builder/cloud/client.js` | Sign in, sign up, reset a password; a live channel per page. |
| `assets/builder/cloud/sync.js` | Live editing: sends each edit as small changes and applies everyone else's. |
| `assets/builder/cloud/Account.js` | The Account button's dialog. |

## Connecting a Supabase project

1. **Make the project.** At [supabase.com](https://supabase.com), sign in and
   choose *New project*. Any name; a region near the people who'll use it. Keep
   the database password somewhere safe. Nobody here needs it.

2. **Make the tables.** Open *SQL Editor*, start a new query, paste all of
   `supabase/schema.sql`, and run it. It should finish with no errors. Running
   it again later (after an update to it) is safe.

3. **Turn on email accounts.** Under *Authentication*, open the sign-in
   providers and check that *Email* is on, with *Confirm email* on too.
   Invites rely on it: an invite only turns into access once its address is
   confirmed, so nobody can claim someone else's invite. Set the minimum
   password length to 8.

4. **Let it send email.** Supabase's own sender is only for trying things
   out: it sends a few emails an hour, and only to the people on your Supabase
   team. Before anyone else signs up, give it a real sender under
   *Authentication > Emails > SMTP settings* (Resend, Postmark, Amazon SES or
   your own mail provider all work). The email templates there can be
   reworded too.

5. **Say where the Builder lives.** Under *Authentication > URL
   configuration*, set the *Site URL* to the Builder's address,
   `https://graham-goebel.github.io/Dovetail/builder.html`, and add it under
   *Redirect URLs* as well. Add `http://localhost:8099/builder.html` too if
   you'll try it on your own machine (`npm run serve`). The links in sign-up
   and reset emails only ever lead back to an address on this list.

6. **Hand over the address and the public key.** Under *Project Settings >
   API* (or *Data API* and *API Keys*), copy the *Project URL* and the
   *anon* (or *publishable*) key, and put them in
   `assets/builder/cloud/config.js`:

   ```js
   var CLOUD = {
     url: "https://abcdefghijklmnop.supabase.co",
     anonKey: "eyJhbGciOi...",
   };
   ```

   Then `npm run build`, commit, and open a pull request.

   Both are public by design: every visitor's browser gets them, and the
   access rules from step 2 are what keep each project to its members. The
   **service_role** (or **secret**) key is different: it skips every rule.
   It never goes in this file, in a commit, in an issue or in a chat.

## How it keeps things private

Every request from the Builder carries the signed-in person's token, and
Postgres checks it against row-level security on every row:

- **Projects** are seen and changed by their members. Anyone signed in can
  make one, and becomes its owner. Only the owner deletes it.
- **Members**: the owner adds and removes people; anyone can leave.
- **Invites** are by email. Members invite; the person invited sees invites
  to their address, and signing in with that address, once confirmed, joins
  them to the project.
- **Pages** (each page's document) are read and written by the project's
  members. Each save counts up a version and records who made it.
- **Live channels** are named `project:<project id>:<page id>`, and only the
  project's members may listen or send on one.

Visitors who aren't signed in can't read or write anything.

To try the rules yourself, with Postgres 16 installed:

```sh
sh supabase/tests/run.sh      # as a user that isn't root
```

It starts a throwaway database, stands in for Supabase's `auth` and
`realtime` schemas, loads the schema twice, and walks through who can do what.
It ends with `access: all checks passed`.

## Live editing

Each edit in the Builder is already a small list of changes (the same ones its
undo history keeps). Once live editing is on, on a shared page the Builder sends each list to everyone
else on that page's channel, and applies theirs as they arrive, without adding
them to its own undo history. Changes to different things all survive, in any
order; on the very same field, the last to arrive wins. Undo takes back only
your own edits. A change too big for one message (a large uploaded image, say)
is saved with the page instead, and everyone else loads it.

`npm run check:unit` runs the sync engine against an in-memory channel:
`tools/check/unit/sync.test.mjs`.

## The assistant

The Builder's design assistant reads context (docs and skills) and makes changes on the canvas through tools that run in the browser. The model is called from a Supabase Edge Function, so its key never reaches a browser or this repository.

**Practice mode is the default.** Until live mode is turned on, every request is answered in the browser by a scripted practice assistant (`assets/builder/model/assistant.js`). Nothing is sent anywhere and nothing is charged, so the panels can be tried with no account or cloud. Live mode needs the cloud connected, a signed-in person, and one of:

- `window.DovetailAssistant = { mode: "live" }` set before `builder.js` loads;
- `localStorage["dovetail-assistant"] = "live"` in that browser.

**Setting it up:**

1. Run `supabase/assistant.sql` in the SQL editor, after `schema.sql`. Like `schema.sql`, it's safe to run again. It adds:
   - teams and their members (owner, editor, viewer);
   - project groups (what Home calls projects);
   - context docs, skills and skill files, each kept for exactly one team, project group or file;
   - a run log the function writes.
2. Deploy the function: `supabase functions deploy assistant`.
3. Set its secrets in the dashboard (Edge Functions > Secrets) or with `supabase secrets set`:
   - **`ANTHROPIC_API_KEY`**: required. Set it there only; never put it in the repository, a page or a chat.
   - **`ASSISTANT_HOURLY_LIMIT`**: optional, 60 requests per person per hour by default.
   - **`ASSISTANT_ORIGINS`**: optional, the sites allowed to call the function, comma-separated (for example `https://graham-goebel.github.io`).

**Who reads what:**

- A team's docs and skills: its members read them; owners and editors change them.
- A project group's: its owner and, if it has a team, that team, with viewers reading only.
- A file's: the file's members.
- The run log: written only by the function, with the service key on the server. Each person reads their own lines.

`sh supabase/tests/run.sh` tries all of this on a local Postgres, as each kind of person.

**What the function does with a request:**

- checks the session and the hourly limit, and that a named file is shared with the person;
- puts a short fixed preamble and the Builder's brief first, cached for an hour, then the Builder's text for this request (the context docs and the selection). The brief (`systemPrompt` in `assets/builder/model/agent.js`) holds the system's rules, its components and its token values, and is the same on every request, so it's read once and served from the cache after that;
- sends it to Claude Opus 5.5 at medium effort, with fallbacks on, so a request a safety check declines is retried on another model in the same call;
- asks for short progress notes between tool calls, which the panel shows as steps;
- streams the model's events back unchanged.

**What the assistant can see.** Besides the selection, it can list the file's pages, read any page as an outline (every layer's id, type, text, props and tokens), look up a component's props and documentation, and take a picture of a frame or layer to check its own work. Pictures are JPEGs no larger than 1280 by 2000 pixels and are sent with the conversation. Looking is on by default; **Look at the canvas** in the panel's ⋯ menu turns it off for a file, so its canvas is never sent as pictures.

**What it knows about the system.** The brief gives each component's purpose, when to use it and when not to, and each token value's meaning, all read from the system's own docs when the site is built. It can read any guideline in full and the file's theme (brand colours, fonts, corners, density and context). The checks include a usage row that flags a component used against its docs, such as a danger button that doesn't destroy anything or a card inside a card. `tools/evals/assistant-cases.json` holds requests with the components and values a good answer uses, for judging it once live mode is on.

**How it works with you.** Before a new page or frame, or a change that adds more than about 10 layers, it shows a plan and waits for **Build it** (or **Change plan**); the Builder refuses such changes until one is approved. **Plan before big changes** in the ⋯ menu turns this off. After every reply that changes the canvas, the checks run and show under the change card. **Quick** or **Careful** under the message box sets how hard it thinks (low or high effort; the function uses medium if neither is sent). Each file keeps its conversation in this browser, so it picks up where it left off.

## What's built and what's next

Built: the schema and its tests, signing in and out, new accounts with a
confirmed email, password resets, invites accepted on sign-in, and the sync
engine. The Builder fetches nothing until the address and key are set.

Next, once a project is connected: keeping projects in the cloud (and listing
them on Home beside the ones in this browser), inviting people, and turning
on live editing and presence for shared pages.
