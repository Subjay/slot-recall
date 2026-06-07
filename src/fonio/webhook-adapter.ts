import type { FonioWebhookPayload } from './fonio-shapes';
import type { CallOutcome, ParsedOutcome } from './types';

// TODO: confirm exact disconnectReason values with fonio for voicemail / no-answer cases.
// Only 'user_hangup' observed so far. Update these sets once confirmed.
const NO_ANSWER_DISCONNECT_REASONS = new Set<string>([
  // e.g. 'no_answer', 'timeout'
]);
const VOICEMAIL_DISCONNECT_REASONS = new Set<string>([
  // e.g. 'voicemail_detected', 'machine_detected'
]);

function classifyByDisconnect(reason: string): CallOutcome | null {
  if (NO_ANSWER_DISCONNECT_REASONS.has(reason)) return 'no_answer';
  if (VOICEMAIL_DISCONNECT_REASONS.has(reason)) return 'voicemail';
  return null;
}

export function adaptWebhook(raw: FonioWebhookPayload): ParsedOutcome {
  const callAttemptId = parseInt(raw.context.call_attempt_id, 10);
  if (isNaN(callAttemptId)) {
    throw new Error(`Invalid call_attempt_id in webhook context: ${JSON.stringify(raw.context.call_attempt_id)}`);
  }

  const answer = (raw.extractionData.answer ?? '').trim();
  const reason = raw.extractionData.reason ?? null;

  let outcome: CallOutcome;

  if (answer === 'Yes') {
    outcome = 'accepted';
  } else if (answer === 'No') {
    outcome = 'declined';
  } else {
    const fromDisconnect = classifyByDisconnect(raw.disconnectReason);
    if (fromDisconnect) {
      outcome = fromDisconnect;
    } else if (answer === '') {
      // No extraction data, no known disconnect reason — needs human review
      // TODO: add 'callback' and 'recording_refused' here once fonio confirms the exact mapping
      outcome = 'ambiguous';
    } else {
      outcome = 'ambiguous';
    }
  }

  return {
    callAttemptId,
    outcome,
    outcomeReason: reason,
    summary: raw.summary ?? '',
    fonioDebugId: raw.id,
    completedAt: raw.endTimestamp,
  };
}
