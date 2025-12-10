// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

type UseSoundOptions = {
  volume?: number;
};

/**
 * iOS / PWA-friendly sound hook.
 *
 * - Creates ONE <audio> element and preloads it.
 * - `prime()` MUST be called from a real user gesture (onClick/onTap).
 *   It "unlocks" audio on Safari/iOS.
 * - After that, `play()` can be called from timeouts, effects, etc.
 */
export function useSound(src: string, options?: UseSoundOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const primedRef = useRef(false);

  // Create + preload audio element once per src
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
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
      primedRef.current = false;
    };
  }, [src, options?.volume]);

  /**
   * Call this FROM A REAL TAP (card press, etc.).
   * It plays silently once to "unlock" audio on iOS.
   */
  const prime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || primedRef.current) return;

    // Try to play VERY briefly to satisfy Safari's gesture requirement.
    audio.volume = options?.volume ?? 1;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        primedRef.current = true;
      })
      .catch(() => {
        // If this fails, we'll try again on the next tap.
      });
  }, [options?.volume]);

  /**
   * Play the sound. Works reliably AFTER a successful prime().
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
