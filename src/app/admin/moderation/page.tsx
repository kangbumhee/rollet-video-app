"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { firestore } from "@/lib/firebase/config";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";

interface KickLog {
  id: string;
  targetUid: string;
  targetDisplayName: string;
  kickedByName: string;
  kickedAt: number;
}

interface BannedUser {
  id: string;
  uid: string;
  displayName: string;
  bannedByName: string;
  bannedAt: number;
  expiresAt: number;
  type: string;
  reason: string;
}

interface MutedUser {
  id: string;
  uid: string;
  displayName: string;
  mutedByName: string;
  mutedAt: number;
  expiresAt: number;
}

export default function ModerationPage() {
  const router = useRouter();
  const { profile, loading } = useAuthStore();
  const [tab, setTab] = useState<"kicks" | "bans" | "mutes">("kicks");
  const [kicks, setKicks] = useState<KickLog[]>([]);
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [mutes, setMutes] = useState<MutedUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isAdmin = profile?.isAdmin || profile?.isModerator || false;

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadAll = async () => {
      setLoadingData(true);
      try {
        // 강퇴 이력
        const kickQ = query(collection(firestore, "kickLogs"), orderBy("kickedAt", "desc"), limit(100));
        const kickSnap = await getDocs(kickQ);
        setKicks(kickSnap.docs.map((d) => ({ id: d.id, ...d.data() } as KickLog)));

        // 밴 목록 (현재 유효한 것)
        const banQ = query(collection(firestore, "bannedUsers"), orderBy("bannedAt", "desc"), limit(100));
        const banSnap = await getDocs(banQ);
        setBans(banSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BannedUser)));

        // 채금 목록
        const muteQ = query(collection(firestore, "mutedUsers"), orderBy("mutedAt", "desc"), limit(100));
        const muteSnap = await getDocs(muteQ);
        setMutes(muteSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MutedUser)));
      } catch (e) {
        console.error("Moderation load error:", e);
      } finally {
        setLoadingData(false);
      }
    };
    void loadAll();
  }, [isAdmin]);

  const handleUnban = async (banId: string) => {
    if (!confirm("밴을 해제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(firestore, "bannedUsers", banId));
      setBans((prev) => prev.filter((b) => b.id !== banId));
    } catch {
      alert("해제 실패");
    }
  };

  const handleUnmute = async (muteId: string) => {
    if (!confirm("채금을 해제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(firestore, "mutedUsers", muteId));
      setMutes((prev) => prev.filter((m) => m.id !== muteId));
    } catch {
      alert("해제 실패");
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const isExpired = (expiresAt: number) => Date.now() > expiresAt;

  const remainingTime = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "만료됨";
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}분 남음`;
    return `${Math.floor(min / 60)}시간 ${min % 60}분 남음`;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="font-bold">🚨 강퇴/채금 이력</h1>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* 탭 */}
        <div className="flex bg-gray-800/50 rounded-xl p-1 mb-4">
          {[
            { id: "kicks" as const, label: `🚪 강퇴 (${kicks.length})` },
            { id: "bans" as const, label: `🚫 밴 (${bans.length})` },
            { id: "mutes" as const, label: `🔇 채금 (${mutes.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 강퇴 이력 */}
        {tab === "kicks" && (
          <div className="space-y-2">
            {kicks.length === 0 ? (
              <p className="text-center text-gray-500 py-10">강퇴 이력이 없습니다</p>
            ) : (
              kicks.map((k) => (
                <div key={k.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-red-400">{k.targetDisplayName}</p>
                      <p className="text-[10px] text-gray-500">처리자: {k.kickedByName}</p>
                    </div>
                    <span className="text-[10px] text-gray-500">{formatDate(k.kickedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 밴 목록 */}
        {tab === "bans" && (
          <div className="space-y-2">
            {bans.length === 0 ? (
              <p className="text-center text-gray-500 py-10">밴 이력이 없습니다</p>
            ) : (
              bans.map((b) => (
                <div key={b.id} className={`bg-gray-800/50 rounded-xl p-3 border ${isExpired(b.expiresAt) ? "border-gray-700/30 opacity-50" : "border-red-500/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{b.displayName}</p>
                      <p className="text-[10px] text-gray-500">처리자: {b.bannedByName} · {formatDate(b.bannedAt)}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isExpired(b.expiresAt) ? "text-gray-500" : "text-red-400"}`}>
                        {remainingTime(b.expiresAt)}
                      </p>
                    </div>
                    {!isExpired(b.expiresAt) && (
                      <button
                        onClick={() => void handleUnban(b.id)}
                        className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-lg hover:bg-green-500/20 transition"
                      >
                        해제
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 채금 목록 */}
        {tab === "mutes" && (
          <div className="space-y-2">
            {mutes.length === 0 ? (
              <p className="text-center text-gray-500 py-10">채금 이력이 없습니다</p>
            ) : (
              mutes.map((m) => (
                <div key={m.id} className={`bg-gray-800/50 rounded-xl p-3 border ${isExpired(m.expiresAt) ? "border-gray-700/30 opacity-50" : "border-orange-500/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{m.displayName}</p>
                      <p className="text-[10px] text-gray-500">처리자: {m.mutedByName} · {formatDate(m.mutedAt)}</p>
                      <p className={`text-[10px] font-bold mt-0.5 ${isExpired(m.expiresAt) ? "text-gray-500" : "text-orange-400"}`}>
                        {remainingTime(m.expiresAt)}
                      </p>
                    </div>
                    {!isExpired(m.expiresAt) && (
                      <button
                        onClick={() => void handleUnmute(m.id)}
                        className="text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-lg hover:bg-green-500/20 transition"
                      >
                        해제
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
