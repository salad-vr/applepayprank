// components/WalletScreen.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { usePrankEngine } from "@/lib/usePrankEngine";
import type { PrankConfig, Transaction } from "@/lib/types";

const BASE_BALANCE = 105; // starting visible balance
const STORAGE_KEY = "applepayprank-config";

// default / fallback config
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

  // Apple Pay sheet status
  const [paySheetStatus, setPaySheetStatus] = useState<
    "hidden" | "pending" | "success"
  >("hidden");

  // Load prank config from localStorage (set on /info)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: Partial<PrankConfig> = JSON.parse(raw);
      const merged: PrankConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
      };

      setConfig(merged);
    } catch (err) {
      console.warn("[wallet] failed to load config", err);
    }
  }, []);

  // Derived values for sheet
  const payToName =
    (config.friendName && config.friendName.trim()) ||
    DEFAULT_CONFIG.friendName;
  const payAmount =
    config.amountMode === "fixed" && typeof config.fixedAmount === "number"
      ? config.fixedAmount
      : DEFAULT_CONFIG.fixedAmount ?? 0;

  const cardHolderName = config.pranksterName || "Cash";

  // wrap sound to also drive the sheet state
  const handlePlaySound = () => {
    setPaySheetStatus("success");
    play();
    setTimeout(() => {
      setPaySheetStatus("hidden");
    }, 1200);
  };

  const { status, displayBalance, prankAmount, triggerPrank } =
    usePrankEngine(BASE_BALANCE, config, { onPlaySound: handlePlaySound });

  // When prank finishes, insert the new transaction at top (once)
  useEffect(() => {
    if (status === "completed" && prankAmount != null) {
      setTransactions((prev) => {
        if (prev.some((t) => t.isPrank)) return prev; // don't duplicate

        const prankTx: Transaction = {
          id: "prank",
          // show the FRIEND as the sender in the list
          title: config.friendName || "Friend",
          subtitle: `Received from ${config.friendName || "Friend"} • Just now`,
          amount: prankAmount,
          direction: "in", // incoming money
          timeLabel: "Just now",
          isPrank: true,
        };

        return [prankTx, ...prev];
      });
    }
  }, [status, prankAmount, config]);

  function handleTransactionClick(tx: Transaction) {
    if (!tx.isPrank) return;
    const params = new URLSearchParams({
      amount: tx.amount.toFixed(2),
      from: config.friendName,
      to: config.pranksterName,
    });
    router.push(`/transaction?${params.toString()}`);
  }

  // card click: show sheet, prime audio (iOS) then start prank
  function handleCardClick() {
    if (paySheetStatus !== "hidden") return; // avoid spamming
    setPaySheetStatus("pending");
    prime();
    triggerPrank();
  }

  // ⓘ info button → fields page (/info)
  function handleInfoClick() {
    router.push("/info");
  }

  // helper to decide which icon to show on the left
  function getTxIcon(tx: Transaction): string {
    if (tx.isPrank) return "⇄";
    const isDebit = tx.title === "Debit Card";
    const looksLikePhone = /^[+0-9()\-\s]+$/.test(tx.title);
    if (isDebit || looksLikePhone) return "⇄";
    return "$";
  }

  return (
    <>
      {/* spinner animation for the pay sheet */}
      <style jsx>{`
        @keyframes ap-sheet-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .ap-sheet-spinner {
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          border-width: 2px;
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.7);
          border-top-color: transparent;
          animation: ap-sheet-spin 0.9s linear infinite;
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f2f2f7",
          padding: "0.75rem 0.75rem 2rem",
          fontFamily: "-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
        }}
      >
        {/* Centered phone window like on /info so it sits nicely on iPhone */}
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          {/* Top bar */}
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
                color: "#000", // black like iOS Wallet
                fontSize: "17px",
                fontWeight: 500,
              }}
            >
              Done
            </button>

            {/* Center title:  Pay */}
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
                  fontSize: 22, // bigger top title
                  fontWeight: 600,
                  color: "#111827",
                  letterSpacing: 0.35,
                }}
              >
                {"\uF8FF"} Pay
              </span>
            </div>

            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              {/* Info button (black) */}
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
              height: 210, // fixed, card-like height
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
              {/* top row: fake Apple logo + Cash, and card number */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 26 }}>{"\uF8FF"}</span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                    }}
                  >
                    Cash
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 2,
                    opacity: 0.85,
                  }}
                >
                  •••• 6767
                </div>
              </div>

              {/* bottom: balance + cardholder aligned right */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: "auto",
                }}
              >
                {/* big balance on left (no "Balance" label) */}
                <div
                  style={{
                    fontSize: "2.2rem",
                    fontWeight: 600,
                    letterSpacing: 0.3,
                  }}
                >
                  ${displayBalance.toFixed(2)}
                </div>

                {/* cardholder bottom-right */}
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
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {cardHolderName}
                  </div>
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
                    {getTxIcon(tx)}
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
        </div>
      </main>

      {/* Apple Pay-style verification sheet */}
      {paySheetStatus !== "hidden" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 0 0, rgba(255,255,255,0.05), transparent 60%), radial-gradient(circle at 100% 0, rgba(255,255,255,0.05), transparent 60%), linear-gradient(to bottom, #111827, #020617)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              paddingInline: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "#fff",
            }}
          >
            {/* top NFC icon placeholder + text */}
            <div
              style={{
                marginTop: 40,
                marginBottom: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  border: "2px solid rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                <span>⇆</span>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  opacity: 0.9,
                }}
              >
                Hold Here to Pay
              </div>
            </div>

            {/* central pay card */}
            <div
              style={{
                width: "100%",
                borderRadius: 24,
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(3,7,18,0.98))",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 20px 40px rgba(0,0,0,0.65)",
                border: "1px solid rgba(148,163,184,0.35)",
              }}
            >
              {/* circle: spinner or check */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 9999,
                  backgroundColor: "rgba(15,23,42,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                {paySheetStatus === "pending" ? (
                  <div className="ap-sheet-spinner" />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      backgroundColor: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      ✓
                    </span>
                  </div>
                )}
              </div>

              {/* text + amount */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                  }}
                >
                  Pay {payToName}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    whiteSpace: "nowrap",
                  }}
                >
                  ${payAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* bottom X button */}
            <button
              style={{
                marginTop: 40,
                width: 34,
                height: 34,
                borderRadius: 9999,
                border: "1px solid rgba(148,163,184,0.5)",
                backgroundColor: "rgba(15,23,42,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5e7eb",
                fontSize: 16,
                cursor: "default",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
