// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

type UseSoundOptions = {
  volume?: number;
};

/**
 * Robust sound hook for iOS PWAs / home-screen web apps.
 *
 * Primary: Web Audio API (AudioContext) with pre-decoded AudioBuffer.
 * Fallback: HTMLAudioElement (re-created on visibility change).
 *
 * Key reliability measures:
 * - Singleton AudioContext with global gesture listeners to keep it alive
 * - visibilitychange handler resumes context + rebuilds fallback element
 * - play() attempts AudioContext first, catches errors, falls back to HTML5
 * - No crossOrigin on HTMLAudioElement (same-origin resource, avoids CORS issues)
 * - play() always called directly inside user tap handler
 */

// ---- Singleton AudioContext ----
let sharedCtx: AudioContext | null = null;
let globalListenersAttached = false;

function getOrCreateContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (sharedCtx) return sharedCtx;

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

  return sharedCtx;
}

/** Resume AudioContext — safe to call repeatedly from any gesture. */
function resumeContext() {
  const ctx = sharedCtx;
  if (!ctx) return;

  if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
    try {
      ctx.resume().catch(() => {});
    } catch {
      // older browsers may not return a promise
    }
  }
}

/** Attach global listeners ONCE so every tap keeps the context alive. */
function ensureGlobalListeners() {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;

  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener("touchstart", resumeContext, opts);
  window.addEventListener("touchend", resumeContext, opts);
  window.addEventListener("click", resumeContext, opts);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resumeContext();
  });
}

export function useSound(src: string, options?: UseSoundOptions) {
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const fallbackRef = useRef<HTMLAudioElement | null>(null);
  const srcRef = useRef(src);
  const volumeRef = useRef(options?.volume ?? 1);

  useEffect(() => {
    if (typeof window === "undefined") return;

    srcRef.current = src;
    volumeRef.current = options?.volume ?? 1;

    const ctx = getOrCreateContext();
    ensureGlobalListeners();

    let cancelled = false;

    // ---- Web Audio API: fetch + decode ----
    if (ctx) {
      fetch(src)
        .then((r) => r.arrayBuffer())
        .then((raw) => ctx.decodeAudioData(raw))
        .then((decoded) => {
          if (!cancelled) audioBufferRef.current = decoded;
        })
        .catch((err) => {
          console.warn("[useSound] buffer decode failed:", err);
        });
    }

    // ---- HTMLAudioElement fallback ----
    const audio = makeFallback(src, volumeRef.current);
    fallbackRef.current = audio;

    // Re-create fallback when app returns from background (stale element fix)
    function onVisibility() {
      if (!document.hidden && !cancelled) {
        fallbackRef.current = makeFallback(srcRef.current, volumeRef.current);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        fallbackRef.current?.pause();
      } catch { /* ignore */ }
      fallbackRef.current = null;
      audioBufferRef.current = null;
    };
  }, [src, options?.volume]);

  /**
   * Prime audio on a user gesture. Call this from the first tap
   * (card tap) so iOS unlocks audio before we actually need it.
   */
  const prime = useCallback(() => {
    // Create context if it doesn't exist yet, then resume it
    getOrCreateContext();
    resumeContext();

    // Also kick the fallback element's load
    const audio = fallbackRef.current;
    if (audio) {
      try {
        audio.load();
      } catch { /* ignore */ }
    }
  }, []);

  /**
   * Play the sound. MUST be called directly inside an onClick / onTouchEnd
   * handler for iOS reliability. Tries Web Audio first, HTML5 Audio fallback.
   */
  const play = useCallback(() => {
    // Always resume in the same gesture tick
    resumeContext();

    const ctx = sharedCtx;
    const buffer = audioBufferRef.current;

    // ---- Primary: Web Audio API ----
    // Don't gate on ctx.state — just try. If it's still resuming, the
    // scheduled source will play once the context actually runs.
    if (ctx && buffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = volumeRef.current;
        source.connect(gain);
        gain.connect(ctx.destination);

        source.start(0);
        return; // success path
      } catch (err) {
        console.warn("[useSound] Web Audio play failed:", err);
      }
    }

    // ---- Fallback: HTMLAudioElement ----
    const audio = fallbackRef.current;
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch((err: unknown) => {
          console.warn("[useSound] HTML5 Audio play failed:", err);
        });
      }
    } catch (err) {
      console.warn("[useSound] HTML5 Audio error:", err);
    }
  }, []);

  return { play, prime };
}

/** Create a plain HTMLAudioElement. No crossOrigin (same-origin resource). */
function makeFallback(src: string, volume: number): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = volume;
  return a;
}
