// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

type UseSoundOptions = {
  volume?: number;
};

/**
 * Simple, reliable sound hook for web / iOS.
 *
 * - Creates ONE <audio> element and preloads it.
 * - `play()` should be called from a real user gesture (onClick/onTap)
 *   for best reliability. In our app, it is.
 * - `prime()` is kept for backwards compatibility but is effectively a no-op.
 */
export function useSound(src: string, options?: UseSoundOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create + preload audio element once per src
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    if (typeof options?.volume === "number") {
      audio.volume = options.volume;
    }

    audioRef.current = audio;

    return () => {
      try {
        audio.pause();
      } catch {
        // ignore
      }
      audioRef.current = null;
    };
  }, [src, options?.volume]);

  /**
   * Backwards-compatible stub.
   * We *could* try to unlock here, but in this app `play()` is already
   * called from a real tap, so we don't need complex priming logic.
   */
  const prime = useCallback(() => {
    // no-op on purpose; kept so existing calls don't break
    const audio = audioRef.current;
    if (!audio) return;

    // Light-touch: ensure audio is loaded; don't actually try to play.
    if (audio.readyState < 2) {
      // Kick the network load if needed
      try {
        audio.load();
      } catch {
        // ignore
      }
    }
  }, []);

  /**
   * Play the sound. For best results, call this directly inside
   * an onClick/onTap handler (which you are doing in WalletScreen).
   */
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const maybePromise = audio.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch((err) => {
          // When Safari still complains, don't crash the UI
          console.warn("[useSound] play blocked or failed", err);
        });
      }
    } catch (err) {
      console.warn("[useSound] play error", err);
    }
  }, []);

  return { play, prime };
}
