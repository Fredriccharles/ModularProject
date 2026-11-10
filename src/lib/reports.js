// The report catalogue: what each report contains, and how to produce the PDF / Excel file.
import { supabase } from './supabase.js';
import { fetchAll, logEvent } from './api.js';
import { buildPdf, buildXlsx, saveBlob, XLSX_TYPE } from './exporters.js';
import { actionLabel, fmtDate, fmtDateTime, recordLabel, STATUS_LABELS, titleCase } from './format.js';

const CURRENCY = import.meta.env?.VITE_CURRENCY || 'USD';
// The built-in PDF font cannot draw currency symbols such as the peso sign, so PDFs show the code.
const pdfMoney = (v) => (v === null || v === undefined || v === '' ? '' : `${CURRENCY} ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const STATUS_OPTIONS = (values) => [{ value: '', label: 'All' }, ...values.map((v) => ({ value: v, label: STATUS_LABELS[v] || titleCase(v) }))];

// kind: text | date | datetime | money | status | label | action
const col = (header, get, kind = 'text') => ({ header, get, kind });

export const REPORTS = [
  {
    key: 'inventory', file: 'asset-inventory', title: 'Asset inventory',
    description: 'Every asset with its category, status, location and cost.',
    filters: [{ name: 'status', label: 'Status', options: STATUS_OPTIONS(['available', 'checked_out', 'under_repair', 'retired']) }],
    load: (f) => fetchAll(() => {
      let q = supabase.from('v_items').select('*').order('asset_code');
      if (f.status) q = q.eq('status', f.status);
      return q;
    }),
    columns: [
      col('Asset code', (r) => r.asset_code), col('Name', (r) => r.name), col('Category', (r) => r.category_name),
      col('Subcategory', (r) => r.subcategory_name), col('Status', (r) => r.status, 'status'),
      col('Location', (r) => r.location), col('Serial no.', (r) => r.serial_number),
      col('Purchase date', (r) => r.purchase_date, 'date'), col('Cost', (r) => r.purchase_cost, 'money'),
    ],
  },
  {
    key: 'checkouts', file: 'checkout-history', title: 'Check-out history',
    description: 'Who held which asset, when, and whether it has come back.',
    filters: [{ name: 'status', label: 'Status', options: STATUS_OPTIONS(['active', 'returned']) }],
    load: (f) => fetchAll(() => {
      let q = supabase.from('v_checkouts').select('*').order('checkout_date', { ascending: false });
      if (f.status) q = q.eq('status', f.status);
      return q;
    }),
    columns: [
      col('Asset code', (r) => r.asset_code), col('Asset', (r) => r.item_name), col('Checked out to', (r) => r.checked_out_to),
      col('Department', (r) => r.department), col('Checked out', (r) => r.checkout_date, 'datetime'),
      col('Expected back', (r) => r.expected_return_date, 'date'), col('Returned', (r) => r.return_date, 'datetime'),
      col('Status', (r) => r.status, 'status'),
    ],
  },
  {
    key: 'maintenance', file: 'maintenance-tickets', title: 'Maintenance tickets',
    description: 'Repairs with priority, assignee, cost and resolution.',
    filters: [{ name: 'status', label: 'Status', options: STATUS_OPTIONS(['open', 'in_progress', 'completed', 'cancelled']) }],
    load: (f) => fetchAll(() => {
      let q = supabase.from('v_tickets').select('*').order('reported_date', { ascending: false });
      if (f.status) q = q.eq('status', f.status);
      return q;
    }),
    columns: [
      col('Asset code', (r) => r.asset_code), col('Asset', (r) => r.item_name), col('Issue', (r) => r.issue_description),
      col('Priority', (r) => r.priority, 'label'), col('Status', (r) => r.status, 'status'),
      col('Assigned to', (r) => r.assigned_to), col('Reported', (r) => r.reported_date, 'datetime'),
      col('Completed', (r) => r.completed_date, 'datetime'), col('Cost', (r) => r.cost, 'money'),
      col('Resolution', (r) => r.resolution_notes),
    ],
  },
  {
    key: 'retirements', file: 'retired-assets', title: 'Retired and disposed assets',
    description: 'Assets taken out of service, with the reason and disposal method.',
    filters: [],
    load: () => fetchAll(() => supabase.from('v_retirements').select('*').order('retired_date', { ascending: false })),
    columns: [
      col('Asset code', (r) => r.asset_code), col('Asset', (r) => r.item_name), col('Retired', (r) => r.retired_date, 'datetime'),
      col('Reason', (r) => r.reason), col('Disposal method', (r) => r.disposal_method),
      col('Original cost', (r) => r.purchase_cost, 'money'), col('Disposal value', (r) => r.disposal_value, 'money'),
    ],
  },
  {
    key: 'history', file: 'asset-history', title: 'Asset history (all events)',
    description: 'The complete lifecycle timeline of every asset: registration, edits, transfers, check-outs, maintenance, retirement.',
    filters: [],
    load: () => fetchAll(() => supabase.from('v_history').select('*').order('event_date', { ascending: false }).order('id', { ascending: false })),
    columns: [
      col('Date', (r) => r.event_date, 'datetime'), col('Asset code', (r) => r.asset_code), col('Asset', (r) => r.item_name),
      col('Category', (r) => r.category_name), col('Event', (r) => r.event_type, 'label'),
      col('Details', (r) => r.description), col('By', (r) => r.performed_by),
    ],
  },
  {
    key: 'audit', file: 'audit-log', title: 'Administrator audit log',
    description: 'Every administrator action in the system, newest first.',
    filters: [],
    load: () => fetchAll(() => supabase.from('v_audit').select('*').order('created_at', { ascending: false }).order('id', { ascending: false })),
    columns: [
      col('Date', (r) => r.created_at, 'datetime'), col('User', (r) => r.username), col('Action', (r) => r.action, 'action'),
      col('Record', (r) => recordLabel(r.entity_type, r.entity_id)),
      col('Details', (r) => r.details_text), col('IP address', (r) => r.ip_address),
    ],
  },
];

function display(kind, value, forPdf) {
  if (value === null || value === undefined || value === '') return '';
  switch (kind) {
    case 'date': return fmtDate(value);
    case 'datetime': return fmtDateTime(value);
    case 'status': return STATUS_LABELS[value] || titleCase(value);
    case 'label': return titleCase(value);
    case 'action': return actionLabel(value);
    case 'money': return forPdf ? pdfMoney(value) : Number(value);
    default: return String(value);
  }
}

const stamp = () => new Date().toISOString().slice(0, 10);

// Turns rows into table cells. Exported so tests can check the output without a browser.
export function tabulate(report, rows, forPdf) {
  const head = report.columns.map((c) => c.header);
  const body = rows.map((r) => report.columns.map((c) => {
    const v = display(c.kind, c.get(r), forPdf);
    return forPdf && v === '' ? '-' : v;
  }));
  return { head, body };
}

export async function generateReport(report, filters, format) {
  const rows = await report.load(filters);
  const file = `${report.file}-${stamp()}`;
  const moneyColumns = report.columns.map((c, i) => (c.kind === 'money' ? i : -1)).filter((i) => i >= 0);

  if (format === 'xlsx') {
    const { head, body } = tabulate(report, rows, false);
    const buf = await buildXlsx({ title: report.title, head, rows: body, moneyColumns });
    saveBlob(new Blob([buf], { type: XLSX_TYPE }), `${file}.xlsx`);
  } else {
    const { head, body } = tabulate(report, rows, true);
    const doc = await buildPdf({
      title: report.title,
      subtitle: `LACED Media Production  |  Generated ${new Date().toLocaleString()}  |  ${rows.length} record${rows.length === 1 ? '' : 's'}`,
      head, body,
    });
    doc.save(`${file}.pdf`);
  }
  // Recorded after the file is produced; a logging hiccup must not lose the download.
  logEvent('REPORT_GENERATE', { report: report.key, format, rows: rows.length }).catch(() => {});
  return rows.length;
}
