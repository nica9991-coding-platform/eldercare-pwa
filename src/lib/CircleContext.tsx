import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MOCK_ALERTS_ACTIVE,
  MOCK_CIRCLE,
  MOCK_MEDICATIONS,
  MOCK_MEMBERS,
  SUMMARY_QUIET,
  WEEK_STRIP,
  makeMockHistory,
  makeTodayDoses,
} from './mockData';
import type {
  Alert,
  CareCircle,
  DailySummary,
  Dose,
  HistoryDay,
  Medication,
  Member,
  Role,
  ScheduleSlot,
} from './types';
import { clearQueue, enqueueDoseLog, getQueue } from './offlineQueue';
import { getSimulatedOffline, useOnlineStatus } from './useOnlineStatus';
import { client, isAmplifyLive } from './amplifyClient';
import { useAuth } from './AuthContext';
import { deriveSummary } from './summary';
import { answerRadar } from './radar';

export type DashboardScenario = 'quiet' | 'alert' | 'loading' | 'empty';
export type MembersScenario = 'empty' | 'populated';

export interface DraftMedication {
  name: string;
  dose: string;
  schedule: ScheduleSlot[];
}

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
  history: HistoryDay[];
  dashboardScenario: DashboardScenario;
  setDashboardScenario: (s: DashboardScenario) => void;
  membersScenario: MembersScenario;
  setMembersScenario: (s: MembersScenario) => void;
  getAlertById: (id: string) => Alert | undefined;
  resolveAlert: (id: string) => Promise<void>;
  askRadar: (question: string) => Promise<string>;
  logDose: (doseId: string, status: 'TAKEN' | 'SKIPPED') => Promise<void>;
  setDoseStatus: (doseId: string, status: Dose['status']) => void;
  undoSkip: (doseId: string) => void;
  resetDoses: () => void;
  inviteMember: (email: string, role: Role) => Promise<Member>;
  createCircle: (seniorDisplayName: string, seniorInitials: string, timezone: string) => Promise<void>;
  completeOnboarding: (seniorDisplayName: string, timezone: string, meds: DraftMedication[]) => Promise<void>;
  doneCount: number;
  totalCount: number;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

// Stable across renders so the History view's memo deps don't thrash.
const MOCK_HISTORY: HistoryDay[] = makeMockHistory();

export function CircleProvider({ children }: { children: ReactNode }) {
  const live = isAmplifyLive();
  const auth = useAuth();
  const online = useOnlineStatus();

  const [members, setMembers] = useState<Member[]>(live ? [] : MOCK_MEMBERS);
  const [doses, setDoses] = useState<Dose[]>(live ? [] : makeTodayDoses());
  const [dashboardScenario, setDashboardScenario] = useState<DashboardScenario>('quiet');
  const [membersScenario, setMembersScenarioState] = useState<MembersScenario>('populated');

  // Demo-mode onboarding result: once the user completes the onboarding flow
  // without a backend, these override the canned mock circle/meds so the
  // dashboard and Today screen reflect what they just entered.
  const [demoCircleOverride, setDemoCircleOverride] = useState<CareCircle | null>(null);
  const [demoMedsOverride, setDemoMedsOverride] = useState<Medication[] | null>(null);

  // Live-only state — demo mode derives circle/alerts/summary from the
  // scenario toggles below instead.
  const [liveCircle, setLiveCircle] = useState<CareCircle | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [liveSummary, setLiveSummary] = useState<DailySummary>(SUMMARY_QUIET);
  const [liveCircleId, setLiveCircleId] = useState<string | null>(null);
  const [liveHistory, setLiveHistory] = useState<HistoryDay[] | null>(null);
  const [resolvedAlertIds, setResolvedAlertIds] = useState<Set<string>>(new Set());
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

    const historyRes = await client.queries.getCircleHistory({ circleId, days: 7 });
    setLiveHistory(historyRes.data as unknown as HistoryDay[]);
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

  const completeOnboarding = async (
    seniorDisplayName: string,
    timezone: string,
    meds: DraftMedication[],
  ) => {
    const seniorInitials = initialsFor(seniorDisplayName);

    if (live) {
      const res = await client.mutations.createCircle({ seniorDisplayName, seniorInitials, timezone });
      const circle = res.data as unknown as Record<string, unknown>;
      const circleId = circle.id as string;
      // Medication has authenticated() auth, so the owner can create rows
      // directly; the resolver materializes today's doses on first dashboard
      // load from each med's schedule.
      await Promise.all(
        meds.map((m) =>
          client.models.Medication.create({
            circleId,
            name: m.name,
            dose: m.dose,
            schedule: m.schedule,
          }),
        ),
      );
      setLiveCircleId(circleId);
      setNoCircle(false);
      await loadDashboard(circleId);
      return;
    }

    // Demo mode: build the circle, meds, and today's PENDING doses locally so
    // the rest of the app reflects what was just entered.
    const circleId = `demo-${Date.now()}`;
    const newCircle: CareCircle = {
      id: circleId,
      seniorDisplayName,
      seniorInitials,
      timezone,
      ownerId: 'user-rosa',
    };
    const newMeds: Medication[] = meds.map((m, i) => ({
      id: `demo-med-${i}`,
      circleId,
      name: m.name,
      dose: m.dose,
      schedule: m.schedule,
      iconGlyph: 'capsule',
    }));
    const newDoses: Dose[] = newMeds
      .flatMap((m) =>
        (m.schedule ?? []).map((slot, j) => ({
          id: `demo-dose-${m.id}-${j}`,
          circleId,
          medicationId: m.id,
          medName: m.name,
          medDose: m.dose,
          scheduledFor: slot.label,
          scheduledForMinutes: slot.minutes,
          status: 'PENDING' as const,
        })),
      )
      .sort((a, b) => a.scheduledForMinutes - b.scheduledForMinutes);

    setDemoCircleOverride(newCircle);
    setDemoMedsOverride(newMeds);
    setDoses(newDoses);
    setMembers([
      {
        userId: 'user-rosa',
        circleId,
        name: 'You',
        email: 'rosa@example.com',
        role: 'OWNER',
        status: 'ACTIVE',
        avatarColor: 'teal',
        isSelf: true,
      },
    ]);
    setMembersScenarioState('empty');
    // First-day empty state is the natural landing right after setup.
    setDashboardScenario('empty');
  };

  const doneCount = doses.filter((d) => d.status === 'TAKEN').length;

  // Demo summary derived from real dose/alert state so the hero reflects what
  // actually happened (a missed dose names the med, etc.). Live mode replaces
  // the sentence with a Claude-on-Bedrock generation server-side; see
  // amplify/functions/circle-resolver/summary.ts.
  const demoCircleName = (demoCircleOverride ?? MOCK_CIRCLE).seniorDisplayName.split(' ')[0];
  // Active alerts = source minus any the user has resolved this session.
  const sourceAlerts = live ? liveAlerts : dashboardScenario === 'alert' ? MOCK_ALERTS_ACTIVE : [];
  const activeAlerts = sourceAlerts.filter((a) => !resolvedAlertIds.has(a.id));
  const demoSummary = deriveSummary(doses, activeAlerts, demoCircleName);

  const getAlertById = (id: string) => sourceAlerts.find((a) => a.id === id);

  const resolveAlert = async (id: string) => {
    setResolvedAlertIds((prev) => new Set(prev).add(id));
    if (live && liveCircleId) {
      await client.mutations.resolveAlert({ circleId: liveCircleId, alertId: id });
      await loadDashboard(liveCircleId);
    }
  };

  const askRadar = async (question: string): Promise<string> => {
    const ctx = {
      seniorFirstName: (live ? liveCircle ?? MOCK_CIRCLE : demoCircleOverride ?? MOCK_CIRCLE).seniorDisplayName.split(
        ' ',
      )[0],
      doses,
      history: liveHistory ?? MOCK_HISTORY,
      alerts: activeAlerts,
    };
    if (live && liveCircleId) {
      try {
        const res = await client.queries.askRadar({ circleId: liveCircleId, question });
        const text = (res.data as unknown as { answer?: string })?.answer;
        if (text) return text;
      } catch {
        // fall through to deterministic answer
      }
    }
    return answerRadar(question, ctx);
  };

  const value = useMemo<CircleState>(
    () => ({
      mode: live ? 'live' : 'demo',
      loading,
      noCircle,
      circle: live ? liveCircle ?? MOCK_CIRCLE : demoCircleOverride ?? MOCK_CIRCLE,
      members,
      medications: live ? MOCK_MEDICATIONS : demoMedsOverride ?? MOCK_MEDICATIONS,
      doses,
      alerts: activeAlerts,
      getAlertById,
      resolveAlert,
      askRadar,
      summary: live ? liveSummary : demoSummary,
      weekStrip: WEEK_STRIP,
      history: liveHistory ?? MOCK_HISTORY,
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
      completeOnboarding,
      doneCount,
      totalCount: doses.length,
    }),
    // The handler functions below are intentionally omitted: they're plain
    // closures recreated every render (not useCallback-wrapped), so listing
    // them would defeat this memo without changing behavior — they always
    // close over the latest state regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, loading, noCircle, liveCircle, liveAlerts, liveSummary, liveHistory, resolvedAlertIds, members, doses, dashboardScenario, membersScenario, demoCircleOverride, demoMedsOverride, doneCount],
  );

  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

export function useCircle(): CircleState {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error('useCircle must be used within CircleProvider');
  return ctx;
}
