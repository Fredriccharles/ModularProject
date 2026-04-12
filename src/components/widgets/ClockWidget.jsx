import { useEffect, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

function ClockWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const [time, setTime] = useState(new Date());
  const color = getColor(data.colorId);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dateStr = `${days[time.getDay()]}, ${months[time.getMonth()]} ${time.getDate()}`;

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Clock" minWidth={200} minHeight={110}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "12px 16px", userSelect: "none", gap: "4px",
      }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: "1px",
          fontFamily: "'DM Mono', 'Fira Mono', monospace",
          fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1,
        }}>
          <span style={{ fontSize: "clamp(28px, 5vw, 42px)", color: color.accent }}>{hh}</span>
          <BlinkColon accent={color.accent} />
          <span style={{ fontSize: "clamp(28px, 5vw, 42px)", color: color.accent }}>{mm}</span>
          <BlinkColon accent={color.accent} />
          <span style={{ fontSize: "clamp(18px, 3vw, 26px)", color: color.accent + "55", marginLeft: "2px" }}>{ss}</span>
        </div>
        <div style={{ fontSize: "11px", color: color.accent + "55", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
          {dateStr}
        </div>
      </div>
    </WidgetShell>
  );
}

function BlinkColon({ accent }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      fontSize: "clamp(28px, 5vw, 42px)", color: accent,
      opacity: on ? 0.9 : 0.2, transition: "opacity 0.3s", margin: "0 1px",
    }}>:</span>
  );
}

export default ClockWidget;