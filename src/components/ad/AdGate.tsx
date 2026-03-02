// src/components/ad/AdGate.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface AdGateProps {
  roomId: string;
  onComplete: () => void;
}

export function AdGate({ roomId, onComplete }: AdGateProps) {
  const [adState, setAdState] = useState<'loading' | 'showing' | 'completed' | 'error'>('loading');
  const [countdown, setCountdown] = useState(15);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAdState('showing'), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (adState !== 'showing') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAdState('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adState]);

  const handleVerify = useCallback(async () => {
    try {
      const res = await apiClient('/api/ad/verify', {
        method: 'POST',
        body: JSON.stringify({ roomId, watchDuration: 15 }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        onComplete();
      } else {
        setError(data.error || '인증 실패');
      }
    } catch {
      setError('네트워크 오류');
    }
  }, [roomId, onComplete]);

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <h3 className="text-lg font-bold text-white">🎫 입장 게이트</h3>
      <p className="text-sm text-gray-400">광고를 시청하고 참가 티켓을 받으세요</p>

      <div className="w-full max-w-md aspect-video bg-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden">
        {adState === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500 mb-2" />
            <p className="text-sm text-gray-500">광고 로딩 중...</p>
          </div>
        )}

        {adState === 'showing' && (
          <>
            <div className="flex flex-col items-center text-gray-400">
              <span className="text-5xl mb-2">📺</span>
              <p className="text-sm">광고가 재생 중입니다</p>
            </div>

            <div className="absolute top-3 right-3 bg-black/70 rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{countdown}</span>
            </div>
          </>
        )}

        {adState === 'completed' && (
          <div className="flex flex-col items-center text-green-400">
            <span className="text-5xl mb-2">✅</span>
            <p className="text-sm font-medium">광고 시청 완료!</p>
          </div>
        )}
      </div>

      {adState === 'completed' ? (
        <button
          onClick={handleVerify}
          className="w-full max-w-md py-3 bg-prize-600 hover:bg-prize-700 text-white rounded-xl font-bold transition-colors"
        >
          🎫 참가 티켓 받기
        </button>
      ) : (
        <div className="w-full max-w-md py-3 bg-gray-700 text-gray-400 rounded-xl font-medium text-center">
          {adState === 'loading' ? '광고를 불러오는 중...' : `${countdown}초 후 티켓을 받을 수 있습니다`}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
