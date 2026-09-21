import React from "react";

const RATIOS = { square: 1, "4:3": 4 / 3, "3:2": 3 / 2, "16:9": 16 / 9, "21:9": 21 / 9, "3:4": 3 / 4, "9:16": 9 / 16 };

export function AspectRatio({ ratio = "16:9", as: Tag = "div", children, style, ...rest }) {
  const value = typeof ratio === "number" ? ratio : RATIOS[ratio] || RATIOS["16:9"];
  return (
    <Tag style={{ position: "relative", width: "100%", aspectRatio: String(value), overflow: "hidden", ...style }} {...rest}>
      {children}
    </Tag>
  );
}
