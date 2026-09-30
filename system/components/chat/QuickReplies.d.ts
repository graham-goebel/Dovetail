import * as React from "react";

/** One suggested reply. */
export interface QuickReplyOption {
  /** Passed to onSelect. */
  id: string;
  /** The chip's text, usually what gets sent. */
  label: string;
}

/** Suggested replies as a row of chip buttons that wraps onto more lines. */
export interface QuickRepliesProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The suggestions, in reading and Tab order. */
  options: QuickReplyOption[];
  /** Called with the chosen option's id. */
  onSelect: (id: string) => void;
  /** Accessible name of the group, e.g. "Suggested replies". Required. */
  label: string;
  /** Which side the chips gather on. end sits them with the person's own messages. @default "end" */
  align?: "start" | "end";
}

export declare function QuickReplies(props: QuickRepliesProps): React.JSX.Element;
