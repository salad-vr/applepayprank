// app/info/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PrankConfig } from "@/lib/types";

const CONFIG_STORAGE_KEY = "applepayprank-config";
const WALLET_STORAGE_KEY = "applepayprank-wallet-v1";

const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "You",
  friendName: "Apple Pay",
  amountMode: "fixed",
  fixedAmount: 67.0,
  minAmount: 10,
  maxAmount: 50,
  startingBalance: 105,
  victimPhone: "",
  sendSms: false,
  smsTemplate: "You received {amount} from {friendName} via Apple Pay.",
};

const DEFAULT_SMS_TEMPLATE =
  "You received {amount} from {friendName} via Apple Pay.";

// iOS-style shared styles
const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

const sectionStyle: React.CSSProperties = {
  borderRadius: 10,
  backgroundColor: "var(--ios-secondary-grouped-background)",
  overflow: "hidden",
  marginBottom: 16,
};

const rowStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderTop: "none",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const rowBorderStyle: React.CSSProperties = {
  ...rowStyle,
  borderTop: "0.5px solid var(--ios-separator)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--ios-label)",
  fontWeight: 400,
};

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ios-secondary-label)",
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: 17,
  padding: "4px 0",
  background: "transparent",
  color: "var(--ios-label)",
  fontFamily: FONT,
  width: "100%",
};

export default function InfoPage() {
  const router = useRouter();

  const [pranksterName, setPranksterName] = useState(DEFAULT_CONFIG.pranksterName);
  const [friendName, setFriendName] = useState(DEFAULT_CONFIG.friendName);
  const [amountMode, setAmountMode] = useState<PrankConfig["amountMode"]>("fixed");
  const [fixedAmount, setFixedAmount] = useState("67.00");
  const [minAmount, setMinAmount] = useState("10");
  const [maxAmount, setMaxAmount] = useState("50");
  const [startingBalance, setStartingBalance] = useState("105");

  // SMS fields
  const [victimPhone, setVictimPhone] = useState("");
  const [sendSms, setSendSms] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE);

  const [saving, setSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Load saved config
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;

      const parsed: Partial<PrankConfig> = JSON.parse(raw);

      setPranksterName(parsed.pranksterName ?? DEFAULT_CONFIG.pranksterName);
      setFriendName(parsed.friendName ?? DEFAULT_CONFIG.friendName);

      if (parsed.amountMode === "range") {
        setAmountMode("range");
      } else {
        setAmountMode("fixed");
      }

      if (typeof parsed.fixedAmount === "number") {
        setFixedAmount(parsed.fixedAmount.toFixed(2));
      }

      if (typeof parsed.minAmount === "number") {
        setMinAmount(parsed.minAmount.toString());
      }

      if (typeof parsed.maxAmount === "number") {
        setMaxAmount(parsed.maxAmount.toString());
      }

      if (typeof parsed.startingBalance === "number") {
        setStartingBalance(parsed.startingBalance.toString());
      }

      // SMS fields
      if (typeof parsed.victimPhone === "string") {
        setVictimPhone(parsed.victimPhone);
      }
      if (typeof parsed.sendSms === "boolean") {
        setSendSms(parsed.sendSms);
      }
      if (typeof parsed.smsTemplate === "string" && parsed.smsTemplate.trim()) {
        setSmsTemplate(parsed.smsTemplate);
      }
    } catch (err) {
      console.warn("[info] failed to load config", err);
    }
  }, []);

  function handleSave() {
    setSaving(true);

    const normalizedPrankster = pranksterName.trim() || DEFAULT_CONFIG.pranksterName;
    const normalizedFriend = friendName.trim() || DEFAULT_CONFIG.friendName;

    const fixed = parseFloat(fixedAmount || "0") || 0;
    const min = parseFloat(minAmount || "0") || 0;
    const max = parseFloat(maxAmount || "0") || 0;
    const starting = parseFloat(startingBalance || "0") || 0;

    const config: PrankConfig = {
      pranksterName: normalizedPrankster,
      friendName: normalizedFriend,
      amountMode,
      fixedAmount: fixed,
      minAmount: min,
      maxAmount: max,
      startingBalance: starting,
      victimPhone: victimPhone.trim(),
      sendSms,
      smsTemplate: smsTemplate.trim() || DEFAULT_SMS_TEMPLATE,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
    }

    setTimeout(() => {
      setSaving(false);
      router.push("/");
    }, 150);
  }

  function handleResetWallet() {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
      setResetMessage("Card reset. Next time you open the wallet it will start fresh.");
      setTimeout(() => setResetMessage(null), 2500);
    } catch (err) {
      console.warn("[info] failed to reset wallet", err);
      setResetMessage("Something went wrong. Try again.");
      setTimeout(() => setResetMessage(null), 2500);
    }
  }

  // Preview text
  const previewAmount =
    amountMode === "fixed"
      ? `$${fixedAmount || "0.00"}`
      : `$${minAmount || "10"}\u2013$${maxAmount || "50"}`;

  const previewSender = friendName.trim() || DEFAULT_CONFIG.friendName;

  const smsPreview = (smsTemplate || DEFAULT_SMS_TEMPLATE)
    .replace("{amount}", previewAmount)
    .replace("{friendName}", previewSender);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--ios-grouped-background)",
        padding: "0 16px 34px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            position: "relative",
            height: 44,
          }}
        >
          <div style={{ width: 56 }} />

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
                fontSize: 17,
                fontWeight: 600,
                color: "var(--ios-label)",
              }}
            >
              Settings
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "var(--ios-system-blue)",
              border: "none",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: 999,
              minWidth: 64,
              opacity: saving ? 0.7 : 1,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Save
          </button>
        </header>

        {/* Section label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "var(--ios-secondary-label)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "4px 0 8px 16px",
          }}
        >
          Prank Configuration
        </div>

        {/* Preview card */}
        <section style={{ ...sectionStyle, padding: "12px 16px" }}>
          <div style={{ ...hintStyle, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, fontWeight: 500 }}>
            Preview
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.4, color: "var(--ios-label)" }}>
            You&apos;ll appear to receive {previewAmount} from {previewSender}.
          </div>
        </section>

        {/* Config card */}
        <section style={sectionStyle}>
          {/* Amount mode toggle */}
          <div style={rowStyle}>
            <div style={labelStyle}>Amount Mode</div>
            <div
              style={{
                display: "inline-flex",
                borderRadius: 8,
                backgroundColor: "var(--ios-system-gray5)",
                padding: 2,
                marginTop: 4,
              }}
            >
              {(["fixed", "range"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAmountMode(mode)}
                  style={{
                    padding: "5px 16px",
                    borderRadius: 7,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: FONT,
                    backgroundColor:
                      amountMode === mode ? "var(--ios-system-background)" : "transparent",
                    color:
                      amountMode === mode ? "var(--ios-label)" : "var(--ios-secondary-label)",
                    boxShadow:
                      amountMode === mode
                        ? "0 1px 3px rgba(0,0,0,0.12)"
                        : "none",
                  }}
                >
                  {mode === "fixed" ? "Fixed" : "Range"}
                </button>
              ))}
            </div>
            <div style={hintStyle}>
              Choose one exact amount, or a random range for more realism.
            </div>
          </div>

          {/* Fixed amount */}
          {amountMode === "fixed" && (
            <div style={rowBorderStyle}>
              <div style={labelStyle}>Fixed amount</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 17, marginRight: 2, color: "var(--ios-label)" }}>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="67.00"
                  style={inputStyle}
                />
              </div>
              <div style={hintStyle}>
                The exact amount shown in the payment popup.
              </div>
            </div>
          )}

          {/* Range */}
          {amountMode === "range" && (
            <div style={rowBorderStyle}>
              <div style={labelStyle}>Random range</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {[
                  { label: "Min", value: minAmount, setter: setMinAmount },
                  { label: "Max", value: maxAmount, setter: setMaxAmount },
                ].map((f) => (
                  <div
                    key={f.label}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 8,
                      backgroundColor: "var(--ios-system-gray6)",
                      padding: "4px 8px",
                    }}
                  >
                    <span style={{ fontSize: 13, marginRight: 4, color: "var(--ios-secondary-label)" }}>
                      {f.label}
                    </span>
                    <span style={{ fontSize: 17, marginRight: 2, color: "var(--ios-label)" }}>$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.value}
                      onChange={(e) => f.setter(e.target.value)}
                      style={{ ...inputStyle, fontSize: 15 }}
                    />
                  </div>
                ))}
              </div>
              <div style={hintStyle}>
                Each tap picks a new random amount in this range.
              </div>
            </div>
          )}

          {/* Friend's name */}
          <div style={rowBorderStyle}>
            <div style={labelStyle}>Friend&apos;s name (sender)</div>
            <input
              type="text"
              placeholder="Apple Pay"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              style={inputStyle}
            />
            <div style={hintStyle}>
              Who it looks like the money is coming from.
            </div>
          </div>

          {/* Your name */}
          <div style={rowBorderStyle}>
            <div style={labelStyle}>Your name (receiver)</div>
            <input
              type="text"
              placeholder="You"
              value={pranksterName}
              onChange={(e) => setPranksterName(e.target.value)}
              style={inputStyle}
            />
            <div style={hintStyle}>
              Who it looks like the money was sent to.
            </div>
          </div>

          {/* Starting balance */}
          <div style={rowBorderStyle}>
            <div style={labelStyle}>Starting balance</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 17, marginRight: 2, color: "var(--ios-label)" }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="105"
                style={inputStyle}
              />
            </div>
            <div style={hintStyle}>
              Balance shown on the card before any pranks (or after reset).
            </div>
          </div>
        </section>

        {/* ---- SMS Prank Section ---- */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "var(--ios-secondary-label)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "4px 0 8px 16px",
          }}
        >
          SMS Prank Text
        </div>

        <section style={sectionStyle}>
          {/* Toggle */}
          <div
            style={{
              ...rowStyle,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={labelStyle}>Send text on prank</div>
            <button
              type="button"
              onClick={() => setSendSms(!sendSms)}
              style={{
                width: 51,
                height: 31,
                borderRadius: 16,
                border: "none",
                backgroundColor: sendSms ? "var(--ios-system-green)" : "var(--ios-system-gray5)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: 14,
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  position: "absolute",
                  top: 2,
                  left: sendSms ? 22 : 2,
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          </div>

          {sendSms && (
            <>
              {/* Phone number */}
              <div style={rowBorderStyle}>
                <div style={labelStyle}>Victim&apos;s phone number</div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+1 (555) 123-4567"
                  value={victimPhone}
                  onChange={(e) => setVictimPhone(e.target.value)}
                  style={inputStyle}
                />
                <div style={hintStyle}>
                  The person who will receive the text when you trigger the prank.
                </div>
              </div>

              {/* Message template */}
              <div style={rowBorderStyle}>
                <div style={labelStyle}>Message template</div>
                <textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  placeholder={DEFAULT_SMS_TEMPLATE}
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: "none",
                    fontSize: 15,
                    lineHeight: 1.4,
                  }}
                />
                <div style={hintStyle}>
                  Use <strong>{"{amount}"}</strong> and <strong>{"{friendName}"}</strong> as
                  placeholders. They&apos;ll be replaced with the actual values.
                </div>
              </div>

              {/* SMS Preview */}
              <div style={rowBorderStyle}>
                <div style={{ ...hintStyle, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500, marginBottom: 2 }}>
                  SMS Preview
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--ios-label)",
                    backgroundColor: "var(--ios-system-gray6)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    lineHeight: 1.4,
                  }}
                >
                  {smsPreview}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ---- Reset & Disclaimer ---- */}
        <section style={sectionStyle}>
          <button
            type="button"
            onClick={handleResetWallet}
            style={{
              width: "100%",
              padding: "14px 16px",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            <span
              style={{
                fontSize: 17,
                color: "var(--ios-system-red)",
                fontWeight: 400,
              }}
            >
              Reset Card & History
            </span>
            <span style={{ fontSize: 13, color: "var(--ios-system-gray3)" }}>
              {"\u203A"}
            </span>
          </button>

          {resetMessage && (
            <div style={{ padding: "0 16px 12px", ...hintStyle }}>
              {resetMessage}
            </div>
          )}

          <div
            style={{
              height: 0.5,
              backgroundColor: "var(--ios-separator)",
              margin: "0 16px",
            }}
          />

          <div
            style={{
              padding: "12px 16px 14px",
              ...hintStyle,
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 4,
                color: "var(--ios-secondary-label)",
              }}
            >
              About this app
            </div>
            This is a visual prank tool only. No real money is being sent or
            received. Use it responsibly and don&apos;t use it to scam, harass,
            or mislead people about actual payments.
          </div>
        </section>
      </div>
    </main>
  );
}
