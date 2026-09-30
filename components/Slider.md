# Slider

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Slider.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Slider.jsx), [Slider.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Slider.d.ts), [Slider.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Slider.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Slider.html

## Guidelines

A range input for a value on a continuum where the approximate position matters more than the exact number: volume, opacity, a price ceiling.

### Not for precise numbers

If the user knows the value they want, a slider makes them hunt for it. Use a number input. A slider earns its place when the user is exploring rather than entering.

### Always show the value

\`showValue\` is on by default and should stay on. A track with no readout tells the user they have changed something but not to what. Use \`formatValue\` to add the unit, which is what makes the number mean anything:

\`\`\`jsx
<Slider label="Cache lifetime" min={0} max={60} step={5} defaultValue={15} formatValue={v => v + " min"} />
\`\`\`

### Range and step

Keep \`min\` and \`max\` to the range that is genuinely useful, not the range that is technically valid. A step coarse enough to be reachable with one arrow press beats a continuous track the keyboard cannot land on.

## Props

```ts
import * as React from "react";

/** A range input for an approximate value along a continuum. */
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** Required. A slider with no label is unusable without sight. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** Show the current value beside the track. @default true */
  showValue?: boolean;
  /** Format the readout, e.g. \`v => \`\${v}%\`\`. */
  formatValue?: (value: number) => string;
  id?: string;
}

export declare function Slider(props: SliderProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-space-inline-md` | semantic | `var(--dt-dim-4)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-dim-5` | primitive | `20px` |
| `--dt-dim-hair-2` | primitive | `2px` |
| `--dt-font-family-mono` | primitive | `"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";

export function Slider({ label, hint, error, min = 0, max = 100, step = 1, value, defaultValue, onChange, disabled = false, showValue = true, formatValue, id, style, ...rest }) {
  const auto = React.useId();
  const inputId = id || auto;
  const [internal, setInternal] = React.useState(defaultValue !== undefined ? defaultValue : min);
  const current = value !== undefined ? value : internal;
  const pct = max === min ? 0 : ((current - min) / (max - min)) * 100;

  const handle = (e) => {
    const next = Number(e.target.value);
    if (value === undefined) setInternal(next);
    onChange && onChange(next);
  };

  const shown = formatValue ? formatValue(current) : String(current);

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} style={style} {...rest}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-md)", opacity: disabled ? 0.6 : 1 }}>
        <input
          id={inputId} type="range" min={min} max={max} step={step} value={current}
          onChange={handle} disabled={disabled}
          style={{
            flex: 1, minWidth: 0, height: "var(--dt-dim-5)", appearance: "none", background: "transparent", cursor: disabled ? "not-allowed" : "pointer",
            backgroundImage: `linear-gradient(to right, var(--dt-surface-action) 0 ${pct}%, var(--dt-surface-sunken) ${pct}% 100%)`,
            backgroundSize: "100% var(--dt-dim-hair-2)", backgroundPosition: "center", backgroundRepeat: "no-repeat",
            borderRadius: "var(--dt-radius-pill)",
          }}
        />
        {showValue && (
          <output htmlFor={inputId} style={{ flex: "none", minWidth: "5ch", textAlign: "right", fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-secondary)", fontVariantNumeric: "tabular-nums" }}>{shown}</output>
        )}
      </div>
    </Field>
  );
}
```
