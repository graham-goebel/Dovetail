import React from "react";
import { MenuItem } from "./MenuItem.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

/* Two up at most: a column is at least half the row (less the gap) and never
   narrower than --dt-menu-grid-min, so a narrow screen gets one column. */
const GRID_COLUMNS =
  "repeat(auto-fill, minmax(min(100%, max(var(--dt-menu-grid-min), calc((100% - var(--dt-space-inline-md)) / 2))), 1fr))";

export function MenuSection({
  title,
  description,
  id,
  layout = "list",
  headingLevel = 2,
  children,
  style,
  ...rest
}) {
  const grid = layout === "grid";
  const level = Math.min(Math.max(Math.round(headingLevel) || 2, 1), 5);
  const H = `h${level}`;
  const items = React.Children.toArray(children).filter((c) => c != null && c !== false);

  return (
    <section
      id={id}
      style={{ display: "flex", flexDirection: "column", gap: "var(--dt-menu-section-gap)", minWidth: 0, ...style }}
      {...rest}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" }}>
        <H style={{ ...role("heading-sm"), margin: 0, color: "var(--dt-text-primary)", overflowWrap: "anywhere" }}>{title}</H>
        {description && (
          <p style={{ ...role("body-sm"), margin: 0, color: "var(--dt-text-secondary)", maxWidth: "70ch" }}>{description}</p>
        )}
      </div>
      {/* A list, so a screen reader announces how many dishes the section
          holds before reading them. */}
      <ul
        role="list"
        style={{
          listStyle: "none", margin: 0, padding: 0, minWidth: 0,
          display: grid ? "grid" : "flex",
          flexDirection: grid ? undefined : "column",
          gridTemplateColumns: grid ? GRID_COLUMNS : undefined,
          gap: grid ? "var(--dt-space-inline-md)" : 0,
        }}
      >
        {items.map((child, i) => {
          const isItem = React.isValidElement(child) && child.type === MenuItem;
          const node = isItem
            ? React.cloneElement(child, {
                layout: child.props.layout || layout,
                headingLevel: child.props.headingLevel || level + 1,
              })
            : child;
          return (
            <li
              key={(React.isValidElement(child) && child.key) || i}
              style={{
                minWidth: 0,
                borderTop: !grid && i > 0 ? "var(--dt-border-width-default) solid var(--dt-menu-item-divider)" : undefined,
              }}
            >
              {node}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
