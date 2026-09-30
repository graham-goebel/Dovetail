# CheckboxGroup

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [CheckboxGroup.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/CheckboxGroup.jsx), [CheckboxGroup.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/CheckboxGroup.d.ts), [CheckboxGroup.md](https://graham-goebel.github.io/Dovetail/system/components/forms/CheckboxGroup.md).

Live page: https://graham-goebel.github.io/Dovetail/components/CheckboxGroup.html

## Guidelines

A labelled set of checkboxes answering one question. Use it whenever two or more checkboxes belong together, because a loose column of \`Checkbox\` has no accessible name, so a screen reader reads the options without ever saying what they are for.

### Checkbox or radio

Checkboxes mean any number, including none. Radios mean exactly one. If the answer is genuinely binary and independent, use a single \`Switch\` instead; it commits immediately, which is the right feel for a setting.

### Orientation

Vertical by default, because a column is faster to scan and leaves room for hints. Use \`orientation="horizontal"\` only for three or fewer short options with no hint text.

### Control at the end

Set \`labelPosition="start"\` to put each label on the left and each box at the right edge of the row. The labels then line up with the group's question instead of indenting past the boxes, which reads better in narrow panels, settings lists and filter sidebars. The whole row stays clickable.

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

\`\`\`jsx
<CheckboxGroup
  label="Show"
  labelPosition="start"
  options={[
    { value: "paid", label: "Paid invoices" },
    { value: "overdue", label: "Overdue invoices" },
  ]}
/>
\`\`\`

## Props

```ts
import * as React from "react";

export interface CheckboxOption {
  value: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

/** A labelled set of checkboxes sharing one question. Returns an array of selected values. */
export interface CheckboxGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** The question the set answers. Required — a bare column of checkboxes has no accessible name. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options: CheckboxOption[];
  /** Controlled selection. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  /** @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Passed to every option. "start" puts each label on the left and each control at the right edge of the row, so labels line up with the group's question instead of indenting. @default "end" */
  labelPosition?: "start" | "end";
  name?: string;
}

export declare function CheckboxGroup(props: CheckboxGroupProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-space-inline-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-stack-sm` | semantic | `var(--dt-dim-3)` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";
import { Checkbox } from "./Checkbox.jsx";

export function CheckboxGroup({ label, hint, error, required = false, options = [], value, defaultValue = [], onChange, disabled = false, orientation = "vertical", labelPosition = "end", name, style, ...rest }) {
  const ids = React.useId();
  const [internal, setInternal] = React.useState(defaultValue);
  const selected = value !== undefined ? value : internal;

  const toggle = (optValue) => {
    const next = selected.includes(optValue) ? selected.filter(v => v !== optValue) : [...selected, optValue];
    if (value === undefined) setInternal(next);
    onChange && onChange(next);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} labelId={`${ids}-label`} messageId={`${ids}-message`} style={style} {...rest}>
      <div
        role="group"
        aria-labelledby={label ? `${ids}-label` : undefined}
        aria-describedby={error || hint ? `${ids}-message` : undefined}
        style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column", flexWrap: "wrap", gap: orientation === "horizontal" ? "var(--dt-space-inline-lg)" : "var(--dt-space-stack-sm)" }}
      >
        {options.map(opt => (
          <Checkbox
            key={opt.value}
            name={name}
            label={opt.label}
            hint={opt.hint}
            checked={selected.includes(opt.value)}
            disabled={disabled || opt.disabled}
            labelPosition={labelPosition}
            onChange={() => toggle(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}
```
