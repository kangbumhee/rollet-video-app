import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용 가이드 - PartyPlay 파티게임",
  description:
    "PartyPlay 파티게임 어플 이용 방법. 회원가입, 방 만들기, 게임 시작, 경품 참여 방법을 안내합니다.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#0A0A12] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-black mb-6">PartyPlay 이용 가이드</h1>
        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-neon-cyan">1. 회원가입 & 로그인</h2>
          <p className="text-white/60 text-sm">
            로그인 버튼을 눌러 소셜 계정으로 간편 가입 후, 메인에서 메인 경품방 또는 파티방을 선택해 입장하세요.
          </p>
        </section>
        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-neon-cyan">2. 게임 시작 (파티방)</h2>
          <p className="text-white/60 text-sm">
            파티방에서는 &quot;파티 게임 시작&quot; 버튼으로 빅 룰렛, 그림 맞추기 등 11종 게임 중 하나를 고르고, 3/6/9 라운드를 선택해 시작할 수 있습니다. 게임을 시작한 사람만 &quot;게임 종료&quot;로 강제 종료할 수 있습니다.
          </p>
        </section>
        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-neon-cyan">3. 경품 참여 (메인방)</h2>
          <p className="text-white/60 text-sm">
            메인 경품방은 30분마다 자동으로 게임이 진행됩니다. 모집 중일 때 &quot;참가하기&quot;를 누르면 해당 회차에 참여하며, 게임에서 1등을 하면 경품을 받을 수 있습니다. 24시간 자동 운영됩니다.
          </p>
        </section>
        <section className="space-y-4 mb-8">
          <h2 className="text-lg font-bold text-neon-cyan">4. 미니게임</h2>
          <p className="text-white/60 text-sm">
            대기 시간에는 &quot;미니게임 하기&quot;로 코인 플립, 슬롯머신 등 30종 솔로 미니게임을 즐기며 포인트를 모을 수 있습니다.
          </p>
        </section>
        <p className="text-center mt-8">
          <Link href="/" className="text-neon-magenta font-bold hover:underline">← 메인으로</Link>
        </p>
      </div>
    </div>
  );
}
