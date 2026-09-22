# CheckboxGroup

A labelled set of checkboxes answering one question. Use it whenever two or more checkboxes belong together, because a loose column of \`Checkbox\` has no accessible name, so a screen reader reads the options without ever saying what they are for.

## Checkbox or radio

Checkboxes mean any number, including none. Radios mean exactly one. If the answer is genuinely binary and independent, use a single \`Switch\` instead; it commits immediately, which is the right feel for a setting.

## Orientation

Vertical by default, because a column is faster to scan and leaves room for hints. Use \`orientation="horizontal"\` only for three or fewer short options with no hint text.

\`\`\`jsx
<CheckboxGroup
  label="Notify me about"
  hint="You can change this at any time."
  options={[
    { value: "deploys", label: "Deploys" },
    { value: "incidents", label: "Incidents", hint: "Paged immediately" },
    { value: "digest", label: "Weekly digest" },
  ]}
  defaultValue={["incidents"]}
/>
\`\`\`
