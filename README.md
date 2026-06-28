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

## Not hijacking clicks on UI controls

- `.rnd-widget` class on every widget → canvas ignores mousedowns from inside
  widgets (no accidental pan/select while dragging a widget).
- `data-no-pan="true"` on every floating button (toolbar, zoom controls,
  sidebar toggle) → canvas checks `e.target.closest("[data-no-pan]")` and
  bails, so clicking a button doesn't also start a pan/selection gesture.

One attribute checked in one place, instead of `stopPropagation()` scattered
across every button.

## Selection → multi-select → group move

- Selection box (screen rect) → converted to world rect on mouseup → simple
  AABB overlap test against `widgets` → sets `selectedIds`.
- Shift+click toggles a widget in/out of selection; shift+drag adds a box's
  hits to the existing selection.
- Dragging any selected widget while multiple are selected moves all of them
  together via `updateAllWidgets`, batched into one `setWidgets` call.

## Keyboard shortcuts

| Key | Effect |
|---|---|
| Delete/Backspace | Delete selected |
| Ctrl/Cmd+D | Duplicate selected (+24px offset) |
| Escape | Clear selection |
| h | Hand tool |
| v / s | Select tool |

Ignored while typing in an input/textarea.

## Persistence

Loads the saved workspace row (keyed by `user.id`) on mount; autosaves
`widgets`/`offset`/`zoom` 1.5s after the last change (debounced), with a
"Saving… / Saved ✓" indicator in the topbar.

## Adding a new widget type

Add one entry to `WIDGET_CATALOGUE` + one line to the render switch. Drag,
selection, and persistence all work automatically since every widget gets
the same `sharedProps`.
