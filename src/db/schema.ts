import { pgTable, bigserial, bigint, text, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

// Property names are snake_case on purpose — they match the DB columns and the existing
// internal types, so services/routes that read these rows need no changes.
// Timestamps use mode:'string' so they come back as ISO strings (like the old supabase-js
// layer), keeping `new Date(row.start_time)` call sites working unchanged.

export const patients = pgTable('patients', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  phone: text('phone').notNull(),
  email: text('email'),
});

export const slots = pgTable('slots', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  provider: text('provider').notNull(),
  start_time: timestamp('start_time', { withTimezone: true, mode: 'string' }).notNull(),
  duration_min: integer('duration_min').notNull(),
  status: text('status').notNull().default('open'),
  booked_patient_id: bigint('booked_patient_id', { mode: 'number' }).references(() => patients.id),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const waitlist_entries = pgTable('waitlist_entries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),
  provider_pref: text('provider_pref'),
  duration_needed_min: integer('duration_needed_min').notNull(),
  urgency: integer('urgency').notNull().default(3),
  complexity: integer('complexity').notNull().default(1),
  time_pref: text('time_pref'),
  consent_to_call: boolean('consent_to_call').notNull().default(false),
  status: text('status').notNull().default('waiting'),
  times_contacted: integer('times_contacted').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const recovery_sessions = pgTable('recovery_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  slot_id: bigint('slot_id', { mode: 'number' }).notNull().unique().references(() => slots.id),
  status: text('status').notNull().default('active'),
  candidate_ids: bigint('candidate_ids', { mode: 'number' }).array().notNull(),
  current_idx: integer('current_idx').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const call_attempts = pgTable('call_attempts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slot_id: bigint('slot_id', { mode: 'number' }).notNull().references(() => slots.id),
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),
  waitlist_entry_id: bigint('waitlist_entry_id', { mode: 'number' }).references(() => waitlist_entries.id),
  recovery_session_id: uuid('recovery_session_id').references(() => recovery_sessions.id),
  fonio_debug_id: text('fonio_debug_id'),
  status: text('status').notNull().default('placed'),
  outcome: text('outcome'),
  outcome_reason: text('outcome_reason'),
  summary: text('summary'),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
});

export const scheduled_callbacks = pgTable('scheduled_callbacks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  recovery_session_id: uuid('recovery_session_id').notNull().references(() => recovery_sessions.id),
  waitlist_entry_id: bigint('waitlist_entry_id', { mode: 'number' }).notNull().references(() => waitlist_entries.id),
  retry_after: timestamp('retry_after', { withTimezone: true, mode: 'string' }).notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  fired: boolean('fired').notNull().default(false),
});
