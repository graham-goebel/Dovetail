import React from "react";
import { Button } from "../actions/Button.jsx";
import { Input } from "../forms/Input.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

function Icon({ paths, size = "var(--dt-size-icon-sm)" }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", width: size, height: size }}
    >
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

const TAG = ["M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z", "M7.5 7.5h.01"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];
const CHEVRON = ["m6 9 6 6 6-6"];

export function PromoCode({
  value,
  onChange,
  onApply,
  applied,
  onRemove,
  error,
  loading = false,
  label = "Promo code",
  collapsible = true,
  toggleLabel = "Have a promo code?",
  applyLabel = "Apply",
  id,
  style,
  ...rest
}) {
  const auto = React.useId();
  const inputId = id || auto + "-input";
  const panelId = auto + "-panel";
  const [open, setOpen] = React.useState(() => !collapsible || !!error || !!value);
  const [removeHover, setRemoveHover] = React.useState(false);
  /* Set when the user opens the field or removes a code, so focus follows
     them to the field once it is on the page. */
  const focusNext = React.useRef(false);
  const shown = !collapsible || open || !!error;

  React.useEffect(() => {
    if (!focusNext.current || applied || !shown) return;
    focusNext.current = false;
    const el = document.getElementById(inputId);
    if (el) el.focus();
  });

  const apply = () => {
    const code = (value || "").trim();
    if (!code || loading) return;
    onApply(code);
  };

  const remove = () => {
    focusNext.current = true;
    setOpen(true);
    if (onRemove) onRemove();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)", minWidth: 0, ...style }} {...rest}>
      {/* Always on the page, so a code that becomes applied is announced.
          Empty, it is taken out of the flow so it adds no gap. */}
      <div aria-live="polite" style={applied ? { display: "flex" } : { position: "absolute" }}>
        {applied && (
          <span
            style={{
              display: "inline-flex", alignItems: "center", flexWrap: "wrap", maxWidth: "100%", boxSizing: "border-box",
              columnGap: "var(--dt-space-inline-xs)",
              minHeight: "var(--dt-size-control-sm)",
              paddingInlineStart: "var(--dt-space-inset-sm)",
              paddingInlineEnd: onRemove ? "var(--dt-space-inset-2xs)" : "var(--dt-space-inset-sm)",
              borderRadius: "var(--dt-radius-pill)",
              border: "var(--dt-border-width-default) solid var(--dt-promo-chip-border)",
              background: "var(--dt-promo-chip-bg)", color: "var(--dt-promo-chip-fg)",
            }}
          >
            <span style={{ color: "var(--dt-promo-chip-icon)" }}><Icon paths={TAG} /></span>
            <span style={{ ...role("label-md"), overflowWrap: "anywhere" }}>
              <VisuallyHidden>Code </VisuallyHidden>
              {applied.code}
              <VisuallyHidden> applied</VisuallyHidden>
            </span>
            {applied.description && (
              <span style={{ ...role("body-xs"), color: "var(--dt-promo-chip-description)" }}>
                <VisuallyHidden>: </VisuallyHidden>
                {applied.description}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove code ${applied.code}`}
                title={`Remove code ${applied.code}`}
                onClick={remove}
                onMouseEnter={() => setRemoveHover(true)}
                onMouseLeave={() => setRemoveHover(false)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
                  width: "var(--dt-size-control-xs)", height: "var(--dt-size-control-xs)", padding: 0, border: 0,
                  borderRadius: "var(--dt-radius-pill)", cursor: "pointer", color: "inherit",
                  background: removeHover ? "var(--dt-button-ghost-bg-hover)" : "var(--dt-button-ghost-bg)",
                  transition: "background var(--dt-motion-micro)",
                }}
              >
                <Icon paths={CLOSE} />
              </button>
            )}
          </span>
        )}
      </div>

      {!applied && collapsible && (
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={panelId}
          onClick={() => {
            focusNext.current = !shown;
            setOpen(!shown);
          }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", alignSelf: "flex-start",
            padding: 0, border: 0, background: "none", cursor: "pointer",
            ...role("label-md"), color: "var(--dt-text-link)",
            textDecoration: "underline", textUnderlineOffset: "var(--dt-space-inline-2xs)",
          }}
        >
          {toggleLabel}
          <span style={{ display: "flex", transform: shown ? "rotate(180deg)" : undefined, transition: "transform var(--dt-motion-micro)" }}>
            <Icon paths={CHEVRON} />
          </span>
        </button>
      )}

      {!applied && shown && (
        <div id={panelId} style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)" }}>
          <label htmlFor={inputId} style={{ ...role("label-md"), color: "var(--dt-text-primary)" }}>{label}</label>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--dt-space-inline-xs)" }}>
            <Input
              id={inputId}
              value={value}
              error={error}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                apply();
              }}
              style={{ flex: "1 1 auto", minWidth: 0 }}
            />
            <Button variant="secondary" loading={loading} onClick={apply} style={{ flex: "none" }}>
              {applyLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
