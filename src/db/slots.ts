import { db } from './client';
import type { Slot } from '../types';

export async function getSlot(id: number): Promise<Slot | null> {
  const { data, error } = await db.from('slots').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Slot;
}

export async function getSlots(filters: {
  date?: string;
  provider?: string;
  status?: string;
}): Promise<Slot[]> {
  let q = db.from('slots').select('*, booked_patient:patients(*)').order('start_time');
  if (filters.provider) q = q.eq('provider', filters.provider);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    q = q.gte('start_time', start.toISOString()).lte('start_time', end.toISOString());
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Slot[];
}

// Atomically lock a slot for recovery. Returns true if this call won the lock.
// Guards: slot must be in booked|cancelled (not already in_recovery or open).
export async function lockSlotForRecovery(id: number): Promise<boolean> {
  const { data, error } = await db
    .from('slots')
    .update({ status: 'in_recovery', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['booked', 'cancelled'])
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// Revert an in_recovery slot back to open (on exhaustion or abort).
export async function openSlot(id: number): Promise<void> {
  const { error } = await db
    .from('slots')
    .update({ status: 'open', booked_patient_id: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'in_recovery');
  if (error) throw error;
}

// Atomic booking guard — books only if slot is still in_recovery. Returns false if already booked.
export async function bookSlotRow(id: number, patientId: number): Promise<boolean> {
  const { data, error } = await db
    .from('slots')
    .update({ status: 'booked', booked_patient_id: patientId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'in_recovery')
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
