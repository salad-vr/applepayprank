// components/WalletScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { Avatar } from "@/components/Avatar";
import type { PrankConfig, Transaction } from "@/lib/types";

const C = {
  label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.6)",
  bg: "#f2f2f7",
  cardBg: "#ffffff",
  separator: "rgba(60,60,67,0.29)",
  blue: "#007aff",
  green: "#34c759",
  gray: "#8e8e93",
  gray3: "#c7c7cc",
  gray5: "#e5e5ea",
} as const;

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

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
  { id: "1", title: "Debit Card", subtitle: "Added to Balance \u00B7 42 minutes ago", amount: 45, direction: "in", timeLabel: "" },
  { id: "2", title: "Shanice", subtitle: "Sent \u00B7 Wednesday", amount: 35, direction: "out", timeLabel: "" },
  { id: "3", title: "+1 (914) 484-8324", subtitle: "Received \u00B7 12/02/25", amount: 10, direction: "in", timeLabel: "" },
  { id: "4", title: "Apple Store", subtitle: "Purchase \u00B7 Yesterday", amount: 4.99, direction: "out", timeLabel: "" },
  { id: "5", title: "Starbucks", subtitle: "Purchase \u00B7 2 days ago", amount: 6.45, direction: "out", timeLabel: "" },
];

type OverlayPhase = "hidden" | "pending" | "success";

function isSystemTx(title: string): boolean {
  return title === "Debit Card" || title === "Apple Store" || title === "Starbucks" || /^[+0-9()\-\s]+$/.test(title);
}

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");

  const [config, setConfig] = useState<PrankConfig>(DEFAULT_CONFIG);
  const [balance, setBalance] = useState<number>(BASE_BALANCE);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [overlayPhase, setOverlayPhase] = useState<OverlayPhase>("hidden");
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  function generatePrankAmount(cfg: PrankConfig): number {
    if (cfg.amountMode === "fixed" && typeof cfg.fixedAmount === "number")
      return Number(cfg.fixedAmount.toFixed(2));
    const min = typeof cfg.minAmount === "number" ? cfg.minAmount : 10;
    const max = typeof cfg.maxAmount === "number" ? cfg.maxAmount : 50;
    return Number((Math.random() * (max - min) + min).toFixed(2));
  }

  function persistWallet(b: number, t: Transaction[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ balance: b, transactions: t }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawCfg = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      let resolved: PrankConfig = { ...DEFAULT_CONFIG };
      if (rawCfg) resolved = { ...DEFAULT_CONFIG, ...JSON.parse(rawCfg) };
      setConfig(resolved);

      const rawW = window.localStorage.getItem(WALLET_STORAGE_KEY);
      if (rawW) {
        const p = JSON.parse(rawW);
        if (p && typeof p.balance === "number" && Array.isArray(p.transactions)) {
          setBalance(p.balance);
          setTransactions(p.transactions);
        } else {
          setBalance(resolved.startingBalance ?? BASE_BALANCE);
          setTransactions(INITIAL_TRANSACTIONS);
        }
      } else {
        setBalance(resolved.startingBalance ?? BASE_BALANCE);
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } catch {
      setConfig(DEFAULT_CONFIG);
      setBalance(DEFAULT_CONFIG.startingBalance ?? BASE_BALANCE);
      setTransactions(INITIAL_TRANSACTIONS);
    } finally {
      setWalletLoaded(true);
    }
  }, []);

  useEffect(() => { if (walletLoaded) persistWallet(balance, transactions); }, [balance, transactions, walletLoaded]);
  useEffect(() => { return () => { if (hideTimeoutRef.current != null) clearTimeout(hideTimeoutRef.current); }; }, []);

  function handleTxClick(tx: Transaction) {
    const isPurchase = tx.title === "Apple Store" || tx.title === "Starbucks";
    const dir = isPurchase ? "purchase" : tx.direction === "out" ? "out" : "in";
    let from = config.friendName || "Friend", to = config.pranksterName || "You";
    if (dir === "in") { from = tx.title || from; to = config.pranksterName || "You"; }
    else { from = config.pranksterName || "You"; to = tx.title || to; }
    router.push(`/transaction?${new URLSearchParams({ amount: tx.amount.toFixed(2), from, to, direction: dir }).toString()}`);
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

    play();

    setBalance((prev) => prev + amount);
    setTransactions((prev) => [{
      id: `prank-${Date.now()}`, title: config.friendName || "Friend",
      subtitle: "Received \u00B7 just now", amount, direction: "in" as const,
      timeLabel: "Just now", isPrank: true,
    }, ...prev]);

    if (config.sendSms && config.victimPhone) {
      const tmpl = config.smsTemplate || "You received {amount} from {friendName} via Apple Pay.";
      const msg = tmpl.replace("{amount}", `$${amount.toFixed(2)}`).replace("{friendName}", config.friendName || "someone");
      fetch("/api/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: config.victimPhone, message: msg }) }).catch(() => {});
    }

    setOverlayPhase("success");
    if (hideTimeoutRef.current != null) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => { setOverlayPhase("hidden"); setPendingAmount(null); }, 3500);
  }

  const cardHolderName = config.pranksterName || "Cash";
  const spinnerBlades = Array.from({ length: 12 }, (_, i) => <div key={i} className="ios-spinner-blade" />);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: C.bg, padding: "0 16px", paddingTop: "max(8px, env(safe-area-inset-top, 8px))", paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))", fontFamily: FONT }}>
      <div style={{ maxWidth: 430, margin: "0 auto", position: "relative" }}>

        {/* ===== Header ===== */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, position: "relative", height: 44 }}>
          <button style={{ background: "none", border: "none", color: C.blue, fontSize: 17, fontWeight: 400, padding: 0, cursor: "pointer", fontFamily: FONT }}>
            Done
          </button>
          <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: C.label, letterSpacing: "-0.02em" }}>
              {"\uF8FF"} Pay
            </span>
          </div>
          <button onClick={() => router.push("/info")} style={{ width: 28, height: 28, borderRadius: 999, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, backgroundColor: C.gray5, color: C.gray, padding: 0, cursor: "pointer" }}>
            i
          </button>
        </header>

        {/* ===== Cash Card ===== */}
        <section
          className="card-pressable"
          onClick={handleCardClick}
          style={{
            marginBottom: 16,
            background: "#000000",
            borderRadius: 16,
            padding: "18px 20px 20px",
            color: "#fff",
            position: "relative",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            overflow: "hidden",
            cursor: "pointer",
            width: "100%",
            height: 200,
          }}
        >
          {/* Dot pattern */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "7px 7px", pointerEvents: "none" }} />

          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 20 }}>{"\uF8FF"}</span>
                <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>Cash</span>
              </div>
              <div style={{ fontSize: 13, letterSpacing: 1.5, color: "rgba(255,255,255,0.65)" }}>
                •••• 6767
              </div>
            </div>
            {/* Bottom row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: 0.3 }}>
                ${balance.toFixed(2)}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>
                  Cardholder
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{cardHolderName}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Action Buttons ===== */}
        <section style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 20 }}>
          {[
            { label: "Send", icon: "\u2191" },
            { label: "Request", icon: "\u2193" },
            { label: "Add Money", icon: "+" },
          ].map((btn) => (
            <div key={btn.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.gray5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 500, color: C.label }}>
                {btn.icon}
              </div>
              <span style={{ fontSize: 11, color: C.label, fontWeight: 400 }}>{btn.label}</span>
            </div>
          ))}
        </section>

        {/* ===== Transactions ===== */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, paddingLeft: 4, color: C.label, letterSpacing: "-0.02em" }}>
            Latest Transactions
          </h2>

          <div className="glass-panel" style={{ borderRadius: 14, overflow: "hidden" }}>
            {transactions.map((tx, index) => (
              <button
                key={tx.id}
                className="tx-row"
                onClick={() => handleTxClick(tx)}
                style={{ display: "flex", alignItems: "center", width: "100%", padding: "11px 14px", border: "none", background: "transparent", textAlign: "left", cursor: "pointer", position: "relative", fontFamily: FONT }}
              >
                {index > 0 && (
                  <div style={{ position: "absolute", top: 0, left: 58, right: 0, height: 0.5, backgroundColor: C.separator }} />
                )}

                {isSystemTx(tx.title) ? (
                  <div style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.gray5, color: C.gray, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 10, flexShrink: 0 }}>
                    {"\u21C4"}
                  </div>
                ) : (
                  <div style={{ marginRight: 10, flexShrink: 0 }}>
                    <Avatar name={tx.title} size={38} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 400, marginBottom: 1, color: C.label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tx.title}
                  </div>
                  <div style={{ fontSize: 14, color: C.secondaryLabel }}>
                    {tx.subtitle}
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 400, color: tx.direction === "in" ? C.green : C.label, marginLeft: 6, flexShrink: 0 }}>
                  {tx.direction === "in" ? "+" : "-"}${tx.amount.toFixed(2)}
                </div>

                <div style={{ marginLeft: 6, color: C.gray3, fontSize: 14, fontWeight: 500, flexShrink: 0 }}>
                  {"\u203A"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ===== Payment Overlay (centered) ===== */}
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
              backgroundColor: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div
              className="applepay-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(340px, calc(100% - 48px))",
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.92)",
                backdropFilter: "saturate(180%) blur(20px)",
                WebkitBackdropFilter: "saturate(180%) blur(20px)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                padding: "28px 24px 24px",
                textAlign: "center",
              }}
            >
              {/* Apple Pay header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 22, color: C.label }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{"\uF8FF"}</span>
                <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: 0.25 }}>Pay</span>
              </div>

              {overlayPhase === "pending" && (
                <>
                  <div className="ios-spinner" style={{ margin: "0 auto 20px" }}>
                    {spinnerBlades}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 4, color: C.label }}>
                    Authorizing...
                  </div>
                  <div style={{ fontSize: 14, color: C.secondaryLabel }}>
                    Please wait
                  </div>
                </>
              )}

              {overlayPhase === "success" && (
                <div onClick={handleOverlayTap} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <Avatar name={config.friendName || "Friend"} size={52} />
                  </div>

                  <div className="applepay-check-circle" style={{ margin: "0 auto 14px" }}>
                    <svg className="applepay-check-svg" viewBox="0 0 32 32">
                      <path className="applepay-check-path" d="M9 17 L14 22 L23 11" />
                    </svg>
                  </div>

                  <div style={{ fontSize: 17, fontWeight: 600, color: C.green, marginBottom: 6 }}>
                    Done
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4, color: C.label, letterSpacing: "-0.02em" }}>
                    ${pendingAmount != null ? pendingAmount.toFixed(2) : "0.00"}
                  </div>
                  <div style={{ fontSize: 15, color: C.secondaryLabel }}>
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
