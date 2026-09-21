# Select

Dropdown for a known set of options. Uses a native select, so it gets the platform's picker on mobile for free.

## Use it when
- Five or more options, one answer.

## Don't use it when
- Two or three options. Use Radio — visible options are faster than hidden ones.
- The list is long enough to need search. That is a Combobox, which arrives in Phase 3.
- Multiple answers. Use Checkbox.

## Example
\`\`\`jsx
<Select label="Plan" placeholder="Choose a plan" options={["Starter", "Team", "Enterprise"]} />
\`\`\`

## Tokens
--dt-input-*, shared with Input and Textarea.

## Content
Placeholder is an instruction, not a fake value: "Choose a plan". Options are sentence case and parallel in structure.
