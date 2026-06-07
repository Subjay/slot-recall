"use client";

import type { WaitingListItem } from "@/lib/services/waiting-client";
import { useFetch } from "./fetch";

export function useWaitingList(refreshKey = 0): {
  waiting_list?: WaitingListItem[];
  loading: boolean;
  error?: string;
} {
  const { data, loading, error } =
    useFetch<{ data: WaitingListItem[] }>("/api/waiting-list", refreshKey);

  return { waiting_list: data?.data, loading, error };
}
