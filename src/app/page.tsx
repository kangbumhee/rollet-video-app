"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  writeBatch,
} from "firebase/firestore";
import { onValue, ref } from "firebase/database";
import LiveBadge from "@/components/room/LiveBadge";
import NoticeTicker from "@/components/notice/NoticeTicker";
import FreeBoard from "@/components/board/FreeBoard";

interface RoomData {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  isMain: boolean;
  maxPlayers: number;
  status: string;
  onlineCount: number;
  hasPassword: boolean;
  sortOrder?: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [mainRoomCount, setMainRoomCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState(50);
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

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
        hasPassword: d.data().hasPassword || false,
        sortOrder: d.data().sortOrder ?? 999,
      }));
      list.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
      setRooms(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomIdsKey) return;
    const unsubs: (() => void)[] = [];
    roomIds.forEach((id) => {
      const unsub = onValue(ref(realtimeDb, `rooms/${id}/presence`), (s) => {
        const c = s.exists() ? Object.keys(s.val()).length : 0;
        setRooms((p) => p.map((r) => (r.id === id ? { ...r, onlineCount: c } : r)));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [roomIds, roomIdsKey]);

  useEffect(() => {
    const unsub = onValue(ref(realtimeDb, "rooms/main/presence"), (s) => {
      setMainRoomCount(s.exists() ? Object.keys(s.val()).length : 0);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!user || !isAdmin || !newName.trim()) return;
    setCreating(true);
    try {
      const dr = await addDoc(collection(firestore, "rooms"), {
        name: newName.trim(),
        createdBy: user.uid,
        createdByName: profile?.displayName || "운영자",
        createdAt: serverTimestamp(),
        isMain: false,
        maxPlayers: newMax,
        status: "waiting",
        hasPassword: !!newPassword.trim(),
        password: newPassword.trim() || null,
        sortOrder: rooms.length,
      });
      setShowCreate(false);
      setNewName("");
      setNewPassword("");
      router.push(`/room/${dr.id}`);
    } catch {
      alert("방 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin || !confirm("이 방을 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(firestore, "rooms", id));
    } catch {}
  };

  const onDragStart = useCallback(
    (i: number) => {
      if (isAdmin) {
        dragRef.current = i;
        setDragIdx(i);
      }
    },
    [isAdmin]
  );
  const onDragOverItem = useCallback(
    (e: React.DragEvent, i: number) => {
      if (isAdmin) {
        e.preventDefault();
        setOverIdx(i);
      }
    },
    [isAdmin]
  );
  const onDragEnd = useCallback(async () => {
    if (!isAdmin || dragRef.current === null || overIdx === null || dragRef.current === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const others = rooms.filter((r) => !r.isMain);
    const arr = [...others];
    const [moved] = arr.splice(dragRef.current, 1);
    arr.splice(overIdx, 0, moved);
    try {
      const b = writeBatch(firestore);
      arr.forEach((r, i) => b.update(doc(firestore, "rooms", r.id), { sortOrder: i }));
      await b.commit();
    } catch {}
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  }, [isAdmin, rooms, overIdx]);

  const fmt = (n: number) => (n > 999 ? `${(n / 1000).toFixed(1)}K` : String(n));
  const mainRoom = rooms.find((r) => r.isMain);
  const otherRooms = rooms.filter((r) => !r.isMain);

  const enterRoom = (room: RoomData) => {
    if (!room.hasPassword) {
      router.push(`/room/${room.id}`);
      return;
    }
    const pw = prompt("비밀번호를 입력하세요");
    if (pw === null) return;
    fetch(`/api/room/${room.id}/verify-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) router.push(`/room/${room.id}`);
        else alert("비밀번호가 틀렸습니다");
      })
      .catch(() => alert("네트워크 오류"));
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neon-magenta/20 flex items-center justify-center neon-glow-magenta">
            <span className="text-lg leading-none">🎮</span>
          </div>
          <span className="font-display text-xl tracking-tight neon-text-magenta animate-neon-flicker">
            PartyPlay
          </span>
        </div>
        <div>
          {profile ? (
            <button
              onClick={() => router.push("/mypage")}
              className="flex items-center gap-2 bg-surface-base rounded-full pl-3 pr-1.5 py-1 border border-white/[0.06] hover:border-white/[0.1] transition-colors"
            >
              <span className="text-xs text-white/70">{profile.displayName}</span>
              <img
                src={profile.photoURL || "/default-avatar.png"}
                className="w-7 h-7 rounded-full ring-1 ring-white/10"
                alt=""
              />
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-sm neon-text-cyan bg-neon-cyan/10 neon-border-cyan rounded-full px-4 py-1.5 hover:bg-neon-cyan/20 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      <NoticeTicker />

      <main className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-neon-magenta/10 neon-border-magenta rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
            <span className="text-[11px] font-medium text-neon-magenta/90">LIVE NOW</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-3 leading-tight">
            <span className="neon-text-magenta animate-neon-flicker">파티</span>
            <span className="text-white">게임의</span>
            <br />
            <span className="text-white">새로운 </span>
            <span className="neon-text-cyan">무대</span>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            친구들과 실시간으로 게임하고
            <br />
            경품도 받아가세요
          </p>
        </div>

        <button
          onClick={() => router.push(mainRoom ? `/room/${mainRoom.id}` : "/room/main")}
          className="w-full card-arcade card-neon-top-amber animate-neon-pulse-amber p-5 text-left mb-4 group animate-stage-reveal"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LiveBadge />
              <span className="text-[10px] font-medium text-neon-amber/80 bg-neon-amber/10 px-2 py-0.5 rounded-full">
                경품
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-deep/60 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-score font-semibold">
                {fmt(mainRoom?.onlineCount ?? mainRoomCount)}
              </span>
              {mainRoom && (
                <span className="text-white/20 text-[10px] font-score">/{fmt(mainRoom.maxPlayers)}</span>
              )}
            </div>
          </div>
          <p className="text-lg font-bold text-white group-hover:text-neon-amber transition-colors">
            메인 경품방
          </p>
          <p className="text-xs text-white/30 mt-1">24시간 자동 운영 · 게임 이기면 경품 획득</p>
        </button>

        {otherRooms.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="neon-text-cyan text-sm font-bold">파티방</span>
              <span className="text-[11px] font-score text-neon-cyan/60 bg-neon-cyan/10 px-1.5 py-0.5 rounded">
                {otherRooms.length}개
              </span>
              {isAdmin && <span className="text-[10px] text-white/20 ml-auto">드래그로 순서 변경</span>}
            </div>
            <div className="flex flex-col gap-2">
              {otherRooms.map((room, idx) => (
                <div
                  key={room.id}
                  draggable={isAdmin}
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOverItem(e, idx)}
                  onDragEnd={() => void onDragEnd()}
                  onClick={() => enterRoom(room)}
                  className={`
                    card-arcade card-neon-top-cyan p-4 cursor-pointer
                    animate-stage-reveal neon-glow-cyan-hover
                    ${dragIdx === idx ? "drag-ghost" : ""}
                    ${overIdx === idx && dragIdx !== idx ? "drag-over" : ""}
                  `}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isAdmin && (
                        <span className="text-white/15 text-sm cursor-grab active:cursor-grabbing shrink-0">
                          ⠿
                        </span>
                      )}
                      <span className="font-bold text-sm text-white truncate">
                        {room.hasPassword && (
                          <span className="text-neon-amber mr-1 text-xs">🔒</span>
                        )}
                        {room.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="flex items-center gap-1 bg-surface-deep/60 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span
                          className={`text-xs font-score font-semibold ${
                            room.onlineCount >= room.maxPlayers
                              ? "text-red-400"
                              : room.onlineCount >= room.maxPlayers * 0.8
                                ? "text-neon-amber"
                                : "text-emerald-400"
                          }`}
                        >
                          {fmt(room.onlineCount)}
                        </span>
                        <span className="text-white/15 text-[10px] font-score">/{fmt(room.maxPlayers)}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          room.status === "playing"
                            ? "bg-neon-magenta/15 text-neon-magenta"
                            : "bg-emerald-500/15 text-emerald-400"
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
                          className="text-white/15 hover:text-red-400 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-white/20 text-[10px] mt-1.5 pl-0">{room.createdByName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3.5 bg-neon-magenta/15 neon-border-magenta text-neon-magenta font-bold rounded-2xl text-sm transition-all hover:bg-neon-magenta/25 active:scale-[0.98] mb-4 flex items-center justify-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            <span>새 파티방 만들기</span>
          </button>
        )}

        <div className="mt-2">
          <FreeBoard />
        </div>
      </main>

      <footer className="py-4 text-center">
        <p className="text-[10px] text-white/10">© 2026 PartyPlay</p>
      </footer>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-surface-elevated rounded-2xl p-6 w-full max-w-sm border border-white/[0.06] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-display neon-text-cyan mb-5">새 파티방</h2>

            <label className="text-xs text-white/40 mb-1.5 block">방 이름</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="방 이름 입력..."
              maxLength={30}
              className="w-full bg-surface-base text-white rounded-xl px-4 py-2.5 mb-4 outline-none border border-white/[0.06] focus:border-neon-cyan/40 transition-colors text-sm"
            />

            <label className="text-xs text-white/40 mb-1.5 block">최대 인원</label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                value={newMax}
                onChange={(e) => setNewMax(Math.max(2, Math.min(9999, Number(e.target.value) || 2)))}
                min={2}
                max={9999}
                className="w-24 bg-surface-base text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.06] focus:border-neon-cyan/40 transition-colors text-center font-score font-semibold text-sm"
              />
              <span className="text-white/30 text-sm">명</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[10, 20, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setNewMax(n)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    newMax === n
                      ? "bg-neon-cyan/20 text-neon-cyan neon-border-cyan"
                      : "bg-surface-base text-white/40 border border-white/[0.06] hover:text-white/60"
                  }`}
                >
                  {n}명
                </button>
              ))}
            </div>

            <label className="text-xs text-white/40 mb-1.5 block">비밀번호 (선택)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="비밀번호 없이 공개방"
              maxLength={20}
              className="w-full bg-surface-base text-white rounded-xl px-4 py-2.5 mb-1 outline-none border border-white/[0.06] focus:border-neon-cyan/40 transition-colors text-sm"
            />
            <p className="text-[10px] text-white/20 mb-5">{newPassword ? "🔒 비밀방" : "🔓 공개방"}</p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 bg-surface-base text-white/50 rounded-xl border border-white/[0.06] hover:text-white/70 transition-colors text-sm"
              >
                취소
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                className="flex-1 py-2.5 bg-neon-cyan/20 text-neon-cyan font-bold rounded-xl neon-border-cyan hover:bg-neon-cyan/30 transition-all disabled:opacity-30 text-sm"
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
