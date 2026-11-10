import { Navigate, Route, Routes } from 'react-router-dom';
import { isConfigured } from './lib/supabase.js';
import SetupNotice from './components/SetupNotice.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Calendar from './pages/Calendar.jsx';
import Items from './pages/Items.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import CheckInOut from './pages/CheckInOut.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Retirements from './pages/Retirements.jsx';
import AssetHistory from './pages/AssetHistory.jsx';
import Reports from './pages/Reports.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Backup from './pages/Backup.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  if (!isConfigured) return <SetupNotice />;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/checkouts" element={<CheckInOut />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/retirements" element={<Retirements />} />
        <Route path="/history" element={<AssetHistory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
