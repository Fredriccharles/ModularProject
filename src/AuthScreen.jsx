import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [isLogin,  setIsLogin]  = useState(true);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false); // signup confirm state

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setDone(true);
    }

    setLoading(false);
  }

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Subtle dot grid background */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "radial-gradient(circle, #1e1e1e 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        background: "#141414",
        border: "1px solid #242424",
        borderRadius: "20px",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{
            width: "30px", height: "30px",
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            borderRadius: "8px",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#e0e0e0", letterSpacing: "-0.02em" }}>
            Workspace
          </span>
        </div>

        {done ? (
          /* ── Sign-up confirmation ── */
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📬</div>
            <h2 style={{ color: "#e0e0e0", fontSize: "16px", fontWeight: 600, margin: "0 0 8px" }}>
              Check your email
            </h2>
            <p style={{ color: "#555", fontSize: "13px", lineHeight: "1.6", margin: 0 }}>
              We sent a confirmation link to<br />
              <span style={{ color: "#8b5cf6" }}>{email}</span>.<br />
              Click it to activate your account.
            </p>
            <button
              onClick={() => { setDone(false); setIsLogin(true); }}
              style={{ ...btnStyle, marginTop: "24px" }}
            >
              Back to login
            </button>
          </div>
        ) : (
          /* ── Login / Sign-up form ── */
          <>
            <h2 style={{ color: "#e0e0e0", fontSize: "18px", fontWeight: 600, margin: "0 0 4px" }}>
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p style={{ color: "#555", fontSize: "13px", margin: "0 0 24px" }}>
              {isLogin
                ? "Log in to open your workspace"
                : "Sign up and save your workspace to the cloud"}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = "#8b5cf688"}
                onBlur={(e)  => e.currentTarget.style.borderColor = "#2a2a2a"}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = "#8b5cf688"}
                onBlur={(e)  => e.currentTarget.style.borderColor = "#2a2a2a"}
              />

              {error && (
                <p style={{
                  color: "#f43f5e", fontSize: "12px",
                  margin: "0", padding: "8px 10px",
                  background: "#f43f5e11", borderRadius: "6px",
                  border: "1px solid #f43f5e33",
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ ...btnStyle, marginTop: "6px", opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? "Please wait..."
                  : isLogin ? "Log in" : "Sign up"}
              </button>
            </form>

            {/* Toggle login/signup */}
            <p style={{ color: "#444", fontSize: "12px", textAlign: "center", marginTop: "20px", marginBottom: 0 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span
                onClick={() => { setIsLogin((v) => !v); setError(""); }}
                style={{ color: "#8b5cf6", cursor: "pointer", fontWeight: 500 }}
              >
                {isLogin ? "Sign up" : "Log in"}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "#e0e0e0",
  fontSize: "13px",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const btnStyle = {
  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  border: "none",
  borderRadius: "8px",
  color: "#fff",
  padding: "11px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  transition: "opacity 0.15s",
};