import { and, eq, gte, lte, inArray, type SQL } from 'drizzle-orm';
import { db } from './client';
import { slots, patients } from './schema';
import type { Slot } from '../types';

export async function getSlot(id: number): Promise<Slot | null> {
  const rows = await db.select().from(slots).where(eq(slots.id, id)).limit(1);
  return (rows[0] as Slot) ?? null;
}

export async function getSlots(filters: {
  date?: string;
  provider?: string;
  status?: string;
}): Promise<Slot[]> {
  const conds: SQL[] = [];
  if (filters.provider) conds.push(eq(slots.provider, filters.provider));
  if (filters.status) conds.push(eq(slots.status, filters.status));
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    conds.push(gte(slots.start_time, start.toISOString()));
    conds.push(lte(slots.start_time, end.toISOString()));
  }

  const joined = await db
    .select()
    .from(slots)
    .leftJoin(patients, eq(slots.booked_patient_id, patients.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(slots.start_time);

  // Shape each row to { ...slot, booked_patient } for the dashboard.
  return joined.map(j => ({ ...j.slots, booked_patient: j.patients })) as unknown as Slot[];
}

// Atomically lock a slot for recovery. Returns true if this call won the lock.
export async function lockSlotForRecovery(id: number): Promise<boolean> {
  const rows = await db
    .update(slots)
    .set({ status: 'in_recovery', updated_at: new Date().toISOString() })
    .where(and(eq(slots.id, id), inArray(slots.status, ['booked', 'cancelled'])))
    .returning({ id: slots.id });
  return rows.length > 0;
}

// Revert an in_recovery slot back to open (on exhaustion or abort).
export async function openSlot(id: number): Promise<void> {
  await db
    .update(slots)
    .set({ status: 'open', booked_patient_id: null, updated_at: new Date().toISOString() })
    .where(and(eq(slots.id, id), eq(slots.status, 'in_recovery')));
}

// Atomic booking guard — books only if slot is still in_recovery. Returns false if already booked.
export async function bookSlotRow(id: number, patientId: number): Promise<boolean> {
  const rows = await db
    .update(slots)
    .set({ status: 'booked', booked_patient_id: patientId, updated_at: new Date().toISOString() })
    .where(and(eq(slots.id, id), eq(slots.status, 'in_recovery')))
    .returning({ id: slots.id });
  return rows.length > 0;
}
