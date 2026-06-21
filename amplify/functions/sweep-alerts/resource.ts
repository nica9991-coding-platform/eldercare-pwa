import { defineFunction } from '@aws-amplify/backend';

// No `schedule` here — Amplify Gen 2's scheduled-function API has shifted
// across versions, so the EventBridge rule (~every 15 min) is wired
// explicitly with plain CDK in backend.ts, which is stable regardless.
export const sweepAlerts = defineFunction({
  name: 'sweep-alerts',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
