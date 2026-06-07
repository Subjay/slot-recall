import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  DATABASE_URL: requireEnv('DATABASE_URL'),

  FONIO_API_KEY: optionalEnv('FONIO_API_KEY', ''),
  FONIO_FROM_NUMBER: optionalEnv('FONIO_FROM_NUMBER', ''),
  FONIO_AGENT_ID: optionalEnv('FONIO_AGENT_ID', ''),
  FONIO_LIVE: process.env['FONIO_LIVE'] === 'true',

  PORT: parseInt(optionalEnv('PORT', '3000'), 10),
  CLINIC_LOCATION: optionalEnv('CLINIC_LOCATION', 'HOIV Arsenalstraße 11, 1030 Wien'),

  CALLBACK_RETRY_AFTER_MS: parseInt(optionalEnv('CALLBACK_RETRY_AFTER_MS', String(15 * 60 * 1000)), 10),
  CALLBACK_EXPIRES_AFTER_MS: parseInt(optionalEnv('CALLBACK_EXPIRES_AFTER_MS', String(4 * 60 * 60 * 1000)), 10),
  CALLBACK_POLL_INTERVAL_MS: parseInt(optionalEnv('CALLBACK_POLL_INTERVAL_MS', String(30 * 1000)), 10),
} as const;
