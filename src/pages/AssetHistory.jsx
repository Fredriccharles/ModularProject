import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRightLeft, Archive, CheckCircle2, ChevronRight, LogIn, LogOut, PackagePlus, Pencil, RefreshCcw, Wrench,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import SearchInput from '../components/SearchInput.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useLoad } from '../lib/useLoad.js';
import {
  getTimeline, listHistoryAssets, listHistoryCategories, listHistorySubcategories, UNCATEGORIZED,
} from '../lib/api.js';
import { fmtDateTime } from '../lib/format.js';

// How each kind of event looks in the timeline.
const EVENTS = {
  registration: { label: 'Registered', icon: PackagePlus, tone: 'info' },
  edit: { label: 'Edited', icon: Pencil, tone: 'muted' },
  transfer: { label: 'Transferred', icon: ArrowRightLeft, tone: 'info' },
  checkout: { label: 'Checked out', icon: LogOut, tone: 'info' },
  return: { label: 'Returned', icon: LogIn, tone: 'ok' },
  maintenance_opened: { label: 'Maintenance opened', icon: Wrench, tone: 'bad' },
  maintenance_updated: { label: 'Maintenance updated', icon: Wrench, tone: 'info' },
  maintenance_completed: { label: 'Maintenance completed', icon: CheckCircle2, tone: 'ok' },
  status_change: { label: 'Status changed', icon: RefreshCcw, tone: 'muted' },
  retirement: { label: 'Retired', icon: Archive, tone: 'bad' },
};

export default function AssetHistory() {
  const [params] = useSearchParams();
  const linkedItem = params.get('item');

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [text, setText] = useState('');
  const [eventType, setEventType] = useState('');
  const [error, setError] = useState('');

  // Arriving from an asset page ("View history"): preselect its category, subcategory and asset.
  useEffect(() => {
    if (!linkedItem) return;
    getTimeline(linkedItem)
      .then(({ item }) => {
        setCategoryId(item.category_id ? String(item.category_id) : UNCATEGORIZED);
        setSubcategoryId(item.subcategory_id ? String(item.subcategory_id) : '');
        setAssetId(String(item.id));
      })
      .catch((e) => setError(e.message));
  }, [linkedItem]);

  // Level 1 -> 2 -> 3 -> 4: each list loads from the choice made above it.
  const cats = useLoad(listHistoryCategories, [], []);
  const subs = useLoad(() => listHistorySubcategories(categoryId), [categoryId], []);
  const assets = useLoad(() => listHistoryAssets({ categoryId, subcategoryId, q: assetSearch }), [categoryId, subcategoryId, assetSearch], []);
  const timeline = useLoad(
    () => (assetId ? getTimeline(assetId, { q: text, eventType }) : Promise.resolve(null)),
    [assetId, text, eventType], null,
  );

  const pickCategory = (v) => { setCategoryId(v); setSubcategoryId(''); setAssetId(''); setAssetSearch(''); setText(''); setEventType(''); };
  const pickSubcategory = (v) => { setSubcategoryId(v); setAssetId(''); setText(''); setEventType(''); };
  const pickAsset = (v) => { setAssetId(v); setText(''); setEventType(''); };

  const cat = cats.data.find((c) => String(c.id) === categoryId);
  const sub = subs.data.find((s) => String(s.id) === subcategoryId);
  const picked = timeline.data?.item;
  const events = timeline.data?.timeline || [];

  return (
    <>
      <PageHeader title="Asset history" subtitle="Choose a category, narrow it down to one asset, and read its full timeline" />
      <Alert message={error || cats.error || assets.error || timeline.error} onClose={() => setError('')} />

      <div className="crumbs" aria-label="Where you are">
        <span className={!cat ? 'here' : ''}>All categories</span>
        {cat && <><ChevronRight size={14} /><span className={!sub && !picked ? 'here' : ''}>{cat.name}</span></>}
        {sub && <><ChevronRight size={14} /><span className={!picked ? 'here' : ''}>{sub.name}</span></>}
        {picked && <><ChevronRight size={14} /><span className="here">{picked.name}</span></>}
      </div>

      <div className="card cascade mb">
        <div className="field">
          <label className="label" htmlFor="h-cat">1 · Asset category</label>
          <select id="h-cat" className="select" value={categoryId} onChange={(e) => pickCategory(e.target.value)}>
            <option value="">{cats.loading ? 'Loading…' : cats.data.length ? 'Choose a category…' : 'No assets registered yet'}</option>
            {cats.data.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.asset_count})</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="h-sub">2 · Subcategory</label>
          <select id="h-sub" className="select" value={subcategoryId} disabled={!categoryId} onChange={(e) => pickSubcategory(e.target.value)}>
            <option value="">{!categoryId ? 'Choose a category first' : subs.data.length ? 'All subcategories' : 'No subcategories'}</option>
            {subs.data.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.asset_count})</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="h-asset">3 · Asset / model</label>
          <select id="h-asset" className="select" value={assetId} disabled={!categoryId} onChange={(e) => pickAsset(e.target.value)}>
            <option value="">{!categoryId ? 'Choose a category first' : assets.data.length ? 'Choose an asset…' : 'No matching assets'}</option>
            {assets.data.map((a) => <option key={a.id} value={a.id}>{a.name}{a.model ? ` — ${a.model}` : ''} ({a.asset_code})</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label">Find a model by name</span>
          {categoryId ? <SearchInput value={assetSearch} onChange={setAssetSearch} placeholder="e.g. Nitro, FX3…" label="Find a model by name" /> : <input className="input" disabled placeholder="Choose a category first" aria-label="Find a model by name" />}
        </div>
      </div>

      {!assetId ? (
        <div className="card empty">Choose an asset above to see everything that has happened to it, from registration onward.</div>
      ) : (
        <section className="card card-pad">
          <div className="row-between mb">
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{picked?.name}</h2>
              <span className="mono muted">{picked?.asset_code}</span>
            </div>
            {picked && (
              <div className="row">
                <StatusBadge status={picked.status} />
                <Link to={`/items/${picked.id}`}>Open asset record →</Link>
              </div>
            )}
          </div>

          <div className="toolbar" style={{ padding: '0 0 16px' }}>
            <div className="grow"><SearchInput value={text} onChange={setText} placeholder="Search this asset’s history…" label="Search this asset’s history" /></div>
            <select className="select" aria-label="Event type" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All events</option>
              {Object.entries(EVENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(text || eventType) && <button type="button" className="link-btn" onClick={() => { setText(''); setEventType(''); }}>Clear</button>}
          </div>

          {timeline.loading && !timeline.data ? (
            <div className="loading-inline">Loading timeline…</div>
          ) : events.length === 0 ? (
            <div className="empty">No history entries match.</div>
          ) : (
            <ol className="timeline" aria-label="Asset timeline, oldest first">
              {events.map((ev) => {
                const meta = EVENTS[ev.event_type] || EVENTS.status_change;
                const Icon = meta.icon;
                return (
                  <li key={ev.id}>
                    <span className={`pin pin-${meta.tone}`} />
                    <div className="tl-head">
                      <Icon size={15} strokeWidth={1.75} className={`tl-title ${meta.tone}`} aria-hidden="true" />
                      <span className={`tl-title ${meta.tone}`}>{meta.label}</span>
                      <span className="tl-time">{fmtDateTime(ev.event_date)}</span>
                    </div>
                    <p className="tl-text">{ev.description}</p>
                    {ev.performed_by && <p className="tl-by">by {ev.performed_by}</p>}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="hint" style={{ marginTop: 16 }}>This timeline is read-only. Entries are written automatically when things happen and can never be edited or removed.</p>
        </section>
      )}
    </>
  );
}
