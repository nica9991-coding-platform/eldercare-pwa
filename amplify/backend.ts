import { defineBackend } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { circleResolver } from './functions/circle-resolver/resource';
import { sweepAlerts } from './functions/sweep-alerts/resource';
import { defineAuthChallenge } from './auth/define-auth-challenge/resource';
import { createAuthChallenge } from './auth/create-auth-challenge/resource';
import { verifyAuthChallengeResponse } from './auth/verify-auth-challenge-response/resource';

// ┌───────────────────────────────────────────────────────────────────────┐
// │ CHANGE BEFORE DEPLOY — the only values you must set for production.     │
// │ Everything else (table names, IAM, schedules) is wired automatically.  │
// │ See amplify/README.md for the matching AWS Console steps.              │
// └───────────────────────────────────────────────────────────────────────┘
const DEPLOY_CONFIG = {
  // An email address (or domain) you have VERIFIED in Amazon SES. Sign-in
  // codes and invites are sent From this address. Placeholder won't send.
  OTP_SENDER_EMAIL: 'no-reply@example.com',
  // Public URL of the deployed frontend — used in invite-email links.
  // Set to your Amplify Hosting URL (or custom domain) in production.
  APP_URL: 'http://localhost:5173',
  // Claude model on Bedrock for the AI summary + Radar. This is a
  // cross-region inference profile id; the region prefix (us./eu./apac.)
  // must match where you enabled Claude model access in the Bedrock console.
  SUMMARY_MODEL_ID: 'us.anthropic.claude-haiku-4-5',
};

const backend = defineBackend({
  auth,
  data,
  circleResolver,
  sweepAlerts,
  defineAuthChallenge,
  createAuthChallenge,
  verifyAuthChallengeResponse,
});

// --- Table access + the literal table/index names every Lambda needs ---
// Index names are hardcoded here because they were pinned explicitly with
// `.name(...)` in amplify/data/resource.ts — no need to introspect CDK
// constructs to discover an auto-generated name.
const tables = backend.data.resources.tables;
// .resources.lambda is typed as the IFunction interface; addEnvironment is
// only on the concrete construct, which is what Amplify actually creates.
const circleResolverFn = backend.circleResolver.resources.lambda as LambdaFunction;
const sweepAlertsFn = backend.sweepAlerts.resources.lambda as LambdaFunction;
const createAuthChallengeFn = backend.createAuthChallenge.resources.lambda as LambdaFunction;

tables.Membership.grantReadWriteData(circleResolverFn);
tables.Medication.grantReadData(circleResolverFn);
tables.DoseEvent.grantReadWriteData(circleResolverFn);
tables.Alert.grantReadWriteData(circleResolverFn);
tables.DailySummary.grantReadWriteData(circleResolverFn);
tables.CareCircle.grantReadWriteData(circleResolverFn);

tables.CareCircle.grantReadData(sweepAlertsFn);
tables.DoseEvent.grantReadWriteData(sweepAlertsFn);
tables.Alert.grantReadWriteData(sweepAlertsFn);

const sharedEnv = {
  MEMBERSHIP_TABLE_NAME: tables.Membership.tableName,
  MEDICATION_TABLE_NAME: tables.Medication.tableName,
  MEDICATION_CIRCLE_INDEX_NAME: 'byCircle',
  DOSE_EVENT_TABLE_NAME: tables.DoseEvent.tableName,
  DOSE_EVENT_CIRCLE_INDEX_NAME: 'byCircleAndDate',
  ALERT_TABLE_NAME: tables.Alert.tableName,
  ALERT_CIRCLE_INDEX_NAME: 'byCircle',
  DAILY_SUMMARY_TABLE_NAME: tables.DailySummary.tableName,
  CARE_CIRCLE_TABLE_NAME: tables.CareCircle.tableName,
  ...DEPLOY_CONFIG,
};

for (const [key, value] of Object.entries(sharedEnv)) {
  circleResolverFn.addEnvironment(key, value);
}
sweepAlertsFn.addEnvironment('CARE_CIRCLE_TABLE_NAME', sharedEnv.CARE_CIRCLE_TABLE_NAME);
sweepAlertsFn.addEnvironment('DOSE_EVENT_TABLE_NAME', sharedEnv.DOSE_EVENT_TABLE_NAME);
sweepAlertsFn.addEnvironment('DOSE_EVENT_CIRCLE_INDEX_NAME', sharedEnv.DOSE_EVENT_CIRCLE_INDEX_NAME);
sweepAlertsFn.addEnvironment('ALERT_TABLE_NAME', sharedEnv.ALERT_TABLE_NAME);

// SES send permission for the OTP + invite emails (auth triggers + resolver).
const sesPolicy = new PolicyStatement({
  actions: ['ses:SendEmail'],
  resources: ['*'],
});
createAuthChallengeFn.addToRolePolicy(sesPolicy);
circleResolverFn.addToRolePolicy(sesPolicy);
createAuthChallengeFn.addEnvironment('OTP_SENDER_EMAIL', sharedEnv.OTP_SENDER_EMAIL);

// Bedrock InvokeModel for the AI daily summary (Claude Haiku). Scoped to
// Anthropic foundation models + inference profiles across regions.
circleResolverFn.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/anthropic.*',
      'arn:aws:bedrock:*:*:inference-profile/*anthropic.*',
    ],
  }),
);

// --- Scheduled missed-dose sweep, every 15 min ---
const sweepStack = backend.sweepAlerts.resources.lambda.stack;
new events.Rule(sweepStack, 'SweepAlertsSchedule', {
  schedule: events.Schedule.rate(Duration.minutes(15)),
  targets: [new targets.LambdaFunction(sweepAlertsFn)],
});
