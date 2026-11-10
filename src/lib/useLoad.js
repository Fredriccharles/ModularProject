import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader whenever `deps` change, ignores answers that arrive late,
// and exposes { data, loading, error, reload }.
export function useLoad(loader, deps, initial = null) {
  const [state, setState] = useState({ data: initial, loading: true, error: '' });
  const latest = useRef(0);

  const run = useCallback(async () => {
    const id = (latest.current += 1);
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loader();
      if (id === latest.current) setState({ data, loading: false, error: '' });
    } catch (e) {
      if (id === latest.current) setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
