import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRightLeft, Archive, CheckCircle2, ChevronLeft, ChevronRight, LogIn, LogOut,
  PackagePlus, Pencil, RefreshCcw, Wrench,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import { useLoad } from '../lib/useLoad.js';
import { listEventsBetween } from '../lib/api.js';
import {
  addDays, dayKey, groupEvents, groupFor, indexByDay, monthGrid, sameMonth, startOfDay, tonesOf,
} from '../lib/calendar.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICONS = {
  checkout: LogOut, return: LogIn, maintenance_opened: AlertTriangle, maintenance_updated: Wrench,
  maintenance_completed: CheckCircle2, transfer: ArrowRightLeft, edit: Pencil, status_change: RefreshCcw,
  registration: PackagePlus, retirement: Archive,
};
const timeOf = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Calendar() {
  const today = startOfDay(new Date());
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [cursor, setCursor] = useState(thisMonth);
  const [selected, setSelected] = useState(today);
  const panel = useRef(null);

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const from = days[0];
  const to = addDays(days[days.length - 1], 1);
  const events = useLoad(
    () => listEventsBetween(from.toISOString(), to.toISOString()),
    [cursor.getFullYear(), cursor.getMonth()], [],
  );
  const byDay = useMemo(() => indexByDay(events.data), [events.data]);

  const dayEvents = selected ? byDay.get(dayKey(selected)) || [] : [];
  const groups = groupEvents(dayEvents);
  const canGoNext = cursor < thisMonth;

  function go(delta) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
    setSelected(sameMonth(next, today) ? today : null); // the panel only ever shows days from loaded data
  }
  function pick(day) {
    if (day > today) return; // nothing has happened yet
    setSelected(day);
    // On narrow screens the panel sits below the calendar, so bring it into view.
    if (window.matchMedia?.('(max-width: 1100px)').matches) {
      panel.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedIsToday = selected && dayKey(selected) === dayKey(today);

  return (
    <>
      <PageHeader title="Calendar" subtitle="Pick a day to see what happened: equipment pulled out, returned, issues and fixes" />
      <Alert message={events.error} />

      <div className="cal-layout">
        <section className="card cal" aria-label="Calendar">
          <div className="cal-head">
            <h2 className="cal-title">{monthLabel}</h2>
            <div className="row" style={{ gap: 8 }}>
              {events.loading && <span className="muted" style={{ fontSize: 13 }}>Loading…</span>}
              {!sameMonth(cursor, today) && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCursor(thisMonth); setSelected(today); }}>Today</button>
              )}
              <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => go(-1)}><ChevronLeft size={18} /></button>
              <button type="button" className="icon-btn" aria-label="Next month" disabled={!canGoNext} onClick={() => go(1)}><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="cal-weekdays" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="cal-grid" role="group" aria-label={monthLabel}>
            {days.map((d) => {
              const key = dayKey(d);
              const list = byDay.get(key) || [];
              const future = d > today;
              const isToday = key === dayKey(today);
              const isSelected = selected && key === dayKey(selected);
              const cls = ['cal-day', !sameMonth(d, cursor) && 'outside', future && 'future', isToday && 'today', isSelected && 'selected']
                .filter(Boolean).join(' ');
              const label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
              return (
                <button
                  key={key} type="button" className={cls} disabled={future}
                  aria-pressed={Boolean(isSelected)} aria-current={isToday ? 'date' : undefined}
                  aria-label={list.length ? `${label}, ${plural(list.length, 'event')}` : label}
                  onClick={() => pick(d)}
                >
                  <span className="cal-num">{d.getDate()}</span>
                  <span className="cal-dots" aria-hidden="true">
                    {tonesOf(list).map((t) => <i key={t} className={`dot dot-${t}`} />)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span><i className="dot dot-info" /> Pulled out or in repair</span>
            <span><i className="dot dot-ok" /> Returned or fixed</span>
            <span><i className="dot dot-bad" /> Issue reported</span>
            <span><i className="dot dot-muted" /> Added, moved, edited or retired</span>
          </div>
        </section>

        <aside className="card day-panel" ref={panel} aria-live="polite" aria-label="Events on the selected day">
          {!selected ? (
            <div className="empty">Choose a day to see what happened.</div>
          ) : (
            <>
              <div className="day-head">
                <h2>
                  {selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  {selectedIsToday && <span className="badge badge-info" style={{ marginLeft: 10, verticalAlign: '3px' }}>Today</span>}
                </h2>
                <p>
                  {events.loading && dayEvents.length === 0 ? 'Loading…'
                    : dayEvents.length ? `${plural(dayEvents.length, 'event')} · ${selected.getFullYear()}`
                    : `Nothing was recorded on this day · ${selected.getFullYear()}`}
                </p>
              </div>

              {groups.map(({ group, events: list }) => (
                <section className="day-group" key={group.key}>
                  <h3 className="day-group-title"><span>{group.label}</span><span>{list.length}</span></h3>
                  <ul className="day-events">
                    {list.map((e) => {
                      const Icon = ICONS[e.event_type] || RefreshCcw;
                      return (
                        <li className="day-event" key={e.id}>
                          <span className={`chip chip-${groupFor(e.event_type).tone}`}><Icon size={16} strokeWidth={1.9} aria-hidden="true" /></span>
                          <div>
                            <div>
                              <Link to={`/items/${e.item_id}`} className="day-event-name">{e.item_name}</Link>
                              <span className="mono muted" style={{ marginLeft: 8 }}>{e.asset_code}</span>
                            </div>
                            <p className="day-event-text">{e.description}</p>
                          </div>
                          <time className="day-event-time" dateTime={e.event_date}>{timeOf(e.event_date)}</time>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
