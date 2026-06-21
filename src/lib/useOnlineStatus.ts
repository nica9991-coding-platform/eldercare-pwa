import { useEffect, useState } from 'react';

let simulatedOffline = false;
const listeners = new Set<() => void>();

export function setSimulatedOffline(value: boolean) {
  simulatedOffline = value;
  listeners.forEach((l) => l());
}

export function getSimulatedOffline() {
  return simulatedOffline;
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine && !simulatedOffline);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine && !simulatedOffline);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    listeners.add(update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      listeners.delete(update);
    };
  }, []);

  return online;
}
