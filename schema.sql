-ga- Slot Recall — full schema
-- Apply in Supabase SQL editor. Safe to re-run: uses IF NOT EXISTS where supported.

create table if not exists patients (
  id          bigserial primary key,
  first_name  text not null,
  last_name   text,
  phone       text not null,   -- E.164, e.g. +43...
  email       text
);

-- status values: open | booked | cancelled | in_recovery
create table if not exists slots (
  id                bigserial primary key,
  provider          text not null,
  start_time        timestamptz not null,
  duration_min      integer not null,
  status            text not null default 'open',
  booked_patient_id bigint references patients(id),
  updated_at        timestamptz default now()
);

-- status values: waiting | contacted | booked | removed
create table if not exists waitlist_entries (
  id                  bigserial primary key,
  patient_id          bigint not null references patients(id),
  provider_pref       text,
  duration_needed_min integer not null,
  urgency             integer not null default 3,   -- 1..5
  complexity          integer not null default 1,
  time_pref           text,   -- 'mornings' | 'afternoons' | 'evenings' | null
  consent_to_call     boolean not null default false,
  status              text not null default 'waiting',
  times_contacted     integer not null default 0,
  created_at          timestamptz not null default now()
);

-- One recovery session per cancelled slot (UNIQUE enforces idempotency).
-- candidate_ids: ordered waitlist_entry ids built at selection time.
-- current_idx: pointer into candidate_ids; advances on each decline.
-- status values: active | awaiting_callback | completed | exhausted | aborted
create table if not exists recovery_sessions (
  id            uuid primary key default gen_random_uuid(),
  slot_id       bigint not null unique references slots(id),
  status        text not null default 'active',
  candidate_ids bigint[] not null,
  current_idx   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- status values: placed | completed | failed
-- fonio_debug_id: fonio's own call id, echoed in webhook — stored for debugging only, never used as lookup key.
-- The lookup key is call_attempts.id, injected into fonio context.call_attempt_id on the outbound call.
create table if not exists call_attempts (
  id                  bigserial primary key,
  slot_id             bigint not null references slots(id),
  patient_id          bigint not null references patients(id),
  waitlist_entry_id   bigint references waitlist_entries(id),
  recovery_session_id uuid references recovery_sessions(id),
  fonio_debug_id      text,
  status              text not null default 'placed',
  outcome             text,   -- accepted|declined|no_answer|voicemail|callback|recording_refused|ambiguous
  outcome_reason      text,
  summary             text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

-- Tracks pending callback retries. fired=false rows are polled by the scheduler.
create table if not exists scheduled_callbacks (
  id                  bigserial primary key,
  recovery_session_id uuid not null references recovery_sessions(id),
  waitlist_entry_id   bigint not null references waitlist_entries(id),
  retry_after         timestamptz not null,   -- fire retry call at/after this time
  expires_at          timestamptz not null,   -- if still unfired by here, advance to next candidate
  fired               boolean not null default false
);
