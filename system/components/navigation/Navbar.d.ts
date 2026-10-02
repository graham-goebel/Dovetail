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
  /**
   * Below this width in pixels the link row becomes a menu button that opens
   * the links in a Drawer, with `actions` in the drawer's footer. Pass 0 to keep
   * the row at every width. @default 640
   */
  collapseBelow?: number;
  /** The bar's fill. "brand" is the strong brand fill: text, links, the current link's mark and buttons on it turn to --dt-text-on-brand, and a primary Button turns light with brand text. "brand-muted" is the pale tint: text keeps the brand's ink and buttons take the brand colours. "glass" lets the page show through, blurred. The menu that opens on a narrow screen takes the same fill. @default "base" */
  surface?: "base" | "glass" | "brand" | "brand-muted";
}

export declare function Navbar(props: NavbarProps): React.JSX.Element;
