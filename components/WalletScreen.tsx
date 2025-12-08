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
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);

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
            padding: "1.35rem 1.5rem",
            color: "#fff",
            position: "relative",
            boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
            overflow: "hidden",
            cursor: "pointer",
            width: "100%",
            height: 230, // slightly taller (≈10% increase)
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
                <span st
