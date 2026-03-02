'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }
interface Question { q: string; options: string[]; answer: number; }

const QUESTIONS: Question[] = [
  { q: '대한민국의 수도는?', options: ['서울', '부산', '대구', '인천'], answer: 0 },
  { q: '지구에서 가장 큰 바다는?', options: ['대서양', '태평양', '인도양', '북극해'], answer: 1 },
  { q: '1+1은?', options: ['1', '2', '3', '4'], answer: 1 },
  { q: '한국의 국화는?', options: ['장미', '무궁화', '튤립', '벚꽃'], answer: 1 },
  { q: '물의 화학식은?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: '세계에서 가장 높은 산은?', options: ['한라산', '백두산', '에베레스트', '킬리만자로'], answer: 2 },
  { q: '태양계에서 가장 큰 행성은?', options: ['지구', '화성', '목성', '토성'], answer: 2 },
  { q: '한국 전쟁이 시작된 년도는?', options: ['1945', '1950', '1953', '1960'], answer: 1 },
  { q: '빛의 속도는 약 몇 km/s?', options: ['30만', '3만', '300만', '3000'], answer: 0 },
  { q: '인체에서 가장 큰 장기는?', options: ['심장', '간', '폐', '피부'], answer: 3 },
  { q: 'DNA의 이중나선을 발견한 사람은?', options: ['아인슈타인', '뉴턴', '왓슨과 크릭', '다윈'], answer: 2 },
  { q: '세계에서 가장 긴 강은?', options: ['아마존강', '나일강', '양쯔강', '미시시피강'], answer: 1 },
  { q: '한글을 만든 왕은?', options: ['태종', '세종', '성종', '영조'], answer: 1 },
  { q: '피타고라스 정리와 관련된 도형은?', options: ['원', '삼각형', '사각형', '오각형'], answer: 1 },
  { q: '일본의 수도는?', options: ['오사카', '교토', '도쿄', '나고야'], answer: 2 },
];

function pickRandom(arr: Question[], n: number): Question[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function QuizGame({ onResult }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const startQuiz = () => {
    setQuestions(pickRandom(QUESTIONS, 10));
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    setStarted(true);
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].answer;
    const ns = correct ? score + 1 : score;
    if (correct) setScore(ns);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setDone(true);
        onResult?.(`📝 상식 퀴즈 ${questions.length}문제 중 ${ns}개 정답!`);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 1000);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-white font-bold text-lg">📝 상식 퀴즈</h3>
        <p className="text-gray-400">10문제 4지선다</p>
        <button onClick={startQuiz} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">시작하기</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-white font-bold text-lg">📝 퀴즈 결과</h3>
        <p className="text-4xl">{score >= 8 ? '🏆' : score >= 5 ? '👍' : '😅'}</p>
        <p className="text-white text-2xl font-bold">{score} / {questions.length}</p>
        <button onClick={startQuiz} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition">다시하기</button>
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
      <p className="text-white font-bold text-lg">{q.q}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            disabled={selected !== null}
            className={`p-3 rounded-lg text-white font-medium transition ${
              selected === null ? 'bg-gray-700 hover:bg-gray-600' :
              i === q.answer ? 'bg-green-600' :
              i === selected ? 'bg-red-600' : 'bg-gray-700 opacity-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
