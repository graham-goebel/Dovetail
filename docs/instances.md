# Linked component instances

My components (Assets › Components › My components) are layouts saved from a
selection, built on the system's tokens. Since this note, what's added from
one is an *instance*: a copy that stays linked to the component, so a change
to the component can reach every instance.

## The model

An instance is an ordinary subtree with one extra field on its root:

```json
{ "type": "Group", "inst": { "of": "n1x2c3", "rev": 2 }, "props": {}, "style": {}, "children": [] }
```

`of` is the component's id in the library; `rev` is the revision of the
component the instance was last built on. Nothing else about the node is
special: it renders, exports, pastes, syncs and undoes like any other
subtree, and keeps working if the component is renamed or deleted. The link
is kept by `cleanNode` and travels in change lists like any node field. A
plain copy (Cmd+D, paste) of an instance is another instance of the same
component.

The library component gains `rev` (counting up from 1) and `prev` (the
revision before the current one).

## Overrides

An instance is edited in place, like anything else. Its *overrides* are the
ways it differs from the component revision it was built on: a node's props,
style or flags (name, hidden, locked) that differ, or, where its children no
longer line up with the component's in number or kind, that whole list of
children. The root's own position, name and flags belong to the instance and
are never overrides. Overrides aren't stored; `overrides(instance, master)`
reads them off place by place (by child index path) when they're needed.

## What the inspector offers

Under the title of a selected instance: *Instance of Name*, and a menu.

- **Update component from this.** The instance becomes the component's new
  revision (after the same token check as Create component). Every other
  instance on the page is rebuilt from it with its own overrides put back:
  `rebase(instance, was, next, rev)`. The project's other pages are loaded,
  updated and saved the same way. Instances in other projects stay as they
  are until they're updated.
- **Update.** Shown when the component has changed since this instance was
  built. The instance catches up, keeping its overrides. (An instance several
  revisions behind keeps its differences from the current revision instead,
  since the revision it was on is gone.)
- **Reset to Name.** Back to the component, keeping only position, name and
  flags.
- **Detach from component.** The link comes off; what's there stays.

Deleting a component from My components detaches its instances on the
current page; on other pages the inspector says the component is gone and
offers Detach.

Making a component from a single selected layer links that layer as the
component's first instance, so the natural flow is: build it, Create
component, add it elsewhere, edit any copy, Update component.

A component can't hold itself. Added into one of its own instances (from My
components, or dropped there), the new instance goes right after that
instance instead, and *Update component from this* refuses an instance that
has an instance of the same component inside it.

## Travelling

A downloaded `.dovetail` file carries, under `components`, the components
its pages' instances are made from (the current revision, without uploaded
files), and a share link carries the same under `&c=`. Opened elsewhere,
they join the library the new file uses; a component already there, by id,
stays as it is. `componentsFor(docs, library)` picks them and
`absorbComponents(store, scope, components)` takes them in, both in
`model/share.js`.

## Checks

`tools/check/unit/instances.test.mjs` covers overrides, rebase, document
updates and detaching. The builder check (`npm run check:builder`) walks the
flow in the browser: create, add two instances, edit one, update, see the
other follow and a changed text survive, reset, detach.
