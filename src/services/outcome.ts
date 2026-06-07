import type { ParsedOutcome } from '../fonio/types';
import type { CallAttempt, RecoverySession } from '../types';
import * as callsDb from '../db/calls';
import * as sessionsDb from '../db/sessions';
import * as slotsDb from '../db/slots';
import * as waitlistDb from '../db/waitlist';
import * as callbacksDb from '../db/callbacks';
import { bookSlot } from './booking';
import { placeNextCall } from './caller';
import { config } from '../config';

export async function handleOutcome(parsed: ParsedOutcome): Promise<void> {
  const attempt = await callsDb.getCallAttempt(parsed.callAttemptId);
  if (!attempt) {
    console.error('[outcome] call_attempt not found:', parsed.callAttemptId);
    return;
  }

  await callsDb.completeCallAttempt(attempt.id, {
    outcome: parsed.outcome,
    outcome_reason: parsed.outcomeReason,
    summary: parsed.summary,
    fonio_debug_id: parsed.fonioDebugId,
    completed_at: parsed.completedAt,
  });

  if (!attempt.recovery_session_id) {
    console.warn('[outcome] attempt has no recovery_session_id — nothing to advance:', attempt.id);
    return;
  }

  const session = await sessionsDb.getSession(attempt.recovery_session_id);
  if (!session) {
    console.error('[outcome] session not found:', attempt.recovery_session_id);
    return;
  }

  if (session.status === 'completed' || session.status === 'exhausted' || session.status === 'aborted') {
    console.warn('[outcome] session already resolved, ignoring late webhook:', session.id, session.status);
    return;
  }

  console.log('[outcome] processing', { outcome: parsed.outcome, sessionId: session.id, attemptId: attempt.id });

  switch (parsed.outcome) {
    case 'accepted':
      await handleAccepted(session, attempt);
      break;
    case 'declined':
    case 'no_answer':
    case 'voicemail':
      await handleAdvance(session, attempt);
      break;
    case 'callback':
      await handleCallback(session, attempt);
      break;
    case 'recording_refused':
    case 'ambiguous':
      await handleHumanReview(session, attempt, parsed.outcome);
      break;
    default: {
      const _exhaustive: never = parsed.outcome;
      console.error('[outcome] unhandled outcome:', _exhaustive);
      await handleHumanReview(session, attempt, parsed.outcome as string);
    }
  }
}

async function handleAccepted(session: RecoverySession, attempt: CallAttempt): Promise<void> {
  await bookSlot(session.slot_id, attempt.patient_id, attempt.waitlist_entry_id, session.id);
}

async function handleAdvance(session: RecoverySession, attempt: CallAttempt): Promise<void> {
  if (attempt.waitlist_entry_id !== null) {
    await waitlistDb.declineCandidate(attempt.waitlist_entry_id);
  }

  const nextIdx = session.current_idx + 1;

  if (nextIdx >= session.candidate_ids.length) {
    await sessionsDb.exhaustSession(session.id);
    await slotsDb.openSlot(session.slot_id);
    console.log('[outcome] session exhausted, slot reopened:', session.slot_id);
    return;
  }

  await sessionsDb.advanceSession(session.id, nextIdx);
  // Use updated session object so placeNextCall sees the new idx in candidate_ids
  await placeNextCall({ ...session, current_idx: nextIdx }, nextIdx);
}

async function handleCallback(session: RecoverySession, attempt: CallAttempt): Promise<void> {
  const retryAfter = new Date(Date.now() + config.CALLBACK_RETRY_AFTER_MS).toISOString();
  const expiresAt = new Date(Date.now() + config.CALLBACK_EXPIRES_AFTER_MS).toISOString();

  await sessionsDb.pauseForCallback(session.id);

  if (attempt.waitlist_entry_id !== null) {
    await callbacksDb.createCallback({
      recovery_session_id: session.id,
      waitlist_entry_id: attempt.waitlist_entry_id,
      retry_after: retryAfter,
      expires_at: expiresAt,
    });
  }

  console.log('[outcome] callback scheduled', {
    sessionId: session.id,
    slotId: session.slot_id,
    retryAfter,
    expiresAt,
  });
}

async function handleHumanReview(session: RecoverySession, attempt: CallAttempt, outcome: string): Promise<void> {
  await sessionsDb.abortSession(session.id);
  await slotsDb.openSlot(session.slot_id);
  console.warn('[outcome] session aborted — needs human review', {
    outcome,
    sessionId: session.id,
    slotId: session.slot_id,
    callAttemptId: attempt.id,
  });
}
