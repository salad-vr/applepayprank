// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Super simple sound hook:
 * - Preloads the audio file once.
 * - `play()` resets to the start and plays the sound.
 * - `prime()` is a no-op, kept only so existing code that calls it won't break.
 *
 * Your 5-second delay logic stays in usePrankEngine — this just plays
 * the sound when `play()` is actually called.
 */

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    console.log("[sound] created audio:", src);

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  // Called by usePrankEngine when the countdown finishes
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[sound] play failed: audioRef null");
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play(); // basic, no tricks
      console.log("[sound] PLAYED:", src);
    } catch (err) {
      console.error("[sound] PLAY BLOCKED OR FAILED:", err);
    }
  }, []);

  // Kept for compatibility with existing code (handleCardClick calls prime())
  // but intentionally does nothing now.
  const prime = useCallback(() => {
    console.log("[sound] prime() called (no-op in simple mode)");
  }, []);

  return { play, prime };
}
