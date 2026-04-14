// InviteModal.jsx — src/components/InviteModal.jsx
// Drop this file in src/components/
// Usage: <InviteModal workspaceId={...} userId={...} onClose={...} T={T} />

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function InviteModal({ workspaceId, userId, onClose, T }) {
  const [inviteCode, setInviteCode] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [copied,     setCopied]     = useState(false);
  const [members,    setMembers]    = useState([]);

  useEffect(() => {
    loadOrCreateCode();
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate or load invite code ──────────────────────────────────────
  async function loadOrCreateCode() {
    setLoading(true);
    const { data } = await supabase
      .from("workspaces")
      .select("invite_code, workspace_name")
      .eq("id", workspaceId)
      .single();

    if (data?.invite_code) {
      setInviteCode(data.invite_code);
    } else {
      // Generate a new 8-char code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabase
        .from("workspaces")
        .update({ invite_code: code })
        .eq("id", workspaceId);
      setInviteCode(code);
    }
    setLoading(false);
  }

  async function regenerateCode() {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await supabase
      .from("workspaces")
      .update({ invite_code: code })
      .eq("id", workspaceId);
    setInviteCode(code);
    setLoading(false);
  }

  // ── Load current members ──────────────────────────────────────────────
  async function loadMembers() {
    const { data } = await supabase
      .from("workspace_members")
      .select("user_id, role, joined_at")
      .eq("workspace_id", workspaceId);
    setMembers(data || []);
  }

  async function removeMember(memberId) {
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", memberId);
    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  }

  // ── Copy link ─────────────────────────────────────────────────────────
  const inviteLink = inviteCode
    ? `${window.location.origin}?invite=${inviteCode}`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T?.panel ?? "#161616",
          border: `1px solid ${T?.border ?? "#242424"}`,
          borderRadius: "16px", padding: "28px",
          width: "440px", maxWidth: "90vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          color: T?.text ?? "#e0e0e0",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Share workspace</h2>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: T?.textDim ?? "#666" }}>
              Anyone with the link can join as editor
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none",
            color: T?.textDim ?? "#666", fontSize: "20px",
            cursor: "pointer", lineHeight: 1, padding: "4px",
          }}>✕</button>
        </div>

        {/* Invite link box */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "11px", color: T?.textMuted ?? "#444", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
            Invite link
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{
              flex: 1, padding: "10px 12px",
              background: T?.inputBg ?? "#1e1e1e",
              border: `1px solid ${T?.borderSub ?? "#2a2a2a"}`,
              borderRadius: "8px", fontSize: "12px",
              color: T?.textDim ?? "#666",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {loading ? "Generating…" : inviteLink}
            </div>
            <button
              onClick={copyLink}
              disabled={loading}
              style={{
                padding: "10px 16px", borderRadius: "8px", border: "none",
                background: copied ? "#10b981" : "#8b5cf6",
                color: "#fff", fontSize: "12px", fontWeight: 700,
                cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Invite code */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
            <span style={{ fontSize: "11px", color: T?.textMuted ?? "#444" }}>Code:</span>
            <code style={{
              fontSize: "14px", fontWeight: 700, letterSpacing: "0.15em",
              color: "#8b5cf6", background: "#8b5cf611",
              padding: "3px 10px", borderRadius: "6px",
            }}>
              {loading ? "…" : inviteCode}
            </code>
            <button
              onClick={regenerateCode}
              title="Generate new code (invalidates old one)"
              style={{
                background: "transparent", border: "none",
                color: T?.textMuted ?? "#444", fontSize: "12px",
                cursor: "pointer", padding: "2px 6px",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
              onMouseLeave={(e) => e.currentTarget.style.color = T?.textMuted ?? "#444"}
            >↺ Reset</button>
          </div>
        </div>

        {/* Members list */}
        {members.length > 0 && (
          <div>
            <label style={{ fontSize: "11px", color: T?.textMuted ?? "#444", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Members ({members.length})
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
              {members.map((m) => (
                <div key={m.user_id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "8px 10px",
                  background: T?.inputBg ?? "#1e1e1e",
                  borderRadius: "8px",
                }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", color: "#fff", fontWeight: 700, flexShrink: 0,
                  }}>
                    {m.user_id.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: T?.textDim ?? "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.user_id.substring(0, 8)}…
                    </div>
                    <div style={{ fontSize: "10px", color: T?.textMuted ?? "#444" }}>
                      {m.role} · joined {new Date(m.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(m.user_id)}
                    style={{
                      background: "transparent", border: "none",
                      color: T?.textMuted ?? "#444", fontSize: "12px",
                      cursor: "pointer", padding: "2px 6px", flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#f43f5e"}
                    onMouseLeave={(e) => e.currentTarget.style.color = T?.textMuted ?? "#444"}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        <p style={{ margin: "16px 0 0", fontSize: "11px", color: T?.textMuted ?? "#444", lineHeight: 1.5 }}>
          💡 Share the link or code with teammates. They'll join as editors instantly after signing in.
          Reset the code to revoke access for new joiners (existing members are unaffected).
        </p>
      </div>
    </div>
  );
}