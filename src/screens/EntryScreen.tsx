import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { BrandMark, CheckIcon, ClockIcon, AlertCircleIcon, ChevronLeftIcon } from '../components/Icons';

type Stage = 'email' | 'code' | 'error' | 'invite' | 'accepted' | 'expired';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 42;

export function EntryScreen() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite');

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [emailError, setEmailError] = useState<string | null>(null);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (inviteToken) {
      auth.resolveInvite(inviteToken);
      setStage(inviteToken.startsWith('expired') ? 'expired' : 'invite');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  useEffect(() => {
    if (stage !== 'code') return;
    setResendIn(RESEND_SECONDS);
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [stage]);

  async function submitEmail() {
    if (!email.trim()) return;
    setEmailError(null);
    try {
      await auth.sendCode(email);
      setDigits(Array(CODE_LENGTH).fill(''));
      setStage('code');
    } catch {
      setEmailError("Couldn't send a code to that address. Check it and try again.");
    }
  }

  function handleDigitChange(i: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleDigitKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      pasted.split('').forEach((d, idx) => (next[idx] = d));
      return next;
    });
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function verifyCode() {
    try {
      await auth.verifyCode(digits.join(''));
      navigate('/dashboard');
    } catch {
      setStage('error');
    }
  }

  async function resendCode() {
    setDigits(Array(CODE_LENGTH).fill(''));
    try {
      await auth.sendCode(email);
    } catch {
      // already on the code screen; the user can retry Verify or back out
    }
    setStage('code');
  }

  const codeComplete = digits.every((d) => d !== '');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <BrandMark />
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.01em' }}>Kindred</span>
        </div>

        {stage === 'email' && (
          <div>
            {(stage as Stage) === 'email' && (
              <button
                aria-label="Try the invite demo"
                onClick={() => navigate('/?invite=demo-token-1')}
                style={{ display: 'block', margin: '0 auto 18px', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-muted)' }}
              >
                Have an invite link? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Try the demo</span>
              </button>
            )}
            <h1 style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Welcome back
            </h1>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 28px' }}>
              Enter your email and we'll send you a sign-in code.
            </p>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
              style={inputStyle()}
            />
            {emailError && (
              <p role="alert" style={{ color: 'var(--urgent)', fontSize: 13, margin: '8px 0 0' }}>
                {emailError}
              </p>
            )}
            <div style={{ height: 14 }} />
            <Button height={58} onClick={submitEmail}>
              Send code
            </Button>
            <button
              onClick={() => {}}
              style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}
            >
              New here? Create an account
            </button>
          </div>
        )}

        {(stage === 'code' || stage === 'error') && (
          <div>
            <button
              onClick={() => setStage('email')}
              aria-label="Back to email entry"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 14, padding: 4, marginLeft: -4 }}
            >
              <ChevronLeftIcon size={18} /> Back
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Enter your code
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 24px' }}>
              We sent a 6-digit code to <strong>{email || 'your email'}</strong>.
            </p>

            <div role="group" aria-label="6-digit verification code" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    if (el) inputRefs.current[i] = el;
                  }}
                  aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={handlePaste}
                  style={{
                    width: 44,
                    height: 64,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    borderRadius: 13,
                    border: stage === 'error' ? '2px solid var(--urgent)' : '2px solid var(--border-strong)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              ))}
            </div>

            {stage === 'error' && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: 'var(--urgent-tint)',
                  border: '1px solid var(--urgent-border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginTop: 18,
                  color: 'var(--urgent)',
                  fontSize: 14,
                }}
              >
                <AlertCircleIcon size={18} color="var(--urgent)" />
                <span>That code didn't work or has expired. Try again, or send yourself a new one.</span>
              </div>
            )}

            <div style={{ height: 22 }} />
            {stage === 'error' ? (
              <Button height={58} onClick={resendCode}>
                Send a new code
              </Button>
            ) : (
              <Button height={58} onClick={verifyCode} disabled={!codeComplete}>
                Verify
              </Button>
            )}

            {stage === 'code' && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 16 }}>
                {resendIn > 0 ? (
                  `Resend in 0:${String(resendIn).padStart(2, '0')}`
                ) : (
                  <button onClick={resendCode} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                    Resend code
                  </button>
                )}
              </p>
            )}
          </div>
        )}

        {stage === 'invite' && auth.pendingInvite && (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              padding: 26,
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 16 }}>
              YOU'RE INVITED
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Avatar initials={auth.pendingInvite.seniorInitials} size={64} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
              {auth.pendingInvite.circleSeniorName}'s care circle
            </h2>
            <span
              style={{
                display: 'inline-block',
                background: 'var(--primary-tint)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: 13,
                padding: '6px 14px',
                borderRadius: 999,
                marginBottom: 14,
              }}
            >
              Role · {auth.pendingInvite.role}
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, margin: '0 0 22px' }}>
              You'll be able to see daily summaries, alerts, and notes — but you won't be able to edit
              medications or the care plan.
            </p>
            <Button
              height={56}
              onClick={() => {
                if (auth.mode === 'demo') {
                  setStage('accepted');
                } else {
                  // Real invite-token redemption (linking the invited email
                  // to a Cognito sub) isn't wired into the backend yet — see
                  // the placeholder-userId note in circle-resolver's
                  // inviteMember. Fall back to a normal sign-in for now.
                  auth.clearInvite();
                  setStage('email');
                }
              }}
            >
              Accept & sign in
            </Button>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>
              Invited by {auth.pendingInvite.invitedBy} · Expires in {auth.pendingInvite.expiresInDays} days
            </p>
          </div>
        )}

        {stage === 'accepted' && auth.pendingInvite && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--success-tint-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 22px',
              }}
            >
              <CheckIcon size={44} color="var(--success)" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>You're in</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 26px' }}>
              You've joined {auth.pendingInvite.circleSeniorName}'s care circle as {auth.pendingInvite.role}.
            </p>
            <Button
              height={56}
              onClick={async () => {
                // Reachable only in demo mode (see the accept button above) —
                // sendCode/verifyCode are no-ops against the network here.
                await auth.sendCode('invited-member@example.com');
                await auth.verifyCode('123456');
                auth.clearInvite();
                navigate('/dashboard');
              }}
            >
              Go to {auth.pendingInvite.circleSeniorName.split(' ')[0]}'s circle
            </Button>
          </div>
        )}

        {stage === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--warning-tint-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 22px',
              }}
            >
              <ClockIcon size={44} color="var(--warning)" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>This invite has expired</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, margin: '0 0 26px' }}>
              No worries — ask whoever invited you to send a fresh one, or sign in if you already have an
              account.
            </p>
            <Button height={56} onClick={() => navigate('/')}>
              Request a new invite
            </Button>
            <button
              onClick={() => {
                auth.clearInvite();
                navigate('/');
                setStage('email');
              }}
              style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14 }}
            >
              Sign in instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    height: 58,
    fontSize: 16,
    padding: '0 16px',
    borderRadius: 14,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };
}
