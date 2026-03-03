'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { firestore } from '@/lib/firebase/config';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

interface Notice {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();
  const isAdmin = profile?.isAdmin || false;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    const q = query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotices(
        snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || '',
          content: d.data().content || '',
          pinned: d.data().pinned || false,
          createdAt: d.data().createdAt?.toMillis?.() || 0,
        }))
      );
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    try {
      if (editId) {
        await updateDoc(doc(firestore, 'announcements', editId), {
          title: title.trim(),
          content: content.trim(),
          pinned,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(firestore, 'announcements'), {
          title: title.trim(),
          content: content.trim(),
          pinned,
          createdBy: user?.uid || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setEditId(null);
      setTitle('');
      setContent('');
      setPinned(false);
    } catch (err) {
      console.error(err);
      alert('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (n: Notice) => {
    setEditId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setPinned(n.pinned);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
    await deleteDoc(doc(firestore, 'announcements', id));
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="text-lg font-bold">⚙️ 설정 / 공지사항 관리</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-yellow-400">
            {editId ? '📝 공지사항 수정' : '📢 새 공지사항 작성'}
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (마퀴에 표시됨)"
            maxLength={50}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="본문 내용..."
            rows={4}
            maxLength={1000}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-sm text-gray-300">📌 상단 고정</span>
          </label>
          <div className="flex gap-2">
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setTitle('');
                  setContent('');
                  setPinned(false);
                }}
                className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                취소
              </button>
            )}
            <button
              onClick={() => void handleSave()}
              disabled={saving || !title.trim() || !content.trim()}
              className="flex-1 py-2 bg-yellow-600 text-white font-bold rounded-lg text-sm hover:bg-yellow-500 disabled:opacity-40 transition"
            >
              {saving ? '저장 중...' : editId ? '수정 완료' : '등록'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-400">등록된 공지사항 ({notices.length}건)</h2>
          {notices.map((n) => (
            <div key={n.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {n.pinned && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">📌</span>
                    )}
                    <span className="text-white font-bold text-sm truncate">{n.title}</span>
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">{n.content}</p>
                  <p className="text-gray-600 text-[10px] mt-1">{new Date(n.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(n)}
                    className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30 transition"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => void handleDelete(n.id)}
                    className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
          {notices.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">등록된 공지사항이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
