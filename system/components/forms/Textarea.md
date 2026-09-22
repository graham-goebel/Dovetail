# Textarea

Multi-line text field.

## Use it when
- The answer is a sentence or longer: a description, a message, a note.

## Don't use it when
- The answer is one short value. Use Input; a large box invites a long answer.

## Example
\`\`\`jsx
<Textarea label="What changed?" rows={5} hint="Shown in the changelog" />
\`\`\`

Horizontal resize is disabled: a textarea wider than its container breaks the layout and the user gains nothing.

## Tokens
--dt-input-*, shared with Input and Select.
