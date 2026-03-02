// src/hooks/useGameCountdown.ts
"use client";

import { useState, useEffect, useRef } from "react";

interface UseGameCountdownOptions {
  targetTime: number; // roundEndsAt (Unix ms)
  onComplete?: () => void;
  enabled?: boolean;
}

export function useGameCountdown({ targetTime, onComplete, enabled = true }: UseGameCountdownOptions) {
  const [remaining, setRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled || !targetTime) {
      setRemaining(0);
      setIsExpired(false);
      return;
    }

    let expired = false;
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const seconds = Math.ceil(diff / 1000);
      setRemaining(seconds);

      if (diff <= 0 && !expired) {
        expired = true;
        setIsExpired(true);
        onCompleteRef.current?.();
      }
    };

    tick();
    const interval = setInterval(tick, 100); // 100ms 정밀도

    return () => clearInterval(interval);
  }, [targetTime, enabled]);

  return {
    remaining,
    isExpired,
    percentage: targetTime ? Math.max(0, Math.min(100, (remaining / 5) * 100)) : 0,
  };
}
