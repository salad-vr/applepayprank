// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(src);
    audio.preload = "auto";

    const handleCanPlay = () => {
      console.log("[sound] loaded:", src);
    };

    const handleError = (e: any) => {
      console.error("[sound] failed to load:", src, e);
    };

    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("error", handleError);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null;
      primedRef.current = false;
    };
  }, [src]);

  // Called on first tap, directly in the click handler – to satisfy iOS
  const prime = useCallback(() => {
    if (primedRef.current) return;
    if (!audioRef.current) {
      console.warn("[sound] cannot prime, audioRef is null:", src);
      return;
    }

    try {
      audioRef.current.muted = true;
      const p = audioRef.current.play();
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          console.warn("[sound] prime play() rejected:", err);
        });
      }

      // Stop it almost immediately and reset
      setTimeout(() => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        primedRef.current = true;
        console.log("[sound] primed:", src);
      }, 50);
    } catch (err) {
      console.warn("[sound] prime failed:", err);
    }
  }, [src]);

  const play = useCallback(async () => {
    if (!audioRef.current) {
      console.warn("[sound] audioRef is null when trying to play:", src);
      return;
    }

    try {
      audioRef.current.currentTime = 0;
      const result = audioRef.current.play();
      if (result && typeof result.then === "function") {
        await result;
      }
      console.log("[sound] play succeeded:", src);
    } catch (err) {
      console.error("[sound] play blocked or failed:", err);
    }
  }, [src]);

  return { play, prime };
}
