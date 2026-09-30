# Textarea

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Textarea.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Textarea.jsx), [Textarea.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Textarea.d.ts), [Textarea.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Textarea.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Textarea.html

## Guidelines

Multi-line text field.

### Use it when
- The answer is a sentence or longer: a description, a message, a note.

### Don't use it when
- The answer is one short value. Use Input; a large box invites a long answer.

### Example
\`\`\`jsx
<Textarea label="What changed?" rows={5} hint="Shown in the changelog" />
\`\`\`

Horizontal resize is disabled: a textarea wider than its container breaks the layout and the user gains nothing.

### Tokens
--dt-input-*, shared with Input and Select.

## Props

```ts
import * as React from "react";

/** Multi-line text field. Resizes vertically only. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** @default 4 */
  rows?: number;
}

export declare function Textarea(props: TextareaProps): React.JSX.Element;
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
| `--dt-input-padding-x` | component | `var(--dt-space-inset-sm)` |
| `--dt-input-radius` | component | `var(--dt-radius-control)` |
| `--dt-input-transition` | component | `var(--dt-motion-micro)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-line-height-sm` | primitive | `20px` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";

export function Textarea({ label, hint, error, required, rows = 4, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const auto = React.useId();
  const areaId = id || auto;
  const border = error ? "var(--dt-input-border-error)" : focus ? "var(--dt-input-border-focus)" : "var(--dt-input-border)";

  const control = (
    <textarea
      id={areaId}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: "100%",
        padding: "var(--dt-space-inset-xs) var(--dt-input-padding-x)",
        fontFamily: "var(--dt-input-font-family)",
        fontSize: "var(--dt-input-font-size)",
        lineHeight: "var(--dt-line-height-sm)",
        color: "var(--dt-input-fg)",
        background: rest.disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
        border: `var(--dt-input-border-width) solid ${border}`,
        borderRadius: "var(--dt-input-radius)",
        outline: "none",
        resize: "vertical",
        transition: "border-color var(--dt-input-transition)",
        boxSizing: "border-box",
      }}
      {...rest}
    />
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId} style={style}>{control}</Field>;
}
```
