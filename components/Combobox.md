# Combobox

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Forms family. Files: [Combobox.jsx](https://graham-goebel.github.io/Dovetail/system/components/forms/Combobox.jsx), [Combobox.d.ts](https://graham-goebel.github.io/Dovetail/system/components/forms/Combobox.d.ts), [Combobox.md](https://graham-goebel.github.io/Dovetail/system/components/forms/Combobox.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Combobox.html

## Guidelines

A text input that filters a known list. Reach for it when a `Select` has grown past
the point where someone can scan it.

### Use it when
- The list is long enough that typing beats scrolling, roughly a dozen options and up.
- The options are known and fixed. A combobox filters; it does not create.

### Don't use it when
- There are a handful of options. Use `Select`: it is one control, it works without
  JavaScript, and every platform already knows how to render it.
- The user may need to enter something not on the list. That is a different control, and
  it needs to say so.
- The options come from a server as you type. This one filters what it was given.

### Example
```jsx
<Combobox
  label="Country"
  options={countries}
  value={country}
  onChange={setCountry}
  hint="Where the account is billed"
/>
```

### Keyboard
| Key | Does |
|---|---|
| `Down` / `Up` | Opens the list, then moves the active option |
| `Enter` | Selects the active option and closes |
| `Escape` | Closes and puts the selected label back in the box |
| `Home` / `End` | Jumps to the first or last match |
| `Tab` | Closes and moves on, leaving the selection as it was |

### Accessibility
The input is `role="combobox"` with `aria-expanded`, `aria-controls` and
`aria-autocomplete="list"`; the active option is pointed at with `aria-activedescendant`
rather than being focused, so focus never leaves the input. Options carry `aria-selected`.
Give it a `label`. A combobox with placeholder text and no label is the most common
failure in this pattern.

### Tokens
Reads the `--dt-input-*` tier so it lines up with `Input` and `Select` to the pixel, and
`--dt-surface-overlay` with `--dt-elevation-3` for the list, so it sits in the same
overlay family as `Popover`.

### Content
The label names the field, not the action: "Country", not "Choose a country". The empty
message says what happened, not sorry: "No matches".

## Props

```ts
import * as React from "react";

export type ComboboxOption = string | { value: string; label: string };

/** A text input that filters a known list of options. Select is the right control until the list is too long to scan. */
export interface ComboboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "size"> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** The full list. Filtering happens on the label, case-insensitively. */
  options?: ComboboxOption[];
  /** Controlled selection, by option value. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** @default "Search…" */
  placeholder?: string;
  /** Shown in the list when nothing matches. @default "No matches" */
  emptyMessage?: React.ReactNode;
  disabled?: boolean;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  id?: string;
}

export declare function Combobox(props: ComboboxProps): React.JSX.Element;
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
| `--dt-input-fg-disabled` | component | `var(--dt-text-disabled)` |
| `--dt-input-font-family` | component | `var(--dt-text-body-md-family)` |
| `--dt-input-font-size` | component | `var(--dt-font-size-sm)` |
| `--dt-input-height-lg` | component | `var(--dt-size-control-lg)` |
| `--dt-input-height-md` | component | `var(--dt-size-control-md)` |
| `--dt-input-height-sm` | component | `var(--dt-size-control-sm)` |
| `--dt-input-padding-x` | component | `var(--dt-space-inset-sm)` |
| `--dt-input-radius` | component | `var(--dt-radius-control)` |
| `--dt-input-transition` | component | `var(--dt-motion-micro)` |
| `--dt-border-subtle` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-elevation-3` | semantic | `var(--dt-shadow-raw-3)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-action-ghost-hover` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-surface-overlay` | semantic | `var(--dt-color-white)` |
| `--dt-surface-selected` | semantic | `var(--dt-color-neutral-100)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-z-dropdown` | semantic | `200` |
| `--dt-dim-10` | primitive | `40px` |

## Source

```jsx
import React from "react";
import { Field } from "./Field.jsx";

const norm = (o) => (typeof o === "string" ? { value: o, label: o } : o);

export function Combobox({
  label,
  hint,
  error,
  required,
  options = [],
  value,
  defaultValue = "",
  onChange,
  placeholder = "Search…",
  emptyMessage = "No matches",
  disabled = false,
  size = "md",
  id,
  style,
  ...rest
}) {
  const all = React.useMemo(() => options.map(norm), [options]);
  const auto = React.useId();
  const inputId = id || auto;
  const listId = inputId + "-list";

  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const selected = value !== undefined ? value : uncontrolled;
  const selectedOption = all.find((o) => o.value === selected);

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [focus, setFocus] = React.useState(false);
  const wrap = React.useRef(null);
  const list = React.useRef(null);

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
  }, [all, query]);

  // The text in the box is what you typed while open, and the chosen label when closed.
  const text = open ? query : selectedOption ? selectedOption.label : "";

  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) close(); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // Keep the active option in view when the keyboard moves it past the edge.
  React.useEffect(() => {
    if (!open || !list.current) return;
    const el = list.current.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, all.findIndex((o) => o.value === selected)));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(option) {
    if (!option) return;
    if (value === undefined) setUncontrolled(option.value);
    if (onChange) onChange(option.value);
    close();
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : 0));
      return;
    }
    if (!open) return;
    if (e.key === "Enter") { e.preventDefault(); choose(matches[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(Math.max(0, matches.length - 1)); }
    else if (e.key === "Tab") close();
  }

  const border = error
    ? "var(--dt-input-border-error)"
    : focus || open
      ? "var(--dt-input-border-focus)"
      : "var(--dt-input-border)";

  const control = (
    <div ref={wrap} style={{ position: "relative" }}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? listId + "-" + active : undefined}
        aria-invalid={error ? true : undefined}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onChange={(e) => { setQuery(e.target.value); setActive(0); if (!open) setOpen(true); }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onMouseDown={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          height: `var(--dt-input-height-${size})`,
          padding: "0 calc(var(--dt-input-padding-x) * 2 + var(--dt-size-icon-sm)) 0 var(--dt-input-padding-x)",
          fontFamily: "var(--dt-input-font-family)",
          fontSize: "var(--dt-input-font-size)",
          color: disabled ? "var(--dt-input-fg-disabled)" : "var(--dt-input-fg)",
          background: disabled ? "var(--dt-input-bg-disabled)" : "var(--dt-input-bg)",
          border: `var(--dt-input-border-width) solid ${border}`,
          borderRadius: "var(--dt-input-radius)",
          outline: "none",
          transition: "border-color var(--dt-input-transition)",
          boxSizing: "border-box",
        }}
        {...rest}
      />
      <svg
        aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{
          position: "absolute", top: "50%", right: "var(--dt-input-padding-x)", transform: "translateY(-50%)",
          width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)",
          pointerEvents: "none", color: "var(--dt-text-secondary)",
        }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>

      <ul
        id={listId}
        role="listbox"
        aria-label={typeof label === "string" ? label : undefined}
        ref={list}
        hidden={!open}
        style={{
          position: "absolute", top: "calc(100% + var(--dt-space-stack-2xs))", left: 0, right: 0,
          zIndex: "var(--dt-z-dropdown)",
          margin: 0, padding: "var(--dt-space-inset-2xs)", listStyle: "none",
          maxHeight: "calc(var(--dt-dim-10) * 5)", overflowY: "auto",
          background: "var(--dt-surface-overlay)",
          border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
          borderRadius: "var(--dt-radius-container)",
          boxShadow: "var(--dt-elevation-3)",
        }}
      >
        {matches.length === 0 && (
          <li
            role="option"
            aria-disabled="true"
            aria-selected="false"
            style={{
              padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
              fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
              color: "var(--dt-text-tertiary)",
            }}
          >
            {emptyMessage}
          </li>
        )}
        {matches.map((o, i) => {
          const isActive = i === active;
          const isSelected = o.value === selected;
          return (
            <li
              key={o.value}
              id={listId + "-" + i}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "var(--dt-space-inline-sm)",
                padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
                borderRadius: "var(--dt-radius-control)",
                fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                lineHeight: "var(--dt-text-body-sm-line)",
                color: isSelected ? "var(--dt-text-on-selected)" : "var(--dt-text-primary)",
                background: isSelected
                  ? "var(--dt-surface-selected)"
                  : isActive
                    ? "var(--dt-surface-action-ghost-hover)"
                    : "transparent",
                cursor: "pointer",
              }}
            >
              <span>{o.label}</span>
              {isSelected && (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", flex: "none" }}>
                  <path d="m5 13 4 4L19 7" />
                </svg>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (!label && !hint && !error) return <div style={style}>{control}</div>;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId} style={style}>
      {control}
    </Field>
  );
}
```
