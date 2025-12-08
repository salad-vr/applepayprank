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
    if (status !== "idle") return;

    // Decide how much we're "sending"
    let amount = 20;
    if (config.amountMode === "fixed" && typeof config.fixedAmount === "number")
      amount = config.fixedAmount;
    else if (
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
    setCountdownRemaining(5);
    setDisplayBalance(baseBalance);

    const targetBalance = baseBalance - amount;
    const steps = 5;
    const stepSize = (baseBalance - targetBalance) / steps;
    let ticks = 0;

    intervalRef.current = setInterval(() => {
      ticks += 1;
      setCountdownRemaining(steps - ticks);

      setDisplayBalance((prev) => {
        const next = prev - stepSize;
        return Number(next.toFixed(2));
      });

      if (ticks >= steps) {
        clearTimer();
        setStatus("completed");
        setCountdownRemaining(null);

        // play sound
        options?.onPlaySound?.();

        // schedule SMS stub after ~12s
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
