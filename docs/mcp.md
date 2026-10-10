# The Dovetail MCP server

`tools/mcp/server.mjs` lets a coding agent build with Dovetail from outside the Builder. It speaks the Model Context Protocol over stdio, one JSON-RPC message per line, and has no dependencies beyond Node.

The answers come from the code the Builder's own assistant uses (`assets/builder/model/agent.js`), reading the system from this checkout. An agent working in another repository gets the same rules, component docs and token values as the assistant on the canvas.

## Running it

From a checkout, after `npm ci` and `npm run build`:

```sh
npm run mcp                       # or: node tools/mcp/server.mjs
```

To use it from an MCP client, add a stdio server whose command is `node` and whose argument is the absolute path to `tools/mcp/server.mjs`. It reads nothing from the network and writes nothing. Rebuild (`npm run build`) after the system changes, so the builder data it reads is current.

## Tools

| Tool | What it answers |
| --- | --- |
| `dovetail_rules` | The system's rules (token tiers, scoped dark mode, accessibility), every component with when to use it and when not, and each token family's values and meanings. Read once before building. |
| `search_components` | Components by what they're for, or every component by group. |
| `read_component` | A component's props (kinds, options, defaults) and its documentation. |
| `list_tokens` | The values a style family accepts. |
| `read_guideline` | One of the system's guidelines in full. |
| `search_layouts` | Tested section layouts, with their mood, when they fit and the content they take. |
| `list_frames` | The pages and frames in a `.dovetail` file. |
| `frame_spec` | A frame from a `.dovetail` file as a spec: its components and variants, the tokens behind its styles, the file's own components in it, and its layers in order. |

A `.dovetail` file is what the Builder's Download saves for one file. `frame_spec` takes its path, and optionally a page and a frame by name or id; it defaults to the first of each.

The spec here has no code: the code writer runs in the Builder's canvas. For a frame's code, use the Builder's Export, or ask its assistant, whose `frame_spec` includes the code.

## Checks

`tools/check/unit/mcp.test.mjs` starts the server as a client would and checks each tool's answers, including errors, which come back as results marked `isError` so the agent can read them.
