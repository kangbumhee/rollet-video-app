// src/components/seller/SellerCreateForm.tsx
'use client';

import React, { useState } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryTypeSelector } from './DeliveryTypeSelector';
import { VideoUploader } from './VideoUploader';
import type { DeliveryType } from '@/types/seller';

type Step = 'type' | 'prize' | 'video' | 'confirm';

export function SellerCreateForm() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [prizeTitle, setPrizeTitle] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [prizeImage, setPrizeImage] = useState<File | null>(null);
  const [prizeImageURL, setPrizeImageURL] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [gameType, setGameType] = useState('rps');
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    const fileId = generateId();
    const fileRef = storageRef(storage, `prizes/${fileId}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        undefined,
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setPrizeImageURL(url);
          setImageUploading(false);
          resolve(url);
        }
      );
    });
  };

  const handleSubmit = async () => {
    if (!user || !deliveryType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let imageURL = prizeImageURL;
      if (prizeImage && !prizeImageURL) {
        imageURL = await handleImageUpload(prizeImage);
      }

      const res = await apiClient('/api/room/create', {
        method: 'POST',
        body: JSON.stringify({
          prizeTitle,
          prizeDescription,
          prizeImageURL: imageURL,
          estimatedValue: Number(estimatedValue),
          deliveryType,
          gameType,
          videoURL: deliveryType === 'SPONSORED' ? videoURL : undefined,
          videoDurationSec: deliveryType === 'SPONSORED' ? videoDuration : undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        requiresPayment?: boolean;
        paymentAmount?: number;
        error?: string;
      };

      if (data.success) {
        if (data.requiresPayment) {
          setResultMessage(`결제가 필요합니다. 금액: ${(data.paymentAmount || 0).toLocaleString()}원`);
        } else {
          setResultMessage('방이 성공적으로 생성되었습니다! 관리자 심사 후 스케줄됩니다.');
        }
        setStep('confirm');
      } else {
        setError(data.error || '방 생성 실패');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['type', 'prize', 'video', 'confirm'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s
                  ? 'bg-prize-500 text-white'
                  : i < ['type', 'prize', 'video', 'confirm'].indexOf(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-gray-700" />}
          </React.Fragment>
        ))}
      </div>

      {step === 'type' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">경품 방 개설</h2>
          <DeliveryTypeSelector selected={deliveryType} onSelect={setDeliveryType} />
          <Button onClick={() => setStep('prize')} disabled={!deliveryType} className="w-full bg-prize-600 hover:bg-prize-700">
            다음
          </Button>
        </div>
      )}

      {step === 'prize' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">경품 정보</h2>

          <div>
            <label className="text-sm text-gray-300">경품 이름</label>
            <Input
              value={prizeTitle}
              onChange={(e) => setPrizeTitle(e.target.value)}
              placeholder="예: 에어팟 프로 2세대"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">설명</label>
            <textarea
              value={prizeDescription}
              onChange={(e) => setPrizeDescription(e.target.value)}
              placeholder="경품에 대한 설명을 적어주세요"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none h-24"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">예상 가치 (원)</label>
            <Input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="예: 359000"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">경품 이미지</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPrizeImage(file);
              }}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-prize-600 file:text-white file:font-medium"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300">게임 타입</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="rps">✊ 가위바위보 토너먼트</option>
              <option value="roulette">🎡 행운의 룰렛</option>
              <option value="oxQuiz">⭕ OX퀴즈</option>
              <option value="numberGuess">🔢 숫자맞추기</option>
              <option value="speedClick">⚡ 스피드클릭</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('type')} className="flex-1">
              이전
            </Button>
            <Button
              onClick={() => setStep(deliveryType === 'SPONSORED' ? 'video' : 'confirm')}
              disabled={!prizeTitle || !estimatedValue || imageUploading}
              className="flex-1 bg-prize-600 hover:bg-prize-700"
            >
              {deliveryType === 'SPONSORED' ? '다음' : '확인'}
            </Button>
          </div>
        </div>
      )}

      {step === 'video' && deliveryType === 'SPONSORED' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">제품 영상 업로드</h2>
          <p className="text-sm text-gray-400">참가자들이 게임 참여 전 이 영상을 시청하게 됩니다.</p>

          <VideoUploader
            onUploadComplete={(url, duration) => {
              setVideoURL(url);
              setVideoDuration(duration);
            }}
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('prize')} className="flex-1">
              이전
            </Button>
            <Button onClick={() => setStep('confirm')} disabled={!videoURL} className="flex-1 bg-prize-600 hover:bg-prize-700">
              확인
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && !resultMessage && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">최종 확인</h2>
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">배송 타입</span>
              <span className="text-white">{deliveryType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">경품</span>
              <span className="text-white">{prizeTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">예상 가치</span>
              <span className="text-white">{Number(estimatedValue).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">게임</span>
              <span className="text-white">{gameType}</span>
            </div>
            {deliveryType === 'SPONSORED' && (
              <div className="flex justify-between">
                <span className="text-gray-400">영상 길이</span>
                <span className="text-white">{videoDuration}초</span>
              </div>
            )}
            <hr className="border-gray-700 my-2" />
            <div className="flex justify-between font-bold">
              <span className="text-gray-300">수수료</span>
              <span className="text-yellow-400">
                {deliveryType === 'CONSIGNMENT' ? '5,000원' : deliveryType === 'SPONSORED' ? '30,000원' : '무료'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(deliveryType === 'SPONSORED' ? 'video' : 'prize')} className="flex-1">
              이전
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-prize-600 hover:bg-prize-700">
              {isSubmitting ? '처리 중...' : '방 개설하기'}
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}

      {resultMessage && (
        <div className="text-center space-y-4 py-8">
          <span className="text-5xl">🎉</span>
          <p className="text-white font-medium">{resultMessage}</p>
          <Button onClick={() => (window.location.href = '/seller/dashboard')} className="bg-prize-600 hover:bg-prize-700">
            대시보드로 이동
          </Button>
        </div>
      )}
    </div>
  );
}
