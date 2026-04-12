import { useState, useRef } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

function TodoWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const [task, setTask] = useState("");
  const [list, setList] = useState(data.list || []);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const dragIndexRef = useRef(null);

  const color = getColor(data.colorId);

  function syncList(next) {
    setList(next);
    updateWidget(data.id, { list: next });
  }

  function addTask() {
    if (!task.trim()) return;
    syncList([...list, { text: task.trim(), done: false }]);
    setTask("");
  }

  function reorder(from, to) {
    if (from === to || to == null) return;

    const updated = [...list];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);

    syncList(updated);
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Todo" minWidth={220} minHeight={180}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      {/* Input */}
      <div style={{
        display: "flex", gap: "6px", padding: "8px 10px",
        borderBottom: `1px solid ${color.border}`, flexShrink: 0
      }}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          style={{
            flex: 1,
            background: "#ffffff0d",
            border: `1px solid ${color.border}`,
            borderRadius: "6px",
            padding: "5px 8px",
            color: "#ccc",
            fontSize: "12px",
            outline: "none",
            caretColor: color.accent
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: "5px 11px",
            background: color.accent,
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
            cursor: "pointer"
          }}
        >
          Add
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {list.length === 0 && (
          <p style={{ color: "#2e2e2e", fontSize: "12px", textAlign: "center", marginTop: "18px" }}>
            No tasks yet
          </p>
        )}

        {list.map((t, i) => (
          <div key={i}>
            {/* 🔥 Drop indicator (Notion style line) */}
            {dragOverIndex === i && (
              <div style={{
                height: "2px",
                background: color.accent,
                borderRadius: "2px",
                margin: "2px 0"
              }} />
            )}

            <TaskRow
              index={i}
              task={t}
              accent={color.accent}
              border={color.border}

              onToggle={() =>
                syncList(list.map((item, idx) =>
                  idx === i ? { ...item, done: !item.done } : item
                ))
              }

              onRemove={() =>
                syncList(list.filter((_, idx) => idx !== i))
              }

              onDragStart={() => (dragIndexRef.current = i)}

              onDragEnter={() => setDragOverIndex(i)}

              onDrop={() => {
                reorder(dragIndexRef.current, i);
                setDragOverIndex(null);
              }}
            />
          </div>
        ))}

        {/* drop at end */}
        {dragOverIndex === list.length && (
          <div style={{
            height: "2px",
            background: color.accent,
            borderRadius: "2px",
            margin: "2px 0"
          }} />
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setDragOverIndex(list.length)}
          onDrop={() => {
            reorder(dragIndexRef.current, list.length);
            setDragOverIndex(null);
          }}
        />
      </div>
    </WidgetShell>
  );
}

function TaskRow({ task, accent, onToggle, onRemove, index, onDragStart, onDragEnter, onDrop }) {
  const [hov, setHov] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => {
        setDragging(true);
        onDragStart(index);
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDrop={onDrop}

      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}

      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 6px",
        borderRadius: "6px",
        background: dragging ? "#ffffff15" : hov ? "#ffffff08" : "transparent",
        opacity: dragging ? 0.5 : 1,
        transition: "all 0.15s",
        cursor: "grab"
      }}
    >
      {/* checkbox */}
      <div
        onClick={onToggle}
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "4px",
          border: `1.5px solid ${task.done ? accent : "#3a3a3a"}`,
          background: task.done ? accent : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
      >
        {task.done && (
          <svg width="8" height="8" viewBox="0 0 8 8">
            <polyline
              points="1.5,4 3,5.5 6.5,2"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* text */}
      <span
        onClick={onToggle}
        style={{
          flex: 1,
          fontSize: "12.5px",
          color: task.done ? "#3a3a3a" : "#aaa",
          textDecoration: task.done ? "line-through" : "none",
          cursor: "pointer"
        }}
      >
        {task.text}
      </span>

      {/* delete */}
      {hov && (
        <button
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            color: "#444",
            fontSize: "11px",
            cursor: "pointer"
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default TodoWidget;