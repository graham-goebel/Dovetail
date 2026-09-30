import * as React from "react";

/** The scrolling log of a conversation. Pinned to the newest message unless the reader has scrolled up, when it offers a "New messages" jump instead. */
export interface MessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible name of the log, e.g. "Conversation with Maya". Required. */
  label: string;
  /** The conversation, oldest first: MessageBubble, MessageDivider, TypingIndicator and QuickReplies. */
  children?: React.ReactNode;
}

/** A centred label across the log: a day, or an event such as a hand-off. */
export interface MessageDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The label, e.g. "Today" or "Conversation assigned to Maya". */
  children: React.ReactNode;
  /** Accessible name of the separator. Defaults to `children` when it is a string; set it when it is not. */
  label?: string;
}

export declare function MessageList(props: MessageListProps): React.JSX.Element;
export declare function MessageDivider(props: MessageDividerProps): React.JSX.Element;
