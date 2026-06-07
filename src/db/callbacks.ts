import { db } from './client';
import type { ScheduledCallback } from '../types';

export async function createCallback(params: {
  recovery_session_id: string;
  waitlist_entry_id: number;
  retry_after: string;
  expires_at: string;
}): Promise<ScheduledCallback> {
  const { data, error } = await db
    .from('scheduled_callbacks')
    .insert({ ...params, fired: false })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledCallback;
}

export async function getDueCallbacks(): Promise<ScheduledCallback[]> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('scheduled_callbacks')
    .select('*')
    .lte('retry_after', now)
    .gt('expires_at', now)
    .eq('fired', false);
  if (error) throw error;
  return (data ?? []) as ScheduledCallback[];
}

export async function getExpiredCallbacks(): Promise<ScheduledCallback[]> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('scheduled_callbacks')
    .select('*')
    .lte('expires_at', now)
    .eq('fired', false);
  if (error) throw error;
  return (data ?? []) as ScheduledCallback[];
}

export async function markFired(id: number): Promise<void> {
  const { error } = await db
    .from('scheduled_callbacks')
    .update({ fired: true })
    .eq('id', id);
  if (error) throw error;
}
