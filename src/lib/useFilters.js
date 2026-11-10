import { useSearchParams } from 'react-router-dom';

// Filters and page number live in the address bar, so a filtered list can be bookmarked or shared,
// and the Back button works.
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const get = (key) => params.get(key) || '';
  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k); else next.set(k, String(v));
    });
    if (!('page' in changes)) next.delete('page'); // a new filter starts again from page 1
    setParams(next, { replace: true });
  };
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const any = [...params.keys()].some((k) => k !== 'page');
  return { get, set, page, any, clear: () => setParams({}, { replace: true }) };
}
