import type { Alert, CareCircle, DailySummary, Dose, Medication, Member } from './types';

export const MOCK_CIRCLE: CareCircle = {
  id: 'circle-1',
  seniorDisplayName: 'Eleanor Alvarez',
  seniorInitials: 'EA',
  timezone: 'America/Winnipeg',
  ownerId: 'user-rosa',
};

export const MOCK_MEMBERS: Member[] = [
  {
    userId: 'user-rosa',
    circleId: 'circle-1',
    name: 'You',
    email: 'rosa@example.com',
    role: 'OWNER',
    status: 'ACTIVE',
    avatarColor: 'teal',
    isSelf: true,
  },
  {
    userId: 'user-marcus',
    circleId: 'circle-1',
    name: 'Marcus Alvarez',
    email: 'marcus@example.com',
    role: 'FAMILY',
    status: 'ACTIVE',
    avatarColor: 'terracotta',
  },
  {
    userId: 'user-jenna',
    circleId: 'circle-1',
    name: 'Jenna Cole',
    email: 'jenna@example.com',
    role: 'CAREGIVER',
    status: 'ACTIVE',
    avatarColor: 'slate',
  },
  {
    userId: 'user-priya',
    circleId: 'circle-1',
    name: 'Dr. Priya Nair',
    email: 'priya@example.com',
    role: 'CLINICIAN',
    status: 'ACTIVE',
    avatarColor: 'gray',
  },
  {
    userId: 'user-tom',
    circleId: 'circle-1',
    name: 'Tom Alvarez',
    email: 'tom@example.com',
    role: 'VIEWER',
    status: 'INVITED',
    avatarColor: 'terracotta',
    invitedAt: new Date().toISOString(),
  },
];

export const MOCK_MEDICATIONS: Medication[] = [
  { id: 'med-1', circleId: 'circle-1', name: 'Metformin', dose: '500mg', iconGlyph: 'capsule' },
  { id: 'med-2', circleId: 'circle-1', name: 'Lisinopril', dose: '10mg', iconGlyph: 'capsule' },
  { id: 'med-3', circleId: 'circle-1', name: 'Atorvastatin', dose: '20mg', iconGlyph: 'capsule' },
];

export function makeTodayDoses(): Dose[] {
  return [
    {
      id: 'dose-1',
      circleId: 'circle-1',
      medicationId: 'med-1',
      medName: 'Metformin',
      medDose: '500mg',
      scheduledFor: '8:00 AM',
      scheduledForMinutes: 8 * 60,
      status: 'TAKEN',
      loggedAt: '8:12 AM',
    },
    {
      id: 'dose-2',
      circleId: 'circle-1',
      medicationId: 'med-2',
      medName: 'Lisinopril',
      medDose: '10mg',
      scheduledFor: '12:00 PM',
      scheduledForMinutes: 12 * 60,
      status: 'PENDING',
    },
    {
      id: 'dose-3',
      circleId: 'circle-1',
      medicationId: 'med-3',
      medName: 'Atorvastatin',
      medDose: '20mg',
      scheduledFor: '6:00 PM',
      scheduledForMinutes: 18 * 60,
      status: 'PENDING',
    },
  ];
}

export const MOCK_ALERTS_QUIET: Alert[] = [];

export const MOCK_ALERTS_ACTIVE: Alert[] = [
  {
    id: 'alert-1',
    circleId: 'circle-1',
    severity: 'URGENT',
    title: 'Metformin missed',
    body: 'Due 12:00 PM, not logged 40 min after the window. Tap to call Eleanor or notify Rosa.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    circleId: 'circle-1',
    severity: 'WARN',
    title: 'No check-in since 9 AM',
    body: "Eleanor hasn't opened the app in 5 hours. Probably fine — a quick call can confirm.",
    createdAt: new Date().toISOString(),
  },
];

export const SUMMARY_QUIET: DailySummary = {
  text: 'Quiet day — all meds taken, no concerns.',
  severity: 'QUIET',
  updatedAt: 'Updated 2 min ago',
};

export const SUMMARY_ALERT: DailySummary = {
  text: 'Heads up — afternoon dose missed, and no check-in since 9 AM.',
  severity: 'URGENT',
  updatedAt: 'Updated just now',
};

export const WEEK_STRIP: Array<'taken' | 'partial' | 'future'> = [
  'taken',
  'taken',
  'partial',
  'taken',
  'taken',
  'future',
  'future',
];
