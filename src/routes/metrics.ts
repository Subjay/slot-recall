import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';
import { recovery_sessions, call_attempts } from '../db/schema';

const metricsRoute: FastifyPluginAsync = async fastify => {
  fastify.get('/metrics', async (_req, reply) => {
    const [sessions, attempts] = await Promise.all([
      db
        .select({
          id: recovery_sessions.id,
          status: recovery_sessions.status,
          created_at: recovery_sessions.created_at,
        })
        .from(recovery_sessions),
      db
        .select({
          outcome: call_attempts.outcome,
          completed_at: call_attempts.completed_at,
          recovery_session_id: call_attempts.recovery_session_id,
        })
        .from(call_attempts),
    ]);

    const total = sessions.length;
    const byStatus = countBy(sessions, s => s.status);

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const fillRate = total > 0 ? completedSessions.length / total : 0;

    // Avg time from session creation to the accepted call_attempt completion
    const acceptedAttempts = attempts.filter(a => a.outcome === 'accepted' && a.completed_at);
    let avgFillTimeMs: number | null = null;
    if (acceptedAttempts.length > 0) {
      const sessionCreatedAt = new Map<string, string>();
      for (const s of sessions) sessionCreatedAt.set(s.id, s.created_at);

      const times = acceptedAttempts
        .map(a => {
          const start = a.recovery_session_id ? sessionCreatedAt.get(a.recovery_session_id) : undefined;
          if (!start || !a.completed_at) return null;
          return new Date(a.completed_at).getTime() - new Date(start).getTime();
        })
        .filter((t): t is number => t !== null);

      if (times.length > 0) {
        avgFillTimeMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }

    const outcomesByReason = countBy(
      attempts.filter((a): a is typeof a & { outcome: string } => a.outcome !== null),
      a => a.outcome,
    );

    return reply.send({
      total_sessions: total,
      slots_recovered: completedSessions.length,
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
