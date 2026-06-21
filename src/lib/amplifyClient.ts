import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// amplify_outputs.json only exists after `npx ampx sandbox` (or a real
// deploy) has run. import.meta.glob is statically analyzable by Vite, so
// this doesn't break the build/dev server when the file is absent — it
// just resolves to an empty map and the app stays in demo mode.
const outputsGlob = import.meta.glob('/amplify_outputs.json');

let configured = false;

export async function initAmplify(): Promise<boolean> {
  const loader = outputsGlob['/amplify_outputs.json'];
  if (!loader) return false;

  try {
    const outputs = (await loader()) as { default: Record<string, unknown> };
    Amplify.configure(outputs.default);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function isAmplifyLive(): boolean {
  return configured;
}

export const client = generateClient<Schema>();
