import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Repeat, Wrench, Archive, FolderTree, FileText, History,
  DatabaseBackup, Settings, LogOut, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/items', label: 'Assets', icon: Package },
  { to: '/checkouts', label: 'Check in / out', icon: Repeat },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/retirements', label: 'Retirement', icon: Archive },
  { to: '/history', label: 'Asset history', icon: FolderTree },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/audit', label: 'Audit log', icon: History },
  { to: '/backup', label: 'Backup & restore', icon: DatabaseBackup },
];

export default function Sidebar({ open, onNavigate }) {
  const { user, signOut } = useAuth();
  const cls = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <img src="/logo-mark.png" alt="" />
        <div>
          <div className="brand-name">LACED Media Production</div>
          <div className="brand-sub">Asset management</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={cls} onClick={onNavigate}>
            <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="account">
        <div className="account-email" title={user?.email}>{user?.email}</div>
        <div className="account-role">Administrator</div>
        <NavLink to="/settings" className={cls} onClick={onNavigate}>
          <Settings size={16} strokeWidth={1.75} aria-hidden="true" /> Settings
        </NavLink>
        <button type="button" className="nav-link" style={{ width: '100%', background: 'none', border: 0, cursor: 'pointer' }} onClick={signOut}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}
