import * as slotsDb from '../db/slots';
import * as waitlistDb from '../db/waitlist';
import * as sessionsDb from '../db/sessions';
import * as callsDb from '../db/calls';
import { selectCandidates } from './selection';
import { placeNextCall } from './caller';

export interface CancellationResult {
  started: boolean;
  reason?: string;
  session_id?: string;
}

export async function handleCancellation(slotId: number): Promise<CancellationResult> {
  const slot = await slotsDb.getSlot(slotId);
  if (!slot) return { started: false, reason: 'slot_not_found' };

  if (slot.status === 'in_recovery') return { started: false, reason: 'already_in_recovery' };
  if (slot.status === 'open') return { started: false, reason: 'slot_not_booked' };
  if (slot.status === 'cancelled') {
    // Idempotent re-trigger: check if there's already a session
    const existing = await sessionsDb.getSessionBySlot(slotId);
    if (existing) return { started: false, reason: 'session_already_exists', session_id: existing.id };
  }

  if (!['booked', 'cancelled'].includes(slot.status)) {
    return { started: false, reason: `invalid_status: ${slot.status}` };
  }

  // Lock the slot atomically — only one concurrent trigger can win this update
  const locked = await slotsDb.lockSlotForRecovery(slotId);
  if (!locked) return { started: false, reason: 'lock_failed_concurrent_trigger' };

  // Run selection on the (now-locked) slot
  const eligible = await waitlistDb.getEligibleEntries(slot);
  const candidates = selectCandidates(slot, eligible, new Set());

  if (candidates.length === 0) {
    await slotsDb.openSlot(slotId);
    console.log('[cancellation] no candidates, slot reopened:', slotId);
    return { started: false, reason: 'no_eligible_candidates' };
  }

  // Create recovery session — UNIQUE(slot_id) is the final idempotency guard
  const session = await sessionsDb.createSession(slotId, candidates.map(c => c.id));
  if (!session) {
    // Lost a race to the UNIQUE constraint
    await slotsDb.openSlot(slotId);
    return { started: false, reason: 'session_race_lost' };
  }

  console.log('[cancellation] recovery started', {
    slotId,
    sessionId: session.id,
    candidates: candidates.length,
  });

  // Place the first call asynchronously — don't block the HTTP response
  placeNextCall(session, 0).catch(err =>
    console.error('[cancellation] placeNextCall failed:', err),
  );

  return { started: true, session_id: session.id };
}
