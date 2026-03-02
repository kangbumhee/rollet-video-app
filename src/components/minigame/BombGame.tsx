'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

const CATEGORIES: { cat: string; answers: string[] }[] = [
  { cat: '과일', answers: ['사과', '바나나', '포도', '딸기', '수박', '오렌지', '키위', '망고', '복숭아', '체리'] },
  { cat: '동물', answers: ['강아지', '고양이', '호랑이', '사자', '토끼', '코끼리', '기린', '곰', '여우', '판다'] },
  { cat: '나라', answers: ['한국', '미국', '일본', '중국', '영국', '프랑스', '독일', '호주', '캐나다', '브라질'] },
  { cat: '음식', answers: ['김치', '불고기', '비빔밥', '떡볶이', '치킨', '피자', '햄버거', '라면', '초밥', '파스타'] },
  { cat: '색깔', answers: ['빨강', '파랑', '초록', '노랑', '보라', '주황', '검정', '하양', '분홍', '갈색'] },
  { cat: '스포츠', answers: ['축구', '야구', '농구', '테니스', '수영', '배구', '골프', '탁구', '배드민턴', '볼링'] },
];

export default function BombGame({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [used, setUsed] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setCategory(cat); setUsed([]); setInput(''); setScore(0); setMessage('');
    setTimeLeft(3 + Math.floor(Math.random() * 5));
    setPlaying(true);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { explode(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const explode = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaying(false);
    setMessage('💥 펑! 폭탄이 터졌습니다!');
    onResult?.(`💣 폭탄 돌리기 ${score}개 답하고 터짐!`);
  };

  const submit = () => {
    if (!playing || !input.trim()) return;
    const word = input.trim();
    if (used.includes(word)) { setMessage('이미 사용한 단어!'); setInput(''); return; }
    if (!category.answers.includes(word)) { setMessage('해당 카테고리에 맞지 않아요!'); setInput(''); return; }
    setUsed((u) => [...u, word]);
    setScore((s) => s + 1);
    setInput(''); setMessage('');
    setTimeLeft(3 + Math.floor(Math.random() * 5));
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">💣 폭탄 돌리기</h3>
      {playing ? (
        <>
          <p className="text-yellow-400 font-bold">주제: {category.cat}</p>
          <p className={`text-4xl font-bold ${timeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            💣 {timeLeft}초
          </p>
          <p className="text-gray-400 text-sm">답한 개수: {score} | 사용: {used.join(', ') || '없음'}</p>
          {message && <p className="text-red-400 text-sm">{message}</p>}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="flex-1 p-2 rounded-lg bg-gray-700 text-white outline-none"
              placeholder={`${category.cat} 입력`}
              autoFocus
            />
            <button onClick={submit} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500 transition">답!</button>
          </div>
        </>
      ) : (
        <div className="text-center">
          {message && <p className="text-red-400 font-bold text-xl mb-2">{message}</p>}
          {score > 0 && <p className="text-white mb-2">{score}개 답변 성공</p>}
          <button onClick={start} className="px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
        </div>
      )}
    </div>
  );
}
