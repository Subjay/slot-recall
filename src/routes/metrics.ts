import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';

const metricsRoute: FastifyPluginAsync = async fastify => {
  fastify.get('/metrics', async (_req, reply) => {
    const [sessionsRes, attemptsRes] = await Promise.all([
      db.from('recovery_sessions').select('status, created_at, updated_at'),
      db.from('call_attempts').select('outcome, created_at, completed_at, recovery_session_id'),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (attemptsRes.error) throw attemptsRes.error;

    const sessions = sessionsRes.data ?? [];
    const attempts = attemptsRes.data ?? [];

    const total = sessions.length;
    const byStatus = countBy(sessions, s => s.status as string);

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const fillRate = total > 0 ? completedSessions.length / total : 0;

    // Avg time from session creation to the accepted call_attempt completion
    const acceptedAttempts = attempts.filter(a => a.outcome === 'accepted' && a.completed_at);
    let avgFillTimeMs: number | null = null;
    if (acceptedAttempts.length > 0) {
      const sessionCreatedAt: Record<string, string> = {};
      for (const s of sessions) {
        sessionCreatedAt[(s as { status: string; created_at: string; updated_at: string } & Record<string, string>).id] = s.created_at;
      }
      const times = acceptedAttempts
        .map(a => {
          const start = sessionCreatedAt[a.recovery_session_id ?? ''];
          if (!start || !a.completed_at) return null;
          return new Date(a.completed_at).getTime() - new Date(start).getTime();
        })
        .filter((t): t is number => t !== null);
      if (times.length > 0) {
        avgFillTimeMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }

    const outcomesByReason = countBy(
      attempts.filter(a => a.outcome !== null),
      a => a.outcome as string,
    );

    return reply.send({
      total_sessions: total,
      by_status: byStatus,
      fill_rate: +fillRate.toFixed(3),
      avg_fill_time_ms: avgFillTimeMs,
      outcomes_by_reason: outcomesByReason,
    });
  });
};

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const k = key(item);
    result[k] = (result[k] ?? 0) + 1;
  }
  return result;
}

export default metricsRoute;
