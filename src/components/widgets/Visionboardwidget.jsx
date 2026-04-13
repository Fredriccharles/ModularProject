import { useRef, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

// Each item: { id, type:"image"|"note", x, y, w, h, content }

const MIN_SIZE = 60;

export default function VisionBoardWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color = getColor(data.colorId);
  const [items,     setItems]     = useState(data.vbItems || []);
  const [activeId,  setActiveId]  = useState(null);
  const [editingId, setEditingId] = useState(null);
  const boardRef = useRef(null);
  const fileRef  = useRef(null);

  function syncItems(next) {
    setItems(next);
    updateWidget(data.id, { vbItems: next });
  }

  function updateItem(id, changes) {
    syncItems(items.map((it) => it.id === id ? { ...it, ...changes } : it));
  }

  function deleteItem(id) {
    syncItems(items.filter((it) => it.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function addNote() {
    const newItem = { id: Date.now(), type: "note", x: 20, y: 20, w: 160, h: 100, content: "" };
    const next = [...items, newItem];
    syncItems(next);
    setActiveId(newItem.id);
    setEditingId(newItem.id);
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newItem = { id: Date.now(), type: "image", x: 30, y: 30, w: 200, h: 150, content: ev.target.result };
      syncItems([...items, newItem]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Drag ───────────────────────────────────────────────────────────────────
  const dragState = useRef(null);

  function onItemMouseDown(e, id) {
    if (editingId === id) return; // allow text editing
    e.stopPropagation();
    e.preventDefault();
    setActiveId(id);
    const item = items.find((it) => it.id === id);
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y, mode: "drag" };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup",   onDragEnd);
  }

  function onResizeMouseDown(e, id) {
    e.stopPropagation();
    e.preventDefault();
    const item = items.find((it) => it.id === id);
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origW: item.w, origH: item.h, mode: "resize" };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup",   onDragEnd);
  }

  function onDragMove(e) {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (ds.mode === "drag") {
      const board = boardRef.current;
      const bw = board ? board.clientWidth  : 9999;
      const bh = board ? board.clientHeight : 9999;
      const item = items.find((it) => it.id === ds.id); // current size
      const newX = Math.max(0, Math.min(ds.origX + dx, bw - (item?.w ?? 100)));
      const newY = Math.max(0, Math.min(ds.origY + dy, bh - (item?.h ?? 60)));
      setItems((prev) => prev.map((it) => it.id === ds.id ? { ...it, x: newX, y: newY } : it));
    } else {
      const newW = Math.max(MIN_SIZE, ds.origW + dx);
      const newH = Math.max(MIN_SIZE, ds.origH + dy);
      setItems((prev) => prev.map((it) => it.id === ds.id ? { ...it, w: newW, h: newH } : it));
    }
  }

  function onDragEnd() {
    if (dragState.current) {
      // Persist final state
      setItems((prev) => {
        updateWidget(data.id, { vbItems: prev });
        return prev;
      });
    }
    dragState.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup",   onDragEnd);
  }

  const NOTE_COLORS = ["#fef08a","#86efac","#93c5fd","#f9a8d4","#fdba74","#e0e0e0"];

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Vision" minWidth={360} minHeight={300}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div onMouseDown={(e) => e.stopPropagation()} style={{
          display: "flex", gap: "6px", padding: "6px 10px",
          borderBottom: `1px solid ${color.border}`, flexShrink: 0,
          background: "#0e0e0e",
        }}>
          <button onClick={addNote} style={tbBtn(color)}>✎ Note</button>
          <button onClick={() => fileRef.current?.click()} style={tbBtn(color)}>🖼 Image</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          {activeId && (
            <button onClick={() => deleteItem(activeId)} style={{ ...tbBtn(color), marginLeft: "auto", color: "#f43f5e", borderColor: "#f43f5e44" }}>
              ✕ Remove
            </button>
          )}
        </div>

        {/* Board */}
        <div
          ref={boardRef}
          onMouseDown={(e) => { e.stopPropagation(); setActiveId(null); setEditingId(null); }}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            background: "repeating-linear-gradient(0deg, transparent, transparent 23px, #1a1a1a 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, #1a1a1a 24px)",
            backgroundColor: "#111",
          }}
        >
          {items.map((item) => (
            <VBItem
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              isEditing={editingId === item.id}
              noteColors={NOTE_COLORS}
              onMouseDown={(e) => onItemMouseDown(e, item.id)}
              onResizeDown={(e) => onResizeMouseDown(e, item.id)}
              onDoubleClick={() => { if (item.type === "note") { setEditingId(item.id); setActiveId(item.id); }}}
              onBlur={(val) => { updateItem(item.id, { content: val }); setEditingId(null); }}
              onColorChange={(c) => updateItem(item.id, { noteColor: c })}
            />
          ))}

          {items.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <p style={{ fontSize: "12px", color: "#2a2a2a", textAlign: "center" }}>
                Add notes or images above
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetShell>
  );
}

function VBItem({ item, isActive, isEditing, noteColors, onMouseDown, onResizeDown, onDoubleClick, onBlur, onColorChange }) {
  const [localText, setLocalText] = useState(item.content || "");

  const noteColor = item.noteColor || "#fef08a";

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        position: "absolute",
        left: item.x, top: item.y,
        width: item.w, height: item.h,
        outline: isActive ? "2px solid #8b5cf6" : "none",
        outlineOffset: "2px",
        borderRadius: item.type === "note" ? "8px" : "6px",
        overflow: "hidden",
        cursor: isEditing ? "text" : "grab",
        userSelect: isEditing ? "text" : "none",
        boxShadow: isActive ? "0 4px 20px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.3)",
        transition: "outline 0.1s, box-shadow 0.15s",
        zIndex: isActive ? 10 : 1,
      }}
    >
      {item.type === "image" ? (
        <img
          src={item.content}
          alt="vision"
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: noteColor, position: "relative" }}>
          {/* Color swatches */}
          {isActive && (
            <div style={{ position: "absolute", top: "4px", right: "4px", display: "flex", gap: "3px", zIndex: 2 }}>
              {noteColors.map((c) => (
                <div key={c} onClick={(e) => { e.stopPropagation(); onColorChange(c); }} style={{
                  width: "10px", height: "10px", borderRadius: "50%", background: c,
                  cursor: "pointer", outline: noteColor === c ? "1.5px solid #333" : "none", outlineOffset: "1px",
                }} />
              ))}
            </div>
          )}
          {isEditing ? (
            <textarea
              autoFocus
              defaultValue={item.content}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={(e) => onBlur(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "100%", height: "100%",
                background: "transparent", border: "none", outline: "none",
                resize: "none", padding: "8px", fontSize: "12px",
                color: "#1a1a1a", fontFamily: "'DM Sans', sans-serif",
                lineHeight: "1.5",
              }}
            />
          ) : (
            <div style={{
              padding: "8px", fontSize: "12px", color: "#1a1a1a",
              lineHeight: "1.5", wordBreak: "break-word",
              whiteSpace: "pre-wrap", height: "100%", overflow: "hidden",
            }}>
              {item.content || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
            </div>
          )}
        </div>
      )}

      {/* Resize handle */}
      {isActive && (
        <div
          onMouseDown={onResizeDown}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: "14px", height: "14px",
            cursor: "se-resize",
            background: "linear-gradient(135deg, transparent 50%, #8b5cf6aa 50%)",
            borderRadius: "0 0 6px 0",
          }}
        />
      )}
    </div>
  );
}

function tbBtn(color) {
  return {
    padding: "4px 10px", borderRadius: "6px",
    border: `1px solid ${color.border}`, background: "transparent",
    color: "#888", fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.12s",
  };
}