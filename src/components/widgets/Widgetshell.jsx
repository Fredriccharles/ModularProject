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
  const color  = getColor(data.colorId);
  const locked = !!data.locked;

  // ── FEATURE 3: Group drag ─────────────────────────────────────────────
  // Snapshot every selected widget's world position at drag start.
  // On stop, compute delta from this widget's movement, apply to all.
  const dragSnapRef = useRef(null);

  function handleDragStart(e, d) {
    if (isSelected && selectedIds.length > 1) {
      const map = {};
      allWidgets.forEach((w) => {
        if (selectedIds.includes(w.id)) map[w.id] = { x: w.x, y: w.y };
      });
      dragSnapRef.current = { map, originX: d.x, originY: d.y };
    } else {
      dragSnapRef.current = null;
    }
  }

  function handleDragStop(e, d) {
    if (dragSnapRef.current && isSelected && selectedIds.length > 1) {
      const dx = d.x - dragSnapRef.current.originX;
      const dy = d.y - dragSnapRef.current.originY;
      updateAllWidgets(
        Object.keys(dragSnapRef.current.map).map((id) => ({
          id,
          changes: {
            x: dragSnapRef.current.map[id].x + dx,
            y: dragSnapRef.current.map[id].y + dy,
          },
        }))
      );
    } else {
      updateWidget(data.id, { x: d.x, y: d.y });
    }
    dragSnapRef.current = null;
  }

  function handleResizeStop(e, direction, ref, delta, position) {
    const w = Math.round(parseFloat(ref.style.width)  / 20) * 20;
    const h = Math.round(parseFloat(ref.style.height) / 20) * 20;
    updateWidget(data.id, { width: w, height: h, ...position });
  }

  // ── FEATURE 4: Lock toggle ────────────────────────────────────────────
  function toggleLock(e) {
    e.stopPropagation();
    updateWidget(data.id, { locked: !locked });
  }

  // ── Styles ────────────────────────────────────────────────────────────
  const borderColor = locked
    ? color.border + "66"
    : isSelected ? "#8b5cf6"
    : hovered    ? color.accent + "66"
    : color.border;

  const boxShadow = locked
    ? "0 2px 8px rgba(0,0,0,0.15)"
    : isSelected
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
      enableResizing={!noResize && !locked}
      disableDragging={locked}
      className="rnd-widget"
      style={{ zIndex: isSelected ? 20 : hovered ? 10 : 1 }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={(e) => {
          if (!locked && onSelect) onSelect(data.id, e);
        }}
        style={{
          width: "100%", height: "100%",
          background: color.bg,
          border: `1px solid ${borderColor}`,
          borderRadius: "10px",
          display: "flex", flexDirection: "column",
          overflow: "hidden", boxShadow,
          transition: "box-shadow 0.2s ease, border-color 0.15s ease",
          fontFamily: "'DM Sans', sans-serif",
          opacity: locked ? 0.82 : 1,
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: "2px",
          background: locked ? color.accent + "33" : isSelected ? "#f7f7f7" : color.accent,
          flexShrink: 0, transition: "background 0.15s",
        }} />

        {/* Header */}
        <div
          className="widget-drag-handle"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 12px 8px",
            borderBottom: `1px solid ${color.border}`,
            cursor: locked ? "default" : "grab",
            flexShrink: 0, userSelect: "none",
          }}
        >
          {/* Left: color dot + label */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ColorPicker
              colorId={data.colorId}
              onChange={(colorId) => updateWidget(data.id, { colorId })}
            />
            <span style={{
              fontSize: "11px", fontWeight: 600,
              color: locked ? color.accent + "44" : isSelected ? "#8b5cf6bb" : color.accent + "aa",
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "color 0.15s",
            }}>
              {label}
            </span>
            {locked && (
              <span style={{ fontSize: "10px", opacity: 0.45 }}>🔒</span>
            )}
          </div>

          {/* Right: lock + close */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button
              onClick={toggleLock}
              onMouseDown={(e) => e.stopPropagation()}
              title={locked ? "Unlock" : "Lock"}
              style={{
                width: "20px", height: "20px",
                background: locked ? color.accent + "22" : "transparent",
                border: "none", borderRadius: "4px",
                color: locked ? color.accent : "#3a3a3a",
                fontSize: "11px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0, lineHeight: 1, flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = color.accent + "22";
                e.currentTarget.style.color = color.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = locked ? color.accent + "22" : "transparent";
                e.currentTarget.style.color = locked ? color.accent : "#3a3a3a";
              }}
            >{locked ? "🔒" : "🔓"}</button>

            <button
              onClick={(e) => { e.stopPropagation(); deleteWidget(data.id); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "20px", height: "20px",
                background: "transparent", border: "none",
                borderRadius: "4px", color: "#444",
                fontSize: "12px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0, lineHeight: 1, flexShrink: 0,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2e2e2e"; e.currentTarget.style.color = "#ff5f57"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#444"; }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </Rnd>
  );
}