# RadioGroup

A labelled set of radios where exactly one option wins. Always use the group rather than loose \`Radio\` elements: it generates the shared \`name\`, applies \`role="radiogroup"\`, and gives the set an accessible name.

## Always preselect

Ship a \`defaultValue\`. An empty radio group forces a decision before the user has read the options and cannot be returned to its original state once touched. If no option is a safe default, the question is a \`Select\` with a placeholder, not a radio group.

## When to use a Select instead

Radios show every option at once, which is their advantage and their cost. Past about five options they crowd the form — switch to \`Select\`. Below three, consider whether the choice is really a \`Switch\`.

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
