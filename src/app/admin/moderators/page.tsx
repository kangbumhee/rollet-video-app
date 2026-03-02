"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { firestore } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";

interface ModeratorUser {
  uid: string;
  displayName: string;
  email: string;
  level: number;
  isModerator: boolean;
  createdAt: number;
}

export default function ModeratorsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();
  const [moderators, setModerators] = useState<ModeratorUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ModeratorUser[]>([]);
  const [searching, setSearching] = useState(false);

  const isAdmin = profile?.isAdmin || false;

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      setLoadingData(true);
      try {
        const q = query(collection(firestore, "users"), where("isModerator", "==", true));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as ModeratorUser));
        setModerators(list);
      } catch (e) {
        console.error("Load moderators error:", e);
      } finally {
        setLoadingData(false);
      }
    };
    void load();
  }, [isAdmin]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    try {
      const q = query(collection(firestore, "users"), where("displayName", "==", searchQuery.trim()));
      const snap = await getDocs(q);
      const results = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as ModeratorUser))
        .filter((u) => !u.isModerator && u.uid !== profile?.uid);
      setSearchResults(results);
      if (results.length === 0) {
        alert("해당 닉네임의 유저를 찾을 수 없습니다.");
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleSetModerator = async (targetUid: string, targetName: string) => {
    if (!user) return;
    if (!confirm(`${targetName}님을 운영자로 지정하시겠습니까?`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "setModerator", targetUid, targetDisplayName: targetName }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        alert(data.message);
        setModerators((prev) => [...prev, { uid: targetUid, displayName: targetName, email: "", level: 1, isModerator: true, createdAt: Date.now() }]);
        setSearchResults((prev) => prev.filter((u) => u.uid !== targetUid));
      } else {
        alert(data.error || "실패");
      }
    } catch {
      alert("네트워크 오류");
    }
  };

  const handleRemoveModerator = async (targetUid: string, targetName: string) => {
    if (!user) return;
    if (!confirm(`${targetName}님의 운영자를 해제하시겠습니까?`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "removeModerator", targetUid, targetDisplayName: targetName }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        alert(data.message);
        setModerators((prev) => prev.filter((m) => m.uid !== targetUid));
      } else {
        alert(data.error || "실패");
      }
    } catch {
      alert("네트워크 오류");
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.push("/admin")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="font-bold">👥 매니저 관리</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-cyan-400 mb-3">🛡️ 현재 운영자 ({moderators.length}명)</h2>
          {moderators.length === 0 ? (
            <p className="text-center text-gray-500 py-6 bg-gray-800/30 rounded-xl">지정된 운영자가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {moderators.map((mod) => (
                <div key={mod.uid} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 border border-cyan-500/20">
                  <div>
                    <p className="text-sm font-bold text-white">{mod.displayName}</p>
                    <p className="text-[10px] text-gray-500">Lv.{mod.level || 1} · {mod.email || mod.uid.slice(0, 8)}</p>
                  </div>
                  <button
                    onClick={() => void handleRemoveModerator(mod.uid, mod.displayName)}
                    className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition font-bold"
                  >
                    해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-green-400 mb-3">➕ 운영자 지정</h2>
          <div className="flex gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="닉네임으로 검색..."
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 border border-gray-700 focus:border-cyan-500 outline-none text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-500 transition disabled:opacity-40"
            >
              {searching ? "..." : "검색"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div key={u.uid} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                  <div>
                    <p className="text-sm font-bold text-white">{u.displayName}</p>
                    <p className="text-[10px] text-gray-500">Lv.{u.level || 1}</p>
                  </div>
                  <button
                    onClick={() => void handleSetModerator(u.uid, u.displayName)}
                    className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition font-bold"
                  >
                    운영자 지정
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
          <p className="text-xs font-bold text-gray-400 mb-2">📌 운영자 권한 안내</p>
          <div className="space-y-1 text-[11px] text-gray-500">
            <p>• 운영자는 일반 유저를 채팅 금지(10분) / 강퇴(30분) 할 수 있습니다</p>
            <p>• 운영자는 관리자 또는 다른 운영자를 제재할 수 없습니다</p>
            <p>• 운영자는 관리자 대시보드에 접근할 수 없습니다</p>
            <p>• 운영자 지정/해제는 관리자만 가능합니다</p>
            <p>• 모든 제재/권한 변경은 채팅봇으로 실시간 공지됩니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
