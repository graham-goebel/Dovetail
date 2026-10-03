import * as React from "react";

/** One entry in a menu: a link, an action, or a section with entries of its own. */
export interface MenuSheetItem {
  /** What the entry says. */
  label: string;
  /** Where it goes. An entry with an `href` renders as a link. */
  href?: string;
  /** A line under the label, in a layer and in search results. */
  description?: string;
  /** A small icon, shown in a tile ahead of a row, in a card, or ahead of a link chip. Decorative: the label names it. */
  icon?: React.ReactNode;
  /** Marks the page you're on, with `aria-current="page"` and a dot. */
  current?: boolean;
  /** Entries under this one. Choosing it opens a layer that slides in, with a path back. */
  items?: MenuSheetItem[];
  /**
   * How a layer lays its entries out. list: rows, and an entry with entries of its own shows a
   * count and opens a further layer. cards: two up, the first across the full width. filter:
   * each entry is a group, shown as a filter chip over one list of every group's entries.
   * @default "list"
   */
  display?: "list" | "cards" | "filter";
  /** Accessible name of a filter layer's chip row. @default "Filter" */
  filterLabel?: string;
  /** More words search should match, such as synonyms. Not shown. */
  keywords?: string;
  /** Called when the entry is chosen, before the sheet closes. With an `href`, the link still navigates unless you prevent it. */
  onSelect?: (event: React.MouseEvent | React.KeyboardEvent) => void;
}

/**
 * A site or app menu as one sheet: sections as big links, a layer per section that slides in
 * with a path back, and search in its footer beside close. It grows out of the button that
 * opened it and shrinks back into it. On a phone it rises from the bottom, inset from the
 * edges; on a wide screen it opens as a panel.
 */
export interface MenuSheetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Whether the sheet is open. */
  open: boolean;
  /** Called when it should close, with why: the close button, Escape, the scrim, a swipe down, or an entry chosen. */
  onClose: (reason: "close" | "escape" | "scrim" | "swipe" | "select") => void;
  /** The top level, set large. An entry with `items` opens a layer. */
  items: MenuSheetItem[];
  /** Smaller links under the top level, as chips: downloads, a changelog, an external tool. */
  links?: MenuSheetItem[];
  /** The menu's name: the dialog's accessible name and the first step of the path. @default "Menu" */
  label?: string;
  /** A link at the top right of every layer, such as Home. Pass an item, or your own element. */
  home?: MenuSheetItem | React.ReactElement;
  /** Shows search in the footer. @default true */
  search?: boolean;
  /** What search looks through. Defaults to every entry you can go to in `items`, described by the sections above it. */
  searchItems?: MenuSheetItem[];
  /** Your own search: return the entries that match the query. Wins over `searchItems`. */
  onSearch?: (query: string) => MenuSheetItem[];
  /** Called with any entry chosen, after its own `onSelect`. Use it to route in an app. */
  onSelect?: (item: MenuSheetItem, event: React.MouseEvent | React.KeyboardEvent) => void;
  /** The button that opened it. The sheet grows out of it and shrinks back into it when it sits over the sheet; otherwise it rises. */
  anchor?: React.RefObject<HTMLElement>;
  /** The sheet's surface. Glass blurs what's behind it. @default "raised" */
  surface?: "raised" | "glass" | "glass-strong";
  /** Accessible name of the search button, and the path's name while searching. @default "Search" */
  searchLabel?: string;
  /** The search field's placeholder and accessible name. @default "Search" */
  searchPlaceholder?: string;
  /** Accessible name of the close button. @default "Close menu" */
  closeLabel?: string;
  /** Accessible name of the button that leaves search. @default "Close search" */
  closeSearchLabel?: string;
  /** Accessible name of the row of `links`. @default "More" */
  linksLabel?: string;
  /** The filter chip that shows every group. @default "All" */
  allLabel?: string;
  /** What search says when nothing matches. @default (q) => `Nothing matches “${q}”.` */
  emptyLabel?: (query: string) => string;
  /** Announced politely as results change. @default (n) => `${n} results` */
  resultsLabel?: (count: number) => string;
}

export declare function MenuSheet(props: MenuSheetProps): React.JSX.Element | null;
