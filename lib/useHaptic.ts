// lib/useHaptic.ts
"use client";

import { useCallback } from "react";

/**
 * Thin wrapper around the Vibration API for haptic feedback.
 * Mimics the subtle double-tap feel of Apple Pay confirmation.
 * No-ops gracefully on devices/browsers that don't support it.
 */
export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[] = [15, 30, 15]) => {
    if (typeof navigator === "undefined") return;
    if (!navigator.vibrate) return;

    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore -- not supported or blocked
    }
  }, []);

  return { vibrate };
}
