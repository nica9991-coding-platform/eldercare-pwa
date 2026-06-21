import type { AppSyncResolverHandler } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { assertMembership, UnauthorizedError } from '../assert-membership/handler';
import { computeSeverity, generateSummaryText } from './summary';

const ddbClient = new DynamoDBClient();
const ddb = DynamoDBDocumentClient.from(ddbClient);
const ses = new SESv2Client();

const MEMBERSHIP_TABLE = process.env.MEMBERSHIP_TABLE_NAME!;
const MEDICATION_TABLE = process.env.MEDICATION_TABLE_NAME!;
const MEDICATION_CIRCLE_INDEX = process.env.MEDICATION_CIRCLE_INDEX_NAME!;
const DOSE_EVENT_TABLE = process.env.DOSE_EVENT_TABLE_NAME!;
const DOSE_EVENT_CIRCLE_INDEX = process.env.DOSE_EVENT_CIRCLE_INDEX_NAME!;
const ALERT_TABLE = process.env.ALERT_TABLE_NAME!;
const ALERT_CIRCLE_INDEX = process.env.ALERT_CIRCLE_INDEX_NAME!;
const DAILY_SUMMARY_TABLE = process.env.DAILY_SUMMARY_TABLE_NAME!;
const CARE_CIRCLE_TABLE = process.env.CARE_CIRCLE_TABLE_NAME!;
const SENDER = process.env.OTP_SENDER_EMAIL ?? 'no-reply@example.com';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

type Identity = { sub: string; claims?: { email?: string } };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getCircleDashboard(sub: string, circleId: string) {
  await assertMembership(MEMBERSHIP_TABLE, sub, circleId, 'VIEWER');
  const date = todayKey();

  const meds = (
    await ddb.send(
      new QueryCommand({
        TableName: MEDICATION_TABLE,
        IndexName: MEDICATION_CIRCLE_INDEX,
        KeyConditionExpression: 'circleId = :c',
        ExpressionAttributeValues: { ':c': circleId },
      }),
    )
  ).Items ?? [];

  let doses = (
    await ddb.send(
      new QueryCommand({
        TableName: DOSE_EVENT_TABLE,
        IndexName: DOSE_EVENT_CIRCLE_INDEX,
        KeyConditionExpression: 'circleId = :c AND #date = :d',
        ExpressionAttributeNames: { '#date': 'date' },
        ExpressionAttributeValues: { ':c': circleId, ':d': date },
      }),
    )
  ).Items ?? [];

  // First dashboard load of the day: materialize today's DoseEvents from
  // each medication's schedule so there's something to log against.
  const existingKeys = new Set(doses.map((d) => `${d.medicationId}-${d.scheduledForMinutes}`));
  const newDoses = [];
  for (const med of meds) {
    const schedule = (med.schedule ?? []) as Array<{ label: string; minutes: number }>;
    for (const slot of schedule) {
      const key = `${med.id}-${slot.minutes}`;
      if (existingKeys.has(key)) continue;
      const dose = {
        id: randomUUID(),
        circleId,
        date,
        medicationId: med.id,
        medName: med.name,
        medDose: med.dose,
        scheduledFor: slot.label,
        scheduledForMinutes: slot.minutes,
        status: 'PENDING',
      };
      await ddb.send(new PutCommand({ TableName: DOSE_EVENT_TABLE, Item: dose }));
      newDoses.push(dose);
    }
  }
  doses = [...doses, ...newDoses].sort((a, b) => a.scheduledForMinutes - b.scheduledForMinutes);

  const alerts = (
    (
      await ddb.send(
        new QueryCommand({
          TableName: ALERT_TABLE,
          IndexName: ALERT_CIRCLE_INDEX,
          KeyConditionExpression: 'circleId = :c',
          ExpressionAttributeValues: { ':c': circleId },
        }),
      )
    ).Items ?? []
  ).filter((a) => !a.resolvedAt);

  // CareCircle itself is ownerDefinedIn('ownerId') — only the OWNER could
  // read it via direct model access, but every member needs the senior's
  // name/initials for their own screens, so it rides along here too.
  const circle = (await ddb.send(new GetCommand({ TableName: CARE_CIRCLE_TABLE, Key: { id: circleId } }))).Item;

  // Severity computed deterministically (safety signal); the sentence is
  // written by Claude on Bedrock, with a deterministic fallback.
  const doseLikes = doses as unknown as Array<{ status: string; medName: string }>;
  const alertLikes = alerts as unknown as Array<{ severity: string; title: string; body: string }>;
  const severity = computeSeverity(doseLikes, alertLikes);
  const seniorFirstName = ((circle?.seniorDisplayName as string) ?? 'they').split(' ')[0];
  const text = await generateSummaryText(doseLikes, alertLikes, severity, seniorFirstName);
  const summary = { text, severity };

  await ddb.send(
    new PutCommand({
      TableName: DAILY_SUMMARY_TABLE,
      Item: { circleId, date, ...summary, updatedAt: new Date().toISOString() },
    }),
  );

  return { circle, meds, doses, alerts, summary };
}

async function logDose(
  sub: string,
  circleId: string,
  doseId: string,
  status: 'TAKEN' | 'SKIPPED',
) {
  await assertMembership(MEMBERSHIP_TABLE, sub, circleId, 'CAREGIVER');
  const loggedAt =
    status === 'TAKEN' ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined;

  const result = await ddb.send(
    new UpdateCommand({
      TableName: DOSE_EVENT_TABLE,
      Key: { id: doseId },
      UpdateExpression: 'SET #status = :status, recordedBy = :sub' + (loggedAt ? ', loggedAt = :loggedAt' : ''),
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':sub': sub,
        ...(loggedAt ? { ':loggedAt': loggedAt } : {}),
      },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return result.Attributes;
}

async function inviteMember(sub: string, circleId: string, email: string, role: string) {
  await assertMembership(MEMBERSHIP_TABLE, sub, circleId, 'OWNER');

  // NOTE: scaffold-level invite — the membership row uses a placeholder
  // userId until the invited person actually signs in and an accept-invite
  // flow links it to their real Cognito sub. Wiring that token-resolution
  // mutation is a follow-up once this is deployed for real.
  const membership = {
    circleId,
    userId: `pending-${randomUUID()}`,
    email,
    name: email.split('@')[0],
    role,
    status: 'INVITED',
    invitedAt: new Date().toISOString(),
  };
  await ddb.send(new PutCommand({ TableName: MEMBERSHIP_TABLE, Item: membership }));

  const circle = await ddb.send(new GetCommand({ TableName: MEMBERSHIP_TABLE, Key: { circleId, userId: sub } }));
  const inviterName = circle.Item?.name ?? 'Someone';

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: SENDER,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: "You've been invited to a Kindred care circle" },
          Body: {
            Text: {
              Data: `${inviterName} invited you to join their care circle as ${role}. Open ${APP_URL}/?invite=${circleId} to accept.`,
            },
          },
        },
      },
    }),
  );

  return membership;
}

async function listMembers(sub: string, circleId: string) {
  await assertMembership(MEMBERSHIP_TABLE, sub, circleId, 'VIEWER');
  return (
    await ddb.send(
      new QueryCommand({
        TableName: MEMBERSHIP_TABLE,
        KeyConditionExpression: 'circleId = :c',
        ExpressionAttributeValues: { ':c': circleId },
      }),
    )
  ).Items ?? [];
}

async function getCircleHistory(sub: string, circleId: string, days: number) {
  await assertMembership(MEMBERSHIP_TABLE, sub, circleId, 'VIEWER');

  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);

    const doses =
      (
        await ddb.send(
          new QueryCommand({
            TableName: DOSE_EVENT_TABLE,
            IndexName: DOSE_EVENT_CIRCLE_INDEX,
            KeyConditionExpression: 'circleId = :c AND #date = :d',
            ExpressionAttributeNames: { '#date': 'date' },
            ExpressionAttributeValues: { ':c': circleId, ':d': date },
          }),
        )
      ).Items ?? [];

    out.push({
      date,
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      taken: doses.filter((x) => x.status === 'TAKEN').length,
      total: doses.length,
      doses: doses
        .slice()
        .sort((a, b) => (a.scheduledForMinutes as number) - (b.scheduledForMinutes as number))
        .map((x) => ({ medName: x.medName, scheduledFor: x.scheduledFor, status: x.status })),
    });
  }
  return out;
}

async function createCircle(
  sub: string,
  email: string | undefined,
  seniorDisplayName: string,
  seniorInitials: string,
  timezone: string,
) {
  // The one op with nothing to assertMembership against yet — anyone
  // authenticated may start a circle, becoming its OWNER.
  const circle = {
    id: randomUUID(),
    seniorDisplayName,
    seniorInitials,
    timezone,
    ownerId: sub,
  };
  await ddb.send(new PutCommand({ TableName: CARE_CIRCLE_TABLE, Item: circle }));

  const ownerMembership = {
    circleId: circle.id,
    userId: sub,
    email: email ?? 'unknown@example.com',
    name: email ? email.split('@')[0] : 'You',
    role: 'OWNER',
    status: 'ACTIVE',
  };
  await ddb.send(new PutCommand({ TableName: MEMBERSHIP_TABLE, Item: ownerMembership }));

  return circle;
}

export const handler: AppSyncResolverHandler<Record<string, unknown>, unknown> = async (event) => {
  const identity = event.identity as Identity | null;
  const sub = identity?.sub;
  if (!sub) throw new UnauthorizedError('No authenticated identity');

  try {
    switch (event.info.fieldName) {
      case 'getCircleDashboard':
        return await getCircleDashboard(sub, event.arguments.circleId as string);
      case 'logDose':
        return await logDose(
          sub,
          event.arguments.circleId as string,
          event.arguments.doseId as string,
          event.arguments.status as 'TAKEN' | 'SKIPPED',
        );
      case 'inviteMember':
        return await inviteMember(
          sub,
          event.arguments.circleId as string,
          event.arguments.email as string,
          event.arguments.role as string,
        );
      case 'listMembers':
        return await listMembers(sub, event.arguments.circleId as string);
      case 'getCircleHistory':
        return await getCircleHistory(
          sub,
          event.arguments.circleId as string,
          (event.arguments.days as number) ?? 7,
        );
      case 'createCircle':
        return await createCircle(
          sub,
          identity?.claims?.email,
          event.arguments.seniorDisplayName as string,
          event.arguments.seniorInitials as string,
          event.arguments.timezone as string,
        );
      default:
        throw new Error(`Unknown field: ${event.info.fieldName}`);
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw new Error(`Unauthorized: ${err.message}`, { cause: err });
    }
    throw err;
  }
};
