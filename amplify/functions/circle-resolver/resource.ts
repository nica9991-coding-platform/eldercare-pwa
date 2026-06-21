import { defineFunction } from '@aws-amplify/backend';

export const circleResolver = defineFunction({
  name: 'circle-resolver',
  entry: './handler.ts',
  timeoutSeconds: 15,
});
