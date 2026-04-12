import { useState, useMemo } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

// ─── helpers ────────────────────────────────────────────────────────────────
function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── CalendarWidget ─────────────────────────────────────────────────────────
function CalendarWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color = getColor(data.colorId);
  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [events,       setEvents]       = useState(data.events || {});

  // Day modal state
  const [modalDate,    setModalDate]    = useState(null); // "YYYY-MM-DD" | null
  const [newEventText, setNewEventText] = useState("");

  // Sidebar panel state
  const [panelOpen,    setPanelOpen]    = useState(true);

  // ── persist ────────────────────────────────────────────────────────────
  function saveEvents(updated) {
    setEvents(updated);
    updateWidget(data.id, { events: updated });
  }

  // ── event CRUD ─────────────────────────────────────────────────────────
  function addEvent() {
    if (!modalDate || !newEventText.trim()) return;
    const updated = { ...events };
    if (!updated[modalDate]) updated[modalDate] = [];
    updated[modalDate] = [...updated[modalDate], { id: Date.now(), text: newEventText.trim() }];
    saveEvents(updated);
    setNewEventText("");
  }

  function deleteEvent(dateKey, eventId) {
    const updated = { ...events };
    updated[dateKey] = (updated[dateKey] || []).filter((ev) => ev.id !== eventId);
    if (updated[dateKey].length === 0) delete updated[dateKey];
    saveEvents(updated);
  }

  // ── month nav ──────────────────────────────────────────────────────────
  function changeMonth(dir) {
    let m = currentMonth + dir;
    let y = currentYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setCurrentMonth(m);
    setCurrentYear(y);
  }

  // ── sorted event list for sidebar ─────────────────────────────────────
  const sortedEventDays = useMemo(() => {
    return Object.entries(events)
      .filter(([, evs]) => evs.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const upcomingDays = sortedEventDays.filter(([d]) => d >= todayKey);
  const pastDays     = sortedEventDays.filter(([d]) => d <  todayKey);

  // ── calendar cells ─────────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay    = getFirstDay(currentYear, currentMonth);

  // ── modal date display ─────────────────────────────────────────────────
  function formatModalDate(key) {
    if (!key) return "";
    const [y, m, d] = key.split("-");
    return `${MONTH_NAMES[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  }

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Calendar"
      minWidth={480} minHeight={400}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      {/* Root flex row: calendar | event panel */}
      <div style={{
        flex: 1, display: "flex", overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── LEFT: Calendar ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "14px", gap: "10px", minWidth: 0,
          overflow: "hidden",
        }}>

          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <NavBtn onClick={() => changeMonth(-1)} color={color}>‹</NavBtn>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: color.accent, letterSpacing: "0.04em" }}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              {/* Today button */}
              <button
                onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }}
                style={{
                  background: "#ffffff08", border: `1px solid ${color.border}`,
                  color: "#888", borderRadius: "6px", padding: "2px 8px",
                  fontSize: "10px", cursor: "pointer", fontFamily: "inherit",
                }}
              >Today</button>
            </div>
            <NavBtn onClick={() => changeMonth(1)} color={color}>›</NavBtn>
          </div>

          {/* Day-of-week headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: "3px", flexShrink: 0,
          }}>
            {DAY_LABELS.map((d) => (
              <div key={d} style={{
                fontSize: "10px", color: "#555", textAlign: "center",
                fontWeight: 600, letterSpacing: "0.05em", paddingBottom: "4px",
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: "3px", flex: 1, overflow: "hidden",
          }}>
            {/* Empty cells */}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={"e" + i} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dateKey = toKey(currentYear, currentMonth, day);
              const dayEvs  = events[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected2 = dateKey === modalDate;

              return (
                <div
                  key={day}
                  onClick={() => { setModalDate(dateKey); setNewEventText(""); }}
                  style={{
                    borderRadius: "8px",
                    padding: "4px 5px",
                    cursor: "pointer",
                    background: isSelected2
                      ? color.accent + "22"
                      : isToday
                      ? "#ffffff08"
                      : "#ffffff04",
                    border: isSelected2
                      ? `1.5px solid ${color.accent}`
                      : isToday
                      ? `1.5px solid ${color.accent}55`
                      : `1px solid ${color.border}`,
                    overflow: "hidden",
                    display: "flex", flexDirection: "column", gap: "2px",
                    transition: "all 0.1s",
                    minHeight: "44px",
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize: "10px", fontWeight: isToday ? 700 : 400,
                    color: isToday ? color.accent : "#888",
                    lineHeight: 1,
                  }}>{day}</div>

                  {/* Event pills */}
                  {dayEvs.slice(0, 2).map((ev) => (
                    <div key={ev.id} style={{
                      fontSize: "9px",
                      background: color.accent + "33",
                      borderRadius: "3px",
                      padding: "1px 3px",
                      color: color.accent,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      lineHeight: "1.3",
                    }}>
                      {ev.text}
                    </div>
                  ))}
                  {dayEvs.length > 2 && (
                    <div style={{ fontSize: "8px", color: "#555" }}>+{dayEvs.length - 2}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Event Panel (collapsible) ── */}
        <div style={{
          width: panelOpen ? "200px" : "0px",
          flexShrink: 0, overflow: "hidden",
          borderLeft: panelOpen ? `1px solid ${color.border}` : "none",
          transition: "width 0.2s ease",
          display: "flex", flexDirection: "column",
          background: "#ffffff03",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "14px 12px 8px",
            flexShrink: 0,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              Events
            </span>
          </div>

          {/* Upcoming */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
            {upcomingDays.length > 0 && (
              <>
                <SectionLabel>Upcoming</SectionLabel>
                {upcomingDays.map(([dateKey, evs]) => (
                  <EventGroup
                    key={dateKey} dateKey={dateKey} evs={evs}
                    color={color} todayKey={todayKey}
                    onDelete={deleteEvent}
                    onClickDate={() => { setModalDate(dateKey); setNewEventText(""); }}
                  />
                ))}
              </>
            )}

            {pastDays.length > 0 && (
              <>
                <SectionLabel dim>Past</SectionLabel>
                {[...pastDays].reverse().map(([dateKey, evs]) => (
                  <EventGroup
                    key={dateKey} dateKey={dateKey} evs={evs}
                    color={color} todayKey={todayKey}
                    onDelete={deleteEvent}
                    onClickDate={() => { setModalDate(dateKey); setNewEventText(""); }}
                    dim
                  />
                ))}
              </>
            )}

            {sortedEventDays.length === 0 && (
              <p style={{ fontSize: "11px", color: "#333", textAlign: "center", marginTop: "20px" }}>
                No events yet
              </p>
            )}
          </div>
        </div>

        {/* ── Panel toggle tab (on border between calendar and panel) ── */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          onMouseDown={(e) => e.stopPropagation()}
          title={panelOpen ? "Hide event list" : "Show event list"}
          style={{
            position: "absolute", right: panelOpen ? "200px" : "0px",
            top: "50%", transform: "translateY(-50%)",
            width: "16px", height: "40px",
            background: color.border,
            border: "none",
            borderRadius: "4px 0 0 4px",
            cursor: "pointer",
            color: "#666", fontSize: "9px",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, transition: "right 0.2s ease",
            flexShrink: 0,
          }}
        >
          {panelOpen ? "›" : "‹"}
        </button>
      </div>

      {/* ── Day Modal (overlaid inside widget) ── */}
      {modalDate && (
        <div
          onClick={() => setModalDate(null)} // click backdrop to close
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, borderRadius: "10px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a",
              border: `1px solid ${color.border}`,
              borderRadius: "14px",
              padding: "20px",
              width: "280px",
              maxHeight: "380px",
              display: "flex", flexDirection: "column",
              gap: "12px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "#555", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {modalDate === todayKey ? "Today" : ""}
                </p>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#e0e0e0" }}>
                  {formatModalDate(modalDate)}
                </h3>
              </div>
              <button
                onClick={() => setModalDate(null)}
                style={{
                  background: "transparent", border: "none",
                  color: "#555", fontSize: "16px", cursor: "pointer",
                  lineHeight: 1, padding: "2px",
                }}
              >✕</button>
            </div>

            {/* Add event input */}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Add an event..."
                autoFocus
                style={{
                  flex: 1, background: "#111",
                  border: `1px solid ${color.border}`,
                  borderRadius: "8px", padding: "7px 10px",
                  color: "#ddd", fontSize: "12px",
                  outline: "none", fontFamily: "inherit",
                  caretColor: color.accent,
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "88"}
                onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
              />
              <button
                onClick={addEvent}
                style={{
                  background: color.accent, border: "none",
                  borderRadius: "8px", color: "#fff",
                  padding: "7px 12px", fontSize: "13px",
                  fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit", flexShrink: 0,
                }}
              >+</button>
            </div>

            {/* Event list for this day */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {(events[modalDate] || []).length === 0 ? (
                <p style={{ fontSize: "12px", color: "#333", textAlign: "center", margin: "12px 0" }}>
                  No events — add one above
                </p>
              ) : (
                (events[modalDate] || []).map((ev) => (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "#ffffff06",
                    border: `1px solid ${color.border}`,
                    borderRadius: "8px", padding: "8px 10px",
                  }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: color.accent, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: "13px", color: "#ccc", lineHeight: "1.4" }}>
                      {ev.text}
                    </span>
                    <button
                      onClick={() => deleteEvent(modalDate, ev.id)}
                      style={{
                        background: "transparent", border: "none",
                        color: "#444", fontSize: "12px", cursor: "pointer",
                        padding: "0 2px", lineHeight: 1, flexShrink: 0,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#444"}
                    >✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────

function NavBtn({ onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      background: "#ffffff08", border: `1px solid ${color.border}`,
      color: "#aaa", borderRadius: "8px", padding: "4px 12px",
      cursor: "pointer", fontSize: "16px", lineHeight: 1,
      fontFamily: "inherit",
    }}>{children}</button>
  );
}

function SectionLabel({ children, dim }) {
  return (
    <p style={{
      fontSize: "9px", color: dim ? "#333" : "#555",
      letterSpacing: "0.08em", textTransform: "uppercase",
      fontWeight: 600, margin: "10px 0 4px",
    }}>{children}</p>
  );
}

function EventGroup({ dateKey, evs, color, todayKey, onDelete, onClickDate, dim }) {
  const [y, m, d] = dateKey.split("-");
  const label = dateKey === todayKey
    ? "Today"
    : `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`;

  return (
    <div style={{ marginBottom: "8px" }}>
      <button
        onClick={onClickDate}
        style={{
          background: "transparent", border: "none", padding: 0,
          fontSize: "10px", color: dim ? "#444" : color.accent,
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          marginBottom: "3px", letterSpacing: "0.03em",
        }}
      >{label}</button>
      {evs.map((ev) => (
        <div key={ev.id} style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "3px 0",
        }}>
          <div style={{
            width: "4px", height: "4px", borderRadius: "50%",
            background: dim ? "#444" : color.accent, flexShrink: 0,
          }} />
          <span style={{
            flex: 1, fontSize: "11px",
            color: dim ? "#444" : "#aaa",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            lineHeight: "1.4",
          }}>{ev.text}</span>
          <button
            onClick={() => onDelete(dateKey, ev.id)}
            style={{
              background: "transparent", border: "none",
              color: "#333", fontSize: "10px", cursor: "pointer",
              padding: 0, lineHeight: 1, flexShrink: 0,
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#333"}
          >✕</button>
        </div>
      ))}
    </div>
  );
}

export default CalendarWidget;