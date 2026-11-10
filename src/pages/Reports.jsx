import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import { REPORTS, generateReport } from '../lib/reports.js';

export default function Reports() {
  const [filters, setFilters] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function download(report, format) {
    const key = `${report.key}-${format}`;
    setBusy(key); setError(''); setNotice('');
    try {
      const n = await generateReport(report, filters[report.key] || {}, format);
      setNotice(`${report.title}: ${n} record${n === 1 ? '' : 's'} exported.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="Download any report as a PDF or an Excel spreadsheet" />
      <Alert message={error} onClose={() => setError('')} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />
      <div className="grid-2">
        {REPORTS.map((r) => (
          <section className="card card-pad report" key={r.key}>
            <h2 className="card-title" style={{ marginBottom: 4 }}>{r.title}</h2>
            <p className="muted mb">{r.description}</p>
            {r.filters.map((fl) => (
              <div className="field filters" key={fl.name}>
                <label className="label" htmlFor={`${r.key}-${fl.name}`}>{fl.label}</label>
                <select id={`${r.key}-${fl.name}`} className="select"
                  value={(filters[r.key] || {})[fl.name] || ''}
                  onChange={(e) => setFilters((s) => ({ ...s, [r.key]: { ...(s[r.key] || {}), [fl.name]: e.target.value } }))}>
                  {fl.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="row">
              <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => download(r, 'pdf')}>
                <FileText size={16} aria-hidden="true" /> {busy === `${r.key}-pdf` ? 'Preparing…' : 'PDF'}
              </button>
              <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => download(r, 'xlsx')}>
                <FileSpreadsheet size={16} aria-hidden="true" /> {busy === `${r.key}-xlsx` ? 'Preparing…' : 'Excel'}
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
