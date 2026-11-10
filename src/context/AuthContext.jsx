import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { checkIsAdmin, ensureMonthlyBackup, logEvent } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null); // null = not checked yet
  const [adminError, setAdminError] = useState('');
  const backupChecked = useRef(false);

  // Keep the signed-in session in sync (also picks up sign-in/out in other tabs).
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Whenever the user changes, find out whether they are the administrator.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    setAdminError('');
    if (!userId) { setIsAdmin(null); backupChecked.current = false; return undefined; }
    let active = true;
    setIsAdmin(null);
    checkIsAdmin()
      .then((ok) => {
        if (!active) return;
        setIsAdmin(ok);
        // Once per visit: make sure this month has an automatic backup.
        if (ok && !backupChecked.current) {
          backupChecked.current = true;
          ensureMonthlyBackup().catch(() => {});
        }
      })
      .catch((e) => { if (active) { setAdminError(e.message); setIsAdmin(false); } });
    return () => { active = false; };
  }, [userId]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      throw new Error(/invalid login/i.test(error.message) ? 'Incorrect email or password.' : error.message);
    }
    logEvent('LOGIN').catch(() => {}); // recorded only if this account is the administrator
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, booting, isAdmin, adminError, signIn, signOut }),
    [session, booting, isAdmin, adminError, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
