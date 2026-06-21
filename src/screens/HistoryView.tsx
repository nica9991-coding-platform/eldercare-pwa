import { useState } from 'react';
import { useCircle } from '../lib/CircleContext';
import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import { CheckIcon, XIcon } from '../components/Icons';
import type { DoseStatus, HistoryDay } from '../lib/types';

function adherencePct(days: HistoryDay[]): number {
  const taken = days.reduce((s, d) => s + d.taken, 0);
  const total = days.reduce((s, d) => s + d.total, 0);
  return total === 0 ? 0 : Math.round((taken / total) * 100);
}

export function HistoryView() {
  const circle = useCircle();
  const days = circle.history;
  const [openDate, setOpenDate] = useState<string | null>(null);

  if (circle.loading) {
    return (
      <Shell>
        <div style={{ padding: 22 }}>
          <div className="skeleton" style={{ height: 96, marginBottom: 16 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, marginBottom: 10 }} />
          ))}
        </div>
      </Shell>
    );
  }

  const pct = adherencePct(days);

  return (
    <Shell>
      <AppHeader title="This week" subtitle={circle.circle.seniorDisplayName} backTo="/dashboard" />
      <div style={{ padding: 22 }}>
        {/* Adherence summary card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 22,
            padding: 22,
            boxShadow: 'var(--shadow-card)',
            marginBottom: 22,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            7-day adherence
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--urgent)' }}>
              {pct}%
            </span>
            <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>of doses taken</span>
          </div>
          {/* week strip, oldest -> newest */}
          <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            {[...days].reverse().map((d) => {
              const ratio = d.total === 0 ? 0 : d.taken / d.total;
              const color = ratio === 1 ? 'var(--success)' : ratio > 0 ? 'var(--warning)' : 'var(--surface-sunken)';
              return <div key={d.date} style={{ flex: 1, height: 36, borderRadius: 8, background: color }} title={d.label} />;
            })}
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          Day by day
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {days.map((d, i) => (
            <DayRow
              key={d.date}
              day={d}
              isToday={i === 0}
              open={openDate === d.date}
              onToggle={() => setOpenDate(openDate === d.date ? null : d.date)}
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

function DayRow({
  day,
  isToday,
  open,
  onToggle,
}: {
  day: HistoryDay;
  isToday: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const perfect = day.total > 0 && day.taken === day.total;
  const hasMiss = day.doses.some((x) => x.status === 'MISSED');

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          background: 'none',
          border: 'none',
          textAlign: 'left',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: perfect ? 'var(--success-tint)' : hasMiss ? 'var(--urgent-tint)' : 'var(--surface-sunken)',
            color: perfect ? 'var(--success)' : hasMiss ? 'var(--urgent)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {day.weekday}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {isToday ? 'Today' : day.label}
          </div>
          <div style={{ fontSize: 14, color: hasMiss ? 'var(--urgent)' : 'var(--text-muted)' }}>
            {day.taken} of {day.total} taken
            {hasMiss ? ' · 1 missed' : perfect ? ' · all clear' : ''}
          </div>
        </div>
        <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: 18, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>
          ›
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px 70px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {day.doses.map((dose, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusDot status={dose.status} />
              <span style={{ fontSize: 15, flex: 1 }}>{dose.medName}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{dose.scheduledFor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: DoseStatus }) {
  if (status === 'TAKEN') {
    return (
      <span aria-label="Taken" style={dotStyle('var(--success)')}>
        <CheckIcon size={12} color="#fff" />
      </span>
    );
  }
  if (status === 'MISSED') {
    return (
      <span aria-label="Missed" style={dotStyle('var(--urgent)')}>
        <XIcon size={12} color="#fff" />
      </span>
    );
  }
  if (status === 'SKIPPED') {
    return <span aria-label="Skipped" style={{ ...dotStyle('var(--warning)'), fontSize: 11, color: '#fff', fontWeight: 700 }}>–</span>;
  }
  return <span aria-label="Upcoming" style={{ ...dotStyle('transparent'), border: '2px dashed var(--border-strong)' }} />;
}

function dotStyle(bg: string): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: bg,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
