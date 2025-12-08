// app/info/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PrankConfig } from "@/lib/types";

const STORAGE_KEY = "applepayprank-config";

export default function InfoPage() {
  const router = useRouter();

  const [pranksterName, setPranksterName] = useState("You"); // receiver (you)
  const [friendName, setFriendName] = useState("Dorian"); // friend sending money
  const [amount, setAmount] = useState("27.43"); // fixed prank amount

  // Load saved config (if any)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: Partial<PrankConfig> = JSON.parse(raw);

      if (parsed.pranksterName) setPranksterName(parsed.pranksterName);
      if (parsed.friendName) setFriendName(parsed.friendName);
      if (
        parsed.amountMode === "fixed" &&
        typeof parsed.fixedAmount === "number"
      ) {
        setAmount(parsed.fixedAmount.toFixed(2));
      }
    } catch (err) {
      console.warn("[info] failed to load config", err);
    }
  }, []);

  function handleSave() {
    const fixedAmount = parseFloat(amount || "0") || 0;

    const config: PrankConfig = {
      pranksterName: pranksterName.trim() || "You",
      friendName: friendName.trim() || "Friend",
      amountMode: "fixed",
      fixedAmount,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    router.push("/"); // back to main screen
  }

  function handleCancel() {
    router.push("/");
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
      {/* Centered phone window so it feels like the main app */}
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Top bar with  Pay title, like main screen */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            position: "relative",
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              background: "none",
              border: "none",
              color: "#000",
              fontSize: "17px",
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
                fontSize: 18,
                fontWeight: 600,
                color: "#111827",
                letterSpacing: 0.3,
              }}
            >
              {"\uF8FF"} Pay
            </span>
          </div>

          {/* spacer to balance Done text */}
          <div style={{ width: 40 }} />
        </header>

        {/* Small section title */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "0.25rem 0 0.5rem 0.15rem",
          }}
        >
          Prank Settings
        </div>

        {/* Prank preview card */}
        <section
          style={{
            borderRadius: 16,
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            padding: "0.75rem 0.9rem",
            marginBottom: "1.0rem",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "#6b7280",
              marginBottom: "0.35rem",
            }}
          >
            Prank Preview
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 600,
              marginBottom: "0.15rem",
            }}
          >
            ${amount || "0.00"}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            You&apos;ll appear to receive{" "}
            <strong>${amount || "0.00"}</strong> from{" "}
            <strong>{friendName || "Friend"}</strong>.
          </div>
        </section>

        {/* Form card – iOS-style list */}
        <section
          style={{
            borderRadius: 16,
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Amount row */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "15px",
                  color: "#111827",
                  marginBottom: 2,
                }}
              >
                Amount
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                How much should the prank say was sent.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                minWidth: 100,
                justifyContent: "flex-end",
              }}
            >
              <span style={{ fontSize: 16 }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="27.43"
                style={{
                  border: "none",
                  outline: "none",
                  textAlign: "right",
                  fontSize: "16px",
                  width: 80,
                  background: "transparent",
                  color: "#111827", // always solid text
                }}
              />
            </div>
          </div>

          {/* Friend name (payer) */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: "15px",
                color: "#111827",
              }}
            >
              Friend&apos;s name
            </div>
            <input
              type="text"
              placeholder="Dorian"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "16px",
                padding: "4px 0",
                background: "transparent",
                color: "#111827", // solid black text
              }}
            />
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              This is who it looks like the money is coming from.
            </div>
          </div>

          {/* Your name (receiver) */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: "15px",
                color: "#111827",
              }}
            >
              Your name
            </div>
            <input
              type="text"
              placeholder="You"
              value={pranksterName}
              onChange={(e) => setPranksterName(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "16px",
                padding: "4px 0",
                background: "transparent",
                color: "#111827", // solid black text
              }}
            />
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              This is who it looks like the money was sent to.
            </div>
          </div>
        </section>

        {/* Save button */}
        <div
          style={{
            marginTop: "1.25rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handleSave}
            style={{
              minWidth: 160,
              padding: "0.6rem 1.5rem",
              borderRadius: 999,
              border: "none",
              fontSize: "16px",
              fontWeight: 500,
              background:
                "linear-gradient(135deg, #34c759 0%, #30b0ff 40%, #5856d6 100%)",
              color: "#fff",
              boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
              cursor: "pointer",
            }}
          >
            Save & Return
          </button>
        </div>
      </div>
    </main>
  );
}
