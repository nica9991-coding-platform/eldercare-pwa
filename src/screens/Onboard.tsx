import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCircle, type DraftMedication } from '../lib/CircleContext';
import { Button } from '../components/Button';
import { BrandMark, CapsuleIcon, CheckIcon, XIcon } from '../components/Icons';
import type { ScheduleSlot } from '../lib/types';

type Step = 1 | 2 | 3;

const PRESET_SLOTS: Array<{ key: string; label: string; time: string; minutes: number }> = [
  { key: 'morning', label: 'Morning', time: '8:00 AM', minutes: 8 * 60 },
  { key: 'noon', label: 'Noon', time: '12:00 PM', minutes: 12 * 60 },
  { key: 'evening', label: 'Evening', time: '6:00 PM', minutes: 18 * 60 },
  { key: 'bedtime', label: 'Bedtime', time: '10:00 PM', minutes: 22 * 60 },
];

const COMMON_TIMEZONES = [
  'America/Winnipeg',
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'Europe/London',
  'UTC',
];

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Winnipeg';
  } catch {
    return 'America/Winnipeg';
  }
}

// "14:30" -> { label: "2:30 PM", minutes: 870 }
function parseCustomTime(value: string): ScheduleSlot | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const minutes = h * 60 + min;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { label: `${h12}:${String(min).padStart(2, '0')} ${period}`, minutes };
}

export function Onboard() {
  const circle = useCircle();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [seniorName, setSeniorName] = useState('');
  const [timezone, setTimezone] = useState(guessTimezone);
  const [meds, setMeds] = useState<DraftMedication[]>([]);
  const [addingMed, setAddingMed] = useState(false);
  const [saving, setSaving] = useState(false);

  // in-progress medication form
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medSlots, setMedSlots] = useState<ScheduleSlot[]>([]);
  const [customTime, setCustomTime] = useState('');

  const firstName = seniorName.trim().split(/\s+/)[0] || 'them';

  function togglePreset(p: (typeof PRESET_SLOTS)[number]) {
    setMedSlots((prev) =>
      prev.some((s) => s.minutes === p.minutes)
        ? prev.filter((s) => s.minutes !== p.minutes)
        : [...prev, { label: p.time, minutes: p.minutes }].sort((a, b) => a.minutes - b.minutes),
    );
  }

  function addCustomTime() {
    const slot = parseCustomTime(customTime);
    if (!slot) return;
    setMedSlots((prev) =>
      prev.some((s) => s.minutes === slot.minutes)
        ? prev
        : [...prev, slot].sort((a, b) => a.minutes - b.minutes),
    );
    setCustomTime('');
  }

  function resetMedForm() {
    setMedName('');
    setMedDose('');
    setMedSlots([]);
    setCustomTime('');
  }

  function saveMed() {
    if (!medName.trim() || medSlots.length === 0) return;
    setMeds((prev) => [...prev, { name: medName.trim(), dose: medDose.trim(), schedule: medSlots }]);
    resetMedForm();
    setAddingMed(false);
  }

  async function finish() {
    setSaving(true);
    try {
      await circle.completeOnboarding(seniorName.trim(), timezone, meds);
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <BrandMark size={30} />
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>Kindred</span>
      </div>

      <StepIndicator step={step} />

      {/* ---------- Step 1: who ---------- */}
      {step === 1 && (
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Who are you caring for?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 26px' }}>
            We'll set up a care circle around them. You can change any of this later.
          </p>

          <label htmlFor="senior-name" style={labelStyle}>
            Their name
          </label>
          <input
            id="senior-name"
            value={seniorName}
            onChange={(e) => setSeniorName(e.target.value)}
            placeholder="e.g. Eleanor Alvarez"
            style={inputStyle}
          />

          <label htmlFor="tz" style={{ ...labelStyle, marginTop: 18 }}>
            Their time zone
          </label>
          <select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} style={inputStyle}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <div style={{ height: 28 }} />
          <Button height={56} disabled={!seniorName.trim()} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      )}

      {/* ---------- Step 2: meds (+ adding-med sub-state) ---------- */}
      {step === 2 && !addingMed && (
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {firstName}'s medications
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 22px' }}>
            Add each medication and when it's taken. This is what {firstName} will confirm each day.
          </p>

          {meds.length === 0 ? (
            <div
              style={{
                background: 'var(--surface-sunken)',
                borderRadius: 18,
                padding: '28px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 15,
                marginBottom: 18,
              }}
            >
              No medications yet. Add the first one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {meds.map((m, i) => (
                <MedSummaryCard key={i} med={m} onRemove={() => setMeds((prev) => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}

          <Button variant="outline" height={52} onClick={() => setAddingMed(true)}>
            + Add a medication
          </Button>

          <div style={{ height: 24 }} />
          <Button height={56} disabled={meds.length === 0} onClick={() => setStep(3)}>
            Review setup
          </Button>
          <button onClick={() => setStep(1)} style={textBtnStyle}>
            Back
          </button>
        </div>
      )}

      {step === 2 && addingMed && (
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Add a medication
          </h1>

          <label htmlFor="med-name" style={labelStyle}>
            Name
          </label>
          <input
            id="med-name"
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            placeholder="e.g. Metformin"
            style={inputStyle}
          />

          <label htmlFor="med-dose" style={{ ...labelStyle, marginTop: 18 }}>
            Dose <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
          </label>
          <input
            id="med-dose"
            value={medDose}
            onChange={(e) => setMedDose(e.target.value)}
            placeholder="e.g. 500mg"
            style={inputStyle}
          />

          <div style={{ ...labelStyle, marginTop: 18 }}>When is it taken?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {PRESET_SLOTS.map((p) => {
              const active = medSlots.some((s) => s.minutes === p.minutes);
              return (
                <button
                  key={p.key}
                  onClick={() => togglePreset(p)}
                  aria-pressed={active}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: active ? '2px solid var(--primary)' : '1px solid var(--border-strong)',
                    background: active ? 'var(--primary-tint)' : 'var(--surface)',
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {p.label} · {p.time}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              aria-label="Custom time"
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <Button variant="outline" height={48} fullWidth={false} onClick={addCustomTime} style={{ padding: '0 18px' }}>
              Add time
            </Button>
          </div>

          {medSlots.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {medSlots.map((s) => (
                <span
                  key={s.minutes}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px 6px 12px',
                    borderRadius: 999,
                    background: 'var(--primary-tint)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {s.label}
                  <button
                    onClick={() => setMedSlots((prev) => prev.filter((x) => x.minutes !== s.minutes))}
                    aria-label={`Remove ${s.label}`}
                    style={{ background: 'none', border: 'none', display: 'flex', padding: 2, color: 'var(--primary)' }}
                  >
                    <XIcon size={14} color="var(--primary)" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Button height={56} disabled={!medName.trim() || medSlots.length === 0} onClick={saveMed}>
            Save medication
          </Button>
          <button
            onClick={() => {
              resetMedForm();
              setAddingMed(false);
            }}
            style={textBtnStyle}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ---------- Step 3: review ---------- */}
      {step === 3 && (
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Review {firstName}'s setup
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 22px' }}>
            Looks good? You can always adjust this later from the care circle.
          </p>

          <div style={cardStyle}>
            <div style={sectionLabelStyle}>Care circle for</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{seniorName}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{timezone.replace(/_/g, ' ')}</div>
          </div>

          <div style={{ ...sectionLabelStyle, margin: '20px 0 10px' }}>
            Medications ({meds.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {meds.map((m, i) => (
              <MedSummaryCard key={i} med={m} />
            ))}
          </div>

          <Button height={56} onClick={finish} disabled={saving}>
            {saving ? 'Setting up…' : `Finish — go to ${firstName}'s circle`}
          </Button>
          <button onClick={() => setStep(2)} style={textBtnStyle}>
            Back to medications
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const labels = ['Who', 'Medications', 'Review'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} aria-label={`Step ${step} of 3`}>
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} style={{ flex: 1 }}>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: done || active ? 'var(--primary)' : 'var(--surface-sunken)',
                marginBottom: 6,
              }}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: active ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MedSummaryCard({ med, onRemove }: { med: DraftMedication; onRemove?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...cardStyle, marginBottom: 0 }}>
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--primary-tint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CapsuleIcon size={22} color="var(--primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {med.name}
          {med.dose ? <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> · {med.dose}</span> : null}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {med.schedule.map((s) => s.label).join(', ')}
        </div>
      </div>
      {onRemove ? (
        <button onClick={onRemove} aria-label={`Remove ${med.name}`} style={{ background: 'none', border: 'none', padding: 6, color: 'var(--text-muted)', display: 'flex' }}>
          <XIcon size={18} />
        </button>
      ) : (
        <CheckIcon size={18} color="var(--success)" />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 52,
  fontSize: 16,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  marginBottom: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 8,
  color: 'var(--text)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 18,
  boxShadow: 'var(--shadow-card)',
};

const textBtnStyle: React.CSSProperties = {
  display: 'block',
  margin: '16px auto 0',
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: 14,
};
