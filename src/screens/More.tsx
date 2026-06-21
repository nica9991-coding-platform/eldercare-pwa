import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useCircle } from '../lib/CircleContext';
import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import { Avatar } from '../components/Avatar';

export function More() {
  const navigate = useNavigate();
  const auth = useAuth();
  const circle = useCircle();
  const firstName = circle.circle.seniorDisplayName.split(' ')[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="More" />

      <div style={{ flex: 1, padding: 22 }}>
        {/* Circle identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: 16,
            marginBottom: 22,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <Avatar initials={circle.circle.seniorInitials} size={48} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{circle.circle.seniorDisplayName}'s circle</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {auth.userEmail ?? 'Signed in'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MenuRow icon="✦" label="Radar" sub={`Ask about ${firstName}`} onClick={() => navigate('/radar')} />
          <MenuRow icon="▤" label="History" sub="This week's adherence" onClick={() => navigate('/history')} />
          <MenuRow icon="◎" label="Care circle" sub="Members & invites" onClick={() => navigate('/members')} />
          <MenuRow
            icon="☀"
            label={`Open ${firstName}'s view`}
            sub="The simple senior screen"
            onClick={() => navigate('/today')}
          />
        </div>

        <div style={{ height: 24 }} />
        <button
          onClick={() => {
            auth.signOut();
            navigate('/');
          }}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 14,
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            color: 'var(--urgent)',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Sign out
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 22 }}>
          Kindred · {circle.mode === 'demo' ? 'Demo mode' : 'Connected'}
        </p>
      </div>

      <BottomTabBar />
    </div>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'var(--primary-tint)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-muted)' }}>{sub}</span>
      </span>
      <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: 18 }}>
        ›
      </span>
    </button>
  );
}
