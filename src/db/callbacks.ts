import { and, eq, gt, lte } from 'drizzle-orm';
import { db } from './client';
import { scheduled_callbacks } from './schema';
import type { ScheduledCallback } from '../types';

export async function createCallback(params: {
  recovery_session_id: string;
  waitlist_entry_id: number;
  retry_after: string;
  expires_at: string;
}): Promise<ScheduledCallback> {
  const rows = await db
    .insert(scheduled_callbacks)
    .values({ ...params, fired: false })
    .returning();
  return rows[0] as ScheduledCallback;
}

export async function getDueCallbacks(): Promise<ScheduledCallback[]> {
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(scheduled_callbacks)
    .where(
      and(
        lte(scheduled_callbacks.retry_after, now),
        gt(scheduled_callbacks.expires_at, now),
        eq(scheduled_callbacks.fired, false),
      ),
    );
  return rows as ScheduledCallback[];
}

export async function getExpiredCallbacks(): Promise<ScheduledCallback[]> {
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(scheduled_callbacks)
    .where(and(lte(scheduled_callbacks.expires_at, now), eq(scheduled_callbacks.fired, false)));
  return rows as ScheduledCallback[];
}

export async function markFired(id: number): Promise<void> {
  await db.update(scheduled_callbacks).set({ fired: true }).where(eq(scheduled_callbacks.id, id));
}
