import { useRef, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const ANNOT_COLORS = ["#f59e0b","#f43f5e","#10b981","#38bdf8","#8b5cf6"];

export default function PdfWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color     = getColor(data.colorId);
  const fileInput = useRef(null);

  const [pdfUrl,      setPdfUrl]      = useState(data.pdfUrl || null);
  const [pdfName,     setPdfName]     = useState(data.pdfName || "");
  const [annotations, setAnnotations] = useState(data.annotations || []);
  const [annotMode,   setAnnotMode]   = useState(false);
  const [annotColor,  setAnnotColor]  = useState("#f59e0b");
  const [newNote,     setNewNote]     = useState("");
  const [placing,     setPlacing]     = useState(null); // { x%, y% } in overlay coords

  // ── File load ─────────────────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    setAnnotations([]);
    updateWidget(data.id, { pdfName: file.name, annotations: [] });
    e.target.value = "";
  }

  // ── Annotation placement ──────────────────────────────────────────────
  // The overlay sits on top of the iframe and captures clicks for annotation,
  // but pointer-events are set to "none" when NOT in annotate mode so text
  // selection in the PDF works normally.
  function handleOverlayClick(e) {
    if (!annotMode) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(2);
    setPlacing({ x: parseFloat(x), y: parseFloat(y) });
    setNewNote("");
  }

  function saveAnnotation() {
    if (!newNote.trim() || !placing) return;
    const next = [...annotations, {
      id: Date.now(),
      x: placing.x, y: placing.y,
      text: newNote.trim(), color: annotColor,
    }];
    setAnnotations(next);
    updateWidget(data.id, { annotations: next });
    setPlacing(null);
    setNewNote("");
  }

  function deleteAnnotation(id) {
    const next = annotations.filter(a => a.id !== id);
    setAnnotations(next);
    updateWidget(data.id, { annotations: next });
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="PDF" minWidth={380} minHeight={420}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div onMouseDown={e => e.stopPropagation()} style={{
          display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap",
          padding: "6px 10px", borderBottom: `1px solid ${color.border}`,
          flexShrink: 0, background: "#0e0e0e",
        }}>
          <button onClick={() => fileInput.current?.click()} style={tbBtn(color)}>
            📂 Open PDF
          </button>
          <input ref={fileInput} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleFile} />

          {pdfName && (
            <span style={{ fontSize: "10px", color: "#555", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pdfName}
            </span>
          )}

          {pdfUrl && (
            <>
              {/* Annotate toggle */}
              <button
                onClick={() => { setAnnotMode(v => !v); setPlacing(null); }}
                style={{
                  ...tbBtn(color),
                  marginLeft: "auto",
                  background: annotMode ? color.accent + "33" : "transparent",
                  outline: annotMode ? `1.5px solid ${color.accent}` : "none",
                  color: annotMode ? color.accent : "#888",
                }}
              >🖊 {annotMode ? "Annotating" : "Annotate"}</button>

              {/* Color swatches — only in annotate mode */}
              {annotMode && ANNOT_COLORS.map(c => (
                <div key={c} onClick={() => setAnnotColor(c)} style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: c, cursor: "pointer", flexShrink: 0,
                  outline: annotColor === c ? "2px solid #fff" : "none", outlineOffset: "2px",
                }} />
              ))}
            </>
          )}
        </div>

        {/* Empty state */}
        {!pdfUrl && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "12px", color: "#333",
          }}>
            <span style={{ fontSize: "40px", opacity: 0.3 }}>📄</span>
            <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Open a PDF to get started</p>
            <button onClick={() => fileInput.current?.click()} style={{
              padding: "8px 18px", background: color.accent, border: "none",
              borderRadius: "8px", color: "#fff", fontSize: "12px",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Browse…</button>
          </div>
        )}

        {/* Viewer + annotation layer */}
        {pdfUrl && (
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {/* PDF iframe — always receives pointer events (for scroll, text select) */}
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title="PDF Viewer"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />

            {/* Annotation overlay — only captures clicks in annotate mode */}
            <div
              onClick={handleOverlayClick}
              style={{
                position: "absolute", inset: 0,
                // KEY FIX: pointer-events none when not annotating → PDF text is selectable
                pointerEvents: annotMode ? "auto" : "none",
                cursor: annotMode ? "crosshair" : "default",
                zIndex: 10,
              }}
            >
              {/* Existing pins */}
              {annotations.map(a => (
                <AnnotPin key={a.id} annot={a} onDelete={() => deleteAnnotation(a.id)} />
              ))}

              {/* Placement form */}
              {placing && (
                <div
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: `${placing.x}%`, top: `${placing.y}%`,
                    transform: "translate(-50%, 10px)",
                    background: "#1a1a1a", border: `1px solid ${color.border}`,
                    borderRadius: "10px", padding: "10px",
                    display: "flex", flexDirection: "column", gap: "6px",
                    minWidth: "190px", zIndex: 999,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                  }}
                >
                  <input
                    autoFocus
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveAnnotation()}
                    placeholder="Add a note…"
                    style={{
                      background: "#111", border: "1px solid #333", borderRadius: "6px",
                      padding: "6px 8px", color: "#ddd", fontSize: "12px",
                      outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={saveAnnotation} style={{
                      flex: 1, background: annotColor, border: "none",
                      borderRadius: "6px", color: "#fff",
                      fontSize: "11px", fontWeight: 700, cursor: "pointer", padding: "5px",
                    }}>Save</button>
                    <button onClick={() => setPlacing(null)} style={{
                      flex: 1, background: "transparent", border: "1px solid #333",
                      borderRadius: "6px", color: "#666",
                      fontSize: "11px", cursor: "pointer", padding: "5px",
                    }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Hint bar */}
            {annotMode && !placing && (
              <div style={{
                position: "absolute", bottom: "8px", left: "50%",
                transform: "translateX(-50%)", pointerEvents: "none",
                background: "#0000009a", borderRadius: "6px", padding: "4px 12px",
                fontSize: "11px", color: "#aaa", zIndex: 20,
              }}>
                Click to drop a note pin
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

function AnnotPin({ annot, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "absolute", left: `${annot.x}%`, top: `${annot.y}%`, transform: "translate(-50%,-50%)", zIndex: 50 }}>
      <div
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          width: "20px", height: "20px", borderRadius: "50%",
          background: annot.color, cursor: "pointer",
          border: "2px solid #111", boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", color: "#fff", fontWeight: 700,
        }}
      >●</div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "absolute", top: "26px", left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", border: `1px solid ${annot.color}55`,
          borderRadius: "8px", padding: "8px 10px", minWidth: "140px", maxWidth: "200px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 100,
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: annot.color, marginBottom: "5px" }} />
          <p style={{ fontSize: "12px", color: "#ccc", margin: "0 0 7px", lineHeight: "1.4" }}>{annot.text}</p>
          <button onClick={() => onDelete()} style={{
            background: "transparent", border: "none", color: "#555",
            fontSize: "11px", cursor: "pointer", padding: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#f43f5e"}
            onMouseLeave={e => e.currentTarget.style.color = "#555"}
          >Delete note</button>
        </div>
      )}
    </div>
  );
}

function tbBtn(color) {
  return {
    padding: "4px 10px", borderRadius: "6px",
    border: `1px solid ${color.border}`, background: "transparent",
    color: "#888", fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
  };
}