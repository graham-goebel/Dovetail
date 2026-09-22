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
