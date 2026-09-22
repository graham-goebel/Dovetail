# Code

Marks text that must be read literally: token names, file paths, commands, snippets.

## Rules

- Inline code does not wrap. Keep it to a short identifier; a whole command belongs in a
  block.
- Give every block a `label` when the snippet belongs to a file. A snippet with no
  filename is hard to act on.
- Do not syntax-highlight. This component ships one colour on purpose; highlighting is a
  product decision and a dependency, not a system default.
- Never put code in a Prose paragraph without this component. Proportional digits and
  ligatures change what the reader copies.

## Tradeoffs

Blocks scroll horizontally rather than wrap, because a wrapped command can be copied
incorrectly. That costs the reader a scroll on narrow screens.
