"use client";

import type { CallRecord } from "@/lib/dal/call/types";
import { useFetch } from "./fetch";

type CallListItem = Pick<
  CallRecord,
  "id" | "clientId" | "status" | "answer" | "reason"
> & {
  clientFirstName: string;
  clientLastName: string;
};

export function useCalls(refreshKey = 0): {
  calls?: CallListItem[];
  loading: boolean;
  error?: string;
} {
  const { data, loading, error } = useFetch<{ data: CallListItem[] }>(
    "/api/calls",
    refreshKey,
  );

  return { calls: data?.data, loading, error };
}
