import { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { useLoad } from '../lib/useLoad.js';
import { createBackup, getBackupPayload, listBackups, restoreBackup, restoreFromPayload } from '../lib/api.js';
import { saveBlob } from '../lib/exporters.js';
import { fmtBytes, fmtDateTime, titleCase } from '../lib/format.js';

export default function Backup() {
  const list = useLoad(listBackups, [], []);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [target, setTarget] = useState(null); // { id, filename } | { payload, filename, items }
  const fileInput = useRef(null);

  async function run(label, fn, success) {
    setBusy(label); setError('');
    try { await fn(); if (success) setNotice(success); list.reload(); }
    catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  const download = (b) => run(`dl-${b.id}`, async () => {
    const payload = await getBackupPayload(b.id);
    saveBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), b.filename);
  });

  async function chooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.format !== 'laced-asset-backup' || !payload.data) throw new Error('This file is not a LACED asset backup.');
      setTarget({ payload, filename: file.name, items: payload.data.items?.length ?? 0 });
    } catch (err) {
      setError(err instanceof SyntaxError ? 'This file could not be read. It is not a valid backup.' : err.message);
    }
  }

  const confirmRestore = () => run('restore', async () => {
    if (target.payload) await restoreFromPayload(target.payload); else await restoreBackup(target.id);
    setTarget(null);
  }, 'Backup restored. A copy of the data from just before the restore was saved too.');

  return (
    <>
      <PageHeader
        title="Backup & restore"
        subtitle="Snapshots of your asset data, kept in the database and downloadable as files"
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" /> Restore from file</button>
            <button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={() => run('create', createBackup, 'Backup created.')}>{busy === 'create' ? 'Backing up…' : 'Create backup now'}</button>
          </>
        )}
      />
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={chooseFile} aria-label="Backup file" />
      <Alert message={error || list.error} onClose={() => setError('')} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />

      <div className="callout callout-info">
        A backup is made automatically the first time the administrator opens the app each month. The free Supabase plan does not keep
        its own database backups, so <strong>download a copy now and then</strong> and keep it somewhere safe outside Supabase.
        Restoring replaces the asset data; the audit log is never rewound.
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>File</th><th>Type</th><th>Created</th><th>Size</th><th /></tr></thead>
          <tbody>
            {list.loading && list.data.length === 0 ? <tr><td colSpan={5} className="table-empty">Loading…</td></tr>
              : list.data.length === 0 ? <tr><td colSpan={5} className="table-empty">No backups yet.</td></tr>
              : list.data.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{b.filename}</td>
                  <td>{titleCase(b.type === 'auto' ? 'automatic' : 'manual')}</td>
                  <td className="nowrap">{fmtDateTime(b.created_at)}</td>
                  <td className="nowrap">{fmtBytes(b.size_bytes)}</td>
                  <td className="actions">
                    <button type="button" className="link-btn" disabled={Boolean(busy)} onClick={() => download(b)}><Download size={13} aria-hidden="true" /> {busy === `dl-${b.id}` ? 'Preparing…' : 'Download'}</button>
                    <button type="button" className="link-btn danger" onClick={() => setTarget({ id: b.id, filename: b.filename })}><RotateCcw size={13} aria-hidden="true" /> Restore</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(target)} onClose={() => !busy && setTarget(null)} title="Restore this backup?">
        <div className="callout callout-bad">
          This replaces <strong>all current asset data</strong> with <span className="mono">{target?.filename}</span>
          {target?.items !== undefined ? ` (${target.items} assets)` : ''}. Changes made since that backup will be lost from the asset records.
          A fresh backup of the current data is saved first, so this can be undone by restoring that one.
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" disabled={busy === 'restore'} onClick={() => setTarget(null)}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={busy === 'restore'} onClick={confirmRestore}>{busy === 'restore' ? 'Restoring…' : 'Yes, restore'}</button>
        </div>
      </Modal>
    </>
  );
}
