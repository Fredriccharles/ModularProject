// MiniMap.jsx — drop this in src/components/MiniMap.jsx
// Shows an overview of all widgets on the canvas in a small fixed panel.
// Click or drag inside the minimap to navigate the canvas.

import { useRef, useCallback } from "react";

const MAP_W = 180;
const MAP_H = 120;
const WORLD_BOUND = 4000; // assumed world size in px

export default function MiniMap({ widgets, offset, zoom, setOffset }) {
  const dragging = useRef(false);

  // Convert world coords → minimap coords
  function toMap(worldX, worldY) {
    return {
      x: ((worldX + WORLD_BOUND / 2) / WORLD_BOUND) * MAP_W,
      y: ((worldY + WORLD_BOUND / 2) / WORLD_BOUND) * MAP_H,
    };
  }

  // Convert minimap click → world offset
  function fromMap(mapX, mapY) {
    const worldX = (mapX / MAP_W) * WORLD_BOUND - WORLD_BOUND / 2;
    const worldY = (mapY / MAP_H) * WORLD_BOUND - WORLD_BOUND / 2;
    return { x: -worldX * zoom + window.innerWidth / 2, y: -worldY * zoom + (window.innerHeight - 48) / 2 };
  }

  function handlePointer(e) {
    const rect  = e.currentTarget.getBoundingClientRect();
    const mapX  = e.clientX - rect.left;
    const mapY  = e.clientY - rect.top;
    const newOff = fromMap(mapX, mapY);
    setOffset(newOff);
  }

  function onMouseDown(e) {
    e.stopPropagation();
    dragging.current = true;
    handlePointer(e);
  }

  function onMouseMove(e) {
    if (!dragging.current) return;
    e.stopPropagation();
    handlePointer(e);
  }

  function onMouseUp(e) {
    dragging.current = false;
  }

  // Viewport rectangle in minimap coords
  const canvasW = window.innerWidth;
  const canvasH = window.innerHeight - 48;
  const vpWorldW = canvasW / zoom;
  const vpWorldH = canvasH / zoom;
  const vpWorldX = -offset.x / zoom;
  const vpWorldY = -offset.y / zoom;

  const vp = {
    x: ((vpWorldX + WORLD_BOUND / 2) / WORLD_BOUND) * MAP_W,
    y: ((vpWorldY + WORLD_BOUND / 2) / WORLD_BOUND) * MAP_H,
    w: (vpWorldW / WORLD_BOUND) * MAP_W,
    h: (vpWorldH / WORLD_BOUND) * MAP_H,
  };

  return (
    <div
      data-no-pan="true"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        position: "absolute",
        top: "12px", right: "12px",
        width: `${MAP_W}px`, height: `${MAP_H}px`,
        background: "#111111dd",
        border: "1px solid #2a2a2a",
        borderRadius: "8px",
        overflow: "hidden",
        zIndex: 500,
        cursor: "crosshair",
        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        userSelect: "none",
      }}
    >
      {/* Widget dots */}
      {widgets.map((w) => {
        const ww = parseFloat(w.width)  || 280;
        const wh = parseFloat(w.height) || 220;
        const mp = toMap(w.x + ww / 2, w.y + wh / 2);
        const mw = Math.max(3, (ww / WORLD_BOUND) * MAP_W);
        const mh = Math.max(3, (wh / WORLD_BOUND) * MAP_H);
        return (
          <div key={w.id} style={{
            position: "absolute",
            left:   `${mp.x - mw / 2}px`,
            top:    `${mp.y - mh / 2}px`,
            width:  `${mw}px`,
            height: `${mh}px`,
            borderRadius: "2px",
            background: getWidgetColor(w.colorId),
            opacity: 0.75,
          }} />
        );
      })}

      {/* Viewport rectangle */}
      <div style={{
        position: "absolute",
        left:   `${vp.x}px`,
        top:    `${vp.y}px`,
        width:  `${Math.min(vp.w, MAP_W)}px`,
        height: `${Math.min(vp.h, MAP_H)}px`,
        border: "1px solid #8b5cf6aa",
        borderRadius: "3px",
        background: "#8b5cf611",
        pointerEvents: "none",
      }} />

      {/* Label */}
      <div style={{
        position: "absolute", bottom: "4px", left: "6px",
        fontSize: "9px", color: "#333",
        letterSpacing: "0.06em", textTransform: "uppercase",
        pointerEvents: "none",
      }}>minimap</div>
    </div>
  );
}

// Pull accent color from widgetColors without importing the full module
const ACCENT_MAP = {
  violet:  "#8b5cf6", cyan: "#06b6d4", rose: "#f43f5e",
  amber:   "#f59e0b", emerald: "#10b981", sky: "#38bdf8",
  pink:    "#ec4899", lime: "#a3e635",
};
function getWidgetColor(colorId) {
  return ACCENT_MAP[colorId] ?? "#555";
}