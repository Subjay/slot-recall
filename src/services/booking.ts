import * as slotsDb from '../db/slots';
import * as waitlistDb from '../db/waitlist';
import * as sessionsDb from '../db/sessions';

export async function bookSlot(
  slotId: number,
  patientId: number,
  waitlistEntryId: number | null,
  sessionId: string,
): Promise<void> {
  const booked = await slotsDb.bookSlotRow(slotId, patientId);

  if (!booked) {
    // The WHERE status='in_recovery' guard returned 0 rows — slot was already booked elsewhere.
    throw new Error(`DOUBLE_BOOK_PREVENTED: slot ${slotId} was no longer in_recovery`);
  }

  // These two writes are not in a transaction, but the booking guarantee is already upheld above.
  // A crash here leaves the waitlist entry as 'contacted' and the session as 'active',
  // which is recoverable (the slot is correctly booked; a cleanup job can fix the rest).
  if (waitlistEntryId !== null) {
    await waitlistDb.markBooked(waitlistEntryId);
  }
  await sessionsDb.completeSession(sessionId);

  console.log('[booking] slot booked', { slotId, patientId, sessionId });
}
