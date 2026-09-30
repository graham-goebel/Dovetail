import * as React from "react";

/** A postal address as AddressFields edits it. Every value is the text as typed. */
export interface Address {
  /** Full name of the recipient. */
  name: string;
  /** Street address. */
  line1: string;
  /** Apartment, suite, unit, building. */
  line2: string;
  /** City or town. */
  city: string;
  /** State, province, county or region. */
  region: string;
  /** Postal or ZIP code. */
  postalCode: string;
  /** Country: a code from `countries` when that list is given, otherwise the name as typed. */
  country: string;
  /** Phone number, for the carrier. */
  phone?: string;
}

/** A fieldset of address inputs with the right autocomplete tokens, built from Input and Select. */
export interface AddressFieldsProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "children"> {
  /** The address shown. Controlled; missing keys show as empty. */
  value: Address;
  /** Called with the whole address after any field changes. */
  onChange: (next: Address) => void;
  /** Messages shown under the matching fields, which are marked aria-invalid. */
  errors?: Partial<Record<keyof Address, string>>;
  /** The fieldset's visible legend and accessible name. @default "Shipping address" */
  legend?: string;
  /** Options for a country Select, with autocomplete "country" (the value is the code). Without it, country is a text field with autocomplete "country-name". */
  countries?: { value: string; label: string }[];
  /** Hide the optional fields: { phone: false }, { line2: false }. Both show by default. */
  fields?: { line2?: boolean; phone?: boolean };
  /** Replace any field's label, e.g. to translate them or to say "ZIP code". */
  labels?: Partial<Record<keyof Address, string>>;
  /** Disables every field. @default false */
  disabled?: boolean;
}

export declare function AddressFields(props: AddressFieldsProps): React.JSX.Element;
