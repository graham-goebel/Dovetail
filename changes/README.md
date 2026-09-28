# Pending changelog entries

One file per change a consumer would notice, added in the same pull request as the change. A release compiles them into `CHANGELOG.md` and deletes them. The full rules are in [docs/changelog.md](../docs/changelog.md).

Start one with:

```sh
npm run change -- thinking-light-screen
```

Then fill in the front matter and the summary:

```markdown
---
type: added          # added | changed | deprecated | removed | fixed | security
bump: minor          # major | minor | patch | none
area: components     # tokens | components | styles | themes | templates | site | tooling
components: [Thinking]
tokens: [--dt-thinking-screen-light]
visual: false        # true when it looks different with no code change
---
Thinking's voice overlay has a light screen: `screen="light"`.
```

- **The summary is what ships.** Write one sentence for the people who build with Dovetail: what changed, and what they can now do (or must now do).
- **`bump: major`** is for anything that breaks existing use: a renamed or removed token, component, prop or value, a changed token meaning, or a changed default. It needs a `## Migration` section.
- **`bump: none`** is for changes nobody using the system would notice: tooling, refactors, CI. It keeps the record honest and satisfies the check without appearing in the notes.

`npm run changelog` previews the next release. `npm run check:changes` validates the entries.
