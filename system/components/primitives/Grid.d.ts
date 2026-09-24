import * as React from "react";

/** Equal-width column grid. Pass minColumnWidth for a responsive grid with no media queries. */
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Fixed column count. Ignored when minColumnWidth is set. @default 2 */
  columns?: number;
  /** @default "md" */
  gap?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** CSS length, e.g. "240px". Columns fit as many as will hold this width. */
  minColumnWidth?: string;
  /** With minColumnWidth: "fit" lets the columns that exist grow to fill the row;
   *  "fill" keeps the empty tracks, so a filter that lands on one result leaves
   *  one card at its intended width instead of stretching it. @default "fit" */
  track?: "fit" | "fill";
  align?: React.CSSProperties["alignItems"];
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Grid(props: GridProps): JSX.Element;
