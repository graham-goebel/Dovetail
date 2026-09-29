import * as React from "react";

/** Page-by-page navigation for a known result count. */
export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  /** Current page, 1-indexed. */
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  /** @default "Pagination" */
  label?: string;
}

export declare function Pagination(props: PaginationProps): JSX.Element;
