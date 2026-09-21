import * as React from "react";

export interface Crumb {
  label: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/** Shows where the current page sits in the hierarchy. */
export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** Root first, current page last. The last item renders as text, not a link. */
  items: Crumb[];
  /** @default "Breadcrumb" */
  label?: string;
  /** @default "/" */
  separator?: React.ReactNode;
}

export declare function Breadcrumbs(props: BreadcrumbsProps): JSX.Element;
