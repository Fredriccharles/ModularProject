import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useFilters } from '../lib/useFilters.js';
import { listAssetChoices, listRetirements, retireItem } from '../lib/api.js';
import { fmtDateTime, fmtMoney } from '../lib/format.js';

const PAGE_SIZE = 15;
const EMPTY = { item_id: '', reason: '', disposal_method: '', disposal_value: '' };

export default function Retirements() {
  const f = useFilters();
  const q = f.get('q');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const list = useLoad(() => listRetirements({ q, page: f.page, pageSize: PAGE_SIZE }), [q, f.page], { data: [], total: 0 });
  const choices = useLoad(() => (open ? listAssetChoices(['available']) : Promise.resolve([])), [open], []);
  const set = (k) => ({ value: form[k], onChange: (e) => setForm((s) => ({ ...s, [k]: e.target.value })) });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await retireItem(form); setOpen(false); setNotice('Asset retired. Its record is kept for history.'); list.reload(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader
        title="Retirement"
        subtitle="Retired assets keep their full history. Nothing is ever deleted."
        actions={<button type="button" className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setOpen(true); }}>Retire an asset</button>}
      />
      <Alert message={list.error} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />

      <div className="card mb"><div className="toolbar"><div className="grow"><SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder="Search asset, reason, disposal…" /></div></div></div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Asset</th><th>Retired</th><th>Reason</th><th>Disposal</th><th className="right">Disposal value</th></tr></thead>
          <tbody>
            {list.loading && list.data.data.length === 0 ? <tr><td colSpan={5} className="table-empty">Loading…</td></tr>
              : list.data.data.length === 0 ? <tr><td colSpan={5} className="table-empty">No retired assets.</td></tr>
              : list.data.data.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/items/${r.item_id}`} className="cell-title">{r.item_name}</Link><div className="cell-sub mono">{r.asset_code}</div></td>
                  <td className="nowrap">{fmtDateTime(r.retired_date)}</td>
                  <td>{r.reason}</td>
                  <td>{r.disposal_method || '—'}</td>
                  <td className="right num">{fmtMoney(r.disposal_value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pageSize={PAGE_SIZE} total={list.data.total} onChange={(p) => f.set({ page: p })} />

      <Modal open={open} onClose={() => setOpen(false)} title="Retire an asset">
        <form onSubmit={submit}>
          <Alert message={error} />
          <div className="callout callout-bad">Retirement is permanent. The record stays in the system, but the asset can no longer be deployed, edited or repaired.</div>
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="rt-item">Asset *</label>
              <select id="rt-item" className="select" required {...set('item_id')}>
                <option value="">Choose an asset…</option>
                {choices.data.map((a) => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
              </select>
              <span className="hint">Assets that are checked out or under repair must be returned or have their ticket closed first.</span>
            </div>
            <div className="field"><label className="label" htmlFor="rt-reason">Reason *</label><textarea id="rt-reason" className="textarea" rows={2} required {...set('reason')} /></div>
            <div className="grid-2">
              <div className="field"><label className="label" htmlFor="rt-method">Disposal method</label><input id="rt-method" className="input" placeholder="Sold, donated, recycled…" {...set('disposal_method')} /></div>
              <div className="field"><label className="label" htmlFor="rt-value">Disposal value</label><input id="rt-value" className="input" type="number" step="0.01" min="0" {...set('disposal_value')} /></div>
            </div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn btn-danger" disabled={busy}>Retire asset</button></div>
        </form>
      </Modal>
    </>
  );
}
