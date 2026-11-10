import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useFilters } from '../lib/useFilters.js';
import { createTicket, listAssetChoices, listTickets, updateTicket } from '../lib/api.js';
import { fmtDateTime, fmtMoney, titleCase } from '../lib/format.js';

const PAGE_SIZE = 15;
const NEW = { item_id: '', issue_description: '', priority: 'medium', reported_by: '', assigned_to: '' };

export default function Maintenance() {
  const f = useFilters();
  const q = f.get('q'), status = f.get('status'), priority = f.get('priority');
  const [modal, setModal] = useState(null); // 'new' | { edit: ticket }
  const [form, setForm] = useState(NEW);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const list = useLoad(() => listTickets({ q, status, priority, page: f.page, pageSize: PAGE_SIZE }), [q, status, priority, f.page], { data: [], total: 0 });
  const choices = useLoad(() => (modal === 'new' ? listAssetChoices(['available', 'under_repair']) : Promise.resolve([])), [modal], []);
  const set = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });

  async function run(fn, success) {
    setBusy(true); setError('');
    try { await fn(); setModal(null); setNotice(success); list.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const closing = modal?.edit && (form.status === 'completed' || form.status === 'cancelled');

  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="An asset with an open ticket is under repair and cannot be checked out"
        actions={<button type="button" className="btn btn-primary" onClick={() => { setForm(NEW); setError(''); setModal('new'); }}>New ticket</button>}
      />
      <Alert message={list.error} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />

      <div className="card mb">
        <div className="toolbar">
          <div className="grow"><SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder="Search asset, issue, assignee…" /></div>
          <select className="select" aria-label="Status" value={status} onChange={(e) => f.set({ status: e.target.value })}>
            <option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option>
            <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
          <select className="select" aria-label="Priority" value={priority} onChange={(e) => f.set({ priority: e.target.value })}>
            <option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option>
            <option value="medium">Medium</option><option value="low">Low</option>
          </select>
          {f.any && <button type="button" className="link-btn" onClick={f.clear}>Clear filters</button>}
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Assigned to</th><th>Reported</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.loading && list.data.data.length === 0 ? <tr><td colSpan={7} className="table-empty">Loading…</td></tr>
              : list.data.data.length === 0 ? <tr><td colSpan={7} className="table-empty">No tickets found.</td></tr>
              : list.data.data.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/items/${t.item_id}`} className="cell-title">{t.item_name}</Link><div className="cell-sub mono">{t.asset_code}</div></td>
                  <td><div className="clip" title={t.issue_description}>{t.issue_description}</div>{t.resolution_notes && <div className="cell-sub">Resolved: {t.resolution_notes}{t.cost != null ? ` (${fmtMoney(t.cost)})` : ''}</div>}</td>
                  <td>{titleCase(t.priority)}</td>
                  <td>{t.assigned_to || '—'}</td>
                  <td className="nowrap">{fmtDateTime(t.reported_date)}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="actions">{!['completed', 'cancelled'].includes(t.status) && (
                    <button type="button" className="link-btn" onClick={() => { setForm({ status: t.status, priority: t.priority, assigned_to: t.assigned_to || '', resolution_notes: t.resolution_notes || '', cost: t.cost ?? '' }); setError(''); setModal({ edit: t }); }}>Update</button>
                  )}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pageSize={PAGE_SIZE} total={list.data.total} onChange={(p) => f.set({ page: p })} />

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="New maintenance ticket">
        <form onSubmit={(e) => { e.preventDefault(); run(() => createTicket(form), 'Ticket opened. The asset is now under repair.'); }}>
          <Alert message={error} />
          <div className="callout callout-info">Opening a ticket marks the asset <strong>under repair</strong> so it cannot be deployed.</div>
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="tk-item">Asset *</label>
              <select id="tk-item" className="select" required {...set('item_id')}>
                <option value="">Choose an asset…</option>
                {choices.data.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}{a.status === 'under_repair' ? ' (already under repair)' : ''}</option>)}
              </select>
              <span className="hint">Checked-out assets must be checked in first. Retired assets are not listed.</span>
            </div>
            <div className="field"><label className="label" htmlFor="tk-desc">Issue *</label><textarea id="tk-desc" className="textarea" rows={3} required {...set('issue_description')} /></div>
            <div className="grid-2">
              <div className="field"><label className="label" htmlFor="tk-prio">Priority</label>
                <select id="tk-prio" className="select" {...set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div className="field"><label className="label" htmlFor="tk-assign">Assigned to</label><input id="tk-assign" className="input" {...set('assigned_to')} /></div>
            </div>
            <div className="field"><label className="label" htmlFor="tk-by">Reported by</label><input id="tk-by" className="input" {...set('reported_by')} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Open ticket</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(modal?.edit)} onClose={() => setModal(null)} title={`Update ticket — ${modal?.edit?.item_name || ''}`}>
        <form onSubmit={(e) => { e.preventDefault(); run(() => updateTicket(modal.edit.id, form), closing ? 'Ticket closed.' : 'Ticket updated.'); }}>
          <Alert message={error} />
          <div className="stack">
            <div className="field"><label className="label" htmlFor="up-status">Status</label>
              <select id="up-status" className="select" {...set('status')}><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
            {closing && <div className="callout callout-ok">Closing this ticket makes the asset <strong>available</strong> again (unless another ticket is still open).</div>}
            <div className="grid-2">
              <div className="field"><label className="label" htmlFor="up-prio">Priority</label>
                <select id="up-prio" className="select" {...set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div className="field"><label className="label" htmlFor="up-assign">Assigned to</label><input id="up-assign" className="input" {...set('assigned_to')} /></div>
            </div>
            <div className="field"><label className="label" htmlFor="up-res">Resolution notes</label><textarea id="up-res" className="textarea" rows={2} {...set('resolution_notes')} /></div>
            <div className="field"><label className="label" htmlFor="up-cost">Cost</label><input id="up-cost" className="input" type="number" step="0.01" min="0" {...set('cost')} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Save</button></div>
        </form>
      </Modal>
    </>
  );
}
