# Accordion

Collapses reference content so the page stays scannable. Use it for FAQs, spec sheets,
and optional settings.

## Rules

- Only for content users consult, not content they read. Never collapse the main
  explanation of a page — hidden text is unfindable and unsearchable.
- Titles are questions or nouns that say what is inside. "More information" is not a
  title.
- `allowMultiple` for reference lists where users compare answers. Single-open for
  wizard-like disclosure.
- Headers are real buttons inside an `h3` with `aria-expanded`. Do not swap in a div.

## Tradeoffs

Accordions shorten the page and hide content from in-page search. If most users need
most of the sections, a page of headed sections serves them better.
