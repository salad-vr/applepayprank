// components/WalletScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import type { PrankConfig, Transaction } from "@/lib/types";

const CONFIG_STORAGE_KEY = "applepayprank-config";
const WALLET_STORAGE_KEY = "applepayprank-wallet-v1";

const BASE_BALANCE = 105;

const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "You",
  friendName: "Apple Pay",
  amountMode: "fixed",
  fixedAmount: 67.0,
  minAmount: 10,
  maxAmount: 50,
  startingBalance: 105,
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Debit Card",
    subtitle: "Added to Balance • 42 minutes ago",
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

type OverlayPhase = "hidden" | "pending" | "accepting" | "success";

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");

  const [config, setConfig] = useState<PrankConfig>(DEFAULT_CONFIG);

  const [balance, setBalance] = useState<number>(BASE_BALANCE);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [walletLoaded, setWalletLoaded] = useState(false);

  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const confirmTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  // ---- helpers ----

  function generatePrankAmount(cfg: PrankConfig): number {
    if (cfg.amountMode === "fixed" && typeof cfg.fixedAmount === "number") {
      return Number(cfg.fixedAmount.toFixed(2));
    }

    const min = typeof cfg.minAmount === "number" ? cfg.minAmount : 10;
    const max = typeof cfg.maxAmount === "number" ? cfg.maxAmount : 50;
    const raw = Math.random() * (max - min) + min;
    return Number(raw.toFixed(2));
  }

  function persistWalletState(nextBalance: number, nextTransactions: Transaction[]) {
    if (typeof window === "undefined") return;
    const payload = {
      balance: nextBalance,
      transactions: nextTransactions,
    };
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(payload));
  }

  // ---- load config + wallet on mount ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Load config
      const rawConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      let resolvedConfig: PrankConfig = DEFAULT_CONFIG;

      if (rawConfig) {
        const parsed: Partial<PrankConfig> = JSON.parse(rawConfig);
        resolvedConfig = { ...DEFAULT_CONFIG, ...parsed };
      }

      setConfig(resolvedConfig);

      // Load wallet
      const rawWallet = window.localStorage.getItem(WALLET_STORAGE_KEY);
      if (rawWallet) {
        const parsed = JSON.parse(rawWallet);
        if (
          parsed &&
          typeof parsed.balance === "number" &&
          Array.isArray(parsed.transactions)
        ) {
          setBalance(parsed.balance);
          setTransactions(parsed.transactions);
        } else {
          const start =
            typeof resolvedConfig.startingBalance === "number"
              ? resolvedConfig.startingBalance
              : BASE_BALANCE;
          setBalance(start);
          setTransactions(INITIAL_TRANSACTIONS);
        }
      } else {
        const start =
          typeof resolvedConfig.startingBalance === "number"
            ? resolvedConfig.startingBalance
            : BASE_BALANCE;
        setBalance(start);
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } catch (err) {
      console.warn("[wallet] failed to load state", err);
      setConfig(DEFAULT_CONFIG);
      setBalance(DEFAULT_CONFIG.startingBalance ?? BASE_BALANCE);
      setTransactions(INITIAL_TRANSACTIONS);
    } finally {
      setWalletLoaded(true);
    }
  }, []);

  // ---- persist when balance/transactions change ----
  useEffect(() => {
    if (!walletLoaded) return;
    persistWalletState(balance, transactions);
  }, [balance, transactions, walletLoaded]);

  // ---- cleanup timeouts on unmount ----
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current != null) {
        window.clearTimeout(confirmTimeoutRef.current);
      }
      if (hideTimeoutRef.current != null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // ---- handlers ----

  function handleTransactionClick(tx: Transaction) {
  // Only the prank transaction should open the details page
  if (!tx.isPrank) return;

  const params = new URLSearchParams({
    // Use the actual amount stored on the transaction
    amount: tx.amount.toFixed(2),

    // Use the transaction title (what the row shows) as the "from" value
    from: tx.title || config.friendName || "Sender",

    // Use whatever the current cardholder name is as the "to" value
    to: config.pranksterName || "You",
  });

  router.push(`/transaction?${params.toString()}`);
}


  // Tap the card → show pending popup and lock in an amount
  function handleCardClick() {
    if (overlayPhase !== "hidden") return;

    prime();

    const amount = generatePrankAmount(config);
    setPendingAmount(amount);
    setOverlayPhase("pending");
  }

  // Tap anywhere on overlay while pending → trigger sound + success
  function handleOverlayTap() {
    if (overlayPhase !== "pending" || pendingAmount == null) return;

    setOverlayPhase("accepting");

    // 1) after ~1s, play sound, show success, and commit wallet changes
    confirmTimeoutRef.current = window.setTimeout(() => {
      play();
      const amount = pendingAmount;

      setOverlayPhase("success");
      setBalance(prev => prev + amount);

      setTransactions(prev => {
        const prankTx: Transaction = {
          id: `prank-${Date.now()}`,
          title: config.friendName || "Friend",
          subtitle: `Received • just now`,
          amount,
          direction: "in",
          timeLabel: "Just now",
          isPrank: true,
        };
        return [prankTx, ...prev];
      });

      // 2) hide overlay after a bit
      hideTimeoutRef.current = window.setTimeout(() => {
        setOverlayPhase("hidden");
        setPendingAmount(null);
      }, 1800);
    }, 1000);
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
      <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
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
                ${balance.toFixed(2)}
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

        {/* Apple Pay overlay */}
        {overlayPhase !== "hidden" && (
          <div
            onClick={handleOverlayTap}
            className="applepay-overlay-fade"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "min(380px, 100% - 40px)",
                borderRadius: 24,
                backgroundColor: "#fff",
                boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
                padding: "24px 28px 28px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 18,
                }}
              >
                <span style={{ fontSize: 22 }}>{"\uF8FF"}</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: 0.4,
                    color: "#111827",
                  }}
                >
                  Pay
                </span>
              </div>

              {overlayPhase === "pending" && (
                <>
                  <div className="applepay-spinner" style={{ margin: "0 auto 18px" }} />
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: "#111827",
                    }}
                  >
                    Verifying…
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#4b5563",
                    }}
                  >
                    Please wait
                  </div>
                </>
              )}

              {overlayPhase === "success" && (
                <>
                  <div className="applepay-check-circle" style={{ margin: "0 auto 18px" }}>
                    <span>✓</span>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#1fb152",
                      marginBottom: 4,
                    }}
                  >
                    Payment Received
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      marginBottom: 2,
                      color: "#111827",
                    }}
                  >
                    ${pendingAmount != null ? pendingAmount.toFixed(2) : "0.00"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    from {config.friendName || "Friend"}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
