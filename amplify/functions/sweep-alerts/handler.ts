import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient();
const ddb = DynamoDBDocumentClient.from(ddbClient);

const CARE_CIRCLE_TABLE = process.env.CARE_CIRCLE_TABLE_NAME!;
const DOSE_EVENT_TABLE = process.env.DOSE_EVENT_TABLE_NAME!;
const DOSE_EVENT_CIRCLE_INDEX = process.env.DOSE_EVENT_CIRCLE_INDEX_NAME!;
const ALERT_TABLE = process.env.ALERT_TABLE_NAME!;

const MISSED_WINDOW_MINUTES = 40;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Runs on an EventBridge schedule (~every 15 min, wired in backend.ts).
 * For each circle, flips any PENDING dose whose window has passed into
 * MISSED and writes a URGENT alert — idempotently, via a deterministic
 * alert id, so re-runs never duplicate or un-resolve an alert a human
 * already dismissed.
 *
 * NOTE: the "no check-in since 9am" WARN alert from the design isn't
 * implemented here yet — it needs a presence/heartbeat record (last time
 * the senior opened the Today screen) that doesn't exist in the schema
 * yet. Follow-up once this is deployed: add a `lastSeenAt` field to
 * Membership (or a small Presence model) updated on Today-screen load.
 */
export const handler: Handler = async () => {
  const date = todayKey();
  const minutesNow = nowMinutes();

  const circles = (await ddb.send(new ScanCommand({ TableName: CARE_CIRCLE_TABLE }))).Items ?? [];

  for (const circle of circles) {
    const doses =
      (
        await ddb.send(
          new QueryCommand({
            TableName: DOSE_EVENT_TABLE,
            IndexName: DOSE_EVENT_CIRCLE_INDEX,
            KeyConditionExpression: 'circleId = :c AND #date = :d',
            ExpressionAttributeNames: { '#date': 'date' },
            ExpressionAttributeValues: { ':c': circle.id, ':d': date },
          }),
        )
      ).Items ?? [];

    for (const dose of doses) {
      if (dose.status !== 'PENDING') continue;
      if (minutesNow < dose.scheduledForMinutes + MISSED_WINDOW_MINUTES) continue;

      await ddb.send(
        new UpdateCommand({
          TableName: DOSE_EVENT_TABLE,
          Key: { id: dose.id },
          UpdateExpression: 'SET #status = :missed',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':missed': 'MISSED' },
        }),
      );

      try {
        await ddb.send(
          new PutCommand({
            TableName: ALERT_TABLE,
            Item: {
              id: `missed-${dose.id}`,
              circleId: circle.id,
              severity: 'URGENT',
              title: `${dose.medName} missed`,
              body: `Due ${dose.scheduledFor}, not logged ${MISSED_WINDOW_MINUTES} min after the window.`,
              createdAt: new Date().toISOString(),
            },
            ConditionExpression: 'attribute_not_exists(id)',
          }),
        );
      } catch (err) {
        // Already alerted for this dose (or resolved+re-created) — fine, skip.
        if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
      }
    }
  }
};
