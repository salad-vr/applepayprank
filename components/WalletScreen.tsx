// components/WalletScreen.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { usePrankEngine } from "@/lib/usePrankEngine";
import type { PrankConfig, Transaction } from "@/lib/types";

const BASE_BALANCE = 105; // starting visible balance

// simple hardcoded config for now
const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "You",
  friendName: "Dorian",
  amountMode: "fixed",
  fixedAmount: 27.43,
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Debit Card",
    subtitle: "Added to Balance • 41 minutes ago",
    amount: 207,
    direction: "in",
    timeLabel: "",
  },
  {
    id: "2",
    title: "Shanice",
    subtitle: "Sent • Wednesday",
    amount: 38.24,
    direction: "out",
    timeLabel: "",
  },
  {
    id: "3",
    title: "+1 (914) 484-8324",
    subtitle: "Received • 11/24/20",
    amount: 10,
    direction: "in",
    timeLabel: "",
  },
];

export function WalletScreen() {
  const router = useRouter();
  const { play } = useSound("/ding.mp3");

  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const {
    status,
    displayBalance,
    prankAmount,
    triggerPrank,
  } = usePrankEngine(BASE_BALANCE, DEFAULT_CONFIG, { onPlaySound: play });

  // When prank finishes, insert the new transaction at top (once)
  useEffect(() => {
    if (status === "completed" && prankAmount != null) {
      setTransactions((prev) => {
        if (prev.some((t) => t.isPrank)) return prev; // don't duplicate

        const prankTx: Transaction = {
          id: "prank",
          title: DEFAULT_CONFIG.pranksterName,
          subtitle: `Sent to ${DEFAULT_CONFIG.pranksterName} • Just now`,
          amount: prankAmount,
          direction: "out",
          timeLabel: "Just now",
          isPrank: true,
        };

        return [prankTx, ...prev];
      });
    }
  }, [status, prankAmount]);

  function handleTransactionClick(tx: Transaction) {
    if (!tx.isPrank) return;
    const params = new URLSearchParams({
      amount: tx.amount.toFixed(2),
      from: DEFAULT_CONFIG.friendName,
      to: DEFAULT_CONFIG.pranksterName,
    });
    router.push(`/transaction?${params.toString()}`);
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
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "#007aff",
            fontSize: "1rem",
          }}
        >
          Done
        </button>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "1.1rem" }}>🔍</span>
          <span style={{ fontSize: "1.4rem" }}>⋯</span>
        </div>
      </header>

      {/* Cash card */}
      <section
        onClick={triggerPrank}
        style={{
          marginTop: "0.5rem",
          marginBottom: "1.2rem",
          background:
            "radial-gradient(circle at 30% 30%, #333 0, #111 40%, #000 70%)",
          borderRadius: 20,
          padding: "1.2rem 1.4rem",
          color: "#fff",
          position: "relative",
          boxShadow: "0 12px 25px rgba(0,0,0,0.4)",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          Cash
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.22,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
              Balance
            </div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              ${displayBalance.toFixed(2)}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Transactions */}
      <section>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            marginBottom: "0.4rem",
            paddingInline: "0.25rem",
          }}
        >
          Latest Transactions
        </h2>
        <div
          style={{
            borderRadius: 16,
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
              {/* left icon */}
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
                {tx.isPrank ? "⇄" : "$"}
              </div>

              {/* middle content */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    marginBottom: 2,
                  }}
                >
                  {tx.title}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.6,
                  }}
                >
                  {tx.subtitle}
                </div>
              </div>

              {/* right amount */}
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  color: tx.direction === "in" ? "#0a7a20" : "#000",
                }}
              >
                {tx.direction === "in" ? "+" : "-"}$
                {tx.amount.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
