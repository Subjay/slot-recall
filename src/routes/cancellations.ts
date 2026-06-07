import type { FastifyPluginAsync } from 'fastify';
import { handleCancellation } from '../services/cancellation';

const cancellationsRoute: FastifyPluginAsync = async fastify => {
  fastify.post<{ Body: { slot_id: number } }>(
    '/cancellations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['slot_id'],
          properties: { slot_id: { type: 'integer' } },
        },
      },
    },
    async (req, reply) => {
      const result = await handleCancellation(req.body.slot_id);
      const status = result.started ? 202 : 200;
      return reply.status(status).send(result);
    },
  );
};

export default cancellationsRoute;
