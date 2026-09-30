# Select

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Select.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Select.jsx), [Select.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Select.d.ts), [Select.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Select.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Select.html

## Guidelines

Dropdown for a known set of options. Uses a native select, so it gets the platform's picker on mobile for free.

### Use it when
- Five or more options, one answer.

### Don't use it when
- Two or three options. Use Radio; visible options are faster than hidden ones.
- The list is long enough to need search. That is a Combobox, which arrives in Phase 3.
- Multiple answers. Use Checkbox.

### Example
\`\`\`jsx
<Select label="Plan" placeholder="Choose a plan" options={["Starter", "Team", "Enterprise"]} />
\`\`\`

### Tokens
--dt-input-*, shared with Input and Textarea.

### Content
Placeholder is an instruction, not a fake value: "Choose a plan". Options are sentence case and parallel in structure.

## Props

```ts
import * as React from "react";

/** Dropdown for a known set of options. Native select underneath. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Strings or {value,label} pairs. */
  options?: Array<string | { value: string; label: string }>;
  /** Empty-value first option, e.g. "Choose a plan". */
  placeholder?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

export declare function Select(props: SelectProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-input-bg-disabled` | component | `var(--dt-surface-disabled)` |
| `--dt-input-border` | component | `var(--dt-border-default)` |
| `--dt-input-border-error` | component | `var(--dt-surface-danger)` |
| `--dt-input-border-focus` | component | `var(--dt-focus-ring-color)` |
| `--dt-input-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-input-fg` | component | `var(--dt-text-primary)` |
| `--dt-input-font-family` | component | `var(--dt-text-body-md-family)` |
| `--dt-input-font-size` | component | `var(--dt-font-size-sm)` |
| `--dt-input-height-lg` | component | `var(--dt-size-control-lg)` |
| `--dt-input-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-input-height-sm` | component | `var(--dt-size-control-sm)` |
| `--dt-input-padding-x` | component | `var(--dt-space-inset-sm)` |
| `--dt-input-radius` | component | `var(--dt-radius-control)` |
| `--dt-input-transition` | component | `var(--dt-motion-micro)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";

export function Select({ label, hint, error, required, options = [], placeholder, size = "md", id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const auto = React.useId();
  const selectId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : "var(--dt-input-border)";

  const control = (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          height: `var(--dt-input-height-${size})`,
          padding: "0 calc(var(--dt-input-padding-x) * 2 + var(--dt-size-icon-sm)) 0 var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          color: "var(--dt-input-fg)",
          background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          appearance: "none",
          cursor: "pointer",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
      <svg
        aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: "absolute", right: "var(--dt-input-padding-x)", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", pointerEvents: "none", color: "var(--dt-text-secondary)" }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId} style={style}>{control}</Field>;
}
```
