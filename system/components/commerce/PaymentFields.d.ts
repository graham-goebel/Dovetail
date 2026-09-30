import * as React from "react";

/** Card details as PaymentFields shows them: formatted text, not raw digits. */
export interface PaymentValue {
  /** Card number with spaces between groups, e.g. "4242 4242 4242 4242". Strip non-digits before use. */
  number: string;
  /** Expiry as "MM / YY". */
  expiry: string;
  /** Security code, digits only. */
  cvc: string;
  /** Name on the card. */
  name?: string;
}

/** Card entry fields that format as the user types. The UI only: for real payments use your provider's hosted fields. */
export interface PaymentFieldsProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange" | "children"> {
  /** The card details shown. Controlled; values passed unformatted are formatted for display. */
  value: PaymentValue;
  /** Called with the whole value, already formatted, after any field changes. */
  onChange: (next: PaymentValue) => void;
  /** Messages shown under the matching fields, which are marked aria-invalid. */
  errors?: Partial<Record<keyof PaymentValue, string>>;
  /** The fieldset's visible legend and accessible name. @default "Card details" */
  legend?: string;
  /**
   * The card brand, shown as a text badge beside the card number's label and used to group the digits
   * (amex 4-6-5, others in fours). Detected from the leading digits when omitted.
   */
  brand?: "visa" | "mastercard" | "amex" | "discover" | "unknown";
  /** Hide the name on card field: { name: false }. It shows by default. */
  fields?: { name?: boolean };
  /** Disables every field. @default false */
  disabled?: boolean;
}

export declare function PaymentFields(props: PaymentFieldsProps): React.JSX.Element;
