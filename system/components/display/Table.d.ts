import * as React from "react";

export interface TableColumn<Row = any> {
  /** Field name on the row, and the React key. */
  key: string;
  /** Column heading. */
  header: React.ReactNode;
  /** Use "right" for numeric columns — it also enables tabular figures. @default "left" */
  align?: "left" | "center" | "right";
  /** Fixed column width, e.g. "120px" or "20%". */
  width?: string;
  /** Custom cell renderer. Receives the whole row. */
  render?: (row: Row) => React.ReactNode;
}

/** Tabular data with a header row. */
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: TableColumn[];
  rows: Array<Record<string, any>>;
  /** Visible description above the table. Also serves as the accessible name. */
  caption?: React.ReactNode;
  /** Tighter row padding for data-heavy views. @default false */
  dense?: boolean;
  /** Alternating row tint. @default false */
  zebra?: boolean;
}

export declare function Table(props: TableProps): JSX.Element;
