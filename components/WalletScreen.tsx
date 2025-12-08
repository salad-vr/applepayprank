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
  const { play, prime } = useSound("/ding.mp3");

  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const { status, displayBalance, prankAmount, triggerPrank } =
    usePrankEngine(BASE_BALANCE, DEFAULT_CONFIG, { onPlaySound: play });

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

  // card click: prime audio (iOS) then start prank
  function handleCardClick() {
    prime();
    triggerPrank();
  }

  // ⓘ info button → fields page (we'll build /info next)
  function handleInfoClick() {
    router.push("/info");
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
            color: "#000", // black like iOS Wallet
            fontSize: "17px",
            fontWeight: 500,
          }}
        >
          Done
        </button>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Info button */}
          <button
            onClick={handleInfoClick}
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#007aff",
              padding: 0,
              cursor: "pointer",
            }}
            aria-label="Info"
          >
            i
          </button>
        </div>
      </header>

      {/* Cash card */}
      <section
        onClick={handleCardClick}
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
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                opacity: 0.8,
              }}
            >
              Balance
            </div>
            <div
              style={{
                fontSize: "1.9rem",
                fontWeight: 600,
                letterSpacing: 0.3,
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
            fontSize: "1.0rem",
            fontWeight: 600,
            marginBottom: "0.4rem",
            paddingInline: "0.25rem",
            color: "#111", // darker label
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
                    color: "#111", // darker text
                  }}
                >
                  {tx.title}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#6b7280", // subtle but readable grey
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
