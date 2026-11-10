// Date and grouping helpers for the Calendar page.

// How events are grouped in the day panel. "tone" is the colour of the small dot on the calendar.
export const EVENT_GROUPS = [
  { key: 'out', label: 'Pulled out', tone: 'info', types: ['checkout'] },
  { key: 'back', label: 'Returned', tone: 'ok', types: ['return'] },
  { key: 'issues', label: 'Issues reported', tone: 'bad', types: ['maintenance_opened'] },
  { key: 'repairs', label: 'Repairs in progress', tone: 'info', types: ['maintenance_updated'] },
  { key: 'fixed', label: 'Fixed', tone: 'ok', types: ['maintenance_completed'] },
  { key: 'moved', label: 'Moved or edited', tone: 'muted', types: ['transfer', 'edit', 'status_change'] },
  { key: 'added', label: 'Added or retired', tone: 'muted', types: ['registration', 'retirement'] },
];
const TONE_ORDER = ['info', 'ok', 'bad', 'muted'];
const BY_TYPE = Object.fromEntries(EVENT_GROUPS.flatMap((g) => g.types.map((t) => [t, g])));
export const groupFor = (type) => BY_TYPE[type] || EVENT_GROUPS[EVENT_GROUPS.length - 1];

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// The days shown for a month: whole weeks starting on Sunday (5 or 6 rows).
export function monthGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return days[35].getMonth() === cursor.getMonth() ? days : days.slice(0, 35); // drop a last row that is all next month
}

// Events grouped by the viewer's local calendar day.
export function indexByDay(events) {
  const map = new Map();
  events.forEach((e) => {
    const key = dayKey(new Date(e.event_date));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return map;
}

// Distinct dot colours for a day, in a fixed order.
export function tonesOf(events) {
  const present = new Set(events.map((e) => groupFor(e.event_type).tone));
  return TONE_ORDER.filter((t) => present.has(t));
}

// [{ group, events }] in display order, skipping empty groups.
export function groupEvents(events) {
  return EVENT_GROUPS
    .map((group) => ({ group, events: events.filter((e) => groupFor(e.event_type) === group) }))
    .filter((g) => g.events.length > 0);
}
