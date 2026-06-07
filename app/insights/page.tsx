type WeekMetric = {
  day: string;
  cancellations: number;
  accepted: number;
};

type InsightKpi = {
  label: string;
  value: string;
  detail: string;
};

type PreferenceMetric = {
  label: string;
  value: number;
  detail: string;
};

const weeklyTrends = [
  { day: "Mon", cancellations: 4, accepted: 3 },
  { day: "Tue", cancellations: 7, accepted: 5 },
  { day: "Wed", cancellations: 3, accepted: 4 },
  { day: "Thu", cancellations: 9, accepted: 8 },
  { day: "Fri", cancellations: 6, accepted: 6 },
  { day: "Sat", cancellations: 2, accepted: 2 },
  { day: "Sun", cancellations: 1, accepted: 1 },
] satisfies WeekMetric[];

const insightKpis = [
  {
    label: "Waiting list",
    value: "42",
    detail: "26 high-fit clients ready to call",
  },
  {
    label: "Best call day",
    value: "Thu",
    detail: "8 accepted recalls from 9 cancellations",
  },
  {
    label: "Best call time",
    value: "09-11",
    detail: "Highest pickup and acceptance window",
  },
  {
    label: "Next week focus",
    value: "18",
    detail: "Slots likely recoverable with early recalls",
  },
] satisfies InsightKpi[];

const callTimePreferences = [
  {
    label: "Morning calls",
    value: 58,
    detail: "Best for older waitlist entries and urgent follow-ups",
  },
  {
    label: "Afternoon calls",
    value: 31,
    detail: "Works well for low-priority flexible patients",
  },
  {
    label: "No preference",
    value: 11,
    detail: "Can be used as filler after urgent matches",
  },
] satisfies PreferenceMetric[];

const waitlistSegments = [
  {
    label: "High priority",
    value: 14,
    detail: "Call first when a same-week slot opens",
  },
  {
    label: "Medium priority",
    value: 19,
    detail: "Good fit for normal cancellations",
  },
  {
    label: "Low priority",
    value: 9,
    detail: "Use for low-demand days and late openings",
  },
] satisfies PreferenceMetric[];

const dayPlanning = [
  {
    day: "Mon",
    signal: "Moderate churn",
    action: "Keep two morning call blocks open",
  },
  {
    day: "Tue",
    signal: "High cancellation risk",
    action: "Pre-rank backup patients before lunch",
  },
  {
    day: "Wed",
    signal: "Low churn, good acceptance",
    action: "Use for routine rebooking follow-ups",
  },
  {
    day: "Thu",
    signal: "Best recovery day",
    action: "Assign receptionist coverage from 09-11",
  },
  {
    day: "Fri",
    signal: "Strong same-day acceptance",
    action: "Offer short-notice slots before 14:00",
  },
] satisfies { day: string; signal: string; action: string }[];

function getBestDay(data: WeekMetric[], field: "cancellations" | "accepted") {
  return data.reduce((best, item) => (item[field] > best[field] ? item : best));
}

function getSeriesPoints(
  data: WeekMetric[],
  field: "cancellations" | "accepted",
  maxValue: number,
) {
  const chartWidth = 620;
  const chartHeight = 220;
  const offsetX = 72;
  const offsetY = 32;

  return data.map((item, index) => {
    const x = offsetX + (index / (data.length - 1)) * chartWidth;
    const y = offsetY + chartHeight - (item[field] / maxValue) * chartHeight;

    return { ...item, x, y, value: item[field] };
  });
}

function LineChart() {
  const maxValue = Math.max(
    ...weeklyTrends.flatMap((item) => [item.cancellations, item.accepted]),
  );
  const yAxisMax = maxValue + 1;
  const cancellations = getSeriesPoints(
    weeklyTrends,
    "cancellations",
    yAxisMax,
  );
  const accepted = getSeriesPoints(weeklyTrends, "accepted", yAxisMax);
  const cancellationPoints = cancellations
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const acceptedPoints = accepted
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const bestCancellationDay = getBestDay(weeklyTrends, "cancellations");
  const bestAcceptedDay = getBestDay(weeklyTrends, "accepted");
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section
      aria-label="Cancellations and accepted recalls trend"
      style={{
        border: "1px solid #eeeeee",
        borderRadius: 8,
        background: "var(--color-paper-white)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          background: "#1a1a1a",
          padding: 24,
          color: "var(--color-paper-white)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-ubermove)",
              fontSize: 22,
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            Cancellations vs accepted recalls
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "#d4d4d4",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            One weekly view showing cancellation pressure and how many patients
            accepted the recovered appointments.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <LegendItem color="#b42318" label="Cancelled" />
          <LegendItem color="#166534" label="Accepted" />
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <MiniStat
            label="Most cancellations"
            value={bestCancellationDay.day}
            detail={`${bestCancellationDay.cancellations} cancellations`}
          />
          <MiniStat
            label="Most accepted"
            value={bestAcceptedDay.day}
            detail={`${bestAcceptedDay.accepted} accepted recalls`}
          />
          <MiniStat
            label="Weekly acceptance"
            value="76%"
            detail="29 accepted from 38 call attempts"
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <svg
            aria-hidden="true"
            viewBox="0 0 760 320"
            role="img"
            style={{
              width: "100%",
              minWidth: 720,
              height: "auto",
              display: "block",
            }}
          >
            <rect width="760" height="320" fill="#ffffff" />
            {gridLines.map((line) => {
              const y = 32 + line * 220;
              const label = Math.round((1 - line) * yAxisMax);

              return (
                <g key={line}>
                  <line
                    x1="72"
                    y1={y}
                    x2="692"
                    y2={y}
                    stroke="#eeeeee"
                    strokeWidth="1"
                  />
                  <text
                    x="48"
                    y={y + 4}
                    fill="#5e5e5e"
                    fontSize="12"
                    textAnchor="end"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            <polyline
              points={cancellationPoints}
              fill="none"
              stroke="#b42318"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={acceptedPoints}
              fill="none"
              stroke="#166534"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {cancellations.map((point) => (
              <ChartDot key={`cancel-${point.day}`} point={point} color="#b42318" />
            ))}
            {accepted.map((point) => (
              <ChartDot key={`accept-${point.day}`} point={point} color="#166534" />
            ))}
            {weeklyTrends.map((item, index) => {
              const x = 72 + (index / (weeklyTrends.length - 1)) * 620;

              return (
                <text
                  key={item.day}
                  x={x}
                  y="292"
                  fill="#5e5e5e"
                  fontSize="13"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {item.day}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}

function ChartDot({
  point,
  color,
}: {
  point: WeekMetric & { x: number; y: number; value: number };
  color: string;
}) {
  return (
    <g>
      <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" stroke={color} strokeWidth="3" />
      <text
        x={point.x}
        y={point.y - 12}
        fill={color}
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
      >
        {point.value}
      </text>
    </g>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        background: "#ffffff",
        padding: "8px 12px",
        color: "#1a1a1a",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
        }}
      />
      {label}
    </span>
  );
}

function MiniStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        borderRadius: 8,
        background: "var(--color-mist-gray)",
        padding: 16,
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--color-slate)",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-ubermove)",
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          color: "var(--color-slate)",
          fontSize: 13,
          lineHeight: 1.35,
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function KpiGrid() {
  return (
    <section
      aria-label="Scheduling overview"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {insightKpis.map((item) => (
        <article
          key={item.label}
          style={{
            minHeight: 128,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
            borderRadius: 8,
            background: "var(--color-mist-gray)",
            padding: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--color-slate)",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.3,
              textTransform: "uppercase",
            }}
          >
            {item.label}
          </p>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-ubermove)",
                fontSize: 34,
                fontWeight: 400,
                lineHeight: 1,
              }}
            >
              {item.value}
            </p>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--color-slate)",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {item.detail}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

function PreferencePanel({
  title,
  description,
  data,
  accentColor,
}: {
  title: string;
  description: string;
  data: PreferenceMetric[];
  accentColor: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value));

  return (
    <section
      aria-label={title}
      style={{
        minWidth: 0,
        border: "1px solid #eeeeee",
        borderRadius: 8,
        background: "var(--color-paper-white)",
        padding: 24,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-ubermove)",
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "8px 0 20px",
          color: "var(--color-slate)",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>

      <div style={{ display: "grid", gap: 18 }}>
        {data.map((item) => (
          <div key={item.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {item.label}
              </span>
              <span
                style={{
                  color: "var(--color-slate)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {item.value}
                {title.includes("preference") ? "%" : ""}
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: 10,
                borderRadius: 999,
                background: "#eeeeee",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max((item.value / maxValue) * 100, 8)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: accentColor,
                }}
              />
            </div>
            <p
              style={{
                margin: "8px 0 0",
                color: "var(--color-slate)",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanningTable() {
  return (
    <section
      aria-label="Next week planning recommendations"
      style={{
        border: "1px solid #eeeeee",
        borderRadius: 8,
        background: "var(--color-paper-white)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          padding: 24,
          color: "var(--color-paper-white)",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-ubermove)",
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          Next week schedule plan
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            color: "#d4d4d4",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          Practical scheduling signals for receptionist coverage and recall
          timing.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 680,
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "var(--color-mist-gray)" }}>
              <TableHeader>Day</TableHeader>
              <TableHeader>Signal</TableHeader>
              <TableHeader>Recommended action</TableHeader>
            </tr>
          </thead>
          <tbody>
            {dayPlanning.map((row) => (
              <tr key={row.day}>
                <TableCell strong>{row.day}</TableCell>
                <TableCell>{row.signal}</TableCell>
                <TableCell>{row.action}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        borderBottom: "1px solid #eeeeee",
        padding: "14px 18px",
        color: "var(--color-slate)",
        fontSize: 11,
        fontWeight: 700,
        textAlign: "left",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      style={{
        borderBottom: "1px solid #eeeeee",
        padding: "16px 18px",
        color: strong ? "var(--color-jet-black)" : "var(--color-slate)",
        fontWeight: strong ? 700 : 500,
        lineHeight: 1.4,
      }}
    >
      {children}
    </td>
  );
}

export default function Insights() {
  return (
    <main className="page-shell">
      <section className="dashboard">
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-ubermove)",
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            Weekly Insights
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--color-slate)",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            Recall performance, waitlist pressure, and scheduling signals for
            next week.
          </p>
        </div>

        <KpiGrid />
        <LineChart />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 24,
          }}
        >
          <PreferencePanel
            title="Call-time preference"
            description="Best time windows to reach waiting-list patients."
            data={callTimePreferences}
            accentColor="#166534"
          />
          <PreferencePanel
            title="Waitlist priority mix"
            description="Current queue depth by scheduling urgency."
            data={waitlistSegments}
            accentColor="#1a1a1a"
          />
        </div>

        <PlanningTable />
      </section>
    </main>
  );
}
