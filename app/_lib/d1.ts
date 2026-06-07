import { env } from "cloudflare:workers";

type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
};

export type SlotRecallDb = {
  prepare(query: string): D1PreparedStatement;
  batch<T = D1Result>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<D1Result>;
};

type RuntimeEnv = {
  DB?: SlotRecallDb;
  FONIO_API_KEY?: string;
  OUTBOUND_NUMBER?: string;
  AGENT_ID?: string;
};

const runtimeEnv = env as RuntimeEnv;

export function getDb() {
  if (!runtimeEnv.DB) {
    throw new Error("D1 binding DB is not available. Check .openai/hosting.json.");
  }
  return runtimeEnv.DB;
}

export function getSecret(name: keyof RuntimeEnv) {
  const nodeEnv =
    typeof process !== "undefined" && process.env ? process.env : {};
  const value = runtimeEnv[name] ?? nodeEnv[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function auditEvent(
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {},
) {
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO audit_events (id, event_type, entity_type, entity_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      createId("audit"),
      eventType,
      entityType,
      entityId,
      JSON.stringify(payload),
      nowIso(),
    )
    .run();
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    consent_status TEXT NOT NULL DEFAULT 'granted',
    opted_out INTEGER NOT NULL DEFAULT 0,
    waiting_since TEXT,
    original_appointment_date TEXT,
    preferred_visit TEXT NOT NULL DEFAULT 'Consultation',
    priority_score INTEGER NOT NULL DEFAULT 50,
    availability_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    day_id TEXT NOT NULL CHECK (day_id IN ('Today', 'Tomorrow')),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'filled', 'cancelled', 'open')),
    visit TEXT NOT NULL,
    phone TEXT NOT NULL,
    original_date TEXT NOT NULL,
    wait_saved TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS waitlist_entries (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    desired_visit TEXT NOT NULL,
    preferred_slot TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'calling', 'talking', 'accepted', 'declined', 'skipped')) DEFAULT 'queued',
    source TEXT NOT NULL DEFAULT 'Waitlist',
    answer TEXT NOT NULL DEFAULT 'Available on short notice.',
    priority_score INTEGER NOT NULL DEFAULT 50,
    last_contact_at TEXT,
    cooldown_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS replacement_cases (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    day_id TEXT NOT NULL,
    slot_start TEXT NOT NULL,
    slot_end TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'calling', 'booked', 'failed', 'closed')) DEFAULT 'open',
    selected_waitlist_entry_id TEXT,
    created_by TEXT NOT NULL DEFAULT 'manual_dashboard',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (selected_waitlist_entry_id) REFERENCES waitlist_entries(id)
  )`,
  `CREATE TABLE IF NOT EXISTS call_attempts (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    waitlist_entry_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    provider_call_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'calling', 'talking', 'accepted', 'declined', 'no_answer', 'failed')) DEFAULT 'queued',
    started_at TEXT,
    ended_at TEXT,
    outcome TEXT,
    outcome_reason TEXT,
    raw_payload TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES replacement_cases(id),
    FOREIGN KEY (waitlist_entry_id) REFERENCES waitlist_entries(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_day_start ON appointments(day_id, start_time)`,
  `CREATE INDEX IF NOT EXISTS idx_waitlist_status_score ON waitlist_entries(status, priority_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_appointment ON replacement_cases(appointment_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_call_attempts_provider ON call_attempts(provider_call_id)`,
  `CREATE INDEX IF NOT EXISTS idx_call_attempts_case ON call_attempts(case_id, created_at)`,
];

export async function ensureSchema() {
  const db = getDb();
  for (const statement of schemaStatements) {
    await db.prepare(statement).run();
  }
}
