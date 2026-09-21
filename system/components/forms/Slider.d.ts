import * as React from "react";

/** A range input for an approximate value along a continuum. */
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
  /** Required. A slider with no label is unusable without sight. */
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** Show the current value beside the track. @default true */
  showValue?: boolean;
  /** Format the readout, e.g. \`v => \`\${v}%\`\`. */
  formatValue?: (value: number) => string;
  id?: string;
}

export declare function Slider(props: SliderProps): JSX.Element;
