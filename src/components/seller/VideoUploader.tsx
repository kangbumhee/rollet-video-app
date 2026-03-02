// src/components/seller/VideoUploader.tsx
'use client';

import React, { useState, useRef } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { generateId } from '@/lib/utils';

interface VideoUploaderProps {
  onUploadComplete: (url: string, duration: number) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('동영상 파일만 업로드할 수 있습니다.');
      return;
    }

    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('파일 크기는 100MB 이하여야 합니다.');
      return;
    }

    setError(null);
    setUploading(true);

    const tempURL = URL.createObjectURL(file);
    setPreviewURL(tempURL);
    const duration = await getVideoDuration(tempURL);

    const fileId = generateId();
    const fileRef = storageRef(storage, `videos/${fileId}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(pct));
      },
      (err) => {
        setError('업로드 실패: ' + err.message);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);
        onUploadComplete(downloadURL, duration);
      }
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-300">제품 영상 업로드</label>

      {previewURL ? (
        <div className="space-y-2">
          <video src={previewURL} className="w-full aspect-video bg-black rounded-xl" controls />
          {uploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-prize-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-center">{progress}% 업로드 중...</p>
            </div>
          )}
          {!uploading && (
            <button
              onClick={() => {
                setPreviewURL(null);
                setProgress(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm text-red-400 hover:text-red-300"
            >
              다시 선택
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-prize-500 transition-colors"
        >
          <div className="flex flex-col items-center text-gray-400">
            <span className="text-4xl mb-2">🎬</span>
            <p className="font-medium">영상을 업로드하세요</p>
            <p className="text-xs mt-1">MP4, WebM (최대 100MB)</p>
          </div>
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function getVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve(Math.ceil(video.duration));
    };
    video.onerror = () => resolve(0);
    video.src = url;
  });
}
