"use client";

import { Fragment, useMemo } from "react";
import type { CSSProperties } from "react";

import { ReservationRecord } from "@/lib/dal/reservation/types";
import { useReservations } from "@/lib/hooks/reservations";

type CalendarReservation = Pick<
  ReservationRecord,
  "id" | "status" | "startDate" | "duration" | "doctorId" | "clientId"
>;

const calendarStartHour = 8;
const calendarEndHour = 18;
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const calendarHours = Array.from(
  { length: calendarEndHour - calendarStartHour + 1 },
  (_, index) => calendarStartHour + index,
);

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function toDate(value: ReservationRecord["startDate"]) {
  return value instanceof Date ? value : new Date(value);
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:00 ${period}`;
}

function formatReservationTime(startDate: Date, duration: number) {
  const endDate = new Date(startDate.getTime() + duration * 60 * 60_000);

  return `${formatHour(startDate.getHours())} - ${formatHour(endDate.getHours())}`;
}

function getReservationsBySlot(reservations: ReservationRecord[] = []) {
  return reservations.reduce<Record<string, CalendarReservation[]>>(
    (slots, reservation) => {
      const startDate = toDate(reservation.startDate);
      const hour = startDate.getHours();

      if (hour < calendarStartHour || hour > calendarEndHour) {
        return slots;
      }

      const slotKey = `${getDateKey(startDate)}-${hour}`;

      slots[slotKey] = [
        ...(slots[slotKey] ?? []),
        {
          id: reservation.id,
          status: reservation.status,
          startDate,
          duration: reservation.duration,
          doctorId: reservation.doctorId,
          clientId: reservation.clientId,
        },
      ];

      slots[slotKey].sort(
        (first, second) =>
          first.startDate.getTime() - second.startDate.getTime(),
      );

      return slots;
    },
    {},
  );
}

export default function Calendar() {
  const weekStart = useMemo(() => getWeekStart(new Date("2026-06-08")), []);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const { reservations, loading, error } = useReservations(weekStart, weekEnd);
  const reservationsBySlot = useMemo(
    () => getReservationsBySlot(reservations),
    [reservations],
  );

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
            Weekly Calendar
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "var(--color-slate)",
              fontSize: 14,
            }}
          >
            {weekStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {addDays(weekStart, 6).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {error ? (
          <p style={{ color: "#b42318", margin: 0 }}>{error}</p>
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #eeeeee",
              borderRadius: 12,
              background: "var(--color-paper-white)",
            }}
          >
            <div
              style={{
                minWidth: 800,
                display: "grid",
                gridTemplateColumns: "72px repeat(7, minmax(104px, 1fr))",
              }}
            >
              <div style={headerCellStyle} />
              {days.map((day, index) => (
                <div key={day.toISOString()} style={headerCellStyle}>
                  <span style={{ display: "block", fontSize: 13 }}>
                    {weekDays[index]}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "var(--color-slate)",
                      fontSize: 12,
                    }}
                  >
                    {day.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              ))}

              {calendarHours.map((hour) => (
                <Fragment key={hour}>
                  <div key={`hour-${hour}`} style={timeCellStyle}>
                    {formatHour(hour)}
                  </div>
                  {days.map((day) => {
                    const slotReservations =
                      reservationsBySlot[`${getDateKey(day)}-${hour}`] ?? [];

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        style={calendarCellStyle}
                      >
                        {loading ? (
                          <span style={mutedTextStyle}>Loading...</span>
                        ) : slotReservations.length === 0 ? null : (
                          slotReservations.map((reservation) => (
                            <article
                              key={reservation.id}
                              style={{
                                border:
                                  reservation.status === "cancelled"
                                    ? "1px dashed #e25050"
                                    : "1px solid #d7d7d7",
                                borderRadius: 8,
                                background:
                                  reservation.status === "cancelled"
                                    ? "#fff3f3"
                                    : "#eaf4ff",
                                padding: "6px 8px",
                                color:
                                  reservation.status === "cancelled"
                                    ? "#b42318"
                                    : "var(--color-jet-black)",
                              }}
                            >
                              <strong
                                style={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {formatReservationTime(
                                  reservation.startDate,
                                  reservation.duration,
                                )}
                              </strong>
                              <span
                                style={{
                                  display: "block",
                                  marginTop: 4,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color:
                                    reservation.status === "cancelled"
                                      ? "#b42318"
                                      : "var(--color-slate)",
                                  fontSize: 12,
                                  textTransform: "capitalize",
                                }}
                              >
                                {reservation.status}
                              </span>
                            </article>
                          ))
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const headerCellStyle = {
  boxSizing: "border-box",
  minHeight: 48,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  borderBottom: "1px solid #333333",
  borderLeft: "1px solid #333333",
  padding: "10px 8px",
  background: "#1a1a1a",
  color: "#ffffff",
  fontWeight: 600,
} satisfies CSSProperties;

const timeCellStyle = {
  boxSizing: "border-box",
  minHeight: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderTop: "1px solid #333333",
  padding: "8px",
  background: "#1a1a1a",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 500,
} satisfies CSSProperties;

const calendarCellStyle = {
  boxSizing: "border-box",
  minHeight: 56,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  borderTop: "1px solid #eeeeee",
  borderLeft: "1px solid #eeeeee",
  padding: 4,
} satisfies CSSProperties;

const mutedTextStyle = {
  color: "var(--color-slate)",
  fontSize: 12,
} satisfies CSSProperties;
