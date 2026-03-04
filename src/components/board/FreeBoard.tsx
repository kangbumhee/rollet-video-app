'use client';

import { useEffect, useState } from 'react';
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
  limit,
  serverTimestamp,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

interface Post {
  id: string;
  content: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  createdAt: number;
}

export default function FreeBoard() {
  const { user, profile } = useAuthStore();
  const isAdmin = !!(profile?.isAdmin || profile?.isModerator);

  const [posts, setPosts] = useState<Post[]>([]);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    const q = query(
      collection(firestore, 'boardPosts'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        content: d.data().content || '',
        authorUid: d.data().authorUid || '',
        authorName: d.data().authorName || '익명',
        authorPhoto: d.data().authorPhoto || '',
        createdAt: d.data().createdAt?.toMillis?.() || 0,
      }));
      setPosts(list);
      if (snap.docs.length > 0) setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    });
    return () => unsub();
  }, []);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const q = query(
      collection(firestore, 'boardPosts'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const newPosts = snap.docs.map((d) => ({
      id: d.id,
      content: d.data().content || '',
      authorUid: d.data().authorUid || '',
      authorName: d.data().authorName || '익명',
      authorPhoto: d.data().authorPhoto || '',
      createdAt: d.data().createdAt?.toMillis?.() || 0,
    }));
    setPosts((prev) => [...prev, ...newPosts]);
    if (snap.docs.length > 0) setLastDoc(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length >= PAGE_SIZE);
    setLoadingMore(false);
  };

  const handlePost = async () => {
    if (!user || !input.trim() || posting) return;
    setPosting(true);
    try {
      await addDoc(collection(firestore, 'boardPosts'), {
        content: input.trim(),
        authorUid: user.uid,
        authorName: profile?.displayName || '익명',
        authorPhoto: profile?.photoURL || '',
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (err) {
      console.error(err);
      alert('글쓰기 실패');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('이 글을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(firestore, 'boardPosts', postId));
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${Math.floor(diff / 86400000)}일 전`;
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-base/50 border border-white/[0.06] rounded-xl hover:bg-surface-base transition"
      >
        <span className="text-white font-bold text-sm">💬 자유게시판</span>
        <span className="text-white/30 text-xs">{expanded ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 bg-surface-base/50 border border-white/[0.06] rounded-xl overflow-hidden">
          {user ? (
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="자유롭게 소통하세요..."
                  maxLength={200}
                  className="flex-1 bg-surface-deep text-white text-sm rounded-lg px-3 py-2 border border-white/[0.06] outline-none focus:border-neon-cyan/40 transition-colors placeholder-white/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handlePost();
                  }}
                />
                <button
                  onClick={() => void handlePost()}
                  disabled={posting || !input.trim()}
                  className="px-4 py-2 bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta text-sm font-bold rounded-lg hover:bg-neon-magenta/25 disabled:opacity-40 transition-all shrink-0"
                >
                  {posting ? '...' : '등록'}
                </button>
              </div>
              <p className="text-[10px] text-white/15 mt-1 text-right">{input.length}/200</p>
            </div>
          ) : (
            <div className="p-3 text-center text-white/30 text-sm border-b border-white/[0.06]">
              로그인 후 글을 쓸 수 있습니다
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {posts.length === 0 ? (
              <p className="text-center text-white/20 text-sm py-8">아직 글이 없어요. 첫 글을 남겨보세요!</p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-start gap-2">
                    <img
                      src={post.authorPhoto || '/default-avatar.png'}
                      alt=""
                      className="w-7 h-7 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-bold truncate">{post.authorName}</span>
                        <span className="text-white/15 text-[10px] shrink-0">{timeAgo(post.createdAt)}</span>
                      </div>
                      <p className="text-white/60 text-sm mt-0.5 break-words">{post.content}</p>
                    </div>
                    {(user?.uid === post.authorUid || isAdmin) && (
                      <button
                        onClick={() => void handleDelete(post.id)}
                        className="shrink-0 text-white/10 hover:text-red-400 text-xs mt-1 transition-colors"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {hasMore && posts.length > 0 && (
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                {loadingMore ? '로딩 중...' : '더보기'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
