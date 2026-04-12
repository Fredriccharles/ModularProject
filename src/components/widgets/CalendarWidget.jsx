import { useState, useMemo } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

// ── helpers ──────────────────────────────────────────────────────────────────
function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }

// Sort events: timed first (ascending), untimed last
function sortEvents(evs) {
  return [...evs].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

function fmt12(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── CalendarWidget ────────────────────────────────────────────────────────────
export default function CalendarWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color    = getColor(data.colorId);
  const today    = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [events,       setEvents]       = useState(data.events || {});
  const [modalDate,    setModalDate]    = useState(null);
  const [newText,      setNewText]      = useState("");
  const [newTime,      setNewTime]      = useState(""); // FEATURE 1
  const [panelOpen,    setPanelOpen]    = useState(true);

  function saveEvents(updated) {
    setEvents(updated);
    updateWidget(data.id, { events: updated });
  }

  // FEATURE 1: addEvent stores { id, text, time }
  function addEvent() {
    if (!modalDate || !newText.trim()) return;
    const updated = { ...events };
    if (!updated[modalDate]) updated[modalDate] = [];
    const newEv = { id: Date.now(), text: newText.trim(), time: newTime || "" };
    // Insert sorted
    updated[modalDate] = sortEvents([...updated[modalDate], newEv]);
    saveEvents(updated);
    setNewText("");
    setNewTime("");
  }

  function deleteEvent(dateKey, eventId) {
    const updated = { ...events };
    updated[dateKey] = (updated[dateKey] || []).filter((ev) => ev.id !== eventId);
    if (!updated[dateKey].length) delete updated[dateKey];
    saveEvents(updated);
  }

  function changeMonth(dir) {
    let m = currentMonth + dir, y = currentYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setCurrentMonth(m); setCurrentYear(y);
  }

  const sortedEventDays = useMemo(() =>
    Object.entries(events).filter(([, evs]) => evs.length > 0).sort(([a], [b]) => a.localeCompare(b)),
  [events]);

  const upcomingDays = sortedEventDays.filter(([d]) => d >= todayKey);
  const pastDays     = sortedEventDays.filter(([d]) => d <  todayKey);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay    = getFirstDay(currentYear, currentMonth);

  function formatModalDate(key) {
    if (!key) return "";
    const [y, m, d] = key.split("-");
    return `${MONTH_NAMES[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Calendar" minWidth={480} minHeight={400}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Calendar grid ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px", gap: "10px", minWidth: 0, overflow: "hidden" }}>

          {/* Month nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <NavBtn onClick={() => changeMonth(-1)} color={color}>‹</NavBtn>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: color.accent, letterSpacing: "0.04em" }}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }} style={{
                background: "#ffffff08", border: `1px solid ${color.border}`,
                color: "#888", borderRadius: "6px", padding: "2px 8px",
                fontSize: "10px", cursor: "pointer", fontFamily: "inherit",
              }}>Today</button>
            </div>
            <NavBtn onClick={() => changeMonth(1)} color={color}>›</NavBtn>
          </div>

          {/* Day-of-week labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", flexShrink: 0 }}>
            {DAY_LABELS.map((d) => (
              <div key={d} style={{ fontSize: "10px", color: "#555", textAlign: "center", fontWeight: 600, letterSpacing: "0.05em", paddingBottom: "4px" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", flex: 1, overflow: "hidden" }}>
            {Array.from({ length: startDay }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day      = i + 1;
              const dateKey  = toKey(currentYear, currentMonth, day);
              const dayEvs   = events[dateKey] ? sortEvents(events[dateKey]) : [];
              const isToday  = dateKey === todayKey;
              const isSel    = dateKey === modalDate;
              return (
                <div key={day} onClick={() => { setModalDate(dateKey); setNewText(""); setNewTime(""); }} style={{
                  borderRadius: "8px", padding: "4px 5px", cursor: "pointer",
                  background: isSel ? color.accent + "22" : isToday ? "#ffffff08" : "#ffffff04",
                  border: isSel ? `1.5px solid ${color.accent}` : isToday ? `1.5px solid ${color.accent}55` : `1px solid ${color.border}`,
                  overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px",
                  transition: "all 0.1s", minHeight: "44px",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: isToday ? 700 : 400, color: isToday ? color.accent : "#888", lineHeight: 1 }}>{day}</div>
                  {/* FEATURE 1: Show time on pill if present */}
                  {dayEvs.slice(0, 2).map((ev) => (
                    <div key={ev.id} style={{
                      fontSize: "9px", background: color.accent + "33", borderRadius: "3px",
                      padding: "1px 3px", color: color.accent,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "1.3",
                    }}>
                      {ev.time ? `${fmt12(ev.time)} ` : ""}{ev.text}
                    </div>
                  ))}
                  {dayEvs.length > 2 && <div style={{ fontSize: "8px", color: "#555" }}>+{dayEvs.length - 2}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Event panel (right, collapsible) ── */}
        <div style={{
          width: panelOpen ? "200px" : "0px", flexShrink: 0, overflow: "hidden",
          borderLeft: panelOpen ? `1px solid ${color.border}` : "none",
          transition: "width 0.2s ease", display: "flex", flexDirection: "column",
          background: "#ffffff03",
        }}>
          <div style={{ padding: "14px 12px 8px", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Events</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
            {upcomingDays.length > 0 && (
              <>
                <SectionLabel>Upcoming</SectionLabel>
                {upcomingDays.map(([dateKey, evs]) => (
                  <EventGroup key={dateKey} dateKey={dateKey} evs={sortEvents(evs)}
                    color={color} todayKey={todayKey} onDelete={deleteEvent}
                    onClickDate={() => { setModalDate(dateKey); setNewText(""); setNewTime(""); }} />
                ))}
              </>
            )}
            {pastDays.length > 0 && (
              <>
                <SectionLabel dim>Past</SectionLabel>
                {[...pastDays].reverse().map(([dateKey, evs]) => (
                  <EventGroup key={dateKey} dateKey={dateKey} evs={sortEvents(evs)}
                    color={color} todayKey={todayKey} onDelete={deleteEvent}
                    onClickDate={() => { setModalDate(dateKey); setNewText(""); setNewTime(""); }} dim />
                ))}
              </>
            )}
            {sortedEventDays.length === 0 && (
              <p style={{ fontSize: "11px", color: "#333", textAlign: "center", marginTop: "20px" }}>No events yet</p>
            )}
          </div>
        </div>

        {/* Panel toggle tab */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute", right: panelOpen ? "200px" : "0px",
            top: "50%", transform: "translateY(-50%)",
            width: "16px", height: "40px",
            background: color.border, border: "none", borderRadius: "4px 0 0 4px",
            cursor: "pointer", color: "#666", fontSize: "9px",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, transition: "right 0.2s ease", flexShrink: 0,
          }}
        >{panelOpen ? "›" : "‹"}</button>
      </div>

      {/* ── Day modal ── */}
      {modalDate && (
        <div onClick={() => setModalDate(null)} style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 50, borderRadius: "10px",
        }}>
          <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{
            background: "#1a1a1a", border: `1px solid ${color.border}`,
            borderRadius: "14px", padding: "20px", width: "300px", maxHeight: "400px",
            display: "flex", flexDirection: "column", gap: "12px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
          }}>
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
              <button onClick={() => setModalDate(null)} style={{ background: "transparent", border: "none", color: "#555", fontSize: "16px", cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            {/* FEATURE 1: Add event with time */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEvent()}
                  placeholder="Add an event..."
                  autoFocus
                  style={{
                    flex: 1, background: "#111", border: `1px solid ${color.border}`,
                    borderRadius: "8px", padding: "7px 10px", color: "#ddd",
                    fontSize: "12px", outline: "none", fontFamily: "inherit",
                    caretColor: color.accent,
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "88"}
                  onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
                />
                <button onClick={addEvent} style={{
                  background: color.accent, border: "none", borderRadius: "8px",
                  color: "#fff", padding: "7px 12px", fontSize: "13px",
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                }}>+</button>
              </div>
              {/* Time input */}
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={{
                  background: "#111", border: `1px solid ${color.border}`,
                  borderRadius: "8px", padding: "6px 10px", color: "#888",
                  fontSize: "12px", outline: "none", fontFamily: "inherit",
                  colorScheme: "dark",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "88"}
                onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
              />
            </div>

            {/* Event list — sorted by time */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
              {!(events[modalDate] || []).length ? (
                <p style={{ fontSize: "12px", color: "#333", textAlign: "center", margin: "12px 0" }}>No events — add one above</p>
              ) : (
                sortEvents(events[modalDate] || []).map((ev) => (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "#ffffff06", border: `1px solid ${color.border}`,
                    borderRadius: "8px", padding: "8px 10px",
                  }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color.accent, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      {/* FEATURE 1: Show formatted time */}
                      {ev.time && (
                        <div style={{ fontSize: "10px", color: color.accent + "99", marginBottom: "1px", fontWeight: 600 }}>
                          {fmt12(ev.time)}
                        </div>
                      )}
                      <span style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.4" }}>{ev.text}</span>
                    </div>
                    <button
                      onClick={() => deleteEvent(modalDate, ev.id)}
                      style={{ background: "transparent", border: "none", color: "#444", fontSize: "12px", cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
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

// ── Sub-components ────────────────────────────────────────────────────────────
function NavBtn({ onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      background: "#ffffff08", border: `1px solid ${color.border}`,
      color: "#aaa", borderRadius: "8px", padding: "4px 12px",
      cursor: "pointer", fontSize: "16px", lineHeight: 1, fontFamily: "inherit",
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
  const [, m, d] = dateKey.split("-");
  const label = dateKey === todayKey
    ? "Today"
    : `${MONTH_NAMES[parseInt(m) - 1].slice(0, 3)} ${parseInt(d)}`;
  return (
    <div style={{ marginBottom: "8px" }}>
      <button onClick={onClickDate} style={{
        background: "transparent", border: "none", padding: 0,
        fontSize: "10px", color: dim ? "#444" : color.accent,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        marginBottom: "3px", letterSpacing: "0.03em",
      }}>{label}</button>
      {evs.map((ev) => (
        <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: "5px", padding: "3px 0" }}>
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: dim ? "#444" : color.accent, flexShrink: 0, marginTop: "4px" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* FEATURE 1: Time in sidebar list */}
            {ev.time && (
              <div style={{ fontSize: "9px", color: dim ? "#333" : color.accent + "88", lineHeight: 1, marginBottom: "1px" }}>
                {fmt12(ev.time)}
              </div>
            )}
            <span style={{
              fontSize: "11px", color: dim ? "#444" : "#aaa",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              lineHeight: "1.4", display: "block",
            }}>{ev.text}</span>
          </div>
          <button
            onClick={() => onDelete(dateKey, ev.id)}
            style={{ background: "transparent", border: "none", color: "#333", fontSize: "10px", cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#333"}
          >✕</button>
        </div>
      ))}
    </div>
  );
}