---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) edits a component's array props as lists, item by item.

- **Lists come from the types.** An array prop whose item type the builder can read becomes a list in the Content tab, such as `FaqBlock.items`, `Accordion.items`, `Tabs.tabs`, `Table.columns`, `StatsBlock.stats`, `Navbar.links` and `CheckboxGroup.options`. That's 33 props in all, and no component lists them by hand.
  - Each item folds open onto its fields: text, numbers, switches, choices from a literal union, links and image URLs.
  - An item is named by its title or question, not its id.
  - A prop that holds state, such as `defaultOpen`, isn't offered.
- **Add, move and remove items.** A new item copies the last one and gets an id of its own (`ship-2`), so it doesn't share open or selected state with the item it came from.
- **Links stay safe.** A link field takes an https, relative, `mailto:` or `tel:` link as you type, and shows a `javascript:` URL as invalid without keeping it.
- **Real code.** Code writes the list as an array in its prop, for example `items={[{ id: "ship", question: "How long does shipping take?", answer: "…" }]}`.
- **Layouts and links.** A layout or share link can carry lists. `assets/builder-layouts.md` marks each list prop with its fields, and a list with an unknown field or a bad value is left out.
