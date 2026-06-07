"use client";

import { useState } from "react";
import { ReservationRecord } from "@/lib/dal/reservation/types";
import { useUpdateReservationStatus } from "@/lib/hooks/reservations";

interface ReservationsCalendarProps {
  date?: Date;
  reservations?: ReservationRecord[];
  refreshTrigger: () => void;
}

type CalendarReservation = Pick<
  ReservationRecord,
  "id" | "status" | "startDate" | "duration" | "doctorId" | "clientId"
>;

type CalendarSlot = {
  hour: number;
  reservation?: CalendarReservation;
};

const calendarStartHour = 8;
const calendarEndHour = 18;
const calendarHours = Array.from(
  { length: calendarEndHour - calendarStartHour + 1 },
  (_, index) => calendarStartHour + index,
);

function durationToMinutes(duration: number) {
  return duration * 60;
}

function isSameDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function toDate(value: ReservationRecord["startDate"]) {
  return value instanceof Date ? value : new Date(value);
}

function formatReservationTime(startDate: Date, duration: number) {
  const endDate = new Date(startDate.getTime() + duration * 60_000);
  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
}

function formatTime(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return formatter.format(date).toLowerCase();
}

function formatSlotTime(hour: number) {
  const period = hour >= 12 ? "pm" : "am";
  const formattedHour = String(hour % 12 || 12).padStart(2, "0");

  return `${formattedHour}:00 ${period}`;
}

function getCalendarReservations(
  reservations: ReservationRecord[],
  date: Date,
): CalendarReservation[] {
  return reservations
    .map((reservation) => {
      const startDate = toDate(reservation.startDate);

      return {
        id: reservation.id,
        status: reservation.status,
        startDate,
        duration: reservation.duration,
        doctorId: reservation.doctorId,
        clientId: reservation.clientId,
      };
    })
    .filter(
      (reservation) =>
        isSameDay(reservation.startDate, date) &&
        reservation.startDate.getHours() >= calendarStartHour &&
        reservation.startDate.getHours() <= calendarEndHour,
    )
    .sort(
      (first, second) => first.startDate.getTime() - second.startDate.getTime(),
    );
}

function getCalendarSlots(reservations: CalendarReservation[]): CalendarSlot[] {
  return calendarHours.flatMap((hour) => {
    const hourReservations = reservations.filter(
      (reservation) => reservation.startDate.getHours() === hour,
    );

    if (hourReservations.length === 0) {
      return [{ hour }];
    }

    return hourReservations.map((reservation) => ({ hour, reservation }));
  });
}

function getSlotKey(slot: CalendarSlot) {
  return slot.reservation?.id ?? `empty-${slot.hour}`;
}

export default function ReservationsCalendar({
  date = new Date(),
  reservations = [],
  refreshTrigger,
}: ReservationsCalendarProps) {
  const [reservationToConfirm, setReservationToConfirm] = useState<
    CalendarReservation["id"] | null
  >(null);
  const { updateReservationStatus, loading: isUpdatingReservationStatus } =
    useUpdateReservationStatus();
  const calendarReservations = getCalendarReservations(reservations, date);
  const calendarSlots = getCalendarSlots(calendarReservations);
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const isCurrentDay = isSameDay(date, currentDate);

  async function handleCancelClick(reservationId: CalendarReservation["id"]) {
    if (reservationToConfirm === reservationId) {
      const updatedReservation = await updateReservationStatus(
        reservationId,
        "cancelled",
      );

      if (updatedReservation) {
        refreshTrigger();
      }

      setReservationToConfirm(null);
      return;
    }

    setReservationToConfirm(reservationId);
  }

  return (
    <section
      aria-label="Reservations calendar"
      style={{
        borderRadius: 8,
        background: "var(--color-paper-white)",
        border: "1px solid #eeeeee",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          minHeight: 72,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "#1a1a1a",
          padding: 20,
          borderBottom: "1px solid #eeeeee",
          color: "var(--color-paper-white)",
        }}
      >
        <div>
          <h2
            style={{
              margin: "4px 0 0",
              fontFamily: "var(--font-ubermove)",
              fontSize: 18,
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            Current Day Reservations
          </h2>
        </div>
        <time
          dateTime={date.toISOString()}
          style={{ color: "var(--color-paper-white)", fontSize: 14 }}
        >
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </div>

      <div style={{ overflow: "auto", padding: "12px 20px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {calendarSlots.map((slot, index) => {
            const showCurrentHourIndicator =
              isCurrentDay &&
              slot.hour === currentHour &&
              calendarSlots[index - 1]?.hour !== slot.hour;

            if (!slot.reservation) {
              return (
                <div key={getSlotKey(slot)} style={{ position: "relative" }}>
                  {showCurrentHourIndicator && <CurrentHourIndicator />}
                  <article
                    style={{
                      height: 72,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                      overflow: "hidden",
                      border: "1px dashed #e5e5e5",
                      borderRadius: 8,
                      background: "#ffffff",
                      padding: "8px 12px",
                      color: "var(--color-slate)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatSlotTime(slot.hour)}
                    </span>
                    <span style={{ fontSize: 12 }}>Available</span>
                  </article>
                </div>
              );
            }

            const reservation = slot.reservation;
            const isCancelled = reservation.status === "cancelled";
            const isBooked = reservation.status === "booked";
            const isRebooked = reservation.status === "rebooked";

            return (
              <div key={getSlotKey(slot)} style={{ position: "relative" }}>
                {showCurrentHourIndicator && <CurrentHourIndicator />}
                <article
                  style={{
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 4,
                    overflow: "hidden",
                    border: `1px ${isCancelled ? "dashed" : "solid"} ${
                      isCancelled ? "#e25050" : "#e5e5e5"
                    }`,
                    borderRadius: 8,
                    background: isCancelled
                      ? "#fff3f3"
                      : isBooked
                        ? "#eff6ff"
                        : isRebooked
                          ? "#f0fdf4"
                          : "var(--color-mist-gray)",
                    padding: "8px 12px",
                    color: isCancelled ? "#b42318" : "var(--color-jet-black)",
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {formatReservationTime(
                        reservation.startDate,
                        durationToMinutes(reservation.duration),
                      )}
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        color: isCancelled ? "#b42318" : "var(--color-slate)",
                      }}
                    >
                      {reservation.status}
                    </span>
                  </div>
                  {!isCancelled && (
                    <button
                      type="button"
                      disabled={isUpdatingReservationStatus}
                      onClick={() => handleCancelClick(reservation.id)}
                      style={{
                        flexShrink: 0,
                        border: "1px solid #e25050",
                        borderRadius: 6,
                        background: "#ffffff",
                        padding: "6px 10px",
                        color: "#b42318",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: isUpdatingReservationStatus
                          ? "not-allowed"
                          : "pointer",
                        opacity: isUpdatingReservationStatus ? 0.7 : 1,
                      }}
                    >
                      {reservationToConfirm === reservation.id
                        ? "Confirm?"
                        : "Cancel"}
                    </button>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CurrentHourIndicator() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        left: 0,
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
        transform: "translateY(-50%)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: "50%",
          background: "#e25050",
        }}
      />
      <span
        style={{
          height: 1,
          flex: 1,
          background: "#e25050",
        }}
      />
    </div>
  );
}
