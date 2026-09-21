import * as React from "react";

/** Equal-width column grid. Pass minColumnWidth for a responsive grid with no media queries. */
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Fixed column count. Ignored when minColumnWidth is set. @default 2 */
  columns?: number;
  /** @default "md" */
  gap?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** CSS length, e.g. "240px". Columns fit as many as will hold this width. */
  minColumnWidth?: string;
  align?: React.CSSProperties["alignItems"];
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Grid(props: GridProps): JSX.Element;
