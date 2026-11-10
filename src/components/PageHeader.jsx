import { useEffect } from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  useEffect(() => { document.title = `${title} · LACED Media Production`; }, [title]);
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
