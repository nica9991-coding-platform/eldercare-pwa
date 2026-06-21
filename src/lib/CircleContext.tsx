import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MOCK_ALERTS_ACTIVE,
  MOCK_CIRCLE,
  MOCK_MEDICATIONS,
  MOCK_MEMBERS,
  SUMMARY_ALERT,
  SUMMARY_QUIET,
  WEEK_STRIP,
  makeTodayDoses,
} from './mockData';
import type { Alert, CareCircle, DailySummary, Dose, Medication, Member, Role } from './types';
import { clearQueue, enqueueDoseLog, getQueue } from './offlineQueue';
import { getSimulatedOffline, useOnlineStatus } from './useOnlineStatus';
import { client, isAmplifyLive } from './amplifyClient';
import { useAuth } from './AuthContext';

export type DashboardScenario = 'quiet' | 'alert' | 'loading' | 'empty';
export type MembersScenario = 'empty' | 'populated';

interface CircleState {
  mode: 'live' | 'demo';
  loading: boolean;
  noCircle: boolean;
  circle: CareCircle;
  members: Member[];
  medications: Medication[];
  doses: Dose[];
  alerts: Alert[];
  summary: DailySummary;
  weekStrip: typeof WEEK_STRIP;
  dashboardScenario: DashboardScenario;
  setDashboardScenario: (s: DashboardScenario) => void;
  membersScenario: MembersScenario;
  setMembersScenario: (s: MembersScenario) => void;
  logDose: (doseId: string, status: 'TAKEN' | 'SKIPPED') => Promise<void>;
  setDoseStatus: (doseId: string, status: Dose['status']) => void;
  undoSkip: (doseId: string) => void;
  resetDoses: () => void;
  inviteMember: (email: string, role: Role) => Promise<Member>;
  createCircle: (seniorDisplayName: string, seniorInitials: string, timezone: string) => Promise<void>;
  doneCount: number;
  totalCount: number;
}

const CircleContext = createContext<CircleState | null>(null);

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// --- Mapping helpers: the live resolver returns plain DynamoDB items, this
// reshapes them into the exact types every screen already expects. ---

function mapMember(raw: Record<string, unknown>): Member {
  return {
    userId: raw.userId as string,
    circleId: raw.circleId as string,
    name: raw.name as string,
    email: raw.email as string,
    role: raw.role as Role,
    status: raw.status as Member['status'],
    avatarColor: (raw.avatarColor as Member['avatarColor']) ?? 'gray',
    invitedAt: raw.invitedAt as string | undefined,
  };
}

function mapDose(raw: Record<string, unknown>): Dose {
  return {
    id: raw.id as string,
    circleId: raw.circleId as string,
    medicationId: raw.medicationId as string,
    medName: raw.medName as string,
    medDose: raw.medDose as string,
    scheduledFor: raw.scheduledFor as string,
    scheduledForMinutes: raw.scheduledForMinutes as number,
    status: raw.status as Dose['status'],
    loggedAt: raw.loggedAt as string | undefined,
  };
}

function mapAlert(raw: Record<string, unknown>): Alert {
  return {
    id: raw.id as string,
    circleId: raw.circleId as string,
    severity: raw.severity as Alert['severity'],
    title: raw.title as string,
    body: raw.body as string,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

export function CircleProvider({ children }: { children: ReactNode }) {
  const live = isAmplifyLive();
  const auth = useAuth();
  const online = useOnlineStatus();

  const [members, setMembers] = useState<Member[]>(live ? [] : MOCK_MEMBERS);
  const [doses, setDoses] = useState<Dose[]>(live ? [] : makeTodayDoses());
  const [dashboardScenario, setDashboardScenario] = useState<DashboardScenario>('quiet');
  const [membersScenario, setMembersScenarioState] = useState<MembersScenario>('populated');

  // Live-only state — demo mode derives circle/alerts/summary from the
  // scenario toggles below instead.
  const [liveCircle, setLiveCircle] = useState<CareCircle | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [liveSummary, setLiveSummary] = useState<DailySummary>(SUMMARY_QUIET);
  const [liveCircleId, setLiveCircleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(live);
  const [noCircle, setNoCircle] = useState(false);
  const replaying = useRef(false);

  async function loadDashboard(circleId: string) {
    const res = await client.queries.getCircleDashboard({ circleId });
    const payload = res.data as unknown as {
      circle: Record<string, unknown>;
      doses: Record<string, unknown>[];
      alerts: Record<string, unknown>[];
      summary: { text: string; severity: DailySummary['severity'] };
    };
    if (payload.circle) {
      setLiveCircle({
        id: payload.circle.id as string,
        seniorDisplayName: payload.circle.seniorDisplayName as string,
        seniorInitials: payload.circle.seniorInitials as string,
        timezone: payload.circle.timezone as string,
        ownerId: payload.circle.ownerId as string,
      });
    }
    setDoses(payload.doses.map(mapDose).sort((a, b) => a.scheduledForMinutes - b.scheduledForMinutes));
    setLiveAlerts(payload.alerts.map(mapAlert));
    setLiveSummary({ ...payload.summary, updatedAt: 'Updated just now' });

    const membersRes = await client.queries.listMembers({ circleId });
    setMembers((membersRes.data as unknown as Record<string, unknown>[]).map(mapMember));
  }

  // Live bootstrap: find the caller's circle (if any) and load it.
  useEffect(() => {
    if (!live || !auth.isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const membershipsRes = await client.models.Membership.list();
        const mine = (membershipsRes.data ?? []).filter((m) => m.status === 'ACTIVE');
        if (cancelled) return;
        if (mine.length === 0) {
          setNoCircle(true);
          setLoading(false);
          return;
        }
        const circleId = mine[0].circleId;
        setLiveCircleId(circleId);
        await loadDashboard(circleId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, auth.isAuthenticated]);

  // Replay the offline dose-log queue once back online.
  useEffect(() => {
    if (!live || !online || !liveCircleId || replaying.current) return;
    replaying.current = true;
    (async () => {
      const queue = await getQueue();
      for (const entry of queue) {
        try {
          await client.mutations.logDose({
            circleId: liveCircleId,
            doseId: entry.doseId,
            status: entry.status,
          });
        } catch {
          replaying.current = false;
          return; // stop on first failure; leftover entries stay queued
        }
      }
      await clearQueue();
      await loadDashboard(liveCircleId);
      replaying.current = false;
    })();
  }, [live, online, liveCircleId]);

  const setMembersScenario = (s: MembersScenario) => {
    if (live) return; // dev-only scenario toggle, demo mode only
    setMembersScenarioState(s);
    setMembers(s === 'empty' ? MOCK_MEMBERS.filter((m) => m.isSelf) : MOCK_MEMBERS);
  };

  const setDoseStatus = (doseId: string, status: Dose['status']) => {
    if (live) return; // dev-only scenario toggle, demo mode only
    setDoses((prev) => prev.map((d) => (d.id === doseId ? { ...d, status, pendingSync: false } : d)));
  };

  const logDose = async (doseId: string, status: 'TAKEN' | 'SKIPPED') => {
    const loggedAt = status === 'TAKEN' ? nowLabel() : undefined;
    const offline = getSimulatedOffline() || !navigator.onLine;

    setDoses((prev) =>
      prev.map((d) => (d.id === doseId ? { ...d, status, loggedAt: loggedAt ?? d.loggedAt, pendingSync: offline } : d)),
    );

    if (offline) {
      await enqueueDoseLog({ doseId, status, loggedAt: loggedAt ?? '', queuedAt: Date.now() });
      return;
    }

    if (live && liveCircleId) {
      await client.mutations.logDose({ circleId: liveCircleId, doseId, status });
    }
  };

  const undoSkip = async (doseId: string) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === doseId ? { ...d, status: 'TAKEN', loggedAt: nowLabel(), pendingSync: false } : d)),
    );
    if (live && liveCircleId) {
      await client.mutations.logDose({ circleId: liveCircleId, doseId, status: 'TAKEN' });
    }
  };

  const resetDoses = () => {
    if (live) return; // dev-only scenario toggle, demo mode only
    setDoses(makeTodayDoses());
  };

  const inviteMember = async (email: string, role: Role): Promise<Member> => {
    if (live && liveCircleId) {
      const res = await client.mutations.inviteMember({ circleId: liveCircleId, email, role });
      const newMember = mapMember(res.data as unknown as Record<string, unknown>);
      setMembers((prev) => [...prev, newMember]);
      return newMember;
    }
    const newMember: Member = {
      userId: `user-${Date.now()}`,
      circleId: MOCK_CIRCLE.id,
      name: email.split('@')[0],
      email,
      role,
      status: 'INVITED',
      avatarColor: 'gray',
      invitedAt: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, newMember]);
    return newMember;
  };

  const createCircle = async (seniorDisplayName: string, seniorInitials: string, timezone: string) => {
    if (!live) return;
    const res = await client.mutations.createCircle({ seniorDisplayName, seniorInitials, timezone });
    const circle = res.data as unknown as Record<string, unknown>;
    setLiveCircleId(circle.id as string);
    setNoCircle(false);
    await loadDashboard(circle.id as string);
  };

  const doneCount = doses.filter((d) => d.status === 'TAKEN').length;

  const value = useMemo<CircleState>(
    () => ({
      mode: live ? 'live' : 'demo',
      loading,
      noCircle,
      circle: live ? liveCircle ?? MOCK_CIRCLE : MOCK_CIRCLE,
      members,
      medications: MOCK_MEDICATIONS,
      doses,
      alerts: live ? liveAlerts : dashboardScenario === 'alert' ? MOCK_ALERTS_ACTIVE : [],
      summary: live ? liveSummary : dashboardScenario === 'alert' ? SUMMARY_ALERT : SUMMARY_QUIET,
      weekStrip: WEEK_STRIP,
      dashboardScenario,
      setDashboardScenario,
      membersScenario,
      setMembersScenario,
      logDose,
      setDoseStatus,
      undoSkip,
      resetDoses,
      inviteMember,
      createCircle,
      doneCount,
      totalCount: doses.length,
    }),
    // The handler functions below are intentionally omitted: they're plain
    // closures recreated every render (not useCallback-wrapped), so listing
    // them would defeat this memo without changing behavior — they always
    // close over the latest state regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, loading, noCircle, liveCircle, liveAlerts, liveSummary, members, doses, dashboardScenario, membersScenario, doneCount],
  );

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

export function useCircle(): CircleState {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error('useCircle must be used within CircleProvider');
  return ctx;
}
