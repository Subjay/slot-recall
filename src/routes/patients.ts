import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';
import { patients } from '../db/schema';
import type { Patient } from '../types';

const patientsRoute: FastifyPluginAsync = async fastify => {
  fastify.post<{ Body: Omit<Patient, 'id'> }>(
    '/patients',
    {
      schema: {
        body: {
          type: 'object',
          required: ['first_name', 'phone'],
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string', nullable: true },
            phone: { type: 'string', pattern: '^\\+\\d+$' },
            email: { type: 'string', nullable: true },
          },
        },
      },
    },
    async (req, reply) => {
      const rows = await db.insert(patients).values(req.body).returning();
      return reply.status(201).send(rows[0]);
    },
  );
};

export default patientsRoute;
