import * as React from "react";

/** One choice in a modifier group. */
export interface ModifierOption {
  /** Unique within the group. This is what value holds. */
  id: string;
  /** The choice's name: "Large", "Extra egg". */
  label: string;
  /** Price change in major units, shown as "+$1.50". 0 or undefined shows nothing; a negative shows "−$1.00". */
  price?: number;
  /** Greys the choice out and removes it from the tab order. Say why in note. */
  disabled?: boolean;
  /** A short line under the label: "Contains peanuts", "Sold out today". */
  note?: string;
}

/** A group of options for a dish, such as "Choose a size" or "Add extras": radios or checkboxes in full-width rows. */
export interface ModifierGroupProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, "onChange" | "title" | "children" | "defaultValue"> {
  /** The group's name, rendered as the fieldset's legend. */
  title: string;
  /** The choices, in order. */
  options: ModifierOption[];
  /** single: radios, one choice. multiple: checkboxes. */
  mode: "single" | "multiple";
  /** The chosen ids. Single mode uses one element (or none). Controlled. */
  value: string[];
  /** Called with the next list of chosen ids. */
  onChange: (next: string[]) => void;
  /** Shows the Required pill, and marks a single-choice group aria-required. */
  required?: boolean;
  /** Multiple mode: the fewest choices, stated in the hint. The group does not enforce it; set error when it is not met. */
  min?: number;
  /** Multiple mode: the most choices. Once reached, the other options disable, and each says why in its accessible name. */
  max?: number;
  /** An error under the title, announced when it appears and linked to the group with aria-describedby. It turns the Required pill red. */
  error?: string;
  /** Replaces the generated hint ("Choose up to 3", "Choose 1 to 3"). */
  hint?: string;
  /** ISO 4217 currency code for the price deltas. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price deltas. Defaults to the runtime's. */
  locale?: string;
  /** Text of the Required pill. @default "Required" */
  requiredLabel?: string;
  /** Added, visually hidden, to the name of an option disabled by max. @default (max) => `, limit of ${max} reached` */
  limitLabel?: (max: number) => string;
}

export declare function ModifierGroup(props: ModifierGroupProps): React.JSX.Element;
