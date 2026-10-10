---
type: added
bump: none
area: tooling
components: []
tokens: []
visual: false
---
A frame can be handed to other tools as a spec. In the Builder, the assistant's `frame_spec` writes a frame or one layer as its components and variants, the tokens behind its styles, its layers and its code. A new MCP server, `npm run mcp` (`tools/mcp/server.mjs`), gives coding agents the system's rules, components, tokens, guidelines and layouts, plus the spec of any frame in a downloaded `.dovetail` file. See docs/mcp.md.
