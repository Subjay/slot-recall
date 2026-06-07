import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from './client';
import { waitlist_entries, patients } from './schema';
import type { Slot, WaitlistEntry, WaitlistEntryWithPatient } from '../types';

// Pre-filters by consent, status=waiting, and duration fit.
// Selection service does the full filter + rank from the returned set.
export async function getEligibleEntries(slot: Slot): Promise<WaitlistEntryWithPatient[]> {
  const rows = await db
    .select()
    .from(waitlist_entries)
    .innerJoin(patients, eq(waitlist_entries.patient_id, patients.id))
    .where(
      and(
        eq(waitlist_entries.consent_to_call, true),
        eq(waitlist_entries.status, 'waiting'),
        lte(waitlist_entries.duration_needed_min, slot.duration_min),
      ),
    );
  return rows.map(r => ({ ...r.waitlist_entries, patient: r.patients })) as unknown as WaitlistEntryWithPatient[];
}

export async function getEntryWithPatient(id: number): Promise<WaitlistEntryWithPatient | null> {
  const rows = await db
    .select()
    .from(waitlist_entries)
    .innerJoin(patients, eq(waitlist_entries.patient_id, patients.id))
    .where(eq(waitlist_entries.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return { ...rows[0].waitlist_entries, patient: rows[0].patients } as unknown as WaitlistEntryWithPatient;
}

export async function getAllEntries(): Promise<WaitlistEntryWithPatient[]> {
  const rows = await db
    .select()
    .from(waitlist_entries)
    .innerJoin(patients, eq(waitlist_entries.patient_id, patients.id))
    .orderBy(waitlist_entries.created_at);
  return rows.map(r => ({ ...r.waitlist_entries, patient: r.patients })) as unknown as WaitlistEntryWithPatient[];
}

export async function markContacted(id: number): Promise<void> {
  await db.update(waitlist_entries).set({ status: 'contacted' }).where(eq(waitlist_entries.id, id));
}

export async function markBooked(id: number): Promise<void> {
  await db.update(waitlist_entries).set({ status: 'booked' }).where(eq(waitlist_entries.id, id));
}

// Resets a declined candidate back to waiting and increments their contact count — atomically.
export async function declineCandidate(id: number): Promise<void> {
  await db
    .update(waitlist_entries)
    .set({
      status: 'waiting',
      times_contacted: sql`${waitlist_entries.times_contacted} + 1`,
    })
    .where(eq(waitlist_entries.id, id));
}

export async function createEntry(
  entry: Omit<WaitlistEntry, 'id' | 'status' | 'times_contacted' | 'created_at'>,
): Promise<WaitlistEntry> {
  const rows = await db.insert(waitlist_entries).values(entry).returning();
  return rows[0] as WaitlistEntry;
}
