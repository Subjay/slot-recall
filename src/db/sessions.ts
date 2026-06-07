import { db } from './client';
import type { RecoverySession } from '../types';

export async function createSession(
  slotId: number,
  candidateIds: number[],
): Promise<RecoverySession | null> {
  const { data, error } = await db
    .from('recovery_sessions')
    .insert({ slot_id: slotId, candidate_ids: candidateIds, current_idx: 0, status: 'active' })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return null; // UNIQUE violation — session already exists
    throw error;
  }
  return data as RecoverySession;
}

export async function getSession(id: string): Promise<RecoverySession | null> {
  const { data, error } = await db
    .from('recovery_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as RecoverySession;
}

export async function getSessionBySlot(slotId: number): Promise<RecoverySession | null> {
  const { data, error } = await db
    .from('recovery_sessions')
    .select('*')
    .eq('slot_id', slotId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as RecoverySession;
}

export async function advanceSession(id: string, newIdx: number): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ current_idx: newIdx, status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function completeSession(id: string): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function exhaustSession(id: string): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ status: 'exhausted', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function abortSession(id: string): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ status: 'aborted', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function pauseForCallback(id: string): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ status: 'awaiting_callback', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function resumeFromCallback(id: string): Promise<void> {
  const { error } = await db
    .from('recovery_sessions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'awaiting_callback');
  if (error) throw error;
}
