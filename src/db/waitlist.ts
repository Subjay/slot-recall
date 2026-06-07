import { db } from './client';
import type { Slot, WaitlistEntry, WaitlistEntryWithPatient } from '../types';

// Pre-filters by consent, status=waiting, treatment match, and duration fit.
// Selection service does the full filter + rank from the returned set.
export async function getEligibleEntries(slot: Slot): Promise<WaitlistEntryWithPatient[]> {
  const { data, error } = await db
    .from('waitlist_entries')
    .select('*, patient:patients(*)')
    .eq('consent_to_call', true)
    .eq('status', 'waiting')
    .lte('duration_needed_min', slot.duration_min);
  if (error) throw error;
  return (data ?? []) as unknown as WaitlistEntryWithPatient[];
}

export async function getEntryWithPatient(id: number): Promise<WaitlistEntryWithPatient | null> {
  const { data, error } = await db
    .from('waitlist_entries')
    .select('*, patient:patients(*)')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as WaitlistEntryWithPatient;
}

export async function getAllEntries(): Promise<WaitlistEntryWithPatient[]> {
  const { data, error } = await db
    .from('waitlist_entries')
    .select('*, patient:patients(*)')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as WaitlistEntryWithPatient[];
}

export async function markContacted(id: number): Promise<void> {
  const { error } = await db
    .from('waitlist_entries')
    .update({ status: 'contacted' })
    .eq('id', id);
  if (error) throw error;
}

export async function markBooked(id: number): Promise<void> {
  const { error } = await db
    .from('waitlist_entries')
    .update({ status: 'booked' })
    .eq('id', id);
  if (error) throw error;
}

// Resets a declined candidate back to waiting and increments their contact count.
export async function declineCandidate(id: number): Promise<void> {
  const { error } = await db.rpc('decline_waitlist_entry', { entry_id: id });
  if (error) {
    // Fallback: two-step if RPC not available
    const { data: entry } = await db
      .from('waitlist_entries')
      .select('times_contacted')
      .eq('id', id)
      .single();
    const timesContacted = ((entry as WaitlistEntry | null)?.times_contacted ?? 0) + 1;
    const { error: e2 } = await db
      .from('waitlist_entries')
      .update({ status: 'waiting', times_contacted: timesContacted })
      .eq('id', id);
    if (e2) throw e2;
  }
}

export async function createEntry(entry: Omit<WaitlistEntry, 'id' | 'status' | 'times_contacted' | 'created_at'>): Promise<WaitlistEntry> {
  const { data, error } = await db
    .from('waitlist_entries')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as WaitlistEntry;
}
