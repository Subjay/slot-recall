import { config } from './config';
import { buildApp } from './app';
import { startCallbackScheduler, stopCallbackScheduler } from './services/callback-scheduler';

async function main() {
  const app = buildApp();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });

  startCallbackScheduler();

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    stopCallbackScheduler();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
