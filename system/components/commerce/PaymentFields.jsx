import React from "react";
import { Badge } from "../display/Badge.jsx";
import { Input } from "../forms/Input.jsx";

/* A layout effect puts the caret back after a reformat, before paint. On the
   server there is no layout, and React warns about the layout hook there. */
const useCaretEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

const BRAND_NAMES = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover" };

/* The leading digits only, enough to label the field and group the digits.
   It is not validation: the provider decides whether a number is real. */
function detectBrand(digits) {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  return "unknown";
}

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

/* Amex is 15 digits in 4-6-5; everything else up to 19 in fours. */
function formatNumber(raw, brand) {
  if (brand === "amex") {
    const d = onlyDigits(raw).slice(0, 15);
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  }
  const d = onlyDigits(raw).slice(0, 19);
  return (d.match(/.{1,4}/g) || []).join(" ");
}

/* MM / YY. A first digit above 1, or a 1 followed by a digit above 2, can
   only be a one-digit month, so it gets its leading zero. The separator is
   added once the year starts, so backspace never fights it. */
function formatExpiry(raw) {
  let d = onlyDigits(raw);
  if ((d.length === 1 && d > "1") || (d.length > 1 && d[0] === "1" && d[1] > "2")) d = "0" + d;
  d = d.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}

/* Where the caret goes in a reformatted value: after the same number of
   digits it followed before. */
function caretAfterDigits(formatted, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) seen++;
    if (seen === count) return i + 1;
  }
  return formatted.length;
}

export function PaymentFields({
  value = {},
  onChange,
  errors = {},
  legend = "Card details",
  brand,
  fields = {},
  disabled = false,
  style,
  ...rest
}) {
  const base = React.useId();
  const ids = { number: `${base}-number`, expiry: `${base}-expiry`, cvc: `${base}-cvc`, name: `${base}-name`, brand: `${base}-brand` };
  const detected = brand || detectBrand(onlyDigits(value.number));
  const number = formatNumber(value.number, detected);
  const expiry = formatExpiry(value.expiry);
  const caret = React.useRef(null);

  useCaretEffect(() => {
    const c = caret.current;
    if (!c) return;
    caret.current = null;
    const el = document.getElementById(c.id);
    if (!el || el !== document.activeElement) return;
    const at = caretAfterDigits(el.value, c.digits);
    el.setSelectionRange(at, at);
  });

  /* Reformat what was typed, remember where the caret was among the digits,
     and report the whole value. */
  const edit = (key, format) => (e) => {
    const raw = e.target.value;
    const at = e.target.selectionStart == null ? raw.length : e.target.selectionStart;
    caret.current = { id: ids[key], digits: onlyDigits(raw.slice(0, at)).length };
    onChange({ ...value, [key]: format(raw) });
  };

  const brandName = BRAND_NAMES[detected];

  return (
    <fieldset
      disabled={disabled}
      style={{
        margin: 0, padding: 0, border: 0, minWidth: 0,
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
        ...style,
      }}
      {...rest}
    >
      <legend
        style={{
          padding: 0, marginBlockEnd: "var(--dt-space-stack-md)",
          fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-heading-xs-size)",
          lineHeight: "var(--dt-text-heading-xs-line)", fontWeight: "var(--dt-text-heading-xs-weight)",
          letterSpacing: "var(--dt-text-heading-xs-tracking)",
          color: "var(--dt-text-primary)",
        }}
      >
        {legend}
      </legend>

      {/* The label row carries the brand badge at its inline end, outside the
          field, so it never covers the digits however narrow the field is.
          The label is styled as Field's; the Input carries only the error. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)", minHeight: "var(--dt-text-label-md-line)" }}>
          <label
            htmlFor={ids.number}
            style={{
              fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
              lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-text-label-md-weight)",
              color: "var(--dt-text-primary)",
            }}
          >
            Card number
            <span aria-hidden="true" style={{ color: "var(--dt-text-danger)", marginInlineStart: "var(--dt-space-inline-2xs)" }}>*</span>
          </label>
          {brandName && <Badge id={ids.brand} tone="neutral">{brandName}</Badge>}
        </div>
        <Input
          id={ids.number}
          name="cardnumber"
          value={number}
          onChange={edit("number", (raw) => formatNumber(raw, brand || detectBrand(onlyDigits(raw))))}
          required
          disabled={disabled}
          autoComplete="cc-number"
          inputMode="numeric"
          placeholder="1234 1234 1234 1234"
          spellCheck={false}
          error={errors.number}
          aria-describedby={brandName ? ids.brand : undefined}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--dt-space-stack-md) var(--dt-space-inline-md)", alignItems: "start" }}>
        <Input
          id={ids.expiry}
          name="cc-exp"
          label="Expiry date"
          value={expiry}
          onChange={edit("expiry", formatExpiry)}
          error={errors.expiry}
          required
          disabled={disabled}
          autoComplete="cc-exp"
          inputMode="numeric"
          placeholder="MM / YY"
          spellCheck={false}
        />
        <Input
          id={ids.cvc}
          name="cvc"
          label="Security code"
          value={onlyDigits(value.cvc).slice(0, 4)}
          onChange={edit("cvc", (raw) => onlyDigits(raw).slice(0, detected === "amex" ? 4 : 3))}
          error={errors.cvc}
          required
          disabled={disabled}
          autoComplete="cc-csc"
          inputMode="numeric"
          placeholder={detected === "amex" ? "4 digits" : "3 digits"}
          spellCheck={false}
        />
      </div>

      {fields.name !== false && (
        <Input
          id={ids.name}
          name="ccname"
          label="Name on card"
          value={value.name == null ? "" : value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          error={errors.name}
          disabled={disabled}
          autoComplete="cc-name"
          autoCapitalize="words"
          spellCheck={false}
        />
      )}
    </fieldset>
  );
}
