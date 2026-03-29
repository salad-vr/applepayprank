// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

type UseSoundOptions = {
  volume?: number;
};

/**
 * Robust sound hook for iOS PWAs / home-screen web apps.
 *
 * Uses Web Audio API (AudioContext) as primary engine with HTMLAudioElement
 * fallback. Handles iOS background suspension, audio context interruption,
 * and stale element recovery.
 *
 * Key design:
 * - Singleton AudioContext shared across hook instances
 * - Sound pre-decoded into AudioBuffer for instant playback
 * - Global touch/click listeners keep the context alive
 * - visibilitychange listener resumes context + re-creates fallback element
 * - play() should still be called from a user gesture for best reliability
 */

// ---- Singleton AudioContext ----
let sharedCtx: AudioContext | null = null;
let globalListenersAttached = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!sharedCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    try {
      sharedCtx = new Ctor();
    } catch {
      return null;
    }
  }

  return sharedCtx;
}

/**
 * Resume the shared AudioContext. Safe to call repeatedly.
 * Must be called from a user gesture on iOS to actually unlock.
 */
function resumeContext() {
  const ctx = sharedCtx;
  if (!ctx) return;

  if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
    ctx.resume().catch(() => {
      // ignore -- we'll try again on the next gesture
    });
  }
}

/**
 * Attach global listeners ONCE so every tap/click keeps the context alive.
 * Also handles visibilitychange for returning from background.
 */
function ensureGlobalListeners() {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;

  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener("touchstart", resumeContext, opts);
  window.addEventListener("touchend", resumeContext, opts);
  window.addEventListener("click", resumeContext, opts);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      resumeContext();
    }
  });
}

export function useSound(src: string, options?: UseSoundOptions) {
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const srcRef = useRef(src);
  const volumeRef = useRef(options?.volume ?? 1);

  // ---- Setup: decode buffer + create fallback element ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    srcRef.current = src;
    volumeRef.current = options?.volume ?? 1;

    const ctx = getAudioContext();
    ensureGlobalListeners();

    let cancelled = false;

    // --- Web Audio API: fetch + decode into buffer ---
    if (ctx) {
      fetch(src)
        .then((res) => res.arrayBuffer())
        .then((raw) => ctx.decodeAudioData(raw))
        .then((decoded) => {
          if (!cancelled) {
            audioBufferRef.current = decoded;
          }
        })
        .catch((err) => {
          console.warn("[useSound] failed to decode audio buffer", err);
        });
    }

    // --- HTMLAudioElement fallback ---
    const audio = createFallbackElement(src, volumeRef.current);
    fallbackAudioRef.current = audio;

    // --- Recreate fallback on visibility change (stale element recovery) ---
    function handleVisibility() {
      if (!document.hidden && !cancelled) {
        const fresh = createFallbackElement(srcRef.current, volumeRef.current);
        fallbackAudioRef.current = fresh;
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);

      try {
        if (fallbackAudioRef.current) {
          fallbackAudioRef.current.pause();
          fallbackAudioRef.current.removeAttribute("src");
          fallbackAudioRef.current.load();
        }
      } catch {
        // ignore
      }
      fallbackAudioRef.current = null;
      audioBufferRef.current = null;
    };
  }, [src, options?.volume]);

  /**
   * Prime the audio system. Call from the FIRST user gesture
   * (e.g. the initial card tap) to ensure iOS unlocks audio.
   */
  const prime = useCallback(() => {
    getAudioContext();
    resumeContext();

    const audio = fallbackAudioRef.current;
    if (audio && audio.readyState < 2) {
      try {
        audio.load();
      } catch {
        // ignore
      }
    }
  }, []);

  /**
   * Play the sound. Call directly inside an onClick/onTap handler.
   * Tries AudioContext first, falls back to HTMLAudioElement.
   */
  const play = useCallback(() => {
    // Always try to resume in the same gesture
    resumeContext();

    const ctx = sharedCtx;
    const buffer = audioBufferRef.current;

    // --- Primary: Web Audio API ---
    if (ctx && buffer && ctx.state === "running") {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = volumeRef.current;
        source.connect(gain);
        gain.connect(ctx.destination);

        source.start(0);
        return; // success
      } catch (err) {
        console.warn("[useSound] AudioContext play failed, trying fallback", err);
      }
    }

    // --- Fallback: HTMLAudioElement ---
    const audio = fallbackAudioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const maybePromise = audio.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch((err: unknown) => {
          console.warn("[useSound] fallback play blocked or failed", err);
        });
      }
    } catch (err) {
      console.warn("[useSound] fallback play error", err);
    }
  }, []);

  return { play, prime };
}

// ---- Helper ----

function createFallbackElement(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.volume = volume;
  return audio;
}
