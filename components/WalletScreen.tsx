// components/WalletScreen.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { usePrankEngine } from "@/lib/usePrankEngine";
import type { PrankConfig, Transaction } from "@/lib/types";

const BASE_BALANCE = 105;
const STORAGE_KEY = "applepayprank-config";

const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "You",
  friendName: "Apple Pay",
  amountMode: "fixed",
  fixedAmount: 67.0,
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Debit Card",
    subtitle: "Added to Balance • 41 minutes ago",
    amount: 45,
    direction: "in",
    timeLabel: "",
  },
  {
    id: "2",
    title: "Shanice",
    subtitle: "Sent • Wednesday",
    amount: 35,
    direction: "out",
    timeLabel: "",
  },
  {
    id: "3",
    title: "+1 (914) 484-8324",
    subtitle: "Received • 12/02/25",
    amount: 10,
    direction: "in",
    timeLabel: "",
  },
  {
    id: "4",
    title: "Apple Store",
    subtitle: "Purchase • Yesterday",
    amount: 4.99,
    direction: "out",
    timeLabel: "",
  },
  {
    id: "5",
    title: "Starbucks",
    subtitle: "Purchase • 2 days ago",
    amount: 6.45,
    direction: "out",
    timeLabel: "",
  },
];

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");

  const [config, setConfig] = useState<PrankConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Load config from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: Partial<PrankConfig> = JSON.parse(raw);
      const merged: PrankConfig = { ...DEFAULT_CONFIG, ...parsed };
      setConfig(merged);
    } catch (err) {
      console.warn("[wallet] failed to load config", err);
    }
  }, []);

  const { status, displayBalance, prankAmount, triggerPrank } = usePrankEngine(
    BASE_BALANCE,
    config,
    { onPlaySound: play }
  );

  // Insert prank transaction once completed
  useEffect(() => {
    if (status === "completed" && prankAmount != null) {
      setTransactions(prev => {
        if (prev.some(t => t.isPrank)) return prev;

        const prankTx: Transaction = {
          id: "prank",
          title: config.friendName || "Friend",
          subtitle: `Received from ${config.friendName || "Friend"} • Just now`,
          amount: prankAmount,
          direction: "in",
          timeLabel: "Just now",
          isPrank: true,
        };

        return [prankTx, ...prev];
      });
    }
  }, [status, prankAmount, config]);

  // Navigation for clicking prank transaction
  function handleTransactionClick(tx: Transaction) {
    if (!tx.isPrank) return;

    const params = new URLSearchParams({
      amount: tx.amount.toFixed(2),
      from: config.friendName,
      to: config.pranksterName,
    });

    router.push(`/transaction?${params.toString()}`);
  }

  // Secret card tap → plays sound + sends money
  function handleCardClick() {
    prime();
    triggerPrank();
  }

  function handleInfoClick() {
    router.push("/info");
  }

  const cardHolderName = config.pranksterName || "Cash";

  function getTxIcon(tx: Transaction) {
    if (tx.isPrank) return "⇄";

    const isDebit = tx.title === "Debit Card";
    const looksLikePhone = /^[+0-9()\-\s]+$/.test(tx.title);

    return isDebit || looksLikePhone ? "⇄" : "$";
  }

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
            marginBottom: "0.25rem",
            position: "relative",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              color: "#000",
              fontSize: 17,
              fontWeight: 500,
            }}
          >
            Done
          </button>

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
                fontSize: 22,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: 0.35,
              }}
            >
              {"\uF8FF"} Pay
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleInfoClick}
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: "#000",
                color: "#fff",
                padding: 0,
                cursor: "pointer",
              }}
            >
              i
            </button>
          </div>
        </header>

        {/* Cash Card */}
        <section
          onClick={handleCardClick}
          style={{
            marginTop: "0.7rem",
            marginBottom: "1.2rem",
            background:
              "radial-gradient(circle at 30% 30%, #333 0, #111 40%, #000 70%)",
            borderRadius: 22,
            padding: "1.2rem 1.4rem",
            color: "#fff",
            position: "relative",
            boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
            overflow: "hidden",
            cursor: "pointer",
            width: "100%",
            height: 210,
          }}
        >
          {/* dotted overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.18,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 26 }}>{"\uF8FF"}</span>
                <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>
                  Cash
                </span>
              </div>

              <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.85 }}>
                •••• 6767
              </div>
            </div>

            {/* Bottom row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: "auto",
              }}
            >
              <div style={{ fontSize: "2.2rem", fontWeight: 600, letterSpacing: 0.3 }}>
                ${displayBalance.toFixed(2)}
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    opacity: 0.75,
                    marginBottom: 2,
                  }}
                >
                  Cardholder
                </div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{cardHolderName}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Transactions */}
        <section>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.4rem",
              paddingInline: "0.25rem",
              color: "#111",
            }}
          >
            Latest Transactions
          </h2>

          <div
            style={{
              borderRadius: 16,
              backgroundColor: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {transactions.map((tx, index) => (
              <button
                key={tx.id}
                onClick={() => handleTransactionClick(tx)}
                style={{
                  display: "flex",
                  width: "100%",
                  padding: "0.75rem 0.9rem",
                  border: "none",
                  borderTop: index === 0 ? "none" : "1px solid #eee",
                  backgroundColor: "#fff",
                  textAlign: "left",
                  cursor: tx.isPrank ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "#111",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    marginRight: 10,
                  }}
                >
                  {getTxIcon(tx)}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      marginBottom: 2,
                      color: "#111",
                    }}
                  >
                    {tx.title}
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {tx.subtitle}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: tx.direction === "in" ? "#0a7a20" : "#000",
                  }}
                >
                  {tx.direction === "in" ? "+" : "-"}${tx.amount.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
