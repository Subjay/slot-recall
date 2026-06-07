import type { FastifyPluginAsync } from 'fastify';
import type { FonioWebhookPayload } from '../fonio/fonio-shapes';
import { adaptWebhook } from '../fonio/webhook-adapter';
import { handleOutcome } from '../services/outcome';

const webhookRoute: FastifyPluginAsync = async fastify => {
  // fonio expects a 200 quickly — process outcome asynchronously after acknowledging
  fastify.post<{ Body: FonioWebhookPayload }>('/webhook/fonio', async (req, reply) => {
    let parsed;
    try {
      parsed = adaptWebhook(req.body);
    } catch (err) {
      fastify.log.error({ err, body: req.body }, 'webhook-adapter failed');
      return reply.status(400).send({ error: 'invalid_webhook_payload' });
    }

    // Acknowledge immediately, process in background
    reply.status(200).send({ received: true });

    handleOutcome(parsed).catch(err =>
      fastify.log.error({ err, callAttemptId: parsed.callAttemptId }, 'handleOutcome failed'),
    );
  });
};

export default webhookRoute;
