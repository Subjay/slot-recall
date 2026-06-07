import { config } from '../config';
import * as callbacksDb from '../db/callbacks';
import * as sessionsDb from '../db/sessions';
import * as slotsDb from '../db/slots';
import * as waitlistDb from '../db/waitlist';
import { placeNextCall } from './caller';

let pollHandle: ReturnType<typeof setInterval> | null = null;

export function startCallbackScheduler(): void {
  pollHandle = setInterval(() => {
    tick().catch(err => console.error('[callback-scheduler] tick error:', err));
  }, config.CALLBACK_POLL_INTERVAL_MS);

  console.log('[callback-scheduler] started, poll interval:', config.CALLBACK_POLL_INTERVAL_MS, 'ms');
}

export function stopCallbackScheduler(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

async function tick(): Promise<void> {
  await Promise.all([processDue(), processExpired()]);
}

async function processDue(): Promise<void> {
  const due = await callbacksDb.getDueCallbacks();
  for (const cb of due) {
    try {
      await callbacksDb.markFired(cb.id);

      const session = await sessionsDb.getSession(cb.recovery_session_id);
      if (!session || session.status !== 'awaiting_callback') {
        console.warn('[callback-scheduler] session not awaiting_callback:', cb.recovery_session_id);
        continue;
      }

      await sessionsDb.resumeFromCallback(session.id);
      // Retry the same candidate (don't advance current_idx)
      await placeNextCall(session, session.current_idx);
      console.log('[callback-scheduler] retry call placed', { sessionId: session.id });
    } catch (err) {
      console.error('[callback-scheduler] error on due callback:', cb.id, err);
    }
  }
}

async function processExpired(): Promise<void> {
  const expired = await callbacksDb.getExpiredCallbacks();
  for (const cb of expired) {
    try {
      await callbacksDb.markFired(cb.id);

      const session = await sessionsDb.getSession(cb.recovery_session_id);
      if (!session || session.status !== 'awaiting_callback') continue;

      // Treat expiry like a decline
      await waitlistDb.declineCandidate(cb.waitlist_entry_id);

      const nextIdx = session.current_idx + 1;
      if (nextIdx >= session.candidate_ids.length) {
        await sessionsDb.exhaustSession(session.id);
        await slotsDb.openSlot(session.slot_id);
        console.log('[callback-scheduler] callback expired, session exhausted:', session.slot_id);
      } else {
        await sessionsDb.advanceSession(session.id, nextIdx);
        await placeNextCall({ ...session, current_idx: nextIdx }, nextIdx);
        console.log('[callback-scheduler] callback expired, advanced to next candidate');
      }
    } catch (err) {
      console.error('[callback-scheduler] error on expired callback:', cb.id, err);
    }
  }
}
