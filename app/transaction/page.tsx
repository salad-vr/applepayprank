// app/transaction/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

const CONFIG_STORAGE_KEY = "applepayprank-config";

const C = {
  label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.6)",
  tertiaryLabel: "rgba(60,60,67,0.3)",
  bg: "#f2f2f7",
  cardBg: "#ffffff",
  separator: "rgba(60,60,67,0.29)",
  blue: "#007aff",
  green: "#34c759",
} as const;

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

type TransactionDirection = "in" | "out" | "purchase";

export default function TransactionPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", backgroundColor: C.bg }} />
      }
    >
      <TransactionContent />
    </Suspense>
  );
}

function TransactionContent() {
  const searchParams = useSearchParams();

  const rawAmount = searchParams.get("amount") ?? "";
  const cleaned = rawAmount.replace(/[^0-9.\-]/g, "");
  const parsedAmount = cleaned.trim().length > 0 ? parseFloat(cleaned) : NaN;
  const hasValidAmount = Number.isFinite(parsedAmount);
  const initialAmount = hasValidAmount ? parsedAmount : 0;

  const initialFrom = searchParams.get("from")?.trim() || "Friend";
  const initialTo = searchParams.get("to")?.trim() || "You";

  const dirParam = (searchParams.get("direction") || "").toLowerCase();
  const direction: TransactionDirection =
    dirParam === "out" || dirParam === "purchase"
      ? (dirParam as TransactionDirection)
      : "in";

  const [amount, setAmount] = useState(initialAmount);
  const [fromName, setFromName] = useState(initialFrom);
  const [toName, setToName] = useState(initialTo);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      const cfgFriend = typeof cfg.friendName === "string" ? cfg.friendName.trim() : "";
      const cfgPrankster = typeof cfg.pranksterName === "string" ? cfg.pranksterName.trim() : "";
      const cfgFixed =
        cfg.amountMode === "fixed" && typeof cfg.fixedAmount === "number"
          ? cfg.fixedAmount
          : null;

      if (initialFrom === "Friend" && cfgFriend) setFromName(cfgFriend);
      if (initialTo === "You" && cfgPrankster) setToName(cfgPrankster);
      if (!hasValidAmount && cfgFixed !== null) setAmount(cfgFixed);
    } catch { /* keep defaults */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatted = `$${amount.toFixed(2)}`;

  let statusLine = "Money Received";
  let statusColor: string = C.green;
  if (direction === "out") {
    statusLine = "Money Sent";
    statusColor = C.label;
  } else if (direction === "purchase") {
    statusLine = "Purchase";
    statusColor = C.label;
  }

  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  const dateTimeLine = `${dateFmt.format(now)} at ${timeFmt.format(now)} \u00B7 iPhone via Apple Pay`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        padding: "0 16px 34px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        fontFamily: FONT,
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
              color: C.blue,
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
            <span style={{ fontSize: 17, fontWeight: 600, color: C.label }}>
              Details
            </span>
          </div>
          <div style={{ width: 56 }} />
        </header>

        {/* Receipt */}
        <section
          style={{
            borderRadius: 10,
            backgroundColor: C.cardBg,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            padding: "24px 20px 20px",
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {/* Apple Pay brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16,
              color: C.label,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{"\uF8FF"}</span>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.25 }}>
              Pay
            </span>
          </div>

          {/* Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Avatar name={fromName} size={52} />
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              marginBottom: 4,
              color: C.label,
              textAlign: "center",
            }}
          >
            {formatted}
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              marginBottom: 4,
              color: C.label,
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
              color: C.secondaryLabel,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {dateTimeLine}
          </div>

          <div
            style={{
              height: 0.5,
              backgroundColor: C.separator,
              margin: "0 0 12px",
            }}
          />

          {[
            { label: "From", value: fromName },
            { label: "To", value: toName },
            { label: "Status", value: "Completed", color: C.green },
            {
              label: "Type",
              value: direction === "purchase" ? "Purchase" : "Instant Transfer",
            },
            { label: "Device", value: "iPhone \u00B7 Apple Pay" },
            {
              label: "Reference",
              value: "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 6767",
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                color: C.secondaryLabel,
                marginBottom: 8,
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: row.color || C.label, fontWeight: 400 }}>
                {row.value}
              </span>
            </div>
          ))}
        </section>

        <p
          style={{
            fontSize: 11,
            color: C.tertiaryLabel,
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
