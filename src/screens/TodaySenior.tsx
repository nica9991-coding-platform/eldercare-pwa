import { useEffect, useState } from 'react';
import { useCircle } from '../lib/CircleContext';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { CapsuleIcon, CheckIcon, LeafIcon, OfflineIcon, SunsetIcon } from '../components/Icons';
import type { Dose } from '../lib/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const TODAY_LABEL = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

export function TodaySenior() {
  const circle = useCircle();
  const online = useOnlineStatus();
  const [justConfirmedId, setJustConfirmedId] = useState<string | null>(null);
  const seniorFirstName = circle.circle.seniorDisplayName.split(' ')[0];

  useEffect(() => {
    if (!justConfirmedId) return;
    const id = window.setTimeout(() => setJustConfirmedId(null), 2200);
    return () => window.clearTimeout(id);
  }, [justConfirmedId]);

  // A missed dose is already its own actionable card — don't also promote a
  // later pending dose to "due" and show two simultaneous prompts. It waits
  // as an upcoming card until the missed one is resolved.
  const hasUnresolvedMissed = circle.doses.some((d) => d.status === 'MISSED');
  const dueDose = hasUnresolvedMissed ? undefined : circle.doses.find((d) => d.status === 'PENDING');
  // Only the all-taken happy path gets the celebratory screen — a day with a
  // skip still has an actionable card (with Undo), so it never claims "you
  // took all of today's doses" when that isn't true.
  const allDone = circle.doses.length > 0 && circle.doses.every((d) => d.status === 'TAKEN');

  async function handleTookIt(dose: Dose) {
    await circle.logDose(dose.id, 'TAKEN');
    setJustConfirmedId(dose.id);
  }

  async function handleSkip(dose: Dose) {
    await circle.logDose(dose.id, 'SKIPPED');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '28px 28px 60px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div aria-live="polite" className="sr-only">
        {justConfirmedId ? 'Dose confirmed as taken.' : ''}
      </div>

      {!online && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--surface-sunken)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 18,
            color: 'var(--text-secondary)',
            fontSize: 17,
          }}
        >
          <OfflineIcon size={22} color="var(--text-secondary)" />
          You're offline — that's fine. Everything you tap is saved on this phone.
        </div>
      )}

      {allDone ? (
        <AllDoneState seniorFirstName={seniorFirstName} />
      ) : (
        <>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '8px 0 4px',
              color: 'var(--text)',
            }}
          >
            {greeting()}, {seniorFirstName}
          </h1>
          <p style={{ fontSize: 19, color: 'var(--text-secondary)', margin: '0 0 24px' }}>{TODAY_LABEL}</p>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '18px 20px',
              marginBottom: 22,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
              {circle.doneCount} of {circle.totalCount} done today
            </div>
            <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
              {circle.doses.map((d) => (
                <div
                  key={d.id}
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 999,
                    background: d.status === 'TAKEN' ? 'var(--success)' : 'var(--surface-sunken)',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {circle.doses.map((dose) => {
              if (justConfirmedId === dose.id) {
                return <ConfirmedCard key={dose.id} dose={dose} offline={!online} />;
              }
              if (dose.status === 'TAKEN') {
                return <CompactTakenCard key={dose.id} dose={dose} />;
              }
              if (dose.status === 'SKIPPED') {
                return <SkippedCard key={dose.id} dose={dose} onUndo={() => circle.undoSkip(dose.id)} />;
              }
              if (dose.status === 'MISSED') {
                return (
                  <MissedCard
                    key={dose.id}
                    dose={dose}
                    onTookIt={() => handleTookIt(dose)}
                    onSkip={() => handleSkip(dose)}
                  />
                );
              }
              // PENDING
              if (dose.id === dueDose?.id) {
                return (
                  <DueCard key={dose.id} dose={dose} onTookIt={() => handleTookIt(dose)} onSkip={() => handleSkip(dose)} />
                );
              }
              return <UpcomingCard key={dose.id} dose={dose} />;
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MedIconTile() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 60,
        height: 60,
        borderRadius: 18,
        background: 'var(--primary-tint)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <CapsuleIcon size={28} color="var(--primary)" />
    </div>
  );
}

function DueCard({ dose, onTookIt, onSkip }: { dose: Dose; onTookIt: () => void; onSkip: () => void }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '2px solid var(--primary)',
        borderRadius: 22,
        padding: 22,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
        <MedIconTile />
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{dose.medName}</div>
          <div style={{ fontSize: 21, color: 'var(--text-secondary)' }}>
            {dose.medDose} · {dose.scheduledFor}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onTookIt}
          style={{
            flex: '0 1 62%',
            height: 76,
            borderRadius: 18,
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontSize: 19,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: 'var(--shadow-primary)',
          }}
        >
          <CheckIcon size={22} color="#fff" /> Took it
        </button>
        <button
          onClick={onSkip}
          style={{
            flex: '0 1 38%',
            height: 76,
            borderRadius: 18,
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '2px solid var(--border-strong)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function ConfirmedCard({ dose, offline }: { dose: Dose; offline: boolean }) {
  return (
    <div
      className="pop-anim"
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--success)',
        color: '#fff',
        borderRadius: 26,
        padding: 26,
        textAlign: 'center',
        boxShadow: 'var(--shadow-success)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}
      >
        <CheckIcon size={32} color="#fff" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{dose.medName} — done</div>
      <div style={{ fontSize: 17, opacity: 0.92, marginBottom: 10 }}>
        {offline ? 'Saved · will sync when you’re back online' : `Taken just now, ${dose.loggedAt}`}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.95 }}>Nice. One more later today.</div>
    </div>
  );
}

function CompactTakenCard({ dose }: { dose: Dose }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--success-tint)',
        border: '1px solid #C4DCCC',
        borderRadius: 18,
        padding: '14px 18px',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckIcon size={18} color="#fff" />
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{dose.medName}</div>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          {dose.pendingSync ? 'Saved · will sync when you’re back online' : `Taken at ${dose.loggedAt}`}
        </div>
      </div>
    </div>
  );
}

function UpcomingCard({ dose }: { dose: Dose }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--surface-sunken)',
        borderRadius: 18,
        padding: '14px 18px',
        opacity: 0.85,
      }}
    >
      <MedIconTile />
      <div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{dose.medName}</div>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Later today · {dose.scheduledFor}</div>
      </div>
    </div>
  );
}

function SkippedCard({ dose, onUndo }: { dose: Dose; onUndo: () => void }) {
  return (
    <div
      style={{
        background: 'var(--warning-tint)',
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{dose.medName}</div>
      <div style={{ fontSize: 17, color: 'var(--warning)', fontWeight: 600, marginBottom: 16 }}>
        Skipped · that's okay, we noted it
      </div>
      <button
        onClick={onUndo}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 16,
          background: 'var(--surface)',
          border: '2px solid var(--primary)',
          color: 'var(--primary)',
          fontWeight: 700,
          fontSize: 17,
        }}
      >
        Undo — I did take it
      </button>
    </div>
  );
}

function MissedCard({ dose, onTookIt, onSkip }: { dose: Dose; onTookIt: () => void; onSkip: () => void }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '2px solid var(--warning)',
        borderRadius: 22,
        padding: 22,
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <MedIconTile />
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{dose.medName}</div>
          <div style={{ fontSize: 19, color: 'var(--warning)', fontWeight: 600 }}>Was due at {dose.scheduledFor}</div>
        </div>
      </div>
      <p style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '0 0 18px' }}>
        No rush — you can still mark it now. Did you take your {dose.scheduledFor.includes('AM') ? 'morning' : 'midday'} pill?
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onTookIt}
          style={{
            flex: '0 1 62%',
            height: 76,
            borderRadius: 18,
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            fontSize: 19,
            fontWeight: 700,
          }}
        >
          Took it
        </button>
        <button
          onClick={onSkip}
          style={{
            flex: '0 1 38%',
            height: 76,
            borderRadius: 18,
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            border: '2px solid var(--border-strong)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AllDoneState({ seniorFirstName }: { seniorFirstName: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 60 }}>
      <div
        style={{
          width: 132,
          height: 132,
          borderRadius: '50%',
          background: 'var(--success-tint-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 26px',
        }}
      >
        <LeafIcon size={56} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px' }}>All done for today</h1>
      <p style={{ fontSize: 19, color: 'var(--text-secondary)', margin: '0 0 22px', lineHeight: 1.5 }}>
        You took all of today's doses, {seniorFirstName}. Well done.
      </p>
      <div
        style={{
          display: 'inline-block',
          background: 'var(--primary-tint)',
          color: 'var(--primary)',
          fontWeight: 700,
          fontSize: 15,
          padding: '10px 18px',
          borderRadius: 999,
          marginBottom: 22,
        }}
      >
        Your family can see you're all set
      </div>
      <p style={{ fontSize: 18, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        See you tomorrow morning <SunsetIcon />
      </p>
    </div>
  );
}
