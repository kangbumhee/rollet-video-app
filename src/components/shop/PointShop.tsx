'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  imageURL: string;
  price: number;
  stock: number;
  category: string;
  externalURL?: string;
  isActive: boolean;
  createdAt: number;
}

export interface PointHistoryEntry {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  balance: number;
  createdAt: number;
}

interface PointShopProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
  uid: string;
}

type Tab = 'items' | 'history';

export function PointShop({ isOpen, onClose, userPoints, uid }: PointShopProps) {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<ShopItem[]>([]);
  const [history, setHistory] = useState<PointHistoryEntry[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exchangingId, setExchangingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const q = query(
        collection(firestore, 'shopItems'),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopItem));
      setItems(list);
    } catch (e) {
      console.error('PointShop loadItems:', e);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!uid) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(firestore, 'users', uid, 'pointHistory'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PointHistoryEntry[];
      setHistory(list);
    } catch (e) {
      console.error('PointShop loadHistory:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === 'items') loadItems();
    else loadHistory();
  }, [isOpen, tab, loadItems, loadHistory]);

  const handleExchange = useCallback(
    async (item: ShopItem) => {
      if (!user || userPoints < item.price) return;
      if (item.stock === 0) {
        alert('재고가 없습니다.');
        return;
      }
      const ok = window.confirm(
        `"${item.name}"을(를) ${item.price.toLocaleString()}P로 교환하시겠습니까?`
      );
      if (!ok) return;

      setExchangingId(item.id);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/shop/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemId: item.id }),
        });
        const data = await res.json();
        if (data.success) {
          onClose();
        } else {
          alert(data.error || '교환 실패');
        }
      } catch {
        alert('네트워크 오류');
      } finally {
        setExchangingId(null);
      }
    },
    [user, userPoints, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">🪙 포인트 상점</h1>
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 text-sm font-bold">
            {userPoints.toLocaleString()}P
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTab('items')}
          className={`flex-1 py-3 text-sm font-bold ${
            tab === 'items'
              ? 'text-yellow-400 border-b-2 border-yellow-500'
              : 'text-gray-400'
          }`}
        >
          상품
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-3 text-sm font-bold ${
            tab === 'history'
              ? 'text-yellow-400 border-b-2 border-yellow-500'
              : 'text-gray-400'
          }`}
        >
          포인트 내역
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'items' && (
          <>
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">등록된 상품이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {items.map((item) => {
                  const canBuy =
                    userPoints >= item.price &&
                    (item.stock < 0 || item.stock > 0) &&
                    item.isActive;
                  const outOfStock = item.stock === 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden flex flex-col"
                    >
                      <div className="aspect-square bg-gray-900 relative">
                        {item.imageURL ? (
                          <img
                            src={item.imageURL}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                            🎁
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                          <span className="text-yellow-400 text-xs font-bold bg-black/60 px-2 py-0.5 rounded">
                            {item.price.toLocaleString()}P
                          </span>
                          {outOfStock && (
                            <span className="text-red-400 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded">
                              품절
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2 flex flex-col flex-1">
                        <p className="text-white text-sm font-bold truncate">
                          {item.name}
                        </p>
                        <p className="text-gray-500 text-[10px] line-clamp-2 flex-1">
                          {item.description || '-'}
                        </p>
                        <button
                          onClick={() => void handleExchange(item)}
                          disabled={!canBuy || exchangingId === item.id}
                          className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {exchangingId === item.id
                            ? '처리 중...'
                            : !canBuy && !outOfStock
                              ? '포인트 부족'
                              : outOfStock
                                ? '품절'
                                : '교환하기'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">포인트 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between py-3 px-3 bg-gray-800/40 rounded-xl border border-gray-700/50"
                  >
                    <div>
                      <p className="text-gray-300 text-sm">{h.reason}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(h.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={
                          h.type === 'earn'
                            ? 'text-green-400 font-bold'
                            : 'text-red-400 font-bold'
                        }
                      >
                        {h.type === 'earn' ? '+' : '-'}
                        {h.amount.toLocaleString()}P
                      </span>
                      <p className="text-gray-500 text-xs">잔액 {h.balance.toLocaleString()}P</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
