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
| `supabase/bridge.sql`, `supabase/functions/bridge` | Live sessions in which Claude edits an open canvas from outside the Builder. |
| `assets/builder/cloud/bridge.js` | Starts a session and answers its steps. |

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

## Files in the cloud

Signed in, every file is kept in the cloud as well as in this browser
(`assets/builder/cloud/mirror.js`, over `cloud/files.js`). The local store
stays what the Builder reads and writes, so files open at once and offline;
the mirror watches it and sends each change on:

- **Signing in** reconciles: files in this browser the cloud lacks are
  uploaded (a `projects` row with the file's pages, folders, colour and theme
  in `settings`, and a `pages` row per page); cloud files this browser lacks
  are downloaded; a file both have is brought level page by page. Home's
  projects mirror to `file_groups`. The Playground the Builder makes for
  itself stays local.
- **Each save** goes up a moment later, naming the page version it was made
  from. If someone saved that page first, the cloud wins: what was here is
  kept under Versions as "Before reloading from the cloud", and the cloud's
  copy replaces it on the canvas.
- **Offline**, saves land here and the page is marked to go up on the next
  sync, which runs when the browser is back online, when the tab wakes, and
  on sign-in. The Account dialog says how the last sync went.
- **Deleting** a file here deletes it in the cloud (only its owner can; a
  file shared with you comes back on the next sync until sharing has a
  "leave"). A file deleted elsewhere stays here as a file of its own.

Not yet mirrored: the Content library and the assistant's conversations
(each stays in the browser it was made in), and live updates from another
device while a file is open, which arrive on the next sync rather than as
they happen.

## Sharing a file

The people in the top bar open **Share** (`assets/builder/app/Share.js`,
over `cloud/sharing.js`): who's on the file, an invite by email, withdraw,
Remove (the owner) and Leave (anyone else). The rows are `project_members`
and `project_invites`; the database decides who may do what, as under "How
it keeps things private". An invite turns into membership when that address
signs in, confirmed (`accept_invites`), and the file then comes down to them
on the sync that follows. Deleting a file shared with you leaves it instead,
so it stays for the others. A shared file's edits still meet on the next
sync; live editing on it is the next step.

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

**Live once signed in; practice otherwise.** With the cloud connected and someone signed in, every request goes to the model, and the panel's badge says **Live**. Signed out, or without a cloud, requests are answered in the browser by a scripted practice assistant (`assets/builder/model/assistant.js`): nothing is sent anywhere and nothing is charged, so the panels can be tried with no account. Signed in, the **Live assistant** switch in the panel's ⋯ menu turns practice on or off for that browser (signed out, the menu offers to sign in instead). The choice is kept as `localStorage["dovetail-assistant"]` (`"live"` or `"practice"`), and a page can also set `window.DovetailAssistant = { mode }` before `builder.js` loads.

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
- puts a short fixed preamble and the Builder's brief first, cached for an hour, and keeps that system prompt the same for the whole conversation. The brief (`systemPrompt` in `assets/builder/model/agent.js`) holds the system's rules, its components and its token values, and is the same on every request, so it's read once and served from the cache after that. The canvas, the selection and the context docs go in the person's message instead, inside `<builder-context>`, and only when they changed since the last one in the conversation: nothing already sent ever changes, which keeps the model's earlier thinking valid (the API checks that everything before a thinking block is as it was) and the conversation cached as it grows;
- asks the API to drop, rather than refuse, any earlier thinking that no longer matches (`thinking-binding-controls-2026-08-01`, `prefix_mismatch_behavior: "drop_block"`): a conversation saved before this change, or a shared one whose pictures were left out of the cloud's copy, carries on without that thinking instead of failing;
- sends it to Claude Opus 5.5 at medium effort, with fallbacks on, so a request a safety check declines is retried on another model in the same call;
- asks for short progress notes between tool calls, which the panel shows as steps;
- streams the model's events back unchanged.

**What the assistant can see.** Besides the selection, it can list the file's pages, read any page as an outline (every layer's id, type, text, props and tokens), look up a component's props and documentation, and take a picture of a frame or layer to check its own work, as it is on the canvas or drawn out of sight at another width (390 for a phone) or in the other mode, without changing the canvas. Pictures are JPEGs no larger than 1280 by 2000 pixels and are sent with the conversation. Looking is on by default; **Look at the canvas** in the panel's ⋯ menu turns it off for a file, so its canvas is never sent as pictures.

**When it asks you, and what it knows you changed.** When a request leaves a real choice of direction open, it shows a short question with two to four options on its reply, each saying what it would use. Click one, or type something else, and it carries on. Anything you change on the canvas yourself after a reply is listed above the message box, and goes with your next message so it builds on your edits instead of undoing them. The × leaves them out.

**Variants.** Asked to try a few directions, or given Try them all on a question, it copies the frame once per direction, beside it, and builds each one. The card on its reply lists them with Show; Keep puts the one you choose where the original was, under its name, and removes the rest in one step (Keep the original removes them all). Undo brings them back.

**Shared conversations.** `supabase/assistant.sql` adds `assistant_threads`: a conversation belongs to the person who started it until they share it, and then everyone on its file can read its history and carry it on, each message saying who sent it. Only its starter shares, unshares or deletes it, and a save made from an older copy is refused. Pictures of the canvas stay in the browser that took them. The panel's **Share in this file** waits for files to be kept in the cloud (below); until then conversations stay in each browser.

**What it knows about the system.** The brief gives each component's purpose, when to use it and when not to, and each token value's meaning, all read from the system's own docs when the site is built. It can read any guideline in full and the file's theme (brand colours, fonts, corners, density and context). The checks include a usage row that flags a component used against its docs, such as a danger button that doesn't destroy anything or a card inside a card. `tools/evals/assistant-cases.json` holds requests with the components and values a good answer uses, for judging it once live mode is on.

**How it works with you.** Before a new page or frame, or a change that adds more than about 10 layers, it shows a plan and waits for **Build it** (or **Change plan**); the Builder refuses such changes until one is approved. **Plan before big changes** in the ⋯ menu turns this off. After every reply that changes the canvas, the checks run and show under the change card. **Quick** or **Careful** under the message box sets how hard it thinks (low or high effort; the function uses medium if neither is sent). Each file keeps its conversations in this browser: the list button in the panel's header shows them, newest first, with what was said last and the changes still standing, and **+** starts a new one. The one left open reopens with the file.

## Letting agents edit an open canvas

**Let agents edit…** in a file's ⋯ menu starts a live session. An agent such as Claude, working outside the Builder (in the app, a terminal or an editor), then edits the open canvas with the assistant's own tools while you watch. Several agents can work at once, each with its own link, name, colour and mark: each one's cursor sits on the layer it last changed, and the Session panel can show one agent's steps or everyone's.

**Who's who.** An agent's first step is `hello` with its name and, if it has one, a small square mark (a PNG, JPEG or WebP data address, at most 48 KB). The Builder keeps no other product's name or logo; until an agent says hello it shows the name it was added under, on its colour.

**Pictures.** An agent that makes pictures sends each one with `place_image`: a PNG, JPEG or WebP data address of up to 5 MB, put into a layer that shows pictures (an Image, a Cover, or a Video's poster) by `id`, or added as a new Image in a container by `parent`, with `alt` saying what it shows. The Builder scales it to fit 1600px, as it does an upload, and keeps it with the file. It never fetches a picture from an address or calls an image service itself. To show where a picture is coming while it's being made, the agent adds an empty `<Image>`, then calls `working_on` with its id and a few words; those words sit on its cursor there, and the layer is held for it for up to a minute. Only `place_image` steps may be larger than 1 MB; a step too big for a Realtime message is read from the table instead.

**Two agents, one layer.** A layer an agent is changing is held while its step runs and for three seconds after. Another agent's step that needs it waits, up to ten seconds, and then runs (its answer says it waited) or comes back saying which agent is busy with which layer. Your own edits are never held. You choose whether it may make changes or only look, and whether each change waits for you to apply it. While a session runs, the top bar says so, with **Pause** and **End**, and the Session panel lists each step with an icon for its kind and an undo for each change. Asking first, a change waits in the panel, where **Apply** makes it and a note sends Claude something else to do instead.

**How a step travels.** Starting a session stores a row in `bridge_sessions` with the SHA-256 of a random key; the key itself stays in the browser and in the link the dialog shows. Claude reads the link (a GET on `functions/v1/bridge`) for how to call, then POSTs each step with the session and key. The function checks the key, writes the step to `bridge_calls` and waits up to 25 seconds. The Builder tab hears the step (through Realtime, and by looking every few seconds), runs it on the canvas with `runTool` from `assets/builder/model/agent.js`, and writes the answer back, which the function passes on. Besides the assistant's tools, a session offers `describe` (the brief and every tool's schema) and `edit_by_name` (an edit in the format Paste a layout reads).

**What stays private.** Only you see or answer your sessions' steps, and no browser can add one: the function adds them with the service key, on the server. Claude sees only what its steps ask for (an outline, a picture, a check). A session ends when you end it or after an hour without a step, and ended sessions are deleted with their steps after a day.

**Setting it up:**

1. Run `supabase/bridge.sql` in the SQL editor, after `schema.sql`. It's safe to run again, and adds the two tables to Realtime when the project has it.
2. Deploy the function without a session check, since Claude has no Supabase account: `supabase functions deploy bridge --no-verify-jwt`. The session key is what it checks instead.
3. Optionally set **`BRIDGE_HOURLY_LIMIT`** (steps per session per hour, 900 by default).

`sh supabase/tests/run.sh` tries who can see and answer a session, too.

## What's built and what's next

Built: the schema and its tests, signing in and out, new accounts with a
confirmed email, password resets, invites accepted on sign-in, files kept in
the cloud and brought level on sign-in, the assistant and live agent
sessions, and the sync engine for live editing. The Builder fetches nothing
until the address and key are set.

Next: live editing and presence on shared pages, and conversations shared in
a file.
