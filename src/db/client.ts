import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

// prepare:false is required for Supabase's transaction-mode pooler (port 6543),
// which does not support prepared statements.
const queryClient = postgres(config.DATABASE_URL, { prepare: false });

export const db = drizzle(queryClient, { schema });
