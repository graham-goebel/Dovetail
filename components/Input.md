# Input

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Input.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Input.jsx), [Input.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Input.d.ts), [Input.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Input.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Input.html

## Guidelines

Single-line text field. Builds its own Field when given a label.

### Use it when
- Collecting a short, free-form value: name, email, search term.

### Don't use it when
- The value is one of a known set. Use Select.
- The answer runs past a line. Use Textarea.

### Example
\`\`\`jsx
<Input label="Work email" type="email" required hint="We only use this for billing" />
<Input label="Email" error="That email is already in use. Try signing in instead." />
\`\`\`

### Tokens
--dt-input-*, shared with Textarea and Select so every field in a form has identical geometry.

### Accessibility
Generates an id and wires htmlFor automatically. The error prop sets aria-invalid and announces in a live region. Placeholder is never a label; it disappears the moment someone types.

### Content
Label is a sentence-case noun. Placeholder shows format, not instruction: "name@company.com", not "Enter your email".

## Props

```ts
import * as React from "react";

/**
 * Single-line text field.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Sets aria-invalid and the error border. */
  error?: string;
  required?: boolean;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Leading icon, 20px. Decorative — it is aria-hidden. */
  iconStart?: React.ReactNode;
}

export declare function Input(props: InputProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-input-bg-disabled` | component | `var(--dt-surface-disabled)` |
| `--dt-input-border` | component | `var(--dt-border-default)` |
| `--dt-input-border-error` | component | `var(--dt-surface-danger)` |
| `--dt-input-border-focus` | component | `var(--dt-focus-ring-color)` |
| `--dt-input-border-hover` | component | `var(--dt-border-strong)` |
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
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";

export function Input({ label, hint, error, required, size = "md", id, iconStart, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const auto = React.useId();
  const inputId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : hover ? "var(--dt-input-border-hover)" : "var(--dt-input-border)";

  const control = (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {iconStart && (
        <span aria-hidden="true" style={{ position: "absolute", left: "var(--dt-input-padding-x)", display: "flex", color: "var(--dt-text-tertiary)", pointerEvents: "none" }}>
          {iconStart}
        </span>
      )}
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          height: `var(--dt-input-height-${size})`,
          padding: iconStart
            ? "0 var(--dt-input-padding-x) 0 calc(var(--dt-input-padding-x) * 2 + var(--dt-size-icon-md))"
            : "0 var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          color: "var(--dt-input-fg)",
          background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
        {...rest}
      />
    </div>
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} style={style}>{control}</Field>;
}
```
