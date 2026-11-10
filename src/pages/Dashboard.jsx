import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import { useLoad } from '../lib/useLoad.js';
import { getDashboard } from '../lib/api.js';
import { actionLabel, fmtDateTime, fmtMoney, recordLabel } from '../lib/format.js';

const STATS = [
  { key: 'available', label: 'Available', tone: 'ok' },
  { key: 'checked_out', label: 'Checked out', tone: 'info' },
  { key: 'under_repair', label: 'Under repair', tone: 'bad' },
  { key: 'retired', label: 'Retired', tone: 'muted' },
];

export default function Dashboard() {
  const { data, loading, error } = useLoad(getDashboard, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Where every asset stands right now" />
      <Alert message={error} />
      {loading && !data && <div className="loading-inline">Loading…</div>}
      {data && (
        <>
          <div className="grid-4 mb">
            {STATS.map((s) => (
              <Link key={s.key} to={`/items?status=${s.key}`} className="card stat">
                <div className="stat-label"><span className={`dot dot-${s.tone}`} />{s.label}</div>
                <div className="stat-value">{data.statusCounts[s.key] ?? 0}</div>
              </Link>
            ))}
          </div>

          <div className="grid-3 mb-lg">
            <div className="card stat">
              <div className="stat-label">Value of active assets</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{fmtMoney(data.totalValue, { blank: '0' })}</div>
            </div>
            <Link to="/maintenance?status=open" className="card stat">
              <div className="stat-label">Open maintenance tickets</div>
              <div className={`stat-value${data.openTickets ? ' bad' : ''}`}>{data.openTickets}</div>
            </Link>
            <Link to="/checkouts?status=active" className="card stat">
              <div className="stat-label">Overdue check-outs</div>
              <div className={`stat-value${data.overdueCheckouts ? ' bad' : ''}`}>{data.overdueCheckouts}</div>
            </Link>
          </div>

          <div className="grid-2">
            <section className="card card-pad">
              <h2 className="card-title">Assets by category</h2>
              {data.byCategory.length === 0 ? (
                <p className="muted">No active assets yet. <Link to="/items">Add the first one.</Link></p>
              ) : (
                data.byCategory.map((c) => {
                  const max = Math.max(...data.byCategory.map((x) => x.count));
                  return (
                    <div className="bar-item" key={c.category}>
                      <div className="bar-top"><span>{c.category}</span><span className="muted num">{c.count}</span></div>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.count / max) * 100}%` }} /></div>
                    </div>
                  );
                })
              )}
            </section>

            <section className="card card-pad">
              <h2 className="card-title">Recent activity</h2>
              {data.recentActivity.length === 0 ? (
                <p className="muted">Nothing has happened yet.</p>
              ) : (
                <ul className="feed">
                  {data.recentActivity.map((a, i) => (
                    <li key={i}>
                      <span>
                        <strong>{actionLabel(a.action)}</strong>
                        {a.entity_type && <span className="muted"> · {recordLabel(a.entity_type, a.entity_id)}</span>}
                      </span>
                      <span className="muted nowrap">{fmtDateTime(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ marginTop: 12 }}><Link to="/audit">View the full audit log →</Link></p>
            </section>
          </div>
        </>
      )}
    </>
  );
}
