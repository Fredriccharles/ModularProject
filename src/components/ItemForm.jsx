import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import Alert from './Alert.jsx';
import { useLoad } from '../lib/useLoad.js';
import { createItem, listCategories, listSubcategories, updateItem } from '../lib/api.js';

const EMPTY = {
  asset_code: '', name: '', category_id: '', subcategory_id: '', location: '', manufacturer: '', model: '',
  serial_number: '', supplier: '', purchase_date: '', purchase_cost: '', description: '', condition_note: '',
};

const fromItem = (item) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, item?.[k] ?? '']));

// Add / edit an asset. `refreshKey` makes the category lists reload after one was added.
export default function ItemForm({ open, item, onClose, onSaved, refreshKey = 0 }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm(item ? fromItem(item) : EMPTY); setError(''); }
  }, [open, item]);

  const cats = useLoad(listCategories, [refreshKey], []);
  const subs = useLoad(
    () => (form.category_id ? listSubcategories(form.category_id) : Promise.resolve([])),
    [form.category_id, refreshKey], [],
  );

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (item) await updateItem(item.id, form); else await createItem(form);
      onSaved(item ? 'Asset updated.' : 'Asset added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit asset' : 'Add asset'} wide>
      <form onSubmit={submit}>
        <Alert message={error} onClose={() => setError('')} />
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="f-code">Asset code *</label>
            <input id="f-code" className="input" required placeholder="e.g. IT-0001" {...field('asset_code')} />
            <span className="hint">Typed in by you. Must be unique.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-name">Name *</label>
            <input id="f-name" className="input" required {...field('name')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-cat">Category</label>
            <select id="f-cat" className="select" value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, subcategory_id: '' }))}>
              <option value="">Uncategorized</option>
              {cats.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-sub">Subcategory</label>
            <select id="f-sub" className="select" disabled={!form.category_id} {...field('subcategory_id')}>
              <option value="">{form.category_id ? 'None' : 'Choose a category first'}</option>
              {subs.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-man">Manufacturer</label>
            <input id="f-man" className="input" {...field('manufacturer')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-model">Model</label>
            <input id="f-model" className="input" {...field('model')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-serial">Serial number</label>
            <input id="f-serial" className="input" {...field('serial_number')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-loc">Location</label>
            <input id="f-loc" className="input" {...field('location')} />
            <span className="hint">Changing this is recorded as a transfer.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="f-supplier">Supplier</label>
            <input id="f-supplier" className="input" {...field('supplier')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-date">Purchase date</label>
            <input id="f-date" className="input" type="date" {...field('purchase_date')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-cost">Purchase cost</label>
            <input id="f-cost" className="input" type="number" step="0.01" min="0" {...field('purchase_cost')} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="f-desc">Description</label>
            <textarea id="f-desc" className="textarea" rows={2} {...field('description')} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="f-cond">Condition notes</label>
            <textarea id="f-cond" className="textarea" rows={2} {...field('condition_note')} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save asset'}</button>
        </div>
      </form>
    </Modal>
  );
}
