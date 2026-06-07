import { config } from '../config';
import { placeOutboundCall } from '../fonio/client';
import * as slotsDb from '../db/slots';
import * as callsDb from '../db/calls';
import * as waitlistDb from '../db/waitlist';
import * as sessionsDb from '../db/sessions';
import type { RecoverySession } from '../types';

// Places a call for session.candidate_ids[targetIdx].
// If fonio rejects the call, advances the loop inline until a call is accepted or the list is exhausted.
export async function placeNextCall(session: RecoverySession, targetIdx: number): Promise<void> {
  const slot = await slotsDb.getSlot(session.slot_id);
  if (!slot) throw new Error(`Slot not found: ${session.slot_id}`);

  let idx = targetIdx;

  while (idx < session.candidate_ids.length) {
    const waitlistEntryId = session.candidate_ids[idx];

    const entry = await waitlistDb.getEntryWithPatient(waitlistEntryId);
    if (!entry) {
      console.warn('[caller] waitlist entry missing, skipping:', waitlistEntryId);
      idx++;
      await sessionsDb.advanceSession(session.id, idx);
      continue;
    }

    const attempt = await callsDb.createCallAttempt({
      slot_id: session.slot_id,
      patient_id: entry.patient_id,
      waitlist_entry_id: waitlistEntryId,
      recovery_session_id: session.id,
    });

    await waitlistDb.markContacted(waitlistEntryId);

    const result = await placeOutboundCall({
      callAttemptId: attempt.id,
      toNumber: entry.patient.phone,
      patientFirstName: entry.patient.first_name,
      patientLastName: entry.patient.last_name ?? '',
      slotStart: new Date(slot.start_time),
      location: config.CLINIC_LOCATION,
    });

    if (result.accepted) {
      console.log('[caller] call placed', { callAttemptId: attempt.id, simulated: result.simulated });
      return;
    }

    // fonio rejected the call — fail the attempt, advance to next candidate
    await callsDb.failCallAttempt(attempt.id, `fonio_rejected: ${result.message}`);
    await waitlistDb.declineCandidate(waitlistEntryId);

    idx++;
    if (idx < session.candidate_ids.length) {
      await sessionsDb.advanceSession(session.id, idx);
    }
  }

  // Exhausted all candidates
  await sessionsDb.exhaustSession(session.id);
  await slotsDb.openSlot(session.slot_id);
  console.log('[caller] all candidates exhausted, slot reopened:', session.slot_id);
}
