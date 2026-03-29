// components/WalletScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { Avatar } from "@/components/Avatar";
import type { PrankConfig, Transaction } from "@/lib/types";

// iOS system colors
const C = {
  label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.6)",
  bg: "#f2f2f7",
  white: "#ffffff",
  separator: "rgba(60,60,67,0.18)",
  blue: "#007aff",
  green: "#34c759",
  gray: "#8e8e93",
  gray3: "#c7c7cc",
  gray5: "#e5e5ea",
} as const;

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

const CONFIG_KEY = "applepayprank-config";
const WALLET_KEY = "applepayprank-wallet-v1";
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

const SEED_TXS: Transaction[] = [
  { id: "1", title: "Debit Card", subtitle: "Added to Balance \u00B7 42 minutes ago", amount: 45, direction: "in", timeLabel: "" },
  { id: "2", title: "Shanice", subtitle: "Sent \u00B7 Wednesday", amount: 35, direction: "out", timeLabel: "" },
  { id: "3", title: "+1 (914) 484-8324", subtitle: "Received \u00B7 12/02/25", amount: 10, direction: "in", timeLabel: "" },
  { id: "4", title: "Apple Store", subtitle: "Purchase \u00B7 Yesterday", amount: 4.99, direction: "out", timeLabel: "" },
  { id: "5", title: "Starbucks", subtitle: "Purchase \u00B7 2 days ago", amount: 6.45, direction: "out", timeLabel: "" },
];

type Phase = "hidden" | "pending" | "success";

function isSystemTx(t: string) {
  return t === "Debit Card" || t === "Apple Store" || t === "Starbucks" || /^[+0-9()\-\s]+$/.test(t);
}

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [balance, setBalance] = useState(BASE_BALANCE);
  const [txs, setTxs] = useState(SEED_TXS);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [amount, setAmount] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  function genAmount(c: PrankConfig) {
    if (c.amountMode === "fixed" && typeof c.fixedAmount === "number")
      return Number(c.fixedAmount.toFixed(2));
    const lo = c.minAmount ?? 10, hi = c.maxAmount ?? 50;
    return Number((Math.random() * (hi - lo) + lo).toFixed(2));
  }

  // Load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rc = localStorage.getItem(CONFIG_KEY);
      const cfg = rc ? { ...DEFAULT_CONFIG, ...JSON.parse(rc) } : { ...DEFAULT_CONFIG };
      setConfig(cfg);
      const rw = localStorage.getItem(WALLET_KEY);
      if (rw) {
        const p = JSON.parse(rw);
        if (p && typeof p.balance === "number" && Array.isArray(p.transactions)) {
          setBalance(p.balance); setTxs(p.transactions);
        } else { setBalance(cfg.startingBalance ?? BASE_BALANCE); setTxs(SEED_TXS); }
      } else { setBalance(cfg.startingBalance ?? BASE_BALANCE); setTxs(SEED_TXS); }
    } catch { setConfig(DEFAULT_CONFIG); setBalance(BASE_BALANCE); setTxs(SEED_TXS); }
    finally { setLoaded(true); }
  }, []);

  // Persist
  useEffect(() => {
    if (loaded) localStorage.setItem(WALLET_KEY, JSON.stringify({ balance, transactions: txs }));
  }, [balance, txs, loaded]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Handlers
  function onTxClick(tx: Transaction) {
    const isPurch = tx.title === "Apple Store" || tx.title === "Starbucks";
    const dir = isPurch ? "purchase" : tx.direction === "out" ? "out" : "in";
    let from = config.friendName || "Friend", to = config.pranksterName || "You";
    if (dir === "in") { from = tx.title || from; to = config.pranksterName || "You"; }
    else { from = config.pranksterName || "You"; to = tx.title || to; }
    router.push(`/transaction?${new URLSearchParams({ amount: tx.amount.toFixed(2), from, to, direction: dir })}`);
  }

  function onCardTap() {
    if (phase !== "hidden") return;
    prime();
    setAmount(genAmount(config));
    setPhase("pending");
  }

  function onOverlayTap() {
    if (phase !== "pending" || amount == null) return;
    const a = amount;
    play();
    setBalance(b => b + a);
    setTxs(prev => [{ id: `p-${Date.now()}`, title: config.friendName || "Friend", subtitle: "Received \u00B7 just now", amount: a, direction: "in" as const, timeLabel: "Just now", isPrank: true }, ...prev]);
    if (config.sendSms && config.victimPhone) {
      const msg = (config.smsTemplate || "You received {amount} from {friendName} via Apple Pay.")
        .replace("{amount}", `$${a.toFixed(2)}`).replace("{friendName}", config.friendName || "someone");
      fetch("/api/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: config.victimPhone, message: msg }) }).catch(() => {});
    }
    setPhase("success");
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setPhase("hidden"); setAmount(null); }, 3500);
  }

  const holder = config.pranksterName || "Cash";

  return (
    <main style={{ minHeight: "100vh", backgroundColor: C.bg, padding: "0 12px", paddingTop: "max(8px, env(safe-area-inset-top, 8px))", paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))", fontFamily: FONT }}>
      <div style={{ maxWidth: 430, margin: "0 auto" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, marginBottom: 6, position: "relative" }}>
          <button style={{ background: "none", border: "none", color: C.blue, fontSize: 17, fontWeight: 400, padding: 0, fontFamily: FONT }}>Done</button>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: C.label }}>{"\uF8FF"} Pay</span>
          </div>
          <button onClick={() => router.push("/info")} style={{ width: 28, height: 28, borderRadius: 999, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, backgroundColor: C.gray5, color: C.gray, padding: 0 }}>i</button>
        </header>

        {/* Card */}
        <section className="card-pressable" onClick={onCardTap} style={{ marginBottom: 16, background: "#000", borderRadius: 20, padding: "20px 22px 24px", color: "#fff", position: "relative", boxShadow: "0 12px 32px rgba(0,0,0,0.4)", overflow: "hidden", cursor: "pointer", height: 230 }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "8px 8px", pointerEvents: "none" }} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{"\uF8FF"}</span>
                <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: 0.5 }}>Cash</span>
              </div>
              <span style={{ fontSize: 13, letterSpacing: 2, color: "rgba(255,255,255,0.75)" }}>•••• 6767</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "2.1rem", fontWeight: 600 }}>${balance.toFixed(2)}</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Cardholder</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{holder}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <section style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 22 }}>
          {[{ l: "Send", i: "\u2191" }, { l: "Request", i: "\u2193" }, { l: "Add Money", i: "+" }].map(b => (
            <div key={b.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.gray5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 500, color: C.label }}>{b.i}</div>
              <span style={{ fontSize: 11, color: C.label }}>{b.l}</span>
            </div>
          ))}
        </section>

        {/* Transactions - classic light iOS */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, paddingLeft: 4, color: C.label }}>Latest Transactions</h2>
          <div style={{ borderRadius: 12, backgroundColor: C.white, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {txs.map((tx, i) => (
              <button key={tx.id} className="tx-row" onClick={() => onTxClick(tx)} style={{ display: "flex", alignItems: "center", width: "100%", padding: "12px 14px", border: "none", backgroundColor: C.white, textAlign: "left", cursor: "pointer", position: "relative", fontFamily: FONT }}>
                {i > 0 && <div style={{ position: "absolute", top: 0, left: 58, right: 0, height: 0.5, backgroundColor: C.separator }} />}

                {isSystemTx(tx.title) ? (
                  <div style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.gray5, color: C.gray, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginRight: 10, flexShrink: 0 }}>{"\u21C4"}</div>
                ) : (
                  <div style={{ marginRight: 10, flexShrink: 0 }}><Avatar name={tx.title} size={38} /></div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 400, color: C.label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>{tx.title}</div>
                  <div style={{ fontSize: 14, color: C.secondaryLabel }}>{tx.subtitle}</div>
                </div>

                <span style={{ fontSize: 16, fontWeight: 400, color: tx.direction === "in" ? C.green : C.label, marginLeft: 6, flexShrink: 0 }}>
                  {tx.direction === "in" ? "+" : "-"}${tx.amount.toFixed(2)}
                </span>
                <span style={{ marginLeft: 6, color: C.gray3, fontSize: 15, flexShrink: 0 }}>{"\u203A"}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ===== FULL-SCREEN OVERLAY ===== */}
        {phase !== "hidden" && (
          <div onClick={onOverlayTap} className="applepay-overlay-fade" style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: C.bg, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: FONT }}>

            {phase === "pending" && (
              <>
                {/* Mini card preview at top */}
                <div style={{ marginTop: "max(60px, env(safe-area-inset-top, 60px))", marginBottom: 12 }}>
                  <div style={{ width: 220, height: 140, borderRadius: 14, background: "#000", position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
                    <div style={{ position: "relative", padding: "12px 14px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", color: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 14 }}>{"\uF8FF"}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Cash</span>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>•••• 6767</div>
                    </div>
                  </div>
                </div>

                {/* Use Cash Back row */}
                <div style={{ backgroundColor: C.white, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 12, background: "#FFB800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>$</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.label }}>Use Cash Back</div>
                    <div style={{ fontSize: 12, color: C.secondaryLabel }}>Balance: ${balance.toFixed(2)}</div>
                  </div>
                </div>

                {/* Contactless icon */}
                <div className="contactless-pulse" style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,122,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M7.5 15.5C8.3 14.1 9.8 13 12 13s3.7 1.1 4.5 2.5" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 18C6.3 15.3 8.8 13.5 12 13.5s5.7 1.8 7 4.5" stroke={C.blue} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                    <path d="M2.5 20.5C4.3 16.5 7.8 14 12 14s7.7 2.5 9.5 6.5" stroke={C.blue} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                    <rect x="9" y="5" width="6" height="9" rx="1.5" stroke={C.blue} strokeWidth="1.8" fill="none" />
                  </svg>
                </div>

                <div style={{ fontSize: 20, fontWeight: 500, color: C.label, marginBottom: 6 }}>Hold Near Reader</div>
                <div style={{ fontSize: 14, color: C.secondaryLabel }}>Tap anywhere when ready</div>
              </>
            )}

            {phase === "success" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div className="applepay-check-circle" style={{ marginBottom: 16 }}>
                  <svg className="applepay-check-svg" viewBox="0 0 32 32">
                    <path className="applepay-check-path" d="M9 17 L14 22 L23 11" />
                  </svg>
                </div>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.green, marginBottom: 8 }}>Done</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: C.label, marginBottom: 6, letterSpacing: "-0.02em" }}>
                  ${amount != null ? amount.toFixed(2) : "0.00"}
                </div>
                <div style={{ fontSize: 16, color: C.secondaryLabel }}>
                  from {config.friendName || "Friend"}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
