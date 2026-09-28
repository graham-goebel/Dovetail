# Switch

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Switch.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Switch.jsx), [Switch.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Switch.d.ts), [Switch.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Switch.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Switch.html

## Guidelines

An instant on/off setting. Flipping it applies the change; there is no Save button.

### Use it when
- A preference takes effect immediately: notifications, dark mode, autopay.

### Don't use it when
- The value is submitted with a form. Use Checkbox; a switch that needs saving lies about when it took effect.
- The choice is not two opposite states.

### Example
```jsx
<Switch label="Autopay" hint="Charge the card on file each month" labelPosition="start" defaultChecked />
```

### Variants
labelPosition="start" is the settings-row pattern: label left, switch pushed to the right edge.

### Accessibility
Renders role="switch" on a real checkbox input, so state is announced as on/off rather than checked/unchecked.

### Content
Label names the thing being switched, not the action. "Autopay", not "Turn on autopay".

## Props

```ts
import * as React from "react";

/** Instant on/off setting. The change applies the moment it is flipped. */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** "start" puts the label on the left and pushes the switch right — the settings-row pattern. @default "end" */
  labelPosition?: "start" | "end";
}

export declare function Switch(props: SwitchProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-strong` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-elevation-1` | semantic | `var(--dt-shadow-raw-1)` |
| `--dt-motion-micro` | semantic | `var(--dt-duration-100) var(--dt-easing-standard)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-surface-action` | semantic | `var(--dt-color-primary-600)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-color-white` | primitive | `oklch(1 0 0)` |

## Source

```jsx
import React from "react";

export function Switch({ label, hint, checked, defaultChecked = false, onChange, disabled = false, id, labelPosition = "end", style, ...rest }) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const auto = React.useId();
  const switchId = id || auto;
  const isOn = checked !== undefined ? checked : internal;

  const handle = (e) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };

  const track = (
    <span
      aria-hidden="true"
      style={{
        flex: "none", position: "relative", width: 40, height: 24, borderRadius: "var(--dt-radius-pill)",
        background: isOn ? "var(--dt-surface-action)" : "var(--dt-border-strong)",
        transition: "background var(--dt-motion-micro)",
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: isOn ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
          background: "var(--dt-color-white)", boxShadow: "var(--dt-elevation-1)",
          transition: "left var(--dt-motion-micro)",
        }}
      />
    </span>
  );

  const text = (
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-primary)" }}>{label}</span>
      {hint && <span style={{ fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)" }}>{hint}</span>}
    </span>
  );

  return (
    <div style={{ display: "flex", opacity: disabled ? 0.6 : 1, ...style }}>
      <input
        type="checkbox" role="switch" id={switchId} checked={isOn} onChange={handle} disabled={disabled}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        {...rest}
      />
      <label
        htmlFor={switchId}
        style={{
          display: "flex", alignItems: hint ? "flex-start" : "center", gap: "var(--dt-space-inline-sm)",
          cursor: disabled ? "not-allowed" : "pointer",
          justifyContent: labelPosition === "start" ? "space-between" : undefined,
          width: labelPosition === "start" ? "100%" : undefined,
          flexDirection: labelPosition === "start" ? "row-reverse" : "row",
        }}
      >
        {track}
        {text}
      </label>
    </div>
  );
}
```
