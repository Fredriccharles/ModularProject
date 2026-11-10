import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Alert from '../components/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { logEvent } from '../lib/api.js';

const EMPTY = { current: '', next: '', confirm: '' };

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  async function submit(e) {
    e.preventDefault();
    setError(''); setDone('');
    if (form.next.length < 8) return setError('The new password must be at least 8 characters.');
    if (form.next !== form.confirm) return setError('The new password and the confirmation do not match.');
    if (form.next === form.current) return setError('Choose a password different from the current one.');

    setBusy(true);
    try {
      // Confirm the current password first, so a borrowed, unlocked screen cannot change it.
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: form.current });
      if (check.error) throw new Error('The current password is not correct.');
      const { error: updateError } = await supabase.auth.updateUser({ password: form.next });
      if (updateError) throw new Error(updateError.message);
      logEvent('PASSWORD_CHANGE').catch(() => {});
      setForm(EMPTY);
      setDone('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your administrator account" />
      <div className="split">
        <section className="card card-pad">
          <h2 className="card-title">Account</h2>
          <dl className="kv">
            <dt>Email</dt><dd>{user?.email}</dd>
            <dt>Role</dt><dd>Administrator</dd>
          </dl>
        </section>
        <section className="card card-pad">
          <h2 className="card-title"><KeyRound size={16} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }} />Change password</h2>
          <Alert message={error} onClose={() => setError('')} />
          <Alert type="success" message={done} onClose={() => setDone('')} />
          <form onSubmit={submit} style={{ maxWidth: 380 }}>
            <div className="stack">
              <div className="field"><label className="label" htmlFor="pw-cur">Current password</label><input id="pw-cur" className="input" type="password" autoComplete="current-password" required {...set('current')} /></div>
              <div className="field"><label className="label" htmlFor="pw-new">New password</label><input id="pw-new" className="input" type="password" autoComplete="new-password" required {...set('next')} /><span className="hint">At least 8 characters.</span></div>
              <div className="field"><label className="label" htmlFor="pw-conf">Confirm new password</label><input id="pw-conf" className="input" type="password" autoComplete="new-password" required {...set('confirm')} /></div>
              <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></div>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
