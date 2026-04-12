import { useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

function NotesWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const [text, setText] = useState(data.text || "");
  const color = getColor(data.colorId);

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Note" minWidth={200} minHeight={160}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); updateWidget(data.id, { text: e.target.value }); }}
        placeholder="Start writing..."
        style={{
          flex: 1, background: "transparent", border: "none",
          outline: "none", resize: "none", padding: "12px",
          color: "#c8c8c8", fontSize: "13px", lineHeight: "1.65",
          fontFamily: "inherit", caretColor: color.accent, cursor: "text",
        }}
      />
    </WidgetShell>
  );
}

export default NotesWidget;