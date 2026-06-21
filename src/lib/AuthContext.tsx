import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAmplifyLive } from './amplifyClient';

interface InviteToken {
  token: string;
  circleSeniorName: string;
  seniorInitials: string;
  role: string;
  invitedBy: string;
  expiresInDays: number;
  expired: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  authReady: boolean;
  userEmail: string | null;
  mode: 'live' | 'demo';
  sendCode: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  signOut: () => void;
  pendingInvite: InviteToken | null;
  resolveInvite: (token: string) => void;
  clearInvite: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// A token starting with "expired" simulates an expired/invalid invite.
function lookupInvite(token: string): InviteToken {
  const expired = token.startsWith('expired');
  return {
    token,
    circleSeniorName: 'Eleanor Alvarez',
    seniorInitials: 'EA',
    role: 'Family',
    invitedBy: 'Rosa Alvarez',
    expiresInDays: 6,
    expired,
  };
}

const DEMO_VALID_CODE = '123456';

export function AuthProvider({ children }: { children: ReactNode }) {
  const live = isAmplifyLive();
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !live && localStorage.getItem('kindred-auth') === 'true',
  );
  const [authReady, setAuthReady] = useState(!live);
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('kindred-email'));
  const [pendingInvite, setPendingInvite] = useState<InviteToken | null>(null);

  useEffect(() => {
    if (!live) return;
    (async () => {
      try {
        const { getCurrentUser } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        setIsAuthenticated(true);
        setUserEmail(user.signInDetails?.loginId ?? null);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthReady(true);
      }
    })();
  }, [live]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      authReady,
      userEmail,
      mode: live ? 'live' : 'demo',

      sendCode: async (email: string) => {
        if (live) {
          const { signIn } = await import('aws-amplify/auth');
          await signIn({ username: email, options: { authFlowType: 'CUSTOM_WITHOUT_SRP' } });
        }
        setUserEmail(email);
      },

      verifyCode: async (code: string) => {
        if (live) {
          const { confirmSignIn } = await import('aws-amplify/auth');
          const result = await confirmSignIn({ challengeResponse: code });
          if (!result.isSignedIn) throw new Error('Invalid or expired code');
          setIsAuthenticated(true);
        } else {
          if (code !== DEMO_VALID_CODE) throw new Error('Invalid or expired code');
          localStorage.setItem('kindred-auth', 'true');
          if (userEmail) localStorage.setItem('kindred-email', userEmail);
          setIsAuthenticated(true);
        }
      },

      signOut: () => {
        if (live) {
          import('aws-amplify/auth').then(({ signOut: amplifySignOut }) => amplifySignOut());
        }
        localStorage.removeItem('kindred-auth');
        localStorage.removeItem('kindred-email');
        setUserEmail(null);
        setIsAuthenticated(false);
      },

      resolveInvite: (token: string) => setPendingInvite(lookupInvite(token)),
      clearInvite: () => setPendingInvite(null),
      pendingInvite,
    }),
    [isAuthenticated, authReady, userEmail, pendingInvite, live],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
