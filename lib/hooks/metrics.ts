"use client";

import type { Metric } from "@/lib/services/raking";
import { useFetch } from "./fetch";

export function useMetrics(): {
  metrics?: Metric[];
  loading: boolean;
  error?: string;
} {
  const { data, loading, error } = useFetch<{ data: Metric[] }>("/api/metrics");

  return { metrics: data?.data, loading, error };
}
