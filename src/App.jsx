import { useEffect, useRef, useState } from "react";
import NotesWidget    from "./components/widgets/NotesWidget";
import TodoWidget     from "./components/widgets/TodoWidget";
import ClockWidget    from "./components/widgets/ClockWidget";
import PomodoroWidget from "./components/widgets/PomodoroWidget";
import CalendarWidget from "./components/widgets/CalendarWidget.jsx";
import { WIDGET_COLORS } from "./components/widgets/widgetColors.jsx";
import KanbanWidget from "./components/widgets/KanbanWidget.jsx";
import WhiteboardWidget from "./components/widgets/Whiteboardwidget.jsx";
import PdfWidget from "./components/widgets/Pdfwidget.jsx";
import IdeaGeneratorWidget from "./components/widgets/IdeaGeneratorWidget.jsx";
import MiniMap from "./components/MiniMap.jsx";
import { supabase } from "./supabaseClient";

let colorIndex = 0;
const GRID_SIZE = 24;

const WIDGET_CATALOGUE = [
  { type: "notes",    icon: "✏️", label: "Note",     w: 280, h: 220 },
  { type: "todo",     icon: "✓",  label: "Todo",     w: 280, h: 220 },
  { type: "clock",    icon: "◷",  label: "Clock",    w: 260, h: 120 },
  { type: "pomodoro", icon: "⏱",  label: "Pomodoro", w: 240, h: 260 },
  { type: "calendar", icon: "📅", label: "Calendar", w: 680, h: 480 },
  { type: "kanban",     icon: "🗂",  label: "Kanban",  w: 560, h: 380 },
  { type: "whiteboard", icon: "🧩",  label: "Draw",    w: 500, h: 400 },
  { type: "pdf",        icon: "📄",  label: "PDF",     w: 520, h: 520 },
  { type: "idea",       icon: "✦",   label: "Ideas",   w: 300, h: 340 },
];

const THEMES = {
  dark: {
    bg: "#0f0f0f", panel: "#161616", sidebar: "#141414",
    border: "#242424", borderSub: "#2a2a2a",
    text: "#e0e0e0", textDim: "#666", textMuted: "#444",
    dot: "#2a2a2a", inputBg: "#1e1e1e", hoverBg: "#1e1e1e",
    toolbarBg: "#181818",
  },
  light: {
    bg: "#f0f0f0", panel: "#ffffff", sidebar: "#fafafa",
    border: "#e0e0e0", borderSub: "#dddddd",
    text: "#111111", textDim: "#555", textMuted: "#999",
    dot: "#cccccc", inputBg: "#f5f5f5", hoverBg: "#f0f0f0",
    toolbarBg: "#ffffff",
  },
};

function snap(value, enabled) {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;
}

// ── App receives user + onLogout from main.jsx ────────────────────────────
function App({ user, onLogout }) {
  // ── Widget + canvas state ─────────────────────────────────────────────
  const [widgets,      setWidgets]      = useState([]);
  const [offset,       setOffset]       = useState({ x: 0, y: 0 });
  const [zoom,         setZoom]         = useState(1);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [activeTool,   setActiveTool]   = useState("hand");
  const [draggingType, setDraggingType] = useState(null);
  const [theme,        setTheme]        = useState("dark");
  const [snapEnabled,  setSnapEnabled]  = useState(false);
  const [bgImage,      setBgImage]      = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [loaded,       setLoaded]       = useState(false);

  const T = THEMES[theme];

  // ── Refs ──────────────────────────────────────────────────────────────
  const offsetRef       = useRef({ x: 0, y: 0 });
  const zoomRef         = useRef(1);
  const widgetsRef      = useRef(widgets);
  const selectedIdsRef  = useRef(selectedIds);
  const activeToolRef   = useRef("hand");
  const draggingTypeRef = useRef(null);
  const snapEnabledRef  = useRef(false);
  const sidebarOpenRef  = useRef(true);
  const isPanning       = useRef(false);
  const panLast         = useRef({ x: 0, y: 0 });
  const isSelecting     = useRef(false);
  const selStart        = useRef({ x: 0, y: 0 });
  const selectionBoxRef = useRef(null);
  const dragGhostRef    = useRef(null);
  const bgInputRef      = useRef(null);
  const saveTimeout     = useRef(null);

  useEffect(() => { offsetRef.current      = offset; },      [offset]);
  useEffect(() => { zoomRef.current        = zoom; },        [zoom]);
  useEffect(() => { widgetsRef.current     = widgets; },     [widgets]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { activeToolRef.current  = activeTool; },  [activeTool]);
  useEffect(() => { selectionBoxRef.current = selectionBox; }, [selectionBox]);
  useEffect(() => { snapEnabledRef.current  = snapEnabled; }, [snapEnabled]);
  useEffect(() => { sidebarOpenRef.current  = sidebarOpen; }, [sidebarOpen]);

  // ── Load workspace from Supabase on mount ───────────────────────────────
  // We use a ref to track the "snapshot" that was just loaded so the save
  // effect can tell the difference between "just loaded" and "user changed".
  const justLoadedRef = useRef(false);

  useEffect(() => {
    setLoaded(false);
    justLoadedRef.current = false;

    async function loadWorkspace() {
      try {
        const { data, error } = await supabase
          .from("workspaces")
          .select("widgets, offset_x, offset_y, zoom")
          .eq("user_id", user.id)
          .maybeSingle(); // ← maybeSingle() returns null (not error) when no row exists

        if (error) {
          console.error("[load] Supabase error:", error.message);
        }

        if (data) {
          // Validate widgets array before applying — never set corrupted data
          const safeWidgets = Array.isArray(data.widgets) ? data.widgets : [];
          console.log("[load] Restoring", safeWidgets.length, "widgets");
          setWidgets(safeWidgets);
          setOffset({ x: data.offset_x ?? 0, y: data.offset_y ?? 0 });
          setZoom(data.zoom ?? 1);
        } else {
          console.log("[load] No saved workspace found — starting fresh");
        }
      } catch (err) {
        console.error("[load] Unexpected error:", err);
      }

      // Mark load done. Set justLoadedRef BEFORE setLoaded so the save
      // effect sees it as true on its first run.
      justLoadedRef.current = true;
      setLoaded(true);
    }

    loadWorkspace();
  }, [user.id]);

  // ── Auto-save widgets to Supabase (debounced 1.5s) ───────────────────────
  // KEY FIX: justLoadedRef lets us skip the very first save trigger that
  // fires when `loaded` flips to true. After that first skip, we reset it
  // so all subsequent widget changes save normally.
  useEffect(() => {
    if (!loaded) return;

    // Skip the immediate fire after load completes — data hasn't changed
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      console.log("[save] Saving", widgets.length, "widgets...");
      const { error } = await supabase.from("workspaces").upsert({
        user_id:  user.id,
        widgets,         // ← full widget objects including all internal data
        offset_x: offset.x,
        offset_y: offset.y,
        zoom,
      }, { onConflict: "user_id" });
      if (error) console.error("[save] Save failed:", error.message);
      else console.log("[save] Saved OK");
      setSaving(false);
    }, 1500);
  }, [loaded, widgets, offset, zoom]);

  // ── CRUD ──────────────────────────────────────────────────────────────
  function addWidget(type, screenX, screenY) {
    const colorId   = WIDGET_COLORS[colorIndex % WIDGET_COLORS.length].id;
    colorIndex++;
    const o         = offsetRef.current;
    const z         = zoomRef.current;
    const cat       = WIDGET_CATALOGUE.find((c) => c.type === type);
    const W         = cat?.w ?? 280;
    const H         = cat?.h ?? 220;
    const SIDEBAR_W = sidebarOpenRef.current ? 220 : 0;

    let worldX, worldY;
    if (screenX != null) {
      worldX = (screenX - SIDEBAR_W - o.x) / z - W / 2;
      worldY = (screenY - 48 - o.y) / z - H / 2;
    } else {
      worldX = (-o.x + (window.innerWidth - SIDEBAR_W) / 2 - W / 2) / z;
      worldY = (-o.y + (window.innerHeight - 48) / 2 - H / 2) / z;
    }

    worldX = snap(worldX, snapEnabledRef.current);
    worldY = snap(worldY, snapEnabledRef.current);

    setWidgets((prev) => [...prev, {
      id: Date.now(), type, colorId,
      x: worldX, y: worldY, width: W, height: H,
    }]);
  }

  function updateWidget(id, changes) {
    if (changes.x != null) changes.x = snap(changes.x, snapEnabledRef.current);
    if (changes.y != null) changes.y = snap(changes.y, snapEnabledRef.current);
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, ...changes } : w));
  }

  function updateAllWidgets(updates) {
    setWidgets((prev) => {
      const map = {};
      updates.forEach(({ id, changes }) => {
        if (changes.x != null) changes.x = snap(changes.x, snapEnabledRef.current);
        if (changes.y != null) changes.y = snap(changes.y, snapEnabledRef.current);
        map[id] = changes;
      });
      return prev.map((w) => map[w.id] ? { ...w, ...map[w.id] } : w);
    });
  }

  function deleteWidget(id) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedIds((prev) => prev.filter((s) => s !== id));
  }

  // ── Selection ─────────────────────────────────────────────────────────
  function handleWidgetSelect(id, e) {
    if (e.shiftKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = selectedIdsRef.current;
        if (!ids.length) return;
        setWidgets((prev) => prev.filter((w) => !ids.includes(w.id)));
        setSelectedIds([]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const ids = selectedIdsRef.current;
        if (!ids.length) return;
        setWidgets((prev) => {
          const dupes = prev
            .filter((w) => ids.includes(w.id))
            .map((w) => ({ ...w, id: Date.now() + Math.random(), x: w.x + 24, y: w.y + 24 }));
          return [...prev, ...dupes];
        });
      }
      if (e.key === "Escape") setSelectedIds([]);
      if (e.key === "h") setActiveTool("hand");
      if (e.key === "v" || e.key === "s") setActiveTool("select");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Ghost drag ────────────────────────────────────────────────────────
  function startGhost(type, e) {
    e.preventDefault();
    setDraggingType(type);
    draggingTypeRef.current = type;
    const cat   = WIDGET_CATALOGUE.find((c) => c.type === type);
    const ghost = document.createElement("div");
    ghost.style.cssText = `
      position:fixed; pointer-events:none; z-index:99999;
      width:130px; padding:10px 14px;
      background:${theme === "dark" ? "#1e1e1e" : "#fff"};
      border:1px solid ${theme === "dark" ? "#555" : "#ddd"};
      border-radius:10px;
      color:${theme === "dark" ? "#ccc" : "#333"};
      font-size:13px; font-family:'DM Sans',sans-serif;
      opacity:0.9; display:flex; align-items:center; gap:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      transform:translate(-50%,-50%);
      left:${e.clientX}px; top:${e.clientY}px;
    `;
    ghost.innerHTML = `<span style="font-size:18px">${cat?.icon ?? "□"}</span><span>${cat?.label ?? type}</span>`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;
  }

  function moveGhost(e) {
    if (!dragGhostRef.current) return;
    dragGhostRef.current.style.left = `${e.clientX}px`;
    dragGhostRef.current.style.top  = `${e.clientY}px`;
  }

  function dropGhost(e) {
    const type = draggingTypeRef.current;
    if (!type) return;
    const SIDEBAR_W = sidebarOpenRef.current ? 220 : 0;
    if (e.clientY > 48 && e.clientX > SIDEBAR_W) {
      addWidget(type, e.clientX, e.clientY);
    }
    if (dragGhostRef.current) {
      document.body.removeChild(dragGhostRef.current);
      dragGhostRef.current = null;
    }
    draggingTypeRef.current = null;
    setDraggingType(null);
  }

  // ── Global mouse listeners ────────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e) {
      moveGhost(e);
      if (isPanning.current) {
        const dx = e.clientX - panLast.current.x;
        const dy = e.clientY - panLast.current.y;
        panLast.current = { x: e.clientX, y: e.clientY };
        setOffset((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy };
          offsetRef.current = next;
          return next;
        });
      }
      if (isSelecting.current) {
        const sx = selStart.current.x;
        const sy = selStart.current.y;
        setSelectionBox({
          x: Math.min(e.clientX, sx),
          y: Math.min(e.clientY, sy),
          w: Math.abs(e.clientX - sx),
          h: Math.abs(e.clientY - sy),
        });
      }
    }

    function onMouseUp(e) {
      dropGhost(e);
      if (isSelecting.current) {
        const box = selectionBoxRef.current;
        if (box && (box.w > 8 || box.h > 8)) {
          const o  = offsetRef.current;
          const z  = zoomRef.current;
          const SB = sidebarOpenRef.current ? 220 : 0;
          const bx1 = (box.x - SB - o.x) / z;
          const by1 = (box.y - 48 - o.y) / z;
          const bx2 = bx1 + box.w / z;
          const by2 = by1 + box.h / z;
          const hit = widgetsRef.current
            .filter((w) => {
              const ww = parseFloat(w.width)  || 280;
              const wh = parseFloat(w.height) || 220;
              return w.x < bx2 && w.x + ww > bx1 && w.y < by2 && w.y + wh > by1;
            })
            .map((w) => w.id);
          setSelectedIds((prev) => e.shiftKey ? [...new Set([...prev, ...hit])] : hit);
        }
        setSelectionBox(null);
      }
      isPanning.current   = false;
      isSelecting.current = false;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ── Canvas mousedown ──────────────────────────────────────────────────
  function onCanvasMouseDown(e) {
    if (e.target.closest(".rnd-widget"))   return;
    if (e.target.closest("[data-no-pan]")) return;
    if (e.button !== 0)                    return;
    if (!e.shiftKey) setSelectedIds([]);
    if (activeToolRef.current === "hand") {
      panLast.current   = { x: e.clientX, y: e.clientY };
      isPanning.current = true;
    } else {
      selStart.current    = { x: e.clientX, y: e.clientY };
      isSelecting.current = true;
      setSelectionBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    }
  }

  // ── Zoom ──────────────────────────────────────────────────────────────
  function onWheel(e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const rect    = e.currentTarget.getBoundingClientRect();
    const cx      = e.clientX - rect.left;
    const cy      = e.clientY - rect.top;
    const o       = offsetRef.current;
    const z       = zoomRef.current;
    const newZoom = Math.min(Math.max(z - e.deltaY * 0.001, 0.2), 3);
    const wx = (cx - o.x) / z;
    const wy = (cy - o.y) / z;
    const newOff = { x: cx - wx * newZoom, y: cy - wy * newZoom };
    offsetRef.current = newOff;
    zoomRef.current   = newZoom;
    setOffset(newOff);
    setZoom(newZoom);
  }

  function zoomBy(delta) {
    const cx = window.innerWidth / 2;
    const cy = (window.innerHeight - 48) / 2;
    const o  = offsetRef.current;
    const z  = zoomRef.current;
    const nz = Math.min(Math.max(z + delta, 0.2), 3);
    const no = { x: cx - ((cx - o.x) / z) * nz, y: cy - ((cy - o.y) / z) * nz };
    offsetRef.current = no;
    zoomRef.current   = nz;
    setOffset(no);
    setZoom(nz);
  }

  function zoomReset() {
    offsetRef.current = { x: 0, y: 0 };
    zoomRef.current   = 1;
    setOffset({ x: 0, y: 0 });
    setZoom(1);
  }

  function handleBgUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const sharedProps = (w) => ({
    key: w.id, data: w, updateWidget, deleteWidget,
    isSelected: selectedIds.includes(w.id),
    onSelect: handleWidgetSelect,
    selectedIds, allWidgets: widgets, updateAllWidgets,
  });

  const canvasCursor = activeTool === "hand"
    ? (isPanning.current ? "grabbing" : "grab")
    : "default";

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      background: T.bg, overflow: "hidden",
      transition: "background 0.25s",
    }}>

      {/* ── Topbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: "48px",
        background: T.panel, borderBottom: `1px solid ${T.border}`,
        flexShrink: 0, position: "relative", zIndex: 200,
        transition: "background 0.25s, border-color 0.25s",
      }}>
        {/* Left: sidebar toggle + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            data-no-pan="true"
            style={{
              background: sidebarOpen ? T.hoverBg : "transparent",
              border: `1px solid ${sidebarOpen ? T.borderSub : "transparent"}`,
              color: sidebarOpen ? T.text : T.textDim,
              padding: "5px 9px", borderRadius: "6px",
              cursor: "pointer", fontSize: "14px", transition: "all 0.15s",
            }}
          >☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "22px", height: "22px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", borderRadius: "6px" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: T.text, letterSpacing: "-0.01em" }}>
              Workspace
            </span>
          </div>
        </div>

        {/* Right: save indicator + zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* ✅ Save status */}
          <span style={{ fontSize: "11px", color: saving ? "#8b5cf6" : T.textMuted, transition: "color 0.3s" }}>
            {saving ? "Saving…" : "Saved ✓"}
          </span>

          <ZoomBtn label="−" onClick={() => zoomBy(-0.15)} T={T} />
          <button
            onClick={zoomReset} data-no-pan="true"
            style={{
              background: "transparent", border: `1px solid ${T.borderSub}`,
              borderRadius: "6px", color: T.textDim, fontSize: "11px",
              padding: "4px 8px", cursor: "pointer", fontFamily: "inherit",
              minWidth: "46px", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; }}
          >{Math.round(zoom * 100)}%</button>
          <ZoomBtn label="+" onClick={() => zoomBy(0.15)} T={T} />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: sidebarOpen ? "220px" : "0px",
          flexShrink: 0, overflow: "hidden",
          background: T.sidebar, borderRight: sidebarOpen ? `1px solid ${T.border}` : "none",
          transition: "width 0.22s ease, background 0.25s",
          display: "flex", flexDirection: "column", zIndex: 100,
        }}>
          {/* Header */}
          <div style={{ padding: "14px 12px 10px", flexShrink: 0 }}>
            <p style={{ fontSize: "10px", color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Widgets
            </p>
          </div>

          {/* Tile grid */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "0 10px 12px",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "8px", alignContent: "start",
          }}>
            {WIDGET_CATALOGUE.map((cat) => (
              <SidebarTile
                key={cat.type}
                icon={cat.icon} label={cat.label} T={T}
                onMouseDown={(e) => startGhost(cat.type, e)}
              />
            ))}
          </div>

          {/* ✅ ADDED — Sidebar footer: user email + logout */}
          <div style={{
            padding: "12px",
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
            display: "flex", flexDirection: "column", gap: "8px",
          }}>
            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: "#fff", fontWeight: 700,
                flexShrink: 0,
              }}>
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, fontSize: "11px", color: T.text, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </p>
                <p style={{ margin: 0, fontSize: "10px", color: T.textMuted }}>
                  Free plan
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              style={{
                width: "100%", padding: "8px",
                background: "transparent",
                border: `1px solid ${T.border}`,
                borderRadius: "8px",
                color: T.textDim, fontSize: "12px",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "6px", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background   = "#f43f5e18";
                e.currentTarget.style.borderColor  = "#f43f5e44";
                e.currentTarget.style.color        = "#f43f5e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background   = "transparent";
                e.currentTarget.style.borderColor  = T.border;
                e.currentTarget.style.color        = T.textDim;
              }}
            >
              <span style={{ fontSize: "13px" }}>→</span>
              Log out
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          onMouseDown={onCanvasMouseDown}
          onWheel={onWheel}
          style={{
            flex: 1, position: "relative", overflow: "hidden",
            background: T.bg, cursor: canvasCursor,
            userSelect: "none", transition: "background 0.25s",
          }}
        >
          {/* BG image layer */}
          {bgImage && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover", backgroundPosition: "center",
              opacity: 0.15, pointerEvents: "none", zIndex: 0,
            }} />
          )}

          {/* Dot grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(circle, ${T.dot} 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${offset.x % (24 * zoom)}px ${offset.y % (24 * zoom)}px`,
            pointerEvents: "none", zIndex: 1,
          }} />

          {/* World layer */}
          <div style={{
            position: "absolute", top: 0, left: 0,
            transformOrigin: "0 0",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            overflow: "visible", zIndex: 2,
          }}>
            {widgets.map((w) => {
              const p = sharedProps(w);
              if (w.type === "notes")    return <NotesWidget    {...p} />;
              if (w.type === "todo")     return <TodoWidget     {...p} />;
              if (w.type === "clock")    return <ClockWidget    {...p} />;
              if (w.type === "pomodoro") return <PomodoroWidget {...p} />;
              if (w.type === "calendar") return <CalendarWidget {...p} />;
              if (w.type === "kanban")     return <KanbanWidget        {...p} />;
              if (w.type === "whiteboard") return <WhiteboardWidget    {...p} />;
              if (w.type === "pdf")        return <PdfWidget           {...p} />;
              if (w.type === "idea")       return <IdeaGeneratorWidget {...p} />;
              return null;
            })}
          </div>

          {/* Selection box */}
          {selectionBox && selectionBox.w > 4 && (
            <div style={{
              position: "absolute",
              left: selectionBox.x, top: selectionBox.y - 48,
              width: selectionBox.w, height: selectionBox.h,
              border: "1px dashed #8b5cf688",
              background: "rgba(139,92,246,0.05)",
              borderRadius: "4px", pointerEvents: "none", zIndex: 999,
            }} />
          )}

          {/* Selection badge */}
          {selectedIds.length > 1 && (
            <div style={{
              position: "absolute", bottom: "80px", left: "50%",
              transform: "translateX(-50%)",
              background: T.panel, border: `1px solid ${T.border}`,
              borderRadius: "8px", padding: "6px 16px",
              fontSize: "12px", color: T.textDim,
              display: "flex", alignItems: "center", gap: "8px",
              zIndex: 999, pointerEvents: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{selectedIds.length}</span>
              selected
              <span style={{ color: T.textMuted }}>·</span>
              <span style={{ color: T.textMuted, fontSize: "11px" }}>Del · Ctrl+D</span>
            </div>
          )}

          {/* Loading spinner */}
          {!loaded && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 50,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "12px", background: T.bg,
            }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                border: `3px solid ${T.borderSub}`, borderTopColor: "#8b5cf6",
                animation: "spin 0.7s linear infinite",
              }} />
              <p style={{ fontSize: "12px", color: T.textMuted, margin: 0 }}>Loading workspace…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Empty state */}
          {loaded && widgets.length === 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "8px", pointerEvents: "none", zIndex: 3,
            }}>
              <span style={{ fontSize: "28px", opacity: 0.1 }}>✦</span>
              <p style={{ fontSize: "11px", color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                {sidebarOpen ? "Drag a widget onto the canvas" : "Open the sidebar to add widgets"}
              </p>
            </div>
          )}

          {/* Floating toolbar */}
          <div data-no-pan="true" style={{
            position: "absolute", bottom: "20px", left: "50%",
            transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: "2px",
            background: T.toolbarBg, border: `1px solid ${T.border}`,
            borderRadius: "14px", padding: "6px 8px",
            zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            userSelect: "none", transition: "background 0.25s, border-color 0.25s",
          }}>
            <ToolBtn icon="🖐️" label="Hand (H)"  active={activeTool === "hand"}   onClick={() => setActiveTool("hand")}   T={T} />
            <ToolBtn icon="⬚"  label="Select (V)" active={activeTool === "select"} onClick={() => setActiveTool("select")} T={T} />
            <Divider T={T} />
            <ToolBtn
              icon={theme === "dark" ? "☀️" : "🌙"}
              label={theme === "dark" ? "Light mode" : "Dark mode"}
              active={false}
              onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
              T={T}
            />
            <ToolBtn icon="🧲" label={`Snap ${snapEnabled ? "ON" : "OFF"}`} active={snapEnabled} onClick={() => setSnapEnabled((v) => !v)} T={T} />
            <Divider T={T} />
            <ToolBtn icon="🖼️" label="Upload background" active={!!bgImage} onClick={() => bgInputRef.current?.click()} T={T} />
            {bgImage && (
              <ToolBtn icon="✕" label="Remove background" active={false} onClick={() => setBgImage(null)} T={T} />
            )}
            <input ref={bgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
          </div>

          {/* MiniMap — top right corner of canvas */}
          <MiniMap widgets={widgets} offset={offset} zoom={zoom} setOffset={(o) => { offsetRef.current = o; setOffset(o); }} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SidebarTile({ icon, label, T, onMouseDown }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "6px",
        padding: "14px 8px", borderRadius: "10px",
        background: hov ? T.hoverBg : "transparent",
        border: `1px solid ${hov ? T.borderSub : T.border}`,
        cursor: "grab", color: hov ? T.text : T.textDim,
        transition: "all 0.12s", userSelect: "none", minHeight: "72px",
      }}
    >
      <span style={{ fontSize: "22px", lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.02em" }}>{label}</span>
    </div>
  );
}

function ToolBtn({ icon, label, active, onClick, T }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} title={label} data-no-pan="true"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "36px", height: "36px", borderRadius: "8px", border: "none",
        background: active ? "#8b5cf622" : hov ? T.hoverBg : "transparent",
        color: active ? "#8b5cf6" : hov ? T.text : T.textDim,
        fontSize: "17px", cursor: "pointer", transition: "all 0.12s",
        outline: active ? "1.5px solid #8b5cf644" : "none", flexShrink: 0,
      }}
    >{icon}</button>
  );
}

function Divider({ T }) {
  return <div style={{ width: "1px", height: "22px", background: T.borderSub, margin: "0 2px", flexShrink: 0 }} />;
}

function ZoomBtn({ label, onClick, T }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} data-no-pan="true"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: "26px", height: "26px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: hov ? T.hoverBg : "transparent",
        border: `1px solid ${hov ? T.borderSub : T.border}`,
        borderRadius: "6px", color: hov ? T.text : T.textDim,
        fontSize: "15px", fontWeight: 600, cursor: "pointer",
        transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1,
      }}
    >{label}</button>
  );
}

export default App;