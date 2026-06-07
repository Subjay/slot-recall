"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// FLIP animations need to read layout before paint. useLayoutEffect warns
// during SSR, so fall back to useEffect on the server.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Placeholder smart-ranking score, stable per candidate. Later this value
// comes from the ranking model; for now it is derived from the id so the
// reorder is deterministic (no hydration mismatch).
function scoreOf(action: AiAction) {
  if (typeof action.score === "number") return action.score;
  let hash = 0;
  for (const char of action.id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }
  return hash;
}

function sortByScore(list: AiAction[]) {
  return [...list].sort((first, second) => scoreOf(second) - scoreOf(first));
}

// The open window to scan: from the previous appointment's end to the next
// appointment's start around the freed slot.
function gapRegion(id: string, list: Appointment[]) {
  const target = list.find((item) => item.id === id);
  if (!target) return null;
  const startMin = minutesFromTime(target.start);
  const endMin = minutesFromTime(target.end);
  // Freed slots (cancelled / no-match) are open time, not occupants — so they
  // must not clip the scan window. Only real appointments bound the gap, which
  // lets the scan span across adjacent freed slots (incl. ones just deleted).
  const others = list.filter(
    (item) =>
      item.id !== id &&
      item.day === target.day &&
      item.status !== "cancelled",
  );
  const prevEnds = others
    .map((item) => minutesFromTime(item.end))
    .filter((end) => end <= startMin);
  const nextStarts = others
    .map((item) => minutesFromTime(item.start))
    .filter((start) => start >= endMin);
  const gapStart = prevEnds.length ? Math.max(...prevEnds) : startMin;
  const gapEnd = nextStarts.length ? Math.min(...nextStarts) : endMin;
  return {
    top: (gapStart - calendarStartHour * 60) * minuteHeight,
    height: Math.max(24, (gapEnd - gapStart) * minuteHeight),
  };
}

type SearchPhase = "idle" | "searching" | "ranked" | "calling" | "done";

type Flight = {
  name: string;
  detail: string;
  fromLeft: number;
  fromTop: number;
  fromWidth: number;
  fromHeight: number;
  dx: number;
  dy: number;
  toWidth: number;
  toHeight: number;
};

type AppointmentStatus = "confirmed" | "completed" | "filled" | "cancelled";
type ActionStatus = "queued" | "calling" | "talking" | "accepted" | "declined";
type PageId = "dashboard" | "calendar" | "insights";
type DayId = "Today" | "Tomorrow";
type Appointment = {
  id: string;
  patient: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  visit: string;
  phone: string;
  originalDate: string;
  waitSaved: string;
  notes: string;
  day: DayId;
};
type AppointmentSeed = Omit<Appointment, "day">;
type AppointmentLayout = Appointment & {
  column: number;
  columnCount: number;
  duration: number;
  top: number;
};
type AiAction = {
  id: string;
  slot: string;
  candidate: string;
  elapsed: string;
  answer: string;
  status: ActionStatus;
  source: string;
  // Optional smart-ranking score (higher = more attractive). When absent a
  // deterministic placeholder is used; see scoreOf().
  score?: number;
};
type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: string;
};
type DashboardPayload = {
  appointments?: Appointment[];
  actions?: AiAction[];
  metrics?: Metric[];
};

const todaySeed: AppointmentSeed[] = [
  {
    id: "apt-0715",
    patient: "Mara Leitner",
    start: "07:15",
    end: "07:40",
    status: "completed",
    visit: "Check-up",
    phone: "+43 660 102 441",
    originalDate: "Jun 21",
    waitSaved: "15 days",
    notes: "Arrived early. No refill action needed.",
  },
  {
    id: "apt-0800",
    patient: "Noah Berger",
    start: "08:00",
    end: "08:30",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 676 221 908",
    originalDate: "Jun 19",
    waitSaved: "13 days",
    notes: "Prefers morning appointments.",
  },
  {
    id: "apt-0910",
    patient: "Tara Weiss",
    start: "09:10",
    end: "09:30",
    status: "confirmed",
    visit: "Follow-up",
    phone: "+43 699 118 705",
    originalDate: "Jun 14",
    waitSaved: "8 days",
    notes: "Short visit, can arrive with 20 minutes notice.",
  },
  {
    id: "apt-0940",
    patient: "Ivo Hartmann",
    start: "09:40",
    end: "10:10",
    status: "confirmed",
    visit: "Review",
    phone: "+43 681 212 904",
    originalDate: "Jun 23",
    waitSaved: "17 days",
    notes: "Can be moved within the morning.",
  },
  {
    id: "apt-1035",
    patient: "Peter Huber",
    start: "10:35",
    end: "11:15",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 664 891 033",
    originalDate: "Jun 27",
    waitSaved: "21 days",
    notes: "Booked. No refill action needed.",
  },
  {
    id: "apt-1145",
    patient: "Elena Rossi",
    start: "11:45",
    end: "12:10",
    status: "confirmed",
    visit: "Review",
    phone: "+43 650 450 921",
    originalDate: "Jun 18",
    waitSaved: "12 days",
    notes: "Needs a quiet confirmation call if moved.",
  },
  {
    id: "apt-1225",
    patient: "Milan Kral",
    start: "12:25",
    end: "12:55",
    status: "confirmed",
    visit: "Follow-up",
    phone: "+43 699 330 712",
    originalDate: "Jun 26",
    waitSaved: "20 days",
    notes: "Lunch window works best.",
  },
  {
    id: "apt-1320",
    patient: "Amira Hassan",
    start: "13:20",
    end: "13:50",
    status: "filled",
    visit: "Follow-up",
    phone: "+43 681 330 778",
    originalDate: "Jun 24",
    waitSaved: "18 days",
    notes: "Accepted a same-day refill after one missed call before her.",
  },
  {
    id: "apt-1440",
    patient: "Lukas Meyer",
    start: "14:40",
    end: "15:25",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 676 011 443",
    originalDate: "Jun 28",
    waitSaved: "22 days",
    notes: "Available after lunch.",
  },
  {
    id: "apt-1535",
    patient: "Klara Novak",
    start: "15:35",
    end: "16:05",
    status: "confirmed",
    visit: "Check-up",
    phone: "+43 660 840 129",
    originalDate: "Jun 22",
    waitSaved: "16 days",
    notes: "Prefers a short afternoon appointment.",
  },
  {
    id: "apt-1630",
    patient: "Rina Novak",
    start: "16:30",
    end: "16:55",
    status: "confirmed",
    visit: "Follow-up",
    phone: "+43 699 770 553",
    originalDate: "Jun 20",
    waitSaved: "14 days",
    notes: "Consent recorded for outbound scheduling calls.",
  },
  {
    id: "apt-1705",
    patient: "Oliver Kunz",
    start: "17:05",
    end: "17:35",
    status: "confirmed",
    visit: "Review",
    phone: "+43 676 412 882",
    originalDate: "Jun 24",
    waitSaved: "18 days",
    notes: "Can come after work.",
  },
  {
    id: "apt-1815",
    patient: "Jonas Klein",
    start: "18:15",
    end: "18:45",
    status: "confirmed",
    visit: "Review",
    phone: "+43 664 540 119",
    originalDate: "Jun 16",
    waitSaved: "10 days",
    notes: "Can take earlier slots after 17:00.",
  },
  {
    id: "apt-1905",
    patient: "Theo Brandner",
    start: "19:05",
    end: "20:05",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 681 905 441",
    originalDate: "Jun 30",
    waitSaved: "24 days",
    notes: "Long slot used to test split refills.",
  },
  {
    id: "apt-2040",
    patient: "Sofia Marin",
    start: "20:40",
    end: "21:10",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 650 717 042",
    originalDate: "Jun 25",
    waitSaved: "19 days",
    notes: "Evening appointment kept as backup.",
  },
];

const tomorrowSeed: AppointmentSeed[] = [
  {
    id: "apt-t-0800",
    patient: "Greta Moser",
    start: "08:00",
    end: "08:25",
    status: "confirmed",
    visit: "Check-up",
    phone: "+43 660 552 110",
    originalDate: "Jun 22",
    waitSaved: "9 days",
    notes: "Prefers an early slot.",
  },
  {
    id: "apt-t-0915",
    patient: "Felix Brunner",
    start: "09:15",
    end: "09:55",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 676 884 201",
    originalDate: "Jun 17",
    waitSaved: "11 days",
    notes: "First consultation, needs full slot.",
  },
  {
    id: "apt-t-1100",
    patient: "Sara Lindner",
    start: "11:00",
    end: "11:25",
    status: "confirmed",
    visit: "Follow-up",
    phone: "+43 699 230 447",
    originalDate: "Jun 20",
    waitSaved: "14 days",
    notes: "Short follow-up.",
  },
  {
    id: "apt-t-1240",
    patient: "Onur Demir",
    start: "12:40",
    end: "13:20",
    status: "confirmed",
    visit: "Review",
    phone: "+43 664 119 805",
    originalDate: "Jun 26",
    waitSaved: "20 days",
    notes: "Available around lunch only.",
  },
  {
    id: "apt-t-1430",
    patient: "Helena Pichler",
    start: "14:30",
    end: "14:55",
    status: "confirmed",
    visit: "Follow-up",
    phone: "+43 650 770 318",
    originalDate: "Jun 19",
    waitSaved: "13 days",
    notes: "Consent recorded for scheduling calls.",
  },
  {
    id: "apt-t-1610",
    patient: "Jan Wagner",
    start: "16:10",
    end: "16:50",
    status: "confirmed",
    visit: "Consultation",
    phone: "+43 681 442 970",
    originalDate: "Jun 24",
    waitSaved: "18 days",
    notes: "Can take earlier slots after 15:00.",
  },
  {
    id: "apt-t-1815",
    patient: "Maja Horvat",
    start: "18:15",
    end: "18:40",
    status: "confirmed",
    visit: "Review",
    phone: "+43 660 905 233",
    originalDate: "Jun 16",
    waitSaved: "10 days",
    notes: "Evening preference.",
  },
];

const initialAppointments: Appointment[] = [
  ...todaySeed.map((item) => ({ ...item, day: "Today" as const })),
  ...tomorrowSeed.map((item) => ({ ...item, day: "Tomorrow" as const })),
];

const seedActions: AiAction[] = [
  {
    id: "act-0",
    slot: "10:35-11:15",
    candidate: "Daniela Pichler",
    elapsed: "",
    answer: "Best match for the open slot.",
    status: "queued",
    source: "Peter Huber cancellation",
  },
  {
    id: "act-1",
    slot: "10:35-11:15",
    candidate: "Clara Wagner",
    elapsed: "",
    answer: "Can arrive within 25 minutes.",
    status: "calling",
    source: "Peter Huber cancellation",
  },
  {
    id: "act-2",
    slot: "13:20-13:50",
    candidate: "Amira Hassan",
    elapsed: "",
    answer: "High match, ready to be called.",
    status: "queued",
    source: "Morning cancellation",
  },
  {
    id: "act-3",
    slot: "15:10-15:40",
    candidate: "Markus Frei",
    elapsed: "",
    answer: "Waiting behind higher priority matches.",
    status: "queued",
    source: "Morning cancellation",
  },
  {
    id: "act-4",
    slot: "15:10-15:40",
    candidate: "Nina Bauer",
    elapsed: "",
    answer: "Prefers afternoon slots.",
    status: "queued",
    source: "Resolved refill",
  },
  {
    id: "act-5",
    slot: "08:00-08:30",
    candidate: "Mika Braun",
    elapsed: "",
    answer: "Earlier appointment preference matched.",
    status: "queued",
    source: "Noah Berger cancellation",
  },
  {
    id: "act-6",
    slot: "09:10-09:30",
    candidate: "Lea Steiner",
    elapsed: "",
    answer: "Short notice consent is recorded.",
    status: "queued",
    source: "Tara Weiss cancellation",
  },
  {
    id: "act-7",
    slot: "11:45-12:10",
    candidate: "Adam Novak",
    elapsed: "",
    answer: "Same-day availability confirmed.",
    status: "queued",
    source: "Elena Rossi cancellation",
  },
  {
    id: "act-8",
    slot: "14:40-15:25",
    candidate: "Vera Schmidt",
    elapsed: "",
    answer: "Treatment type matches the slot.",
    status: "queued",
    source: "Lukas Meyer cancellation",
  },
  {
    id: "act-9",
    slot: "16:30-16:55",
    candidate: "Jonas Klein",
    elapsed: "",
    answer: "Available after work.",
    status: "queued",
    source: "Rina Novak cancellation",
  },
  {
    id: "act-10",
    slot: "18:15-18:45",
    candidate: "Sofia Marin",
    elapsed: "",
    answer: "Evening preference matches.",
    status: "queued",
    source: "Jonas Klein cancellation",
  },
  {
    id: "act-11",
    slot: "20:40-21:10",
    candidate: "Tobias Gruber",
    elapsed: "",
    answer: "Flexible for late appointments.",
    status: "queued",
    source: "Sofia Marin cancellation",
  },
  {
    id: "act-12",
    slot: "07:15-07:40",
    candidate: "Laura Hofer",
    elapsed: "",
    answer: "Morning refill candidate.",
    status: "queued",
    source: "Mara Leitner cancellation",
  },
  {
    id: "act-13",
    slot: "08:00-08:30",
    candidate: "Ben Adler",
    elapsed: "",
    answer: "Contact priority is medium.",
    status: "queued",
    source: "Noah Berger cancellation",
  },
  {
    id: "act-14",
    slot: "09:10-09:30",
    candidate: "Hanna Koch",
    elapsed: "",
    answer: "Needs confirmation before 09:00.",
    status: "queued",
    source: "Tara Weiss cancellation",
  },
  {
    id: "act-15",
    slot: "10:35-11:15",
    candidate: "Oscar Lang",
    elapsed: "",
    answer: "Fallback if first match declines.",
    status: "queued",
    source: "Peter Huber cancellation",
  },
  {
    id: "act-16",
    slot: "11:45-12:10",
    candidate: "Mina Weber",
    elapsed: "",
    answer: "Can arrive with 30 minutes notice.",
    status: "queued",
    source: "Elena Rossi cancellation",
  },
  {
    id: "act-17",
    slot: "13:20-13:50",
    candidate: "Felix Brandt",
    elapsed: "",
    answer: "Waitlist score is high.",
    status: "queued",
    source: "Morning cancellation",
  },
  {
    id: "act-18",
    slot: "14:40-15:25",
    candidate: "Iris Fuchs",
    elapsed: "",
    answer: "Prefers same physician.",
    status: "queued",
    source: "Lukas Meyer cancellation",
  },
  {
    id: "act-19",
    slot: "16:30-16:55",
    candidate: "Paul Stern",
    elapsed: "",
    answer: "Last fallback before human review.",
    status: "queued",
    source: "Rina Novak cancellation",
  },
];

// Deeper queue so removing accepted candidates always pulls the next ones into
// view — the visible list never shrinks while patients remain in the queue.
const extraFirstNames = [
  "Lena", "Tobias", "Sophie", "Elias", "Mira", "Jakob", "Hanna", "Leon",
  "Pia", "David", "Nora", "Finn", "Emma", "Luca", "Anna", "Ben",
  "Marie", "Jonas", "Lina", "Tim", "Eva", "Samira", "Ida", "Noah",
];
const extraLastNames = [
  "Berger", "Hofer", "Gruber", "Steiner", "Wolf", "Maier", "Lang", "Fuchs",
  "Brandt", "Koch", "Weber", "Roth", "Schwarz", "Vogel", "Arnold", "Busch",
  "Frank", "Keller", "Sommer", "Winter", "Hahn", "Ritter", "Engel", "Kraus",
];
const extraSlots = [
  "08:00-08:30", "09:10-09:30", "11:45-12:10", "13:20-13:50",
  "14:40-15:25", "16:30-16:55", "18:15-18:45", "10:35-11:15",
];
const generatedActions: AiAction[] = Array.from({ length: 24 }, (_, index) => ({
  id: `act-gen-${index}`,
  slot: extraSlots[index % extraSlots.length],
  candidate: `${extraFirstNames[index % extraFirstNames.length]} ${
    extraLastNames[index % extraLastNames.length]
  }`,
  elapsed: "",
  answer: "Available on short notice.",
  status: "queued" as const,
  source: "Waitlist",
}));
const initialActions: AiAction[] = [...seedActions, ...generatedActions];

const hours = Array.from({ length: 16 }, (_, index) => index + 7);
const dayTabs: DayId[] = ["Today", "Tomorrow"];
const navItems: { id: PageId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "calendar", label: "Calendar" },
  { id: "insights", label: "Insights" },
];
// TEST: when true every freed slot ends in "no match found" so the no-match
// message can be verified. false = live matching (a caller accepts → fly-in).
const SIMULATE_NO_MATCH = false;

const calendarStartHour = 7;
const calendarEndHour = 22;
const calendarMinutes = (calendarEndHour - calendarStartHour) * 60;
const minuteHeight = 1.32;

function actionLabel(status: ActionStatus) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Rejected";
    case "talking":
      return "Talking";
    case "calling":
      return "Calling";
    default:
      return "Waiting";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function minutesFromTime(time: string) {
  const [hoursValue, minutesValue] = time.split(":").map(Number);
  return hoursValue * 60 + minutesValue;
}

function slotDuration(slot: string) {
  const [start, end] = slot.split("-");
  const minutes = minutesFromTime(end) - minutesFromTime(start);
  if (minutes < 60) return `${minutes}min`;
  const hours = minutes / 60;
  const label = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(2).replace(/0+$/, "").replace(".", ",");
  return `${label}h`;
}

function layoutAppointments(appointments: Appointment[]): AppointmentLayout[] {
  const sorted = [...appointments].sort(
    (first, second) =>
      minutesFromTime(first.start) - minutesFromTime(second.start),
  );

  const activeColumns: { column: number; end: number }[] = [];
  const layouts: AppointmentLayout[] = [];

  sorted.forEach((appointment) => {
    const start = minutesFromTime(appointment.start);
    const end = minutesFromTime(appointment.end);
    const duration = Math.max(15, end - start);

    for (let index = activeColumns.length - 1; index >= 0; index -= 1) {
      if (activeColumns[index].end <= start) {
        activeColumns.splice(index, 1);
      }
    }

    const usedColumns = new Set(activeColumns.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;

    activeColumns.push({ column, end });

    const overlapping = sorted.filter((candidate) => {
      const candidateStart = minutesFromTime(candidate.start);
      const candidateEnd = minutesFromTime(candidate.end);
      return candidateStart < end && candidateEnd > start;
    });
    const columnCount = Math.max(1, overlapping.length);

    layouts.push({
      ...appointment,
      column,
      columnCount,
      duration,
      top: (start - calendarStartHour * 60) * minuteHeight,
    });
  });

  return layouts;
}

export default function Home() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [actions, setActions] = useState(initialActions);
  const [serverMetrics, setServerMetrics] = useState<Metric[] | null>(null);
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [activeDay, setActiveDay] = useState<DayId>("Today");
  const [now, setNow] = useState(() => new Date());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<{
    ids: string[];
    value: number;
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("idle");
  const [flight, setFlight] = useState<Flight | null>(null);
  const [flightActive, setFlightActive] = useState(false);
  const [justFilledId, setJustFilledId] = useState<string | null>(null);
  const [scan, setScan] = useState<{ top: number; height: number }[]>([]);
  const [scanTargetIds, setScanTargetIds] = useState<string[]>([]);
  const [noMatchIds, setNoMatchIds] = useState<string[]>([]);
  // Slots the user dismissed after a no-match. They stay open and are re-scanned
  // automatically on the next cancellation, until filled or fully removed.
  const [openSlotIds, setOpenSlotIds] = useState<string[]>([]);
  const openSlotIdsRef = useRef<string[]>([]);
  const [result, setResult] = useState<{
    text: string;
    hasNoMatch: boolean;
  } | null>(null);
  const scheduleViewportRef = useRef<HTMLDivElement | null>(null);
  const actionListRef = useRef<HTMLDivElement | null>(null);
  const rowTopsRef = useRef<Map<string, number>>(new Map());
  const orderedWaitlistRef = useRef<AiAction[]>([]);
  const searchTargetsRef = useRef<string[]>([]);
  const pendingFillsRef = useRef(0);
  const runSizeRef = useRef(0);
  const runNoMatchRef = useRef(0);
  const callTimersRef = useRef<number[]>([]);
  const searchPhaseRef = useRef<SearchPhase>("idle");

  const fallbackMetrics = useMemo(() => {
    const cancelledAppointments = appointments.filter(
      (appointment) => appointment.status === "cancelled",
    ).length;
    const totalCancellations = 18 + cancelledAppointments;
    const refilled = 16;
    return [
      {
        label: "Slots refilled",
        value: "8",
        detail: "31 this week",
        icon: "/icons/KPI1.png",
      },
      {
        label: "Average time to rebook",
        value: "2m 18s",
        detail: `${40 + cancelledAppointments} calls included`,
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
    ] satisfies Metric[];
  }, [appointments]);
  const metrics = serverMetrics ?? fallbackMetrics;

  const calendarAppointments = useMemo(
    () =>
      layoutAppointments(
        appointments.filter((appointment) => appointment.day === activeDay),
      ),
    [appointments, activeDay],
  );
  const waitlistTotal = actions.length;
  const orderedWaitlist = useMemo(() => {
    const base = actions.slice(0, visibleCount);
    // Once ranking has kicked in, keep the smart order for the rest of the run.
    if (
      searchPhase === "ranked" ||
      searchPhase === "calling" ||
      searchPhase === "done"
    ) {
      // Smart ranking: most attractive (highest score) bubble to the top.
      return [...base].sort((first, second) => scoreOf(second) - scoreOf(first));
    }
    return base;
  }, [actions, visibleCount, searchPhase]);
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes() - calendarStartHour * 60;
  const nowLineTop =
    Math.min(Math.max(currentMinutes, 0), calendarMinutes) * minuteHeight;
  const showNowLine = activeDay === "Today";

  useEffect(() => {
    orderedWaitlistRef.current = orderedWaitlist;
  }, [orderedWaitlist]);

  useEffect(() => {
    searchPhaseRef.current = searchPhase;
  }, [searchPhase]);

  useEffect(() => {
    openSlotIdsRef.current = openSlotIds;
  }, [openSlotIds]);

  function applyDashboardState(data: DashboardPayload) {
    if (Array.isArray(data.appointments)) {
      setAppointments(data.appointments);
    }
    if (Array.isArray(data.actions)) {
      setActions(data.actions);
    }
    if (Array.isArray(data.metrics)) {
      setServerMetrics(data.metrics);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (searchPhaseRef.current !== "idle") return;
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) return;
        const data = (await response.json()) as DashboardPayload;
        if (mounted) applyDashboardState(data);
      } catch {
        // Keep the local demo seed visible when the backend is unavailable.
      }
    }

    void loadDashboard();
    const interval = window.setInterval(loadDashboard, 6000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function clearCallTimers() {
    callTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    callTimersRef.current = [];
  }

  function setActionStatus(id: string, status: ActionStatus) {
    setActions((current) =>
      current.map((action) =>
        action.id === id ? { ...action, status } : action,
      ),
    );
  }

  // Call candidates for each freed slot in turn; one accepts per slot and flies
  // into it. The first slot shows a decline to illustrate the ranking.
  function scheduleCallScript(targetIds: string[], candidateIds: string[]) {
    const steps: { at: number; run: () => void }[] = [];
    let at = 0;
    let cursor = 0;
    let fills = 0;

    targetIds.forEach((targetId, slotIndex) => {
      if (SIMULATE_NO_MATCH) {
        // Call a couple of candidates, all decline → no match for this slot.
        const tries = candidateIds.slice(cursor, cursor + 2);
        cursor += tries.length;
        tries.forEach((candidateId) => {
          steps.push({ at, run: () => setActionStatus(candidateId, "calling") });
          at += 1300;
          steps.push({ at, run: () => setActionStatus(candidateId, "declined") });
          at += 700;
        });
        steps.push({ at, run: () => resolveNoMatch(targetId) });
        at += 800;
        fills += 1;
        return;
      }

      if (slotIndex === 0 && candidateIds.length > targetIds.length) {
        const declines = candidateIds[cursor];
        cursor += 1;
        steps.push({ at, run: () => setActionStatus(declines, "calling") });
        at += 1400;
        steps.push({ at, run: () => setActionStatus(declines, "declined") });
        at += 900;
      }

      const accepts = candidateIds[cursor];
      cursor += 1;
      if (!accepts) return;
      fills += 1;

      steps.push({ at, run: () => setActionStatus(accepts, "calling") });
      at += 1400;
      steps.push({ at, run: () => setActionStatus(accepts, "talking") });
      at += 1400;
      steps.push({ at, run: () => setActionStatus(accepts, "accepted") });
      at += 800;
      steps.push({ at, run: () => flyAndRefill(accepts, targetId) });
      at += 1100;
    });

    // Finish only after the slots we can actually resolve have been resolved.
    pendingFillsRef.current = fills;
    runSizeRef.current = fills;

    steps.forEach((step) => {
      callTimersRef.current.push(window.setTimeout(step.run, step.at));
    });
  }

  // The accepted candidate glides from the waitlist into its freed slot.
  function flyAndRefill(id: string, targetId: string) {
    const candidate = orderedWaitlistRef.current.find(
      (action) => action.id === id,
    );
    const name = candidate?.candidate ?? "Waitlist patient";
    const rowEl = actionListRef.current?.querySelector<HTMLElement>(
      `[data-action-id="${id}"]`,
    );
    const slotEl = document.querySelector<HTMLElement>(
      `[data-appointment-id="${targetId}"]`,
    );

    if (!rowEl || !slotEl) {
      setActions((current) =>
        sortByScore(current.filter((action) => action.id !== id)),
      );
      refillSlot(name, targetId);
      return;
    }

    // Bring the destination slot into view, then measure both rectangles.
    slotEl.scrollIntoView({ block: "center" });

    window.requestAnimationFrame(() => {
      const from = rowEl.getBoundingClientRect();
      const to = slotEl.getBoundingClientRect();

      setFlight({
        name,
        detail: candidate ? slotDuration(candidate.slot) : "",
        fromLeft: from.left,
        fromTop: from.top,
        fromWidth: from.width,
        fromHeight: from.height,
        dx: to.left - from.left,
        dy: to.top - from.top,
        toWidth: to.width,
        toHeight: to.height,
      });

      // Remove the accepted row so the rest of the queue flows up (FLIP).
      setActions((current) =>
        sortByScore(current.filter((action) => action.id !== id)),
      );

      callTimersRef.current.push(
        window.setTimeout(() => refillSlot(name, targetId), 880),
      );
    });
  }

  function refillSlot(candidateName: string, targetId: string) {
    setAppointments((current) =>
      current.map((apt) =>
        apt.id === targetId
          ? {
              ...apt,
              status: "filled",
              patient: candidateName,
              notes: `Refilled from waitlist — ${candidateName} accepted.`,
            }
          : apt,
      ),
    );
    setJustFilledId(targetId);
    callTimersRef.current.push(
      window.setTimeout(() => setJustFilledId(null), 900),
    );
    setFlight(null);
    setFlightActive(false);
    finishStep();
  }

  // No candidate accepted — the slot stays open and is flagged as "no match".
  function resolveNoMatch(targetId: string) {
    setAppointments((current) =>
      current.map((apt) =>
        apt.id === targetId
          ? { ...apt, notes: "No match found — slot still open." }
          : apt,
      ),
    );
    setNoMatchIds((current) =>
      current.includes(targetId) ? current : [...current, targetId],
    );
    setFlight(null);
    setFlightActive(false);
    runNoMatchRef.current += 1;
    finishStep();
  }

  // One slot resolved (filled or no match). When the whole run is done, build
  // the summary message and move to the "done" phase.
  function finishStep() {
    pendingFillsRef.current = Math.max(0, pendingFillsRef.current - 1);
    if (pendingFillsRef.current > 0) return;

    const noMatch = runNoMatchRef.current;
    const filled = Math.max(0, runSizeRef.current - noMatch);
    let text: string;
    if (noMatch === 0) {
      text = runSizeRef.current > 1 ? `${filled} slots refilled` : "Slot refilled";
    } else if (filled === 0) {
      text = "No match found";
    } else {
      text = `${filled} refilled · ${noMatch} no match found`;
    }
    setResult({ text, hasNoMatch: noMatch > 0 });
    setSearchPhase("done");
    setScanTargetIds([]);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showNowLine) return;

    const viewport = scheduleViewportRef.current;
    if (!viewport) return;

    const topBuffer = 32;
    const bottomBuffer = 96;
    const isVisible =
      nowLineTop >= viewport.scrollTop + topBuffer &&
      nowLineTop <= viewport.scrollTop + viewport.clientHeight - bottomBuffer;

    if (!isVisible) {
      viewport.scrollTo({
        top: Math.max(0, nowLineTop - viewport.clientHeight * 0.45),
        behavior: "smooth",
      });
    }
  }, [nowLineTop, showNowLine]);

  useEffect(() => {
    const rowStride = 54; // 48px row + 6px gap
    const bottomReserve = 64; // space for the "…" row and padding

    function measure() {
      const list = actionListRef.current;
      if (!list) return;
      const top = list.getBoundingClientRect().top;
      const available = window.innerHeight - top - bottomReserve;
      const count = Math.max(3, Math.floor(available / rowStride));
      setVisibleCount(count);
    }

    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [activePage, searchPhase]);

  // FLIP: smoothly animate waitlist rows whenever their order changes.
  useIsomorphicLayoutEffect(() => {
    const list = actionListRef.current;
    if (!list) return;

    const rows = Array.from(
      list.querySelectorAll<HTMLElement>("[data-action-id]"),
    );

    rows.forEach((row) => {
      const id = row.dataset.actionId;
      if (!id) return;

      const newTop = row.getBoundingClientRect().top;
      const prevTop = rowTopsRef.current.get(id);

      // Animate the smart-ranking reorder and the reflow when the accepted row
      // leaves — but not the reflow from the status strip appearing on start.
      if (
        searchPhase !== "idle" &&
        searchPhase !== "searching" &&
        prevTop !== undefined &&
        Math.abs(prevTop - newTop) > 1
      ) {
        const delta = prevTop - newTop;
        row.style.transition = "none";
        row.style.transform = `translateY(${delta}px)`;

        window.requestAnimationFrame(() => {
          row.style.transition = "transform 440ms cubic-bezier(0.2, 0, 0, 1)";
          row.style.transform = "";

          const cleanup = () => {
            row.style.transition = "";
            row.removeEventListener("transitionend", cleanup);
          };
          row.addEventListener("transitionend", cleanup);
        });
      }

      rowTopsRef.current.set(id, newTop);
    });
  }, [orderedWaitlist, searchPhase]);

  // Cancel flow drives the search: spinner first, then smart-ranking reorder.
  useEffect(() => {
    if (searchPhase !== "searching") return;
    const timer = window.setTimeout(() => setSearchPhase("ranked"), 1900);
    return () => window.clearTimeout(timer);
  }, [searchPhase]);

  // After the reorder settles, call the ranked candidates for each freed slot.
  useEffect(() => {
    if (searchPhase !== "ranked") return;
    const startTimer = window.setTimeout(() => {
      const candidateIds = orderedWaitlistRef.current.map(
        (action) => action.id,
      );
      const targetIds = searchTargetsRef.current;
      if (candidateIds.length === 0 || targetIds.length === 0) return;
      setSearchPhase("calling");
      scheduleCallScript(targetIds, candidateIds);
    }, 720);
    return () => window.clearTimeout(startTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPhase]);

  // Drive the flight transform on the next frame so the transition runs.
  useEffect(() => {
    if (!flight) return;
    const raf = window.requestAnimationFrame(() => setFlightActive(true));
    return () => window.cancelAnimationFrame(raf);
  }, [flight]);

  // Reset the search panel a short moment after the slot is refilled.
  useEffect(() => {
    if (searchPhase !== "done") return;
    const timer = window.setTimeout(() => setSearchPhase("idle"), 2600);
    return () => window.clearTimeout(timer);
  }, [searchPhase]);

  useEffect(() => () => clearCallTimers(), []);

  function finalizeCancelBatch(ids: string[]) {
    setAppointments((current) =>
      current.map((item) =>
        ids.includes(item.id) && item.status !== "cancelled"
          ? {
              ...item,
              status: "cancelled",
              notes: "Cancelled manually. AI started calling the waitlist.",
            }
          : item,
      ),
    );
    setResult(null);
    runSearch(ids);

    void fetch("/api/appointments/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Cancellation workflow failed.");
        }
        return (await response.json()) as {
          results?: { status?: string }[];
          state?: DashboardPayload;
        };
      })
      .then((data) => {
        window.setTimeout(() => {
          if (data.state) applyDashboardState(data.state);
        }, Math.min(7200, 3200 + ids.length * 1200));
      })
      .catch(() => {
        setResult({ text: "Workflow could not start", hasNoMatch: true });
        setSearchPhase("done");
      });
  }

  // Run (or re-run) the replacement search for a set of freed slots.
  function runSearch(ids: string[]) {
    searchTargetsRef.current = [...ids];
    pendingFillsRef.current = ids.length;
    runSizeRef.current = ids.length;
    runNoMatchRef.current = 0;
    setResult(null);
    // Only clear the no-match flag for the slots we are (re)searching. Open
    // slots being re-scanned drop out of the open list until they resolve again.
    setNoMatchIds((current) => current.filter((id) => !ids.includes(id)));
    setOpenSlotIds((current) => current.filter((id) => !ids.includes(id)));
    setScanTargetIds(ids);
    clearCallTimers();
    setFlight(null);
    setJustFilledId(null);
    setActions((current) =>
      current.map((action) => ({ ...action, status: "queued" })),
    );

    // Scan the full open gap around each freed slot — the windows the optimal
    // combination will later be computed over.
    const rawRegions = ids
      .map((id) => gapRegion(id, appointments))
      .filter((region): region is { top: number; height: number } =>
        Boolean(region),
      )
      .sort((a, b) => a.top - b.top);
    // Adjacent freed slots now share one open window, so their gaps overlap —
    // merge them into a single band instead of stacking identical ones.
    const regions = rawRegions.reduce<{ top: number; height: number }[]>(
      (merged, region) => {
        const last = merged[merged.length - 1];
        if (last && region.top <= last.top + last.height) {
          last.height = Math.max(last.height, region.top + region.height - last.top);
          return merged;
        }
        merged.push({ ...region });
        return merged;
      },
      [],
    );
    setScan(regions);

    const viewport = scheduleViewportRef.current;
    if (viewport && regions.length > 0) {
      const top = Math.min(...regions.map((region) => region.top));
      viewport.scrollTo({
        top: Math.max(0, top - viewport.clientHeight * 0.32),
        behavior: "smooth",
      });
    }

    // Kick off the replacement search: scan gaps → smart ranking → calling.
    setSearchPhase("searching");
  }

  // No match: try the search again for just this slot.
  function retrySlot(id: string) {
    if (searchPhase === "searching" || searchPhase === "ranked" || searchPhase === "calling") {
      return;
    }
    runSearch([id]);
  }

  // No match: set the slot aside as an open slot. It stays free and is scanned
  // again automatically on the next cancellation (see finalizeCancelBatch).
  function deleteSlot(id: string) {
    setNoMatchIds((current) => current.filter((existing) => existing !== id));
    setOpenSlotIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }

  // Open slot: remove it from the day for good.
  function removeSlot(id: string) {
    setAppointments((current) => current.filter((apt) => apt.id !== id));
    setOpenSlotIds((current) => current.filter((existing) => existing !== id));
    setNoMatchIds((current) => current.filter((existing) => existing !== id));
  }

  useEffect(() => {
    if (!countdown) return;

    const timer = window.setTimeout(() => {
      if (countdown.value <= 1) {
        finalizeCancelBatch(countdown.ids);
        setCountdown(null);
      } else {
        setCountdown({ ids: countdown.ids, value: countdown.value - 1 });
      }
    }, 1000);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  function toggleSelect(appointment: Appointment) {
    if (appointment.status === "cancelled" || countdown) return;
    if (searchPhase !== "idle") return;
    setSelectedIds((current) =>
      current.includes(appointment.id)
        ? current.filter((existing) => existing !== appointment.id)
        : [...current, appointment.id],
    );
  }

  function startBatchCountdown() {
    if (selectedIds.length === 0 || countdown) return;
    setCountdown({ ids: [...selectedIds], value: 5 });
    setSelectedIds([]);
  }

  function abortCountdown() {
    if (countdown) setSelectedIds(countdown.ids);
    setCountdown(null);
  }

  function changeDay(day: DayId) {
    if (day === activeDay) return;
    // Selections are per day, so clear them when switching.
    setSelectedIds([]);
    setActiveDay(day);
  }

  const hasNoMatch = searchPhase === "done" && (result?.hasNoMatch ?? false);
  const doneMessage = result?.text ?? "Done";

  const callFeedbackPanel = (
    <aside className="live-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Replacement queue</p>
          <h1>Current Waitlist</h1>
        </div>
        <span className="count-pill">{waitlistTotal}</span>
      </div>

      {searchPhase !== "idle" && (
        <div
          className={`waitlist-status${
            searchPhase === "done" ? (hasNoMatch ? " nomatch" : " done") : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {searchPhase === "done" ? (
            <span
              className={hasNoMatch ? "waitlist-cross" : "waitlist-check"}
              aria-hidden="true"
            >
              {hasNoMatch ? "!" : "✓"}
            </span>
          ) : (
            <span className="waitlist-spinner" aria-hidden="true" />
          )}
          <span className="waitlist-status-text">
            {searchPhase === "searching"
              ? "Scanning the open gap…"
              : searchPhase === "ranked"
                ? "Ranked by match score"
                : searchPhase === "calling"
                  ? "Calling top matches…"
                  : doneMessage}
          </span>
        </div>
      )}

      <div className="action-list" aria-label="Current waitlist" ref={actionListRef}>
        {orderedWaitlist.map((action) => (
          <article
            className={`action-row action-${action.status}`}
            key={action.id}
            data-action-id={action.id}
          >
            <span className="action-avatar" aria-hidden="true">
              {initials(action.candidate)}
            </span>
            <span className="action-main">
              <span className="action-title-line">
                <span className="action-name">{action.candidate}</span>
                <span className="action-slot">{slotDuration(action.slot)}</span>
              </span>
              <span className="action-meta-line">
                <span className="action-status">{actionLabel(action.status)}</span>
                <span className="action-answer">{action.answer}</span>
              </span>
            </span>
          </article>
        ))}
      </div>
      <div className="action-more" aria-label={`${waitlistTotal} patients in queue`}>
        …
      </div>
    </aside>
  );

  const calendarPanel = (
    <section className="calendar-panel">
      <div className="calendar-head">
        <div>
          <p className="section-kicker">Practice day</p>
          <h2>Calendar</h2>
        </div>
        <div className="day-tabs" aria-label="Calendar range">
          {dayTabs.map((day) => (
            <button
              className={activeDay === day ? "tab-button active" : "tab-button"}
              key={day}
              type="button"
              onClick={() => changeDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div
        className="schedule"
        aria-label={`${activeDay} schedule`}
        ref={scheduleViewportRef}
      >
        <div
          className="schedule-canvas"
          style={{ height: calendarMinutes * minuteHeight }}
        >
          <div className="time-rail" aria-hidden="true">
            {hours.map((hour) => (
              <time
                className="hour-label"
                key={hour}
                style={{
                  top: (hour - calendarStartHour) * 60 * minuteHeight,
                }}
              >
                {String(hour).padStart(2, "0")}:00
              </time>
            ))}
          </div>

          <div className="calendar-grid-lines" aria-hidden="true">
            {hours.map((hour) => (
              <span
                className="calendar-grid-line"
                key={hour}
                style={{
                  top: (hour - calendarStartHour) * 60 * minuteHeight,
                }}
              />
            ))}
          </div>

          <div className="appointment-layer">
            {calendarAppointments.map((appointment) => {
              const gap = 8;
              const totalGap = (appointment.columnCount - 1) * gap;
              const width = `calc((100% - ${totalGap}px) / ${appointment.columnCount})`;
              const left = `calc(${appointment.column} * ((100% - ${totalGap}px) / ${appointment.columnCount} + ${gap}px))`;

              const isSelected = selectedIds.includes(appointment.id);
              const isCounting = countdown?.ids.includes(appointment.id) ?? false;
              const cancelled = appointment.status === "cancelled";
              const isNoMatch = noMatchIds.includes(appointment.id);
              const isOpenSlot = openSlotIds.includes(appointment.id);
              const isResolving = scanTargetIds.includes(appointment.id);

              return (
                <article
                  className={`appointment-card status-${appointment.status}${
                    isCounting ? " counting" : ""
                  }${isSelected ? " selected" : ""}${
                    isNoMatch ? " no-match" : ""
                  }${isOpenSlot ? " open-slot" : ""}${
                    isResolving ? " resolving" : ""
                  }${
                    justFilledId === appointment.id ? " landed" : ""
                  }`}
                  key={appointment.id}
                  data-appointment-id={appointment.id}
                  style={{
                    top: appointment.top,
                    height: Math.max(46, appointment.duration * minuteHeight - 6),
                    left,
                    width,
                  }}
                >
                  <span className="appointment-time">
                    {appointment.start}-{appointment.end}
                  </span>
                  <span className="appointment-main">
                    {isNoMatch ? (
                      <>
                        <span className="appointment-name">No match</span>
                        <span className="appointment-visit">Slot still open</span>
                      </>
                    ) : isOpenSlot ? (
                      <>
                        <span className="appointment-name">Open slot</span>
                        <span className="appointment-visit">
                          Re-scans on next cancel
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="appointment-name">
                          {appointment.patient}
                        </span>
                        <span className="appointment-visit">
                          {appointment.visit}
                        </span>
                      </>
                    )}
                  </span>
                  {isNoMatch ? (
                    <span className="appointment-actions nomatch-actions">
                      <button
                        className="slot-retry"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          retrySlot(appointment.id);
                        }}
                      >
                        Try again
                      </button>
                      <button
                        className="slot-delete"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteSlot(appointment.id);
                        }}
                      >
                        Dismiss
                      </button>
                    </span>
                  ) : isOpenSlot ? (
                    <span className="appointment-actions nomatch-actions">
                      <button
                        className="slot-retry"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          retrySlot(appointment.id);
                        }}
                      >
                        Scan now
                      </button>
                      <button
                        className="slot-delete"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeSlot(appointment.id);
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <span className="appointment-actions">
                      <button
                        className={
                          cancelled
                            ? "cancel-button disabled"
                            : isSelected
                              ? "cancel-button selected"
                              : "cancel-button"
                        }
                        disabled={cancelled}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelect(appointment);
                        }}
                      >
                        {cancelled
                          ? "Cancelled"
                          : isSelected
                            ? "Selected"
                            : "Cancel"}
                      </button>
                    </span>
                  )}

                  {isCounting && countdown && (
                    <span className="appointment-countdown" aria-hidden="true">
                      <span className="countdown-spinner" />
                      <span className="countdown-value">{countdown.value}</span>
                      <span className="countdown-label">
                        Waiting to start calls
                      </span>
                    </span>
                  )}
                </article>
              );
            })}
          </div>

          {searchPhase === "searching" &&
            scan.map((region, index) => (
              <div
                className="scan-band"
                aria-hidden="true"
                key={index}
                style={{ top: region.top, height: region.height }}
              >
                <span className="scan-label">Scanning gap</span>
                <span className="scan-line" />
              </div>
            ))}

          {showNowLine && (
            <div
              className="now-line"
              aria-hidden="true"
              style={{ top: nowLineTop }}
            />
          )}
        </div>
      </div>
    </section>
  );

  return (
    <main className="page-shell">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true" />
            <span>Refill Desk</span>
          </div>
          <nav className="top-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                aria-current={activePage === item.id ? "page" : undefined}
                className={
                  activePage === item.id ? "nav-link active" : "nav-link"
                }
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="dashboard" key={activePage}>
        {activePage === "dashboard" && (
          <>
            <section className="metric-grid" aria-label="Activity statistics">
              {metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <div className="metric-top">
                    <div>
                      <p className="metric-label">{metric.label}</p>
                      <p className="metric-value">{metric.value}</p>
                    </div>
                    <span
                      className="metric-icon-frame"
                      aria-hidden="true"
                      style={{ backgroundImage: `url(${metric.icon})` }}
                    />
                  </div>
                  <div>
                    <p className="metric-detail">{metric.detail}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="workbench" aria-label="Live refill operations">
              {callFeedbackPanel}
              {calendarPanel}
            </section>
          </>
        )}

        {activePage === "calendar" && (
          <section className="single-page-view" aria-label="Calendar page">
            {calendarPanel}
          </section>
        )}

        {activePage === "insights" && (
          <section className="insights-page" aria-label="Insights page">
            <section className="metric-grid" aria-label="Activity statistics">
              {metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <div className="metric-top">
                    <div>
                      <p className="metric-label">{metric.label}</p>
                      <p className="metric-value">{metric.value}</p>
                    </div>
                    <span
                      className="metric-icon-frame"
                      aria-hidden="true"
                      style={{ backgroundImage: `url(${metric.icon})` }}
                    />
                  </div>
                  <div>
                    <p className="metric-detail">{metric.detail}</p>
                  </div>
                </article>
              ))}
            </section>
            <div className="insight-grid">
              <article className="insight-card">
                <p className="section-kicker">Outcomes</p>
                <h2>Call resolution</h2>
                <div className="insight-row">
                  <span>Accepted</span>
                  <strong>62%</strong>
                </div>
                <div className="insight-row">
                  <span>Waiting</span>
                  <strong>24%</strong>
                </div>
                <div className="insight-row">
                  <span>Rejected</span>
                  <strong>14%</strong>
                </div>
              </article>
              <article className="insight-card">
                <p className="section-kicker">Speed</p>
                <h2>Attempts per refill</h2>
                <div className="large-insight">2.6</div>
                <p className="metric-note">
                  Includes missed calls before a patient accepts the open slot.
                </p>
              </article>
            </div>
          </section>
        )}
      </section>

      {selectedIds.length > 0 && !countdown && (
        <div className="batch-bar" role="region" aria-label="Selected slots">
          <span className="batch-count">
            {selectedIds.length} slot{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            className="batch-clear"
            type="button"
            onClick={() => setSelectedIds([])}
          >
            Clear
          </button>
          <button
            className="batch-cancel"
            type="button"
            onClick={startBatchCountdown}
          >
            Cancel {selectedIds.length} slot{selectedIds.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {countdown && (
        <div className="cancel-toast" role="status" aria-live="polite">
          <span className="cancel-toast-spinner" aria-hidden="true" />
          <span className="cancel-toast-text">
            Cancelling {countdown.ids.length} slot
            {countdown.ids.length > 1 ? "s" : ""} in {countdown.value}s
          </span>
          <button
            className="cancel-toast-undo"
            type="button"
            onClick={abortCountdown}
          >
            Undo
          </button>
        </div>
      )}

      {flight && (
        <div
          className={`flight-card${flightActive ? " active" : ""}`}
          aria-hidden="true"
          style={{
            left: flight.fromLeft,
            top: flight.fromTop,
            width: flightActive ? flight.toWidth : flight.fromWidth,
            height: flightActive ? flight.toHeight : flight.fromHeight,
            transform: flightActive
              ? `translate(${flight.dx}px, ${flight.dy}px)`
              : "translate(0, 0)",
          }}
        >
          <span className="flight-avatar">{initials(flight.name)}</span>
          <span className="flight-body">
            <span className="flight-name">{flight.name}</span>
            <span className="flight-detail">{flight.detail}</span>
          </span>
        </div>
      )}
    </main>
  );
}
