import { useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const DEFAULT_COLUMNS = [
  { id: "todo",  title: "To Do",  cards: [] },
  { id: "doing", title: "In Progress", cards: [] },
  { id: "done",  title: "Done",   cards: [] },
];

export default function KanbanWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color = getColor(data.colorId);
  const [columns,  setColumns]  = useState(data.columns || DEFAULT_COLUMNS);
  const [dragging, setDragging] = useState(null); // { cardId, fromCol }

  function sync(next) {
    setColumns(next);
    updateWidget(data.id, { columns: next });
  }

  function addCard(colId, text) {
    if (!text.trim()) return;
    sync(columns.map(col =>
      col.id === colId
        ? { ...col, cards: [...col.cards, { id: Date.now(), text: text.trim() }] }
        : col
    ));
  }

  function deleteCard(colId, cardId) {
    sync(columns.map(col =>
      col.id === colId
        ? { ...col, cards: col.cards.filter(c => c.id !== cardId) }
        : col
    ));
  }

  function updateColumnTitle(colId, title) {
    sync(columns.map(col => col.id === colId ? { ...col, title } : col));
  }

  function moveCard(cardId, fromColId, toColId, toIndex) {
    let moved;
    const step1 = columns.map(col => {
      if (col.id !== fromColId) return col;
      const cards = col.cards.filter(c => { if (c.id === cardId) { moved = c; return false; } return true; });
      return { ...col, cards };
    });
    const step2 = step1.map(col => {
      if (col.id !== toColId || !moved) return col;
      const cards = [...col.cards];
      cards.splice(toIndex, 0, moved);
      return { ...col, cards };
    });
    sync(step2);
  }

  function addColumn() {
    const id = `col_${Date.now()}`;
    sync([...columns, { id, title: "New Column", cards: [] }]);
  }

  function deleteColumn(colId) {
    sync(columns.filter(c => c.id !== colId));
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Kanban" minWidth={400} minHeight={300}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ display: "flex", gap: "8px", padding: "10px", height: "100%", overflowX: "auto", overflowY: "hidden" }}
      >
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            col={col}
            color={color}
            addCard={addCard}
            deleteCard={deleteCard}
            moveCard={moveCard}
            updateTitle={updateColumnTitle}
            deleteColumn={deleteColumn}
            dragging={dragging}
            setDragging={setDragging}
          />
        ))}

        {/* Add column */}
        <button
          onClick={addColumn}
          style={{
            flexShrink: 0, width: "44px", height: "44px", alignSelf: "flex-start",
            borderRadius: "8px", border: `1px dashed ${color.border}`,
            background: "transparent", color: "#555", fontSize: "20px",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Add column"
        >+</button>
      </div>
    </WidgetShell>
  );
}

function KanbanColumn({ col, color, addCard, deleteCard, moveCard, updateTitle, deleteColumn, dragging, setDragging }) {
  const [input,     setInput]     = useState("");
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal,  setTitleVal]  = useState(col.title);

  return (
    <div
      style={{
        width: "200px", minWidth: "200px",
        background: "#151515", border: `1px solid ${color.border}`,
        borderRadius: "10px", padding: "10px",
        display: "flex", flexDirection: "column", gap: "6px",
        flexShrink: 0, height: "100%",
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => {
        if (!dragging) return;
        moveCard(dragging.cardId, dragging.fromCol, col.id, col.cards.length);
        setDragging(null);
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color.accent, flexShrink: 0 }} />
        {editTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={() => { updateTitle(col.id, titleVal); setEditTitle(false); }}
            onKeyDown={e => { if (e.key === "Enter") { updateTitle(col.id, titleVal); setEditTitle(false); } }}
            style={{
              flex: 1, background: "transparent", border: "none",
              borderBottom: `1px solid ${color.accent}`,
              color: "#e0e0e0", fontSize: "11px", fontWeight: 700,
              outline: "none", fontFamily: "inherit",
            }}
          />
        ) : (
          <span
            onClick={() => setEditTitle(true)}
            style={{ flex: 1, fontSize: "11px", fontWeight: 700, color: "#ccc", cursor: "text", letterSpacing: "0.04em" }}
          >{col.title}</span>
        )}
        <span style={{ fontSize: "10px", color: "#444", marginLeft: "2px" }}>{col.cards.length}</span>
        <button onClick={() => deleteColumn(col.id)} style={{
          background: "transparent", border: "none", color: "#333",
          fontSize: "12px", cursor: "pointer", padding: "0 2px", lineHeight: 1,
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#f43f5e"}
          onMouseLeave={e => e.currentTarget.style.color = "#333"}
        >✕</button>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "5px" }}>
        {col.cards.map((card, idx) => (
          <KanbanCard
            key={card.id}
            card={card}
            index={idx}
            colId={col.id}
            color={color}
            dragging={dragging}
            setDragging={setDragging}
            moveCard={moveCard}
            deleteCard={deleteCard}
          />
        ))}
      </div>

      {/* Add card input */}
      <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { addCard(col.id, input); setInput(""); } }}
          placeholder="Add card…"
          style={{
            flex: 1, background: "#ffffff0a", border: `1px solid ${color.border}`,
            borderRadius: "6px", padding: "4px 7px", fontSize: "11px",
            color: "#ccc", outline: "none", fontFamily: "inherit",
          }}
        />
        <button onClick={() => { addCard(col.id, input); setInput(""); }} style={{
          background: color.accent, border: "none", borderRadius: "6px",
          color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
          padding: "0 8px",
        }}>+</button>
      </div>
    </div>
  );
}

function KanbanCard({ card, index, colId, color, dragging, setDragging, moveCard, deleteCard }) {
  const [hov, setHov] = useState(false);
  const isMe = dragging?.cardId === card.id;

  return (
    <div
      draggable
      onDragStart={() => setDragging({ cardId: card.id, fromCol: colId })}
      onDragEnd={() => setDragging(null)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.stopPropagation();
        if (!dragging || isMe) return;
        moveCard(dragging.cardId, dragging.fromCol, colId, index);
        setDragging(null);
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 9px", background: hov ? "#2a2a2a" : "#1e1e1e",
        border: `1px solid ${isMe ? color.accent : color.border}`,
        borderRadius: "7px", fontSize: "12px", color: "#ccc",
        cursor: "grab", opacity: isMe ? 0.45 : 1,
        display: "flex", alignItems: "flex-start", gap: "6px",
        transition: "all 0.1s",
      }}
    >
      <span style={{ flex: 1, lineHeight: "1.4", wordBreak: "break-word" }}>{card.text}</span>
      {hov && (
        <button onClick={() => deleteCard(colId, card.id)} style={{
          background: "transparent", border: "none", color: "#444",
          fontSize: "11px", cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#f43f5e"}
          onMouseLeave={e => e.currentTarget.style.color = "#444"}
        >✕</button>
      )}
    </div>
  );
}