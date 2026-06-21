import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from './Icons';

export function AppHeader({
  title,
  subtitle,
  backTo,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '18px 22px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {backTo && (
        <button
          aria-label="Go back"
          onClick={() => navigate(backTo)}
          style={{
            background: 'none',
            border: 'none',
            padding: 8,
            margin: -8,
            color: 'var(--text)',
            display: 'flex',
          }}
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{title}</h1>
      </div>
    </header>
  );
}
