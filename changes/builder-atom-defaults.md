---
type: changed
bump: none
area: site
components: []
tokens: []
visual: true
---
On the Builder page (`builder.html`), a component added with nothing set starts from its own defaults instead of its component-index specimen, and the exported code leaves documented defaults out.

- **Atoms start plain and say what they are.** A fresh Text is `<Text>Text</Text>` in the body variant, not an eyebrow; a Heading is `<Heading level={2}>Heading</Heading>`, sized by its level; a Button is `<Button>Button</Button>` at its default size; a Card is `<Card title="Card" description="A line of copy." />`. Input, Select and Textarea start with the label "Label" and no value, and Checkbox, Radio and Switch start off, labelled with their own names. Badge, Tag, Link, Divider, Alert, Banner, Callout, Carousel, Image and Video drop their specimen's tone, selection, label or layout the same way.
- **Blocks keep their sample copy.** Blocks, commerce, chat, navigation and the other larger components still start from their sample, because the copy is what makes them readable.
- **The code leaves documented defaults out.** A prop whose value is the component's `@default` isn't written, so `<Button size="md">` exports as `<Button>`. A heading's `level` is always written, and a default you chose over a different starting value stays in the code, so it pastes back as it was.
