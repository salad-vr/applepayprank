// lib/useHaptic.ts
"use client";

import { useCallback, useRef } from "react";

/**
 * Haptic feedback for web apps.
 *
 * Strategy:
 * 1. navigator.vibrate() — works on Android Chrome, some other browsers
 * 2. Audio impulse via Web Audio API — creates a physical "thud" by playing
 *    a very short, loud, low-frequency burst. On iPhone with sound/ringer on,
 *    this produces a noticeable physical vibration through the speakers.
 *    Works best when the phone isn't on silent mode.
 *
 * Must be called inside a user gesture (tap/click) to keep AudioContext unlocked.
 */

export function useHaptic() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext | null {
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      return ctxRef.current;
    }
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctxRef.current = new Ctor();
      return ctxRef.current;
    } catch {
      return null;
    }
  }

  function playThud(ctx: AudioContext, delay = 0) {
    const now = ctx.currentTime + delay;

    // Oscillator: low frequency sine for physical "thump"
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.08);

    // Gain envelope: sharp attack, fast decay
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  function playTick(ctx: AudioContext, delay = 0) {
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  const vibrate = useCallback((pattern?: "tick" | "thud" | "success") => {
    // Android / Chrome: Vibration API
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        switch (pattern) {
          case "tick":
            navigator.vibrate(10);
            break;
          case "success":
            navigator.vibrate([10, 60, 30, 60, 10]);
            break;
          case "thud":
          default:
            navigator.vibrate([15, 50, 30]);
            break;
        }
      } catch {
        // fall through to audio
      }
    }

    // iOS / fallback: Audio impulse (always attempt — adds physical feel even on Android)
    const ctx = getCtx();
    if (!ctx) return;

    const resume = () => {
      try {
        switch (pattern) {
          case "tick":
            playTick(ctx);
            break;
          case "success":
            playTick(ctx, 0);
            playThud(ctx, 0.08);
            playTick(ctx, 0.18);
            break;
          case "thud":
          default:
            playTick(ctx, 0);
            playThud(ctx, 0.06);
            break;
        }
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
