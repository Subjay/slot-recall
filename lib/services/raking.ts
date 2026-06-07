import type { WaitingListItem } from "@/lib/services/waiting-client";

export type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: string;
};

const metrics = [
  {
    label: "Slots refilled",
    value: "8",
    detail: "31 this week",
    icon: "/icons/KPI1-Photoroom.png",
  },
  {
    label: "Average time to rebook",
    value: "2m 18s",
    detail: "40 calls included",
    icon: "/icons/KPI2-Photoroom-clean.png",
  },
  {
    label: "Average waiting time saved",
    value: "12.4 days",
    detail: "Per accepted patient",
    icon: "/icons/KPI3-Photoroom.png",
  },
  {
    label: "Refill Rate",
    value: "89%",
    detail: "16 of 18 cancellations",
    icon: "/icons/KPI4-Photoroom.png",
  },
] satisfies Metric[];

export async function getMetrics() {
  return metrics;
}

const priorityScore = {
  high: 1,
  medium: 0.6,
  low: 0.2,
} as const;

const rankingWeights = {
  callDate: 0.35,
  priority: 0.25,
  availability: 0.2,
  rejectionRate: 0.12,
} as const;

function clampScore(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function getAvailabilityScore(
  availability: WaitingListItem["client"]["availability"],
) {
  return availability ? 1 : 0;
}

export function generateRankingList(list: WaitingListItem[]): WaitingListItem[] {
  if (list.length === 0) {
    return list;
  }

  const callDates = list.map((item) => item.callDate.getTime());
  const oldestCallDate = Math.min(...callDates);
  const newestCallDate = Math.max(...callDates);
  const callDateRange = newestCallDate - oldestCallDate || 1;

  return list
    .map((item) => {
      const callDate =
        (newestCallDate - item.callDate.getTime()) / callDateRange;
      const priority = priorityScore[item.priority];
      const availability = getAvailabilityScore(item.client.availability);
      const rejectionRatePenalty = clampScore(item.client.rejectionRate);
      const score =
        callDate * rankingWeights.callDate +
        priority * rankingWeights.priority +
        availability * rankingWeights.availability +
        rejectionRatePenalty * rankingWeights.rejectionRate * -1;

      return { item, score };
    })
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
}
