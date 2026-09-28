# Radio

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Radio.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Radio.jsx), [Radio.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Radio.d.ts), [Radio.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Radio.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Radio.html

## Guidelines

One choice from a mutually exclusive set, with all options visible.

### Use it when
- Two to five options and the user benefits from seeing them all.

### Don't use it when
- More than about five options. Use Select.
- The choices are not exclusive. Use Checkbox.
- There are exactly two opposite states applied instantly. Use Switch.

### Example
```jsx
<Stack gap="xs">
  <Radio name="billing" value="monthly" label="Monthly" hint="$20 per seat" defaultChecked />
  <Radio name="billing" value="annual" label="Annual" hint="$16 per seat, billed yearly" />
</Stack>
```

### Accessibility
Every radio in a group needs the same name: that is what gives the group arrow-key navigation and a single tab stop. Wrap the group in a fieldset with a legend, or a Field with role="radiogroup".

### Content
Options are parallel in structure and length. Put price or consequence in the hint, not the label.

## Props

```ts
import * as React from "react";

/** One choice from a mutually exclusive set. Group several by giving them the same name. */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  hint?: string;
  /** Shared across the group. Required for keyboard arrow navigation to work. */
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export declare function Radio(props: RadioProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-input-bg` | component | `var(--dt-surface-base)` |
| `--dt-border-strong` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-surface-action` | semantic | `var(--dt-color-primary-600)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |

## Source

```jsx
import React from "react";

export function Radio({ label, hint, name, value, checked, defaultChecked, onChange, disabled = false, id, style, ...rest }) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const auto = React.useId();
  const radioId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  return (
    <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        type="radio" id={radioId} name={name} value={value} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label htmlFor={radioId} style={{ display: "flex", gap: "var(--dt-space-inline-xs)", cursor: disabled ? "not-allowed" : "pointer", alignItems: hint ? "flex-start" : "center" }}>
        <span
          aria-hidden="true"
          style={{
            flex: "none", width: 18, height: 18, marginTop: hint ? 2 : 0, boxSizing: "border-box", borderRadius: "50%",
            border: isOn ? "6px solid var(--dt-surface-action)" : "var(--dt-border-width-strong) solid var(--dt-border-strong)",
            background: "var(--dt-input-bg)",
            transition: "border var(--dt-motion-micro)",
          }}
        />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
          {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
        </span>
      </label>
    </div>
  );
}
```
