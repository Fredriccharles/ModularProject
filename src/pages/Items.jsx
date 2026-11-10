import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ItemForm from '../components/ItemForm.jsx';
import { useLoad } from '../lib/useLoad.js';
import { useFilters } from '../lib/useFilters.js';
import { createCategory, createSubcategory, listCategories, listItems, listSubcategories } from '../lib/api.js';
import { fmtMoney } from '../lib/format.js';

const PAGE_SIZE = 15;
const SORTS = [
  ['updated_at:desc', 'Recently updated'], ['name:asc', 'Name (A–Z)'], ['asset_code:asc', 'Asset code'],
  ['purchase_date:desc', 'Newest purchase'], ['purchase_cost:desc', 'Highest cost'],
];

export default function Items() {
  const f = useFilters();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [catModal, setCatModal] = useState(false);
  const [subModal, setSubModal] = useState(false);
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [bump, setBump] = useState(0);

  const q = f.get('q'), status = f.get('status'), category_id = f.get('category_id');
  const subcategory_id = f.get('subcategory_id'), location = f.get('location');
  const sort = f.get('sort') || 'updated_at:desc';
  const [sortCol, sortDir] = sort.split(':');

  const items = useLoad(
    () => listItems({ q, status, category_id, subcategory_id, location, sort: sortCol, order: sortDir, page: f.page, pageSize: PAGE_SIZE }),
    [q, status, category_id, subcategory_id, location, sort, f.page, bump],
    { data: [], total: 0 },
  );
  const cats = useLoad(listCategories, [bump], []);
  const subs = useLoad(() => (category_id ? listSubcategories(category_id) : Promise.resolve([])), [category_id, bump], []);

  async function addCategory(e) {
    e.preventDefault();
    try {
      await createCategory(name);
      setCatModal(false); setName(''); setBump((n) => n + 1); setNotice('Category added.');
    } catch (err) { setError(err.message); }
  }
  async function addSubcategory(e) {
    e.preventDefault();
    try {
      await createSubcategory(parent, name);
      setSubModal(false); setName(''); setBump((n) => n + 1); setNotice('Subcategory added.');
    } catch (err) { setError(err.message); }
  }

  const rows = items.data.data;
  return (
    <>
      <PageHeader
        title="Assets"
        subtitle={`${items.data.total} asset${items.data.total === 1 ? '' : 's'}${f.any ? ' match the filters' : ' in the register'}`}
        actions={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setName(''); setCatModal(true); }}>Add category</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setName(''); setParent(category_id); setSubModal(true); }}>Add subcategory</button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>Add asset</button>
          </>
        )}
      />
      <Alert message={error || items.error} onClose={() => setError('')} />
      <Alert type="success" message={notice} onClose={() => setNotice('')} />

      <div className="card mb">
        <div className="toolbar">
          <div className="grow"><SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder="Search name, code, serial, model…" /></div>
          <select className="select" aria-label="Status" value={status} onChange={(e) => f.set({ status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="checked_out">Checked out</option>
            <option value="under_repair">Under repair</option>
            <option value="retired">Retired</option>
          </select>
          <select className="select" aria-label="Category" value={category_id} onChange={(e) => f.set({ category_id: e.target.value, subcategory_id: '' })}>
            <option value="">All categories</option>
            {cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" aria-label="Subcategory" value={subcategory_id} disabled={!category_id} onChange={(e) => f.set({ subcategory_id: e.target.value })}>
            <option value="">{category_id ? 'All subcategories' : 'Pick a category first'}</option>
            {subs.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <SearchInput value={location} onChange={(v) => f.set({ location: v })} placeholder="Location" label="Location" />
          <select className="select" aria-label="Sort by" value={sort} onChange={(e) => f.set({ sort: e.target.value === 'updated_at:desc' ? '' : e.target.value })}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {f.any && <button type="button" className="link-btn" onClick={f.clear}>Clear filters</button>}
        </div>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Asset code</th><th>Name</th><th>Category</th><th>Location</th><th>Status</th><th className="right">Cost</th><th /></tr>
          </thead>
          <tbody>
            {items.loading && rows.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">{f.any ? 'No assets match these filters.' : 'No assets yet. Use “Add asset” to register the first one.'}</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="mono nowrap">{r.asset_code}</td>
                <td><Link to={`/items/${r.id}`} className="cell-title">{r.name}</Link>{r.model && <div className="cell-sub">{r.model}</div>}</td>
                <td>{r.category_name || '—'}{r.subcategory_name && <div className="cell-sub">{r.subcategory_name}</div>}</td>
                <td>{r.location || '—'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="right num">{fmtMoney(r.purchase_cost)}</td>
                <td className="actions">
                  {r.status !== 'retired' && <button type="button" className="link-btn" onClick={() => setEditing(r)}>Edit</button>}
                  <Link to={`/items/${r.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={f.page} pageSize={PAGE_SIZE} total={items.data.total} onChange={(p) => f.set({ page: p })} />

      <ItemForm
        open={editing !== undefined}
        item={editing || null}
        refreshKey={bump}
        onClose={() => setEditing(undefined)}
        onSaved={(msg) => { setEditing(undefined); setNotice(msg); items.reload(); }}
      />

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Add category">
        <form onSubmit={addCategory}>
          <div className="field">
            <label className="label" htmlFor="cat-name">Category name *</label>
            <input id="cat-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lighting" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setCatModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add category</button>
          </div>
        </form>
      </Modal>

      <Modal open={subModal} onClose={() => setSubModal(false)} title="Add subcategory">
        <form onSubmit={addSubcategory}>
          <div className="stack">
            <div className="field">
              <label className="label" htmlFor="sub-parent">Category *</label>
              <select id="sub-parent" className="select" required value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">Choose a category…</option>
                {cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="sub-name">Subcategory name *</label>
              <input id="sub-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptop" />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setSubModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add subcategory</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
