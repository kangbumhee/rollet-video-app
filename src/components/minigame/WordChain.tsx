'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }

const WORDS: Record<string, string[]> = {
  사: ['사과', '사자', '사람', '사진', '사랑'],
  과: ['과일', '과자', '과학'],
  자: ['자동차', '자전거', '자유', '자석'],
  일: ['일요일', '일기', '일본'],
  동: ['동물', '동화', '동생'],
  차: ['차량', '차이', '차례'],
  물: ['물고기', '물건', '물결'],
  고: ['고양이', '고기', '고래', '고구마'],
  기: ['기차', '기린', '기억', '기분'],
  린: ['린넨'],
  양: ['양말', '양파', '양'],
  이: ['이유', '이름', '이사'],
  구: ['구름', '구두', '구경'],
  름: ['름'],
  래: ['래퍼'],
  유: ['유리', '유치원', '유명'],
  리: ['리본', '리듬'],
  전: ['전화', '전기', '전쟁'],
  화: ['화분', '화요일', '화산'],
  분: ['분필', '분수'],
  생: ['생일', '생선', '생활'],
  활: ['활동', '활기'],
  선: ['선물', '선생님', '선풍기'],
  풍: ['풍선', '풍경'],
  경: ['경찰', '경기', '경치'],
  찰: ['찰떡'],
};

function getBotWord(lastChar: string): string | null {
  const candidates = WORDS[lastChar];
  if (!candidates || candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function WordChain({ onResult }: Props) {
  const [history, setHistory] = useState<{ word: string; by: string }[]>([]);
  const [input, setInput] = useState('');
  const [lastChar, setLastChar] = useState('');
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [started, setStarted] = useState(false);

  const start = () => {
    const firstWords = ['사과', '기차', '고래', '물고기', '자동차'];
    const first = firstWords[Math.floor(Math.random() * firstWords.length)];
    setHistory([{ word: first, by: '봇' }]);
    setLastChar(first[first.length - 1]);
    setStarted(true); setDone(false); setMessage(''); setInput('');
  };

  const submit = () => {
    if (done || !input.trim()) return;
    const word = input.trim();
    if (word[0] !== lastChar) { setMessage(`"${lastChar}"(으)로 시작해야 합니다!`); return; }
    if (word.length < 2) { setMessage('2글자 이상 입력하세요!'); return; }

    const nh = [...history, { word, by: '나' }];
    const nextChar = word[word.length - 1];
    const botWord = getBotWord(nextChar);
    if (!botWord) {
      setHistory([...nh, { word: `${nextChar}... 모르겠다! 내가 졌어!`, by: '봇' }]);
      setDone(true);
      onResult?.(`💬 끝말잇기 ${nh.length}단어에서 승리!`);
    } else {
      setHistory([...nh, { word: botWord, by: '봇' }]);
      setLastChar(botWord[botWord.length - 1]);
    }
    setInput(''); setMessage('');
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg text-center">💬 끝말잇기</h3>
      {!started ? (
        <div className="text-center">
          <button onClick={start} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">시작하기</button>
        </div>
      ) : (
        <>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {history.map((h, i) => (
              <div key={i} className={`px-3 py-1.5 rounded text-sm ${h.by === '나' ? 'bg-blue-900 text-blue-200 ml-8' : 'bg-gray-700 text-white mr-8'}`}>
                <span className="text-xs text-gray-400">{h.by}:</span> {h.word}
              </div>
            ))}
          </div>
          {!done && <p className="text-yellow-400 text-sm text-center">&quot;{lastChar}&quot;(으)로 시작하는 단어를 입력하세요</p>}
          {message && <p className="text-red-400 text-sm text-center">{message}</p>}
          {!done ? (
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="flex-1 p-2 rounded-lg bg-gray-700 text-white outline-none"
                placeholder={`${lastChar}...`}
              />
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">입력</button>
            </div>
          ) : (
            <button onClick={start} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition mx-auto">다시하기</button>
          )}
        </>
      )}
    </div>
  );
}
