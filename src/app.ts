import Fastify from 'fastify';
import cors from '@fastify/cors';
import cancellationsRoute from './routes/cancellations';
import webhookRoute from './routes/webhook';
import slotsRoute from './routes/slots';
import waitlistRoute from './routes/waitlist';
import patientsRoute from './routes/patients';
import metricsRoute from './routes/metrics';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  // Health check
  app.get('/health', async () => ({ ok: true }));

  // All API routes under /api prefix
  app.register(cancellationsRoute, { prefix: '/api' });
  app.register(webhookRoute, { prefix: '/api' });
  app.register(slotsRoute, { prefix: '/api' });
  app.register(waitlistRoute, { prefix: '/api' });
  app.register(patientsRoute, { prefix: '/api' });
  app.register(metricsRoute, { prefix: '/api' });

  app.setErrorHandler((err, req, reply) => {
    app.log.error(err);
    const statusCode = err.statusCode ?? 500;
    reply.status(statusCode).send({
      error: err.message ?? 'internal_server_error',
      statusCode,
    });
  });

  return app;
}
