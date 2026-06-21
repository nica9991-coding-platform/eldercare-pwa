export type Role = 'OWNER' | 'FAMILY' | 'CAREGIVER' | 'CLINICIAN' | 'VIEWER';
export type MemberStatus = 'ACTIVE' | 'INVITED';
export type DoseStatus = 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
export type AlertSeverity = 'WARN' | 'URGENT';
export type SummarySeverity = 'QUIET' | 'WARN' | 'URGENT';

export interface CareCircle {
  id: string;
  seniorDisplayName: string;
  seniorInitials: string;
  timezone: string;
  ownerId: string;
}

export interface Member {
  userId: string;
  circleId: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  avatarColor: 'teal' | 'terracotta' | 'slate' | 'gray';
  isSelf?: boolean;
  invitedAt?: string;
}

export interface Medication {
  id: string;
  circleId: string;
  name: string;
  dose: string;
  schedule?: ScheduleSlot[];
  iconGlyph?: 'capsule';
}

export interface ScheduleSlot {
  label: string; // e.g. "8:00 AM"
  minutes: number; // minutes since midnight, for sorting/dose generation
}

export interface Dose {
  id: string;
  circleId: string;
  medicationId: string;
  medName: string;
  medDose: string;
  scheduledFor: string; // e.g. "8:00 AM"
  scheduledForMinutes: number; // minutes since midnight, for sorting/window math
  status: DoseStatus;
  loggedAt?: string;
  pendingSync?: boolean;
}

export interface Alert {
  id: string;
  circleId: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  createdAt: string;
}

export interface DailySummary {
  text: string;
  severity: SummarySeverity;
  updatedAt: string;
}

export interface RoleInfo {
  role: Role;
  label: string;
  oneLiner: string;
  can: string[];
  cant: string[];
}

export const ROLE_INFO: RoleInfo[] = [
  {
    role: 'OWNER',
    label: 'Owner',
    oneLiner: 'Full control of the circle',
    can: ['Manage members, meds, full care plan', 'See everything incl. clinical notes'],
    cant: [],
  },
  {
    role: 'FAMILY',
    label: 'Family',
    oneLiner: 'Stay informed & supportive',
    can: ['See daily summary, alerts, notes', 'Add notes'],
    cant: ['Edit meds or care plan'],
  },
  {
    role: 'CAREGIVER',
    label: 'Caregiver',
    oneLiner: 'Hands-on daily care',
    can: ['Log doses, edit medication list', 'See summary & alerts'],
    cant: ['See clinical notes'],
  },
  {
    role: 'CLINICIAN',
    label: 'Clinician',
    oneLiner: 'Clinical oversight',
    can: ['See full med history & clinical notes', 'Add clinical notes'],
    cant: ['Manage members'],
  },
  {
    role: 'VIEWER',
    label: 'Viewer',
    oneLiner: 'Read-only peace of mind',
    can: ['See daily summary'],
    cant: ['Add notes or make changes'],
  },
];

export function roleInfo(role: Role): RoleInfo {
  return ROLE_INFO.find((r) => r.role === role)!;
}
