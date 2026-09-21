import * as React from "react";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

/** A labelled set of radios. Exactly one option is selected. */
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** The question the set answers. Required. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** @default "vertical" */
  orientation?: "vertical" | "horizontal";
  /** Shared input name. Generated when omitted. */
  name?: string;
}

export declare function RadioGroup(props: RadioGroupProps): JSX.Element;
