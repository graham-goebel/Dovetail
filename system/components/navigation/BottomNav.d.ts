import * as React from "react";

export interface BottomNavItem {
  id: string;
  label: React.ReactNode;
  /** A 24px glyph. It inherits the item's colour. */
  icon: React.ReactNode;
  /** Renders the item as a link. Without it the item is a button. */
  href?: string;
  /** A count, or true for a dot. Announced with the label. */
  badge?: number | boolean;
}

/**
 * A phone app's primary navigation, docked to the bottom of the screen with
 * the home indicator's safe area kept clear. Three to five destinations.
 */
export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  items: BottomNavItem[];
  /** Id of the current destination. */
  current?: string;
  /** Called with an item's id. When set, link items are intercepted and routed through it. */
  onNavigate?: (id: string) => void;
  /**
   * bar is a full-width docked bar with an indicator pill behind the active
   * icon. floating is an inset glass pill over a fade of the page surface,
   * with room for an action button beside it. @default "bar"
   */
  variant?: "bar" | "floating";
  /** Glass that content scrolls beneath. Off gives a solid overlay surface. @default true */
  translucent?: boolean;
  /** A primary action beside the destinations, usually a round IconButton: add, compose, record. */
  action?: React.ReactNode;
  /** @default "Main" */
  label?: string;
}

export declare function BottomNav(props: BottomNavProps): JSX.Element;
