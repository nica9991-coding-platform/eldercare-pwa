import { useNavigate } from 'react-router-dom';
import { useCircle } from '../lib/CircleContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { AlertCircleIcon, BrandMark, CheckIcon, XIcon } from '../components/Icons';
import type { Alert, Dose } from '../lib/types';

export function DashboardFamily() {
  const circle = useCircle();
  const navigate = useNavigate();

  if (circle.dashboardScenario === 'loading' || circle.loading) {
    return (
      <Shell>
        <div style={{ padding: 22 }}>
          <div className="skeleton" style={{ height: 56, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 120, marginBottom: 16 }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 60, marginBottom: 10 }} />
          ))}
        </div>
      </Shell>
    );
  }

  if (circle.mode === 'live' && circle.noCircle) {
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BrandMark size={48} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Let's set up a care circle</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            You're signed in, but this account doesn't have a care circle yet. Take a minute to create one and
            add the medications you'll be tracking.
          </p>
          <Button onClick={() => navigate('/onboard')}>Get started</Button>
        </div>
      </Shell>
    );
  }

  if (circle.dashboardScenario === 'empty') {
    return (
      <Shell>
        <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BrandMark size={48} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>You're all set up</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {circle.circle.seniorDisplayName.split(' ')[0]}'s daily summary and dose updates will appear here as
            soon as her first doses are logged.
          </p>
          <div
            style={{
              width: '100%',
              background: 'var(--primary-tint)',
              borderRadius: 16,
              padding: 16,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--primary)',
            }}
          >
            First doses are scheduled for tomorrow, 8:00 AM
          </div>
          <Button variant="outline" onClick={() => navigate('/members')}>
            Review {circle.circle.seniorDisplayName.split(' ')[0]}'s med schedule
          </Button>
        </div>
      </Shell>
    );
  }

  const isAlertDay = circle.dashboardScenario === 'alert';

  return (
    <Shell>
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar initials={circle.circle.seniorInitials} size={52} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{circle.circle.seniorDisplayName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isAlertDay ? 'var(--warning)' : 'var(--success)',
                }}
              />
              Last check-in 8:15 AM
            </div>
          </div>
        </div>

        <SummaryHero severity={circle.summary.severity} text={circle.summary.text} updatedAt={circle.summary.updatedAt} />

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '24px 0 12px' }}>
          Today
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {circle.doses.map((dose) => (
            <DoseRow key={dose.id} dose={dose} />
          ))}
        </div>

        {circle.alerts.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '24px 0 12px' }}>
              Alerts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {circle.alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onClick={() => navigate(`/alert/${alert.id}`)} />
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => navigate('/radar')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%',
            textAlign: 'left',
            background: 'var(--primary-tint)',
            border: 'none',
            borderRadius: 16,
            padding: '14px 16px',
            marginTop: 18,
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>✦</span>
          Ask Radar about {circle.circle.seniorDisplayName.split(' ')[0]}'s week
          <span aria-hidden="true" style={{ marginLeft: 'auto' }}>›</span>
        </button>

        <button
          onClick={() => navigate('/history')}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: 15,
            padding: '20px 0 8px',
          }}
        >
          View this week's history →
        </button>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }} aria-hidden="true">
          {circle.weekStrip.map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 10,
                borderRadius: 999,
                background:
                  d === 'taken' ? 'var(--success)' : d === 'partial' ? 'var(--warning)' : 'var(--surface-sunken)',
              }}
            />
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>{children}</div>
      <BottomTabBar />
    </div>
  );
}

function SummaryHero({ severity, text, updatedAt }: { severity: string; text: string; updatedAt: string }) {
  const isQuiet = severity === 'QUIET';
  return (
    <div
      style={{
        background: isQuiet ? '#EAF1EC' : '#F8ECEA',
        border: `1px solid ${isQuiet ? '#C4DCCC' : '#E6BFB8'}`,
        borderRadius: 22,
        padding: 22,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: isQuiet ? 'var(--success)' : 'var(--urgent)', marginBottom: 12 }}>
        ✦ TODAY, IN A SENTENCE
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isQuiet ? 'var(--success)' : 'var(--urgent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isQuiet ? <CheckIcon size={18} color="#fff" /> : <span style={{ color: '#fff', fontWeight: 800 }}>!</span>}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, color: 'var(--text)' }}>{text}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{updatedAt}</div>
        </div>
      </div>
    </div>
  );
}

function DoseRow({ dose }: { dose: Dose }) {
  const missed = dose.status === 'MISSED';
  const taken = dose.status === 'TAKEN';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: missed ? 'var(--urgent-tint)' : 'var(--surface)',
        border: missed ? '1px solid var(--urgent-border)' : '1px solid var(--border)',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: taken ? 'var(--success)' : missed ? 'var(--urgent)' : 'transparent',
          border: !taken && !missed ? '2px dashed var(--border-strong)' : 'none',
        }}
      >
        {taken && <CheckIcon size={14} color="#fff" />}
        {missed && <XIcon size={14} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{dose.medName}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{dose.scheduledFor}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: missed ? 'var(--urgent)' : taken ? 'var(--success)' : 'var(--text-muted)' }}>
        {taken ? 'Taken' : missed ? 'Missed' : dose.status === 'SKIPPED' ? 'Skipped' : 'Upcoming'}
      </div>
    </div>
  );
}

function AlertCard({ alert, onClick }: { alert: Alert; onClick: () => void }) {
  const urgent = alert.severity === 'URGENT';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        background: urgent ? 'var(--urgent-tint-2)' : 'var(--warning-tint-2)',
        borderRadius: 14,
        overflow: 'hidden',
        border: 'none',
        textAlign: 'left',
        width: '100%',
        padding: 0,
      }}
    >
      <div style={{ width: 5, background: urgent ? 'var(--urgent)' : 'var(--warning)', flexShrink: 0 }} aria-hidden="true" />
      <div style={{ padding: 14, flex: 1 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: urgent ? 'var(--urgent)' : 'var(--warning)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '3px 8px',
            borderRadius: 999,
            marginBottom: 8,
          }}
        >
          <AlertCircleIcon size={12} color="#fff" /> {alert.severity}
        </span>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {alert.title}
          <span aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{alert.body}</div>
      </div>
    </button>
  );
}
