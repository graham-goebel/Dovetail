import * as React from "react";

export interface SidebarItem {
  id: string;
  label: React.ReactNode;
  href?: string;
  /** Lucide icon before the label. */
  icon?: React.ReactNode;
  /** Trailing slot, usually a Badge count. */
  trailing?: React.ReactNode;
}

export interface SidebarSection {
  /** Uppercase eyebrow above the group. Omit for an ungrouped list. */
  title?: string;
  items: SidebarItem[];
}

/** Vertical navigation rail for product shells. */
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  sections: SidebarSection[];
  /** Id of the active item. */
  current?: string;
  onNavigate?: (id: string) => void;
  /** Slot above the sections — workspace switcher, logo. */
  header?: React.ReactNode;
  /** Slot pinned to the bottom — account, help. */
  footer?: React.ReactNode;
  /** @default "Sections" */
  label?: string;
  /** @default 240 */
  width?: number | string;
}

export declare function Sidebar(props: SidebarProps): JSX.Element;
