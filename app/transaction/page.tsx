// app/transaction/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

const CONFIG_STORAGE_KEY = "applepayprank-config";

type TransactionDirection = "in" | "out" | "purchase";

export default function TransactionPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            backgroundColor: "var(--ios-secondary-system-background)",
          }}
        />
      }
    >
      <TransactionContent />
    </Suspense>
  );
}

function TransactionContent() {
  const searchParams = useSearchParams();

  // --- 1. Read & sanitize amount from URL ---
  const rawAmountFromUrl = searchParams.get("amount") ?? "";
  const cleanedAmount = rawAmountFromUrl.replace(/[^0-9.\-]/g, "");
  const parsedAmountFromUrl =
    cleanedAmount.trim().length > 0 ? Number.parseFloat(cleanedAmount) : NaN;
  const hasValidAmountFromUrl = Number.isFinite(parsedAmountFromUrl);
  const initialAmount = hasValidAmountFromUrl ? parsedAmountFromUrl : 0;

  // --- 2. Names from URL ---
  const initialFromName = searchParams.get("from")?.trim() || "Friend";
  const initialToName = searchParams.get("to")?.trim() || "You";

  // --- 3. Direction ---
  const directionParam = (searchParams.get("direction") || "").toLowerCase();
  const direction: TransactionDirection =
    directionParam === "out" || directionParam === "purchase"
      ? (directionParam as TransactionDirection)
      : "in";

  // --- 4. State ---
  const [amount, setAmount] = useState<number>(initialAmount);
  const [fromName, setFromName] = useState(initialFromName);
  const [toName, setToName] = useState(initialToName);

  // --- 5. Fallback from localStorage config ---
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

      if (initialFromName === "Friend" && cfgFriend) {
        setFromName(cfgFriend);
      }

      if (initialToName === "You" && cfgPrankster) {
        setToName(cfgPrankster);
      }

      if (!hasValidAmountFromUrl && cfgFixedAmount !== null) {
        setAmount(cfgFixedAmount);
      }
    } catch {
      // keep URL/default values
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedAmount = `$${amount.toFixed(2)}`;

  // --- 6. Status based on direction ---
  let statusLine = "Money Received";
  let statusColor = "var(--ios-system-green)";

  if (direction === "out") {
    statusLine = "Money Sent";
    statusColor = "var(--ios-label)";
  } else if (direction === "purchase") {
    statusLine = "Purchase";
    statusColor = "var(--ios-label)";
  }

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
  const dateTimeLine = `${dateLabel} at ${timeLabel} \u00B7 iPhone via Apple Pay`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--ios-secondary-system-background)",
        padding: "0 16px 34px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            position: "relative",
            height: 44,
          }}
        >
          <Link
            href="/"
            style={{
              background: "none",
              border: "none",
              color: "var(--ios-system-blue)",
              fontSize: 17,
              fontWeight: 400,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 300, lineHeight: 1 }}>{"\u2039"}</span>
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
                color: "var(--ios-label)",
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
            borderRadius: 10,
            backgroundColor: "var(--ios-system-background)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            padding: "24px 20px 20px",
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {/* Apple Pay brand row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16,
              color: "var(--ios-label)",
            }}
          >
            <span
              style={{
                fontSize: 20,
                lineHeight: 1,
                display: "inline-block",
              }}
            >
              {"\uF8FF"}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: 0.25,
              }}
            >
              Pay
            </span>
          </div>

          {/* Avatar + Amount */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Avatar name={fromName} size={52} />
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              marginBottom: 4,
              color: "var(--ios-label)",
              textAlign: "center",
            }}
          >
            {formattedAmount}
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginBottom: 4,
              color: "var(--ios-label)",
              textAlign: "center",
            }}
          >
            {fromName}
          </div>

          <div
            style={{
              fontSize: 15,
              color: statusColor,
              fontWeight: 500,
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            {statusLine}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "var(--ios-secondary-label)",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {dateTimeLine}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 0.5,
              backgroundColor: "var(--ios-separator)",
              margin: "0 0 12px",
            }}
          />

          {/* Detail rows */}
          {[
            { label: "From", value: fromName },
            { label: "To", value: toName },
            {
              label: "Status",
              value: "Completed",
              color: "var(--ios-system-green)",
            },
            {
              label: "Type",
              value: direction === "purchase" ? "Purchase" : "Instant Transfer",
            },
            { label: "Device", value: "iPhone \u00B7 Apple Pay" },
            { label: "Reference", value: "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 6767" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                color: "var(--ios-secondary-label)",
                marginBottom: 8,
              }}
            >
              <span>{row.label}</span>
              <span
                style={{
                  color: row.color || "var(--ios-label)",
                  fontWeight: 400,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </section>

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 11,
            color: "var(--ios-tertiary-label)",
            textAlign: "center",
            maxWidth: 320,
            margin: "0 auto",
            lineHeight: 1.5,
          }}
        >
          This is a visual prank only. No actual money was moved.
        </p>
      </div>
    </main>
  );
}
