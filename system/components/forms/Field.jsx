import React from "react";

export function Field({ label, hint, error, required = false, htmlFor, labelId, messageId, children, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-input-label-gap)", ...style }} {...rest}>
      {label && (
        <label
          htmlFor={htmlFor}
          id={labelId}
          style={{
            fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
            lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-text-label-md-weight)",
            color: "var(--dt-text-primary)",
          }}
        >
          {label}
          {required && <span aria-hidden="true" style={{ color: "var(--dt-text-danger)", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div
          id={messageId}
          role={error ? "alert" : undefined}
          style={{
            fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
            lineHeight: "var(--dt-text-body-xs-line)",
            color: error ? "var(--dt-input-error-color)" : "var(--dt-input-hint-color)",
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
