'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';

interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  pinned: boolean;
}

export default function NoticeTicker() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [showList, setShowList] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const q = query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || '',
        content: d.data().content || '',
        createdAt: d.data().createdAt?.toMillis?.() || 0,
        pinned: d.data().pinned || false,
      }));
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
      setNotices(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % notices.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [notices.length]);

  if (notices.length === 0) return null;

  const current = notices[currentIdx % notices.length];

  return (
    <>
      <div
        onClick={() => {
          setSelectedNotice(current);
          setShowList(true);
        }}
        className="w-full bg-neon-amber/10 border-b border-neon-amber/20 px-4 py-2 cursor-pointer hover:bg-neon-amber/15 transition overflow-hidden"
      >
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-neon-amber text-xs font-bold bg-neon-amber/20 px-1.5 py-0.5 rounded">
            {current.pinned ? '📌 공지' : '📢 공지'}
          </span>
          <div className="overflow-hidden flex-1">
            <p className="text-sm text-white font-medium truncate animate-marquee">{current.title}</p>
          </div>
          {notices.length > 1 && (
            <span className="shrink-0 text-white/20 text-[10px]">
              {currentIdx + 1}/{notices.length}
            </span>
          )}
        </div>
      </div>

      {showList && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowList(false)}
        >
          <div
            className="bg-surface-elevated border border-white/[0.06] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-white font-bold text-lg">📢 공지사항</h2>
              <button onClick={() => setShowList(false)} className="text-white/30 hover:text-white text-xl transition-colors">
                ✕
              </button>
            </div>

            {selectedNotice && (
              <div className="px-5 py-4 border-b border-white/[0.06] bg-surface-base/50">
                <div className="flex items-center gap-2 mb-2">
                  {selectedNotice.pinned && (
                    <span className="text-[10px] bg-neon-amber/20 text-neon-amber px-1.5 py-0.5 rounded">📌 고정</span>
                  )}
                  <span className="text-[10px] text-white/20">
                    {new Date(selectedNotice.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-2">{selectedNotice.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{selectedNotice.content}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <p className="px-5 py-2 text-[10px] text-white/20 font-bold">이전 공지</p>
              {notices.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNotice(n)}
                  className={`w-full text-left px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] transition ${
                    selectedNotice?.id === n.id ? 'bg-neon-magenta/10 border-l-2 border-l-neon-magenta' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {n.pinned && <span className="text-[10px] text-neon-amber">📌</span>}
                    <span className="text-white text-sm font-medium truncate flex-1">{n.title}</span>
                    <span className="text-[10px] text-white/20 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
