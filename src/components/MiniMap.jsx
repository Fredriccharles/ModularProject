// MiniMap.jsx — src/components/MiniMap.jsx
// Fixed-viewport style: the purple rectangle stays centered,
// widget dots move underneath it as you pan/zoom the canvas.

import { useRef } from "react";

const MAP_W  = 220;
const MAP_H  = 150;
const SCALE  = 0.03; // how much of the world each minimap pixel covers (1/SCALE = ~33px world per minimap px)

export default function MiniMap({ widgets, offset, zoom, setOffset }) {
  const dragging = useRef(false);

  // ── coordinate helpers ────────────────────────────────────────────────
  // The minimap shows the canvas world, scaled by SCALE.
  // The viewport rectangle is always centered in the minimap.
  // Widget dots are drawn relative to the current camera position.

  const canvasW  = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const canvasH  = typeof window !== "undefined" ? (window.innerHeight - 48) : 800;

  // World coords of the top-left corner of the visible viewport
  const vpWorldX = -offset.x / zoom;
  const vpWorldY = -offset.y / zoom;

  // World coords of the center of the visible viewport
  const vpCenterX = vpWorldX + canvasW / zoom / 2;
  const vpCenterY = vpWorldY + canvasH / zoom / 2;

  // A widget's position on the minimap = offset from viewport center, scaled
  function worldToMinimap(wx, wy) {
    return {
      x: MAP_W / 2 + (wx - vpCenterX) * SCALE * zoom,
      y: MAP_H / 2 + (wy - vpCenterY) * SCALE * zoom,
    };
  }

  // Minimap click → new world offset (re-centers canvas on that world point)
  function minimapToOffset(mapX, mapY) {
    // mapX, mapY relative to minimap center
    const dx = mapX - MAP_W / 2;
    const dy = mapY - MAP_H / 2;
    // Convert back to world delta
    const worldDx = dx / (SCALE * zoom);
    const worldDy = dy / (SCALE * zoom);
    // New world center
    const newWorldCX = vpCenterX + worldDx;
    const newWorldCY = vpCenterY + worldDy;
    // Convert to canvas offset
    return {
      x: -(newWorldCX * zoom) + canvasW / 2,
      y: -(newWorldCY * zoom) + canvasH / 2,
    };
  }

  // ── viewport rectangle size on minimap ───────────────────────────────
  // The viewport in world coords is (canvasW/zoom × canvasH/zoom).
  // Scaled down by SCALE * zoom:
  const vpMapW = Math.min((canvasW / zoom) * SCALE * zoom, MAP_W);
  const vpMapH = Math.min((canvasH / zoom) * SCALE * zoom, MAP_H);

  // ── mouse handlers ───────────────────────────────────────────────────
  function handlePointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const newOff = minimapToOffset(e.clientX - rect.left, e.clientY - rect.top);
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
  function onMouseUp() { dragging.current = false; }

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
        width: `${MAP_W}px`,
        height: `${MAP_H}px`,
        background: "#0d0d0dee",
        border: "1px solid #2a2a2a",
        borderRadius: "10px",
        overflow: "hidden",
        zIndex: 500,
        cursor: "crosshair",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}
    >
      {/* Widget dots — move relative to viewport center */}
      {widgets.map((w) => {
        const ww = parseFloat(w.width)  || 280;
        const wh = parseFloat(w.height) || 220;
        // Center of this widget in world coords
        const mp = worldToMinimap(w.x + ww / 2, w.y + wh / 2);
        // Size on minimap
        const mw = Math.max(4, ww * SCALE * zoom);
        const mh = Math.max(4, wh * SCALE * zoom);
        // Clip to minimap bounds
        if (mp.x < -mw || mp.x > MAP_W + mw || mp.y < -mh || mp.y > MAP_H + mh) return null;
        return (
          <div key={w.id} style={{
            position: "absolute",
            left:   `${mp.x - mw / 2}px`,
            top:    `${mp.y - mh / 2}px`,
            width:  `${mw}px`,
            height: `${mh}px`,
            borderRadius: "2px",
            background: getWidgetColor(w.colorId),
            opacity: 0.8,
          }} />
        );
      })}

      {/* Viewport rectangle — always centered, represents what you see */}
      <div style={{
        position: "absolute",
        left:   `${MAP_W / 2 - vpMapW / 2}px`,
        top:    `${MAP_H / 2 - vpMapH / 2}px`,
        width:  `${vpMapW}px`,
        height: `${vpMapH}px`,
        border: "1.5px solid #8b5cf6cc",
        borderRadius: "3px",
        background: "rgba(139,92,246,0.08)",
        pointerEvents: "none",
      }} />

      {/* Crosshair center dot */}
      <div style={{
        position: "absolute",
        left: `${MAP_W / 2 - 2}px`,
        top:  `${MAP_H / 2 - 2}px`,
        width: "4px", height: "4px",
        borderRadius: "50%",
        background: "#8b5cf6",
        pointerEvents: "none",
        opacity: 0.6,
      }} />

      {/* Label */}
      <div style={{
        position: "absolute", bottom: "5px", left: "8px",
        fontSize: "9px", color: "#333",
        letterSpacing: "0.08em", textTransform: "uppercase",
        pointerEvents: "none", fontFamily: "'DM Sans', sans-serif",
      }}>minimap</div>

      {/* Zoom level */}
      <div style={{
        position: "absolute", bottom: "5px", right: "8px",
        fontSize: "9px", color: "#333",
        pointerEvents: "none", fontFamily: "'DM Sans', sans-serif",
      }}>{Math.round(zoom * 100)}%</div>
    </div>
  );
}

const ACCENT_MAP = {
  violet: "#8b5cf6", cyan: "#06b6d4", rose: "#f43f5e",
  amber: "#f59e0b", emerald: "#10b981", sky: "#38bdf8",
  pink: "#ec4899", lime: "#a3e635",
};
function getWidgetColor(colorId) {
  return ACCENT_MAP[colorId] ?? "#555";
}