import * as React from "react";

export interface AccordionItem {
  id?: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

/** Collapsible sections for reference content. */
export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  items: AccordionItem[];
  /** Allow several panels open at once. @default false */
  allowMultiple?: boolean;
  /** Ids open on first render. */
  defaultOpen?: string[];
  /** Accessible group label. Required. */
  label: string;
}

export declare function Accordion(props: AccordionProps): JSX.Element;
