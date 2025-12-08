// lib/usePrankEngine.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrankConfig } from "./types";

type Status = "idle" | "countdown" | "completed";

type Options = {
  onPlaySound?: () => void;
};

export function usePrankEngine(
  baseBalance: number,
  config: PrankConfig,
  options?: Options
) {
  const [status, setStatus] = useState<Status>("idle");
  const [displayBalance, setDisplayBalance] = useState(baseBalance);
  const [prankAmount, setPrankAmount] = useState<number | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(
    null
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const triggerPrank = useCallback(() => {
    // Don't start a new one if we're already counting down
    if (status === "countdown") return;

    // Allow restarting after "completed" — treat it like idle
    clearTimer();

    // Reset core state at the start of each prank
    setDisplayBalance(baseBalance);
    setCountdownRemaining(null);
    setPrankAmount(null);

    // Determine prank amount
    let amount = 20;
    if (
      config.amountMode === "fixed" &&
      typeof config.fixedAmount === "number"
    ) {
      amount = config.fixedAmount;
    } else if (
      config.amountMode === "range" &&
      typeof config.minAmount === "number" &&
      typeof config.maxAmount === "number"
    ) {
      const min = config.minAmount;
      const max = config.maxAmount;
      amount = min + Math.random() * (max - min);
    }

    setPrankAmount(amount);

    // Countdown: baseBalance → 100
    const start = baseBalance; // e.g. 105
    const end = 100; // where countdown stops
    let current = start;

    const steps = Math.max(start - end, 1); // e.g. 105 → 100 = 5 steps

    setDisplayBalance(start);
    setCountdownRemaining(steps);
    setStatus("countdown");

    intervalRef.current = setInterval(() => {
      current -= 1;

      setDisplayBalance(current);
      setCountdownRemaining((prev) =>
        prev !== null ? Math.max(prev - 1, 0) : null
      );

      if (current <= end) {
        // Reached 100 → finish countdown
        clearTimer();
        setCountdownRemaining(null);

        // 🔊 play sound right at 100 (if provided)
        if (options?.onPlaySound) {
          options.onPlaySound();
        }

        // After a tiny pause, ADD the prank amount to 100
        setTimeout(() => {
          const finalBalance = Number((end + amount).toFixed(2));
          setDisplayBalance(finalBalance);
          setStatus("completed");

          // 🔁 Auto-reset back to idle quickly so the next tap works again
          setTimeout(() => {
            setStatus("idle");
          }, 50);
        }, 250);

        // SMS stub still fires after 12 seconds
        setTimeout(() => {
          console.log("🔔 [stub] would send prank SMS now", {
            config,
            amount,
          });
        }, 12000);
      }
    }, 1000);
  }, [status, config, baseBalance, options]);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return {
    status,
    displayBalance,
    prankAmount,
    countdownRemaining,
    triggerPrank,
  };
}
