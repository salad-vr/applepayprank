// lib/usePrankEngine.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrankConfig } from "./types";

type Status = "idle" | "countdown" | "completed";

type Options = {
  onPlaySound?: () => void; // ignored for now but kept for future use
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
    if (status !== "idle") return;

    // Determine prank amount
    let amount = 20;
    if (config.amountMode === "fixed" && typeof config.fixedAmount === "number") {
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
    setStatus("countdown");

    // Countdown: baseBalance → 100
    const start = baseBalance;      // usually 105
    const end = 100;                // where countdown stops
    let current = start;

    const steps = start - end;      // e.g. 105 → 100 = 5 steps

    setDisplayBalance(start);
    setCountdownRemaining(steps);

    clearTimer();

    intervalRef.current = setInterval(() => {
      current -= 1;

      setDisplayBalance(current);
      setCountdownRemaining((prev) =>
        prev !== null ? prev - 1 : null
      );

      if (current <= end) {
        // Countdown reached 100
        clearTimer();
        setStatus("completed");
        setCountdownRemaining(null);

        // ✨ FINAL STEP:
        // After a tiny pause, ADD the prank amount to 100
        setTimeout(() => {
          const finalBalance = Number((end + amount).toFixed(2));
          setDisplayBalance(finalBalance);
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
