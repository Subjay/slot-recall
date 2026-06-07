export type SlotStatus = 'open' | 'booked' | 'cancelled' | 'in_recovery';
export type CallAttemptStatus = 'placed' | 'completed' | 'failed';
export type RecoverySessionStatus = 'active' | 'awaiting_callback' | 'completed' | 'exhausted' | 'aborted';
export type WaitlistEntryStatus = 'waiting' | 'contacted' | 'booked' | 'removed';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string | null;
  phone: string;
  email: string | null;
}

export interface Slot {
  id: number;
  provider: string;
  start_time: string;
  duration_min: number;
  status: SlotStatus;
  booked_patient_id: number | null;
  updated_at: string;
}

export interface WaitlistEntry {
  id: number;
  patient_id: number;
  provider_pref: string | null;
  duration_needed_min: number;
  urgency: number;
  complexity: number;
  time_pref: string | null;
  consent_to_call: boolean;
  status: WaitlistEntryStatus;
  times_contacted: number;
  created_at: string;
}

export interface WaitlistEntryWithPatient extends WaitlistEntry {
  patient: Patient;
}

export interface RecoverySession {
  id: string;
  slot_id: number;
  status: RecoverySessionStatus;
  candidate_ids: number[];
  current_idx: number;
  created_at: string;
  updated_at: string;
}

export interface CallAttempt {
  id: number;
  slot_id: number;
  patient_id: number;
  waitlist_entry_id: number | null;
  recovery_session_id: string | null;
  fonio_debug_id: string | null;
  status: CallAttemptStatus;
  outcome: string | null;
  outcome_reason: string | null;
  summary: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScheduledCallback {
  id: number;
  recovery_session_id: string;
  waitlist_entry_id: number;
  retry_after: string;
  expires_at: string;
  fired: boolean;
}
