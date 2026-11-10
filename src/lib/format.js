const CURRENCY = import.meta.env?.VITE_CURRENCY || 'USD';

export const STATUS_LABELS = {
  available: 'Available',
  checked_out: 'Checked out',
  under_repair: 'Under repair',
  retired: 'Retired',
  active: 'Out',
  returned: 'Returned',
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// 'YYYY-MM-DD' strings (database "date" columns) are shown as that calendar day,
// not shifted by the viewer's time zone.
export function fmtDate(v) {
  if (!v) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtMoney(v, { blank = '—' } = {}) {
  if (v === null || v === undefined || v === '') return blank;
  const n = Number(v);
  if (Number.isNaN(n)) return blank;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export const titleCase = (s) => (s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '');

// What each audit-log action is called on screen.
const ACTION_LABELS = {
  LOGIN: 'Signed in', PASSWORD_CHANGE: 'Password changed', ITEM_CREATE: 'Asset added', ITEM_UPDATE: 'Asset edited',
  CATEGORY_CREATE: 'Category added', SUBCATEGORY_CREATE: 'Subcategory added', CHECKOUT: 'Checked out',
  CHECKIN: 'Checked in', TICKET_CREATE: 'Ticket opened', TICKET_UPDATE: 'Ticket updated', ITEM_RETIRE: 'Asset retired',
  REPORT_GENERATE: 'Report downloaded', BACKUP_CREATE: 'Backup created', RESTORE: 'Backup restored',
};
export const actionLabel = (a) => ACTION_LABELS[a] || titleCase(a);

// "maintenance_ticket #3" reads better as "ticket #3".
const ENTITY_LABELS = { item: 'asset', maintenance_ticket: 'ticket', checkout: 'check-out', user: 'account' };
export const recordLabel = (type, id) => {
  if (!type) return '';
  const name = ENTITY_LABELS[type] || String(type).replace(/_/g, ' ');
  return id ? `${name} #${id}` : name;
};

export function fmtBytes(n) {
  if (n === null || n === undefined) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`;
}
