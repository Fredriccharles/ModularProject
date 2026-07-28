# Widget Workspace — How It Works

A Figma-style canvas: pan/zoom, draggable/resizable widgets, multi-select, a
sidebar you drag widgets from, and a floating bottom toolbar. State autosaves
to Supabase.

## The original bugs

- `sidebarOpen`, `draggingType`, `dragGhostRef` were used but never declared.
- The sidebar JSX lived outside the component's single returned tree.

All four are fixed in the current `App.jsx`: each has a proper `useState`/
`useRef`, and everything renders inside one JSX return.

## State + refs pattern

Every key piece of state (`offset`, `zoom`, `widgets`, `selectedIds`,
`activeTool`, `draggingType`, `sidebarOpen`, `snapEnabled`) has a matching
ref, kept in sync via a tiny `useEffect`:

```js
useEffect(() => { offsetRef.current = offset; }, [offset]);
```

**Why:** pan/select/drag are driven by `mousemove`/`mouseup` listeners
attached once on `window`. If they read `state` directly, they'd see stale
values forever (classic closure trap). Reading `*Ref.current` instead
always gets the latest value. State stays around purely for re-rendering the
UI (highlighting the active tool, etc.).

## Screen → world coordinates

Widgets store world-space `x/y`; the canvas is visually
`translate(offset) scale(zoom)`. Anywhere a mouse event needs to place or
hit-test something, it converts:

```js
worldX = (screenX - sidebarWidth - offset.x) / zoom
worldY = (screenY - topbarHeight - offset.y) / zoom
```

Used in: dropping a widget from the sidebar, and testing which widgets fall
inside a selection-box drag.

## Ghost drag (sidebar → canvas)

Three functions, done imperatively (direct DOM, not React state) so the
ghost can follow the cursor at 60fps without re-rendering:

- **`startGhost(type, e)`** — on tile mousedown: creates a floating `<div>`
  at the cursor, stores it in `dragGhostRef`, sets `draggingType`.
- **`moveGhost(e)`** — on global mousemove: repositions the ghost div.
- **`dropGhost(e)`** — on global mouseup: converts the drop point to world
  coords, calls `addWidget(type, x, y)`, removes the ghost node, clears refs.

## Floating toolbar: Hand vs Select

One state, `activeTool` (`"hand" | "select"`), branches `onCanvasMouseDown`:

```js
if (activeTool === "hand")   isPanning.current = true;
else                          isSelecting.current = true;
```

Mutually exclusive by construction — never both. Keyboard shortcuts (`h`,
`v`/`s`) just call the same `setActiveTool`, so toolbar and keys stay in sync.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
