"use client";

import { useEffect, useState } from "react";
import { useCalls } from "@/lib/hooks/calls";

type CallListItem = NonNullable<ReturnType<typeof useCalls>["calls"]>[number];

function getInitials(call: CallListItem) {
  const lastInitial = call.clientLastName[0];
  const firstInitial = call.clientFirstName[0];

  return `${lastInitial}${firstInitial}`.toUpperCase();
}

function getFullName(call: CallListItem) {
  return `${call.clientFirstName} ${call.clientLastName}`;
}

export default function CallsList() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { calls = [], loading, error } = useCalls(refreshKey);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (loading) {
    return <p>Loading calls...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  const startedCallsCount = calls.reduce(
    (count, call) => count + (call.status === "started" ? 1 : 0),
    0,
  );

  return (
    <section
      aria-label="Calls"
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
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-ubermove)",
            fontSize: 18,
            fontWeight: 400,
            lineHeight: 1.2,
          }}
        >
          Live calls
        </h2>
        <span
          aria-label={`${startedCallsCount} live calls`}
          style={{
            display: "inline-flex",
            minWidth: 32,
            height: 28,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "#ffffff",
            padding: "0 12px",
            color: "#1a1a1a",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {startedCallsCount}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 20px",
        }}
      >
        {calls.map((call) => {
          const statusLabel = call.status === "started" ? "live" : call.status;
          const isLive = statusLabel === "live";
          const isVoicemail = statusLabel === "voicemail";

          return (
            <article
              key={call.id}
              style={{
                display: "flex",
                minHeight: 64,
                alignItems: "center",
                gap: 12,
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                background: "var(--color-mist-gray)",
                padding: "10px 12px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  width: 40,
                  height: 40,
                  flex: "0 0 auto",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "var(--color-jet-black)",
                  color: "var(--color-paper-white)",
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {getInitials(call)}
              </span>

              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {getFullName(call)}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    flex: "0 0 auto",
                    alignItems: "center",
                    borderRadius: 999,
                    background: isLive
                      ? "#dcfce7"
                      : isVoicemail
                        ? "#ffedd5"
                        : "var(--color-paper-white)",
                    padding: "6px 10px",
                    color: isLive
                      ? "#166534"
                      : isVoicemail
                        ? "#9a3412"
                        : "var(--color-slate)",
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1,
                    textTransform: "capitalize",
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
