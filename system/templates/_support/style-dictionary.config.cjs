/* Style Dictionary configuration for Dovetail.
   Source of truth: tokens/dovetail.tokens.json (DTCG / W3C Design Tokens Format Module).
   Everything under tokens/**.css is generated from it.

   Run:  npx style-dictionary build --config templates/_support/style-dictionary.config.cjs

   The CSS in this repo is committed so the design system renders without a build
   step. Regenerate it whenever the JSON changes; do not hand-edit generated files
   and the JSON in the same commit. */

module.exports = {
  source: ["tokens/dovetail.tokens.json"],
  preprocessors: ["tokens-studio"],
  platforms: {
    css: {
      transformGroup: "css",
      prefix: "dt",
      buildPath: "tokens/build/",
      files: [
        { destination: "primitive.css", format: "css/variables", filter: (t) => t.path[0] === "primitive" },
        { destination: "semantic.css", format: "css/variables", filter: (t) => t.path[0] === "semantic" },
        { destination: "component.css", format: "css/variables", filter: (t) => t.path[0] === "component" },
      ],
    },
    json: {
      transformGroup: "js",
      buildPath: "tokens/build/",
      files: [{ destination: "tokens.flat.json", format: "json/flat" }],
    },
    ts: {
      transformGroup: "js",
      buildPath: "tokens/build/",
      files: [{ destination: "tokens.d.ts", format: "typescript/es6-declarations" }],
    },
    ios: {
      transformGroup: "ios-swift",
      buildPath: "tokens/build/ios/",
      files: [{ destination: "Dovetail.swift", format: "ios-swift/class.swift", className: "DovetailTokens" }],
    },
    android: {
      transformGroup: "android",
      buildPath: "tokens/build/android/",
      files: [
        { destination: "colors.xml", format: "android/colors" },
        { destination: "dimens.xml", format: "android/dimens" },
      ],
    },
  },
};
