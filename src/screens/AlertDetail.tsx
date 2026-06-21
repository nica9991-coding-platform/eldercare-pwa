import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCircle } from '../lib/CircleContext';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { AlertCircleIcon, CheckIcon } from '../components/Icons';

export function AlertDetail() {
  const { id = '' } = useParams();
  const circle = useCircle();
  const navigate = useNavigate();
  const alert = circle.getAlertById(id);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  const firstName = circle.circle.seniorDisplayName.split(' ')[0];

  if (!alert) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AppHeader title="Alert" backTo="/dashboard" />
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-tint-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '24px auto 16px',
            }}
          >
            <CheckIcon size={32} color="var(--success)" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
            This alert is resolved
          </h1>
          <p style={{ fontSize: 15, margin: '0 0 22px' }}>It's no longer active. Nice work staying on top of it.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  const urgent = alert.severity === 'URGENT';
  const accent = urgent ? 'var(--urgent)' : 'var(--warning)';
  const tint = urgent ? 'var(--urgent-tint-2)' : 'var(--warning-tint-2)';

  async function doResolve() {
    setResolving(true);
    try {
      await circle.resolveAlert(id);
      setResolved(true);
    } finally {
      setResolving(false);
    }
  }

  if (resolved) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AppHeader title="Alert" backTo="/dashboard" />
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div
            role="status"
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'var(--success-tint-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '24px auto 18px',
            }}
          >
            <CheckIcon size={44} color="var(--success)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Marked resolved</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 26px' }}>
            Thanks for handling this. It's been cleared from {firstName}'s alerts.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader title="Alert" subtitle={circle.circle.seniorDisplayName} backTo="/dashboard" />

      <div style={{ padding: 22 }}>
        {/* Severity banner */}
        <div style={{ background: tint, borderRadius: 18, padding: 20, marginBottom: 20, borderLeft: `5px solid ${accent}` }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: accent,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '4px 10px',
              borderRadius: 999,
              marginBottom: 12,
            }}
          >
            <AlertCircleIcon size={13} color="#fff" /> {alert.severity}
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: 'var(--text)' }}>{alert.title}</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{alert.body}</p>
        </div>

        {/* Suggested actions */}
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          What you can do
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
          <ActionRow icon="📞" label={`Call ${firstName}`} sub="Reach out directly" onClick={() => {}} />
          <ActionRow
            icon="💬"
            label="Notify the caregiver"
            sub="Let Jenna know to check in"
            onClick={() => {}}
          />
          <ActionRow icon="◷" label="View today's doses" sub="See the full timeline" onClick={() => navigate('/dashboard')} />
        </div>

        <Button height={56} onClick={doResolve} disabled={resolving}>
          {resolving ? 'Resolving…' : 'Mark resolved'}
        </Button>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          Resolve once you've checked in or the issue has passed.
        </p>
      </div>
    </div>
  );
}

function ActionRow({
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
      <span aria-hidden="true" style={{ fontSize: 22, width: 40, textAlign: 'center' }}>
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
