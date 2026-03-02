'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { firestore, realtimeDb } from '@/lib/firebase/config';
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
} from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';

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

export default function RoomsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState(50);
  const [creating, setCreating] = useState(false);

  const isAdmin = !!(profile?.isAdmin || profile?.isModerator);
  const roomIdsKey = useMemo(() => rooms.map((room) => room.id).join(','), [rooms]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'rooms'),
      where('status', 'in', ['waiting', 'playing']),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: RoomData[] = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || '방',
        createdBy: d.data().createdBy || '',
        createdByName: d.data().createdByName || '',
        isMain: d.data().isMain || false,
        maxPlayers: d.data().maxPlayers || 50,
        status: d.data().status || 'waiting',
        onlineCount: 0,
      }));
      setRooms(list);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (rooms.length === 0) return;

    const unsubs: Array<() => void> = [];

    rooms.forEach((room) => {
      const presRef = ref(realtimeDb, `rooms/${room.id}/presence`);
      const unsub = onValue(presRef, (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, onlineCount: count } : r)));
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [roomIdsKey, rooms.length]);

  const handleCreate = async () => {
    if (!user || !isAdmin || !newName.trim()) return;

    setCreating(true);
    try {
      const docRef = await addDoc(collection(firestore, 'rooms'), {
        name: newName.trim(),
        createdBy: user.uid,
        createdByName: profile?.displayName || '운영자',
        createdAt: serverTimestamp(),
        isMain: false,
        maxPlayers: newMax,
        status: 'waiting',
      });

      setShowCreate(false);
      setNewName('');
      router.push(`/room/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert('방 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('이 방을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(firestore, 'rooms', roomId));
    } catch (error) {
      console.error(error);
      alert('방 삭제 실패');
    }
  };

  const formatCount = (count: number) => (count > 999 ? `${(count / 1000).toFixed(1)}K` : String(count));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🏠 방 목록</h1>
        <span className="text-gray-400 text-sm">{rooms.length}개 활성</span>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-purple-500/50 transition cursor-pointer"
            onClick={() => router.push(`/room/${room.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {room.isMain && (
                  <span className="text-yellow-400 text-xs font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full shrink-0">
                    메인
                  </span>
                )}
                <span className="font-bold text-sm truncate">{room.name}</span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-gray-700/50 px-2.5 py-1 rounded-full">
                  <span className="text-green-400 text-xs">👥</span>
                  <span
                    className={`text-sm font-bold ${
                      room.onlineCount >= room.maxPlayers
                        ? 'text-red-400'
                        : room.onlineCount >= room.maxPlayers * 0.8
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
                    {formatCount(room.onlineCount)}
                  </span>
                  <span className="text-gray-500 text-xs">/ {formatCount(room.maxPlayers)}</span>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    room.status === 'playing' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {room.status === 'playing' ? '게임중' : '대기중'}
                </span>

                {isAdmin && !room.isMain && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(room.id);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs ml-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="text-gray-500 text-xs mt-1">by {room.createdByName}</div>
          </div>
        ))}

        {rooms.length === 0 && <div className="text-center text-gray-500 py-12">활성화된 방이 없습니다</div>}
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-lg transition flex items-center justify-center gap-2"
        >
          <span className="text-2xl leading-none">+</span>
          <span>새 방 만들기</span>
        </button>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">🆕 새 방 만들기</h2>

            <label className="text-sm text-gray-400 mb-1 block">방 이름</label>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="방 이름 입력..."
              maxLength={30}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-purple-500"
            />

            <label className="text-sm text-gray-400 mb-1 block">최대 인원</label>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[10, 20, 50, 100, 200, 500, 1000, 9999].map((count) => (
                <button
                  key={count}
                  onClick={() => setNewMax(count)}
                  className={`py-2 rounded-lg text-sm font-bold transition ${
                    newMax === count ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {count >= 9999 ? '무제한' : count >= 1000 ? `${count / 1000}K` : count}
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
                {creating ? '생성중...' : '만들기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
