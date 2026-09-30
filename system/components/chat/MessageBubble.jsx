import React from "react";
import { Avatar } from "../display/Avatar.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* One message. Sent ("me") bubbles sit on the right in the action colours,
   received ("them") on the left in the sunken surface. Consecutive messages
   from one author form a run: the corners where they meet tighten and the
   gap between them closes, the shape every messenger uses. Status, time and
   author are props; delivery itself is the app's business. */

const R = "var(--dt-bubble-radius)";
const T = "var(--dt-bubble-radius-tight)";

/* Corners, clockwise from top left, for a bubble on the right. A bubble on
   the left mirrors them. */
const CORNERS = {
  single: [R, R, R, R],
  first: [R, R, T, R],
  middle: [R, T, T, R],
  last: [R, T, R, R],
};

const ICONS = {
  sending: ["M12 7.5V12l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  sent: ["m5 12.5 4.5 4.5L19 7.5"],
  delivered: ["m2.5 12.5 4.5 4.5 9.5-9.5", "m12 16 1 1 9.5-9.5"],
  read: ["m2.5 12.5 4.5 4.5 9.5-9.5", "m12 16 1 1 9.5-9.5"],
  failed: ["M12 8v4.5", "M12 16h.01", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
};

const STATUS_TEXT = { sending: "Sending", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Not sent" };

function StatusIcon({ status }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", display: "block", flex: "none" }}>
      {ICONS[status].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function MessageBubble({ from, children, time, status, onRetry, author, grouped = "single", style, ...rest }) {
  const mine = from === "me";
  const shape = CORNERS[grouped] ? grouped : "single";
  const [tl, tr, br, bl] = CORNERS[shape];
  const radius = mine ? `${tl} ${tr} ${br} ${bl}` : `${tr} ${tl} ${bl} ${br}`;
  const opensRun = shape === "single" || shape === "first";
  const showStatus = mine && STATUS_TEXT[status];
  const failed = showStatus && status === "failed";
  const withAuthor = !mine && author;

  const bubble = (
    <div style={{
      maxWidth: "100%", minWidth: 0,
      padding: "var(--dt-bubble-padding)",
      borderRadius: radius,
      background: mine ? "var(--dt-bubble-sent-bg)" : "var(--dt-bubble-received-bg)",
      color: mine ? "var(--dt-bubble-sent-fg)" : "var(--dt-bubble-received-fg)",
      fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
      lineHeight: "var(--dt-text-body-sm-line)", letterSpacing: "var(--dt-text-body-sm-tracking)",
      /* Newlines from the composer survive; a long word or URL breaks rather
         than pushing the bubble past the edge. */
      whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
    }}>
      {withAuthor && !opensRun && <VisuallyHidden>{author.name}: </VisuallyHidden>}
      {children}
    </div>
  );

  const meta = (time || showStatus) && (
    <div style={{
      display: "flex", alignItems: "center", flexWrap: "wrap", gap: "var(--dt-space-inline-2xs)",
      marginTop: "var(--dt-space-stack-2xs)",
      fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
      lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-bubble-meta-fg)",
      justifyContent: mine ? "flex-end" : "flex-start",
    }}>
      {time && <span>{time}</span>}
      {showStatus && !failed && (
        <span style={{ display: "inline-flex", color: status === "read" ? "var(--dt-bubble-read-fg)" : undefined }}>
          <StatusIcon status={status} />
          <VisuallyHidden>{STATUS_TEXT[status]}</VisuallyHidden>
        </span>
      )}
      {failed && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", color: "var(--dt-bubble-failed-fg)" }}>
          <StatusIcon status="failed" />
          {STATUS_TEXT.failed}
        </span>
      )}
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            appearance: "none", background: "none", border: 0, padding: 0, margin: 0, cursor: "pointer",
            fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
            fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-link)",
            textDecoration: "underline", textUnderlineOffset: "0.2em",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );

  const column = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start",
      /* About three quarters of the list, so a reply never spans edge to edge
         and sent and received stay easy to tell apart. A proportion, not a size. */
      maxWidth: "75%", minWidth: 0,
    }}>
      {withAuthor && opensRun && (
        <span style={{
          marginBottom: "var(--dt-space-stack-2xs)", paddingInline: "var(--dt-space-inset-sm)",
          fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
          lineHeight: "var(--dt-text-label-sm-line)", fontWeight: "var(--dt-font-weight-medium)",
          color: "var(--dt-bubble-author-fg)",
        }}>{author.name}</span>
      )}
      {bubble}
      {meta}
    </div>
  );

  return (
    <div
      style={{
        display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-start",
        gap: withAuthor ? "var(--dt-space-inline-xs)" : undefined,
        marginTop: opensRun ? "var(--dt-bubble-run-gap)" : "var(--dt-bubble-gap)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {withAuthor && (
        /* The gutter is kept on every bubble of the run so they line up; the
           avatar shows beside the first. Its name is already read above. */
        <span aria-hidden="true" style={{ flex: "none", width: "var(--dt-size-avatar-sm)", display: "inline-flex" }}>
          {opensRun && <Avatar name={author.name} src={author.src} size="sm" />}
        </span>
      )}
      {column}
    </div>
  );
}
