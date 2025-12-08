// lib/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * iOS-friendly sound hook.
 *
 * Key ideas:
 * - Create a single HTMLAudioElement and preload it.
 * - `prime()` is meant to be called from a REAL user gesture
 *   (e.g. onClick). It "unlocks" audio on iOS by playing at
 *   volume 0 and immediately pausing.
 * - `play()` then reliably plays the sound, including when called
 *   later from timers (e.g. after your 5-second countdown).
 */

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const primedRef = useRef(false);

  // Create / recreate the audio element whenever src changes
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          // Clean up the src so iOS doesn’t hold resources forever
          audioRef.current.src = "";
          audioRef.current.load();
        } catch {
          // ignore
        }
        audioRef.current = null;
      }
    };
  }, [src]);

  /**
   * Call this directly from a user gesture (e.g. onClick).
   * It "unlocks" audio on iOS by doing a muted play/pause once.
   */
  const prime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (primedRef.current) return;

    const previousVolume = audio.volume;
    audio.volume = 0;

    audio
      .play()
      .then(() => {
        // Immediately pause + reset so there’s no audible blip
        audio.pause();
        audio.currentTime = 0;
        audio.volume = previousVolume;
        primedRef.current = true;
        console.log("[sound] primed successfully");
      })
      .catch((err) => {
        audio.volume = previousVolume;
        console.log("[sound] prime blocked or failed:", err);
        // Even if this fails, we tried; next real click may succeed.
      });
  }, []);

  /**
   * Play the sound. Safe to call from timers AFTER at least one
   * `prime()` from a user gesture has succeeded.
   */
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      console.warn("[sound] no audio instance available");
      return;
    }

    // Always reset to start
    audio.currentTime = 0;

    audio
      .play()
      .then(() => {
        console.log("[sound] played:", src);
      })
      .catch((err) => {
        console.error("[sound] play blocked or failed:", err);

        // If iOS killed the audio element after suspend/resume,
        // try rebuilding it for future calls.
        try {
          const newAudio = new Audio(src);
          newAudio.preload = "auto";
          audioRef.current = newAudio;
          primedRef.current = false; // will need a new prime()
        } catch {
          // ignore
        }
      });
  }, [src]);

  return { play, prime };
}
