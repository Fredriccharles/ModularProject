export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      {onClose && <button type="button" onClick={onClose} aria-label="Dismiss">&times;</button>}
    </div>
  );
}
