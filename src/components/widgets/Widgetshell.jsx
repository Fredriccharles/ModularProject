import { useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { getColor, ColorPicker } from "./widgetColors.jsx";

export function WidgetShell({
  data,
  updateWidget,
  deleteWidget,
  label,
  children,
  minWidth = 200,
  minHeight = 160,
  noResize = false,
  isSelected = false,
  onSelect,
  selectedIds = [],
  allWidgets = [],
  updateAllWidgets,
}) {
  const [hovered, setHovered] = useState(false);
  const color = getColor(data.colorId);
  const dragStartPositions = useRef(null);

  // ── Group drag ───────────────────────────────────────────────────────
  function handleDragStart() {
    if (isSelected && selectedIds.length > 1) {
      const map = {};
      allWidgets.forEach((w) => {
        if (selectedIds.includes(w.id)) map[w.id] = { x: w.x, y: w.y };
      });
      dragStartPositions.current = map;
    } else {
      dragStartPositions.current = null;
    }
  }

  function handleDragStop(e, d) {
    if (dragStartPositions.current && isSelected && selectedIds.length > 1) {
      const dx = d.x - dragStartPositions.current[data.id].x;
      const dy = d.y - dragStartPositions.current[data.id].y;
      updateAllWidgets(
        selectedIds.map((id) => ({
          id,
          changes: {
            x: dragStartPositions.current[id].x + dx,
            y: dragStartPositions.current[id].y + dy,
          },
        }))
      );
    } else {
      updateWidget(data.id, { x: d.x, y: d.y });
    }
    dragStartPositions.current = null;
  }

  function handleResizeStop(e, direction, ref, delta, position) {
    const w = Math.round(parseFloat(ref.style.width) / 20) * 20;
    const h = Math.round(parseFloat(ref.style.height) / 20) * 20;
    updateWidget(data.id, { width: w, height: h, ...position });
  }

  const borderColor = isSelected
    ? "#8b5cf6"
    : hovered ? color.accent + "66"
    : color.border;

  const boxShadow = isSelected
    ? `0 0 0 2px #8b5cf6, 0 20px 48px rgba(0,0,0,0.6)`
    : hovered
    ? `0 20px 48px rgba(0,0,0,0.6), 0 0 0 1px ${color.accent}22`
    : "0 4px 20px rgba(0,0,0,0.4)";

  return (
    <Rnd
      size={{ width: data.width, height: data.height }}
      position={{ x: data.x, y: data.y }}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      dragHandleClassName="widget-drag-handle"
      cancel="input,textarea,button,a,[data-no-drag]"
      minWidth={minWidth}
      minHeight={minHeight}
      enableResizing={!noResize}
      className="rnd-widget"
      style={{ zIndex: isSelected ? 20 : hovered ? 10 : 1 }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // ✅ NO stopPropagation here — Rnd needs the mousedown to reach its own listener
        // We only call onSelect; canvas pan is blocked by the canvas checking .rnd-widget
        onMouseDown={(e) => {
          if (onSelect) onSelect(data.id, e);
        }}
        style={{
          width: "100%",
          height: "100%",
          background: color.bg,
          border: `1px solid ${borderColor}`,
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow,
          transition: "box-shadow 0.2s ease, border-color 0.15s ease",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "default",
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: "2px",
          background: isSelected ? "#8b5cf6" : color.accent,
          flexShrink: 0,
          transition: "background 0.15s",
        }} />

        {/* ✅ Drag handle — ONLY this triggers drag */}
        <div
          className="widget-drag-handle"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "9px 12px 8px",
            borderBottom: `1px solid ${color.border}`,
            cursor: "grab",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ColorPicker
              colorId={data.colorId}
              onChange={(colorId) => updateWidget(data.id, { colorId })}
            />
            <span style={{
              fontSize: "11px", fontWeight: 600,
              color: isSelected ? "#8b5cf6bb" : color.accent + "aa",
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "color 0.15s",
            }}>
              {label}
            </span>
          </div>

          {/* Close — stopPropagation so it doesn't start a drag */}
          <button
            onClick={(e) => { e.stopPropagation(); deleteWidget(data.id); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: "20px", height: "20px",
              background: "transparent", border: "none",
              borderRadius: "4px", color: "#444",
              fontSize: "12px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, lineHeight: 1,
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#2e2e2e"; e.currentTarget.style.color = "#ff5f57"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#444"; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}