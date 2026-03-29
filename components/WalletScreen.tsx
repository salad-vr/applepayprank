// components/WalletScreen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "@/lib/useSound";
import { useHaptic } from "@/lib/useHaptic";
import { Avatar } from "@/components/Avatar";
import { WelcomeModal } from "@/components/WelcomeModal";
import type { PrankConfig, Transaction } from "@/lib/types";

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

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';
const CONFIG_KEY = "applepayprank-config";
const WALLET_KEY = "applepayprank-wallet-v1";
const WELCOME_KEY = "applepayprank-welcomed";
const BASE_BALANCE = 145.67;

const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "John Doe",
  friendName: "Jane Doe",
  amountMode: "fixed",
  fixedAmount: 25.0,
  minAmount: 10,
  maxAmount: 50,
  startingBalance: 145.67,
  sendSms: false,
  victimPhone: "",
  smsTemplate: "",
};

const SEED_TXS: Transaction[] = [
  { id: "1", title: "Debit Card", subtitle: "Added to Balance \u00B7 42 minutes ago", amount: 45, direction: "in", timeLabel: "" },
  { id: "2", title: "Shanice", subtitle: "Sent \u00B7 Wednesday", amount: 35, direction: "out", timeLabel: "" },
  { id: "3", title: "+1 (914) 484-8324", subtitle: "Received \u00B7 12/02/25", amount: 10, direction: "in", timeLabel: "" },
  { id: "4", title: "Apple Store", subtitle: "Purchase \u00B7 Yesterday", amount: 4.99, direction: "out", timeLabel: "" },
  { id: "5", title: "Starbucks", subtitle: "Purchase \u00B7 2 days ago", amount: 6.45, direction: "out", timeLabel: "" },
];

type Phase = "hidden" | "pending" | "success" | "settling";

function isSystemTx(t: string) {
  return t === "Debit Card" || t === "Apple Store" || t === "Starbucks" || /^[+0-9()\-\s]+$/.test(t);
}

function ContactlessIcon({ color = "#007aff", size = 44 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="7" y="2" width="18" height="28" rx="3.5" stroke={color} strokeWidth="1.8" />
      <line x1="13.5" y1="5.5" x2="18.5" y2="5.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function WalletScreen() {
  const router = useRouter();
  const { play, prime } = useSound("/ding.mp3");
  const { vibrate } = useHaptic();

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [balance, setBalance] = useState(BASE_BALANCE);
  const [txs, setTxs] = useState(SEED_TXS);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [amount, setAmount] = useState<number | null>(null);
  const [smsToast, setSmsToast] = useState<{ message: string; success: boolean } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  // Controls whether the wallet sections (buttons + tx list) are rendered/visible
  // "visible" = fully shown, "exiting" = playing exit anim, "hidden" = unmounted
  const [sectionsState, setSectionsState] = useState<"visible" | "exiting" | "hidden">("visible");
  const [sectionsKey, setSectionsKey] = useState(0);
  const timer = useRef<number | null>(null);
  const sectionsTimer = useRef<number | null>(null);
  const smsToastTimer = useRef<number | null>(null);

  function genAmount(c: PrankConfig) {
    if (c.amountMode === "fixed" && typeof c.fixedAmount === "number") return Number(c.fixedAmount.toFixed(2));
    const lo = c.minAmount ?? 10, hi = c.maxAmount ?? 50;
    return Number((Math.random() * (hi - lo) + lo).toFixed(2));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rc = localStorage.getItem(CONFIG_KEY);
      const cfg = rc ? { ...DEFAULT_CONFIG, ...JSON.parse(rc) } : { ...DEFAULT_CONFIG };
      setConfig(cfg);
      const rw = localStorage.getItem(WALLET_KEY);
      if (rw) {
        const p = JSON.parse(rw);
        if (p && typeof p.balance === "number" && Array.isArray(p.transactions)) { setBalance(p.balance); setTxs(p.transactions); }
        else { setBalance(cfg.startingBalance ?? BASE_BALANCE); setTxs(SEED_TXS); }
      } else { setBalance(cfg.startingBalance ?? BASE_BALANCE); setTxs(SEED_TXS); }
    } catch { setConfig(DEFAULT_CONFIG); setBalance(BASE_BALANCE); setTxs(SEED_TXS); }
    finally {
      setLoaded(true);
      if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true);
    }
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem(WALLET_KEY, JSON.stringify({ balance, transactions: txs })); }, [balance, txs, loaded]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (smsToastTimer.current) clearTimeout(smsToastTimer.current);
    if (sectionsTimer.current) clearTimeout(sectionsTimer.current);
  }, []);

  function showSmsToast(message: string, success: boolean) {
    setSmsToast({ message, success });
    if (smsToastTimer.current) clearTimeout(smsToastTimer.current);
    smsToastTimer.current = window.setTimeout(() => setSmsToast(null), 3500);
  }

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
    vibrate("tick");
    setAmount(genAmount(config));
    // Animate sections out first, then show pending overlay
    setSectionsState("exiting");
    if (sectionsTimer.current) clearTimeout(sectionsTimer.current);
    sectionsTimer.current = window.setTimeout(() => {
      setSectionsState("hidden");
      setPhase("pending");
    }, 220);
  }

  function onOverlayTap() {
    if (phase !== "pending" || amount == null) return;
    const a = amount;
    // Immediately flip to success — the circle stays, icon morphs inside it
    setPhase("success");
    play();
    vibrate("success");
    setBalance(b => b + a);
    setTxs(prev => [{ id: `p-${Date.now()}`, title: config.friendName || "Friend", subtitle: "Received \u00B7 just now", amount: a, direction: "in" as const, timeLabel: "Just now", isPrank: true }, ...prev]);

    // Send SMS via Vonage
    if (config.sendSms && config.victimPhone) {
      const msg = (config.smsTemplate || "{amount} has been deposited from your account to {name}.\n\n\n\n\n-")
        .replace("{amount}", `$${a.toFixed(2)}`)
        .replace("{name}", config.pranksterName || "someone")
        .replace("{friendName}", config.friendName || "someone");

      fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: config.victimPhone,
          message: msg,
          code: "SALAAR",
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success) {
            showSmsToast("Text sent!", true);
          } else {
            showSmsToast(data?.error || "Text failed to send", false);
          }
        })
        .catch(() => {
          showSmsToast("Network error sending text", false);
        });
    }

    if (timer.current) clearTimeout(timer.current);
    // Show confirmed state for 2s, then settle into the transaction list
    timer.current = window.setTimeout(() => {
      setPhase("settling");
      setSectionsKey(k => k + 1);
      setSectionsState("visible");
      // After settle animation completes, go fully hidden
      timer.current = window.setTimeout(() => {
        setPhase("hidden");
        setAmount(null);
      }, 700);
    }, 2200);
  }

  const holder = config.pranksterName || "Cash";
  const isOverlay = phase === "pending" || phase === "success";
  const isActive = phase === "pending" || phase === "success";

  return (
    <main
      onClick={isOverlay ? onOverlayTap : undefined}
      style={{
        minHeight: "100vh",
        backgroundColor: C.bg,
        padding: "0 16px",
        paddingTop: "max(8px, env(safe-area-inset-top, 8px))",
        paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 430, margin: "0 auto", position: "relative" }}>

        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, marginBottom: 6, position: "relative" }}>
          <button style={{ background: "none", border: "none", color: C.blue, fontSize: 17, fontWeight: 400, padding: 0, fontFamily: FONT }}>Done</button>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: C.label }}>{"\uF8FF"} Pay</span>
          </div>
          <button onClick={() => router.push("/info")} style={{ width: 28, height: 28, borderRadius: 999, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, backgroundColor: C.gray5, color: C.gray, padding: 0 }}>i</button>
        </header>

        <section
          className="card-pressable"
          onClick={phase === "hidden" ? onCardTap : undefined}
          style={{
            marginBottom: 16,
            background: "#000",
            borderRadius: 20,
            padding: "20px 22px 24px",
            color: "#fff",
            position: "relative",
            boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
            overflow: "hidden",
            cursor: phase === "hidden" ? "pointer" : "default",
            height: 232,
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 0.18, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)", backgroundSize: "8px 8px", pointerEvents: "none" }} />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{"\uF8FF"}</span>
                <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 0.5 }}>Cash</span>
              </div>
              <span style={{ fontSize: 13, letterSpacing: 2, color: "rgba(255,255,255,0.7)" }}>•••• 6767</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontSize: "2rem", fontWeight: 600 }}>${balance.toFixed(2)}</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>Cardholder</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{holder}</div>
              </div>
            </div>
          </div>
        </section>

        {sectionsState !== "hidden" && (
          <div key={sectionsKey} className={sectionsState === "exiting" ? "wallet-sections-exit" : sectionsKey > 0 ? "wallet-sections-enter" : undefined}>
            <section style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 22 }}>
              {[{ l: "Send", i: "\u2191" }, { l: "Request", i: "\u2193" }, { l: "Add Money", i: "+" }].map(b => (
                <div key={b.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.gray5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 500, color: C.label }}>{b.i}</div>
                  <span style={{ fontSize: 11, color: C.label }}>{b.l}</span>
                </div>
              ))}
            </section>

            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, paddingLeft: 4, color: C.label }}>Latest Transactions</h2>
              <div style={{ borderRadius: 12, backgroundColor: C.white, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                {txs.map((tx, i) => {
                  const isSettleRow = phase === "settling" && i === 0;
                  return (
                    <button key={tx.id} className={`tx-row${isSettleRow ? " tx-row-settle" : ""}`} onClick={() => onTxClick(tx)} style={{ display: "flex", alignItems: "center", width: "100%", padding: "12px 14px", border: "none", backgroundColor: C.white, textAlign: "left", cursor: "pointer", position: "relative", fontFamily: FONT, borderRadius: isSettleRow ? "12px 12px 0 0" : undefined }}>
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
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Persistent overlay — stays mounted for pending + success */}
        {isActive && (
          <div className="pay-content-fade" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 36, minHeight: 160 }}>

            {/* Single persistent circle — icon morphs inside */}
            <div className={`pay-circle ${phase === "pending" ? "pending" : phase === "success" ? "processing" : "confirmed"}`}
              style={{ marginBottom: 14 }}>
              {/* Phone icon layer */}
              <div className={`icon-layer ${phase === "pending" ? "visible" : "hidden"}`}>
                <ContactlessIcon color={C.blue} size={36} />
              </div>
              {/* Checkmark icon layer */}
              <div className={`icon-layer ${phase === "success" ? "visible" : "hidden"}`}>
                <svg viewBox="0 0 32 32" style={{ width: 34, height: 34 }}>
                  <path className={`pay-check-path${phase === "success" ? " draw" : ""}`} d="M9 17 L14 22 L23 11" />
                </svg>
              </div>
            </div>

            {/* Label crossfade */}
            <div className="pay-label-wrap" style={{ marginBottom: phase === "success" ? 20 : 0 }}>
              <span className={`pay-label ${phase === "pending" ? "visible" : "hidden"}`}
                style={{ fontSize: 17, fontWeight: 500, color: C.blue, letterSpacing: 0.1 }}>
                Hold Near Reader
              </span>
              <span className={`pay-label ${phase === "success" ? "visible" : "hidden"}`}
                style={{ fontSize: 17, fontWeight: 600, color: C.blue, letterSpacing: 0.1 }}>
                Done
              </span>
            </div>

            {/* Transaction widget — appears on success */}
            {phase === "success" && (
              <div className="success-tx-widget" style={{ width: "100%", borderRadius: 14, backgroundColor: C.white, boxShadow: "0 4px 20px rgba(0,0,0,0.10)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", padding: "16px 18px" }}>
                  <div style={{ marginRight: 12, flexShrink: 0 }}>
                    <Avatar name={config.friendName || "Friend"} size={42} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 500, color: C.label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {config.friendName || "Friend"}
                    </div>
                    <div style={{ fontSize: 14, color: C.secondaryLabel }}>Received · just now</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: C.green }}>
                      +${amount != null ? amount.toFixed(2) : "0.00"}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Settling: circle/label fading out above the sections as they return */}
        {phase === "settling" && (
          <div className="success-header-out" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 36, position: "absolute", left: 0, right: 0, zIndex: 10, pointerEvents: "none" }}>
            <div className="pay-circle confirmed" style={{ marginBottom: 14 }}>
              <div className="icon-layer visible">
                <svg viewBox="0 0 32 32" style={{ width: 34, height: 34 }}>
                  <path d="M9 17 L14 22 L23 11" stroke="#007aff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.blue, letterSpacing: 0.1 }}>Done</div>
          </div>
        )}

      </div>

      {showWelcome && (
        <WelcomeModal
          onDismiss={() => {
            setShowWelcome(false);
            localStorage.setItem(WELCOME_KEY, "1");
          }}
        />
      )}

      {smsToast && (
        <div
          style={{
            position: "fixed",
            bottom: "max(14px, env(safe-area-inset-bottom, 14px))",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(60,60,67,0.5)",
            color: "rgba(255,255,255,0.85)",
            padding: "5px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 400,
            fontFamily: FONT,
            zIndex: 100,
            maxWidth: "80vw",
            textAlign: "center" as const,
            animation: "fadeInUp 0.25s ease",
          }}
        >
          {smsToast.message}
        </div>
      )}
    </main>
  );
}
