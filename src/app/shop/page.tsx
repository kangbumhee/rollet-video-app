"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function ShopPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.push("/")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="font-bold">상점</h1>
      </header>

      <div className="max-w-md mx-auto p-6 text-center">
        <div className="py-20">
          <ShoppingBag size={64} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">상점 준비 중</h2>
          <p className="text-gray-400 text-sm">
            포인트로 추가 티켓, 부스트 아이템 등을
            <br />
            구매할 수 있는 상점이 곧 오픈됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
