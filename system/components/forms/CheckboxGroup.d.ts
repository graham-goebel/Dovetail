import * as React from "react";

export interface CheckboxOption {
  value: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}

/** A labelled set of checkboxes sharing one question. Returns an array of selected values. */
export interface CheckboxGroupProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** The question the set answers. Required — a bare column of checkboxes has no accessible name. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  options: CheckboxOption[];
  /** Controlled selection. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  /** @default "vertical" */
  orientation?: "vertical" | "horizontal";
  name?: string;
}

export declare function CheckboxGroup(props: CheckboxGroupProps): JSX.Element;
