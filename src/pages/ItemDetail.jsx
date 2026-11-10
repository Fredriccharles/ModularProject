import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ItemForm from '../components/ItemForm.jsx';
import { useLoad } from '../lib/useLoad.js';
import { checkIn, checkOut, createTicket, getItem, retireItem } from '../lib/api.js';
import { fmtDate, fmtDateTime, fmtMoney, titleCase } from '../lib/format.js';

const Row = ({ label, children }) => (<><dt>{label}</dt><dd>{children || '—'}</dd></>);
const today = () => new Date().toISOString().slice(0, 10);

export default function ItemDetail() {
  const { id } = useParams();
  const { data: item, error, reload } = useLoad(() => getItem(id), [id]);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [modal, setModal] = useState(null); // 'edit' | 'checkout' | 'ticket' | 'retire' | { checkin: checkout }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const open = (kind, initial = {}) => { setForm(initial); setActionError(''); setModal(kind); };
  const set = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  async function run(fn, success) {
    setBusy(true); setActionError('');
    try { await fn(); setModal(null); setNotice(success); reload(); }
    catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  }

  if (!item) {
    return (
      <>
        <PageHeader title="Asset" />
        <Alert message={error} />
        {!error && <div className="loading-inline">Loading…</div>}
        <Link to="/items">← Back to assets</Link>
      </>
    );
  }

  const canCheckout = item.status === 'available';
  const canReport = item.status === 'available' || item.status === 'under_repair';
  const canRetire = item.status === 'available';

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={<span className="mono">{item.asset_code}</span>}
        actions={(
          <>
            <Link to="/items" className="btn btn-secondary">← Assets</Link>
            <Link to={`/history?item=${item.id}`} className="btn btn-secondary">View history</Link>
            {item.status !== 'retired' && <button type="button" className="btn btn-secondary" onClick={() => open('edit')}>Edit</button>}
            {canCheckout && <button type="button" className="btn btn-primary" onClick={() => open('checkout', { checked_out_to: '', department: '', expected_return_date: '', checkout_condition_note: '' })}>Check out</button>}
            {canReport && <button type="button" className="btn btn-secondary" onClick={() => open('ticket', { issue_description: '', priority: 'medium', reported_by: '' })}>Report issue</button>}
            {canRetire && <button type="button" className="btn btn-danger" onClick={() => open('retire', { reason: '', disposal_method: '', disposal_value: '' })}>Retire</button>}
          </>
        )}
      />
      <Alert message={actionError && !modal ? actionError : ''} onClose={() => setActionError('')} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />
      {item.status === 'under_repair' && (
        <div className="callout callout-bad">This asset is under repair, so it cannot be checked out until its maintenance ticket is closed. <Link to="/maintenance?status=open">Open tickets</Link></div>
      )}

      <div className="split">
        <section className="card card-pad">
          <div className="row-between mb"><h2 className="card-title" style={{ margin: 0 }}>Details</h2><StatusBadge status={item.status} /></div>
          <dl className="kv">
            <Row label="Category">{item.category_name}</Row>
            <Row label="Subcategory">{item.subcategory_name}</Row>
            <Row label="Manufacturer">{item.manufacturer}</Row>
            <Row label="Model">{item.model}</Row>
            <Row label="Serial number">{item.serial_number}</Row>
            <Row label="Location">{item.location}</Row>
            <Row label="Supplier">{item.supplier}</Row>
            <Row label="Purchase date">{item.purchase_date ? fmtDate(item.purchase_date) : ''}</Row>
            <Row label="Purchase cost">{item.purchase_cost != null ? fmtMoney(item.purchase_cost) : ''}</Row>
            <Row label="Description">{item.description}</Row>
            <Row label="Condition">{item.condition_note}</Row>
          </dl>
          {item.retirement && (
            <>
              <h3 className="card-title" style={{ marginTop: 20 }}>Retirement record</h3>
              <dl className="kv">
                <Row label="Retired">{fmtDateTime(item.retirement.retired_date)}</Row>
                <Row label="Reason">{item.retirement.reason}</Row>
                <Row label="Disposal">{item.retirement.disposal_method}</Row>
                <Row label="Disposal value">{item.retirement.disposal_value != null ? fmtMoney(item.retirement.disposal_value) : ''}</Row>
              </dl>
            </>
          )}
        </section>

        <div className="stack">
          <section className="card card-pad">
            <h2 className="card-title">Check-out history</h2>
            {item.checkouts.length === 0 ? <p className="muted">Never checked out.</p> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Held by</th><th>Out</th><th>Back</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {item.checkouts.map((c) => {
                      const overdue = c.status === 'active' && c.expected_return_date && c.expected_return_date < today();
                      return (
                        <tr key={c.id}>
                          <td>{c.checked_out_to}{c.department && <div className="cell-sub">{c.department}</div>}</td>
                          <td className="nowrap">{fmtDateTime(c.checkout_date)}</td>
                          <td className={`nowrap${overdue ? ' is-overdue' : ''}`}>
                            {c.return_date ? fmtDateTime(c.return_date) : (c.expected_return_date ? `due ${fmtDate(c.expected_return_date)}${overdue ? ' (overdue)' : ''}` : '—')}
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td className="actions">{c.status === 'active' && <button type="button" className="link-btn" onClick={() => open({ checkin: c }, { return_condition_note: '' })}>Check in</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card card-pad">
            <h2 className="card-title">Maintenance history</h2>
            {item.tickets.length === 0 ? <p className="muted">No maintenance tickets.</p> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Issue</th><th>Priority</th><th>Reported</th><th>Status</th></tr></thead>
                  <tbody>
                    {item.tickets.map((t) => (
                      <tr key={t.id}>
                        <td>{t.issue_description}{t.resolution_notes && <div className="cell-sub">Resolution: {t.resolution_notes}</div>}</td>
                        <td>{titleCase(t.priority)}</td>
                        <td className="nowrap">{fmtDateTime(t.reported_date)}</td>
                        <td><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: 12 }}><Link to="/maintenance">Manage tickets →</Link></p>
          </section>
        </div>
      </div>

      <ItemForm open={modal === 'edit'} item={item} onClose={() => setModal(null)}
        onSaved={(m) => { setModal(null); setNotice(m); reload(); }} />

      <Modal open={modal === 'checkout'} onClose={() => setModal(null)} title="Check out asset">
        <form onSubmit={(e) => { e.preventDefault(); run(() => checkOut({ item_id: item.id, ...form }), 'Asset checked out.'); }}>
          <Alert message={actionError} />
          <div className="stack">
            <div className="field"><label className="label" htmlFor="c-to">Checked out to *</label><input id="c-to" className="input" required {...set('checked_out_to')} /></div>
            <div className="field"><label className="label" htmlFor="c-dept">Department</label><input id="c-dept" className="input" {...set('department')} /></div>
            <div className="field"><label className="label" htmlFor="c-due">Expected return date</label><input id="c-due" className="input" type="date" {...set('expected_return_date')} /></div>
            <div className="field"><label className="label" htmlFor="c-cond">Condition at check-out</label><textarea id="c-cond" className="textarea" rows={2} {...set('checkout_condition_note')} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Check out</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(modal?.checkin)} onClose={() => setModal(null)} title="Check in asset">
        <form onSubmit={(e) => { e.preventDefault(); run(() => checkIn(modal.checkin.id, form), 'Asset checked in.'); }}>
          <Alert message={actionError} />
          <p className="mb">Returned by <strong>{modal?.checkin?.checked_out_to}</strong>.</p>
          <div className="field"><label className="label" htmlFor="ci-cond">Condition on return</label><textarea id="ci-cond" className="textarea" rows={2} {...set('return_condition_note')} /></div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Check in</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'ticket'} onClose={() => setModal(null)} title="Report an issue">
        <form onSubmit={(e) => { e.preventDefault(); run(() => createTicket({ item_id: item.id, ...form }), 'Maintenance ticket opened. The asset is now under repair.'); }}>
          <Alert message={actionError} />
          <div className="callout callout-info">Opening a ticket marks this asset <strong>under repair</strong>. It cannot be checked out until the ticket is closed.</div>
          <div className="stack">
            <div className="field"><label className="label" htmlFor="t-desc">What is wrong? *</label><textarea id="t-desc" className="textarea" rows={3} required {...set('issue_description')} /></div>
            <div className="grid-2">
              <div className="field"><label className="label" htmlFor="t-prio">Priority</label>
                <select id="t-prio" className="select" {...set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div className="field"><label className="label" htmlFor="t-by">Reported by</label><input id="t-by" className="input" {...set('reported_by')} /></div>
            </div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>Open ticket</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'retire'} onClose={() => setModal(null)} title="Retire asset">
        <form onSubmit={(e) => { e.preventDefault(); run(() => retireItem({ item_id: item.id, ...form }), 'Asset retired. Its record is kept.'); }}>
          <Alert message={actionError} />
          <div className="callout callout-bad">Retirement is permanent. The record and its history are kept, but the asset can no longer be checked out, edited or repaired.</div>
          <div className="stack">
            <div className="field"><label className="label" htmlFor="r-reason">Reason *</label><textarea id="r-reason" className="textarea" rows={2} required {...set('reason')} /></div>
            <div className="field"><label className="label" htmlFor="r-method">Disposal method</label><input id="r-method" className="input" placeholder="e.g. Sold, donated, recycled" {...set('disposal_method')} /></div>
            <div className="field"><label className="label" htmlFor="r-value">Disposal value</label><input id="r-value" className="input" type="number" step="0.01" min="0" {...set('disposal_value')} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-danger" disabled={busy}>Retire asset</button></div>
        </form>
      </Modal>
    </>
  );
}
