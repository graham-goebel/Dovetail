# Field

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Field.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Field.jsx), [Field.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Field.d.ts), [Field.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Field.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Field.html

## Guidelines

The wrapper that gives a control its label, hint, and error. Input, Textarea, and Select render their own Field when you pass them a label; use Field directly when you need to wrap something else.

### Use it when
- Wrapping a custom or composed control that needs the standard label and error treatment.

### Don't use it when
- You are using Input, Textarea, or Select with a label prop. They already build one.

### Example
\`\`\`jsx
<Field label="Timezone" hint="Used for scheduling" htmlFor="tz">
  <MyCustomPicker id="tz" />
</Field>
\`\`\`

### Accessibility
htmlFor must point at the control's id. The error renders in role="alert" so it is announced when it appears. The required asterisk is aria-hidden, so set required on the control so assistive tech hears it once, not twice.

### Content
Labels are sentence case nouns without a colon. Hints explain the format or the consequence. Errors say what happened and what to do next: "That email is already in use. Try signing in instead."

## Props

```ts
import * as React from "react";

/** Label, control, hint, and error wrapper. Every form control in a form goes inside one. */
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  /** Helper text shown below the control. */
  hint?: string;
  /** Replaces the hint and renders in an alert live region. */
  error?: string;
  /** Adds a required marker to the label. Also set the required attribute on the control. */
  required?: boolean;
  /** id of the control this labels. */
  htmlFor?: string;
  children?: React.ReactNode;
}

export declare function Field(props: FieldProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-error-color` | component | `var(--dt-text-danger)` |
| `--dt-input-hint-color` | component | `var(--dt-text-secondary)` |
| `--dt-input-label-gap` | component | `var(--dt-space-stack-2xs)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |

## Source

```jsx
import React from "react";

export function Field({ label, hint, error, required = false, htmlFor, children, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)", ...style }} {...rest}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
            lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-text-label-md-weight)",
            color: "var(--dt-text-primary)",
          }}
        >
          {label}
          {required && <span aria-hidden="true" style={{ color: "var(--dt-text-danger)", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div
          role={error ? "alert" : undefined}
          style={{
            fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
            lineHeight: "var(--dt-text-body-xs-line)",
            color: error ? "var(--dt-input-error-color)" : "var(--dt-input-hint-color)",
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
```
