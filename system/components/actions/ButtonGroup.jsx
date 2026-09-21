import React from "react";

export function ButtonGroup({ label, attached = false, children, style, ...rest }) {
  const items = React.Children.toArray(children);
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "inline-flex", gap: attached ? 0 : "var(--dt-space-inline-xs)", ...style }}
      {...rest}
    >
      {attached
        ? items.map((child, i) =>
            React.isValidElement(child)
              ? React.cloneElement(child, {
                  key: i,
                  style: {
                    borderRadius: i === 0
                      ? "var(--dt-button-radius) 0 0 var(--dt-button-radius)"
                      : i === items.length - 1
                        ? "0 var(--dt-button-radius) var(--dt-button-radius) 0"
                        : 0,
                    marginLeft: i > 0 ? "calc(-1 * var(--dt-button-border-width))" : 0,
                    ...(child.props.style || {}),
                  },
                })
              : child
          )
        : items}
    </div>
  );
}
