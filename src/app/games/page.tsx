import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "파티게임 목록 - 11종 멀티 보드게임 & 30종 미니게임",
  description:
    "PartyPlay에서 즐길 수 있는 모든 게임을 확인하세요. 빅 룰렛, 그림 맞추기, 타이핑 배틀, 스네이크 서바이벌 등 11종 실시간 멀티 파티게임과 30종 솔로 미니게임. 모바일 보드게임 추천!",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "PartyPlay 게임 목록 - 파티게임 어플",
    description: "11종 멀티 파티게임 + 30종 미니게임. 모바일 보드게임 추천!",
    images: [{ url: "/og-image.png" }],
  },
};

const GAMES = [
  { slug: "big-roulette", emoji: "🎰", name: "빅 룰렛", desc: "배수를 선택하고 룰렛을 돌려 점수를 겨루는 운빨 대전! ×1부터 ×20까지 배팅하고 💀을 피하세요.", players: "2~50명", time: "3~9라운드" },
  { slug: "draw-guess", emoji: "🎨", name: "그림 맞추기", desc: "한 명이 그림을 그리면 나머지가 정답을 맞추는 캐치마인드 스타일 게임. 빠르게 맞출수록 높은 점수!", players: "2~50명", time: "3~9라운드" },
  { slug: "typing-battle", emoji: "⌨️", name: "타이핑 배틀", desc: "주어진 문장을 가장 빠르고 정확하게 타이핑하세요. 속도와 정확도 모두 중요!", players: "2~50명", time: "3~9라운드" },
  { slug: "slither-battle", emoji: "🐍", name: "스네이크 서바이벌", desc: "뱀을 조종해 먹이를 먹고 점수를 겨루는 아케이드 게임. 벽이나 자기 몸에 부딪히면 게임 오버!", players: "2~50명", time: "3~9라운드" },
  { slug: "flappy-battle", emoji: "🐦", name: "플래피 배틀", desc: "장애물을 피하며 최고 점수를 겨루는 플래피버드 대전. 라운드마다 속도가 빨라집니다!", players: "2~50명", time: "3~9라운드" },
  { slug: "bomb-survival", emoji: "💣", name: "폭탄 해제", desc: "제한 시간 내에 퀴즈를 맞혀 폭탄을 해제하세요. 못 맞추면 펑!", players: "2~50명", time: "3~9라운드" },
  { slug: "tetris-battle", emoji: "🧱", name: "테트리스 배틀", desc: "클래식 테트리스 실력을 겨루는 멀티플레이 대전. 목표 줄 수를 먼저 달성하세요!", players: "2~50명", time: "3~9라운드" },
  { slug: "memory-match", emoji: "🃏", name: "메모리 매치", desc: "뒤집힌 카드의 짝을 찾는 기억력 대전. 라운드가 올라갈수록 카드가 늘어납니다!", players: "2~50명", time: "3~9라운드" },
  { slug: "blind-auction", emoji: "📦", name: "블라인드 경매", desc: "힌트만 보고 숨겨진 상자에 칩을 배팅하는 심리전. 대박 상자를 찾아라!", players: "2~50명", time: "3~9라운드" },
  { slug: "price-guess", emoji: "💰", name: "가격 맞추기", desc: "상품의 실제 가격에 가장 가까운 금액을 맞추세요. 경제 감각이 빛나는 게임!", players: "2~50명", time: "3~9라운드" },
  { slug: "weapon-forge", emoji: "⚔️", name: "검 강화", desc: "무기를 단계별로 강화하며 운을 시험하세요. 성공률이 점점 낮아집니다!", players: "2~50명", time: "3~9라운드" },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black mb-4">
            <span className="text-neon-magenta">PartyPlay</span> 파티게임 목록
          </h1>
          <p className="text-white/50 text-lg">
            앱 설치 없이 모바일 브라우저에서 바로 즐기는 <strong>무료 파티게임 어플</strong>
          </p>
          <p className="text-white/30 text-sm mt-2">
            모바일 스팀처럼 다양한 보드게임을 한 곳에서 친구들과 실시간 대전!
          </p>
        </div>

        <h2 className="text-xl font-bold mb-6 text-neon-cyan">🎮 멀티플레이 파티게임 (11종)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {GAMES.map((game) => (
            <div
              key={game.slug}
              className="bg-surface-base border border-white/[0.06] rounded-2xl p-5 hover:border-neon-cyan/30 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{game.emoji}</span>
                <div>
                  <h3 className="font-bold text-white text-lg">{game.name}</h3>
                  <p className="text-white/30 text-xs">{game.players} · {game.time}</p>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">{game.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4 text-neon-amber">🎲 솔로 미니게임 (30종+)</h2>
        <p className="text-white/50 mb-8">
          코인 플립, 슬롯머신, 행운의 문, 하이로우, 룰렛 등 다양한 솔로 미니게임으로
          포인트를 모으고 경품에 도전하세요. 대기 시간에 혼자서도 즐길 수 있습니다.
        </p>

        <div className="text-center mt-12">
          <Link
            href="/room/main"
            className="inline-block px-8 py-4 bg-neon-magenta/20 border-2 border-neon-magenta/40 text-neon-magenta font-bold text-lg rounded-2xl hover:bg-neon-magenta/30 transition-all"
          >
            지금 바로 플레이하기 →
          </Link>
          <p className="text-white/20 text-xs mt-3">회원가입 후 무료로 즐길 수 있습니다</p>
        </div>
      </div>
    </div>
  );
}
