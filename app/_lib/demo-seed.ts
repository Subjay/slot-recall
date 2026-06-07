import { createId, getDb, nowIso } from "./d1";

type AppointmentSeed = {
  id: string;
  patient: string;
  start: string;
  end: string;
  status: "confirmed" | "completed" | "filled" | "cancelled";
  visit: string;
  phone: string;
  originalDate: string;
  waitSaved: string;
  notes: string;
  day: "Today" | "Tomorrow";
};

type WaitlistSeed = {
  id: string;
  candidate: string;
  phone: string;
  slot: string;
  answer: string;
  status: "queued" | "calling" | "talking" | "accepted" | "declined";
  source: string;
  score: number;
};

const appointments: AppointmentSeed[] = [
  ["apt-0715", "Mara Leitner", "07:15", "07:40", "completed", "Check-up", "+43 660 102 441", "Jun 21", "15 days", "Arrived early. No refill action needed.", "Today"],
  ["apt-0800", "Noah Berger", "08:00", "08:30", "confirmed", "Consultation", "+43 676 221 908", "Jun 19", "13 days", "Prefers morning appointments.", "Today"],
  ["apt-0910", "Tara Weiss", "09:10", "09:30", "confirmed", "Follow-up", "+43 699 118 705", "Jun 14", "8 days", "Short visit, can arrive with 20 minutes notice.", "Today"],
  ["apt-0940", "Ivo Hartmann", "09:40", "10:10", "confirmed", "Review", "+43 681 212 904", "Jun 23", "17 days", "Can be moved within the morning.", "Today"],
  ["apt-1035", "Peter Huber", "10:35", "11:15", "confirmed", "Consultation", "+43 664 891 033", "Jun 27", "21 days", "Booked. No refill action needed.", "Today"],
  ["apt-1145", "Elena Rossi", "11:45", "12:10", "confirmed", "Review", "+43 650 450 921", "Jun 18", "12 days", "Needs a quiet confirmation call if moved.", "Today"],
  ["apt-1225", "Milan Kral", "12:25", "12:55", "confirmed", "Follow-up", "+43 699 330 712", "Jun 26", "20 days", "Lunch window works best.", "Today"],
  ["apt-1320", "Amira Hassan", "13:20", "13:50", "filled", "Follow-up", "+43 681 330 778", "Jun 24", "18 days", "Accepted a same-day refill after one missed call before her.", "Today"],
  ["apt-1440", "Lukas Meyer", "14:40", "15:25", "confirmed", "Consultation", "+43 676 011 443", "Jun 28", "22 days", "Available after lunch.", "Today"],
  ["apt-1535", "Klara Novak", "15:35", "16:05", "confirmed", "Check-up", "+43 660 840 129", "Jun 22", "16 days", "Prefers a short afternoon appointment.", "Today"],
  ["apt-1630", "Rina Novak", "16:30", "16:55", "confirmed", "Follow-up", "+43 699 770 553", "Jun 20", "14 days", "Consent recorded for outbound scheduling calls.", "Today"],
  ["apt-1705", "Oliver Kunz", "17:05", "17:35", "confirmed", "Review", "+43 676 412 882", "Jun 24", "18 days", "Can come after work.", "Today"],
  ["apt-1815", "Jonas Klein", "18:15", "18:45", "confirmed", "Review", "+43 664 540 119", "Jun 16", "10 days", "Can take earlier slots after 17:00.", "Today"],
  ["apt-1905", "Theo Brandner", "19:05", "20:05", "confirmed", "Consultation", "+43 681 905 441", "Jun 30", "24 days", "Long slot used to test split refills.", "Today"],
  ["apt-2040", "Sofia Marin", "20:40", "21:10", "confirmed", "Consultation", "+43 650 717 042", "Jun 25", "19 days", "Evening appointment kept as backup.", "Today"],
  ["apt-t-0800", "Greta Moser", "08:00", "08:25", "confirmed", "Check-up", "+43 660 552 110", "Jun 22", "9 days", "Prefers an early slot.", "Tomorrow"],
  ["apt-t-0915", "Felix Brunner", "09:15", "09:55", "confirmed", "Consultation", "+43 676 884 201", "Jun 17", "11 days", "First consultation, needs full slot.", "Tomorrow"],
  ["apt-t-1100", "Sara Lindner", "11:00", "11:25", "confirmed", "Follow-up", "+43 699 230 447", "Jun 20", "14 days", "Short follow-up.", "Tomorrow"],
  ["apt-t-1240", "Onur Demir", "12:40", "13:20", "confirmed", "Review", "+43 664 119 805", "Jun 26", "20 days", "Available around lunch only.", "Tomorrow"],
  ["apt-t-1430", "Helena Pichler", "14:30", "14:55", "confirmed", "Follow-up", "+43 650 770 318", "Jun 19", "13 days", "Consent recorded for scheduling calls.", "Tomorrow"],
  ["apt-t-1610", "Jan Wagner", "16:10", "16:50", "confirmed", "Consultation", "+43 681 442 970", "Jun 24", "18 days", "Can take earlier slots after 15:00.", "Tomorrow"],
  ["apt-t-1815", "Maja Horvat", "18:15", "18:40", "confirmed", "Review", "+43 660 905 233", "Jun 16", "10 days", "Evening preference.", "Tomorrow"],
].map((item) => ({
  id: item[0],
  patient: item[1],
  start: item[2],
  end: item[3],
  status: item[4],
  visit: item[5],
  phone: item[6],
  originalDate: item[7],
  waitSaved: item[8],
  notes: item[9],
  day: item[10],
})) as AppointmentSeed[];

const waitlist: WaitlistSeed[] = [
  ["act-0", "Daniela Pichler", "+43 676 410 100", "10:35-11:15", "Best match for the open slot.", "queued", "Peter Huber cancellation", 96],
  ["act-1", "Clara Wagner", "+43 660 410 101", "10:35-11:15", "Can arrive within 25 minutes.", "queued", "Peter Huber cancellation", 94],
  ["act-2", "Amira Hassan", "+43 681 330 778", "13:20-13:50", "High match, ready to be called.", "queued", "Morning cancellation", 92],
  ["act-3", "Markus Frei", "+43 664 410 103", "15:10-15:40", "Waiting behind higher priority matches.", "queued", "Morning cancellation", 88],
  ["act-4", "Nina Bauer", "+43 676 410 104", "15:10-15:40", "Prefers afternoon slots.", "queued", "Resolved refill", 86],
  ["act-5", "Mika Braun", "+43 660 410 105", "08:00-08:30", "Earlier appointment preference matched.", "queued", "Noah Berger cancellation", 84],
  ["act-6", "Lea Steiner", "+43 699 410 106", "09:10-09:30", "Short notice consent is recorded.", "queued", "Tara Weiss cancellation", 82],
  ["act-7", "Adam Novak", "+43 664 410 107", "11:45-12:10", "Same-day availability confirmed.", "queued", "Elena Rossi cancellation", 80],
  ["act-8", "Vera Schmidt", "+43 676 410 108", "14:40-15:25", "Treatment type matches the slot.", "queued", "Lukas Meyer cancellation", 78],
  ["act-9", "Jonas Klein", "+43 664 540 119", "16:30-16:55", "Available after work.", "queued", "Rina Novak cancellation", 76],
  ["act-10", "Sofia Marin", "+43 650 717 042", "18:15-18:45", "Evening preference matches.", "queued", "Jonas Klein cancellation", 74],
  ["act-11", "Tobias Gruber", "+43 681 410 111", "20:40-21:10", "Flexible for late appointments.", "queued", "Sofia Marin cancellation", 72],
  ["act-12", "Laura Hofer", "+43 660 410 112", "07:15-07:40", "Morning refill candidate.", "queued", "Mara Leitner cancellation", 70],
  ["act-13", "Ben Adler", "+43 676 410 113", "08:00-08:30", "Contact priority is medium.", "queued", "Noah Berger cancellation", 68],
  ["act-14", "Hanna Koch", "+43 699 410 114", "09:10-09:30", "Needs confirmation before 09:00.", "queued", "Tara Weiss cancellation", 66],
  ["act-15", "Oscar Lang", "+43 664 410 115", "10:35-11:15", "Fallback if first match declines.", "queued", "Peter Huber cancellation", 64],
  ["act-16", "Mina Weber", "+43 676 410 116", "11:45-12:10", "Can arrive with 30 minutes notice.", "queued", "Elena Rossi cancellation", 62],
  ["act-17", "Felix Brandt", "+43 681 410 117", "13:20-13:50", "Waitlist score is high.", "queued", "Morning cancellation", 60],
  ["act-18", "Iris Fuchs", "+43 650 410 118", "14:40-15:25", "Prefers same physician.", "queued", "Lukas Meyer cancellation", 58],
  ["act-19", "Paul Stern", "+43 660 410 119", "16:30-16:55", "Last fallback before human review.", "queued", "Rina Novak cancellation", 56],
].map((item) => ({
  id: item[0],
  candidate: item[1],
  phone: item[2],
  slot: item[3],
  answer: item[4],
  status: item[5],
  source: item[6],
  score: item[7],
})) as WaitlistSeed[];

async function upsertDemoBaseline() {
  const db = getDb();
  const timestamp = nowIso();
  const statements = [];

  for (const appointment of appointments) {
    const patientId = `pat_${appointment.id}`;
    const { firstName, lastName } = nameParts(appointment.patient);
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO patients
           (id, first_name, last_name, phone, preferred_visit, waiting_since, original_appointment_date, priority_score, availability_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          patientId,
          firstName,
          lastName,
          appointment.phone,
          appointment.visit,
          "2026-05-22",
          appointment.originalDate,
          50,
          appointment.notes,
          timestamp,
          timestamp,
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO appointments
           (id, patient_id, patient_name, start_time, end_time, day_id, status, visit, phone, original_date, wait_saved, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          appointment.id,
          patientId,
          appointment.patient,
          appointment.start,
          appointment.end,
          appointment.day,
          appointment.status,
          appointment.visit,
          appointment.phone,
          appointment.originalDate,
          appointment.waitSaved,
          appointment.notes,
          timestamp,
          timestamp,
        ),
    );
  }

  for (const entry of waitlist) {
    const patientId = `pat_wait_${entry.id}`;
    const { firstName, lastName } = nameParts(entry.candidate);
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO patients
           (id, first_name, last_name, phone, preferred_visit, waiting_since, original_appointment_date, priority_score, availability_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          patientId,
          firstName,
          lastName,
          entry.phone,
          "Consultation",
          "2026-05-20",
          "Jun 28",
          entry.score,
          entry.answer,
          timestamp,
          timestamp,
        ),
      db
        .prepare(
          `INSERT OR IGNORE INTO waitlist_entries
           (id, patient_id, candidate_name, phone, desired_visit, preferred_slot, status, source, answer, priority_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Consultation', ?, 'queued', ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          patientId,
          entry.candidate,
          entry.phone,
          entry.slot,
          entry.source,
          entry.answer,
          entry.score,
          timestamp,
          timestamp,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `UPDATE waitlist_entries
         SET status = 'queued', answer = 'Waiting for the next matching cancellation.', updated_at = ?
         WHERE status IN ('talking', 'accepted')`,
      )
      .bind(timestamp),
  );

  await db.batch(statements);
}

function nameParts(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return {
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" ") || "Patient",
  };
}

export async function seedDemoDataIfNeeded() {
  const db = getDb();
  const existing = await db
    .prepare("SELECT COUNT(*) AS count FROM appointments")
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) {
    await upsertDemoBaseline();
    return;
  }

  const timestamp = nowIso();
  const statements = [];

  for (const appointment of appointments) {
    const patientId = `pat_${appointment.id}`;
    const { firstName, lastName } = nameParts(appointment.patient);
    statements.push(
      db
        .prepare(
          `INSERT INTO patients
           (id, first_name, last_name, phone, preferred_visit, waiting_since, original_appointment_date, priority_score, availability_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          patientId,
          firstName,
          lastName,
          appointment.phone,
          appointment.visit,
          "2026-05-22",
          appointment.originalDate,
          50,
          appointment.notes,
          timestamp,
          timestamp,
        ),
      db
        .prepare(
          `INSERT INTO appointments
           (id, patient_id, patient_name, start_time, end_time, day_id, status, visit, phone, original_date, wait_saved, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          appointment.id,
          patientId,
          appointment.patient,
          appointment.start,
          appointment.end,
          appointment.day,
          appointment.status,
          appointment.visit,
          appointment.phone,
          appointment.originalDate,
          appointment.waitSaved,
          appointment.notes,
          timestamp,
          timestamp,
        ),
    );
  }

  for (const entry of waitlist) {
    const patientId = `pat_wait_${entry.id}`;
    const { firstName, lastName } = nameParts(entry.candidate);
    statements.push(
      db
        .prepare(
          `INSERT INTO patients
           (id, first_name, last_name, phone, preferred_visit, waiting_since, original_appointment_date, priority_score, availability_note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          patientId,
          firstName,
          lastName,
          entry.phone,
          "Consultation",
          "2026-05-20",
          "Jun 28",
          entry.score,
          entry.answer,
          timestamp,
          timestamp,
        ),
      db
        .prepare(
          `INSERT INTO waitlist_entries
           (id, patient_id, candidate_name, phone, desired_visit, preferred_slot, status, source, answer, priority_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          entry.id,
          patientId,
          entry.candidate,
          entry.phone,
          "Consultation",
          entry.slot,
          entry.status,
          entry.source,
          entry.answer,
          entry.score,
          timestamp,
          timestamp,
        ),
    );
  }

  await db.batch(statements);
  await upsertDemoBaseline();
  await db
    .prepare(
      `INSERT INTO audit_events (id, event_type, entity_type, entity_id, payload, created_at)
       VALUES (?, 'demo_seeded', 'system', 'demo', ?, ?)`,
    )
    .bind(createId("audit"), JSON.stringify({ appointments: appointments.length, waitlist: waitlist.length }), timestamp)
    .run();
}
