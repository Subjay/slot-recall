import { and, eq } from 'drizzle-orm';
import { db } from './client';
import { recovery_sessions } from './schema';
import type { RecoverySession } from '../types';

export async function createSession(
  slotId: number,
  candidateIds: number[],
): Promise<RecoverySession | null> {
  try {
    const rows = await db
      .insert(recovery_sessions)
      .values({ slot_id: slotId, candidate_ids: candidateIds, current_idx: 0, status: 'active' })
      .returning();
    return (rows[0] as RecoverySession) ?? null;
  } catch (err: unknown) {
    // 23505 = unique_violation on slot_id — a session already exists for this slot.
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

export async function getSession(id: string): Promise<RecoverySession | null> {
  const rows = await db.select().from(recovery_sessions).where(eq(recovery_sessions.id, id)).limit(1);
  return (rows[0] as RecoverySession) ?? null;
}

export async function getSessionBySlot(slotId: number): Promise<RecoverySession | null> {
  const rows = await db
    .select()
    .from(recovery_sessions)
    .where(eq(recovery_sessions.slot_id, slotId))
    .limit(1);
  return (rows[0] as RecoverySession) ?? null;
}

export async function advanceSession(id: string, newIdx: number): Promise<void> {
  await db
    .update(recovery_sessions)
    .set({ current_idx: newIdx, status: 'active', updated_at: new Date().toISOString() })
    .where(eq(recovery_sessions.id, id));
}

export async function completeSession(id: string): Promise<void> {
  await setStatus(id, 'completed');
}

export async function exhaustSession(id: string): Promise<void> {
  await setStatus(id, 'exhausted');
}

export async function abortSession(id: string): Promise<void> {
  await setStatus(id, 'aborted');
}

export async function pauseForCallback(id: string): Promise<void> {
  await setStatus(id, 'awaiting_callback');
}

export async function resumeFromCallback(id: string): Promise<void> {
  await db
    .update(recovery_sessions)
    .set({ status: 'active', updated_at: new Date().toISOString() })
    .where(and(eq(recovery_sessions.id, id), eq(recovery_sessions.status, 'awaiting_callback')));
}

async function setStatus(id: string, status: string): Promise<void> {
  await db
    .update(recovery_sessions)
    .set({ status, updated_at: new Date().toISOString() })
    .where(eq(recovery_sessions.id, id));
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
