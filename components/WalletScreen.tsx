// components/WalletScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { useHaptic } from "@/lib/useHaptic";
import { Avatar } from "@/components/Avatar";
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
    subtitle: "Added to Balance \u00B7 42 minutes ago",
    amount: 45,
    direction: "in",
    timeLabel: "",
  },
  {
    id: "2",
    title: "Shanice",
    subtitle: "Sent \u00B7 Wednesday",
    amount: 35,
    direction: "out",
    timeLabel: "",
  },
  {
    id: "3",
    title: "+1 (914) 484-8324",
    subtitle: "Received \u00B7 12/02/25",
    amount: 10,
    direction: "in",
    timeLabel: "",
  },
  {
    id: "4",
    title: "Apple Store",
    subtitle: "Purchase \u00B7 Yesterday",
    amount: 4.99,
    direction: "out",
    timeLabel: "",
  },
  {
    id: "5",
    title: "Starbucks",
    subtitle: "Purchase \u00B7 2 days ago",
    amount: 6.45,
    direction: "out",
    timeLabel: "",
  },
];

type OverlayPhase = "hidden" | "pending" | "success";

// Determine if a transaction is a system/bank transfer (not a person)
function isSystemTx(title: string): boolean {
  const isDebit = title === "Debit Card";
  const looksLikePhone = /^[+0-9()\-\s]+$/.test(title);
  const isMerchant = title === "Apple Store" || title === "Starbucks";
  return isDebit || looksLikePhone || isMerchant;
}

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");
  const { vibrate } = useHaptic();

  const [config, setConfig] = useState<PrankConfig>(DEFAULT_CONFIG);

  const [balance, setBalance] = useState<number>(BASE_BALANCE);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [walletLoaded, setWalletLoaded] = useState(false);

  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

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

  function persistWalletState(
    nextBalance: number,
    nextTransactions: Transaction[]
  ) {
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
      const rawConfig = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      let resolvedConfig: PrankConfig = { ...DEFAULT_CONFIG };

      if (rawConfig) {
        const parsed: Partial<PrankConfig> = JSON.parse(rawConfig);
        resolvedConfig = { ...DEFAULT_CONFIG, ...parsed };
      }

      setConfig(resolvedConfig);

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
      if (hideTimeoutRef.current != null) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // ---- handlers ----

  function handleTransactionClick(tx: Transaction) {
    const isPurchase =
      tx.title === "Apple Store" || tx.title === "Starbucks";

    const directionParam = isPurchase
      ? "purchase"
      : tx.direction === "out"
      ? "out"
      : "in";

    let from = config.friendName || "Friend";
    let to = config.pranksterName || "You";

    if (directionParam === "in") {
      from = tx.title || from;
      to = config.pranksterName || "You";
    } else {
      from = config.pranksterName || "You";
      to = tx.title || to;
    }

    const params = new URLSearchParams({
      amount: tx.amount.toFixed(2),
      from,
      to,
      direction: directionParam,
    });

    router.push(`/transaction?${params.toString()}`);
  }

  function handleCardClick() {
    if (overlayPhase !== "hidden") return;
    prime();

    const amount = generatePrankAmount(config);
    setPendingAmount(amount);
    setOverlayPhase("pending");
  }

  function handleOverlayTap() {
    if (overlayPhase !== "pending" || pendingAmount == null) return;

    const amount = pendingAmount;

    // Sound + haptics in the same user gesture
    play();
    vibrate();

    // Commit wallet updates
    setBalance((prev) => prev + amount);
    setTransactions((prev) => {
      const prankTx: Transaction = {
        id: `prank-${Date.now()}`,
        title: config.friendName || "Friend",
        subtitle: `Received \u00B7 just now`,
        amount,
        direction: "in",
        timeLabel: "Just now",
        isPrank: true,
      };
      return [prankTx, ...prev];
    });

    // Send SMS if configured
    if (config.sendSms && config.victimPhone) {
      const template =
        config.smsTemplate || "You received ${amount} from {friendName} via Apple Pay.";
      const message = template
        .replace("{amount}", `$${amount.toFixed(2)}`)
        .replace("{friendName}", config.friendName || "someone");

      fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: config.victimPhone, message }),
      }).catch(() => {
        // fire-and-forget
      });
    }

    setOverlayPhase("success");

    if (hideTimeoutRef.current != null) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setOverlayPhase("hidden");
      setPendingAmount(null);
    }, 3500);
  }

  function handleInfoClick() {
    router.push("/info");
  }

  const cardHolderName = config.pranksterName || "Cash";

  // ---- iOS Spinner (12 blades) ----
  const spinnerBlades = Array.from({ length: 12 }, (_, i) => (
    <div key={i} className="ios-spinner-blade" />
  ));

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
      <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
        {/* ===== Header ===== */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            position: "relative",
            height: 44,
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--ios-system-blue)",
              fontSize: 17,
              fontWeight: 400,
              padding: 0,
              cursor: "pointer",
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
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ios-label)",
                letterSpacing: "-0.02em",
              }}
            >
              {"\uF8FF"} Pay
            </span>
          </div>

          <button
            onClick={handleInfoClick}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "var(--ios-system-gray5)",
              color: "var(--ios-system-gray)",
              padding: 0,
              cursor: "pointer",
            }}
          >
            i
          </button>
        </header>

        {/* ===== Cash Card ===== */}
        <section
          className="card-pressable"
          onClick={handleCardClick}
          style={{
            marginTop: 8,
            marginBottom: 20,
            background: "#000000",
            borderRadius: 20,
            padding: "20px 22px 24px",
            color: "#fff",
            position: "relative",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            overflow: "hidden",
            cursor: "pointer",
            width: "100%",
            aspectRatio: "1.586 / 1",
            minHeight: 190,
          }}
        >
          {/* Dot pattern overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
              backgroundSize: "7px 7px",
              pointerEvents: "none",
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
            {/* Top row: Apple Cash + card number */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 22 }}>{"\uF8FF"}</span>
                <span
                  style={{ fontSize: 20, fontWeight: 600, letterSpacing: 0.5 }}
                >
                  Cash
                </span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                •••• 6767
              </div>
            </div>

            {/* Bottom row: Balance + cardholder */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                ${balance.toFixed(2)}
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 2,
                  }}
                >
                  Cardholder
                </div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {cardHolderName}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Action Buttons (Send / Request / Add Money) ===== */}
        <section
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Send", icon: "\u2191" },
            { label: "Request", icon: "\u2193" },
            { label: "Add Money", icon: "+" },
          ].map((btn) => (
            <div
              key={btn.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "var(--ios-system-gray5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--ios-label)",
                }}
              >
                {btn.icon}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ios-label)",
                  fontWeight: 400,
                }}
              >
                {btn.label}
              </span>
            </div>
          ))}
        </section>

        {/* ===== Transactions ===== */}
        <section>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 8,
              paddingLeft: 4,
              color: "var(--ios-label)",
              letterSpacing: "-0.02em",
            }}
          >
            Latest Transactions
          </h2>

          <div
            style={{
              borderRadius: 10,
              backgroundColor: "var(--ios-secondary-grouped-background)",
              overflow: "hidden",
            }}
          >
            {transactions.map((tx, index) => (
              <button
                key={tx.id}
                className="tx-row"
                onClick={() => handleTransactionClick(tx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  backgroundColor: "var(--ios-secondary-grouped-background)",
                  textAlign: "left",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {/* Separator (indented past icon) */}
                {index > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 60,
                      right: 0,
                      height: 0.5,
                      backgroundColor: "var(--ios-separator)",
                    }}
                  />
                )}

                {/* Icon / Avatar */}
                {isSystemTx(tx.title) ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "var(--ios-system-gray5)",
                      color: "var(--ios-system-gray)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      marginRight: 12,
                      flexShrink: 0,
                    }}
                  >
                    {"\u21C4"}
                  </div>
                ) : (
                  <div style={{ marginRight: 12, flexShrink: 0 }}>
                    <Avatar name={tx.title} size={40} />
                  </div>
                )}

                {/* Title + Subtitle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 400,
                      marginBottom: 1,
                      color: "var(--ios-label)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.title}
                  </div>

                  <div
                    style={{
                      fontSize: 15,
                      color: "var(--ios-secondary-label)",
                    }}
                  >
                    {tx.subtitle}
                  </div>
                </div>

                {/* Amount */}
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 400,
                    color:
                      tx.direction === "in"
                        ? "var(--ios-system-green)"
                        : "var(--ios-label)",
                    marginLeft: 8,
                    flexShrink: 0,
                  }}
                >
                  {tx.direction === "in" ? "+" : "-"}${tx.amount.toFixed(2)}
                </div>

                {/* Chevron */}
                <div
                  style={{
                    marginLeft: 8,
                    color: "var(--ios-system-gray3)",
                    fontSize: 14,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {"\u203A"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Apple Pay Bottom Sheet Overlay ===== */}
        {overlayPhase !== "hidden" && (
          <div
            onClick={handleOverlayTap}
            className="applepay-overlay-fade"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div
              className="applepay-sheet"
              style={{
                width: "100%",
                maxWidth: 480,
                margin: "0 auto",
                borderRadius: "10px 10px 0 0",
                backgroundColor: "#fff",
                boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
                paddingTop: 6,
                paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
                textAlign: "center",
              }}
            >
              {/* Grabber handle */}
              <div
                style={{
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "var(--ios-system-gray3)",
                  margin: "0 auto 18px",
                }}
              />

              {/* Apple Pay header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 20,
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

              {overlayPhase === "pending" && (
                <div style={{ padding: "0 28px 20px" }}>
                  <div className="ios-spinner" style={{ margin: "0 auto 18px" }}>
                    {spinnerBlades}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 400,
                      marginBottom: 4,
                      color: "var(--ios-label)",
                    }}
                  >
                    Authorizing...
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "var(--ios-secondary-label)",
                    }}
                  >
                    Please wait
                  </div>
                </div>
              )}

              {overlayPhase === "success" && (
                <div style={{ padding: "0 28px 20px" }}>
                  {/* Avatar */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Avatar name={config.friendName || "Friend"} size={48} />
                  </div>

                  {/* Checkmark */}
                  <div
                    className="applepay-check-circle"
                    style={{ margin: "0 auto 16px" }}
                  >
                    <svg className="applepay-check-svg" viewBox="0 0 32 32">
                      <path
                        className="applepay-check-path"
                        d="M9 17 L14 22 L23 11"
                      />
                    </svg>
                  </div>

                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: "var(--ios-system-green)",
                      marginBottom: 4,
                    }}
                  >
                    Done
                  </div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 700,
                      marginBottom: 4,
                      color: "var(--ios-label)",
                    }}
                  >
                    ${pendingAmount != null ? pendingAmount.toFixed(2) : "0.00"}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "var(--ios-secondary-label)",
                    }}
                  >
                    from {config.friendName || "Friend"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
