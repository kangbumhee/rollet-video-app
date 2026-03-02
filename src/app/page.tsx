"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { firestore, realtimeDb } from "@/lib/firebase/config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import LiveBadge from "@/components/room/LiveBadge";

interface RoomData {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  isMain: boolean;
  maxPlayers: number;
  status: string;
  onlineCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [mainRoomCount, setMainRoomCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState(50);
  const [creating, setCreating] = useState(false);

  const isAdmin = !!(profile?.isAdmin || profile?.isModerator);
  const roomIds = useMemo(() => rooms.map((r) => r.id), [rooms]);
  const roomIdsKey = useMemo(() => roomIds.join(","), [roomIds]);

  useEffect(() => {
    const q = query(
      collection(firestore, "rooms"),
      where("status", "in", ["waiting", "playing"]),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: RoomData[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "방",
        createdBy: d.data().createdBy || "",
        createdByName: d.data().createdByName || "",
        isMain: d.data().isMain || false,
        maxPlayers: d.data().maxPlayers || 50,
        status: d.data().status || "waiting",
        onlineCount: 0,
      }));
      setRooms(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomIdsKey) return;
    const unsubs: Array<() => void> = [];
    roomIds.forEach((roomId) => {
      const presRef = ref(realtimeDb, `rooms/${roomId}/presence`);
      const unsub = onValue(presRef, (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, onlineCount: count } : r)));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [roomIds, roomIdsKey]);

  useEffect(() => {
    const presRef = ref(realtimeDb, "rooms/main/presence");
    const unsub = onValue(presRef, (snap) => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      setMainRoomCount(count);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!user || !isAdmin || !newName.trim()) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(firestore, "rooms"), {
        name: newName.trim(),
        createdBy: user.uid,
        createdByName: profile?.displayName || "운영자",
        createdAt: serverTimestamp(),
        isMain: false,
        maxPlayers: newMax,
        status: "waiting",
      });
      setShowCreate(false);
      setNewName("");
      router.push(`/room/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("방 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!isAdmin) return;
    if (!window.confirm("이 방을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(firestore, "rooms", roomId));
    } catch (error) {
      console.error(error);
    }
  };

  const fmt = (n: number) => (n > 999 ? `${(n / 1000).toFixed(1)}K` : String(n));
  const mainRoom = rooms.find((r) => r.isMain);
  const otherRooms = rooms.filter((r) => !r.isMain);

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-black text-lg bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            PrizeLive
          </span>
        </div>
        <div>
          {profile ? (
            <button
              onClick={() => router.push("/mypage")}
              className="flex items-center gap-2 bg-gray-800 rounded-full pl-3 pr-1.5 py-1"
            >
              <span className="text-xs text-gray-300">{profile.displayName}</span>
              <img src={profile.photoURL || "/default-avatar.png"} className="w-7 h-7 rounded-full" alt="" />
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 hover:bg-yellow-500/20 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">🎁</div>
          <h1 className="text-2xl font-black mb-2">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">무료 경품</span>
            <br />
            <span className="text-white">게임으로 받아가세요!</span>
          </h1>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed">
            광고 한 번 보고, 게임에서 이기면
            <br />
            경품이 당신에게! 24시간 자동 운영
          </p>
        </div>

        {mainRoom ? (
          <button
            onClick={() => router.push(`/room/${mainRoom.id}`)}
            className="w-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-5 hover:from-yellow-500/30 hover:to-orange-500/30 active:scale-[0.98] transition-all group mb-3"
          >
            <div className="flex items-center justify-between mb-3">
              <LiveBadge />
              <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-bold">{fmt(mainRoom.onlineCount)}명</span>
                <span className="text-gray-500 text-xs">/ {fmt(mainRoom.maxPlayers)}</span>
              </div>
            </div>
            <p className="text-left text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
              🎮 메인 경품방 입장하기
            </p>
            <p className="text-left text-xs text-gray-400 mt-1">지금 바로 참여할 수 있어요</p>
          </button>
        ) : (
          <button
            onClick={() => router.push("/room/main")}
            className="w-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-5 hover:from-yellow-500/30 hover:to-orange-500/30 active:scale-[0.98] transition-all group mb-3"
          >
            <div className="flex items-center justify-between mb-3">
              <LiveBadge />
              <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-bold">
                  {mainRoomCount > 999 ? `${(mainRoomCount / 1000).toFixed(1)}K` : mainRoomCount}명
                </span>
              </div>
            </div>
            <p className="text-left text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
              🎮 메인 경품방 입장하기
            </p>
            <p className="text-left text-xs text-gray-400 mt-1">지금 바로 참여할 수 있어요</p>
          </button>
        )}

        {otherRooms.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 px-1">🏠 다른 방 ({otherRooms.length}개)</p>
            <div className="flex flex-col gap-2">
              {otherRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="bg-gray-800/50 rounded-xl p-3.5 border border-gray-700/50 hover:border-purple-500/50 transition cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white truncate flex-1">{room.name}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="flex items-center gap-1 bg-gray-700/50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        <span
                          className={`text-xs font-bold ${
                            room.onlineCount >= room.maxPlayers
                              ? "text-red-400"
                              : room.onlineCount >= room.maxPlayers * 0.8
                                ? "text-yellow-400"
                                : "text-green-400"
                          }`}
                        >
                          {fmt(room.onlineCount)}
                        </span>
                        <span className="text-gray-500 text-[10px]">/{fmt(room.maxPlayers)}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          room.status === "playing" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {room.status === "playing" ? "게임중" : "대기중"}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(room.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-1">by {room.createdByName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/seller/create")}
          className="w-full bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 hover:bg-purple-500/20 active:scale-[0.98] transition-all text-left mb-3"
        >
          <p className="text-sm font-bold text-purple-300">📦 내 물건으로 경품방 만들기</p>
          <p className="text-xs text-gray-500 mt-1">직접배송 · 위탁배송 · 제품 홍보</p>
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl text-base transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span className="text-xl leading-none">+</span>
            <span>새 방 만들기</span>
          </button>
        )}
      </main>

      <footer className="py-4 text-center">
        <p className="text-[10px] text-gray-700">© 2026 PrizeLive. All rights reserved.</p>
      </footer>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">🆕 새 방 만들기</h2>
            <label className="text-sm text-gray-400 mb-1 block">방 이름</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="방 이름 입력..."
              maxLength={30}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <label className="text-sm text-gray-400 mb-1 block">최대 인원</label>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[10, 20, 50, 100, 200, 500, 1000, 9999].map((n) => (
                <button
                  key={n}
                  onClick={() => setNewMax(n)}
                  className={`py-2 rounded-lg text-sm font-bold transition ${
                    newMax === n ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {n >= 9999 ? "무제한" : n >= 1000 ? `${n / 1000}K` : n}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
              >
                취소
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition disabled:opacity-50"
              >
                {creating ? "생성중..." : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
