import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { circleResolver } from '../functions/circle-resolver/resource';

/**
 * Multi-party authorization spine: CareCircle -> Membership -> Role.
 * Membership is the single source of truth for "who can touch this circle,
 * at what role" — every other model just carries a circleId. All
 * multi-party reads/writes go through the three custom ops below, each
 * guarded by assertMembership() inside circleResolver; raw model CRUD is
 * intentionally not exposed beyond a coarse authenticated() gate.
 */
const schema = a.schema({
  Role: a.enum(['OWNER', 'FAMILY', 'CAREGIVER', 'CLINICIAN', 'VIEWER']),
  MemberStatus: a.enum(['ACTIVE', 'INVITED', 'REVOKED']),
  DoseStatus: a.enum(['PENDING', 'TAKEN', 'MISSED', 'SKIPPED']),
  AlertSeverity: a.enum(['WARN', 'URGENT']),
  NoteVisibility: a.enum(['CIRCLE', 'CLINICAL']),

  CareCircle: a
    .model({
      seniorDisplayName: a.string().required(),
      seniorInitials: a.string().required(),
      timezone: a.string().required(),
      ownerId: a.string().required(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('ownerId')]),

  Membership: a
    .model({
      circleId: a.id().required(),
      userId: a.string().required(),
      email: a.email().required(),
      name: a.string().required(),
      role: a.ref('Role').required(),
      status: a.ref('MemberStatus').required(),
      avatarColor: a.string(),
      invitedAt: a.datetime(),
    })
    .identifier(['circleId', 'userId'])
    .authorization((allow) => [allow.ownerDefinedIn('userId')]),

  Medication: a
    .model({
      circleId: a.id().required(),
      name: a.string().required(),
      dose: a.string().required(),
      schedule: a.json(), // [{ label: "8:00 AM", minutes: 480 }, ...]
      instructions: a.string(),
      isClinical: a.boolean().default(false),
    })
    .secondaryIndexes((index) => [index('circleId').name('byCircle')])
    .authorization((allow) => [allow.authenticated()]),

  DoseEvent: a
    .model({
      circleId: a.id().required(),
      date: a.string().required(), // YYYY-MM-DD, scopes "today's doses"
      medicationId: a.id().required(),
      medName: a.string().required(),
      medDose: a.string().required(),
      scheduledFor: a.string().required(),
      scheduledForMinutes: a.integer().required(),
      status: a.ref('DoseStatus').required(),
      loggedAt: a.string(),
      recordedBy: a.string(),
    })
    .secondaryIndexes((index) => [index('circleId').sortKeys(['date']).name('byCircleAndDate')])
    .authorization((allow) => [allow.authenticated()]),

  Note: a
    .model({
      circleId: a.id().required(),
      body: a.string().required(),
      visibility: a.ref('NoteVisibility').required(),
      authorSub: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()]),

  Alert: a
    .model({
      circleId: a.id().required(),
      severity: a.ref('AlertSeverity').required(),
      title: a.string().required(),
      body: a.string().required(),
      resolvedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [index('circleId').name('byCircle')])
    .authorization((allow) => [allow.authenticated()]),

  DailySummary: a
    .model({
      circleId: a.id().required(),
      date: a.string().required(), // YYYY-MM-DD
      text: a.string().required(),
      severity: a.string().required(), // QUIET | WARN | URGENT
      updatedAt: a.string().required(),
    })
    .identifier(['circleId', 'date'])
    .authorization((allow) => [allow.authenticated()]),

  // ---- Membership-guarded surface: the only way the client touches
  // multi-party data. Field redaction (e.g. clinical notes) happens inside
  // the resolver, never on the client. ----

  getCircleDashboard: a
    .query()
    .arguments({ circleId: a.id().required() })
    .returns(a.json())
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),

  logDose: a
    .mutation()
    .arguments({
      circleId: a.id().required(),
      doseId: a.id().required(),
      status: a.ref('DoseStatus').required(),
    })
    .returns(a.ref('DoseEvent'))
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),

  inviteMember: a
    .mutation()
    .arguments({
      circleId: a.id().required(),
      email: a.email().required(),
      role: a.ref('Role').required(),
    })
    .returns(a.ref('Membership'))
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),

  // Membership's own auth is ownerDefinedIn('userId') — a direct list()
  // only ever returns the caller's own row, never the rest of the circle's
  // roster. The Members screen needs everyone, so that's a guarded op too.
  listMembers: a
    .query()
    .arguments({ circleId: a.id().required() })
    .returns(a.json())
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),

  // Per-day adherence for the History view — aggregates DoseEvents over the
  // last `days` days, membership-guarded like every other multi-party read.
  getCircleHistory: a
    .query()
    .arguments({ circleId: a.id().required(), days: a.integer() })
    .returns(a.json())
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),

  // The one bootstrap op with no membership to check yet — anyone
  // authenticated can create a circle, becoming its OWNER.
  createCircle: a
    .mutation()
    .arguments({
      seniorDisplayName: a.string().required(),
      seniorInitials: a.string().required(),
      timezone: a.string().required(),
    })
    .returns(a.ref('CareCircle'))
    .handler(a.handler.function(circleResolver))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
