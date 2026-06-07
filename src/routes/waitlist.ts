import type { FastifyPluginAsync } from 'fastify';
import { getAllEntries, createEntry } from '../db/waitlist';
import type { WaitlistEntry } from '../types';

type NewEntry = Omit<WaitlistEntry, 'id' | 'status' | 'times_contacted' | 'created_at'>;

const waitlistRoute: FastifyPluginAsync = async fastify => {
  fastify.get('/waitlist', async (_req, reply) => {
    const entries = await getAllEntries();
    return reply.send(entries);
  });

  fastify.post<{ Body: NewEntry }>(
    '/waitlist',
    {
      schema: {
        body: {
          type: 'object',
          required: ['patient_id', 'duration_needed_min'],
          properties: {
            patient_id: { type: 'integer' },
            provider_pref: { type: 'string', nullable: true },
            duration_needed_min: { type: 'integer' },
            urgency: { type: 'integer', minimum: 1, maximum: 5 },
            complexity: { type: 'integer' },
            time_pref: { type: 'string', nullable: true },
            consent_to_call: { type: 'boolean' },
          },
        },
      },
    },
    async (req, reply) => {
      const entry = await createEntry(req.body);
      return reply.status(201).send(entry);
    },
  );
};

export default waitlistRoute;
