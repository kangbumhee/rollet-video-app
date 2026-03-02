'use client';

import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock 활성화');

        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock 해제됨');
        });
      }
    } catch (err) {
      console.log('Wake Lock 실패:', err);
    }
  };

  useEffect(() => {
    void requestWakeLock();

    // 탭이 다시 보일 때 재요청 (브라우저가 백그라운드에서 자동 해제하므로)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        void wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
