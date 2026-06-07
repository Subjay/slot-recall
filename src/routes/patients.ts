import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';
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
      const { data, error } = await db.from('patients').insert(req.body).select().single();
      if (error) throw error;
      return reply.status(201).send(data);
    },
  );
};

export default patientsRoute;
