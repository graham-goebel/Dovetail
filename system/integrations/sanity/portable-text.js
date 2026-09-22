/* A PortableText component map for `@portabletext/react`, so CMS-authored rich text
   renders with the system's own type roles rather than browser defaults.

     import { PortableText } from "@portabletext/react";
     import { dovetailPortableText } from "./integrations/sanity/portable-text";

     <Prose><PortableText value={page.body} components={dovetailPortableText} /></Prose>

   Wrap it in `Prose`: that is what owns the measure and the rhythm between blocks.
   Nothing here sets a margin, for the same reason. */

import React from "react";

const role = (name, tag) => {
  const Heading = ({ children }) =>
    React.createElement(
      tag,
      {
        style: {
          margin: 0,
          fontFamily: `var(--dt-text-${name}-family)`,
          fontSize: `var(--dt-text-${name}-size)`,
          lineHeight: `var(--dt-text-${name}-line)`,
          fontWeight: `var(--dt-text-${name}-weight)`,
          letterSpacing: `var(--dt-text-${name}-tracking)`,
          color: "var(--dt-text-primary)",
        },
      },
      children
    );
  return Heading;
};

export function makeDovetailPortableText(NS) {
  const { Code, Quote, Link, List } = NS || {};

  return {
    block: {
      h1: role("heading-xl", "h2"),
      h2: role("heading-lg", "h2"),
      h3: role("heading-md", "h3"),
      h4: role("heading-sm", "h4"),
      normal: ({ children }) => React.createElement("p", { style: { margin: 0 } }, children),
      blockquote: ({ children }) => (Quote ? React.createElement(Quote, null, children) : React.createElement("blockquote", null, children)),
    },

    marks: {
      code: ({ children }) => (Code ? React.createElement(Code, null, children) : React.createElement("code", null, children)),
      link: ({ value, children }) => {
        const href = (value && value.href) || "#";
        const external = /^https?:\/\//.test(href) && !href.includes(location.host);
        return Link
          ? React.createElement(Link, { href, external }, children)
          : React.createElement("a", { href }, children);
      },
      strong: ({ children }) => React.createElement("strong", { style: { fontWeight: "var(--dt-font-weight-semibold)" } }, children),
      em: ({ children }) => React.createElement("em", null, children),
    },

    list: {
      bullet: ({ children }) => React.createElement("ul", { style: { margin: 0, paddingLeft: "var(--dt-space-inset-lg)" } }, children),
      number: ({ children }) => React.createElement("ol", { style: { margin: 0, paddingLeft: "var(--dt-space-inset-lg)" } }, children),
    },

    listItem: {
      bullet: ({ children }) => React.createElement("li", null, children),
      number: ({ children }) => React.createElement("li", null, children),
    },

    types: {
      /* A `code` block from Sanity's code-input plugin. */
      code: ({ value }) =>
        Code
          ? React.createElement(Code, { block: true, label: value && value.filename }, value && value.code)
          : React.createElement("pre", null, value && value.code),
    },
  };
}

/* The common case: the bundle on `window`, one global, no build step. */
export const dovetailPortableText = makeDovetailPortableText(
  typeof window !== "undefined" ? window.BeamMobileDesignSystem_e33121 : null
);

export default dovetailPortableText;
