import * as React from "react";

export interface NavLink {
  id: string;
  label: React.ReactNode;
  href?: string;
}

/** Horizontal top-level navigation bar. */
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo or wordmark slot. */
  brand?: React.ReactNode;
  links: NavLink[];
  /** Id of the active link. */
  current?: string;
  /** When set, link clicks are intercepted and routed through this. */
  onNavigate?: (id: string) => void;
  /** Right-hand slot for buttons, search, or an Avatar. */
  actions?: React.ReactNode;
  /** @default "Main" */
  label?: string;
  /** @default false */
  sticky?: boolean;
}

export declare function Navbar(props: NavbarProps): JSX.Element;
