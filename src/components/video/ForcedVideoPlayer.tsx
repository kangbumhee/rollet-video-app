// src/components/video/ForcedVideoPlayer.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

interface ForcedVideoPlayerProps {
  videoURL: string;
  roomId: string;
  onComplete: () => void;
  minWatchPercent?: number;
}

export function ForcedVideoPlayer({
  videoURL,
  roomId,
  onComplete,
  minWatchPercent = 90,
}: ForcedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pauseWarning, setPauseWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchedSecondsRef = useRef(0);
  const totalDurationRef = useRef(0);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const currentProgress = (video.currentTime / video.duration) * 100;
    setProgress(Math.min(100, currentProgress));
    watchedSecondsRef.current = video.currentTime;
    totalDurationRef.current = video.duration;

    if (currentProgress >= minWatchPercent && !isCompleted) {
      setIsCompleted(true);
    }
  }, [minWatchPercent, isCompleted]);

  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime > watchedSecondsRef.current + 1) {
      video.currentTime = watchedSecondsRef.current;
    }
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    setPauseWarning(true);
    setTimeout(() => setPauseWarning(false), 3000);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPaused(false);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleVerify = async () => {
    try {
      const res = await apiClient('/api/video/verify', {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          watchedSeconds: watchedSecondsRef.current,
          totalDuration: totalDurationRef.current,
          watchPercent: progress,
        }),
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
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full max-w-lg aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={videoURL}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onPause={handlePause}
          onPlay={handlePlay}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              totalDurationRef.current = videoRef.current.duration;
            }
          }}
          playsInline
          autoPlay
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
        >
          브라우저가 동영상을 지원하지 않습니다.
        </video>

        <div
          className="absolute inset-0"
          onContextMenu={(e) => e.preventDefault()}
          style={{ pointerEvents: isPlaying ? 'none' : 'auto' }}
        />

        {pauseWarning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <p className="text-white font-medium mt-2">영상을 끝까지 시청해주세요!</p>
              <button
                onClick={() => videoRef.current?.play()}
                className="mt-3 px-4 py-2 bg-prize-600 text-white rounded-lg text-sm"
              >
                계속 시청하기
              </button>
            </div>
          </div>
        )}

        {isPaused && !pauseWarning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <button
              onClick={() => videoRef.current?.play()}
              className="px-6 py-3 bg-prize-600 text-white rounded-lg font-medium"
            >
              ▶ 다시 재생
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>시청 진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-prize-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{minWatchPercent}% 이상 시청해야 참가 티켓을 받을 수 있습니다</p>
      </div>

      {isCompleted ? (
        <button
          onClick={handleVerify}
          className="w-full max-w-lg py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
        >
          ✅ 시청 완료 - 티켓 받기
        </button>
      ) : (
        <div className="w-full max-w-lg py-3 bg-gray-700 text-gray-400 rounded-xl font-medium text-center">
          📹 영상을 시청해주세요 ({Math.round(progress)}% / {minWatchPercent}%)
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
