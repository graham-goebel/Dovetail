import React from "react";
import { Input } from "../forms/Input.jsx";
import { Select } from "../forms/Select.jsx";

const LABELS = {
  name: "Full name",
  line1: "Address",
  line2: "Apartment, suite, etc. (optional)",
  city: "City",
  region: "State or region",
  postalCode: "Postal code",
  country: "Country",
  phone: "Phone (optional)",
};

export function AddressFields({
  value = {},
  onChange,
  errors = {},
  legend = "Shipping address",
  countries,
  fields = {},
  labels = {},
  disabled = false,
  style,
  ...rest
}) {
  const base = React.useId();
  const show = { line2: fields.line2 !== false, phone: fields.phone !== false };
  const text = { ...LABELS, ...labels };

  /* Every input gets the same wiring: an id, its label, its error, the
     current value and a change that reports the whole address. */
  const bind = (key) => ({
    id: `${base}-${key}`,
    name: key,
    label: text[key],
    error: errors[key],
    disabled,
    value: value[key] == null ? "" : value[key],
    onChange: (e) => onChange({ ...value, [key]: e.target.value }),
  });

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
      <Input {...bind("name")} required autoComplete="name" autoCapitalize="words" spellCheck={false} />
      <Input {...bind("line1")} required autoComplete="address-line1" />
      {show.line2 && <Input {...bind("line2")} autoComplete="address-line2" />}
      <Input {...bind("city")} required autoComplete="address-level2" />
      {/* Region and postal code sit two-up when there is room, and stack on
          a phone. The least column is four large controls, so a 390px
          screen stays one column. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, calc(var(--dt-size-control-lg) * 4)), 1fr))",
          gap: "var(--dt-space-stack-md) var(--dt-space-inline-md)",
          alignItems: "start",
        }}
      >
        <Input {...bind("region")} autoComplete="address-level1" />
        <Input {...bind("postalCode")} required autoComplete="postal-code" autoCapitalize="characters" spellCheck={false} />
      </div>
      {countries && countries.length
        ? <Select {...bind("country")} required autoComplete="country" options={countries} placeholder="Select a country" />
        : <Input {...bind("country")} required autoComplete="country-name" />}
      {show.phone && <Input {...bind("phone")} type="tel" inputMode="tel" autoComplete="tel" />}
    </fieldset>
  );
}
