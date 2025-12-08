// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * This version aggressively primes audio on iOS Home Screen PWAs.
 * It performs:
 * 1. A muted play → pause → reset (true gesture unlock)
 * 2. A second delayed unlock (for Safari PWA flakiness)
 * After this, ANY delayed play (even 5+ seconds later) should succeed.
 */

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    console.log("[sound] created audio:", src);

    return () => {
      audio.pause();
      audioRef.current = null;
      primedRef.current = false;
    };
  }, [src]);

  // 🔥 HARD PRIMING — must run on actual UI tap
  const prime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[sound] cannot prime, audioRef null");
      return;
    }
    if (primedRef.current) {
      console.log("[sound] already primed");
      return;
    }

    console.log("[sound] PRIMING START...");

    try {
      // Step 1 — muted, gesture-based play
      audio.muted = true;
      audio.currentTime = 0;

      const p = audio.play();
      if (p && p.catch) p.catch(() => {});

      // Step 2 — pause + reset shortly after
      setTimeout(() => {
        if (!audioRef.current) return;
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;

        console.log("[sound] first unlock complete");

        // Step 3 — second unlock (ensures iOS PWA consistency)
        setTimeout(() => {
          const a2 = audioRef.current;
          if (!a2) return;

          a2.muted = true;
          a2.currentTime = 0;
          const p2 = a2.play();
          if (p2 && p2.catch) p2.catch(() => {});

          setTimeout(() => {
            if (!audioRef.current) return;
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.muted = false;

            primedRef.current = true;
            console.log("[sound] FULLY PRIMED ✔️", src);
          }, 50);
        }, 250);
      }, 80);
    } catch (err) {
      console.warn("[sound] prime failed:", err);
    }
  }, []);

  // Called at the moment the effect fires (5 seconds later)
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[sound] play failed: audioRef null");
      return;
    }

    try {
      audio.currentTime = 0;
      const result = audio.play();
      if (result?.then) await result;

      console.log("[sound] PLAYED SUCCESSFULLY:", src);
    } catch (err) {
      console.error("[sound] PLAY BLOCKED:", err);
    }
  }, []);

  return { play, prime };
}
