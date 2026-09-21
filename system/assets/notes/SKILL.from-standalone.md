---
name: dovetail-design
description: Use this skill to generate well-branded interfaces and assets for Dovetail, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Dovetail is white-label: it ships unbranded and is themed by overriding semantic tokens.
Before writing any code, read `CLAUDE.md` for the authoring rules and `guidelines/tokens.md`
for the token contract. The single hard rule is the tier direction — component reads
semantic, semantic reads primitive, nothing skips or reverses.
