import * as React from "react";

/** Dropdown for a known set of options. Native select underneath. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Strings or {value,label} pairs. */
  options?: Array<string | { value: string; label: string }>;
  /** Empty-value first option, e.g. "Choose a plan". */
  placeholder?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

export declare function Select(props: SelectProps): JSX.Element;
