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

export declare function Combobox(props: ComboboxProps): JSX.Element;
