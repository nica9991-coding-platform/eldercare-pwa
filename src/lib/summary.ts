import type { Alert, Dose, SummarySeverity } from './types';

/**
 * The traffic-light severity is the safety-critical signal, so it's always
 * computed deterministically from the day's data — never left to a model.
 * Highest active severity wins (urgent > warn > quiet).
 */
export function computeSeverity(doses: Dose[], alerts: Alert[]): SummarySeverity {
  if (alerts.some((a) => a.severity === 'URGENT')) return 'URGENT';
  if (alerts.some((a) => a.severity === 'WARN')) return 'WARN';
  if (doses.some((d) => d.status === 'MISSED')) return 'WARN';
  return 'QUIET';
}

/**
 * Plain-language one-sentence summary derived from real dose/alert data.
 * In demo mode this is what the dashboard hero shows; in live mode the same
 * logic is the fallback if the Claude/Bedrock call fails (see
 * amplify/functions/circle-resolver/summary.ts).
 */
export function deriveSummaryText(doses: Dose[], alerts: Alert[], seniorFirstName: string): string {
  const urgent = alerts.find((a) => a.severity === 'URGENT');
  const warn = alerts.find((a) => a.severity === 'WARN');
  const missed = doses.filter((d) => d.status === 'MISSED');
  const taken = doses.filter((d) => d.status === 'TAKEN').length;
  const total = doses.length;

  if (urgent) {
    return `Heads up — ${urgent.title.toLowerCase()}, and ${
      warn ? warn.title.toLowerCase() : 'a check-in would help'
    }.`;
  }
  if (warn || missed.length > 0) {
    const medName = missed[0]?.medName;
    if (medName) {
      return `Heads up — ${seniorFirstName}'s ${medName} dose was missed today.`;
    }
    return `Heads up — ${warn?.title.toLowerCase() ?? 'something needs a quick check'}.`;
  }
  if (total > 0 && taken === total) {
    return `Quiet day — all ${total} meds taken, no concerns.`;
  }
  if (total > 0 && taken > 0) {
    return `On track — ${taken} of ${total} meds taken so far, nothing of concern.`;
  }
  return `A calm start — no doses logged yet today.`;
}

export function deriveSummary(doses: Dose[], alerts: Alert[], seniorFirstName: string) {
  const severity = computeSeverity(doses, alerts);
  return {
    text: deriveSummaryText(doses, alerts, seniorFirstName),
    severity,
    updatedAt: 'Updated just now',
  };
}
