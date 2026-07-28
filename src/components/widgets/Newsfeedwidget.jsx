// NewsFeedWidget.jsx
// Uses GNews.io — free tier: 100 req/day, no CORS issues, no server needed.
// Get a free API key at https://gnews.io (takes 30 seconds).
// Until you add a key, it falls back to showing setup instructions.

import { useEffect, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

// ── Configuration ─────────────────────────────────────────────────────────────
// Replace with your free GNews key from https://gnews.io
// Free tier: 100 requests/day, no credit card needed.
const GNEWS_KEY = "2c1111c28644efe17c6cd2087a7ecabd"; // ← paste your key here

const TOPICS = [
  { label: "Top",        value: "breaking-news" },
  { label: "World",      value: "world"         },
  { label: "Tech",       value: "technology"    },
  { label: "Science",    value: "science"       },
  { label: "Health",     value: "health"        },
  { label: "Business",   value: "business"      },
];

export default function NewsFeedWidget({
  data, updateWidget, deleteWidget,
  isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets,
}) {
  const color = getColor(data.colorId);

  const [topicIdx,  setTopicIdx]  = useState(data.topicIdx ?? 0);
  const [articles,  setArticles]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [apiKey,    setApiKey]    = useState(data.gnewsKey || GNEWS_KEY);
  const [keyInput,  setKeyInput]  = useState(data.gnewsKey || GNEWS_KEY);
  const [showSetup, setShowSetup] = useState(!data.gnewsKey && !GNEWS_KEY);

  // Auto-fetch when topic changes or key becomes available
  useEffect(() => {
    if (apiKey) fetchNews(topicIdx, apiKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicIdx, apiKey]);

  async function fetchNews(idx, key) {
    setLoading(true);
    setError("");
    setArticles([]);
    const topic = TOPICS[idx].value;
    try {
      const resp = await fetch(
        `https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=en&max=20&apikey=${key}`
      );
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.errors?.[0] || `HTTP ${resp.status}`);
      }
      const json = await resp.json();
      if (!json.articles?.length) throw new Error("No articles returned.");
      setArticles(json.articles);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function saveKey(e) {
    e?.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    setApiKey(k);
    updateWidget(data.id, { gnewsKey: k });
    setShowSetup(false);
  }

  function switchTopic(idx) {
    setTopicIdx(idx);
    updateWidget(data.id, { topicIdx: idx });
  }

  function timeSince(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (h > 23) return `${Math.floor(h / 24)}d ago`;
    if (h > 0)  return `${h}h ago`;
    return `${Math.max(1, m)}m ago`;
  }

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="News" minWidth={280} minHeight={320}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Setup screen — shown when no API key ── */}
        {showSetup ? (
          <div onMouseDown={(e) => e.stopPropagation()} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "20px", gap: "12px", textAlign: "center",
          }}>
            <span style={{ fontSize: "28px" }}>📰</span>
            <p style={{ fontSize: "13px", color: "#ccc", margin: 0, fontWeight: 600 }}>
              Free API key needed
            </p>
            <p style={{ fontSize: "11px", color: "#555", margin: 0, lineHeight: 1.5 }}>
              Get a free key at{" "}
              <a href="https://gnews.io" target="_blank" rel="noopener noreferrer"
                style={{ color: color.accent }}>gnews.io</a>
              {" "}(30 sec, no card).
            </p>
            <form onSubmit={saveKey} style={{ display: "flex", gap: "6px", width: "100%" }}>
              <input
                autoFocus
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste API key…"
                style={{
                  flex: 1, background: "#1a1a1a",
                  border: `1px solid ${color.border}`, borderRadius: "8px",
                  padding: "7px 10px", color: "#ddd", fontSize: "11px",
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "99"}
                onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
              />
              <button type="submit" style={{
                background: color.accent, border: "none", borderRadius: "8px",
                color: "#fff", padding: "7px 12px", fontSize: "11px",
                fontWeight: 700, cursor: "pointer", flexShrink: 0,
              }}>Save</button>
            </form>
          </div>
        ) : (
          <>
            {/* ── Topic tabs ── */}
            <div onMouseDown={(e) => e.stopPropagation()} style={{
              display: "flex", gap: "4px", padding: "8px 10px",
              borderBottom: `1px solid ${color.border}`, flexShrink: 0,
              overflowX: "auto", background: "#ffffff04",
            }}>
              {TOPICS.map((t, i) => (
                <button key={i} onClick={() => switchTopic(i)} style={{
                  padding: "3px 9px", borderRadius: "20px", flexShrink: 0,
                  border: `1px solid ${topicIdx === i ? color.accent : color.border}`,
                  background: topicIdx === i ? color.accent + "22" : "transparent",
                  color: topicIdx === i ? color.accent : "#666",
                  fontSize: "10px", cursor: "pointer", fontFamily: "inherit",
                  fontWeight: topicIdx === i ? 700 : 400, transition: "all 0.12s",
                }}>{t.label}</button>
              ))}
              <button onClick={() => setShowSetup(true)} title="Change API key" style={{
                marginLeft: "auto", padding: "3px 6px", flexShrink: 0,
                border: "none", background: "transparent",
                color: "#333", fontSize: "11px", cursor: "pointer",
              }}>⚙</button>
            </div>

            {/* ── Article list ── */}
            <div onMouseDown={(e) => e.stopPropagation()} style={{ flex: 1, overflowY: "auto" }}>
              {loading && (
                <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: "#444" }}>
                  Loading…
                </div>
              )}
              {error && (
                <div style={{ padding: "14px", fontSize: "11px", color: "#f43f5e", background: "#f43f5e0a", margin: "8px", borderRadius: "8px" }}>
                  ⚠ {error}
                </div>
              )}
              {articles.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{ padding: "10px 12px", borderBottom: `1px solid ${color.border}`, cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#ffffff06"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Headline */}
                    <p style={{
                      margin: "0 0 5px", fontSize: "12px", color: "#ccc",
                      lineHeight: "1.45", fontWeight: 500,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{a.title}</p>
                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        fontSize: "10px", color: color.accent, fontWeight: 600,
                        background: color.accent + "18", borderRadius: "4px", padding: "1px 5px",
                        maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{a.source?.name || "Source"}</span>
                      <span style={{ fontSize: "10px", color: "#3a3a3a" }}>{timeSince(a.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}