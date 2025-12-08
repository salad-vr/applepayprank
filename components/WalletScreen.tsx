// components/WalletScreen.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { usePrankEngine } from "@/lib/usePrankEngine";
import type { PrankConfig, Transaction } from "@/lib/types";

const BASE_BALANCE = 105;
const STORAGE_KEY = "applepayprank-config";

// Fallback config if nothing saved yet
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

  const [config, setConfig] = useState<PrankConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // NEW: status for the overlay
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "pending" | "success"
  >("idle");

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

  // Safe derived values for UI
  const prankFromName =
    (config.friendName && config.friendName.trim()) || DEFAULT_CONFIG.friendName;
  const prankToName =
    (config.pranksterName && config.pranksterName.trim()) ||
    DEFAULT_CONFIG.pranksterName;

  const nextTransferAmount: number =
    config.amountMode === "fixed" && typeof config.fixedAmount === "number"
      ? config.fixedAmount
      : DEFAULT_CONFIG.fixedAmount ?? 0;

  // Wrap the sound hook so it also drives the Pending → Done animation
  const handlePlaySound = () => {
    // show spinner + "Pending" exactly when the ding fires
    setPaymentStatus("pending");
    play();

    // little delay to swap to checkmark
    setTimeout(() => {
      setPaymentStatus("success");
    }, 750);

    // then hide overlay
    setTimeout(() => {
      setPaymentStatus("idle");
    }, 1600);
  };

  const { status, displayBalance, prankAmount, triggerPrank } =
    usePrankEngine(BASE_BALANCE, config, { onPlaySound: handlePlaySound });

  // When prank finishes, insert the new transaction at top (once)
  useEffect(() => {
    if (status === "completed" && prankAmount != null) {
      setTransactions((prev) => {
        if (prev.some((t) => t.isPrank)) return prev;

        const prankTx: Transaction = {
          id: "prank",
          title: prankToName,
          subtitle: `Sent to ${prankToName} • Just now`,
          amount: prankAmount,
          direction: "out",
          timeLabel: "Just now",
          isPrank: true,
        };

        return [prankTx, ...prev];
      });
    }
  }, [status, prankAmount, prankToName]);

  function handleTransactionClick(tx: Transaction) {
    if (!tx.isPrank) return;
    const params = new URLSearchParams({
      amount: tx.amount.toFixed(2),
      from: prankFromName,
      to: prankToName,
    });
    router.push(`/transaction?${params.toString()}`);
  }

  // card click: prime audio (iOS) then start prank
  function handleCardClick() {
    // optional: ignore taps while overlay animating
    if (paymentStatus !== "idle") return;

    prime();
    triggerPrank();
  }

  function handleInfoClick() {
    router.push("/info");
  }

  return (
    <>
      {/* Spinner animation keyframes */}
      <style jsx>{`
        @keyframes ap-spinner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .ap-spinner {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          border-width: 2px;
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.6);
          border-top-color: transparent;
          animation: ap-spinner 0.75s linear infinite;
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
        {/* Top bar with Apple-style title */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          {/* Left: Done */}
          <div style={{ width: 60 }}>
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
          </div>

          {/* Center: Apple Pay title */}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: 600,
              color: "#000",
            }}
          >
            Apple Pay
          </div>

          {/* Right: info button */}
          <div
            style={{
              width: 60,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
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

        {/* Subtle hint text */}
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            paddingInline: "0.1rem",
            marginBottom: "0.25rem",
          }}
        >
          Double-check the amount, then tap the card to send.
        </div>

        {/* Cash card */}
        <section
          onClick={handleCardClick}
          style={{
            marginTop: "0.25rem",
            marginBottom: "1.2rem",
            background:
              "radial-gradient(circle at 20% 0%, #444 0, #222 30%, #000 70%)",
            borderRadius: 20,
            padding: "1.2rem 1.4rem",
            color: "#fff",
            position: "relative",
            boxShadow: "0 12px 25px rgba(0,0,0,0.45)",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {/* dot texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.16,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "9px 9px",
            }}
          />

          {/* sheen */}
          <div
            style={{
              position: "absolute",
              top: "-40%",
              left: "-10%",
              right: "-10%",
              height: "60%",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25), transparent)",
              opacity: 0.35,
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Logo row */}
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
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}
                >
                  Cash
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                •••• 1234
              </div>
            </div>

            {/* Balance */}
            <div
              style={{
                marginTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginBottom: 2,
                }}
              >
                Balance
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                ${displayBalance.toFixed(2)}
              </div>
            </div>

            {/* Mini stats row */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.35)",
                  padding: "0.4rem 0.6rem",
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    opacity: 0.75,
                    marginBottom: 2,
                  }}
                >
                  Next Transfer
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  ${nextTransferAmount.toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.35)",
                  padding: "0.4rem 0.6rem",
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    opacity: 0.75,
                    marginBottom: 2,
                  }}
                >
                  From
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {prankFromName}
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
                      color: "#111",
                    }}
                  >
                    {tx.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#6b7280",
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

        {/* Apple Pay-style overlay */}
        {paymentStatus !== "idle" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                borderRadius: 24,
                backgroundColor: "rgba(0,0,0,0.85)",
                padding: "1rem 1.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                rowGap: 8,
                boxShadow: "0 18px 45px rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {paymentStatus === "pending" ? (
                <div className="ap-spinner" />
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
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    ✓
                  </span>
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 4,
                }}
              >
                Apple Pay
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: paymentStatus === "pending" ? "#ffffff" : "#4ade80",
                }}
              >
                {paymentStatus === "pending" ? "Pending…" : "Done"}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  marginTop: 4,
                }}
              >
                Hold near reader to pay
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
