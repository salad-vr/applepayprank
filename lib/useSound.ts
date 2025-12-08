// lib/useSound.ts
"use client";

import { useEffect, useRef } from "react";

export function useSound(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, [src]);

  async function play() {
    try {
      await audioRef.current?.play();
    } catch (err) {
      console.warn("Sound play blocked or failed", err);
    }
  }

  return { play };
}
