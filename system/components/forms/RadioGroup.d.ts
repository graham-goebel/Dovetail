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
  /** Passed to every option. "start" puts each label on the left and each control at the right edge of the row, so labels line up with the group's question instead of indenting. @default "end" */
  labelPosition?: "start" | "end";
  /** Shared input name. Generated when omitted. */
  name?: string;
}

export declare function RadioGroup(props: RadioGroupProps): React.JSX.Element;
