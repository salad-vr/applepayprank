// app/transaction/page.tsx
"use client";

import Link from "next/link";

type TransactionPageProps = {
  searchParams?: {
    amount?: string;
    from?: string;
    to?: string;
  };
};

export default function TransactionPage({ searchParams }: TransactionPageProps) {
  const amountRaw = searchParams?.amount ?? "0.00";

  // Safely parse amount
  const parsedAmount = Number.parseFloat(amountRaw || "0");
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  const fromName =
    (searchParams?.from && searchParams.from.trim()) || "Friend";
  const toName = (searchParams?.to && searchParams.to.trim()) || "You";

  const formattedAmount = `$${amount.toFixed(2)}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f2f2f7",
        padding: "0.75rem 0.75rem 2rem",
        fontFamily: "-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            position: "relative",
          }}
        >
          <Link
            href="/"
            style={{
              background: "none",
              border: "none",
              color: "#007aff",
              fontSize: 17,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Wallet
          </Link>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: 0.25,
              }}
            >
              Details
            </span>
          </div>

          <div style={{ width: 56 }} />
        </header>

        {/* Main receipt card */}
        <section
          style={{
            borderRadius: 22,
            backgroundColor: "#fff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.10)",
            padding: "1.2rem 1.3rem 1.4rem",
            marginTop: "0.5rem",
            marginBottom: "1.1rem",
          }}
        >
          {/* Apple Pay pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              backgroundColor: "#f3f4f6",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>{"\uF8FF"}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 0.25,
              }}
            >
              Pay
            </span>
          </div>

          {/* Amount */}
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            {formattedAmount}
          </div>

          {/* Status line */}
          <div
            style={{
              fontSize: 14,
              color: "#16a34a",
              fontWeight: 500,
              marginBottom: 10,
            }}
          >
            Money Received
          </div>

          {/* From / To */}
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            <div style={{ marginBottom: 2 }}>
              From{" "}
              <span style={{ color: "#111827", fontWeight: 500 }}>
                {fromName}
              </span>
            </div>
            <div>
              To{" "}
              <span style={{ color: "#111827", fontWeight: 500 }}>
                {toName}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: "#e5e7eb",
              margin: "0.9rem 0 0.7rem",
            }}
          />

          {/* Meta rows */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            <span>Status</span>
            <span style={{ color: "#16a34a", fontWeight: 500 }}>Completed</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            <span>Type</span>
            <span>Instant Transfer</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            <span>Reference</span>
            <span>•••• •••• •••• 6767</span>
          </div>
        </section>

        {/* Tiny hint / safety line to keep things light */}
        <p
          style={{
            fontSize: 11,
            color: "#9ca3af",
            textAlign: "center",
            maxWidth: 320,
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        >
          This is a visual prank only. No actual money was moved. If someone’s
          stressing, maybe tell them that part.
        </p>
      </div>
    </main>
  );
}
