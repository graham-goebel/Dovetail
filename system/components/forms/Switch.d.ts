import * as React from "react";

/** Instant on/off setting. The change applies the moment it is flipped. */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  label?: React.ReactNode;
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** "start" puts the label on the left and pushes the switch right — the settings-row pattern. @default "end" */
  labelPosition?: "start" | "end";
}

export declare function Switch(props: SwitchProps): JSX.Element;
