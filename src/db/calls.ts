import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from './client';
import { call_attempts } from './schema';
import type { CallAttempt } from '../types';

export async function createCallAttempt(params: {
  slot_id: number;
  patient_id: number;
  waitlist_entry_id: number | null;
  recovery_session_id: string;
}): Promise<CallAttempt> {
  const rows = await db
    .insert(call_attempts)
    .values({ ...params, status: 'placed' })
    .returning();
  return rows[0] as CallAttempt;
}

export async function getCallAttempt(id: number): Promise<CallAttempt | null> {
  const rows = await db.select().from(call_attempts).where(eq(call_attempts.id, id)).limit(1);
  return (rows[0] as CallAttempt) ?? null;
}

export async function completeCallAttempt(
  id: number,
  update: {
    outcome: string;
    outcome_reason: string | null;
    summary: string;
    fonio_debug_id: string;
    completed_at: string;
  },
): Promise<void> {
  await db
    .update(call_attempts)
    .set({ ...update, status: 'completed' })
    .where(eq(call_attempts.id, id));
}

export async function failCallAttempt(id: number, reason: string): Promise<void> {
  await db
    .update(call_attempts)
    .set({ status: 'failed', outcome_reason: reason, completed_at: new Date().toISOString() })
    .where(eq(call_attempts.id, id));
}

export async function getAttemptedEntryIdsForSession(sessionId: string): Promise<Set<number>> {
  const rows = await db
    .select({ waitlist_entry_id: call_attempts.waitlist_entry_id })
    .from(call_attempts)
    .where(and(eq(call_attempts.recovery_session_id, sessionId), isNotNull(call_attempts.waitlist_entry_id)));
  return new Set(rows.map(r => r.waitlist_entry_id).filter((v): v is number => v !== null));
}
