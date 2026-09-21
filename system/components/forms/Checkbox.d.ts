import * as React from "react";

/** Binary choice within a form. Supports an indeterminate state for parent rows. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  /** Secondary line below the label. */
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  /** Visual dash state for a parent controlling a partially-selected group. */
  indeterminate?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export declare function Checkbox(props: CheckboxProps): JSX.Element;
