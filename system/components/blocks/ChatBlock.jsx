import React from "react";
import { ChatHeader } from "../chat/ChatHeader.jsx";
import { MessageList, MessageDivider } from "../chat/MessageList.jsx";
import { MessageBubble } from "../chat/MessageBubble.jsx";
import { Composer } from "../chat/Composer.jsx";
import { TypingIndicator } from "../chat/TypingIndicator.jsx";
import { QuickReplies } from "../chat/QuickReplies.jsx";
import { Thinking } from "../feedback/Thinking.jsx";

/* A whole conversation from data. The app passes the messages as an array,
   oldest first, and the block works out what every messenger shows: a day
   divider where the day changes, runs of consecutive messages from one
   author with their corners tightened, names and avatars when several
   people answer, and a Retry on a message that failed. Sending, timers and
   replies stay in the app; the block only draws what it is given.

   It is a panel, not a page band: a fixed-height column with the header at
   the top, the log filling the middle and scrolling, and the composer at
   the bottom. Put it inside a Section (dark or not) to place it on a page. */

/* Tall enough for a real exchange on a desktop, never taller than most of
   the screen on a phone. A proportion of the narrow container, not a size. */
const DEFAULT_HEIGHT = "min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)";

/* Turns the messages into rows: dividers where the day changes, events as
   dividers, and every message with its place in a run. */
function layout(messages) {
  const rows = [];
  let day;
  let run = [];
  const close = () => {
    run.forEach((row, i) => {
      row.grouped = run.length === 1 ? "single" : i === 0 ? "first" : i === run.length - 1 ? "last" : "middle";
    });
    run = [];
  };
  for (const m of messages || []) {
    if (!m) continue;
    if (m.day && m.day !== day) {
      close();
      day = m.day;
      rows.push({ kind: "day", key: `day-${m.id}`, text: m.day });
    }
    if (m.kind === "event") {
      close();
      rows.push({ kind: "event", key: `event-${m.id}`, text: m.text });
      continue;
    }
    const who = m.from === "me" ? "me" : `them:${m.author ? m.author.name : ""}`;
    if (run.length && run[run.length - 1].who !== who) close();
    const row = { kind: "message", key: m.id, message: m, who, grouped: "single" };
    run.push(row);
    rows.push(row);
  }
  close();
  return rows;
}

export function ChatBlock({
  title,
  subtitle,
  avatar,
  presence,
  onBack,
  actions,
  headingLevel,
  messages = [],
  typing,
  quickReplies,
  composer,
  onRetry,
  variant = "support",
  height = DEFAULT_HEIGHT,
  label,
  style,
  ...rest
}) {
  const assistant = variant === "assistant";
  const rows = React.useMemo(() => layout(messages), [messages]);

  /* Names and avatars only earn their space when more than one person
     answers; with one, the header already says who it is. */
  const group = React.useMemo(() => {
    const names = new Set();
    for (const m of messages || []) if (m && m.kind !== "event" && m.from !== "me" && m.author) names.add(m.author.name);
    return names.size > 1;
  }, [messages]);

  const logLabel = label || `Conversation with ${title}`;
  const typingText = typeof typing === "string" ? typing : undefined;

  return (
    <section
      {...rest}
      style={{
        display: "flex", flexDirection: "column",
        height, minHeight: 0, minWidth: 0, overflow: "hidden",
        background: "var(--dt-chat-surface)", color: "var(--dt-text-primary)",
        border: "var(--dt-border-width-default) solid var(--dt-chat-border)",
        borderRadius: "var(--dt-radius-container)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        presence={assistant ? undefined : presence}
        onBack={onBack}
        actions={actions}
        headingLevel={headingLevel}
        style={{ flex: "none" }}
      />
      <MessageList label={logLabel} style={{ flex: "1 1 auto" }}>
        {rows.map((row) => {
          if (row.kind !== "message") return <MessageDivider key={row.key} data-divider={row.kind}>{row.text}</MessageDivider>;
          const m = row.message;
          const mine = m.from === "me";
          return (
            <MessageBubble
              key={row.key}
              from={mine ? "me" : "them"}
              time={m.time}
              status={mine ? m.status : undefined}
              onRetry={mine && m.status === "failed" && onRetry ? () => onRetry(m.id) : undefined}
              author={!mine && group ? m.author : undefined}
              grouped={row.grouped}
              data-grouped={row.grouped}
              data-message-id={m.id}
            >
              {m.text}
              {m.content != null && (
                <div style={{ marginTop: m.text ? "var(--dt-space-stack-xs)" : undefined, whiteSpace: "normal", minWidth: 0 }}>
                  {m.content}
                </div>
              )}
            </MessageBubble>
          );
        })}
        {typing && !assistant && <TypingIndicator name={typingText} />}
        {typing && assistant && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "var(--dt-bubble-run-gap)", minWidth: 0 }}>
            <Thinking state="thinking" size="sm" label={typingText || "Thinking"} />
          </div>
        )}
        {quickReplies && quickReplies.options && quickReplies.options.length > 0 && (
          <QuickReplies
            label={quickReplies.label || "Suggested replies"}
            options={quickReplies.options}
            onSelect={quickReplies.onSelect}
            align={quickReplies.align}
          />
        )}
      </MessageList>
      {composer && (
        <Composer
          label={composer.label || (assistant ? `Ask ${title}` : `Message ${title}`)}
          placeholder={composer.placeholder}
          value={composer.value}
          onChange={composer.onChange}
          onSend={composer.onSend}
          onAttach={composer.onAttach}
          disabled={composer.disabled}
          style={{ flex: "none" }}
        />
      )}
    </section>
  );
}
