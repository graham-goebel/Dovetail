# ButtonGroup

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Actions family. Files: [ButtonGroup.jsx](https://graham-goebel.github.io/Dovetail/system/components/actions/ButtonGroup.jsx), [ButtonGroup.d.ts](https://graham-goebel.github.io/Dovetail/system/components/actions/ButtonGroup.d.ts), [ButtonGroup.md](https://graham-goebel.github.io/Dovetail/system/components/actions/ButtonGroup.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ButtonGroup.html

## Guidelines

Groups related buttons. Detached by default; `attached` joins them into a segmented control.

### Use it when
- Two or more buttons act on the same object: a dialog footer, a toolbar cluster.
- `attached`: mutually exclusive view options such as list/grid or day/week/month.

### Don't use it when
- The buttons are unrelated. Use `Inline`.
- The options are a form value. Use `Radio` or `Select`.

### Example
```jsx
<ButtonGroup label="View mode" attached>
  <Button variant="secondary">List</Button>
  <Button variant="secondary">Grid</Button>
</ButtonGroup>
```

### Accessibility
Renders `role="group"` with the required `label`. For a segmented control where one option is selected, set `aria-pressed` on each button yourself, because ButtonGroup does not manage selection state.

## Props

```ts
import * as React from "react";

/** Groups related buttons and manages their spacing or shared edges. */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible group name, e.g. "Text alignment". Required. */
  label: string;
  /** Join the buttons into one segmented control with shared edges. @default false */
  attached?: boolean;
  children?: React.ReactNode;
}

export declare function ButtonGroup(props: ButtonGroupProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-button-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-button-radius` | component | `var(--dt-radius-pill)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |

## Source

```jsx
import React from "react";

export function ButtonGroup({ label, attached = false, children, style, ...rest }) {
  const items = React.Children.toArray(children);
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "inline-flex", gap: attached ? 0 : "var(--dt-space-inline-xs)", ...style }}
      {...rest}
    >
      {attached
        ? items.map((child, i) =>
            React.isValidElement(child)
              ? React.cloneElement(child, {
                  key: i,
                  style: {
                    borderRadius: i === 0
                      ? "var(--dt-button-radius) 0 0 var(--dt-button-radius)"
                      : i === items.length - 1
                        ? "0 var(--dt-button-radius) var(--dt-button-radius) 0"
                        : 0,
                    marginLeft: i > 0 ? "calc(-1 * var(--dt-button-border-width))" : 0,
                    ...(child.props.style || {}),
                  },
                })
              : child
          )
        : items}
    </div>
  );
}
```
