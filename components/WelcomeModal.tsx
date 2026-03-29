// components/WelcomeModal.tsx
"use client";

import { useState, useCallback } from "react";

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

const TOTAL_STEPS = 3;

export function WelcomeModal({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [stepKey, setStepKey] = useState(0); // forces re-mount for animation

  const advance = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      setStepKey((k) => k + 1);
    } else {
      setClosing(true);
      setTimeout(onDismiss, 350);
    }
  }, [step, onDismiss]);

  const skip = useCallback(() => {
    setClosing(true);
    setTimeout(onDismiss, 350);
  }, [onDismiss]);

  return (
    <div
      className={`welcome-backdrop${closing ? " closing" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) skip();
      }}
    >
      <div className="welcome-sheet" style={{ fontFamily: FONT }}>
        <div className="welcome-grab" />

        {/* Dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 28,
          }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`welcome-dot${i === step ? " active" : ""}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div key={stepKey} className="welcome-step-enter">
          {step === 0 && <StepIntro />}
          {step === 1 && <StepHowItWorks />}
          {step === 2 && <StepCustomize />}
        </div>

        {/* Buttons */}
        <div style={{ marginTop: 28 }}>
          <button className="welcome-btn welcome-btn-primary" onClick={advance}>
            {step === TOTAL_STEPS - 1 ? "Get Started" : "Continue"}
          </button>
          {step < TOTAL_STEPS - 1 && (
            <button className="welcome-btn welcome-btn-secondary" onClick={skip}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Step 0: Intro ───────── */
function StepIntro() {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        className="welcome-icon-float"
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: "linear-gradient(135deg, #007aff 0%, #5856d6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 38,
          boxShadow: "0 8px 32px rgba(0,122,255,0.3)",
        }}
      >
        <span style={{ filter: "brightness(10)" }}>{"\uF8FF"}</span>
      </div>

      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 10px",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome to Apple Pay Prank
      </h2>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.6)",
          margin: "0 0 8px",
          padding: "0 8px",
        }}
      >
        This app mimics the Apple Pay interface to create a harmless, hilarious
        prank on your friends. Nothing real is being charged or transferred.
      </p>

      <div className="welcome-warning-banner" style={{ marginTop: 20 }}>
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>
          &#9888;&#65039;
        </span>
        <span
          style={{
            fontSize: 13,
            lineHeight: 1.45,
            color: "rgba(255,159,10,0.95)",
          }}
        >
          <strong>For comedic purposes only.</strong> No real payments are processed.
          Please use responsibly and only with people who will find it funny.
        </span>
      </div>
    </div>
  );
}

/* ───────── Step 1: How It Works ───────── */
function StepHowItWorks() {
  const features = [
    {
      icon: "👆",
      bg: "rgba(0,122,255,0.15)",
      title: "Tap the Card",
      desc: 'Tap the black Apple Cash card to bring up the "Hold Near Reader" screen — just like the real thing.',
    },
    {
      icon: "💳",
      bg: "rgba(52,199,89,0.15)",
      title: "Tap Again to \"Pay\"",
      desc: 'Tap anywhere on the screen again to "process" the payment. A green checkmark, sound effect, and amount will appear.',
    },
    {
      icon: "🔄",
      bg: "rgba(88,86,214,0.15)",
      title: "Repeat",
      desc: "Each tap generates a new transaction that appears in the wallet history. The balance updates automatically.",
    },
  ];

  return (
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 6px",
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        How It Works
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          margin: "0 0 20px",
        }}
      >
        Three simple steps to pull off the prank
      </p>

      {features.map((f, i) => (
        <div className="welcome-feature-row" key={i}>
          <div
            className="welcome-feature-icon"
            style={{ background: f.bg }}
          >
            {f.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#fff",
                marginBottom: 3,
              }}
            >
              {f.title}
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {f.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Step 2: Customize ───────── */
function StepCustomize() {
  const tips = [
    {
      icon: "ⓘ",
      bg: "rgba(142,142,147,0.2)",
      title: "The \"i\" Button",
      desc: "Tap the small \"i\" button in the top-right corner of the wallet to open Settings. This is where you customize everything.",
    },
    {
      icon: "✏️",
      bg: "rgba(255,159,10,0.15)",
      title: "Edit Names & Amounts",
      desc: "Change the cardholder name, the friend who \"sent\" money, and set a fixed amount or random range.",
    },
    {
      icon: "📱",
      bg: "rgba(0,199,190,0.15)",
      title: "Attach a Phone Number",
      desc: "Optionally add a phone number to send a fake SMS notification each time a \"payment\" is processed — for extra realism.",
    },
    {
      icon: "💰",
      bg: "rgba(52,199,89,0.15)",
      title: "Set Starting Balance",
      desc: "Customize the initial wallet balance to make it look more convincing.",
    },
  ];

  return (
    <div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          margin: "0 0 6px",
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        Customize Your Prank
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          margin: "0 0 18px",
        }}
      >
        Make it your own from the settings page
      </p>

      {tips.map((t, i) => (
        <div className="welcome-feature-row" key={i}>
          <div
            className="welcome-feature-icon"
            style={{ background: t.bg, fontSize: t.icon === "ⓘ" ? 24 : 20 }}
          >
            {t.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#fff",
                marginBottom: 3,
              }}
            >
              {t.title}
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {t.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
