import { STATUS_LABELS } from '../lib/format.js';

// green = ready / finished well, blue = in use or in progress, red = blocked or needs attention, grey = closed
const TONE = {
  available: 'ok', returned: 'ok', completed: 'ok',
  checked_out: 'info', active: 'info', in_progress: 'info',
  under_repair: 'bad', open: 'bad',
  retired: 'muted', cancelled: 'muted',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${TONE[status] || 'muted'}`}>{STATUS_LABELS[status] || status}</span>;
}
