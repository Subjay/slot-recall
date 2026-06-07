import { auditEvent, createId, ensureSchema, getDb, getSecret, nowIso } from "./d1";
import { seedDemoDataIfNeeded } from "./demo-seed";

type AppointmentRow = {
  id: string;
  patient_id: string | null;
  patient_name: string;
  start_time: string;
  end_time: string;
  day_id: "Today" | "Tomorrow";
  status: "confirmed" | "completed" | "filled" | "cancelled" | "open";
  visit: string;
  phone: string;
  original_date: string;
  wait_saved: string;
  notes: string;
};

type WaitlistRow = {
  id: string;
  patient_id: string;
  candidate_name: string;
  phone: string;
  preferred_slot: string;
  status: "queued" | "calling" | "talking" | "accepted" | "declined" | "skipped";
  source: string;
  answer: string;
  priority_score: number;
};

type CaseRow = {
  id: string;
  appointment_id: string;
  day_id: "Today" | "Tomorrow";
  slot_start: string;
  slot_end: string;
  status: "open" | "calling" | "booked" | "failed" | "closed";
};

type CallAttemptRow = {
  id: string;
  case_id: string;
  waitlist_entry_id: string;
  patient_id: string;
  provider_call_id: string | null;
  status: "queued" | "calling" | "talking" | "accepted" | "declined" | "no_answer" | "failed";
};

export type CallRequest = {
  toNumber?: string;
  first_name?: string;
  last_name?: string;
  date?: string;
  location?: string;
  doctor?: string;
  doctor_phone?: string;
  caseId?: string;
  waitlistEntryId?: string;
};

function splitName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return {
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || "Patient",
  };
}

function formatCallDate(slotStart: string) {
  return `today at ${slotStart}`;
}

function minutesFromTime(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function durationFromRange(start: string, end: string) {
  return Math.max(15, minutesFromTime(end) - minutesFromTime(start));
}

function durationFromSlot(slot: string) {
  const [start, end] = slot.split("-");
  if (!start || !end) return 30;
  return durationFromRange(start, end);
}

async function prepareStore() {
  await ensureSchema();
  await seedDemoDataIfNeeded();
}

async function callFonio(context: {
  callId: string;
  toNumber: string;
  firstName: string;
  lastName: string;
  date: string;
  location: string;
  doctor: string;
  doctorPhone: string;
}) {
  const apiKey = getSecret("FONIO_API_KEY");
  const fromNumber = getSecret("OUTBOUND_NUMBER");
  const agentId = getSecret("AGENT_ID");

  if (!apiKey || !fromNumber || !agentId) {
    return {
      providerCallId: `demo_${context.callId}`,
      mode: "demo" as const,
      data: {
        skippedProvider: true,
        reason: "Fonio environment variables are not configured locally.",
      },
    };
  }

  const response = await fetch("https://app.fonio.ai/api/public/v1/outbound_call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      apiKey,
      fromNumber,
      toNumber: context.toNumber,
      agentId,
      context: {
        call_id: context.callId,
        doctor: context.doctor,
        doctor_phone: context.doctorPhone,
        first_name: context.firstName,
        last_name: context.lastName,
        date: context.date,
        location: context.location,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Fonio call failed with ${response.status}`);
  }

  const providerCallId =
    typeof data?.id === "string"
      ? data.id
      : typeof data?.call_id === "string"
        ? data.call_id
        : typeof data?.callId === "string"
          ? data.callId
          : context.callId;

  return { providerCallId, mode: "live" as const, data };
}

async function bookCase(caseId: string, waitlistEntryId: string) {
  const db = getDb();
  const timestamp = nowIso();
  const caseRow = await db
    .prepare("SELECT * FROM replacement_cases WHERE id = ?")
    .bind(caseId)
    .first<CaseRow>();
  const entry = await db
    .prepare("SELECT * FROM waitlist_entries WHERE id = ?")
    .bind(waitlistEntryId)
    .first<WaitlistRow>();

  if (!caseRow || !entry) return;

  await db.batch([
    db
      .prepare(
        `UPDATE appointments
         SET patient_id = ?, patient_name = ?, phone = ?, start_time = ?, end_time = ?, status = 'filled',
             notes = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        entry.patient_id,
        entry.candidate_name,
        entry.phone,
        caseRow.slot_start,
        caseRow.slot_end,
        `Refilled from waitlist. ${entry.candidate_name} accepted.`,
        timestamp,
        caseRow.appointment_id,
      ),
    db
      .prepare(
        `UPDATE replacement_cases
         SET status = 'booked', selected_waitlist_entry_id = ?, resolved_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(waitlistEntryId, timestamp, timestamp, caseId),
    db
      .prepare(
        `UPDATE waitlist_entries
         SET status = 'skipped', answer = 'Accepted. Calendar and patient reminder updated.', updated_at = ?
         WHERE id = ?`,
      )
      .bind(timestamp, waitlistEntryId),
  ]);

  await auditEvent("slot_booked", "replacement_case", caseId, {
    appointmentId: caseRow.appointment_id,
    waitlistEntryId,
  });
}

type CandidateSelection = {
  entry: WaitlistRow;
  segmentStart: string;
  segmentEnd: string;
};

function scoreSelection(entries: WaitlistRow[], slotDuration: number) {
  const used = entries.reduce(
    (total, entry) => total + durationFromSlot(entry.preferred_slot),
    0,
  );
  const waste = slotDuration - used;
  const priority = entries.reduce((total, entry) => total + entry.priority_score, 0);
  const fitBonus = waste === 0 ? 60 : Math.max(0, 30 - waste);
  return priority + fitBonus - waste * 0.35 + entries.length * 8;
}

async function selectBestCandidates(slotStart: string, slotEnd: string) {
  const db = getDb();
  const rows =
    (
      await db
        .prepare(
      `SELECT *
       FROM waitlist_entries
       WHERE status IN ('queued', 'declined')
         AND (cooldown_until IS NULL OR cooldown_until <= ?)
       ORDER BY
         CASE WHEN preferred_slot = ? THEN 0 ELSE 1 END,
         priority_score DESC,
             created_at ASC
       LIMIT 24`,
        )
        .bind(nowIso(), `${slotStart}-${slotEnd}`)
        .all<WaitlistRow>()
    ).results ?? [];

  const slotDuration = durationFromRange(slotStart, slotEnd);
  const usable = rows.filter(
    (entry) => durationFromSlot(entry.preferred_slot) <= slotDuration,
  );

  let bestEntries: WaitlistRow[] = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const entry of usable) {
    const score = scoreSelection([entry], slotDuration);
    if (score > bestScore) {
      bestEntries = [entry];
      bestScore = score;
    }
  }

  for (let first = 0; first < usable.length; first += 1) {
    for (let second = first + 1; second < usable.length; second += 1) {
      const pair = [usable[first], usable[second]].sort(
        (a, b) => durationFromSlot(b.preferred_slot) - durationFromSlot(a.preferred_slot),
      );
      const totalDuration = pair.reduce(
        (total, entry) => total + durationFromSlot(entry.preferred_slot),
        0,
      );
      if (totalDuration > slotDuration) continue;
      const score = scoreSelection(pair, slotDuration);
      if (score > bestScore) {
        bestEntries = pair;
        bestScore = score;
      }
    }
  }

  let cursor = minutesFromTime(slotStart);
  return bestEntries.map((entry) => {
    const duration = durationFromSlot(entry.preferred_slot);
    const segmentStart = timeFromMinutes(cursor);
    cursor += duration;
    return {
      entry,
      segmentStart,
      segmentEnd: timeFromMinutes(cursor),
    };
  }) satisfies CandidateSelection[];
}

export async function getDashboardState() {
  await prepareStore();
  const db = getDb();

  const appointmentRows = (
    await db
      .prepare(
        `SELECT *
         FROM appointments
         ORDER BY CASE day_id WHEN 'Today' THEN 0 ELSE 1 END, start_time ASC`,
      )
      .all<AppointmentRow>()
  ).results ?? [];

  const waitlistRows = (
    await db
      .prepare(
        `SELECT *
         FROM waitlist_entries
         WHERE status != 'skipped'
         ORDER BY
           CASE status
             WHEN 'calling' THEN 0
             WHEN 'talking' THEN 1
             WHEN 'accepted' THEN 2
             WHEN 'queued' THEN 3
             ELSE 4
           END,
           priority_score DESC,
           created_at ASC
         LIMIT 44`,
      )
      .all<WaitlistRow>()
  ).results ?? [];

  const refilledToday = appointmentRows.filter(
    (appointment) => appointment.day_id === "Today" && appointment.status === "filled",
  ).length;
  const cancelled = appointmentRows.filter(
    (appointment) => appointment.status === "cancelled",
  ).length;
  const bookedCases =
    (await db
      .prepare("SELECT COUNT(*) AS count FROM replacement_cases WHERE status = 'booked'")
      .first<{ count: number }>())?.count ?? 0;
  const caseCount =
    (await db
      .prepare("SELECT COUNT(*) AS count FROM replacement_cases")
      .first<{ count: number }>())?.count ?? 0;
  const callCount =
    (await db
      .prepare("SELECT COUNT(*) AS count FROM call_attempts")
      .first<{ count: number }>())?.count ?? 0;
  const totalCancellations = Math.max(19, caseCount + cancelled + 18);
  const refilled = Math.max(8, refilledToday + bookedCases);

  return {
    appointments: appointmentRows.map((appointment) => ({
      id: appointment.id,
      patient: appointment.patient_name,
      start: appointment.start_time,
      end: appointment.end_time,
      status: appointment.status === "open" ? "cancelled" : appointment.status,
      visit: appointment.visit,
      phone: appointment.phone,
      originalDate: appointment.original_date,
      waitSaved: appointment.wait_saved,
      notes: appointment.notes,
      day: appointment.day_id,
    })),
    actions: waitlistRows.map((entry) => ({
      id: entry.id,
      slot: entry.preferred_slot,
      candidate: entry.candidate_name,
      elapsed: "",
      answer: entry.answer,
      status: entry.status === "skipped" ? "queued" : entry.status,
      source: entry.source,
      score: entry.priority_score,
    })),
    metrics: [
      {
        label: "Slots refilled",
        value: String(refilled),
        detail: "31 this week",
        icon: "/icons/KPI1.png",
      },
      {
        label: "Average time to rebook",
        value: "2m 18s",
        detail: `${Math.max(41, callCount + 41)} calls included`,
        icon: "/icons/KPI2.png",
      },
      {
        label: "Average waiting time saved",
        value: "12.4 days",
        detail: "Per accepted patient",
        icon: "/icons/KPI3.png",
      },
      {
        label: "Refill Rate",
        value: `${Math.round((refilled / totalCancellations) * 100)}%`,
        detail: `${refilled} of ${totalCancellations} cancellations`,
        icon: "/icons/KPI4.png",
      },
    ],
  };
}

export async function startOutboundCall(input: CallRequest) {
  await prepareStore();
  const db = getDb();
  const timestamp = nowIso();

  let caseRow: CaseRow | null = null;
  let entry: WaitlistRow | null = null;

  if (input.caseId && input.waitlistEntryId) {
    caseRow = await db
      .prepare("SELECT * FROM replacement_cases WHERE id = ?")
      .bind(input.caseId)
      .first<CaseRow>();
    entry = await db
      .prepare("SELECT * FROM waitlist_entries WHERE id = ?")
      .bind(input.waitlistEntryId)
      .first<WaitlistRow>();
  }

  const callId = createId("call");
  const name = entry?.candidate_name ?? `${input.first_name ?? "Demo"} ${input.last_name ?? "Patient"}`;
  const nameParts = splitName(name);
  const toNumber = entry?.phone ?? input.toNumber;

  if (!toNumber) {
    throw new Error("Missing toNumber for outbound call.");
  }

  if (!caseRow) {
    const slotStart = "10:35";
    const slotEnd = "11:15";
    const caseId = createId("case");
    await db
      .prepare(
        `INSERT INTO replacement_cases
         (id, appointment_id, day_id, slot_start, slot_end, status, created_at, updated_at)
         VALUES (?, 'apt-1035', 'Today', ?, ?, 'calling', ?, ?)`,
      )
      .bind(caseId, slotStart, slotEnd, timestamp, timestamp)
      .run();
    caseRow = {
      id: caseId,
      appointment_id: "apt-1035",
      day_id: "Today",
      slot_start: slotStart,
      slot_end: slotEnd,
      status: "calling",
    };
  }

  if (!entry) {
    const patientId = createId("pat");
    const entryId = createId("wait");
    await db.batch([
      db
        .prepare(
          `INSERT INTO patients
           (id, first_name, last_name, phone, preferred_visit, priority_score, availability_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Consultation', 50, 'Manual test call.', ?, ?)`,
        )
        .bind(patientId, nameParts.firstName, nameParts.lastName, toNumber, timestamp, timestamp),
      db
        .prepare(
          `INSERT INTO waitlist_entries
           (id, patient_id, candidate_name, phone, desired_visit, preferred_slot, status, source, answer, priority_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Consultation', ?, 'calling', 'Manual test call', 'Calling from dashboard test.', 50, ?, ?)`,
        )
        .bind(entryId, patientId, name, toNumber, `${caseRow.slot_start}-${caseRow.slot_end}`, timestamp, timestamp),
    ]);
    entry = {
      id: entryId,
      patient_id: patientId,
      candidate_name: name,
      phone: toNumber,
      preferred_slot: `${caseRow.slot_start}-${caseRow.slot_end}`,
      status: "calling",
      source: "Manual test call",
      answer: "Calling from dashboard test.",
      priority_score: 50,
    };
  }

  await db
    .prepare(
      `INSERT INTO call_attempts
       (id, case_id, waitlist_entry_id, patient_id, status, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'calling', ?, ?, ?)`,
    )
    .bind(callId, caseRow.id, entry.id, entry.patient_id, timestamp, timestamp, timestamp)
    .run();

  await db.batch([
    db
      .prepare("UPDATE waitlist_entries SET status = 'calling', answer = ?, last_contact_at = ?, updated_at = ? WHERE id = ?")
      .bind(`Calling now. Offered the ${caseRow.slot_start} slot.`, timestamp, timestamp, entry.id),
    db
      .prepare("UPDATE replacement_cases SET status = 'calling', updated_at = ? WHERE id = ?")
      .bind(timestamp, caseRow.id),
  ]);

  const callResult = await callFonio({
    callId,
    toNumber,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    date: typeof input.date === "string" ? input.date : formatCallDate(caseRow.slot_start),
    location: input.location ?? "Practice reception",
    doctor: input.doctor ?? "Practice team",
    doctorPhone: input.doctor_phone ?? "",
  });

  await db
    .prepare(
      `UPDATE call_attempts
       SET provider_call_id = ?, raw_payload = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(callResult.providerCallId, JSON.stringify(callResult.data), nowIso(), callId)
    .run();

  await auditEvent("call_started", "call_attempt", callId, {
    caseId: caseRow.id,
    waitlistEntryId: entry.id,
    mode: callResult.mode,
  });

  return {
    callId,
    providerCallId: callResult.providerCallId,
    mode: callResult.mode,
    caseId: caseRow.id,
    waitlistEntryId: entry.id,
    data: callResult.data,
  };
}

export async function cancelAppointments(ids: string[]) {
  await prepareStore();
  const db = getDb();
  const timestamp = nowIso();
  const results = [];

  for (const id of ids) {
    const appointment = await db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .bind(id)
      .first<AppointmentRow>();
    if (!appointment || appointment.status === "cancelled") continue;

    const selections = await selectBestCandidates(
      appointment.start_time,
      appointment.end_time,
    );

    await db
      .prepare(
        `UPDATE appointments
         SET status = 'cancelled', notes = 'Cancelled manually. AI started calling the waitlist.', updated_at = ?
         WHERE id = ?`,
      )
      .bind(timestamp, id)
      .run();

    if (selections.length === 0) {
      const caseId = createId("case");
      await db
        .prepare(
          `INSERT INTO replacement_cases
           (id, appointment_id, day_id, slot_start, slot_end, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)`,
        )
        .bind(
          caseId,
          appointment.id,
          appointment.day_id,
          appointment.start_time,
          appointment.end_time,
          timestamp,
          timestamp,
        )
        .run();
      await auditEvent("appointment_cancelled", "appointment", id, {
        caseId,
        patient: appointment.patient_name,
      });
      results.push({ appointmentId: id, caseId, status: "failed" });
      continue;
    }

    for (const [index, selection] of selections.entries()) {
      const caseId = createId("case");
      const segmentAppointmentId =
        index === 0 ? appointment.id : `${appointment.id}-split-${index}`;

      if (index > 0) {
        await db
          .prepare(
            `INSERT OR REPLACE INTO appointments
             (id, patient_id, patient_name, start_time, end_time, day_id, status, visit, phone, original_date, wait_saved, notes, created_at, updated_at)
             VALUES (?, NULL, 'Open segment', ?, ?, ?, 'cancelled', ?, '', ?, ?, 'Split from longer cancelled slot.', ?, ?)`,
          )
          .bind(
            segmentAppointmentId,
            selection.segmentStart,
            selection.segmentEnd,
            appointment.day_id,
            appointment.visit,
            appointment.original_date,
            appointment.wait_saved,
            timestamp,
            timestamp,
          )
          .run();
      }

      await db
        .prepare(
          `INSERT INTO replacement_cases
           (id, appointment_id, day_id, slot_start, slot_end, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
        )
        .bind(
          caseId,
          segmentAppointmentId,
          appointment.day_id,
          selection.segmentStart,
          selection.segmentEnd,
          timestamp,
          timestamp,
        )
        .run();

      await auditEvent("appointment_cancelled", "appointment", segmentAppointmentId, {
        caseId,
        patient: appointment.patient_name,
        splitIndex: index,
      });

      const call = await startOutboundCall({
        caseId,
        waitlistEntryId: selection.entry.id,
        location: "Practice reception",
        doctor: "Practice team",
      });

      if (call.mode === "demo") {
        await db
          .prepare(
            `UPDATE call_attempts
             SET status = 'accepted', outcome = 'accepted', outcome_reason = 'Demo mode auto-accept', ended_at = ?, updated_at = ?
             WHERE id = ?`,
          )
          .bind(nowIso(), nowIso(), call.callId)
          .run();
        await bookCase(caseId, selection.entry.id);
      }

      results.push({
        appointmentId: segmentAppointmentId,
        caseId,
        status: call.mode === "demo" ? "booked" : "calling",
        call,
        segment: `${selection.segmentStart}-${selection.segmentEnd}`,
      });
    }
  }

  return {
    results,
    state: await getDashboardState(),
  };
}

function inferOutcome(body: Record<string, unknown>) {
  const statusText = JSON.stringify(body).toLowerCase();
  if (statusText.includes("accept") || statusText.includes("confirmed")) {
    return "accepted";
  }
  if (statusText.includes("no_answer") || statusText.includes("missed")) {
    return "no_answer";
  }
  if (statusText.includes("reject") || statusText.includes("declin")) {
    return "declined";
  }
  if (statusText.includes("fail") || statusText.includes("error")) {
    return "failed";
  }
  return "declined";
}

function providerIdFromWebhook(body: Record<string, unknown>) {
  const context = body.context as Record<string, unknown> | undefined;
  const candidates = [
    body.call_id,
    body.callId,
    body.id,
    body.provider_call_id,
    context?.call_id,
    context?.callId,
  ];
  return candidates.find((value): value is string => typeof value === "string");
}

export async function handleEndCallWebhook(body: Record<string, unknown>) {
  await prepareStore();
  const db = getDb();
  const timestamp = nowIso();
  const providerId = providerIdFromWebhook(body);

  if (!providerId) {
    await auditEvent("webhook_unmatched", "call_attempt", "unknown", body);
    return { matched: false, reason: "No provider call id in webhook." };
  }

  const attempt = await db
    .prepare(
      `SELECT *
       FROM call_attempts
       WHERE id = ? OR provider_call_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(providerId, providerId)
    .first<CallAttemptRow>();

  if (!attempt) {
    await auditEvent("webhook_unmatched", "call_attempt", providerId, body);
    return { matched: false, reason: "No call attempt found." };
  }

  const outcome = inferOutcome(body);
  await db
    .prepare(
      `UPDATE call_attempts
       SET status = ?, outcome = ?, outcome_reason = ?, raw_payload = ?, ended_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      outcome,
      outcome,
      typeof body.reason === "string" ? body.reason : "Fonio end-call webhook",
      JSON.stringify(body),
      timestamp,
      timestamp,
      attempt.id,
    )
    .run();

  if (outcome === "accepted") {
    await bookCase(attempt.case_id, attempt.waitlist_entry_id);
  } else {
    await db
      .prepare(
        `UPDATE waitlist_entries
         SET status = 'declined', answer = ?, cooldown_until = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        outcome === "no_answer" ? "No answer. Moved behind active matches." : "Rejected this slot.",
        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        timestamp,
        attempt.waitlist_entry_id,
      )
      .run();
  }

  await auditEvent("call_finished", "call_attempt", attempt.id, {
    outcome,
    providerId,
  });

  return {
    matched: true,
    outcome,
    state: await getDashboardState(),
  };
}
