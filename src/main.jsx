import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";
import AuthScreen from "./AuthScreen.jsx";
import App from "./App";
import "./index.css";

function Root() {
  const [session,     setSession]     = useState(undefined);
  const [inviteCode,  setInviteCode]  = useState(null);
  const [joinStatus,  setJoinStatus]  = useState(null); // null | "joining" | "joined" | "error"
  const [joinMessage, setJoinMessage] = useState("");

  // Check URL for ?invite=CODE on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("invite");
    if (code) {
      setInviteCode(code.toUpperCase());
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // Auto-join when logged in and invite code present
  useEffect(() => {
    if (!session || !inviteCode) return;
    joinWorkspace(inviteCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, inviteCode]);

  async function joinWorkspace(code) {
    setJoinStatus("joining");
    const { data, error } = await supabase.rpc("join_workspace_by_invite", { p_invite_code: code });
    if (error || data?.error) {
      setJoinStatus("error");
      setJoinMessage(data?.error || error?.message || "Could not join.");
    } else {
      setJoinStatus("joined");
      setJoinMessage(`Joined "${data.workspace_name ?? "workspace"}"!`);
    }
    setInviteCode(null);
    setTimeout(() => setJoinStatus(null), 3500);
  }

  if (session === undefined) return null;

  if (!session) return (
    <>
      <AuthScreen />
      {inviteCode && (
        <div style={toastStyle("#8b5cf6")}>
          🔗 Log in or sign up to join the shared workspace
        </div>
      )}
    </>
  );

  return (
    <>
      <App user={session.user} onLogout={() => supabase.auth.signOut()} />
      {joinStatus === "joining" && <div style={toastStyle("#8b5cf6")}>⏳ Joining workspace…</div>}
      {joinStatus === "joined"  && <div style={toastStyle("#10b981")}>✅ {joinMessage}</div>}
      {joinStatus === "error"   && <div style={toastStyle("#f43f5e")}>❌ {joinMessage}</div>}
    </>
  );
}

function toastStyle(color) {
  return {
    position: "fixed", bottom: "24px", left: "50%",
    transform: "translateX(-50%)",
    background: color + "18", border: `1px solid ${color}`,
    borderRadius: "10px", padding: "12px 20px",
    fontSize: "13px", color: "#e0e0e0", zIndex: 9999,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    fontFamily: "'DM Sans', sans-serif",
  };
}

createRoot(document.getElementById("root")).render(<Root />);