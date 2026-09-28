# Changelog strategy

How Dovetail records what changed, decides version numbers, and tells the people who build with it. The short version:

1. Every pull request that changes what the system ships adds one entry file to `changes/`.
2. Entries say what changed **for the consumer**, with a bump level and tags.
3. A release compiles the entries into `CHANGELOG.md`, bumps the version, tags it and publishes notes.
4. Breaking changes are rare, announced early through deprecations, and always come with migration steps.

The tooling is `tools/changelog.mjs` (`npm run change`, `npm run changelog`, `npm run check:changes`). This document is the why and the rules behind it.

---

## 1. Who reads the changelog

A design-system changelog has three readers, and each entry should work for all three.

| Reader | What they need | So an entry must |
| --- | --- | --- |
| **Product engineers** consuming the bundle, tokens or CSS | "Will upgrading break me, and what do I change?" | name the exact API (component, prop, token) and give migration steps for anything breaking |
| **Product designers** working from the site and Configure | "What looks different, and what new options do I have?" | flag visual changes and describe them in visual terms |
| **Contributors** | "What happened since I last looked?" | link to the pull request for detail |

The changelog is **not** a commit log. "Refactor Shelf", "fix lint" and "rebuild bundle" don't belong in it. The test for every line: would someone using Dovetail notice, act on it or benefit from knowing?

## 2. What is versioned

**The system is versioned; the documentation site is not.** Version numbers describe `system/`: the package teams copy or link. That covers:

- **Tokens**: every `--dt-*` custom property, its name, tier and meaning, and `tokens.json`.
- **Components**: every export of `bundle.js`, each prop, each prop value and default, and the namespace name.
- **Styles and themes**: `styles.css`, the theme and context files, and the class hooks (`.dark`, `.dt-context-*`).
- **Templates and kits** under `system/templates` and `system/kits`.

The site (`assets/`, generated pages, Configure) changes continuously and ships from `main`. A site change gets an entry only when it changes something a consumer takes away from it. Examples: what Configure exports, or a new download. Those use `area: site`, and a bump reflecting the effect on the exported output.

The single version number lives in `package.json` (`version`). A release updates it; nothing else does.

## 3. Version numbers: SemVer, applied to a design system

Dovetail follows [Semantic Versioning](https://semver.org). For a design system, "the public API" includes things a code library doesn't have: token names, token meanings, and how things look by default. These rules decide the bump.

### Major: someone's code or design breaks without them changing anything

- Removing or renaming a **token**, **component**, **prop**, **prop value**, CSS class hook, theme or context file.
- Changing a token's **meaning**. For example, `--dt-surface-selected` moving from a neutral to a brand colour is a different decision, even though the name stayed. So is a semantic token re-pointed at a role with a different intent.
- Changing a **default** that changes layout or behaviour: a prop default, a component's default size, a component that starts rendering a different element.
- Changing the **bundle namespace**, the React version requirement, or how the bundle must be loaded.
- Tightening accessibility behaviour in a way that requires consumer changes, such as a newly required `label` prop.

*Example from this repo's history:* renaming the `accent` ramp to `primary` (`--dt-color-accent-*` became `--dt-color-primary-*`) was a major change.

### Minor: something new, and nothing existing breaks

- A new component, prop, prop value, token, ramp, theme or context.
- A new optional capability, e.g. `Thinking`'s `screen="light"`, or the textural shapes.
- A **deliberate visual refresh** of an existing default that stays within the token's meaning, e.g. rebalancing the Thinking fluid. Flag it `visual: true`.
- **Deprecating** anything (see §6).

### Patch: fixes

- Bug fixes that restore intended behaviour.
- Accessibility fixes that need nothing from the consumer: contrast, focus visibility, announcements.
- Token **value** corrections that keep the meaning, e.g. nudging a step so white text passes 4.5:1. Flag it `visual: true` and give the old and new values.
- Performance, and documentation that ships inside `system/` (`.md`, `.d.ts` comments).

### None: nothing a consumer sees

Tooling, CI, refactors with identical output, and site-only changes that don't affect exports. These still need an entry file with `bump: none`, so that "no entry" always means "someone forgot". They don't appear in the published notes.

### Before 1.0

Dovetail starts at **0.1.0**. While the major number is 0, the API is not yet promised stable. Breaking changes and features both bump the **minor** number (0.1 → 0.2); fixes bump the patch (0.2.0 → 0.2.1). Everything else in this document applies unchanged. Breaking changes are still marked, still need migration steps, and still go through deprecation where practical.

**Go to 1.0.0** once `main` has been the shared branch for a few releases, at least one product consumes a tagged version, and the token names have survived a real project without renames.

## 4. Change entries

### Why entry files, not editing CHANGELOG.md

With several people working in parallel, everyone editing the top of one file guarantees merge conflicts, and changelog text written at release time is written from memory. Instead, each pull request adds a new file under `changes/`. Files never collide, each entry is reviewed alongside the code it describes, and the release step assembles them. (This is the "changesets" pattern, without the monorepo tooling.)

### Format

```markdown
---
type: added          # added | changed | deprecated | removed | fixed | security
bump: minor          # major | minor | patch | none
area: components     # tokens | components | styles | themes | templates | site | tooling
components: [Thinking]
tokens: [--dt-thinking-screen-light, --dt-thinking-light-color-start]
visual: false        # true when it looks different with no code change
---
Thinking's voice overlay has a light screen: `screen="light"` gives a bright frosted overlay with dark text that stays light on a dark page.

Optional detail: before/after, rationale, links. A major entry must have:

## Migration

Replace `tone="accent"` with `tone="primary"`. …
```

- **type** follows [Keep a Changelog](https://keepachangelog.com) categories. It sorts the entry into a section.
- **bump** decides the version (§3). The highest bump among the pending entries wins.
- **components / tokens** are tags. They render as code next to the entry and let a reader search for "everything that touched `Card`". List the exact names.
- **visual** marks changes teams should look at, e.g. by re-running visual regression tests.
- One entry per change a consumer would describe separately. A pull request that adds a component and fixes an unrelated token gets two entries.
- Name the file after the change: `changes/thinking-light-screen.md`.

### Writing the summary

The first paragraph is the line that ships in the notes, so write it for the reader in §1:

| Instead of | Write |
| --- | --- |
| "Refactored Thinking overlay styles" | "Thinking's voice overlay has a light screen: `screen=\"light\"`." |
| "Fix contrast" | "Secondary 600 is one step darker, so white text on it passes 4.5:1 (was 4.49:1)." |
| "Update tokens" | "New `--dt-blur-glass` and `--dt-backdrop-glass` tokens for frosted surfaces." |
| "Breaking: rename" | "`--dt-color-accent-*` is now `--dt-color-primary-*`." (with a Migration section) |

- Lead with the thing, in present tense: "Card accepts `href`…", not "Added href to Card".
- Name APIs in code format.
- Say what the reader can now do, or must now do.
- Keep it to a sentence or two; detail goes below.
- For visual changes, describe what looks different, not how it was implemented.

### Migration sections

Required for `bump: major`, and encouraged for deprecations. Include:

- the before and after code, or the before and after token names;
- a find-and-replace pattern when the change is mechanical;
- what to check visually afterwards.

## 5. Releasing

### Cadence

- **Scheduled:** every two weeks, if anything is pending. A predictable rhythm lets product teams plan upgrades.
- **Patch on demand:** a fix for something broken can ship the same day.
- **Majors are planned:** announced at least one release ahead, via the deprecations they complete.

### Steps (release owner)

1. Make sure `main` is green and up to date locally.
2. `npm run changelog` previews the notes and the computed version. Read them as a consumer: fix unclear entries in their files first.
3. `node tools/changelog.mjs --release` writes the new section at the top of `CHANGELOG.md`, bumps `package.json` and deletes the compiled entries. Override with `--version` only for a deliberate jump, like 1.0.0.
4. `npm run build`, so the site's changelog page picks up the new section.
5. Open a pull request titled `Release x.y.z` containing only those changes; merge after review.
6. The **Release** workflow (`.github/workflows/release.yml`) does the rest when it merges. It sees a version in `package.json` with no tag, tags the merge commit `vX.Y.Z`, and publishes a GitHub Release whose body is that version's `CHANGELOG.md` section (`node tools/changelog.mjs --notes x.y.z`). Nobody pushes tags by hand, so a Claude session can run a whole release through a pull request. Re-running the workflow is safe: it skips a version that is already tagged.
7. Post the summary where consumers will see it (§8).

### Roles

- **Author:** writes the entry with the change.
- **Reviewer:** checks the entry is accurate, correctly bumped, and understandable without the diff. A missing or wrong entry is a blocking review comment, like a missing test.
- **Release owner:** rotates each release. Runs §5 and chases unclear entries.
- **System owner** (see `CODEOWNERS`): signs off every `bump: major` entry before its pull request merges.

## 6. Deprecation policy

Nothing is removed without warning.

1. **Deprecate** in a minor release. The entry uses `type: deprecated`, names the replacement and states the version it will be removed in. The check fails a deprecation that doesn't say when it will be removed.
2. **Keep it working** in the meantime:
   - **Tokens:** the old name stays as an alias for the new one, with a comment: `--dt-color-accent-600: var(--dt-color-primary-600); /* deprecated 0.3.0, removed in 1.0.0 */`.
   - **Components and props:** they keep working and log a single `console.warn` in development naming the replacement.
   - **Docs:** the site marks the item Deprecated on its page.
3. **Remove** it in the next major (or, below 1.0, no sooner than two minor releases later). The removal entry is `type: removed`, `bump: major` and links back to the deprecation.

## 7. Enforcement

**Automated.** In CI, on every pull request:

- `node tools/changelog.mjs --check --base origin/main` validates every entry:
  - required fields present and valid;
  - majors have a Migration section;
  - deprecations name the removal version;
  - removals are major.
- It fails if the branch changes shipped sources but adds no entry. "Shipped sources" means `system/` components, tokens, styles, templates and kits, plus Configure's export logic. Generated files are ignored.
- The escape hatch is an entry with `bump: none`, which leaves a record, or the `skip-changelog` label for pull requests that truly have nothing to say (a typo in a comment).

**In review.** The pull request template asks for the entry and the bump. Reviewers check the bump against §3. When unsure between two levels, choose the higher one.

## 8. Where changes are published

| Channel | What | When |
| --- | --- | --- |
| `CHANGELOG.md` | the full history, newest first | every release |
| Site **Changelog** page (`guide/changelog.html`) | the same file, rendered on the site under Guide | on deploy after a release |
| GitHub Releases | one release per tag, body = that version's section | every release |
| Team channel (Slack or similar) | a short post: version, the one or two headline items, breaking changes and a link | every release; majors also get a heads-up one release ahead |

Post template:

> **Dovetail 0.3.0** is out. ✨ *Thinking* gets a light voice screen and four textural shapes. ⚠️ Visual: Secondary 600 is one step darker. Full notes: https://graham-goebel.github.io/Dovetail/guide/changelog.html

## 9. Later improvements

These build on the entry files once the basics are habit:

1. **Token diff in release notes.** Compare `system/tokens.json` between the last tag and `HEAD`. List added, removed and changed tokens (old value → new value) automatically under each release. Fail the release if a token disappeared with no major entry.
2. **Component API diff.** Do the same for the props in each `*.d.ts`: a prop removed or narrowed without a major entry fails the release.
3. **Per-component history.** Each component page gets a History section listing the entries tagged with that component.
4. **Version in exports.** Configure's CSS export and the downloads carry the version they were generated from, so a team knows what they're on.
5. **Visual regression.** Screenshot every preview card on each pull request (the repo has the tooling) and require `visual: true` on any entry whose cards changed.

## 10. Rollout

| Step | What | Status |
| --- | --- | --- |
| 1 | `changes/`, `tools/changelog.mjs`, `CHANGELOG.md` with the 0.1.0 baseline, this document | done |
| 2 | CI check on pull requests; changelog section in the PR template | done |
| 3 | Site Changelog page generated from `CHANGELOG.md` | done |
| 4 | Make `main` the default branch, protect it | done |
| 4a | Release workflow: tags and publishes each new version from `main`, starting with `v0.1.0` | done |
| 5 | First scheduled release two weeks after step 4 | pending |
| 6 | Token diff, then component API diff (§9) | later |
