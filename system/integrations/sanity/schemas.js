/* Sanity schema definitions mirroring the prop contracts of the content-shaped
   Dovetail components. A `card` document in Studio produces exactly the props
   `Card` expects, so the block array needs no translation step.

   Plain objects, not `defineType`, so importing this file does not pull in the
   Sanity toolchain. Spread them into your own schema list:

     import { dovetailSchemas } from "./integrations/sanity/schemas";
     export default defineConfig({ schema: { types: [...dovetailSchemas, ...yours] } });

   Every field name here is a prop name in the matching `.d.ts`. When you change a
   component's contract, change it here in the same commit — this file is written by
   hand and nothing checks the two against each other yet. */

const tone = (name, list) => ({
  name,
  title: name[0].toUpperCase() + name.slice(1),
  type: "string",
  options: { list, layout: "radio", direction: "horizontal" },
});

const image = (name, title) => ({
  name,
  title,
  type: "object",
  fields: [
    { name: "src", title: "Image", type: "image", options: { hotspot: true } },
    { name: "alt", title: "Alternative text", type: "string", description: "Empty for a decorative image. Never omitted." },
    { name: "ratio", title: "Ratio", type: "string", options: { list: ["square", "4:3", "3:2", "16:9", "21:9", "3:4", "9:16"] }, initialValue: "16:9" },
  ],
});

export const cardSchema = {
  name: "card",
  title: "Card",
  type: "object",
  fields: [
    { name: "eyebrow", title: "Eyebrow", type: "string" },
    { name: "title", title: "Title", type: "string", validation: (r) => r.required() },
    { name: "description", title: "Description", type: "text", rows: 3 },
    image("media", "Media"),
    { name: "interactive", title: "Interactive", type: "boolean", initialValue: false },
  ],
  preview: { select: { title: "title", subtitle: "eyebrow" } },
};

export const mediaSchema = {
  name: "media",
  title: "Media row",
  type: "object",
  fields: [
    image("media", "Media"),
    { name: "eyebrow", title: "Eyebrow", type: "string" },
    { name: "title", title: "Title", type: "string", validation: (r) => r.required() },
    { name: "body", title: "Body", type: "text", rows: 4 },
    { name: "reverse", title: "Image after the copy", type: "boolean", initialValue: false },
  ],
  preview: { select: { title: "title", subtitle: "eyebrow" } },
};

export const quoteSchema = {
  name: "quote",
  title: "Quote",
  type: "object",
  fields: [
    { name: "children", title: "Quote", type: "text", rows: 3, validation: (r) => r.required() },
    { name: "attribution", title: "Attribution", type: "string" },
    { name: "role", title: "Role", type: "string" },
    tone("size", ["md", "lg"]),
  ],
  preview: { select: { title: "children", subtitle: "attribution" } },
};

export const calloutSchema = {
  name: "callout",
  title: "Callout",
  type: "object",
  fields: [
    tone("tone", ["note", "tip", "important", "caution"]),
    { name: "title", title: "Title", type: "string" },
    { name: "children", title: "Body", type: "text", rows: 3, validation: (r) => r.required() },
  ],
  preview: { select: { title: "title", subtitle: "tone" } },
};

export const accordionSchema = {
  name: "accordion",
  title: "Accordion",
  type: "object",
  fields: [
    { name: "label", title: "Accessible group name", type: "string", validation: (r) => r.required() },
    { name: "allowMultiple", title: "Allow several open", type: "boolean", initialValue: false },
    {
      name: "items",
      title: "Items",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "id", title: "Id", type: "slug", options: { source: "title" } },
            { name: "title", title: "Title", type: "string", validation: (r) => r.required() },
            { name: "content", title: "Content", type: "text", rows: 4 },
          ],
        },
      ],
      validation: (r) => r.min(1),
    },
  ],
};

export const figureSchema = {
  name: "figure",
  title: "Figure",
  type: "object",
  fields: [
    image("image", "Image"),
    { name: "caption", title: "Caption", type: "string", description: "What to notice. Not a repeat of the alt text." },
    { name: "credit", title: "Credit", type: "string" },
  ],
};

export const proseSchema = {
  name: "prose",
  title: "Prose",
  type: "object",
  fields: [
    { name: "content", title: "Content", type: "array", of: [{ type: "block" }], validation: (r) => r.required() },
    tone("size", ["sm", "md", "lg"]),
  ],
};

export const dovetailSchemas = [
  cardSchema,
  mediaSchema,
  quoteSchema,
  calloutSchema,
  accordionSchema,
  figureSchema,
  proseSchema,
];

export default dovetailSchemas;
