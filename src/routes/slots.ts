import type { FastifyPluginAsync } from 'fastify';
import { getSlots } from '../db/slots';

const slotsRoute: FastifyPluginAsync = async fastify => {
  fastify.get<{ Querystring: { date?: string; provider?: string; status?: string } }>(
    '/slots',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            provider: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const slots = await getSlots(req.query);
      return reply.send(slots);
    },
  );
};

export default slotsRoute;
