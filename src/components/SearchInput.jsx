import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

// Text box that applies its value shortly after typing stops.
export default function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => {
    if (text.trim() === (value || '')) return undefined;
    const t = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div className="search-wrap">
      <Search size={15} aria-hidden="true" />
      <input className="input" type="search" aria-label={label} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
    </div>
  );
}
