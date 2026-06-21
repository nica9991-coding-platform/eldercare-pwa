import { get, set } from 'idb-keyval';

export interface QueuedDoseLog {
  doseId: string;
  status: 'TAKEN' | 'SKIPPED';
  loggedAt: string;
  queuedAt: number;
}

const QUEUE_KEY = 'kindred-offline-dose-queue';

export async function enqueueDoseLog(entry: QueuedDoseLog): Promise<void> {
  const queue = await getQueue();
  queue.push(entry);
  await set(QUEUE_KEY, queue);
}

export async function getQueue(): Promise<QueuedDoseLog[]> {
  return (await get<QueuedDoseLog[]>(QUEUE_KEY)) ?? [];
}

export async function clearQueue(): Promise<void> {
  await set(QUEUE_KEY, []);
}

export async function isDoseQueued(doseId: string): Promise<boolean> {
  const queue = await getQueue();
  return queue.some((q) => q.doseId === doseId);
}
