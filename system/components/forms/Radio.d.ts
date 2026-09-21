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
}

export declare function Radio(props: RadioProps): JSX.Element;
