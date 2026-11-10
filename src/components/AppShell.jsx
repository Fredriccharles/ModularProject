import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';

function Splash({ children }) {
  return <div className="loading-page"><div className="spinner" aria-hidden="true" />{children}</div>;
}

export default function AppShell() {
  const { session, booting, isAdmin, adminError, user, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setNavOpen(false); window.scrollTo?.(0, 0); }, [location.pathname]);

  if (booting) return <Splash>Loading…</Splash>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isAdmin === null) return <Splash>Checking your account…</Splash>;

  if (!isAdmin) {
    return (
      <div className="center-page light">
        <div className="card card-pad notice-box">
          <h1 className="page-title mb">This account does not have access</h1>
          <p className="mb">
            <strong>{user?.email}</strong> is signed in, but it is not the administrator account for this system, so no
            asset information can be shown.
          </p>
          {adminError && <p className="mb muted">{adminError}</p>}
          <p className="muted mb">If this should be the administrator account, see the “Administrator account” section of the setup guide.</p>
          <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <div className={`scrim${navOpen ? ' open' : ''}`} onClick={() => setNavOpen(false)} />
      <div className="main">
        <div className="mobile-bar">
          <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <img src="/logo-mark.png" alt="" />
          <strong style={{ fontWeight: 600, fontSize: 14 }}>LACED Media Production</strong>
        </div>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}
