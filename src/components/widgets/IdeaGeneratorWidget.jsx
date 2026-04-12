import { useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const IDEAS = {
  "💡 General": [
    "Build a habit tracker for micro-habits",
    "Create a reverse dictionary — describe a word, get the word",
    "Design a tool that turns meetings into action items automatically",
    "Make an app that gamifies daily chores",
    "Build a public mood board for cities",
    "Create a service that sends a 'life update' email to future you",
    "Design a minimal journaling app with no backspace",
    "Build a community board where ideas expire in 24h",
    "Make a tool that turns voice notes into structured notes",
    "Create a 'what would you do with $1M' idea simulator",
  ],
  "🚀 Startup": [
    "SaaS for freelancers to track client communication automatically",
    "AI that writes your LinkedIn posts from bullet points",
    "A co-working space matchmaking platform",
    "Micro-SaaS: auto-generate invoices from Slack messages",
    "B2B tool that turns Notion docs into client-facing portals",
    "Subscription box curation using AI personality matching",
    "API that converts any website into a mobile app shell",
    "Peer-to-peer skill exchange marketplace",
    "AI contract reviewer for small businesses",
    "One-click landing page from a pitch deck",
  ],
  "🎨 Creative": [
    "A poem generator that uses your mood as input",
    "Design a font that changes based on time of day",
    "Create a generative art piece that reacts to news headlines",
    "Write a story where the reader's name changes the plot",
    "Build a color palette generator from music",
    "Design a typography game to learn font pairing",
    "Create a collaborative fiction tool — one sentence each",
    "Build a 'what era would you live in' quiz generator",
    "Design an emotion-driven music playlist algorithm",
    "Visualize historical events as subway maps",
  ],
  "🛠 Tech": [
    "CLI tool that summarizes your git diff in plain English",
    "Browser extension that grades the readability of any page",
    "VSCode plugin that detects when you're overthinking a function",
    "Open-source tool to convert any API into a typed SDK",
    "A localhost dashboard for all your running dev servers",
    "Terminal-based Kanban board with Vim keybindings",
    "Dev tool that auto-generates seed data from your schema",
    "Lightweight analytics you self-host in 2 minutes",
    "CLI that turns TODO comments into GitHub issues",
    "A tool that compares two codebases and highlights drift",
  ],
  "🌱 Personal": [
    "Track one micro-win every day for 30 days",
    "Learn to draw by copying one master painting per week",
    "Write 200 words per day — never edit, never delete",
    "Build one tiny web thing every weekend for a year",
    "Read one chapter from a book you'd normally never pick",
    "Send a genuine compliment to someone unexpected today",
    "Cook one meal from a cuisine you've never tried this week",
    "Spend one hour with zero screens — no exceptions",
    "Write your own 'personal user manual' — how you work best",
    "Map out the 5 biggest decisions that shaped your life",
  ],
};

const CATEGORIES = Object.keys(IDEAS);

export default function IdeaGeneratorWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color = getColor(data.colorId);
  const [category,  setCategory]  = useState(CATEGORIES[0]);
  const [idea,      setIdea]      = useState("");
  const [saved,     setSaved]     = useState(data.savedIdeas || []);
  const [animating, setAnimating] = useState(false);

  function generate() {
    const pool = IDEAS[category];
    const next = pool[Math.floor(Math.random() * pool.length)];
    setAnimating(true);
    setTimeout(() => { setIdea(next); setAnimating(false); }, 150);
  }

  function saveIdea() {
    if (!idea || saved.includes(idea)) return;
    const next = [idea, ...saved].slice(0, 20);
    setSaved(next);
    updateWidget(data.id, { savedIdeas: next });
  }

  function removeIdea(i) {
    const next = saved.filter((_, idx) => idx !== i);
    setSaved(next);
    updateWidget(data.id, { savedIdeas: next });
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Ideas" minWidth={280} minHeight={280}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div onMouseDown={e => e.stopPropagation()} style={{
        flex: 1, display: "flex", flexDirection: "column",
        padding: "12px", gap: "10px", overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Category picker */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: "3px 8px", borderRadius: "20px",
              border: `1px solid ${category === cat ? color.accent : color.border}`,
              background: category === cat ? color.accent + "22" : "transparent",
              color: category === cat ? color.accent : "#666",
              fontSize: "10px", cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.12s",
            }}>{cat}</button>
          ))}
        </div>

        {/* Idea display */}
        <div style={{
          flex: "0 0 auto",
          minHeight: "80px",
          background: "#ffffff06",
          border: `1px solid ${color.border}`,
          borderRadius: "10px",
          padding: "14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "opacity 0.15s",
          opacity: animating ? 0 : 1,
        }}>
          {idea ? (
            <p style={{ fontSize: "13px", color: "#ddd", lineHeight: "1.5", textAlign: "center", margin: 0 }}>
              {idea}
            </p>
          ) : (
            <p style={{ fontSize: "12px", color: "#333", textAlign: "center", margin: 0 }}>
              Hit Generate for a random idea ✦
            </p>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button onClick={generate} style={{
            flex: 1, padding: "8px", background: color.accent, border: "none",
            borderRadius: "8px", color: "#fff", fontSize: "12px",
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >✦ Generate</button>
          {idea && (
            <button onClick={saveIdea} style={{
              padding: "8px 12px", background: "transparent",
              border: `1px solid ${color.border}`, borderRadius: "8px",
              color: "#777", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
            }}
              title="Save this idea"
              onMouseEnter={e => { e.currentTarget.style.borderColor = color.accent; e.currentTarget.style.color = color.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = color.border; e.currentTarget.style.color = "#777"; }}
            >★</button>
          )}
        </div>

        {/* Saved list */}
        {saved.length > 0 && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <p style={{ fontSize: "9px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
              Saved Ideas
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {saved.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "6px",
                  padding: "6px 8px", borderRadius: "7px",
                  background: "#ffffff05", border: `1px solid ${color.border}`,
                }}>
                  <span style={{ flex: 1, fontSize: "11px", color: "#888", lineHeight: "1.4" }}>{s}</span>
                  <button onClick={() => removeIdea(i)} style={{
                    background: "transparent", border: "none", color: "#333",
                    fontSize: "11px", cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0,
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f43f5e"}
                    onMouseLeave={e => e.currentTarget.style.color = "#333"}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}