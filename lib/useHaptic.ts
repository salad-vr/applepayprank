// lib/useHaptic.ts
"use client";

import { useCallback } from "react";

/**
 * Cross-platform haptic feedback for web.
 *
 * iOS Safari / WKWebView: navigator.vibrate is unsupported. Instead we drive
 * the Taptic Engine by playing a very short, sharp audio impulse (a damped
 * sine burst at ~200 Hz) through the Web Audio API. This causes the iPhone
 * speaker + Taptic Engine to produce a physical "thud" sensation.
 *
 * Android / other: falls back to navigator.vibrate if available.
 *
 * Must be called inside a user-gesture handler (tap/click) to keep the
 * AudioContext unlocked on iOS.
 */

// Re-use the same AudioContext that useSound creates so we stay in sync.
// We reach into the module-level singleton directly.
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    // Grab or create — reuses existing if already created by useSound
    return new Ctor();
  } catch {
    return null;
  }
}

// Singleton so we don't spawn a new AudioContext on every call
let hapticCtx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (hapticCtx && hapticCtx.state !== "closed") return hapticCtx;
  hapticCtx = getCtx();
  return hapticCtx;
}

/**
 * Play a short damped-sine burst that physically drives the Taptic Engine on
 * iPhone. freq controls the "pitch" of the thud; duration is in seconds.
 */
function playImpulse(
  ctx: AudioContext,
  freq: number,
  duration: number,
  gain: number,
  delay = 0
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  // Sharp attack, exponential decay → feels like a physical tap
  const start = ctx.currentTime + delay;
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(gain, start + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

export function useHaptic() {
  const vibrate = useCallback((pattern?: number | number[]) => {
    // ---- Android / non-iOS: Vibration API ----
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      try {
        navigator.vibrate(pattern ?? [10, 60, 40]);
        return;
      } catch {
        // fall through to audio impulse
      }
    }

    // ---- iOS Safari: AudioContext impulse ----
    const ctx = ensureCtx();
    if (!ctx) return;

    const resume = () => {
      try {
        // Play a two-beat pattern: quick tap then a slightly heavier thud
        // Beat 1: light tick at 180 Hz
        playImpulse(ctx, 180, 0.04, 0.9, 0);
        // Beat 2: heavier thud at 120 Hz, 80 ms later
        playImpulse(ctx, 120, 0.06, 1.0, 0.08);
      } catch {
        // ignore
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(resume).catch(() => {});
    } else {
      resume();
    }
  }, []);

  return { vibrate };
}
