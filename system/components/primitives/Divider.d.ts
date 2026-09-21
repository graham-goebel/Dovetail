import * as React from "react";

/** Rule between content groups. Optional centred label. */
export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** Centred label, horizontal only, e.g. "or" */
  label?: string;
  /** @default "subtle" */
  tone?: "subtle" | "default" | "strong";
}

export declare function Divider(props: DividerProps): JSX.Element;
