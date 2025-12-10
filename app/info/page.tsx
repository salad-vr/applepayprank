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
};

export default function InfoPage() {
  const router = useRouter();

  // Local editable state.
  const [pranksterName, setPranksterName] = useState(DEFAULT_CONFIG.pranksterName);
  const [friendName, setFriendName] = useState(DEFAULT_CONFIG.friendName);
  const [amountMode, setAmountMode] = useState<PrankConfig["amountMode"]>("fixed");
  const [fixedAmount, setFixedAmount] = useState("67.00");
  const [minAmount, setMinAmount] = useState("10");
  const [maxAmount, setMaxAmount] = useState("50");
  const [startingBalance, setStartingBalance] = useState("105");

  const [saving, setSaving] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Load saved config (if any)
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
      } else {
        setFixedAmount((DEFAULT_CONFIG.fixedAmount ?? 67).toFixed(2));
      }

      if (typeof parsed.minAmount === "number") {
        setMinAmount(parsed.minAmount.toString());
      } else {
        setMinAmount((DEFAULT_CONFIG.minAmount ?? 10).toString());
      }

      if (typeof parsed.maxAmount === "number") {
        setMaxAmount(parsed.maxAmount.toString());
      } else {
        setMaxAmount((DEFAULT_CONFIG.maxAmount ?? 50).toString());
      }

      if (typeof parsed.startingBalance === "number") {
        setStartingBalance(parsed.startingBalance.toString());
      } else if (typeof DEFAULT_CONFIG.startingBalance === "number") {
        setStartingBalance(DEFAULT_CONFIG.startingBalance.toString());
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
    };

    if (typeof window !== "undefined") {
      // Save config
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      // Clear wallet cache so new starting balance + settings apply immediately
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
    }

    setTimeout(() => {
      setSaving(false);
      router.push("/"); // back to main screen
    }, 150);
  }

  function handleResetWallet() {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(WALLET_STORAGE_KEY);
      setResetMessage(
        "Card reset. Next time you open the wallet, it will start fresh from your starting balance."
      );
      setTimeout(() => setResetMessage(null), 2500);
    } catch (err) {
      console.warn("[info] failed to reset wallet", err);
      setResetMessage("Something went wrong resetting. Try again.");
      setTimeout(() => setResetMessage(null), 2500);
    }
  }

  const previewLine =
    amountMode === "fixed"
      ? `You'll appear to receive $${fixedAmount || "0.00"} from ${
          friendName.trim() || DEFAULT_CONFIG.friendName
        }.`
      : `You'll appear to receive a random amount between $${minAmount || "10"} and $${
          maxAmount || "50"
        } from ${friendName.trim() || DEFAULT_CONFIG.friendName}.`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f2f2f7",
        padding: "0.75rem 0.75rem 2rem",
        fontFamily: "-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            position: "relative",
          }}
        >
          {/* Left spacer to keep title centered */}
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
                color: "#111827",
                letterSpacing: 0.25,
              }}
            >
              Settings
            </span>
          </div>

          {/* Black Save button on the right */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "#000000",
              border: "none",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 999,
              minWidth: 72,
              opacity: saving ? 0.85 : 1,
            }}
          >
            Save
          </button>
        </header>

        {/* Section label */}
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
          Prank Configuration
        </div>

        {/* Preview card */}
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
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            Preview
          </div>
          <div
            style={{
              fontSize: 17,
              lineHeight: 1.4,
              color: "#111827",
            }}
          >
            {previewLine}
          </div>
        </section>

        {/* Config card */}
        <section
          style={{
            borderRadius: 16,
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
            marginBottom: "1.0rem",
          }}
        >
          {/* Amount mode toggle */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#111827",
                marginBottom: 6,
              }}
            >
              Amount Mode
            </div>
            <div
              style={{
                display: "inline-flex",
                borderRadius: 999,
                backgroundColor: "#e5e7eb",
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setAmountMode("fixed")}
                style={{
                  padding: "4px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  backgroundColor: amountMode === "fixed" ? "#fff" : "transparent",
                  color: amountMode === "fixed" ? "#111827" : "#4b5563",
                  boxShadow:
                    amountMode === "fixed" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                }}
              >
                Fixed
              </button>
              <button
                type="button"
                onClick={() => setAmountMode("range")}
                style={{
                  padding: "4px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  backgroundColor: amountMode === "range" ? "#fff" : "transparent",
                  color: amountMode === "range" ? "#111827" : "#4b5563",
                  boxShadow:
                    amountMode === "range" ? "0 1px 2px rgba(0,0,0,0.15)" : "none",
                }}
              >
                Range
              </button>
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              Choose one exact amount, or a random range for more realism.
            </div>
          </div>

          {/* Fixed amount row */}
          {amountMode === "fixed" && (
            <div
              style={{
                padding: "0.75rem 0.9rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  color: "#111827",
                }}
              >
                Fixed amount
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    marginRight: 4,
                    color: "#111827",
                  }}
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="67.00"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    padding: "4px 0",
                    background: "transparent",
                    color: "#111827",
                    flex: 1,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                This is the exact amount that will show in the payment popup.
              </div>
            </div>
          )}

          {/* Range rows */}
          {amountMode === "range" && (
            <div
              style={{
                padding: "0.75rem 0.9rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  color: "#111827",
                }}
              >
                Random range
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: "#f3f4f6",
                    padding: "4px 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      marginRight: 4,
                      color: "#6b7280",
                    }}
                  >
                    Min
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      marginRight: 2,
                      color: "#111827",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="10"
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      padding: "4px 0",
                      background: "transparent",
                      color: "#111827",
                      flex: 1,
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: "#f3f4f6",
                    padding: "4px 8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      marginRight: 4,
                      color: "#6b7280",
                    }}
                  >
                    Max
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      marginRight: 2,
                      color: "#111827",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="50"
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      padding: "4px 0",
                      background: "transparent",
                      color: "#111827",
                      flex: 1,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                }}
              >
                Each time you tap the card, a new amount in this range will be used.
              </div>
            </div>
          )}

          {/* Friend (sender) */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#111827",
              }}
            >
              Friend&apos;s name (sender)
            </div>
            <input
              type="text"
              placeholder="Apple Pay"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: 16,
                padding: "4px 0",
                background: "transparent",
                color: "#111827",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              This is who it will look like the money is coming from.
            </div>
          </div>

          {/* Your name (receiver) */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#111827",
              }}
            >
              Your name (receiver)
            </div>
            <input
              type="text"
              placeholder="You"
              value={pranksterName}
              onChange={(e) => setPranksterName(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: 16,
                padding: "4px 0",
                background: "transparent",
                color: "#111827",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              This is who it will look like the money was sent to.
            </div>
          </div>

          {/* Starting balance */}
          <div
            style={{
              padding: "0.75rem 0.9rem",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#111827",
              }}
            >
              Starting balance on card
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  marginRight: 4,
                  color: "#111827",
                }}
              >
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="105"
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: 16,
                  padding: "4px 0",
                  background: "transparent",
                  color: "#111827",
                  flex: 1,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              This is the balance your card shows when there&apos;s no saved history
              yet (or after you reset transactions).
            </div>
          </div>
        </section>

        {/* Reset & disclaimer */}
        <section
          style={{
            borderRadius: 16,
            backgroundColor: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Reset wallet row */}
          <button
            type="button"
            onClick={handleResetWallet}
            style={{
              width: "100%",
              padding: "0.85rem 0.9rem",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: "#dc2626",
                fontWeight: 500,
              }}
            >
              Reset card &amp; history
            </span>
            <span
              style={{
                fontSize: 13,
                color: "#9ca3af",
              }}
            >
              Start fresh from your starting balance
            </span>
          </button>

          {resetMessage && (
            <div
              style={{
                padding: "0 0.9rem 0.75rem",
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              {resetMessage}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              height: 1,
              backgroundColor: "#e5e7eb",
              margin: "0 0.9rem",
            }}
          />

          {/* About / disclaimer */}
          <div
            style={{
              padding: "0.8rem 0.9rem 0.95rem",
              fontSize: 12,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 4,
                color: "#4b5563",
              }}
            >
              About this app
            </div>
            This is a visual prank tool only. No real money is being sent or
            received. Use it responsibly, and don&apos;t use it to scam, harass,
            or mislead people about actual payments.
          </div>
        </section>
      </div>
    </main>
  );
}
