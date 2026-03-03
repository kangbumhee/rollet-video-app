// ============================================
// 파일: src/app/admin/upload/page.tsx
// 설명: 관리자 경품 사진 업로드 페이지
//       사진 하나 올리면 AI가 설명 자동 생성
// ============================================

"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import { useAuthStore } from "@/stores/authStore";
import { apiCall } from "@/lib/api";
import { ArrowLeft, Upload, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

const GAME_OPTIONS = [
  { type: 'drawGuess', icon: '🎨', title: '그림 맞추기' },
  { type: 'lineRunner', icon: '✏️', title: '라인 러너' },
  { type: 'liarVote', icon: '🕵️', title: '라이어 투표' },
  { type: 'typingBattle', icon: '⌨️', title: '타이핑 배틀' },
  { type: 'bombPass', icon: '💣', title: '폭탄 돌리기' },
  { type: 'priceGuess', icon: '💰', title: '가격 맞추기' },
  { type: 'oxSurvival', icon: '⭕', title: 'OX 서바이벌' },
  { type: 'tapSurvival', icon: '👆', title: '탭 서바이벌' },
  { type: 'nunchiGame', icon: '👀', title: '눈치 게임' },
  { type: 'quickTouch', icon: '🎯', title: '순발력 터치' },
];

type Step = "upload" | "processing" | "done";
type PrizeCreateResponse = {
  prize?: { title?: string; description?: string; estimatedValue?: number };
  message?: string;
};

export default function AdminUploadPage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [title, setTitle] = useState("");
  const [gameType, setGameType] = useState("luckyDice");
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [result, setResult] = useState<PrizeCreateResponse | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleUpload = async () => {
    if (!file || !profile) return;

    setStep("processing");
    setError("");

    try {
      // 1. Storage에 업로드
      const storageRef = ref(storage, `prizes/${profile.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageURL = await getDownloadURL(storageRef);

      // 2. API 호출 (AI 설명 + 방 생성)
      const data = await apiCall<PrizeCreateResponse>("/api/prize/create", {
        method: "POST",
        body: {
          imageURL,
          title: title || undefined,
          gameType,
          totalQuantity,
        },
      });

      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "업로드 실패");
      setStep("upload");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-prize-border">
        <button
          onClick={() => router.push("/admin")}
          className="w-8 h-8 flex items-center justify-center rounded-lg 
                     hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="font-bold">경품 등록</h1>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* ── 업로드 단계 ── */}
        {step === "upload" && (
          <>
            {/* 사진 업로드 */}
            <label
              className="block w-full aspect-square border-2 border-dashed
                            border-gray-600 rounded-2xl cursor-pointer
                            hover:border-yellow-400 transition-colors
                            overflow-hidden relative"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="경품 미리보기" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <Upload size={48} className="mb-3" />
                  <p className="text-sm font-medium">경품 사진 올리기</p>
                  <p className="text-xs mt-1 text-gray-600">AI가 자동으로 이름과 설명을 생성합니다</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </label>

            {/* 경품명 (선택) */}
            <input
              type="text"
              placeholder="경품명 (비워두면 AI가 자동 생성)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              className="w-full mt-4 p-3 bg-gray-800 border border-gray-700 
                         rounded-xl text-white placeholder-gray-500
                         focus:outline-none focus:border-yellow-500/50"
            />

            {/* 게임 선택 */}
            <p className="text-xs text-gray-400 mt-4 mb-2">정규 게임 선택</p>
            <div className="grid grid-cols-5 gap-2">
              {GAME_OPTIONS.map((g) => (
                <button
                  key={g.type}
                  onClick={() => setGameType(g.type)}
                  className={`p-3 rounded-xl text-center transition-all border-2
                    ${
                      gameType === g.type
                        ? "bg-yellow-500/20 border-yellow-400"
                        : "bg-gray-800 border-gray-700 hover:border-gray-600"
                    }`}
                >
                  <span className="text-xl block">{g.icon}</span>
                  <span className="text-[10px] mt-1 block leading-tight">{g.title}</span>
                </button>
              ))}
            </div>

            {/* 수량 입력 */}
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">경품 수량</p>
              <input
                type="number"
                min={1}
                max={999}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white
                           focus:outline-none focus:border-yellow-500/50"
                placeholder="수량 입력 (기본 1개)"
              />
              <p className="text-xs text-gray-500 mt-1">
                같은 경품을 여러 슬롯에 배정할 수 있는 횟수입니다
              </p>
            </div>

            {/* 에러 */}
            {error && (
              <p
                className="mt-3 text-sm text-red-400 bg-red-500/10 
                            border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            {/* 버튼 */}
            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-yellow-400 to-orange-500
                         text-black font-bold rounded-xl text-sm
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:from-yellow-300 hover:to-orange-400
                         active:scale-[0.98] transition-all"
            >
              경품 등록하기
            </button>
          </>
        )}

        {/* ── 처리 중 ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-yellow-400 mb-4" />
            <p className="text-lg font-bold">AI가 경품을 분석 중...</p>
            <p className="text-sm text-gray-400 mt-2">잠시만 기다려주세요</p>
          </div>
        )}

        {/* ── 완료 ── */}
        {step === "done" && result && (
          <div className="flex flex-col items-center py-10">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold mb-6">등록 완료!</h2>

            <div className="w-full bg-prize-card border border-prize-border rounded-2xl p-4">
              {preview && <img src={preview} className="w-full h-40 object-cover rounded-xl mb-3" alt="" />}
              <h3 className="font-bold text-yellow-400">{result.prize?.title}</h3>
              <p className="text-sm text-gray-300 mt-1">{result.prize?.description}</p>
              {(result.prize?.estimatedValue || 0) > 0 && (
                <p className="text-xs text-gray-500 mt-2">예상 가격: {result.prize?.estimatedValue?.toLocaleString()}원</p>
              )}
              <p className="text-xs text-green-400 mt-3">⏰ {result.message}</p>
            </div>

            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={() => {
                  setStep("upload");
                  setFile(null);
                  setPreview("");
                  setTitle("");
                  setTotalQuantity(1);
                  setResult(null);
                }}
                className="flex-1 py-3 bg-gray-800 rounded-xl text-sm"
              >
                하나 더 등록
              </button>
              <button
                onClick={() => router.push("/admin/schedule")}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm"
              >
                📅 스케줄 배정
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="flex-1 py-3 bg-yellow-500 text-black font-bold 
                           rounded-xl text-sm"
              >
                관리자 홈
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
