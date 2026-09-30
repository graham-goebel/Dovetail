import * as React from "react";

/** One choice in a VariantPicker. */
export interface VariantPickerOption {
  /** What onChange reports, e.g. "m" or "sand". Unique within the picker. */
  value: string;
  /** What people see and hear: "M", "Sand". A swatch shows it as a tooltip and in the legend. */
  label: string;
  /** For swatches: any CSS colour from the product data. It is content, not a design token. */
  color?: string;
  /** For swatches: an image URL, such as a fabric close-up, drawn in the circle instead of color. */
  image?: string;
  /** Out of stock or not offered with the other choices. It stays visible, crossed out, is skipped by the arrow keys and cannot be chosen. */
  disabled?: boolean;
  /** A short extra line: "Low stock", "+$10". Shown under a chip's label and added to every variant's accessible name. */
  note?: string;
}

/** Choose one variant of a product, such as a colour, a size or a material. */
export interface VariantPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** What is being chosen, e.g. "Size" or "Colour". Names the radio group, or labels the select. */
  label: string;
  /** The choices, in order. */
  options: VariantPickerOption[];
  /** The chosen option's value. The picker is controlled; leave it undefined for nothing chosen yet. */
  value?: string;
  /** Called with the chosen option's value. Never called with a disabled option. */
  onChange: (value: string) => void;
  /**
   * chips are labelled buttons, for sizes and materials. swatches are circles of each option's
   * color or image, for colours. select is the system Select, for a long list. @default "chips"
   */
  variant?: "chips" | "swatches" | "select";
  /** Shows the chosen label after the legend: "Size: M". Chips and swatches only. @default true */
  showSelected?: boolean;
  /** The select's empty first option. @default `Choose ${label.toLowerCase()}` */
  placeholder?: string;
  /** Added to a disabled option's accessible name and, in a select, its text. @default "unavailable" */
  unavailableLabel?: string;
}

export declare function VariantPicker(props: VariantPickerProps): React.JSX.Element;
