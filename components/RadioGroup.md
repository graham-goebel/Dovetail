# RadioGroup

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [RadioGroup.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/RadioGroup.jsx), [RadioGroup.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/RadioGroup.d.ts), [RadioGroup.md](https://graham-goebel.github.io/Dovetail/system/components/forms/RadioGroup.md).

Live page: https://graham-goebel.github.io/Dovetail/components/RadioGroup.html

## Guidelines

A labelled set of radios where exactly one option wins. Always use the group rather than loose \`Radio\` elements: it generates the shared \`name\`, applies \`role="radiogroup"\`, and gives the set an accessible name.

### Always preselect

Ship a \`defaultValue\`. An empty radio group forces a decision before the user has read the options and cannot be returned to its original state once touched. If no option is a safe default, the question is a \`Select\` with a placeholder, not a radio group.

### When to use a Select instead

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

## Props

```ts
import * as React from "react";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

/** A labelled set of radios. Exactly one option is selected. */
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** The question the set answers. Required. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Shared input name. Generated when omitted. */
  name?: string;
}

export declare function RadioGroup(props: RadioGroupProps): JSX.Element;
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
import { Radio } from "./Radio.jsx";

export function RadioGroup({ label, hint, error, required = false, options = [], value, defaultValue, onChange, disabled = false, orientation = "vertical", name, style, ...rest }) {
  const auto = React.useId();
  const groupName = name || auto;
  const [internal, setInternal] = React.useState(defaultValue);
  const selected = value !== undefined ? value : internal;

  const pick = (optValue) => {
    if (value === undefined) setInternal(optValue);
    onChange && onChange(optValue);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required} style={style} {...rest}>
      <div role="radiogroup" style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column", flexWrap: "wrap", gap: orientation === "horizontal" ? "var(--dt-space-inline-lg)" : "var(--dt-space-stack-sm)" }}>
        {options.map(opt => (
          <Radio
            key={opt.value}
            name={groupName}
            value={opt.value}
            label={opt.label}
            hint={opt.hint}
            checked={selected === opt.value}
            disabled={disabled || opt.disabled}
            onChange={() => pick(opt.value)}
          />
        ))}
      </div>
    </Field>
  );
}
```
