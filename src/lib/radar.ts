import type { Alert, Dose, HistoryDay } from './types';

export interface RadarContext {
  seniorFirstName: string;
  doses: Dose[];
  history: HistoryDay[];
  alerts: Alert[];
}

export const RADAR_SUGGESTIONS = [
  'How was this week?',
  'Did she miss any doses?',
  'How is today going?',
  'Any alerts I should know about?',
];

function weekAdherence(history: HistoryDay[]): { taken: number; total: number; pct: number } {
  const taken = history.reduce((s, d) => s + d.taken, 0);
  const total = history.reduce((s, d) => s + d.total, 0);
  return { taken, total, pct: total === 0 ? 0 : Math.round((taken / total) * 100) };
}

/**
 * Deterministic, read-only answerer over the circle's data. Powers Radar in
 * demo mode; in live mode the same facts are handed to Claude on Bedrock and
 * this serves as the fallback. Intentionally never offers to *change*
 * anything — Radar is observe-only.
 */
export function answerRadar(question: string, ctx: RadarContext): string {
  const q = question.toLowerCase();
  const name = ctx.seniorFirstName;
  const { taken, total, pct } = weekAdherence(ctx.history);

  // Today
  if (/(today|right now|so far)/.test(q)) {
    const todayTaken = ctx.doses.filter((d) => d.status === 'TAKEN').length;
    const todayTotal = ctx.doses.length;
    const missedToday = ctx.doses.filter((d) => d.status === 'MISSED');
    if (missedToday.length > 0) {
      return `Today's a bit off — ${name} has taken ${todayTaken} of ${todayTotal}, but ${missedToday
        .map((d) => d.medName)
        .join(' and ')} was missed. A quick call might help.`;
    }
    if (todayTotal > 0 && todayTaken === todayTotal) {
      return `Today's all done — ${name} took all ${todayTotal} doses. Nothing to worry about.`;
    }
    return `So far today ${name} has taken ${todayTaken} of ${todayTotal} doses, and the rest are still upcoming. On track.`;
  }

  // Missed / skipped
  if (/(miss|skip|forget|late)/.test(q)) {
    const missedDays = ctx.history.filter((d) => d.doses.some((x) => x.status === 'MISSED'));
    if (missedDays.length === 0) {
      return `Good news — no missed doses this week. ${name} has been consistent.`;
    }
    const detail = missedDays
      .map((d) => {
        const meds = d.doses.filter((x) => x.status === 'MISSED').map((x) => x.medName);
        return `${d.weekday} (${meds.join(', ')})`;
      })
      .join(', ');
    return `There ${missedDays.length === 1 ? 'was' : 'were'} ${missedDays.length} missed ${
      missedDays.length === 1 ? 'dose' : 'doses'
    } this week: ${detail}. Everything else was taken on time.`;
  }

  // Alerts
  if (/(alert|wrong|concern|problem|worry|ok\b|okay)/.test(q)) {
    if (ctx.alerts.length === 0) {
      return `No active alerts right now — things look calm for ${name}.`;
    }
    return `There ${ctx.alerts.length === 1 ? 'is' : 'are'} ${ctx.alerts.length} active alert${
      ctx.alerts.length === 1 ? '' : 's'
    }: ${ctx.alerts.map((a) => a.title.toLowerCase()).join('; ')}. Tap an alert on the dashboard to act on it.`;
  }

  // Week / general (default)
  const bestStreak = ctx.history.filter((d) => d.total > 0 && d.taken === d.total).length;
  if (pct >= 90) {
    return `It's been a steady week for ${name} — ${taken} of ${total} doses taken (${pct}%), with ${bestStreak} fully-clear days. Nothing of concern.`;
  }
  if (pct >= 70) {
    return `A mostly good week for ${name} — ${pct}% of doses taken (${taken} of ${total}). A couple were missed, but nothing alarming.`;
  }
  return `This week was a little uneven for ${name} — ${pct}% of doses taken (${taken} of ${total}). It may be worth a check-in.`;
}
