"use client";

import { useMemo, useState } from "react";
import { useMetrics } from "@/lib/hooks/metrics";
import { Metrics } from "@/components/ui/metrics";
import { useReservations } from "@/lib/hooks/reservations";
import ReservationsCalendar from "./_components/reservations-calendar";
import { useWaitingList } from "@/lib/hooks/waiting-list";
import WaitingList from "./_components/waiting-list";
import CallsList from "./_components/calls-list";
import { generateRankingList } from "@/lib/services/raking";

function ErrorMessage({ message }: { message: string }) {
  return <p style={{ color: "#b42318", margin: 0 }}>{message}</p>;
}

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useMetrics();

  const {
    reservations,
    loading: reservationsLoading,
    error: reservationsError,
  } = useReservations(
    new Date("2026-06-08"),
    new Date("2026-06-15"),
    refreshKey,
  );

  const {
    waiting_list,
    loading: waitingLoading,
    error: waitingError,
  } = useWaitingList(refreshKey);

  const rankedWaitingList = useMemo(
    () =>
      generateRankingList(
        (waiting_list ?? []).map((item) => ({
          ...item,
          callDate: new Date(item.callDate),
        })),
      ),
    [waiting_list],
  );

  function refreshTrigger() {
    setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
  }
  return (
    <main className="page-shell">
      <section
        className="dashboard"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          {metricsLoading ? (
            "Metrics loading..."
          ) : metricsError ? (
            <ErrorMessage message={metricsError} />
          ) : (
            <Metrics metrics={metrics} />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {reservationsLoading ? (
            "loading..."
          ) : reservationsError ? (
            <ErrorMessage message={reservationsError} />
          ) : (
            <ReservationsCalendar
              reservations={reservations}
              date={new Date("2026-06-08")}
              refreshTrigger={refreshTrigger}
            />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {waitingLoading ? (
            "loading..."
          ) : waitingError ? (
            <ErrorMessage message={waitingError} />
          ) : (
            <WaitingList list={rankedWaitingList} />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <CallsList />
        </div>
      </section>
    </main>
  );
}
