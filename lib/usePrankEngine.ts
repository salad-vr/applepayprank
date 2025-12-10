// lib/usePrankEngine.ts
"use client";

import { useCallback, useState } from "react";
import type { PrankConfig } from "./types";

/**
 * Lightweight prank engine aligned with the new flow.
 *
 * Right now the Wallet screen owns:
 * - the Apple Pay overlay (pending → success)
 * - the sound timing
 * - balance & transaction updates
 *
 * This hook is kept as a small helper so existing imports don't break.
 * It focuses on generating a prank amount based on the current config.
 */

export type PrankEngineStatus = "idle";

type Options = {
  // kept for backwards-compat; Wallet now calls useSound directly
  onPlaySound?: () => void;
};

export function usePrankEngine(
  baseBalance: number,
  config: PrankConfig,
  _options?: Options
) {
  const [status] = useState<PrankEngineStatus>("idle");
  const [displayBalance] = useState<number>(baseBalance);
  const [prankAmount, setPrankAmount] = useState<number | null>(null);

  /**
   * Generate a prank amount based on config.amountMode.
   * - "fixed" → fixedAmount (default 20)
   * - "range" → random between minAmount and maxAmount (defaults 10–50)
   */
  const triggerPrank = useCallback(() => {
    let amount: number;

    if (config.amountMode === "fixed" && typeof config.fixedAmount === "number") {
      amount = config.fixedAmount;
    } else if (config.amountMode === "range") {
      const min =
        typeof config.minAmount === "number" ? config.minAmount : 10;
      const max =
        typeof config.maxAmount === "number" ? config.maxAmount : 50;
      const raw = min + Math.random() * (max - min);
      amount = Number(raw.toFixed(2));
    } else {
      // Fallback if config is weird
      amount = 20;
    }

    setPrankAmount(amount);
    return amount;
  }, [config]);

  return {
    status,
    displayBalance,
    prankAmount,
    countdownRemaining: null as number | null,
    triggerPrank,
  };
}
