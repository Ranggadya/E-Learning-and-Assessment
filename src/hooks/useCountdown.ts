"use client";

import { useEffect, useRef, useState } from "react";

// Hitung mundur berbasis jam sistem (bukan menghitung tick) agar tetap akurat
// walau tab sempat di-background dan interval ditunda browser.
export function useCountdown(totalSeconds: number, onExpire: () => void): number {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds);
  const onExpireRef = useRef<() => void>(onExpire);

  useEffect(
    function keepLatestCallback() {
      onExpireRef.current = onExpire;
    },
    [onExpire],
  );

  useEffect(
    function runCountdown() {
      const endTimestamp = Date.now() + totalSeconds * 1000;
      let hasExpired = false;

      function tick() {
        const secondsLeft = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
        setRemainingSeconds(secondsLeft);
        if (secondsLeft === 0 && !hasExpired) {
          hasExpired = true;
          window.clearInterval(intervalId);
          onExpireRef.current();
        }
      }

      const intervalId = window.setInterval(tick, 250);
      return function stopCountdown() {
        window.clearInterval(intervalId);
      };
    },
    [totalSeconds],
  );

  return remainingSeconds;
}
