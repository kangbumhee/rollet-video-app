// src/lib/cycle/botMessages.ts
import type { BotMessage, BotMessageTrigger } from '@/types/cycle';

const BOT_MESSAGES: BotMessage[] = [
  {
    trigger: 'CYCLE_START',
    templates: [
      '🎬 새로운 라운드가 시작됩니다! 오늘의 경품은 무엇일까요?',
      '🔔 다음 경품이 곧 공개됩니다! 기대해주세요~',
      '✨ 여러분, 준비되셨나요? 새 라운드가 시작됩니다!',
    ],
  },
  {
    trigger: 'PRIZE_ANNOUNCE',
    templates: [
      '🎁 이번 경품은 "{prizeTitle}"입니다! 예상 가치: {estimatedValue}원!',
      '🎉 와! "{prizeTitle}" 경품이 걸렸습니다! 놓치지 마세요!',
      '💎 오늘의 경품 공개! "{prizeTitle}" — {estimatedValue}원 상당!',
    ],
  },
  {
    trigger: 'ENTRY_GATE_OPEN',
    templates: [
      '🎫 입장 게이트가 열렸습니다! 광고를 시청하고 티켓을 받으세요!',
      '🚪 게이트 오픈! 지금 입장하면 게임에 참가할 수 있어요!',
      '📺 광고를 시청하면 참가 티켓을 받을 수 있습니다. 서두르세요!',
    ],
  },
  {
    trigger: 'GAME_START',
    templates: [
      '🎮 게임이 시작됩니다! 모두 화이팅!',
      '⚔️ 대결 시작! 최후의 1인이 되어 경품을 차지하세요!',
      '🏁 게임 시작! 여러분의 행운을 빕니다!',
    ],
  },
  {
    trigger: 'ROUND_START',
    templates: [
      '🔄 {roundNumber}라운드 시작! 생존자 {aliveCount}명!',
      '⚡ {roundNumber}라운드! 남은 도전자 {aliveCount}명!',
    ],
  },
  {
    trigger: 'ROUND_END',
    templates: [
      '📊 {roundNumber}라운드 종료! {eliminatedCount}명 탈락, {aliveCount}명 생존!',
      '💥 {eliminatedCount}명이 탈락했습니다! 생존자 {aliveCount}명!',
    ],
  },
  {
    trigger: 'WINNER_ANNOUNCE',
    templates: [
      '🏆🎊 축하합니다! "{winnerName}"님이 "{prizeTitle}"의 주인공입니다!',
      '🎉🎉🎉 우승자 발표! "{winnerName}"님 축하드립니다!!',
      '👑 "{winnerName}"님이 경품을 획득하셨습니다! 짝짝짝!',
    ],
  },
  {
    trigger: 'COOLDOWN',
    templates: [
      '⏰ 다음 경품은 {nextSlot}에 시작됩니다! 잠시 쉬어가세요~',
      '☕ 잠시 후 다음 라운드가 시작됩니다. {nextSlot}에 만나요!',
      '💤 쿨다운 타임! 다음 경품까지 잠시만 기다려주세요. ({nextSlot})',
    ],
  },
  {
    trigger: 'PERIODIC_HYPE',
    templates: [
      '🔥 현재 {onlineCount}명이 시청 중! 열기가 뜨겁습니다!',
      '👀 {onlineCount}명이 함께하고 있어요! 경쟁이 치열합니다!',
      '💪 포기하지 마세요! 다음 기회가 곧 옵니다!',
      '🍀 오늘 행운의 주인공은 누구일까요?',
    ],
  },
  {
    trigger: 'PARTICIPANT_MILESTONE',
    templates: [
      '🎯 참가자가 {count}명을 돌파했습니다! 대단해요!',
      '📈 와! 벌써 {count}명이 참가했어요!',
    ],
  },
  {
    trigger: 'LOW_PARTICIPANTS',
    templates: [
      '📢 참가자가 아직 적어요! 지금 참가하면 당첨 확률 UP!',
      '🎲 참가자가 적을수록 확률은 높아집니다! 서두르세요!',
    ],
  },
];

export function getBotMessage(
  trigger: BotMessageTrigger,
  variables?: Record<string, string | number>
): string {
  const messageSet = BOT_MESSAGES.find((m) => m.trigger === trigger);
  if (!messageSet || messageSet.templates.length === 0) {
    return '📢 알림';
  }

  const template = messageSet.templates[Math.floor(Math.random() * messageSet.templates.length)];
  if (!variables) return template;

  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export const BOT_USER = {
  uid: 'BOT_HOST',
  displayName: '🎪 방장봇',
  photoURL: null,
  level: 99,
};
