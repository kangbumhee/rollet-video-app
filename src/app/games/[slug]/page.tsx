import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const GAMES = [
  { slug: "big-roulette", emoji: "🎰", name: "빅 룰렛", desc: "배수를 선택하고 룰렛을 돌려 점수를 겨루는 운빨 대전! ×1부터 ×20까지 배팅하고 💀을 피하세요.", players: "2~50명", time: "3~9라운드", metaTitle: "빅 룰렛 - PartyPlay 파티게임 | 배수 배팅 룰렛 대전", metaDesc: "친구들과 빅 룰렛으로 운을 겨루세요. ×1~×20 배수 선택 후 룰렛을 돌려 점수를 얻는 무료 파티게임. 앱 설치 없이 모바일에서 바로 플레이." },
  { slug: "draw-guess", emoji: "🎨", name: "그림 맞추기", desc: "한 명이 그림을 그리면 나머지가 정답을 맞추는 캐치마인드 스타일 게임. 빠르게 맞출수록 높은 점수!", players: "2~50명", time: "3~9라운드", metaTitle: "그림 맞추기 - PartyPlay 파티게임 | 캐치마인드 대전", metaDesc: "그림을 그리고 맞추는 실시간 파티게임. 캐치마인드처럼 한 명이 그리면 나머지가 맞춥니다. 무료로 친구들과 플레이하세요." },
  { slug: "typing-battle", emoji: "⌨️", name: "타이핑 배틀", desc: "주어진 문장을 가장 빠르고 정확하게 타이핑하세요. 속도와 정확도 모두 중요!", players: "2~50명", time: "3~9라운드", metaTitle: "타이핑 배틀 - PartyPlay 파티게임 | 속도 타이핑 대전", metaDesc: "문장을 빠르고 정확하게 타이핑해 겨루는 파티게임. 모바일·PC에서 무료로 실시간 타이핑 배틀을 즐기세요." },
  { slug: "slither-battle", emoji: "🐍", name: "스네이크 서바이벌", desc: "뱀을 조종해 먹이를 먹고 점수를 겨루는 아케이드 게임. 벽이나 자기 몸에 부딪히면 게임 오버!", players: "2~50명", time: "3~9라운드", metaTitle: "스네이크 서바이벌 - PartyPlay 파티게임 | 뱀 게임 대전", metaDesc: "뱀을 조종해 먹이를 먹고 점수를 겨루는 멀티플레이 스네이크 게임. 친구들과 실시간으로 스네이크 서바이벌을 즐기세요." },
  { slug: "flappy-battle", emoji: "🐦", name: "플래피 배틀", desc: "장애물을 피하며 최고 점수를 겨루는 플래피버드 대전. 라운드마다 속도가 빨라집니다!", players: "2~50명", time: "3~9라운드", metaTitle: "플래피 배틀 - PartyPlay 파티게임 | 플래피버드 대전", metaDesc: "장애물을 피하며 점수를 겨루는 플래피 배틀. 라운드가 올라갈수록 속도 up! 무료 모바일 파티게임." },
  { slug: "bomb-survival", emoji: "💣", name: "폭탄 해제", desc: "제한 시간 내에 퀴즈를 맞혀 폭탄을 해제하세요. 못 맞추면 펑!", players: "2~50명", time: "3~9라운드", metaTitle: "폭탄 해제 - PartyPlay 파티게임 | 퀴즈 서바이벌", metaDesc: "퀴즈를 맞혀 폭탄을 해제하는 서바이벌 파티게임. 시간 내에 정답을 맞추세요. 무료로 친구들과 대전." },
  { slug: "tetris-battle", emoji: "🧱", name: "테트리스 배틀", desc: "클래식 테트리스 실력을 겨루는 멀티플레이 대전. 목표 줄 수를 먼저 달성하세요!", players: "2~50명", time: "3~9라운드", metaTitle: "테트리스 배틀 - PartyPlay 파티게임 | 테트리스 대전", metaDesc: "테트리스 실력을 겨루는 멀티플레이 파티게임. 목표 줄 수를 먼저 채우면 승리! 무료 온라인 테트리스 배틀." },
  { slug: "memory-match", emoji: "🃏", name: "메모리 매치", desc: "뒤집힌 카드의 짝을 찾는 기억력 대전. 라운드가 올라갈수록 카드가 늘어납니다!", players: "2~50명", time: "3~9라운드", metaTitle: "메모리 매치 - PartyPlay 파티게임 | 카드 짝맞추기 대전", metaDesc: "카드 짝 맞추기 기억력 대전 파티게임. 친구들과 메모리 매치로 실력을 겨루세요. 무료 모바일 보드게임." },
  { slug: "blind-auction", emoji: "📦", name: "블라인드 경매", desc: "힌트만 보고 숨겨진 상자에 칩을 배팅하는 심리전. 대박 상자를 찾아라!", players: "2~50명", time: "3~9라운드", metaTitle: "블라인드 경매 - PartyPlay 파티게임 | 심리전 배팅", metaDesc: "힌트로 숨겨진 상자를 맞추는 블라인드 경매 파티게임. 심리전과 배팅으로 친구들과 대전하세요." },
  { slug: "price-guess", emoji: "💰", name: "가격 맞추기", desc: "상품의 실제 가격에 가장 가까운 금액을 맞추세요. 경제 감각이 빛나는 게임!", players: "2~50명", time: "3~9라운드", metaTitle: "가격 맞추기 - PartyPlay 파티게임 | 가격 추리 대전", metaDesc: "상품 가격을 맞추는 가격 맞추기 파티게임. 경제 감각을 겨루며 친구들과 무료로 플레이하세요." },
  { slug: "weapon-forge", emoji: "⚔️", name: "검 강화", desc: "무기를 단계별로 강화하며 운을 시험하세요. 성공률이 점점 낮아집니다!", players: "2~50명", time: "3~9라운드", metaTitle: "검 강화 - PartyPlay 파티게임 | 무기 강화 운빨", metaDesc: "무기를 강화하며 운을 시험하는 검 강화 파티게임. 단계가 올라갈수록 성공률 하락! 무료로 플레이." },
] as const;

const SLUGS = GAMES.map((g) => g.slug);

type Game = (typeof GAMES)[number];
function getGame(slug: string): Game | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) return { title: "게임을 찾을 수 없습니다" };
  const title = game.metaTitle ?? `${game.name} - PartyPlay 파티게임`;
  const description = game.metaDesc ?? game.desc;
  return {
    title,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      title: `${game.name} - PartyPlay`,
      description,
      images: [{ url: "/og-image.png" }],
    },
  };
}

export default async function GameSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  return (
    <div className="min-h-screen bg-[#0A0A12] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/games" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← 파티게임 목록
          </Link>
        </div>

        <div className="text-center mb-10">
          <span className="text-6xl block mb-4">{game.emoji}</span>
          <h1 className="text-3xl font-black mb-3">
            <span className="text-neon-magenta">{game.name}</span>
          </h1>
          <p className="text-white/40 text-sm">
            {game.players} · {game.time}
          </p>
        </div>

        <div className="bg-surface-base border border-white/[0.06] rounded-2xl p-6 mb-10">
          <h2 className="text-neon-cyan font-bold text-lg mb-3">게임 소개</h2>
          <p className="text-white/70 leading-relaxed">{game.desc}</p>
        </div>

        <div className="text-center">
          <Link
            href="/room/main"
            className="inline-block px-8 py-4 bg-neon-magenta/20 border-2 border-neon-magenta/40 text-neon-magenta font-bold text-lg rounded-2xl hover:bg-neon-magenta/30 transition-all"
          >
            지금 플레이하기 →
          </Link>
          <p className="text-white/20 text-xs mt-3">메인 경품방에서 바로 플레이할 수 있어요</p>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <Link href="/games" className="text-neon-cyan/80 hover:text-neon-cyan text-sm font-medium">
            다른 파티게임 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
