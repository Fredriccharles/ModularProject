import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";
import AuthScreen from "./AuthScreen.jsx";
import App from "./App";
import "./index.css";

function Root() {
  // undefined = still checking, null = logged out, object = logged in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Get existing session on first load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still loading — blank screen (avoids flash)
  if (session === undefined) return null;

  // Not logged in — show auth screen
  if (!session) return <AuthScreen />;

  // Logged in — show the app
  return (
    <App
      user={session.user}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}

createRoot(document.getElementById("root")).render(<Root />);