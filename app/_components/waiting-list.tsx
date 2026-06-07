import { WaitingListItem } from "@/lib/services/waiting-client";

interface WaitingListProps {
  list?: WaitingListItem[];
}

function getInitials(item: WaitingListItem) {
  const lastInitial = item.client.lastName.charAt(0);
  const firstInitial = item.client.firstName.charAt(0);

  return `${lastInitial}${firstInitial}`.toUpperCase();
}

function getFullName(item: WaitingListItem) {
  return `${item.client.firstName} ${item.client.lastName}`;
}

export default function WaitingList({ list = [] }: WaitingListProps) {
  return (
    <section
      aria-label="Best matches to call"
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
          Ranked waiting clients
        </h2>

        <span
          aria-label={`${list.length} waiting clients`}
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
          {list.length}
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
        {list.map((item) => (
          <article
            key={item.id}
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
              {getInitials(item)}
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
                {getFullName(item)}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  flex: "0 0 auto",
                  alignItems: "center",
                  borderRadius: 999,
                  background: "var(--color-paper-white)",
                  padding: "6px 10px",
                  color: "var(--color-slate)",
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1,
                  textTransform: "capitalize",
                }}
              >
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
