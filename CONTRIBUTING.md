# Working together on Dovetail

How to get set up, make a change, and get it merged when several people (and their Claude sessions) work on this repository at once. For *what* makes a good component or token, read [the system's contributing guide](system/guidelines/contributing.md). This file covers *how* work moves through the repo.

## What's where

| Path | What it is | Edited by |
| --- | --- | --- |
| `system/` | The design system itself: tokens, components, styles, templates. **This is what gets versioned.** | hand |
| `system/components/**/*.jsx` | Component sources, one folder per group, each with `.d.ts` and `.md` beside it | hand |
| `system/tokens/` | CSS custom properties in three tiers, plus `tokens.json` / `dovetail.tokens.json` | hand |
| `previews/` | One live card per component or foundation, embedded on the site | hand (the build patches a few lines) |
| `assets/` | The site's own CSS and JS, including the Configure panel (`theme.js`) | hand |
| `tools/` | Build scripts and checks | hand |
| `changes/` | Pending changelog entries, one per change | hand |
| `examples/` | Sites built with Dovetail, as stretch tests | hand |
| `index.html`, `components/`, `foundations/`, `showcase/`, `guide/`, `tokens.html`, `downloads.html` | The documentation site | **generated** |
| `system/components/bundle.js`, `system/_ds_bundle.js`, `system/templates/_support/card-kit.js`, `assets/configure-data.js`, `assets/graph-data.js` | Build output | **generated** |

**Never edit a generated file by hand.** Change its source and run `npm run build`.

## Setup

You need Node 22 or newer.

```sh
npm ci                               # build tools (Babel) and the browser checks (Playwright)
npx playwright install chromium      # once, for npm run check:browser
npm run serve                        # the site at http://localhost:8099
```

## The flow

1. **Start from an up-to-date `main`** and create a branch: `git switch -c <your-name>/<topic>`, e.g. `sam/card-media-slot`. Claude sessions use `claude/<topic>`. **One person or one session per branch.**
2. **Keep it small.** One component, one token change, or one fix per pull request. A reviewer should be able to read it in one sitting.
3. **Make the change**, then rebuild and check:

   ```sh
   npm run build     # bundle, card kit and site
   npm run check     # generated files current, changelog entries valid, every card and page loads cleanly
   ```

4. **Add a changelog entry** if anything a consumer sees changed: `npm run change -- <slug>`, then fill it in. See [changes/README.md](changes/README.md). Tooling-only changes still get an entry, with `bump: none`.
5. **Commit the source and the rebuilt output together**, then push and open a pull request. The template asks for what changed, the bump, and how you checked it.
6. **CI runs the same checks.** A reviewer from [CODEOWNERS](.github/CODEOWNERS) approves. Squash-merge into `main`, and `main` deploys to GitHub Pages.

### Staying current and resolving conflicts

- **Merge `main` into your branch** (`git merge origin/main`) rather than rebasing a branch someone else may have checked out.
- **Conflicts in generated files are never resolved by hand.** Take either side (`git checkout --theirs <file>`), run `npm run build`, and commit the result. `.gitattributes` marks these files so GitHub collapses them in diffs.
- **Conflicts in `changes/` can't happen,** because every entry is its own file. That's the point.

## Making common changes

### A token

- Tokens live in three tiers:
  - `tokens/primitive/` holds raw values;
  - `tokens/semantic/` holds roles, and only these may point at primitives;
  - `tokens/component/` holds component-scoped aliases of semantic tokens.
- Components read semantic or component tokens, never primitives.
- **The scoped-dark rule.** Custom properties resolve where they're declared, so any colour alias that must follow a `.dark` band is repeated under `.dark` in its own file. Check a new colour token inside a dark `Section`, not just with the whole page dark.
- Update `system/tokens.json` and `system/tokens/dovetail.tokens.json` to match.
- Renaming or removing a token, or changing what it means, is a **breaking change**. Deprecate first ([docs/changelog.md §6](docs/changelog.md)).

### A component

1. Add the four files: `Name.jsx`, `Name.d.ts`, `Name.md` in `system/components/<group>/`, plus a card at `previews/Name.html` with an `@dsCard` header comment. Copy a recent card such as `previews/Thinking.html` as a start.
2. Register the name in `system/manifest.json` (`components`) and give it a specimen in `assets/specimens.js`.
3. `npm run build`. The bundle build finds the new `.jsx` by itself, and the site build gives it a page.
4. Cards load shared code by reference; don't paste it in:
   - `../system/styles.css`
   - `../system/templates/_support/card-theme-sync.js`
   - `card-kit.js` / `card-kit.css`, if the card uses `Shelf`, `PropTable` and friends

   The browser check fails a card that inlines them again.

### The site or Configure

Edit `assets/` or `tools/build-site.mjs`, run `npm run build`, and look at the result with `npm run serve`. Check both a phone width (390px) and desktop, in light and dark.

## Checks

| Command | What it checks |
| --- | --- |
| `npm run check:build` | The bundle, card kit and site are current with their sources |
| `npm run check:changes` | Every entry in `changes/` is valid (fields, migration notes for majors) |
| `npm run check:browser` | Every card and every site page loads with no script error, no missing local file and no bundle error; every local link resolves |
| `npm run check` | All three |

In CI, pull requests also have to add a changelog entry when they touch shipped sources. Add `bump: none` or the `skip-changelog` label if there's truly nothing to say.

## Working with Claude Code

- Each person's session works on its own branch and opens its own pull request. Don't point two sessions at one branch.
- Sessions read [CLAUDE.md](CLAUDE.md) first. It holds the rules above in the form an agent needs. Keep it current when a convention changes.
- Ask the session to run `npm run check` before it pushes, and to add the changelog entry.

## Without git

Designers can still propose changes. Make them in the site's **Configure** panel, use **Export**, and attach the result to a GitHub issue describing the intent. An owner of the area turns it into a pull request.

## Releases

Scheduled every two weeks when anything is pending, with patches on demand. The release owner compiles `changes/` into `CHANGELOG.md` with `node tools/changelog.mjs --release`, then tags and publishes. The full process and the versioning rules are in [docs/changelog.md](docs/changelog.md).
