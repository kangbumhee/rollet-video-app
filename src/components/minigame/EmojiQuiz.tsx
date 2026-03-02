'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }
interface EQ { emojis: string; answer: string; options: string[]; }

const QUIZZES: EQ[] = [
  { emojis: '🍎+📱', answer: '애플', options: ['애플', '삼성', '구글', 'LG'] },
  { emojis: '☀️+🌻', answer: '해바라기', options: ['해바라기', '장미', '튤립', '국화'] },
  { emojis: '🐕+🏠', answer: '개집', options: ['개집', '고양이', '동물원', '애견카페'] },
  { emojis: '❄️+👸', answer: '겨울왕국', options: ['겨울왕국', '인어공주', '백설공주', '라푼젤'] },
  { emojis: '🔥+🏔️', answer: '화산', options: ['화산', '온천', '캠프', '사막'] },
  { emojis: '👁️+💧', answer: '눈물', options: ['눈물', '안경', '비', '우산'] },
  { emojis: '🌙+🐰', answer: '달토끼', options: ['달토끼', '토끼굴', '야행성', '잠자리'] },
  { emojis: '🎄+🎅', answer: '크리스마스', options: ['크리스마스', '할로윈', '추석', '설날'] },
  { emojis: '⚽+👟', answer: '축구화', options: ['축구화', '운동화', '농구화', '슬리퍼'] },
  { emojis: '🍚+🥢', answer: '밥', options: ['밥', '라면', '빵', '피자'] },
  { emojis: '🌊+🏄', answer: '서핑', options: ['서핑', '수영', '다이빙', '낚시'] },
  { emojis: '🎤+⭐', answer: '스타', options: ['스타', '노래방', '콘서트', '오디션'] },
  { emojis: '🐷+💰', answer: '저금통', options: ['저금통', '돼지고기', '은행', '지갑'] },
  { emojis: '📚+🏫', answer: '학교', options: ['학교', '도서관', '서점', '학원'] },
  { emojis: '🌈+🦄', answer: '유니콘', options: ['유니콘', '페가수스', '드래곤', '피닉스'] },
];

function pickRandom(arr: EQ[], n: number): EQ[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export default function EmojiQuiz({ onResult }: Props) {
  const [questions, setQuestions] = useState<EQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const startGame = () => {
    setQuestions(pickRandom(QUIZZES, 10));
    setCurrent(0); setScore(0); setSelected(null); setDone(false); setStarted(true);
  };

  const handleAnswer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === questions[current].answer;
    const ns = correct ? score + 1 : score;
    if (correct) setScore(ns);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setDone(true);
        onResult?.(`😎 이모지 퀴즈 ${questions.length}문제 중 ${ns}개 정답!`);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 1000);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-white font-bold text-lg">😎 이모지 퀴즈</h3>
        <p className="text-gray-400">이모지를 보고 단어를 맞춰보세요!</p>
        <button onClick={startGame} className="px-8 py-3 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-500 transition">시작하기</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-white font-bold text-lg">😎 이모지 퀴즈 결과</h3>
        <p className="text-4xl">{score >= 8 ? '🏆' : score >= 5 ? '👍' : '😅'}</p>
        <p className="text-white text-2xl font-bold">{score} / {questions.length}</p>
        <button onClick={startGame} className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition">다시하기</button>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-xl">
      <div className="flex justify-between text-sm">
        <span className="text-purple-400 font-bold">{current + 1}/{questions.length}</span>
        <span className="text-green-400 font-bold">정답: {score}</span>
      </div>
      <p className="text-5xl text-center py-4">{q.emojis}</p>
      <p className="text-gray-400 text-center text-sm">이 이모지가 뜻하는 단어는?</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={selected !== null}
            className={`p-3 rounded-lg text-white font-medium transition ${
              selected === null ? 'bg-gray-700 hover:bg-gray-600' :
              opt === q.answer ? 'bg-green-600' :
              opt === selected ? 'bg-red-600' : 'bg-gray-700 opacity-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
