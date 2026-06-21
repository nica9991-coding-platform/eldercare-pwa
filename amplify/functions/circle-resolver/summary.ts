import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient();

// Claude Haiku on Bedrock — fast + cheap, right for a one-sentence summary
// generated on every dashboard load. Cross-region inference profile by
// default; override with SUMMARY_MODEL_ID if your account uses a different
// profile/region (e.g. eu.anthropic.claude-haiku-4-5).
const MODEL_ID = process.env.SUMMARY_MODEL_ID ?? 'us.anthropic.claude-haiku-4-5';

interface DoseLike {
  status: string;
  medName: string;
}
interface AlertLike {
  severity: string;
  title: string;
  body: string;
}

export type Severity = 'QUIET' | 'WARN' | 'URGENT';

/**
 * Severity is the safety-critical traffic-light signal — always computed
 * deterministically from the data, never delegated to the model.
 */
export function computeSeverity(doses: DoseLike[], alerts: AlertLike[]): Severity {
  if (alerts.some((a) => a.severity === 'URGENT')) return 'URGENT';
  if (alerts.some((a) => a.severity === 'WARN')) return 'WARN';
  if (doses.some((d) => d.status === 'MISSED')) return 'WARN';
  return 'QUIET';
}

function deterministicText(doses: DoseLike[], alerts: AlertLike[], severity: Severity): string {
  const urgent = alerts.find((a) => a.severity === 'URGENT');
  const warn = alerts.find((a) => a.severity === 'WARN');
  const missed = doses.filter((d) => d.status === 'MISSED');
  const taken = doses.filter((d) => d.status === 'TAKEN').length;

  if (severity === 'URGENT' && urgent) {
    return `Heads up — ${urgent.title.toLowerCase()}. ${urgent.body}`;
  }
  if (severity === 'WARN') {
    if (warn) return `Heads up — ${warn.title.toLowerCase()}.`;
    if (missed[0]) return `Heads up — ${missed[0].medName} was missed today.`;
  }
  if (doses.length > 0 && taken === doses.length) {
    return 'Quiet day — all meds taken, no concerns.';
  }
  return 'A calm day so far — nothing of concern.';
}

/**
 * Generate the warm one-sentence summary with Claude on Bedrock. The model
 * writes the *wording* only; the severity passed in (computed deterministically)
 * is authoritative for tone/color. Falls back to the deterministic sentence on
 * any Bedrock error so the dashboard never blocks on the model.
 */
export async function generateSummaryText(
  doses: DoseLike[],
  alerts: AlertLike[],
  severity: Severity,
  seniorFirstName: string,
): Promise<string> {
  const fallback = deterministicText(doses, alerts, severity);

  const facts = {
    senior: seniorFirstName,
    severity,
    doses: doses.map((d) => ({ med: d.medName, status: d.status })),
    alerts: alerts.map((a) => ({ severity: a.severity, title: a.title })),
  };

  const system =
    'You write a single, calm, plain-language sentence summarizing an older ' +
    "adult's medication day for their family. Warm and reassuring, never " +
    'alarmist, never clinical, never infantilizing. One sentence, under 20 ' +
    'words. Do not add quotes or a prefix. Match the given severity: QUIET = ' +
    'reassuring, WARN = gentle heads-up, URGENT = clear but calm.';

  try {
    const res = await bedrock.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 80,
          system,
          messages: [{ role: 'user', content: `Day's facts (JSON): ${JSON.stringify(facts)}` }],
        }),
      }),
    );
    const payload = JSON.parse(new TextDecoder().decode(res.body)) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((b) => b.type === 'text')?.text?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Radar — answer a free-text question about the circle using Claude on
 * Bedrock, strictly read-only and grounded in the supplied facts. Returns a
 * short calm answer; falls back to a generic line on any Bedrock error.
 */
export async function answerRadarQuestion(
  question: string,
  facts: Record<string, unknown>,
  seniorFirstName: string,
): Promise<string> {
  const fallback = `Here's what I can see about ${seniorFirstName}: ${JSON.stringify(facts).slice(0, 200)}…`;

  const system =
    "You are Radar, a calm, plain-language assistant that answers a family " +
    "member's questions about how their older relative's medication is going. " +
    'You are STRICTLY READ-ONLY: never offer to change, log, schedule, or edit ' +
    'anything — only describe what the data shows. Warm, brief (1–3 sentences), ' +
    'never alarmist, never clinical. Answer only from the provided facts; if the ' +
    "facts don't cover it, say so gently.";

  try {
    const res = await bedrock.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 250,
          system,
          messages: [
            {
              role: 'user',
              content: `Facts about ${seniorFirstName} (JSON):\n${JSON.stringify(facts)}\n\nQuestion: ${question}`,
            },
          ],
        }),
      }),
    );
    const payload = JSON.parse(new TextDecoder().decode(res.body)) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = payload.content?.find((b) => b.type === 'text')?.text?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}
