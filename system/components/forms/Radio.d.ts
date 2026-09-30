import * as React from "react";

/** One choice from a mutually exclusive set. Group several by giving them the same name. */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  hint?: string;
  /** Shared across the group. Required for keyboard arrow navigation to work. */
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** "start" puts the label on the left and pushes the control to the right edge, so labels in a column line up with the text above them instead of indenting past the control. @default "end" */
  labelPosition?: "start" | "end";
}

export declare function Radio(props: RadioProps): React.JSX.Element;
