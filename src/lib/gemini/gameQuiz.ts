// ============================================
// AI 퀴즈 무한 생성 유틸 (Gemini 2.0 Flash)
// 게임 시작 시 1회 호출로 10라운드분 생성
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function uniqueSeed() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DRAW_CATEGORIES_POOL = [
  '동물', '음식', '직업', '사물', '장소', '행동', '캐릭터', '탈것',
  '악기', '스포츠', '자연', '감정', '옷', '가전제품', '건물',
  '곤충', '바다생물', '과일', '채소', '나라', '요리도구', '문구',
];

function pickRandomCategories(n: number): string[] {
  const shuffled = [...DRAW_CATEGORIES_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.5,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
}

const OX_FALLBACK = [
  { q: '물은 100도에서 끓는다', a: true, explanation: '표준 기압에서 물의 끓는점은 100°C' },
  { q: '달은 스스로 빛을 낸다', a: false, explanation: '달은 태양빛을 반사' },
  { q: '대한민국의 수도는 부산이다', a: false, explanation: '수도는 서울' },
  { q: '지구는 태양 주위를 돈다', a: true, explanation: '지구는 태양을 공전' },
  { q: '사람의 혈액형은 5가지이다', a: false, explanation: 'A, B, O, AB 4가지' },
  { q: '바나나는 채소이다', a: false, explanation: '바나나는 과일' },
  { q: '금은 자석에 붙는다', a: false, explanation: '금은 비자성체' },
  { q: '오징어는 심장이 3개이다', a: true, explanation: '주심장 1개, 보조심장 2개' },
  { q: '에베레스트는 아시아에 있다', a: true, explanation: '네팔-중국 국경' },
  { q: '토마토는 과일이다', a: true, explanation: '식물학적으로 과일' },
  { q: '빛은 소리보다 느리다', a: false, explanation: '빛이 훨씬 빠름' },
  { q: '개미는 자기 몸무게의 50배를 들 수 있다', a: true, explanation: '종에 따라 50배 이상' },
  { q: '일본의 수도는 오사카이다', a: false, explanation: '수도는 도쿄' },
  { q: '지구의 바다는 민물이다', a: false, explanation: '바다는 짠물(염수)' },
  { q: '다이아몬드는 탄소로 이루어져 있다', a: true, explanation: '순수 탄소 결정' },
  { q: '코알라는 곰과 동물이다', a: false, explanation: '유대류' },
  { q: '인간의 뼈는 200개 이상이다', a: true, explanation: '성인 기준 약 206개' },
  { q: '태양은 행성이다', a: false, explanation: '태양은 항성(별)' },
  { q: '꿀벌은 겨울에도 활동한다', a: true, explanation: '벌집 안에서 무리지어 월동' },
  { q: '한국 전쟁은 1960년에 시작되었다', a: false, explanation: '1950년 6월 25일' },
  { q: '상어는 뼈가 없다', a: true, explanation: '연골어류' },
  { q: '커피 원두는 열매의 씨앗이다', a: true, explanation: '커피 체리의 씨앗' },
  { q: '북극곰의 피부는 흰색이다', a: false, explanation: '피부는 검은색, 털이 투명' },
  { q: '소금은 NaCl이다', a: true, explanation: '나트륨+염소' },
  { q: '거미는 곤충이다', a: false, explanation: '거미는 거미류(8다리)' },
  { q: '지구에서 가장 깊은 바다는 마리아나 해구이다', a: true, explanation: '약 11,034m' },
  { q: '비타민C는 지용성이다', a: false, explanation: '수용성 비타민' },
  { q: '독수리는 포유류이다', a: false, explanation: '조류' },
  { q: '한글은 세종대왕이 만들었다', a: true, explanation: '1443년 창제' },
  { q: '화성은 지구보다 크다', a: false, explanation: '화성은 지구의 약 절반 크기' },
];

export async function generateOXQuizzes(count: number) {
  const seed = uniqueSeed();
  const prompt = `[시드: ${seed}]
재미있고 의외의 OX 퀴즈를 ${count}개 만들어줘.
카테고리를 섞어서: 과학, 역사, 동물, 음식, 스포츠, 지리, 연예, IT, 인체, 우주, 언어, 수학 등
쉬운 것, 어려운 것, 함정 문제, 웃긴 문제를 골고루.
이전에 나온 문제와 절대 겹치지 않게 매번 완전히 새로운 문제를 만들어.

JSON 배열로만 응답:
[{"q":"질문","a":true또는false,"explanation":"정답 해설 1줄"}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ q: string; a: boolean; explanation: string }>;
  } catch (e) {
    console.error('[gameQuiz] generateOXQuizzes failed:', e);
    const shuffled = [...OX_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

const PRICE_FALLBACK = [
  { name: '삼성 갤럭시 S24', price: 1250000, hint: '📱', category: '전자제품' },
  { name: '맥도날드 빅맥 세트', price: 6500, hint: '🍔', category: '음식' },
  { name: '스타벅스 아메리카노 톨', price: 4500, hint: '☕', category: '음식' },
  { name: '나이키 에어맥스', price: 139000, hint: '👟', category: '의류' },
  { name: '지하철 1회 승차권', price: 1500, hint: '🚇', category: '교통' },
  { name: 'CU 삼각김밥', price: 1500, hint: '🍙', category: '음식' },
  { name: '롯데월드 자유이용권', price: 59000, hint: '🎢', category: '문화' },
  { name: 'CGV 영화 관람권', price: 14000, hint: '🎬', category: '문화' },
  { name: '맥북 에어 M3', price: 1690000, hint: '💻', category: '전자제품' },
  { name: '에어팟 프로 2', price: 359000, hint: '🎧', category: '전자제품' },
  { name: '배달의민족 1인분', price: 9000, hint: '🍜', category: '음식' },
  { name: '택시 기본요금', price: 4800, hint: '🚕', category: '교통' },
  { name: '편의점 도시락', price: 5500, hint: '🍱', category: '음식' },
  { name: '아이폰 15 Pro', price: 1550000, hint: '📱', category: '전자제품' },
  { name: '무인양품 캔들', price: 5900, hint: '🕯️', category: '생활용품' },
  { name: '다이소 1000원샵 물품', price: 1000, hint: '🛒', category: '생활용품' },
  { name: '올리브영 마스크팩 1장', price: 1500, hint: '🧴', category: '뷰티' },
  { name: '교보문고 소설책', price: 14000, hint: '📚', category: '문화' },
  { name: 'GS25 파우치 과자', price: 1200, hint: '🍪', category: '음식' },
  { name: '버거킹 와퍼', price: 6900, hint: '🍔', category: '음식' },
  { name: '이마트 생수 2L', price: 1100, hint: '💧', category: '생활용품' },
  { name: '레고 스타워즈', price: 89000, hint: '🧱', category: '장난감' },
  { name: '나이키 축구공', price: 45000, hint: '⚽', category: '스포츠' },
  { name: '다이슨 청소기', price: 890000, hint: '🧹', category: '가전' },
  { name: 'LG 그램 노트북', price: 1490000, hint: '💻', category: '전자제품' },
  { name: '설악산 케이블카', price: 11000, hint: '🚡', category: '문화' },
  { name: 'CU 컵라면', price: 1500, hint: '🍜', category: '음식' },
  { name: 'ZARA 티셔츠', price: 39000, hint: '👕', category: '의류' },
  { name: '던킨 도넛 1개', price: 2200, hint: '🍩', category: '음식' },
  { name: '영화관 팝콘 콤보', price: 8500, hint: '🍿', category: '음식' },
];

export async function generatePriceItems(count: number) {
  const seed = uniqueSeed();
  const prompt = `[시드: ${seed}]
한국에서 살 수 있는 실제 상품/서비스 ${count}개의 이름과 정확한 시장 가격을 만들어줘.
카테고리를 섞어서: 전자제품, 음식, 의류, 교통, 생활용품, 명품, 장난감, 스포츠용품 등
가격대를 다양하게: 1,000원대부터 수천만원대까지.
매번 완전히 새롭고 다양한 상품.

JSON 배열로만 응답:
[{"name":"상품명","price":숫자,"hint":"이모지1개","category":"카테고리"}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ name: string; price: number; hint: string; category: string }>;
  } catch (e) {
    console.error('[gameQuiz] generatePriceItems failed:', e);
    const shuffled = [...PRICE_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

const BOMB_FALLBACK = [
  { q: '1 + 2 = ?', a: '3', acceptable: ['3'] },
  { q: '한국의 수도는?', a: '서울', acceptable: ['서울'] },
  { q: '태양에서 세 번째 행성은?', a: '지구', acceptable: ['지구'] },
  { q: '5 × 2 = ?', a: '10', acceptable: ['10'] },
  { q: '빨강+파랑 = ?', a: '보라', acceptable: ['보라', '퍼플'] },
  { q: '10 - 3 = ?', a: '7', acceptable: ['7'] },
  { q: '사과 영어로?', a: 'apple', acceptable: ['apple', '애플'] },
  { q: '1년은 몇 달?', a: '12', acceptable: ['12', '12달'] },
  { q: '지구에서 가장 큰 대양은?', a: '태평양', acceptable: ['태평양', '퍼시픽'] },
  { q: '2 × 3 = ?', a: '6', acceptable: ['6'] },
  { q: '한글 자음 개수?', a: '19', acceptable: ['19'] },
  { q: '물의 화학식?', a: 'H2O', acceptable: ['H2O', 'h2o'] },
  { q: '대한민국 1번 국도 끝은?', a: '부산', acceptable: ['부산'] },
  { q: '7 + 8 = ?', a: '15', acceptable: ['15'] },
  { q: '달의 위성 수?', a: '0', acceptable: ['0', '없음'] },
  { q: '100 ÷ 4 = ?', a: '25', acceptable: ['25'] },
  { q: '올림픽 5링 색 중 하나?', a: '빨강', acceptable: ['빨강', '파랑', '초록', '노랑', '검정'] },
  { q: '한 주는 며칠?', a: '7', acceptable: ['7', '7일'] },
  { q: '9 - 4 = ?', a: '5', acceptable: ['5'] },
  { q: '지구 둘레 단위?', a: 'km', acceptable: ['km', '킬로미터'] },
  { q: '6 × 6 = ?', a: '36', acceptable: ['36'] },
  { q: '인간 손가락 수?', a: '10', acceptable: ['10'] },
  { q: '한국 최장 강?', a: '낙동강', acceptable: ['낙동강'] },
  { q: '4 + 5 = ?', a: '9', acceptable: ['9'] },
  { q: '태양계 행성 수?', a: '8', acceptable: ['8'] },
  { q: '20 ÷ 5 = ?', a: '4', acceptable: ['4'] },
  { q: '오렌지 색 영어?', a: 'orange', acceptable: ['orange', '오렌지'] },
  { q: '3 × 7 = ?', a: '21', acceptable: ['21'] },
  { q: '한국 전화 국가번호?', a: '82', acceptable: ['82'] },
];

export async function generateBombQuizzes(count: number) {
  const seed = uniqueSeed();
  const prompt = `[시드: ${seed}]
빠르게 답할 수 있는 짧은 퀴즈 ${count}개를 만들어줘.
정답은 한 단어 또는 숫자 하나. 3초 안에 답할 수 있을 정도로 쉬워야 함.
카테고리: 상식, 수학, 한국어, 과학, 지리 등 골고루.
매번 완전히 다른 새로운 문제.

JSON 배열로만 응답:
[{"q":"질문","a":"정답","acceptable":["정답","대체정답"]}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ q: string; a: string; acceptable: string[] }>;
  } catch (e) {
    console.error('[gameQuiz] generateBombQuizzes failed:', e);
    const shuffled = [...BOMB_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

export async function generateDrawWords(count: number) {
  const seed = uniqueSeed();
  const categories = pickRandomCategories(5).join(', ');
  const prompt = `[시드: ${seed}]
그림 그려서 맞추기 게임용 제시어 ${count}개를 만들어줘.
이번에는 특히 다음 카테고리에서 골라줘: ${categories}
추가로 자유롭게 다른 카테고리도 섞어도 됨.
조건: 그림으로 표현 가능한 것, 한국어 단어, 너무 추상적이지 않게.
난이도: 쉬운 것 3개, 보통 4개, 어려운 것 3개.
절대 이전과 같은 단어를 쓰지 마. 창의적이고 독특한 단어를 사용해.

JSON 배열로만 응답:
[{"word":"제시어","category":"카테고리","difficulty":"easy|medium|hard"}]`;

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw) as Array<{ word: string; category: string; difficulty: string }>;
    if (parsed.length >= count) return parsed;
    return parsed;
  } catch (e) {
    console.error('[gameQuiz] generateDrawWords failed:', e);
    const LARGE_FALLBACK = [
      '고양이', '강아지', '코끼리', '펭귄', '기린', '토끼', '돌고래', '앵무새', '거북이', '사자',
      '피자', '치킨', '떡볶이', '아이스크림', '햄버거', '초밥', '케이크', '라면', '붕어빵', '팝콘',
      '소방차', '비행기', '자전거', '잠수함', '로켓', '헬리콥터', '택시', '기차', '오토바이', '요트',
      '우산', '선풍기', '냉장고', '텔레비전', '안경', '시계', '가방', '전화기', '컴퓨터', '카메라',
      '축구', '야구', '농구', '수영', '스키', '태권도', '볼링', '배드민턴', '골프', '서핑',
      '의사', '소방관', '요리사', '경찰', '우주비행사', '화가', '가수', '마술사', '선생님', '해적',
      '무지개', '화산', '폭포', '번개', '눈사람', '선인장', '해바라기', '버섯', '산호', '오로라',
    ];
    const shuffled = [...LARGE_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((w) => ({ word: w, category: '기본', difficulty: 'easy' }));
  }
}

const TYPING_FALLBACK = [
  '시간은 금이다.',
  '천리길도 한 걸음부터.',
  '배고프면 맛있다.',
  '오늘 할 일을 내일로 미루지 마라.',
  '작은 노력이 큰 결과를 만든다.',
  '인생은 짧고 예술은 길다.',
  '지금이 최고의 순간이다.',
  '실패는 성공의 어머니.',
  '노력은 배신하지 않는다.',
  '시작이 반이다.',
  '고생 끝에 낙이 온다.',
  'Rome was not built in a day.',
  '물이 차면 넘친다.',
  '가는 말이 고와야 오는 말이 곱다.',
  '빈 수레가 요란하다.',
  '하늘이 무너져도 솟아날 구멍이 있다.',
  '사람은 믿음으로 산다.',
  '오늘 하루도 수고했어요.',
  '내일은 내일의 태양이 뜬다.',
  '작은 기적이 쌓여 큰 성공이 된다.',
  '꿈을 향해 달려가자.',
  '포기하지 마세요.',
  '당신은 할 수 있습니다.',
  '한 번에 하나씩.',
  '지금 여기가 출발점.',
  '오늘도 화이팅!',
  '작은 습관이 인생을 바꾼다.',
  '독서는 마음의 양식.',
  '친구는 두 번째 나.',
  '웃음은 최고의 명약.',
];

export async function generateTypingSentences(count: number) {
  const seed = uniqueSeed();
  const prompt = `[시드: ${seed}]
타이핑 대결용 한국어 문장 ${count}개를 만들어줘.
조건: 15~30자 사이, 재미있거나 명언이나 속담이나 유행어 등 다양하게.
매번 완전히 새로운 문장.

JSON 배열로만 응답:
["문장1","문장2",...]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as string[];
  } catch (e) {
    console.error('[gameQuiz] generateTypingSentences failed:', e);
    const shuffled = [...TYPING_FALLBACK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
