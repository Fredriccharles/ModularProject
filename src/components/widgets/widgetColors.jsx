import { useState, useRef, useEffect } from "react";

export const WIDGET_COLORS = [
  { id: "violet",  accent: "#8b5cf6", bg: "#16112a", border: "#2d1f4e" },
  { id: "cyan",    accent: "#06b6d4", bg: "#0a1e26", border: "#0e3a45" },
  { id: "rose",    accent: "#f43f5e", bg: "#210f18", border: "#4a1628" },
  { id: "amber",   accent: "#f59e0b", bg: "#1e1608", border: "#443210" },
  { id: "emerald", accent: "#10b981", bg: "#0b1e16", border: "#0f3d28" },
  { id: "sky",     accent: "#38bdf8", bg: "#0a1c2c", border: "#0e3550" },
  { id: "pink",    accent: "#ec4899", bg: "#200d1c", border: "#4a1040" },
  { id: "lime",    accent: "#a3e635", bg: "#111c08", border: "#2a3f10" },
];

export const DEFAULT_COLOR = WIDGET_COLORS[0];

export function getColor(id) {
  return WIDGET_COLORS.find((c) => c.id === id) || DEFAULT_COLOR;
}

export function ColorPicker({ colorId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = getColor(colorId);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "relative", flexShrink: 0 }}
      // Stop drag from triggering when interacting with picker
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Trigger dot */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Change color"
        style={{
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          background: current.accent,
          cursor: "pointer",
          boxShadow: open
            ? `0 0 0 2px #111, 0 0 0 3.5px ${current.accent}`
            : `0 0 0 1.5px ${current.accent}55`,
          transition: "box-shadow 0.15s",
        }}
      />

      {/* Swatch popover */}
      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "20px",
            left: "-6px",
            background: "#1a1a1a",
            border: "1px solid #303030",
            borderRadius: "12px",
            padding: "10px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            zIndex: 99999,
            boxShadow: "0 12px 32px rgba(0,0,0,0.7)",
          }}
        >
          {WIDGET_COLORS.map((c) => (
            <div
              key={c.id}
              title={c.id}
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: c.accent,
                cursor: "pointer",
                boxShadow:
                  colorId === c.id
                    ? `0 0 0 2px #1a1a1a, 0 0 0 3.5px ${c.accent}`
                    : "none",
                transition: "transform 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ))}
        </div>
      )}
    </div>
  );
}