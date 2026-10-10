---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
Agents on an open canvas can now send the pictures they make. A `place_image` step takes a PNG, JPEG or WebP data address of up to 5 MB and puts it into an Image, a Cover or a Video's poster, or adds it as a new Image in a container, with its alt text; the Builder scales it like an upload and keeps it with the file, and never fetches a picture or calls an image service itself. A `working_on` step puts a few words, like "Making a picture", on the agent's cursor at a layer and holds that layer for it while the picture is made.
