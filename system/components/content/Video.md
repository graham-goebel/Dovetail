# Video

A ratio-locked video, built the same way as Image and sharing its placeholder: reserve
the space, degrade to a labelled drop target when there is nothing to show yet, upgrade
to the real thing the moment there is.

## Rules

- Give it a `label`. It becomes `aria-label` on the video and the placeholder's text, the
  same job `alt` does on Image, and there is no other way to name a video for someone who
  cannot see it.
- `controls` defaults to true. Turn it off only for a background loop the page is
  driving on its own, and pair that with `autoPlay` and `loop`.
- `autoPlay` mutes itself unless you set `muted` explicitly. No browser plays audible
  video without a person starting it, so an autoplay prop with sound is not a stricter
  choice, it is a broken one.

## Letting someone upload one

Pass `onFile` and the placeholder becomes a drop target, identical to Image's: a drag
or a picker hands you the browser's own `File`, and Video does nothing else with it.

```jsx
function Clip() {
  const [file, setFile] = React.useState(null);
  const src = file ? URL.createObjectURL(file) : undefined;
  return <Video src={src} label="Product walkthrough" placeholder="Walkthrough clip" onFile={setFile} />;
}
```

Revoke the object URL when it is no longer needed. Storing, transcoding or streaming the
file is a template's own concern; Video only gets you to a File.

## Tradeoffs

A poster image is worth setting whenever the video is not autoplaying: without one, the
frame is the flat placeholder colour until playback starts, which reads as broken sooner
than it reads as loading.
