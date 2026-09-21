import * as React from "react";

export interface ListItem {
  id?: string | number;
  /** Primary line. */
  title: React.ReactNode;
  /** Secondary line under the title. */
  description?: React.ReactNode;
  /** Slot before the text — an Avatar, icon, or checkbox. */
  leading?: React.ReactNode;
  /** Slot after the text — a Badge, action, or chevron. */
  trailing?: React.ReactNode;
  /** Makes the row a button when the list is interactive. */
  onClick?: () => void;
}

/** Vertical row list with optional leading and trailing slots. */
export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  items: ListItem[];
  /** Hairline between rows. @default true */
  divided?: boolean;
  /** Renders rows with onClick as buttons with hover feedback. @default false */
  interactive?: boolean;
  /** Accessible list label. Required. */
  label: string;
}

export declare function List(props: ListProps): JSX.Element;
