// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * This version aggressively primes audio on iOS Home Screen PWAs.
 * It performs:
 * 1. A muted play → pause → reset (true gesture unlock)
 * 2. A second delayed unlock (for Safari PWA flakiness)
 * After this, ANY delayed play (even 5+ seconds later) should be allowed
 * as long as the user tapped the screen and the device isn't muted.
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

  // 🔥 HARD PRIMING — must run inside an actual user tap (onClick)
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

      audio
        .play()
        .catch((err) =>
          console.warn("[sound] first prime play() rejected:", err)
        );

      // Step 2 — pause + reset shortly after
      setTimeout(() => {
        if (!audioRef.current) return;

        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;

        console.log("[sound] first unlock complete");

        // Step 3 — second tiny unlock to make PWAs extra happy
        setTimeout(() => {
          const a2 = audioRef.current;
          if (!a2) return;

          a2.muted = true;
          a2.currentTime = 0;

          a2
            .play()
            .catch((err) =>
              console.warn("[sound] second prime play() rejected:", err)
            );

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

  // Called at the moment the effect fires (e.g. 5 seconds after tap)
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[sound] play failed: audioRef null");
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play(); // Promise<void> — no extra checks needed
      console.log("[sound] PLAYED SUCCESSFULLY:", src);
    } catch (err) {
      console.error("[sound] PLAY BLOCKED:", err);
    }
  }, []);

  return { play, prime };
}
