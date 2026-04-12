import { useEffect, useRef, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const MODES = [
  { label: "Focus", duration: 25 * 60 },
  { label: "Short Break", duration: 5 * 60 },
  { label: "Long Break", duration: 15 * 60 },
];

function PomodoroWidget({
  data,
  updateWidget,
  deleteWidget,
  isSelected,
  onSelect,
  selectedIds,
  allWidgets,
  updateAllWidgets,
}) {
  const [modeIdx, setModeIdx] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  const [editingFocus, setEditingFocus] = useState(false);

  const intervalRef = useRef(null);
  const color = getColor(data.colorId);

  // TIMER
  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]);

  // MODE SWITCH
  function switchMode(idx) {
    setModeIdx(idx);
    setRunning(false);

    if (idx === 0) {
      setSecondsLeft(focusMinutes * 60);
    } else {
      setSecondsLeft(MODES[idx].duration);
    }
  }

  // RESET
  function reset() {
    setRunning(false);
    setSecondsLeft(
      modeIdx === 0 ? focusMinutes * 60 : MODES[modeIdx].duration
    );
  }

  // 🔥 NEW: SCROLL TO CHANGE FOCUS TIME (NO INPUT)
  function handleWheel(e) {
    if (modeIdx !== 0 || running) return;

    e.preventDefault();

    const change = e.deltaY > 0 ? -1 : 1;

    setFocusMinutes((prev) => {
      const next = Math.max(1, prev + change);
      setSecondsLeft(next * 60);
      return next;
    });
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const totalDuration =
    modeIdx === 0 ? focusMinutes * 60 : MODES[modeIdx].duration;

  const progress = 1 - secondsLeft / totalDuration;

  const r = 36;
  const circ = 2 * Math.PI * r;

  return (
    <WidgetShell
      data={data}
      updateWidget={updateWidget}
      deleteWidget={deleteWidget}
      label="Pomodoro"
      minWidth={240}
      minHeight={260}
      isSelected={isSelected}
      onSelect={onSelect}
      selectedIds={selectedIds}
      allWidgets={allWidgets}
      updateAllWidgets={updateAllWidgets}
    >
      <div
        onWheel={handleWheel}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "14px",
          gap: "14px",
          userSelect: "none",
        }}
      >
        {/* MODE TABS */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "#ffffff08",
            borderRadius: "10px",
            padding: "4px",
            width: "100%",
          }}
        >
          {MODES.map((m, i) => (
            <button
              key={i}
              onClick={() => switchMode(i)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: "8px",
                border: "none",
                background: modeIdx === i ? color.accent : "transparent",
                color: modeIdx === i ? "#fff" : "#666",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 🔥 CLEAN FOCUS DISPLAY (CLICK TO TOGGLE HINT) */}
        {modeIdx === 0 && (
          <div
            onClick={() => setEditingFocus((e) => !e)}
            style={{
              fontSize: "11px",
              color: "#777",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Focus: {focusMinutes} min
            <div style={{ fontSize: 9, opacity: 0.4 }}>
              (scroll to adjust)
            </div>
          </div>
        )}

        {/* TIMER */}
        <div style={{ position: "relative", width: "100px", height: "100px" }}>
          <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color.accent + "15"}
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={color.accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${circ * progress} ${circ}`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "24px",
                fontWeight: 600,
                color: color.accent,
              }}
            >
              {mm}:{ss}
            </span>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setRunning((r) => !r)}
            style={{
              padding: "8px 26px",
              background: color.accent,
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {running ? "PAUSE" : "START"}
          </button>

          <button
            onClick={reset}
            style={{
              padding: "8px 12px",
              background: "#ffffff08",
              border: `1px solid ${color.border}`,
              borderRadius: "10px",
              color: "#666",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            ↺
          </button>
        </div>
      </div>
    </WidgetShell>
  );
}

export default PomodoroWidget;