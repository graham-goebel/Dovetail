# RadioGroup

A labelled set of radios where exactly one option wins. Always use the group rather than loose \`Radio\` elements: it generates the shared \`name\`, applies \`role="radiogroup"\`, and gives the set an accessible name.

## Always preselect

Ship a \`defaultValue\`. An empty radio group forces a decision before the user has read the options and cannot be returned to its original state once touched. If no option is a safe default, the question is a \`Select\` with a placeholder, not a radio group.

## Control at the end

\`labelPosition="start"\` puts each label on the left and each radio at the right edge of the row, so the options line up with the group's question instead of indenting. It suits narrow panels and settings lists, where the right edge is where the eye looks for the control.

\`\`\`jsx
<RadioGroup label="Sort by" labelPosition="start" defaultValue="due" options={[
  { value: "due", label: "Due date" },
  { value: "amount", label: "Amount" },
]} />
\`\`\`

## When to use a Select instead

Radios show every option at once, which is their advantage and their cost. Past about five options they crowd the form, so switch to \`Select\`. Below three, consider whether the choice is really a \`Switch\`.

\`\`\`jsx
<RadioGroup
  label="Deployment target"
  defaultValue="staging"
  options={[
    { value: "staging", label: "Staging", hint: "Rebuilt on every merge" },
    { value: "canary", label: "Canary", hint: "Five percent of traffic" },
    { value: "production", label: "Production" },
  ]}
/>
\`\`\`
