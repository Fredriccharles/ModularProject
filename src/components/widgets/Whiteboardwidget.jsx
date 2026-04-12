import { useRef, useState, useEffect, useCallback } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const TOOLS = [
  { id: "pen",    icon: "✏️", label: "Pen"    },
  { id: "eraser", icon: "⬜", label: "Eraser" },
  { id: "line",   icon: "╱",  label: "Line"   },
  { id: "rect",   icon: "▭",  label: "Rect"   },
];
const STROKE_SIZES = [2, 4, 8, 16];
const PALETTE = ["#ffffff","#f43f5e","#f59e0b","#10b981","#38bdf8","#8b5cf6","#ec4899","#a3e635"];

export default function WhiteboardWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color      = getColor(data.colorId);
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const drawing    = useRef(false);
  const startPos   = useRef({ x: 0, y: 0 });
  const snapshot   = useRef(null);
  const lastSave   = useRef(null);

  const [tool,        setTool]        = useState("pen");
  const [strokeColor, setStrokeColor] = useState("#ffffff");
  const [strokeSize,  setStrokeSize]  = useState(3);
  const [showPalette, setShowPalette] = useState(false);

  // ── Init canvas from saved imageData ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (data.imageData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = data.imageData;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── KEY FIX: get mouse position relative to CANVAS PIXEL space ───────
  // The canvas element is CSS-scaled (width:100%) but has fixed pixel dimensions.
  // We must scale the mouse offset by the ratio of CSS size vs pixel size.
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  function debouncedsave() {
    clearTimeout(lastSave.current);
    lastSave.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      updateWidget(data.id, { imageData: canvas.toDataURL("image/webp", 0.75) });
    }, 600);
  }

  function onMouseDown(e) {
    e.stopPropagation();
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e);
    drawing.current  = true;
    startPos.current = pos;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onMouseMove(e) {
    if (!drawing.current) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e);

    ctx.strokeStyle = tool === "eraser" ? "#111111" : strokeColor;
    ctx.lineWidth   = tool === "eraser" ? strokeSize * 5 : strokeSize;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.beginPath();
      if (tool === "line") {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === "rect") {
        ctx.strokeRect(
          startPos.current.x, startPos.current.y,
          pos.x - startPos.current.x, pos.y - startPos.current.y,
        );
      }
    }
  }

  function onMouseUp(e) {
    if (!drawing.current) return;
    e.stopPropagation();
    drawing.current = false;
    debouncedsave();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    debouncedsave();
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Draw" minWidth={320} minHeight={280}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div onMouseDown={(e) => e.stopPropagation()} style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: "5px 8px", borderBottom: `1px solid ${color.border}`,
          flexShrink: 0, flexWrap: "wrap", background: "#0e0e0e",
        }}>
          {TOOLS.map((t) => (
            <button key={t.id} title={t.label} onClick={() => setTool(t.id)} style={{
              width: "26px", height: "26px", borderRadius: "5px", border: "none",
              cursor: "pointer", fontSize: "13px",
              background: tool === t.id ? color.accent + "33" : "transparent",
              outline: tool === t.id ? `1.5px solid ${color.accent}` : "none",
            }}>{t.icon}</button>
          ))}
          <div style={{ width: "1px", height: "18px", background: "#2a2a2a", margin: "0 2px" }} />
          {STROKE_SIZES.map((s) => (
            <button key={s} onClick={() => setStrokeSize(s)} style={{
              width: "26px", height: "26px", borderRadius: "5px", border: "none", cursor: "pointer",
              background: strokeSize === s ? color.accent + "33" : "transparent",
              outline: strokeSize === s ? `1.5px solid ${color.accent}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: `${Math.min(s*2,14)}px`, height: `${Math.min(s*2,14)}px`, borderRadius: "50%", background: "#ccc" }} />
            </button>
          ))}
          <div style={{ width: "1px", height: "18px", background: "#2a2a2a", margin: "0 2px" }} />
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowPalette(v => !v)} style={{
              width: "26px", height: "26px", borderRadius: "5px", border: "none", cursor: "pointer",
              background: strokeColor, outline: `1.5px solid #444`,
            }} />
            {showPalette && (
              <div onMouseDown={e => e.stopPropagation()} style={{
                position: "absolute", top: "32px", left: 0,
                background: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "8px",
                display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px",
                zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
              }}>
                {PALETTE.map(c => (
                  <div key={c} onClick={() => { setStrokeColor(c); setShowPalette(false); }} style={{
                    width: "20px", height: "20px", borderRadius: "50%", background: c,
                    cursor: "pointer", outline: strokeColor === c ? "2px solid #fff" : "none", outlineOffset: "2px",
                  }} />
                ))}
              </div>
            )}
          </div>
          <button onClick={clearCanvas} style={{
            marginLeft: "auto", padding: "3px 9px", borderRadius: "5px", border: "none",
            background: "#ff5f5718", color: "#ff5f57", fontSize: "11px", cursor: "pointer", fontWeight: 600,
          }}>Clear</button>
        </div>

        {/* Canvas — pixel dims fixed at 1200×900 so scale math always works */}
        <div ref={wrapRef} style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={900}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
              width: "100%", height: "100%", display: "block",
              cursor: tool === "eraser" ? "cell" : "crosshair",
              background: "#111",
            }}
          />
        </div>
      </div>
    </WidgetShell>
  );
}