// app/info/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PrankConfig } from "@/lib/types";

const CONFIG_STORAGE_KEY = "applepayprank-config";
const WALLET_STORAGE_KEY = "applepayprank-wallet-v1";

const DEFAULT_CONFIG: PrankConfig = {
  pranksterName: "John Doe",
  friendName: "Jane Doe",
  amountMode: "fixed",
  fixedAmount: 25.0,
  minAmount: 10,
  maxAmount: 50,
  startingBalance: 145.67,
  victimPhone: "",
  sendSms: false,
  smsTemplate: "INTERACT e-Transfer: {amount} (CAD) has been deposited to {friendName} from your account.",
  smsProvider: "email",
  victimCarrier: "",
  smtpEmail: "",
  smtpPassword: "",
  textbeltKey: "",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
};

const DEFAULT_SMS_TEMPLATE =
  "INTERACT e-Transfer: {amount} (CAD) has been deposited to {friendName} from your account.";

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

// Hardcoded iOS colors for reliable inline styles
const C = {
  label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.6)",
  bg: "#f2f2f7",
  cardBg: "#ffffff",
  separator: "rgba(60,60,67,0.29)",
  blue: "#007aff",
  green: "#34c759",
  red: "#ff3b30",
  gray3: "#c7c7cc",
  gray5: "#e5e5ea",
  gray6: "#f2f2f7",
} as const;

const sectionStyle: React.CSSProperties = {
  borderRadius: 10,
  backgroundColor: C.cardBg,
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
  borderTop: `0.5px solid ${C.separator}`,
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  color: C.label,
  fontWeight: 400,
};

const hintStyle: React.CSSProperties = {
  fontSize: 13,
  color: C.secondaryLabel,
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: 17,
  padding: "4px 0",
  background: "transparent",
  color: C.label,
  fontFamily: FONT,
  width: "100%",
};

export default function InfoPage() {
  const router = useRouter();

  const [pranksterName, setPranksterName] = useState(DEFAULT_CONFIG.pranksterName);
  const [friendName, setFriendName] = useState(DEFAULT_CONFIG.friendName);
  const [amountMode, setAmountMode] = useState<PrankConfig["amountMode"]>("fixed");
  const [fixedAmount, setFixedAmount] = useState("25.00");
  const [minAmount, setMinAmount] = useState("10");
  const [maxAmount, setMaxAmount] = useState("50");
  const [startingBalance, setStartingBalance] = useState("145.67");

  const [victimPhone, setVictimPhone] = useState("");
  const [sendSms, setSendSms] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE);
  // Provider fields kept in state for reset logic but not exposed in UI
  const [smsProvider, setSmsProvider] = useState<"email" | "textbelt" | "twilio">("email");
  const [victimCarrier, setVictimCarrier] = useState("");
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [textbeltKey, setTextbeltKey] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioFromNumber, setTwilioFromNumber] = useState("");

  const [saving, setSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!raw) return;
      const parsed: Partial<PrankConfig> = JSON.parse(raw);

      setPranksterName(parsed.pranksterName ?? DEFAULT_CONFIG.pranksterName);
      setFriendName(parsed.friendName ?? DEFAULT_CONFIG.friendName);
      setAmountMode(parsed.amountMode === "range" ? "range" : "fixed");
      if (typeof parsed.fixedAmount === "number") setFixedAmount(parsed.fixedAmount.toFixed(2));
      if (typeof parsed.minAmount === "number") setMinAmount(parsed.minAmount.toString());
      if (typeof parsed.maxAmount === "number") setMaxAmount(parsed.maxAmount.toString());
      if (typeof parsed.startingBalance === "number") setStartingBalance(parsed.startingBalance.toString());
      if (typeof parsed.victimPhone === "string") setVictimPhone(parsed.victimPhone);
      if (typeof parsed.sendSms === "boolean") setSendSms(parsed.sendSms);
      if (typeof parsed.smsTemplate === "string" && parsed.smsTemplate.trim()) setSmsTemplate(parsed.smsTemplate);
      if (parsed.smsProvider === "textbelt" || parsed.smsProvider === "twilio" || parsed.smsProvider === "email") setSmsProvider(parsed.smsProvider);
      if (typeof parsed.victimCarrier === "string") setVictimCarrier(parsed.victimCarrier);
      if (typeof parsed.smtpEmail === "string") setSmtpEmail(parsed.smtpEmail);
      if (typeof parsed.smtpPassword === "string") setSmtpPassword(parsed.smtpPassword);
      if (typeof parsed.textbeltKey === "string") setTextbeltKey(parsed.textbeltKey);
      if (typeof parsed.twilioAccountSid === "string") setTwilioAccountSid(parsed.twilioAccountSid);
      if (typeof parsed.twilioAuthToken === "string") setTwilioAuthToken(parsed.twilioAuthToken);
      if (typeof parsed.twilioFromNumber === "string") setTwilioFromNumber(parsed.twilioFromNumber);
    } catch (err) {
      console.warn("[info] failed to load config", err);
    }
  }, []);

  function handleSave() {
    // Confirm SMS details before saving
    if (sendSms && victimPhone.trim()) {
      const previewMsg = (smsTemplate || DEFAULT_SMS_TEMPLATE)
        .replace("{amount}", amountMode === "fixed" ? `$${fixedAmount || "0.00"}` : "$XX.XX")
        .replace("{friendName}", friendName.trim() || DEFAULT_CONFIG.friendName);
      const ok = window.confirm(
        `SMS will be sent to ${victimPhone.trim()} when the prank triggers.\n\nMessage preview:\n"${previewMsg}"\n\nIs this correct?`
      );
      if (!ok) return;
    }

    setSaving(true);
    const config: PrankConfig = {
      pranksterName: pranksterName.trim() || DEFAULT_CONFIG.pranksterName,
      friendName: friendName.trim() || DEFAULT_CONFIG.friendName,
      amountMode,
      fixedAmount: parseFloat(fixedAmount || "0") || 0,
      minAmount: parseFloat(minAmount || "0") || 0,
      maxAmount: parseFloat(maxAmount || "0") || 0,
      startingBalance: parseFloat(startingBalance || "0") || 0,
      victimPhone: victimPhone.trim(),
      sendSms,
      smsTemplate: smsTemplate.trim() || DEFAULT_SMS_TEMPLATE,
      smsProvider,
      victimCarrier,
      smtpEmail: smtpEmail.trim(),
      smtpPassword: smtpPassword.trim(),
      textbeltKey: textbeltKey.trim(),
      twilioAccountSid: twilioAccountSid.trim(),
      twilioAuthToken: twilioAuthToken.trim(),
      twilioFromNumber: twilioFromNumber.trim(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
    }
    setTimeout(() => { setSaving(false); router.push("/"); }, 150);
  }

  function handleResetWallet() {
    if (typeof window === "undefined") return;
    const ok = window.confirm("This will erase ALL settings, card data, and transaction history. Are you sure?");
    if (!ok) return;
    try {
      // Reset all form state to defaults
      setPranksterName(DEFAULT_CONFIG.pranksterName);
      setFriendName(DEFAULT_CONFIG.friendName);
      setAmountMode("fixed");
      setFixedAmount("25.00");
      setMinAmount("10");
      setMaxAmount("50");
      setStartingBalance("145.67");
      setVictimPhone("");
      setSendSms(false);
      setSmsTemplate(DEFAULT_SMS_TEMPLATE);
      setSmsProvider("email");
      setVictimCarrier("");
      setSmtpEmail("");
      setSmtpPassword("");
      setTextbeltKey("");
      setTwilioAccountSid("");
      setTwilioAuthToken("");
      setTwilioFromNumber("");

      // Wipe old data AND save clean defaults so WalletScreen picks them up
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));

      setResetMessage("Everything cleared. All settings and card data reset to defaults.");
      setTimeout(() => setResetMessage(null), 2500);
    } catch {
      setResetMessage("Something went wrong. Try again.");
      setTimeout(() => setResetMessage(null), 2500);
    }
  }

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
        backgroundColor: C.bg,
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
            <span style={{ fontSize: 17, fontWeight: 600, color: C.label }}>
              Settings
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: C.blue,
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
            color: C.secondaryLabel,
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
          <div style={{ fontSize: 17, lineHeight: 1.4, color: C.label }}>
            You&apos;ll appear to receive {previewAmount} from {previewSender}.
          </div>
        </section>

        {/* Config card */}
        <section style={sectionStyle}>
          {/* Amount mode */}
          <div style={rowStyle}>
            <div style={labelStyle}>Amount Mode</div>
            <div
              style={{
                display: "inline-flex",
                borderRadius: 8,
                backgroundColor: C.gray5,
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
                    backgroundColor: amountMode === mode ? C.cardBg : "transparent",
                    color: amountMode === mode ? C.label : C.secondaryLabel,
                    boxShadow: amountMode === mode ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
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

          {amountMode === "fixed" && (
            <div style={rowBorderStyle}>
              <div style={labelStyle}>Fixed amount</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 17, marginRight: 2, color: C.label }}>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="25.00"
                  style={inputStyle}
                />
              </div>
              <div style={hintStyle}>The exact amount shown in the payment popup.</div>
            </div>
          )}

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
                      backgroundColor: C.gray6,
                      padding: "4px 8px",
                    }}
                  >
                    <span style={{ fontSize: 13, marginRight: 4, color: C.secondaryLabel }}>{f.label}</span>
                    <span style={{ fontSize: 17, marginRight: 2, color: C.label }}>$</span>
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
              <div style={hintStyle}>Each tap picks a new random amount in this range.</div>
            </div>
          )}

          <div style={rowBorderStyle}>
            <div style={labelStyle}>Friend&apos;s name (sender)</div>
            <input type="text" placeholder="Jane Doe" value={friendName} onChange={(e) => setFriendName(e.target.value)} style={inputStyle} />
            <div style={hintStyle}>Who it looks like the money is coming from.</div>
          </div>

          <div style={rowBorderStyle}>
            <div style={labelStyle}>Your name (receiver)</div>
            <input type="text" placeholder="John Doe" value={pranksterName} onChange={(e) => setPranksterName(e.target.value)} style={inputStyle} />
            <div style={hintStyle}>Who it looks like the money was sent to.</div>
          </div>

          <div style={rowBorderStyle}>
            <div style={labelStyle}>Starting balance</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 17, marginRight: 2, color: C.label }}>$</span>
              <input type="text" inputMode="decimal" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder="145.67" style={inputStyle} />
            </div>
            <div style={hintStyle}>Balance shown on the card before any pranks (or after reset).</div>
          </div>
        </section>

        {/* SMS Section */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: C.secondaryLabel,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "4px 0 8px 16px",
          }}
        >
          SMS Prank Text
        </div>

        <section style={sectionStyle}>
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
                backgroundColor: sendSms ? C.green : C.gray5,
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
              <div style={rowBorderStyle}>
                <div style={labelStyle}>Victim&apos;s phone number</div>
                <input type="tel" inputMode="tel" placeholder="+1 (555) 123-4567" value={victimPhone} onChange={(e) => setVictimPhone(e.target.value)} style={inputStyle} />
                <div style={hintStyle}>The person who will receive the text when you trigger the prank.</div>
              </div>

              <div style={rowBorderStyle}>
                <div style={labelStyle}>Message template</div>
                <textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  placeholder={DEFAULT_SMS_TEMPLATE}
                  rows={3}
                  style={{ ...inputStyle, resize: "none", fontSize: 15, lineHeight: 1.4 }}
                />
                <div style={hintStyle}>
                  Use <strong>{"{amount}"}</strong> and <strong>{"{friendName}"}</strong> as placeholders.
                </div>
              </div>

              <div style={rowBorderStyle}>
                <div style={{ ...hintStyle, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 500, marginBottom: 2 }}>
                  SMS Preview
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: C.label,
                    backgroundColor: C.gray6,
                    borderRadius: 8,
                    padding: "8px 10px",
                    lineHeight: 1.4,
                  }}
                >
                  {smsPreview}
                </div>
              </div>

              {/* Info about how texting works */}
              <div style={rowBorderStyle}>
                <div style={hintStyle}>
                  Texts are sent automatically to all Canadian carriers when the prank triggers.
                  Works with Rogers, Bell, Telus, Fido, Koodo, Freedom, SaskTel, and more.
                </div>
              </div>
            </>
          )}
        </section>

        {/* Reset & Disclaimer */}
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
            <span style={{ fontSize: 17, color: C.red, fontWeight: 400 }}>
              Reset Everything
            </span>
            <span style={{ fontSize: 13, color: C.gray3 }}>{"\u203A"}</span>
          </button>

          {resetMessage && (
            <div style={{ padding: "0 16px 12px", ...hintStyle }}>{resetMessage}</div>
          )}

          <div style={{ height: 0.5, backgroundColor: C.separator, margin: "0 16px" }} />

          <div style={{ padding: "12px 16px 14px", ...hintStyle, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: C.secondaryLabel }}>
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
