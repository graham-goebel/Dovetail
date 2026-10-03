---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder page (`builder.html`) reads JSX, so an example from the docs becomes layers you can keep editing.

- **Paste a layout** takes JSX that uses Dovetail components, with or without its import line or a code fence, as well as JSON and links.
  - Tags, text and literal props come in. A `<div>` becomes a Group, an `<img>` an Image.
  - A `style={{ … }}` value that matches a token becomes that token.
  - A slot prop written as JSX, such as `actions={<>…</>}`, fills the slot.
  - Code can't run there, so handlers, variables and spread props are listed and left out. `items.map((it) => <Card … />)` comes in as sample Cards filled from their defaults.
- The Code dialog's JSX pastes back.
- **Open in builder** sits on every JSX example in the docs that uses components. It adds the example to the builder as a new frame beside your saved work. Source listings don't get the button.
