import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
  { auth: { persistSession: false } },
);

async function seed() {
  console.log('Seeding demo data...');

  // Wipe in dependency order
  await db.from('scheduled_callbacks').delete().neq('id', 0);
  await db.from('call_attempts').delete().neq('id', 0);
  await db.from('recovery_sessions').delete().neq('id', 0);
  await db.from('waitlist_entries').delete().neq('id', 0);
  await db.from('slots').delete().neq('id', 0);
  await db.from('patients').delete().neq('id', 0);

  // Patients
  const { data: patients, error: pe } = await db
    .from('patients')
    .insert([
      { first_name: 'Christian', last_name: 'Mueller',  phone: '+4367764842662', email: 'christian.mueller@example.at' },
      { first_name: 'Anna',      last_name: 'Schmidt',  phone: '+4367612345678', email: 'anna.schmidt@example.at' },
      { first_name: 'Thomas',    last_name: 'Weber',    phone: '+4369912345678', email: null },
      { first_name: 'Maria',     last_name: 'Fischer',  phone: '+4366012345678', email: 'maria.fischer@example.at' },
      { first_name: 'Franz',     last_name: 'Huber',    phone: '+4367887654321', email: null },
    ])
    .select();
  if (pe) throw pe;
  console.log('Patients:', patients!.map((p: { first_name: string; id: number }) => `${p.first_name} (id=${p.id})`));

  const [p1, p2, p3, p4, p5] = patients!;

  // Slots — use future timestamps so they're always valid
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const tomorrowAfternoon = new Date(tomorrow);
  tomorrowAfternoon.setHours(14, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  dayAfter.setHours(10, 0, 0, 0);

  const nextWeek = new Date(tomorrow);
  nextWeek.setDate(nextWeek.getDate() + 6);
  nextWeek.setHours(11, 0, 0, 0);

  const { data: slots, error: se } = await db
    .from('slots')
    .insert([
      // This is the demo slot — it starts booked and we cancel it to trigger recovery
      { provider: 'Dr. Stefan Bauer', start_time: tomorrow.toISOString(),          duration_min: 60, status: 'booked', booked_patient_id: p1.id },
      { provider: 'Dr. Stefan Bauer', start_time: tomorrowAfternoon.toISOString(), duration_min: 30, status: 'open' },
      { provider: 'Dr. Stefan Bauer', start_time: dayAfter.toISOString(),          duration_min: 60, status: 'open' },
      { provider: 'Dr. Eva Müller',   start_time: nextWeek.toISOString(),          duration_min: 90, status: 'open' },
    ])
    .select();
  if (se) throw se;
  console.log('Slots:', slots!.map((s: { provider: string; duration_min: number; status: string; id: number }) => `${s.provider} ${s.duration_min}min ${s.status} (id=${s.id})`));

  const demoSlot = slots![0];

  // Waitlist entries — spread across urgencies and wait times
  const baseDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  const { error: we } = await db
    .from('waitlist_entries')
    .insert([
      // Should rank high: urgency 5, waiting 14 days, morning pref matches
      { patient_id: p2.id, duration_needed_min: 45, urgency: 5, complexity: 2, time_pref: 'mornings',   consent_to_call: true,  created_at: baseDate(14) },
      // Good urgency, long wait, no time pref
      { patient_id: p3.id, duration_needed_min: 60, urgency: 4, complexity: 1, time_pref: null,          consent_to_call: true,  created_at: baseDate(21) },
      // Lower urgency, very long wait
      { patient_id: p4.id, duration_needed_min: 30, urgency: 2, complexity: 1, time_pref: 'afternoons', consent_to_call: true,  created_at: baseDate(30) },
      // No consent — should be excluded by selection
      { patient_id: p5.id, duration_needed_min: 60, urgency: 5, complexity: 1, time_pref: null,          consent_to_call: false, created_at: baseDate(5) },
    ]);
  if (we) throw we;
  console.log('Waitlist entries created');

  console.log('\n--- Demo ready ---');
  console.log(`Cancel the demo slot with: POST /api/cancellations  { "slot_id": ${demoSlot.id} }`);
  console.log(`Then send a mock webhook to: POST /api/webhook/fonio`);
  console.log('See README for mock webhook payloads.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
