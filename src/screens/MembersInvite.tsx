import { useState } from 'react';
import { useCircle } from '../lib/CircleContext';
import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { CheckIcon } from '../components/Icons';
import { ROLE_INFO, roleInfo, type Member, type Role } from '../lib/types';

export function MembersInvite() {
  const circle = useCircle();
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('CAREGIVER');
  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);
  const [bannerEmail, setBannerEmail] = useState<string | null>(null);

  const others = circle.members.filter((m) => !m.isSelf);
  const owner = circle.members.find((m) => m.isSelf);
  const isEmpty = others.length === 0;

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    const sentTo = inviteEmail;
    await circle.inviteMember(sentTo, selectedRole);
    setBannerEmail(sentTo);
    setInviteEmail('');
    window.setTimeout(() => setBannerEmail(null), 5000);
  }

  if (roleSelectorOpen) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <AppHeader title="Choose a role" backTo="" />
        <div style={{ padding: 22 }}>
          <button
            onClick={() => setRoleSelectorOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, marginBottom: 16, padding: 0 }}
          >
            ← Back
          </button>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: '0 0 20px' }}>
            Each role sees and does only what it needs. You can change this anytime.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLE_INFO.map((info) => {
              const selected = info.role === selectedRole;
              return (
                <button
                  key={info.role}
                  onClick={() => setSelectedRole(info.role)}
                  style={{
                    textAlign: 'left',
                    background: 'var(--surface)',
                    border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    boxShadow: selected ? 'var(--focus-ring-strong)' : 'none',
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{info.label}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: selected ? 'none' : '2px solid var(--border-strong)',
                        background: selected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && <CheckIcon size={13} color="#fff" />}
                    </span>
                  </div>
                  {selected && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: 8 }}>
                      SELECTED
                    </div>
                  )}
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 10px' }}>{info.oneLiner}</p>
                  {info.can.map((c) => (
                    <div key={c} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span style={{ color: 'var(--success)' }}>✓</span> {c}
                    </div>
                  ))}
                  {info.cant.map((c) => (
                    <div key={c} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>—</span> {c}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
          <div style={{ height: 20 }} />
          <Button onClick={() => setRoleSelectorOpen(false)}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title={circle.circle.seniorDisplayName} subtitle="Care circle" backTo="/dashboard" />

      <div style={{ flex: 1, padding: 22 }}>
        {bannerEmail && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              background: 'var(--success-tint-2)',
              border: '1px solid #C4DCCC',
              borderRadius: 16,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckIcon size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Invite sent</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                We emailed {bannerEmail} an invite to join as {roleInfo(selectedRole).label}. It expires in 7
                days.
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 20,
            boxShadow: 'var(--shadow-card)',
            marginBottom: 24,
          }}
        >
          <label htmlFor="invite-email" style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 8 }}>
            {isEmpty ? 'Invite someone to the circle' : 'Invite a member'}
          </label>
          <input
            id="invite-email"
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              padding: '0 14px',
              fontSize: 15,
              marginBottom: 10,
            }}
          />
          <RoleSelectorButton role={selectedRole} onClick={() => setRoleSelectorOpen(true)} />
          <div style={{ height: 12 }} />
          <Button onClick={sendInvite}>Send invite</Button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
          Members
        </div>

        {isEmpty ? (
          <>
            {owner && <MemberRow member={owner} />}
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 14, lineHeight: 1.5 }}>
              It's just you so far. Invite the people who help care for {circle.circle.seniorDisplayName.split(' ')[0]}.
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {circle.members.map((m) => (
              <MemberRow key={m.userId} member={m} highlight={m.email === bannerEmail} />
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}

function RoleSelectorButton({ role, onClick }: { role: Role; onClick: () => void }) {
  const info = roleInfo(role);
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>Role · {info.label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{info.oneLiner}</div>
    </button>
  );
}

function MemberRow({ member: m, highlight }: { member: Member; highlight?: boolean }) {
  const active = m.status === 'ACTIVE';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--surface)',
        border: highlight ? '1px solid #C4DCCC' : '1px solid var(--border)',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <Avatar initials={initials(m.name)} color={m.avatarColor} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{roleInfo(m.role).label}</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: active ? 'var(--success)' : 'var(--warning)',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--success)' : 'var(--warning)' }}
        />
        {active ? 'Active' : 'Invited'}
      </div>
    </div>
  );
}

function initials(name: string): string {
  if (name === 'You') return 'Y';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
