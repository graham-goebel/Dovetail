/* GROQ fragments for the block types in `schemas.js`.

   One fragment per block, and one page query that spreads them. Resolving the image
   asset here is what lets `BlockRenderer` spread a block straight onto a component:
   the client should hand over props, not references to chase. */

export const imageFragment = `{
  "src": src.asset->url,
  alt,
  ratio
}`;

export const blockFragments = `
  _type == "card" => { _type, _key, eyebrow, title, description, interactive, "media": media ${imageFragment} },
  _type == "media" => { _type, _key, eyebrow, title, body, reverse, "media": media ${imageFragment} },
  _type == "quote" => { _type, _key, children, attribution, role, size },
  _type == "callout" => { _type, _key, tone, title, children },
  _type == "accordion" => { _type, _key, label, allowMultiple, items[]{ "id": id.current, title, content } },
  _type == "figure" => { _type, _key, caption, credit, "image": image ${imageFragment} },
  _type == "prose" => { _type, _key, size, content }
`;

/** One page and its blocks, ready to pass to BlockRenderer. */
export const pageQuery = `*[_type == "page" && slug.current == $slug][0]{
  title,
  "blocks": blocks[]{
    ${blockFragments}
  }
}`;

export default { imageFragment, blockFragments, pageQuery };
