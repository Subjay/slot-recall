import { db } from './client';
import type { CallAttempt } from '../types';

export async function createCallAttempt(params: {
  slot_id: number;
  patient_id: number;
  waitlist_entry_id: number | null;
  recovery_session_id: string;
}): Promise<CallAttempt> {
  const { data, error } = await db
    .from('call_attempts')
    .insert({ ...params, status: 'placed' })
    .select()
    .single();
  if (error) throw error;
  return data as CallAttempt;
}

export async function getCallAttempt(id: number): Promise<CallAttempt | null> {
  const { data, error } = await db.from('call_attempts').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as CallAttempt;
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
  const { error } = await db
    .from('call_attempts')
    .update({ ...update, status: 'completed' })
    .eq('id', id);
  if (error) throw error;
}

export async function failCallAttempt(id: number, reason: string): Promise<void> {
  const { error } = await db
    .from('call_attempts')
    .update({ status: 'failed', outcome_reason: reason, completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getAttemptedEntryIdsForSession(sessionId: string): Promise<Set<number>> {
  const { data, error } = await db
    .from('call_attempts')
    .select('waitlist_entry_id')
    .eq('recovery_session_id', sessionId)
    .not('waitlist_entry_id', 'is', null);
  if (error) throw error;
  return new Set((data ?? []).map((r: { waitlist_entry_id: number }) => r.waitlist_entry_id));
}
