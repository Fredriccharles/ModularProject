import { useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

function TodoWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const [task, setTask] = useState("");
  const [list, setList] = useState(data.list || []);
  const color = getColor(data.colorId);

  function syncList(next) { setList(next); updateWidget(data.id, { list: next }); }
  function addTask() {
    if (!task.trim()) return;
    syncList([...list, { text: task.trim(), done: false }]);
    setTask("");
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Todo" minWidth={220} minHeight={180}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ display: "flex", gap: "6px", padding: "8px 10px", borderBottom: `1px solid ${color.border}`, flexShrink: 0 }}>
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          style={{
            flex: 1, background: "#ffffff0d", border: `1px solid ${color.border}`,
            borderRadius: "6px", padding: "5px 8px", color: "#ccc",
            fontSize: "12px", fontFamily: "inherit", outline: "none",
            caretColor: color.accent, cursor: "text", transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = color.accent + "88")}
          onBlur={(e) => (e.currentTarget.style.borderColor = color.border)}
        />
        <button
          onClick={addTask}
          style={{
            padding: "5px 11px", background: color.accent, border: "none",
            borderRadius: "6px", color: "#fff", fontSize: "12px", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >Add</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
        {list.length === 0 && (
          <p style={{ color: "#2e2e2e", fontSize: "12px", textAlign: "center", marginTop: "18px" }}>No tasks yet</p>
        )}
        {list.map((t, i) => (
          <TaskRow key={i} task={t} accent={color.accent} border={color.border}
            onToggle={() => syncList(list.map((item, idx) => idx === i ? { ...item, done: !item.done } : item))}
            onRemove={() => syncList(list.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
    </WidgetShell>
  );
}

function TaskRow({ task, accent, onToggle, onRemove }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "5px 4px", borderRadius: "5px",
      background: hov ? "#ffffff08" : "transparent", transition: "background 0.1s",
    }}>
      <div onClick={onToggle} style={{
        width: "14px", height: "14px", borderRadius: "4px",
        border: `1.5px solid ${task.done ? accent : "#3a3a3a"}`,
        background: task.done ? accent : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", transition: "all 0.15s",
      }}>
        {task.done && (
          <svg width="8" height="8" viewBox="0 0 8 8">
            <polyline points="1.5,4 3,5.5 6.5,2" stroke="white" strokeWidth="1.5"
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span onClick={onToggle} style={{
        flex: 1, fontSize: "12.5px",
        color: task.done ? "#3a3a3a" : "#aaa",
        textDecoration: task.done ? "line-through" : "none",
        cursor: "pointer", lineHeight: "1.4",
      }}>{task.text}</span>
      {hov && (
        <button onClick={onRemove} style={{
          background: "transparent", border: "none", color: "#444",
          fontSize: "11px", cursor: "pointer", padding: "0 2px", lineHeight: 1,
        }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ff5f57")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >✕</button>
      )}
    </div>
  );
}

export default TodoWidget;