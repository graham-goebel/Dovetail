import * as React from "react";

/** Single headline metric with an optional change indicator. */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What the number measures, e.g. "Monthly active users". */
  label: React.ReactNode;
  /** The figure itself, pre-formatted. */
  value: React.ReactNode;
  /** Trailing unit, e.g. "hrs" or "/ mo". */
  unit?: React.ReactNode;
  /** Change since the comparison period, e.g. "+12.4%". */
  delta?: React.ReactNode;
  /** Colours the delta. Direction is semantic, not arithmetic — a falling error rate is "up". */
  deltaDirection?: "up" | "down" | "flat";
  /** Comparison period or footnote under the figure. */
  caption?: React.ReactNode;
  /** @default "left" */
  align?: "left" | "center" | "right";
}

export declare function Stat(props: StatProps): JSX.Element;
