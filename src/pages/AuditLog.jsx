import { useState } from 'react';
import { FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useFilters } from '../lib/useFilters.js';
import { AUDIT_ACTIONS, listAudit } from '../lib/api.js';
import { REPORTS, generateReport } from '../lib/reports.js';
import { actionLabel, fmtDateTime, recordLabel } from '../lib/format.js';

const PAGE_SIZE = 25;

function summarize(details) {
  if (!details || typeof details !== 'object') return '';
  const text = JSON.stringify(details);
  return text === '{}' ? '' : text;
}

export default function AuditLog() {
  const f = useFilters();
  const q = f.get('q'), action = f.get('action'), from = f.get('from'), to = f.get('to');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const list = useLoad(() => listAudit({ q, action, from, to, page: f.page, pageSize: PAGE_SIZE }), [q, action, from, to, f.page], { data: [], total: 0 });

  async function exportPdf() {
    setBusy(true); setError('');
    try { await generateReport(REPORTS.find((r) => r.key === 'audit'), {}, 'pdf'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="A permanent record of every administrator action. It cannot be edited or deleted."
        actions={<button type="button" className="btn btn-secondary" disabled={busy} onClick={exportPdf}><FileText size={16} aria-hidden="true" />{busy ? 'Preparing…' : 'Export PDF'}</button>}
      />
      <Alert message={error || list.error} onClose={() => setError('')} />

      <div className="card mb">
        <div className="toolbar">
          <div className="grow"><SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder="Search user, action, details…" /></div>
          <select className="select" aria-label="Action" value={action} onChange={(e) => f.set({ action: e.target.value })}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
          <label className="row" style={{ gap: 6 }}><span className="muted">From</span><input className="input" type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => f.set({ from: e.target.value })} /></label>
          <label className="row" style={{ gap: 6 }}><span className="muted">To</span><input className="input" type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => f.set({ to: e.target.value })} /></label>
          {f.any && <button type="button" className="link-btn" onClick={f.clear}>Clear filters</button>}
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>
            {list.loading && list.data.data.length === 0 ? <tr><td colSpan={5} className="table-empty">Loading…</td></tr>
              : list.data.data.length === 0 ? <tr><td colSpan={5} className="table-empty">No entries match.</td></tr>
              : list.data.data.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{fmtDateTime(a.created_at)}</td>
                  <td>{a.username}{a.ip_address && <div className="cell-sub">{a.ip_address}</div>}</td>
                  <td className="cell-title">{actionLabel(a.action)}</td>
                  <td>{a.entity_type ? recordLabel(a.entity_type, a.entity_id) : '—'}</td>
                  <td><div className="clip mono" title={summarize(a.details)}>{summarize(a.details) || '—'}</div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pageSize={PAGE_SIZE} total={list.data.total} onChange={(p) => f.set({ page: p })} />
    </>
  );
}
