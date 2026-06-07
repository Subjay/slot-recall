"use client";

import { useState } from "react";
import { ReservationRecord } from "../dal/reservation/types";
import { usePostFetch } from "./fetch";

export function useReservations(
  start: Date,
  end: Date,
  refreshKey = 0,
): {
  reservations?: ReservationRecord[];
  loading: boolean;
  error?: string;
} {
  const { data, loading, error } = usePostFetch<{ data: ReservationRecord[] }>(
    "/api/reservations",
    { start, end },
    refreshKey,
  );

  return { reservations: data?.data, loading, error };
}

export function useUpdateReservationStatus(): {
  updateReservationStatus: (
    id: ReservationRecord["id"],
    status: ReservationRecord["status"],
  ) => Promise<ReservationRecord | undefined>;
  loading: boolean;
  error?: string;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function updateReservationStatus(
    id: ReservationRecord["id"],
    status: ReservationRecord["status"],
  ): Promise<ReservationRecord | undefined> {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reservation status");
      }

      const { data } = (await response.json()) as { data: ReservationRecord };

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  return { updateReservationStatus, loading, error };
}
