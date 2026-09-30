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
  /** "start" puts the label on the left and pushes the control to the right edge, so labels in a column line up with the text above them instead of indenting past the control. @default "end" */
  labelPosition?: "start" | "end";
}

export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
