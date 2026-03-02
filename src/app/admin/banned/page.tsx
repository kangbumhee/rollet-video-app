'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface PenaltyRecord {
  id: string;
  type: 'kick' | 'mute';
  uid: string;
  displayName: string;
  bannedBy?: string;
  bannedByName?: string;
  bannedAt?: number;
  mutedBy?: string;
  mutedByName?: string;
  mutedAt?: number;
  expiresAt: number;
  reason?: string;
}

export default function BannedUsersPage() {
  const { user, profile, loading } = useAuthStore();
  const router = useRouter();
  const [records, setRecords] = useState<PenaltyRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<'kick' | 'mute'>('kick');

  useEffect(() => {
    if (!loading && (!user || !profile?.isAdmin)) {
      router.push('/');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user || !profile?.isAdmin) return;

    const fetchData = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/banned', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          success?: boolean;
          bannedUsers?: PenaltyRecord[];
          mutedUsers?: PenaltyRecord[];
        };

        if (data.success) {
          const kicks: PenaltyRecord[] = (data.bannedUsers || []).map((u) => ({ ...u, type: 'kick' }));
          const mutes: PenaltyRecord[] = (data.mutedUsers || []).map((u) => ({ ...u, type: 'mute' }));
          setRecords([...kicks, ...mutes]);
        }
      } catch (err) {
        console.error('Failed to load', err);
      } finally {
        setLoadingData(false);
      }
    };

    void fetchData();
  }, [user, profile]);

  const handleRemove = async (docId: string, type: 'kick' | 'mute', displayName: string) => {
    const label = type === 'mute' ? '채팅금지 해제' : '강퇴 해제';
    if (!confirm(`${displayName}님을 ${label}하시겠습니까?`)) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/banned', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId, type }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== docId));
        alert(`${displayName}님 ${label} 완료`);
      } else {
        alert(data.error || '실패');
      }
    } catch {
      alert('네트워크 오류');
    }
  };

  const fmt = (ts?: number) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  };

  const isExpired = (expiresAt: number) => Date.now() > expiresAt;
  const filtered = records.filter((r) => r.type === tab);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">제재 관리</h1>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white">
            ← 돌아가기
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('kick')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'kick'
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            🚫 강퇴 ({records.filter((r) => r.type === 'kick').length})
          </button>
          <button
            onClick={() => setTab('mute')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'mute'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            🔇 채팅금지 ({records.filter((r) => r.type === 'mute').length})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">{tab === 'kick' ? '✅' : '🔈'}</p>
            <p>{tab === 'kick' ? '강퇴된 사용자가 없습니다' : '채팅 금지된 사용자가 없습니다'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const time = r.type === 'kick' ? r.bannedAt : r.mutedAt;
              const byName = r.type === 'kick' ? (r.bannedByName || r.bannedBy) : (r.mutedByName || r.mutedBy);
              const expired = isExpired(r.expiresAt);

              return (
                <div
                  key={r.id}
                  className={`border rounded-xl p-4 ${
                    expired
                      ? 'border-gray-700 bg-gray-900/30 opacity-60'
                      : r.type === 'kick'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-orange-500/30 bg-orange-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{r.displayName}</span>
                        {expired ? (
                          <span className="text-[9px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">만료됨</span>
                        ) : r.type === 'kick' ? (
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">강퇴 중</span>
                        ) : (
                          <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                            채팅금지 중
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">제재 시각: {fmt(time)}</p>
                      <p className="text-[11px] text-gray-500">만료 시각: {fmt(r.expiresAt)}</p>
                      <p className="text-[11px] text-gray-500">제재자: {byName || '알 수 없음'}</p>
                    </div>
                    <button
                      onClick={() => void handleRemove(r.id, r.type, r.displayName)}
                      className="text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      해제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
