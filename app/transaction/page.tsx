// app/transaction/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONFIG_STORAGE_KEY = "applepayprank-config";

type TransactionDirection = "in" | "out" | "purchase";

type TransactionPageProps = {
  searchParams?: {
    amount?: string;
    from?: string;
    to?: string;
    direction?: TransactionDirection | string;
  };
};

export default function TransactionPage({ searchParams }: TransactionPageProps) {
  // --- 1. Read & sanitize amount from URL (if present) ---
  const rawAmountFromUrl = searchParams?.amount ?? "";

  // strip anything that's not digit, dot, or minus (handles "$27.43", "27,43", etc.)
  const cleanedAmount = (rawAmountFromUrl || "").replace(/[^0-9.\-]/g, "");

  const parsedAmountFromUrl =
    cleanedAmount.trim().length > 0 ? Number.parseFloat(cleanedAmount) : NaN;

  const hasValidAmountFromUrl = Number.isFinite(parsedAmountFromUrl);
  const initialAmount = hasValidAmountFromUrl ? parsedAmountFromUrl : 0;

  // --- 2. Names from URL (if present) ---
  const initialFromName =
    (searchParams?.from && searchParams.from.trim()) || "Friend";
  const initialToName =
    (searchParams?.to && searchParams.to.trim()) || "You";

  // --- 3. Direction of transaction (for future other placeholders) ---
  const directionParam = (searchParams?.direction || "").toLowerCase();
  const direction: TransactionDirection =
    directionParam === "out" || directionParam === "purchase"
      ? (directionParam as TransactionDirection)
      : "in";

  // --- 4. State so we can override from localStorage on the client ---
  const [amount, setAmount] = useState<number>(initialAmount);
  const [fromName, setFromName] = useState(initialFromName);
  const [toName, setToName] = useState(initialToName);

  // --- 5. Fallback: pull names + amount from saved prank config ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;

      const cfg = JSON.parse(raw) as {
        pranksterName?: string;
        friendName?: string;
        amountMode?: "fixed" | "randomRange";
        fixedAmount?: number;
      };

      const cfgFriend =
        typeof cfg.friendName === "string" ? cfg.friendName.trim() : "";
      const cfgPrankster =
        typeof cfg.pranksterName === "string"
          ? cfg.pranksterName.trim()
          : "";

      const cfgFixedAmount =
        cfg.amountMode === "fixed" && typeof cfg.fixedAmount === "number"
          ? cfg.fixedAmount
          : null;

      // Only override names if URL didn't give us anything custom
      if ((!searchParams?.from || initialFromName === "Friend") && cfgFriend) {
        setFromName(cfgFriend);
      }

      if ((!searchParams?.to || initialToName === "You") && cfgPrankster) {
        setToName(cfgPrankster);
      }

      // Only override amount if we DIDN'T get a valid amount from the URL
      if (!hasValidAmountFromUrl && cfgFixedAmount !== null) {
        setAmount(cfgFixedAmount);
      }
    } catch {
      // If parsing fails, just keep the URL/default values.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const formattedAmount = `$${amount.toFixed(2)}`;

  // --- 6. Status line based on direction (ready for other transactions) ---
  let statusLine = "Money Received";
  let statusColor = "#16a34a";

  if (direction === "out") {
    statusLine = "Money Sent";
    statusColor = "#111827";
  } else if (direction === "purchase") {
    statusLine = "Purchase";
    statusColor = "#111827";
  }

  // Simple "now" date/time for realism
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const dateLabel = dateFormatter.format(now);
  const timeLabel = timeFormatter.format(now);
  const dateTimeLine = `${dateLabel} at ${timeLabel} • iPhone via Apple Pay`;

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
          {/* Apple Pay brand row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
              color: "#111827",
            }}
          >
            <span
              style={{
                fontSize: 20,
                lineHeight: 1,
                display: "inline-block",
                color: "#111827",
              }}
            >
              {"\uF8FF"}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 0.25,
                color: "#111827",
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

          {/* Big name line (who it looks like it's from) */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            {fromName}
          </div>

          {/* Status line (varies by direction) */}
          <div
            style={{
              fontSize: 14,
              color: statusColor,
              fontWeight: 500,
              marginBottom: 4,
            }}
          >
            {statusLine}
          </div>

          {/* Date / time / device */}
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 10,
            }}
          >
            {dateTimeLine}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: "#e5e7eb",
              margin: "0.7rem 0 0.7rem",
            }}
          />

          {/* Detail rows */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            <span>From</span>
            <span style={{ color: "#111827", fontWeight: 500 }}>
              {fromName}
            </span>
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
            <span>To</span>
            <span style={{ color: "#111827", fontWeight: 500 }}>
              {toName}
            </span>
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
            <span>Status</span>
            <span style={{ color: "#16a34a", fontWeight: 500 }}>
              Completed
            </span>
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
            <span>
              {direction === "purchase" ? "Purchase" : "Instant Transfer"}
            </span>
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
            <span>Device</span>
            <span>iPhone • Apple Pay</span>
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

        {/* Tiny hint / safety line */}
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