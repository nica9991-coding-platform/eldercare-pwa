import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/dashboard', label: 'Today', glyph: '◷' },
  { to: '/history', label: 'History', glyph: '▤' },
  { to: '/members', label: 'Circle', glyph: '◎' },
  { to: '/more', label: 'More', glyph: '⋯' },
];

export function BottomTabBar() {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '8px 4px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '8px 4px',
            minHeight: 44,
            textDecoration: 'none',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 600,
          })}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>{tab.glyph}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
