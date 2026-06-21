import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCircle } from '../lib/CircleContext';
import { setSimulatedOffline, useOnlineStatus } from '../lib/useOnlineStatus';

/**
 * Floating "preview controls" — not part of the product. Lets you reach every
 * design state (quiet/alert/loading/offline/etc.) without a real backend.
 */
export function DevPanel() {
  const [open, setOpen] = useState(false);
  const circle = useCircle();
  const online = useOnlineStatus();
  const navigate = useNavigate();

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      {open && (
        <div
          style={{
            background: 'var(--text)',
            color: '#fff',
            borderRadius: 14,
            padding: 16,
            width: 240,
            marginBottom: 10,
            fontSize: 13,
            boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, opacity: 0.7 }}>PREVIEW CONTROLS</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                borderRadius: 999,
                background: circle.mode === 'live' ? 'var(--success)' : 'rgba(255,255,255,0.18)',
              }}
            >
              {circle.mode === 'live' ? 'LIVE' : 'DEMO'}
            </span>
          </div>

          {circle.mode === 'live' && circle.noCircle && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ opacity: 0.6, marginBottom: 4 }}>No care circle yet for this account</div>
              <DevButtonRow
                options={[
                  {
                    label: 'Create "Eleanor Alvarez" circle',
                    active: false,
                    onClick: () => circle.createCircle('Eleanor Alvarez', 'EA', Intl.DateTimeFormat().resolvedOptions().timeZone),
                  },
                ]}
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ opacity: 0.6, marginBottom: 4 }}>Jump to screen</div>
            <DevButtonRow
              options={[
                { label: 'Entry', active: false, onClick: () => navigate('/') },
                { label: 'Onboarding', active: false, onClick: () => navigate('/onboard') },
                { label: 'Today (senior)', active: false, onClick: () => navigate('/today') },
                { label: 'Dashboard', active: false, onClick: () => navigate('/dashboard') },
                { label: 'Members', active: false, onClick: () => navigate('/members') },
                { label: 'Radar', active: false, onClick: () => navigate('/radar') },
                { label: 'More', active: false, onClick: () => navigate('/more') },
              ]}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ opacity: 0.6, marginBottom: 4 }}>Network</div>
            <DevButtonRow
              options={[
                { label: 'Online', active: online, onClick: () => setSimulatedOffline(false) },
                { label: 'Offline', active: !online, onClick: () => setSimulatedOffline(true) },
              ]}
            />
          </div>

          {circle.mode === 'demo' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ opacity: 0.6, marginBottom: 4 }}>Dashboard data</div>
                <DevButtonRow
                  options={[
                    { label: 'Quiet', active: circle.dashboardScenario === 'quiet', onClick: () => circle.setDashboardScenario('quiet') },
                    { label: 'Alert', active: circle.dashboardScenario === 'alert', onClick: () => circle.setDashboardScenario('alert') },
                    { label: 'Loading', active: circle.dashboardScenario === 'loading', onClick: () => circle.setDashboardScenario('loading') },
                    { label: 'First day', active: circle.dashboardScenario === 'empty', onClick: () => circle.setDashboardScenario('empty') },
                  ]}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ opacity: 0.6, marginBottom: 4 }}>Care circle</div>
                <DevButtonRow
                  options={[
                    { label: 'Just me', active: circle.membersScenario === 'empty', onClick: () => circle.setMembersScenario('empty') },
                    { label: 'Populated', active: circle.membersScenario === 'populated', onClick: () => circle.setMembersScenario('populated') },
                  ]}
                />
              </div>

              <div>
                <div style={{ opacity: 0.6, marginBottom: 4 }}>Today (senior)</div>
                <DevButtonRow
                  options={[
                    {
                      label: 'Mark due dose missed',
                      active: circle.doses.some((d) => d.status === 'MISSED'),
                      onClick: () => {
                        const due = circle.doses.find((d) => d.status === 'PENDING');
                        if (due) circle.setDoseStatus(due.id, 'MISSED');
                      },
                    },
                    {
                      label: 'Mark all taken',
                      active: circle.doneCount === circle.totalCount,
                      onClick: () => circle.doses.forEach((d) => circle.setDoseStatus(d.id, 'TAKEN')),
                    },
                    { label: 'Reset day', active: false, onClick: () => circle.resetDoses() },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Preview controls"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--text)',
          color: '#fff',
          fontSize: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        }}
      >
        ⚙
      </button>
    </div>
  );
}

function DevButtonRow({ options }: { options: { label: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => (
        <button
          key={opt.label}
          onClick={opt.onClick}
          style={{
            background: opt.active ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            padding: '5px 9px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
