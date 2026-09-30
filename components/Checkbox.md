# Checkbox

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Checkbox.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Checkbox.jsx), [Checkbox.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Checkbox.d.ts), [Checkbox.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Checkbox.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Checkbox.html

## Guidelines

Binary choice inside a form, committed when the form is submitted.

### Use it when
- Opting in or out: terms, notifications, add-ons.
- Selecting several items from a list.
- indeterminate: a "select all" row over a partial selection.

### Don't use it when
- The change applies immediately. Use Switch.
- The options are mutually exclusive. Use Radio.

### Example
```jsx
<Checkbox label="Email me about product updates" hint="About one message a month" />
<Checkbox label="Select all" indeterminate={some && !all} onChange={toggleAll} />
```

### Variants
labelPosition="start" puts the label on the left and the box at the right edge of the row. Use it in a column of options under a heading or field label, where a leading box would indent every label past the text above it. It's the same settings-row pattern as `Switch`.

```jsx
<Checkbox label="Include archived invoices" labelPosition="start" />
```

### Accessibility
The real input stays in the DOM and receives focus, so keyboard and screen-reader behaviour is native. The indeterminate flag is set on the element, not faked with an attribute.

### Content
Label states what checking it does, phrased positively. "Email me about product updates", never "Do not email me".

## Props

```ts
import * as React from "react";

/** Binary choice within a form. Supports an indeterminate state for parent rows. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  /** Secondary line below the label. */
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  /** Visual dash state for a parent controlling a partially-selected group. */
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** "start" puts the label on the left and pushes the control to the right edge, so labels in a column line up with the text above them instead of indenting past the control. @default "end" */
  labelPosition?: "start" | "end";
}

export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-border-strong` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-radius-raw-4` | primitive | `4px` |

## Source

```jsx
import React from "react";

export function Checkbox({ label, hint, checked, defaultChecked = false, indeterminate = false, onChange, disabled = false, id, labelPosition = "end", style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const ref = React.useRef(null);
  const auto = React.useId();
  const boxId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  React.useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        ref={ref} type="checkbox" id={boxId} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label
        htmlFor={boxId}
        style={{
          display: "flex", gap: "var(--dt-space-inline-xs)", cursor: disabled ? "not-allowed" : "pointer", alignItems: hint ? "flex-start" : "center",
          justifyContent: labelPosition === "start" ? "space-between" : undefined,
          width: labelPosition === "start" ? "100%" : undefined,
          flexDirection: labelPosition === "start" ? "row-reverse" : "row",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "none", width: 18, height: 18, marginTop: hint ? 2 : 0, boxSizing: "border-box",
            borderRadius: "var(--dt-radius-raw-4)",
            border: `var(--dt-border-width-strong) solid ${isOn || indeterminate ? "var(--dt-surface-action)" : "var(--dt-border-strong)"}`,
            background: isOn || indeterminate ? "var(--dt-surface-action)" : "var(--dt-input-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background var(--dt-motion-micro), border-color var(--dt-motion-micro)",
          }}
        >
          {indeterminate ? (
            <svg width="10" height="10" viewBox="0 0 24 24" stroke="var(--dt-text-on-action)" strokeWidth="4" strokeLinecap="round"><path d="M5 12h14" /></svg>
          ) : isOn ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dt-text-on-action)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : null}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
          {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
```
