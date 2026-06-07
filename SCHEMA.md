# Slot Recall — Database Schema Reference

This document describes every table and column in [schema.sql](schema.sql), how each
column is **written**, **read**, and **guarded**, and the exact files that touch it.

The schema is the single source of truth. The dashboard's "live" feel comes entirely
from Supabase realtime propagating these writes — there is no separate push channel.

**Legend**
- ✍️ **Written by** — code that inserts/updates this column
- 👁️ **Read by** — code that selects/branches on it
- 🔒 **Guard** — invariant or constraint that protects correctness

---

## Table relationship overview

```
patients ──┬─< slots.booked_patient_id
           ├─< waitlist_entries.patient_id
           └─< call_attempts.patient_id

slots ─────┬─< recovery_sessions.slot_id   (UNIQUE — one session per slot)
           └─< call_attempts.slot_id

waitlist_entries ──< call_attempts.waitlist_entry_id
                  └ (ids also stored in recovery_sessions.candidate_ids[])

recovery_sessions ─┬─< call_attempts.recovery_session_id
                   └─< scheduled_callbacks.recovery_session_id
```

The two reliability anchors live here:
- **`recovery_sessions.slot_id` UNIQUE** → idempotency (one recovery per slot).
- **`slots.status = 'in_recovery'`** → the booking lock (a slot is booked exactly once).

---

## 1. `patients`

Identity and contact data. Seeded/mocked — no EHR integration.

| Column | Type | Handling |
|---|---|---|
| `id` | bigserial PK | ✍️ [routes/patients.ts](src/routes/patients.ts), [seed.ts](seed.ts). 👁️ FK target everywhere; joined as `patient:patients(*)` in [db/waitlist.ts](src/db/waitlist.ts). |
| `first_name` | text, not null | ✍️ patients route / seed. 👁️ [services/caller.ts](src/services/caller.ts) → injected into fonio `context.first_name`. |
| `last_name` | text, nullable | ✍️ same. 👁️ caller.ts uses `?? ''` (fonio context requires a string). |
| `phone` | text, not null | ✍️ same; 🔒 validated `^\+\d+$` (E.164) by the patients route JSON schema. 👁️ caller.ts → fonio `toNumber`. **This is the only column the live call dials.** |
| `email` | text, nullable | ✍️ same. Stored only — not used in the loop. |

**Note:** personal data. Consent to *call* is enforced on `waitlist_entries`, not here.

---

## 2. `slots`

The appointment slots. **`status` is the central lock of the whole system.**

| Column | Type | Handling |
|---|---|---|
| `id` | bigserial PK | ✍️ seed. 👁️ FK target; primary lookup in [db/slots.ts](src/db/slots.ts) `getSlot`. |
| `provider` | text, not null | 👁️ [services/selection.ts](src/services/selection.ts) — matched against `waitlist_entries.provider_pref`. Also a `getSlots` filter. |
| `start_time` | timestamptz, not null | 👁️ caller.ts derives fonio `day`/`month`/`year` from it (`getDate()`, `getMonth()+1`, `getFullYear()`). 👁️ selection.ts `matchTimePref` reads `getHours()`. 👁️ `getSlots` date-range filter. |
| `duration_min` | integer, not null | 🔒 selection eligibility: a candidate is excluded if `duration_needed_min > duration_min`. Applied in both [db/waitlist.ts](src/db/waitlist.ts) `getEligibleEntries` (`.lte`) and selection.ts (defense in depth). |
| `status` | text, default `open` | **The lock.** `open \| booked \| cancelled \| in_recovery`. See state machine below. ✍️/🔒 every transition is a guarded UPDATE in db/slots.ts. |
| `booked_patient_id` | bigint FK → patients | ✍️ set by `bookSlotRow` (on accept), cleared by `openSlot` (on exhaust/abort). 👁️ joined in `getSlots` for the dashboard. |
| `updated_at` | timestamptz | ✍️ stamped `now()` on every status change so the dashboard can order by recency. |

### `slots.status` state machine

```
open
 └─ cancellation ──────────────→ cancelled
                                    └─ lockSlotForRecovery ──→ in_recovery
                                                                 ├─ bookSlotRow (accept) ─→ booked
                                                                 ├─ openSlot (exhausted)  ─→ open
                                                                 └─ openSlot (aborted)    ─→ open
```

**Where each transition lives** (all in [db/slots.ts](src/db/slots.ts)):

| Function | SQL guard | Meaning |
|---|---|---|
| `lockSlotForRecovery(id)` | `WHERE status IN ('booked','cancelled')` | Atomically claim the slot. Returns `true` only to the winner; duplicate/concurrent triggers get `false`. |
| `bookSlotRow(id, patientId)` | `WHERE status = 'in_recovery'` | 🔒 **The booking-exactly-once guarantee.** 0 rows returned ⇒ already booked elsewhere ⇒ [services/booking.ts](src/services/booking.ts) throws `DOUBLE_BOOK_PREVENTED`. |
| `openSlot(id)` | `WHERE status = 'in_recovery'` | Revert to `open` on exhaustion/abort; also clears `booked_patient_id`. |

The cancellation entry flips `booked → cancelled → in_recovery`; see
[services/cancellation.ts](src/services/cancellation.ts). The `cancelled` state is
transient in the happy path but persists if no candidates exist (slot reopened).

---

## 3. `waitlist_entries`

The waiting list. Selection **filters** then **ranks** these. Both happen in our
backend, never in fonio.

| Column | Type | Handling |
|---|---|---|
| `id` | bigserial PK | 👁️ Stored (ordered) in `recovery_sessions.candidate_ids[]`; referenced by `call_attempts.waitlist_entry_id`. Looked up by `getEntryWithPatient`. |
| `patient_id` | bigint FK, not null | 👁️ Joined to patient for phone/name in [db/waitlist.ts](src/db/waitlist.ts). |
| `provider_pref` | text, nullable | 🔒 **Filter:** `null` = any provider; otherwise must equal `slot.provider` (selection.ts). |
| `duration_needed_min` | integer, not null | 🔒 **Filter:** must be `≤ slot.duration_min`. |
| `urgency` | integer 1..5, default 3 | 📊 **Rank** — weight **0.35**. Normalized `(urgency-1)/4` in selection.ts. |
| `complexity` | integer, default 1 | ⚠️ **Stored but not yet used in scoring.** Present for future ranking refinement. Flagging honestly — see "Unused" note below. |
| `time_pref` | text, nullable | 📊 **Rank** — weight **0.20** via `matchTimePref` (`mornings`/`afternoons`/`evenings` vs slot hour; `null` or unknown → neutral 0.5). Schema comment mentions JSON, but the code currently treats it as a plain keyword string. |
| `consent_to_call` | boolean, default false | 🔒 **Hard consent gate.** Filtered `= true` in `getEligibleEntries` *before any call is placed*. Re-checked in selection.ts. **No path calls a non-consenting patient.** |
| `status` | text, default `waiting` | `waiting \| contacted \| booked \| removed`. See lifecycle below. |
| `times_contacted` | integer, default 0 | 📊 **Rank — fairness** weight **0.15**, score `1/(1+times_contacted)`. ✍️ incremented by `declineCandidate`. Prevents the same person being perpetually skipped *and* re-prioritized after a decline. |
| `created_at` | timestamptz, default now() | 📊 **Rank — wait time** weight **0.30**. Normalized against the longest wait in the eligible set (selection.ts). |

### Selection score (in [services/selection.ts](src/services/selection.ts))

```
score = 0.35 · urgency_norm      (urgency)
      + 0.30 · wait_time_norm     (created_at)
      + 0.20 · time_pref_match    (time_pref vs start_time hour)
      + 0.15 · fairness           (1 / (1 + times_contacted))
```

Every candidate's full score breakdown is logged (`[selection] ranked for slot …`)
so the ranking is explainable, not a black box.

### `waitlist_entries.status` lifecycle

| Transition | Function | When |
|---|---|---|
| `waiting → contacted` | `markContacted` ([db/waitlist.ts](src/db/waitlist.ts)) | A call is placed to this candidate (caller.ts). |
| `contacted → waiting` (+`times_contacted++`) | `declineCandidate` | Decline / no-answer / voicemail / callback-expired. They stay on the list, ranked lower by fairness. |
| `contacted → booked` | `markBooked` | Patient accepted; slot booked ([services/booking.ts](src/services/booking.ts)). |
| `removed` | *(not yet wired)* | Reserved for manual removal from the dashboard. |

🔒 **In-session re-call prevention:** a candidate who declines is reset to `waiting`,
so a mid-session re-rank could in principle re-queue them for the *same* slot. This is
prevented two ways: (1) `recovery_sessions.current_idx` only ever advances forward
through a fixed `candidate_ids` list, and (2) selection accepts an `excludeIds` set of
already-attempted entries. A *new* session for a *different* slot builds a fresh list,
so the patient is fully eligible again.

---

## 4. `recovery_sessions`

One row per cancelled slot. **This is where the loop's position lives — in the DB,
not in memory — so a crash mid-loop can be reasoned about and resumed.**

| Column | Type | Handling |
|---|---|---|
| `id` | uuid PK, default `gen_random_uuid()` | ✍️ `createSession`. 👁️ referenced by `call_attempts.recovery_session_id` and `scheduled_callbacks.recovery_session_id`. |
| `slot_id` | bigint FK, **UNIQUE**, not null | 🔒 **The idempotency guard.** The UNIQUE constraint means a duplicate cancellation that slips past the status lock still fails on INSERT with Postgres code `23505`; `createSession` returns `null` and the caller reopens the slot. One slot can never have two parallel recovery runs. |
| `status` | text, default `active` | `active \| awaiting_callback \| completed \| exhausted \| aborted`. See transitions below. 👁️ [services/outcome.ts](src/services/outcome.ts) ignores webhooks for already-resolved sessions (late/duplicate webhook safety). |
| `candidate_ids` | bigint[], not null | ✍️ set once at selection time — the **ordered** ranked list of `waitlist_entries.id`. 👁️ [services/caller.ts](src/services/caller.ts) indexes into it with `current_idx`. Immutable for the session's life. |
| `current_idx` | integer, default 0 | The pointer into `candidate_ids`. ✍️ `advanceSession` moves it forward on each decline; a callback retry reuses the *same* idx (don't advance). |
| `created_at` | timestamptz, default now() | 📊 [routes/metrics.ts](src/routes/metrics.ts) — start point for "avg fill time" (created_at → accepted call's completed_at). |
| `updated_at` | timestamptz, default now() | ✍️ stamped on every transition. |

### `recovery_sessions.status` transitions (in [db/sessions.ts](src/db/sessions.ts))

| Function | From → To | Trigger |
|---|---|---|
| `createSession` | — → `active` | Cancellation, after selection finds ≥1 candidate. |
| `advanceSession` | `active`/`awaiting_callback` → `active` | Move to next candidate (decline/no-answer/voicemail). |
| `pauseForCallback` | `active` → `awaiting_callback` | Patient requested a callback. Slot **stays `in_recovery`**. |
| `resumeFromCallback` | `awaiting_callback` → `active` | 🔒 guarded `WHERE status='awaiting_callback'`; scheduler fires the retry. |
| `completeSession` | `active` → `completed` | Slot booked. Terminal. |
| `exhaustSession` | `active` → `exhausted` | Candidate list ran out; slot reopened. Terminal. |
| `abortSession` | `active` → `aborted` | `recording_refused` / `ambiguous` — surfaced to a human; slot reopened. Terminal. |

---

## 5. `call_attempts`

One row per outbound call. **`id` is the correlation key** for the whole
request→webhook round trip (fonio returns no call reference).

| Column | Type | Handling |
|---|---|---|
| `id` | bigserial PK | 🔑 **Correlation key.** ✍️ `createCallAttempt`. Injected into the fonio outbound `context.call_attempt_id`; echoed back in the webhook; used by [fonio/webhook-adapter.ts](src/fonio/webhook-adapter.ts) → `getCallAttempt(id)` to find the right row. |
| `slot_id` | bigint FK, not null | ✍️ set at creation. Audit / dashboard. |
| `patient_id` | bigint FK, not null | ✍️ set at creation. 👁️ booking.ts uses it as `booked_patient_id` on accept. |
| `waitlist_entry_id` | bigint FK, nullable | ✍️ set at creation. 👁️ outcome.ts → `declineCandidate` / `markBooked`. Also drives the per-session `excludeIds` set (`getAttemptedEntryIdsForSession`). |
| `recovery_session_id` | uuid FK, nullable | ✍️ set at creation. 👁️ outcome.ts loads the session to advance/resolve the loop. |
| `fonio_debug_id` | text, nullable | ✍️ written **from the webhook** (`raw.id`, fonio's own call UUID). 🔒 **Debug only — never a lookup key** (it isn't returned in the outbound response, so we can't pre-store it). |
| `status` | text, default `placed` | `placed \| completed \| failed`. ✍️ `placed` at creation → `completed` on webhook → `failed` if fonio rejects dialing. (No `in_progress`: fonio sends exactly one end-of-call webhook, no interim event.) |
| `outcome` | text, nullable | ✍️ from `adaptWebhook` — the internal `CallOutcome` (`accepted \| declined \| no_answer \| voicemail \| callback \| recording_refused \| ambiguous`). 📊 metrics `outcomes_by_reason`. |
| `outcome_reason` | text, nullable | ✍️ human-readable note from fonio `extractionData.reason`, or a `fonio_rejected: …` reason on a failed dial. |
| `summary` | text, nullable | ✍️ fonio `summary`. Dashboard / debugging. |
| `created_at` | timestamptz, default now() | When the call was placed. |
| `completed_at` | timestamptz, nullable | ✍️ from webhook `endTimestamp` (or `now()` on a failed dial). 📊 metrics avg-fill-time end point. |

**Why `id` and not a `fonio_call_ref`:** the original schema had `fonio_call_ref`, but
fonio's outbound response is only `{ status, message }` — no reference. We renamed it to
`fonio_debug_id` (written on the way *back*) and made our own row `id` the correlation
key on the way *out*. This is the single most important schema change from the draft.

---

## 6. `scheduled_callbacks`

Pending callback retries. Polled by [services/callback-scheduler.ts](src/services/callback-scheduler.ts);
the slot stays `in_recovery` the entire time so nothing else can grab it.

| Column | Type | Handling |
|---|---|---|
| `id` | bigserial PK | ✍️ `createCallback` ([db/callbacks.ts](src/db/callbacks.ts)). |
| `recovery_session_id` | uuid FK, not null | 👁️ scheduler loads the paused session to resume it. |
| `waitlist_entry_id` | bigint FK, not null | 👁️ the candidate to retry (same person, same `current_idx`). On expiry, `declineCandidate` is applied to them. |
| `retry_after` | timestamptz, not null | 🔒 `now() + CALLBACK_RETRY_AFTER_MS`. `getDueCallbacks` selects rows where `retry_after ≤ now < expires_at AND fired=false` → fires the retry. |
| `expires_at` | timestamptz, not null | 🔒 `now() + CALLBACK_EXPIRES_AFTER_MS`. `getExpiredCallbacks` selects `expires_at ≤ now AND fired=false` → advances to the next candidate like a decline (`callback_expired`). |
| `fired` | boolean, default false | ✍️ `markFired` set `true` before acting, so a row is processed once even across overlapping poll ticks. |

Both timings are **config constants** ([src/config.ts](src/config.ts)):
`CALLBACK_RETRY_AFTER_MS` (default 15 min) and `CALLBACK_EXPIRES_AFTER_MS` (default 4 h).
Shrink them via `.env` for the demo.

---

## Cross-cutting reliability map

| Guarantee | Mechanism | Column(s) | File |
|---|---|---|---|
| One recovery per slot | UNIQUE constraint | `recovery_sessions.slot_id` | [db/sessions.ts](src/db/sessions.ts) |
| Slot booked exactly once | Guarded UPDATE `WHERE status='in_recovery'` | `slots.status` | [db/slots.ts](src/db/slots.ts) → [services/booking.ts](src/services/booking.ts) |
| No call without consent | Hard filter `consent_to_call=true` before any call | `waitlist_entries.consent_to_call` | [db/waitlist.ts](src/db/waitlist.ts) |
| Correlate async outcome | Self-issued correlation id in fonio context | `call_attempts.id` | [fonio/webhook-adapter.ts](src/fonio/webhook-adapter.ts) |
| Ignore late/dup webhooks | Terminal-state check before acting | `recovery_sessions.status` | [services/outcome.ts](src/services/outcome.ts) |
| Callback fired once | `fired` flag set before action | `scheduled_callbacks.fired` | [services/callback-scheduler.ts](src/services/callback-scheduler.ts) |
| Explainable ranking | Logged score breakdown per candidate | `urgency`, `created_at`, `time_pref`, `times_contacted` | [services/selection.ts](src/services/selection.ts) |

---

## Unused / reserved (flagged honestly)

- **`waitlist_entries.complexity`** — stored and seeded, but **not currently part of the
  selection score**. Reserved for future ranking (e.g., prefer simpler cases for short
  slots). Remove it or wire it in; don't let it imply behavior that isn't there.
- **`waitlist_entries.status = 'removed'`** — defined but no code path sets it yet.
  Intended for manual dashboard removal.
- **`patients.email`** — stored only; the loop never reads it.
- **`time_pref` as JSON** — the schema comment allows JSON, but `matchTimePref` only
  understands the keyword strings `mornings`/`afternoons`/`evenings`. Keep seed data to
  those keywords until the parser is extended.
