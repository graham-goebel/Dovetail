import * as React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Lucide icon before the label. */
  icon?: React.ReactNode;
  /** Trailing count, e.g. unread items. */
  count?: number;
  disabled?: boolean;
}

/** Switches between sibling views without leaving the page. */
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  /** Id of the selected tab. Controlled. */
  value: string;
  onChange?: (id: string) => void;
  /** Accessible tablist label. Required. */
  label: string;
  /** @default "underline" */
  variant?: "underline" | "pill";
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Must match the TabItem id this panel belongs to. */
  id: string;
  /** The currently selected tab id. */
  value: string;
  children?: React.ReactNode;
}

export declare function Tabs(props: TabsProps): JSX.Element;
export declare function TabPanel(props: TabPanelProps): JSX.Element | null;
