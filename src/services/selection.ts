import type { Slot, WaitlistEntryWithPatient } from '../types';

const WEIGHTS = { urgency: 0.35, waitTime: 0.30, timePref: 0.20, fairness: 0.15 };

export function selectCandidates(
  slot: Slot,
  entries: WaitlistEntryWithPatient[],
  excludeIds: Set<number>,
): WaitlistEntryWithPatient[] {
  const slotStart = new Date(slot.start_time);
  const now = Date.now();

  const eligible = entries.filter(e => {
    if (excludeIds.has(e.id)) return false;
    if (!e.consent_to_call) return false;
    if (e.status !== 'waiting') return false;
    if (e.duration_needed_min > slot.duration_min) return false;
    if (e.provider_pref && e.provider_pref !== slot.provider) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  const waitDays = eligible.map(e => (now - new Date(e.created_at).getTime()) / 86_400_000);
  const maxWait = Math.max(...waitDays, 1);

  const scored = eligible.map((e, i) => {
    const urgency_norm = (e.urgency - 1) / 4;
    const wait_time_norm = waitDays[i] / maxWait;
    const time_pref_match = matchTimePref(e.time_pref, slotStart);
    const fairness = 1 / (1 + e.times_contacted);

    const score =
      WEIGHTS.urgency * urgency_norm +
      WEIGHTS.waitTime * wait_time_norm +
      WEIGHTS.timePref * time_pref_match +
      WEIGHTS.fairness * fairness;

    return { entry: e, score, urgency_norm, wait_time_norm, time_pref_match, fairness };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log('[selection] ranked for slot', slot.id, scored.map(c => ({
    entry_id: c.entry.id,
    patient_id: c.entry.patient_id,
    score: +c.score.toFixed(3),
    breakdown: {
      urgency: +c.urgency_norm.toFixed(2),
      wait: +c.wait_time_norm.toFixed(2),
      time_pref: +c.time_pref_match.toFixed(2),
      fairness: +c.fairness.toFixed(2),
    },
  })));

  return scored.map(c => c.entry);
}

function matchTimePref(pref: string | null, slotStart: Date): number {
  if (!pref) return 0.5;
  const h = slotStart.getHours();
  switch (pref.toLowerCase()) {
    case 'mornings':   return h < 12 ? 1.0 : 0.0;
    case 'afternoons': return h >= 12 && h < 17 ? 1.0 : 0.0;
    case 'evenings':   return h >= 17 ? 1.0 : 0.0;
    default:           return 0.5;
  }
}
