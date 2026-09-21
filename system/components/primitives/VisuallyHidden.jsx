import React from "react";

export function VisuallyHidden({ as: Tag = "span", children, ...rest }) {
  return (
    <Tag
      style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
