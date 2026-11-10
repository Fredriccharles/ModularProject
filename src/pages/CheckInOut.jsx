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
import { checkIn, checkOut, listAssetChoices, listCheckouts } from '../lib/api.js';
import { fmtDate, fmtDateTime } from '../lib/format.js';

const PAGE_SIZE = 15;
const EMPTY = { item_id: '', checked_out_to: '', department: '', expected_return_date: '', checkout_condition_note: '' };
const today = () => new Date().toISOString().slice(0, 10);

export default function CheckInOut() {
  const f = useFilters();
  const q = f.get('q'), status = f.get('status');
  const [modal, setModal] = useState(null); // 'out' | { checkin: row }
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const list = useLoad(() => listCheckouts({ q, status, page: f.page, pageSize: PAGE_SIZE }), [q, status, f.page], { data: [], total: 0 });
  const choices = useLoad(() => (modal === 'out' ? listAssetChoices(['available']) : Promise.resolve([])), [modal], []);
  const set = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });

  async function run(fn, success) {
    setBusy(true); setError('');
    try { await fn(); setModal(null); setNotice(success); list.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Check in / out"
        subtitle="Who currently holds each asset"
        actions={<button type="button" className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setModal('out'); }}>New check-out</button>}
      />
      <Alert message={list.error} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />

      <div className="card mb">
        <div className="toolbar">
          <div className="grow"><SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder="Search person, asset, department…" /></div>
          <select className="select" aria-label="Status" value={status} onChange={(e) => f.set({ status: e.target.value })}>
            <option value="">All</option><option value="active">Currently out</option><option value="returned">Returned</option>
          </select>
          {f.any && <button type="button" className="link-btn" onClick={f.clear}>Clear filters</button>}
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Asset</th><th>Held by</th><th>Checked out</th><th>Due back</th><th>Returned</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.loading && list.data.data.length === 0 ? <tr><td colSpan={7} className="table-empty">Loading…</td></tr>
              : list.data.data.length === 0 ? <tr><td colSpan={7} className="table-empty">No check-outs found.</td></tr>
              : list.data.data.map((c) => {
                const overdue = c.status === 'active' && c.expected_return_date && c.expected_return_date < today();
                return (
                  <tr key={c.id}>
                    <td><Link to={`/items/${c.item_id}`} className="cell-title">{c.item_name}</Link><div className="cell-sub mono">{c.asset_code}</div></td>
                    <td>{c.checked_out_to}{c.department && <div className="cell-sub">{c.department}</div>}</td>
                    <td className="nowrap">{fmtDateTime(c.checkout_date)}</td>
                    <td className={`nowrap${overdue ? ' is-overdue' : ''}`}>{c.expected_return_date ? fmtDate(c.expected_return_date) : '—'}{overdue ? ' (overdue)' : ''}</td>
                    <td className="nowrap">{c.return_date ? fmtDateTime(c.return_date) : '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="actions">{c.status === 'active' && <button type="button" className="link-btn" onClick={() => { setForm({ return_condition_note: '' }); setError(''); setModal({ checkin: c }); }}>Check in</button>}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pageSize={PAGE_SIZE} total={list.data.total} onChange={(p) => f.set({ page: p })} />

      <Modal open={modal === 'out'} onClose={() => setModal(null)} title="New check-out">
        <form onSubmit={(e) => { e.preventDefault(); run(() => checkOut(form), 'Asset checked out.'); }}>
          <Alert message={error} />
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="co-item">Asset *</label>
              <select id="co-item" className="select" required {...set('item_id')}>
                <option value="">Choose an available asset…</option>
                {choices.data.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
              </select>
              <span className="hint">Only available assets are listed. Anything under repair is blocked.</span>
            </div>
            <div className="field"><label className="label" htmlFor="co-to">Checked out to *</label><input id="co-to" className="input" required {...set('checked_out_to')} /></div>
            <div className="grid-2">
              <div className="field"><label className="label" htmlFor="co-dept">Department</label><input id="co-dept" className="input" {...set('department')} /></div>
              <div className="field"><label className="label" htmlFor="co-due">Expected return</label><input id="co-due" className="input" type="date" {...set('expected_return_date')} /></div>
            </div>
            <div className="field"><label className="label" htmlFor="co-cond">Condition at check-out</label><textarea id="co-cond" className="textarea" rows={2} {...set('checkout_condition_note')} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Check out</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(modal?.checkin)} onClose={() => setModal(null)} title="Check in asset">
        <form onSubmit={(e) => { e.preventDefault(); run(() => checkIn(modal.checkin.id, form), 'Asset checked in.'); }}>
          <Alert message={error} />
          <p className="mb"><strong>{modal?.checkin?.item_name}</strong> returned by <strong>{modal?.checkin?.checked_out_to}</strong>.</p>
          <div className="field"><label className="label" htmlFor="ci-cond">Condition on return</label><textarea id="ci-cond" className="textarea" rows={2} {...set('return_condition_note')} /></div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Check in</button></div>
        </form>
      </Modal>
    </>
  );
}
