// Every call the website makes to Supabase lives in this one file.
//  - Reading data: queries against tables/views (the database only lets the administrator read).
//  - Changing data: always through the database functions (RPC), which enforce the business
//    rules and write the audit log + asset history. The website cannot write to tables directly.
import { supabase } from './supabase.js';

function friendly(error) {
  const msg = error?.message || '';
  if (!msg) return 'Something went wrong. Please try again.';
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (/jwt expired|invalid jwt/i.test(msg)) return 'Your session has expired. Please sign in again.';
  if (/permission denied/i.test(msg)) return 'You do not have permission to do that.';
  return msg;
}

function unwrap({ data, error }) {
  if (error) throw new Error(friendly(error));
  return data;
}

async function paged(query) {
  const { data, error, count } = await query;
  if (error) throw new Error(friendly(error));
  return { data: data || [], total: count || 0 };
}

const rpc = async (fn, args) => unwrap(await supabase.rpc(fn, args));

// Search text goes into a PostgREST "or" filter. Wrapping the value in double quotes lets it contain
// commas and brackets safely; backslashes and quotes inside it are escaped, and the wildcard
// characters are removed so people cannot accidentally turn their text into a pattern.
const plain = (s) => String(s ?? '').replace(/[*%]/g, ' ').replace(/\s+/g, ' ').trim();
const quoted = (s) => plain(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const orSearch = (columns, text) => {
  const c = quoted(text);
  return c ? columns.map((col) => `${col}.ilike."*${c}*"`).join(',') : null;
};
const range = (page, pageSize) => [(page - 1) * pageSize, page * pageSize - 1];

/* ------------------------------ session ------------------------------ */
export const checkIsAdmin = async () => Boolean(await rpc('is_admin'));
export const logEvent = (action, details = {}) => rpc('log_event', { p_action: action, p_details: details });
export const ensureMonthlyBackup = () => rpc('ensure_monthly_backup');

/* ----------------------------- dashboard ----------------------------- */
export const getDashboard = () => rpc('dashboard_summary');

/* ------------------------- categories + assets ------------------------ */
export async function listCategories() {
  return unwrap(await supabase.from('categories').select('id,name').order('name'));
}
export async function listSubcategories(categoryId) {
  let q = supabase.from('subcategories').select('id,name,category_id').order('name');
  if (categoryId) q = q.eq('category_id', categoryId);
  return unwrap(await q);
}
export const createCategory = (name) => rpc('create_category', { p_name: name, p_description: null });
export const createSubcategory = (categoryId, name) =>
  rpc('create_subcategory', { p_category_id: Number(categoryId), p_name: name });

const ITEM_SORTS = ['name', 'asset_code', 'status', 'created_at', 'updated_at', 'purchase_date', 'purchase_cost'];

export async function listItems({
  q, status, category_id, subcategory_id, location, sort = 'updated_at', order = 'desc', page = 1, pageSize = 15,
} = {}) {
  let query = supabase.from('v_items').select('*', { count: 'exact' });
  const or = orSearch(['name', 'asset_code', 'serial_number', 'model', 'manufacturer'], q);
  if (or) query = query.or(or);
  if (status) query = query.eq('status', status);
  if (category_id) query = query.eq('category_id', category_id);
  if (subcategory_id) query = query.eq('subcategory_id', subcategory_id);
  if (plain(location)) query = query.ilike('location', `%${plain(location)}%`);
  const col = ITEM_SORTS.includes(sort) ? sort : 'updated_at';
  const [from, to] = range(page, pageSize);
  // nullsFirst: false keeps assets with no cost / date at the bottom whichever way it is sorted.
  return paged(query.order(col, { ascending: order === 'asc', nullsFirst: false }).order('id', { ascending: false }).range(from, to));
}

// Short lists for the "pick an asset" drop-downs.
export async function listAssetChoices(statuses) {
  return unwrap(
    await supabase.from('v_items').select('id,asset_code,name,status').in('status', statuses).order('name').limit(1000),
  );
}

export async function getItem(id) {
  const item = unwrap(await supabase.from('v_items').select('*').eq('id', id).maybeSingle());
  if (!item) throw new Error('Asset not found.');
  const [checkouts, tickets, retirement] = await Promise.all([
    supabase.from('checkouts').select('*').eq('item_id', id).order('checkout_date', { ascending: false }),
    supabase.from('maintenance_tickets').select('*').eq('item_id', id).order('reported_date', { ascending: false }),
    supabase.from('retirements').select('*').eq('item_id', id).maybeSingle(),
  ]).then((all) => all.map(unwrap));
  return { ...item, checkouts, tickets, retirement };
}

export const createItem = (fields) => rpc('create_item', { p: fields });
export const updateItem = (id, fields) => rpc('update_item', { p_id: id, p: fields });

/* ------------------------------ check out ----------------------------- */
export async function listCheckouts({ q, status, page = 1, pageSize = 15 } = {}) {
  let query = supabase.from('v_checkouts').select('*', { count: 'exact' });
  const or = orSearch(['checked_out_to', 'item_name', 'asset_code', 'department'], q);
  if (or) query = query.or(or);
  if (status) query = query.eq('status', status);
  const [from, to] = range(page, pageSize);
  return paged(query.order('checkout_date', { ascending: false }).order('id', { ascending: false }).range(from, to));
}
export const checkOut = (fields) => rpc('check_out_item', { p: fields });
export const checkIn = (checkoutId, fields = {}) => rpc('check_in_item', { p_checkout_id: checkoutId, p: fields });

/* ------------------------------ maintenance --------------------------- */
export async function listTickets({ q, status, priority, page = 1, pageSize = 15 } = {}) {
  let query = supabase.from('v_tickets').select('*', { count: 'exact' });
  const or = orSearch(['item_name', 'asset_code', 'issue_description', 'assigned_to'], q);
  if (or) query = query.or(or);
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  const [from, to] = range(page, pageSize);
  return paged(query.order('reported_date', { ascending: false }).order('id', { ascending: false }).range(from, to));
}
export const createTicket = (fields) => rpc('create_ticket', { p: fields });
export const updateTicket = (id, fields) => rpc('update_ticket', { p_id: id, p: fields });

/* ------------------------------ retirement ---------------------------- */
export async function listRetirements({ q, page = 1, pageSize = 15 } = {}) {
  let query = supabase.from('v_retirements').select('*', { count: 'exact' });
  const or = orSearch(['item_name', 'asset_code', 'reason', 'disposal_method'], q);
  if (or) query = query.or(or);
  const [from, to] = range(page, pageSize);
  return paged(query.order('retired_date', { ascending: false }).order('id', { ascending: false }).range(from, to));
}
export const retireItem = (fields) => rpc('retire_item', { p: fields });

/* ------------------------------ audit log ----------------------------- */
export const AUDIT_ACTIONS = [
  'LOGIN', 'PASSWORD_CHANGE', 'ITEM_CREATE', 'ITEM_UPDATE', 'CATEGORY_CREATE', 'SUBCATEGORY_CREATE',
  'CHECKOUT', 'CHECKIN', 'TICKET_CREATE', 'TICKET_UPDATE', 'ITEM_RETIRE', 'REPORT_GENERATE',
  'BACKUP_CREATE', 'RESTORE',
];

export function applyAuditFilters(query, { q, action, from, to } = {}) {
  const or = orSearch(['username', 'action', 'entity_type', 'details_text'], q);
  if (or) query = query.or(or);
  if (action) query = query.eq('action', action);
  if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
  if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
  return query;
}

export async function listAudit({ page = 1, pageSize = 25, ...filters } = {}) {
  const query = applyAuditFilters(supabase.from('v_audit').select('*', { count: 'exact' }), filters);
  const [from, to] = range(page, pageSize);
  return paged(query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to));
}

/* ----------------------------- asset history -------------------------- */
// Four levels: category -> subcategory -> asset -> timeline.
export const UNCATEGORIZED = 'none';

export async function listHistoryCategories() {
  const cats = unwrap(await supabase.from('v_history_categories').select('id,name,asset_count').order('name'));
  const { count, error } = await supabase
    .from('v_items').select('id', { count: 'exact', head: true }).is('category_id', null);
  if (error) throw new Error(friendly(error));
  return count ? [...cats, { id: UNCATEGORIZED, name: 'Uncategorized', asset_count: count }] : cats;
}

export async function listHistorySubcategories(categoryId) {
  if (!categoryId || categoryId === UNCATEGORIZED) return [];
  return unwrap(
    await supabase.from('v_history_subcategories').select('id,name,asset_count').eq('category_id', categoryId).order('name'),
  );
}

export async function listHistoryAssets({ categoryId, subcategoryId, q }) {
  if (!categoryId) return [];
  let query = supabase.from('v_items').select('id,asset_code,name,manufacturer,model,status').order('name').order('asset_code').limit(1000);
  query = categoryId === UNCATEGORIZED ? query.is('category_id', null) : query.eq('category_id', categoryId);
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId);
  const or = orSearch(['name', 'model', 'asset_code', 'manufacturer'], q);
  if (or) query = query.or(or);
  return unwrap(await query);
}

export async function getTimeline(itemId, { q, eventType } = {}) {
  const item = unwrap(await supabase.from('v_items').select('*').eq('id', itemId).maybeSingle());
  if (!item) throw new Error('Asset not found.');
  let query = supabase.from('asset_history').select('*').eq('item_id', itemId);
  if (plain(q)) query = query.ilike('description', `%${plain(q)}%`);
  if (eventType) query = query.eq('event_type', eventType);
  const timeline = unwrap(await query.order('event_date', { ascending: true }).order('id', { ascending: true }));
  return { item, timeline };
}

/* -------------------------------- calendar ---------------------------- */
// Everything recorded between two moments (from inclusive, to exclusive), oldest first.
export function listCalendarEvents(from, to) {
  return fetchAll(() => supabase
    .from('v_history')
    .select('id,item_id,event_type,event_date,description,performed_by,item_name,asset_code,category_name')
    .gte('event_date', from.toISOString())
    .lt('event_date', to.toISOString())
    .order('event_date', { ascending: true })
    .order('id', { ascending: true }));
}

/* ------------------------------- backups ------------------------------ */
export async function listBackups() {
  return unwrap(
    await supabase.from('backups').select('id,filename,type,size_bytes,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }),
  );
}
export const createBackup = () => rpc('create_backup');
export const getBackupPayload = (id) => rpc('get_backup', { p_backup_id: id });
export const restoreBackup = (id) => rpc('restore_backup', { p_backup_id: id });
export const restoreFromPayload = (payload) => rpc('restore_from_payload', { p_payload: payload });

/* ----------------------- bulk reads for reports ----------------------- */
// Supabase returns at most 1000 rows per request, so reports read in pages.
export async function fetchAll(buildQuery, limit = 20000) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; from < limit; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw new Error(friendly(error));
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/* -------------------------------- calendar ----------------------------- */
// Every recorded event (check-out, return, issue, fix, move, ...) between two moments.
export async function listEventsBetween(fromIso, toIso) {
  return fetchAll(() => supabase
    .from('v_history')
    .select('id,item_id,event_type,event_date,description,performed_by,item_name,asset_code')
    .gte('event_date', fromIso)
    .lt('event_date', toIso)
    .order('event_date', { ascending: true })
    .order('id', { ascending: true }));
}
