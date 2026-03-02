// src/lib/game/registry.ts
import type { GamePlugin, GameType } from "@/types/game";

// ─── 게임 플러그인 레지스트리 ───
// 새 게임 추가: 여기에 등록만 하면 자동으로 GameContainer가 로드
const GAME_PLUGINS: Map<GameType, GamePlugin> = new Map();

// ─── 가위바위보 ───
GAME_PLUGINS.set("rps", {
  type: "rps",
  name: "가위바위보 토너먼트",
  description: "1:1 가위바위보로 최후의 1인이 될 때까지!",
  icon: "✊",
  minPlayers: 2,
  maxPlayers: 64,
  defaultConfig: {
    roundTimeLimit: 5,
    lobbyDuration: 30,
    countdownDuration: 3,
    resultDisplayDuration: 5,
  },
  componentPath: "@/components/game/rps/RPSGame",
});

// ─── 룰렛 (4주차+) ───
GAME_PLUGINS.set("roulette", {
  type: "roulette",
  name: "행운의 룰렛",
  description: "룰렛을 돌려 당첨자를 결정!",
  icon: "🎡",
  minPlayers: 2,
  maxPlayers: 200,
  defaultConfig: {
    roundTimeLimit: 10,
    lobbyDuration: 30,
    countdownDuration: 3,
    resultDisplayDuration: 8,
  },
  componentPath: "@/components/game/roulette/RouletteGame",
});

// ─── OX퀴즈 (4주차+) ───
GAME_PLUGINS.set("oxQuiz", {
  type: "oxQuiz",
  name: "OX퀴즈",
  description: "퀴즈를 풀며 살아남기!",
  icon: "⭕",
  minPlayers: 2,
  maxPlayers: 500,
  defaultConfig: {
    roundTimeLimit: 10,
    lobbyDuration: 30,
    countdownDuration: 3,
    resultDisplayDuration: 5,
  },
  componentPath: "@/components/game/oxQuiz/OXQuizGame",
});

// ─── 숫자맞추기 (4주차+) ───
GAME_PLUGINS.set("numberGuess", {
  type: "numberGuess",
  name: "숫자맞추기",
  description: "1~100 사이 숫자를 가장 가까이 맞춘 사람이 승리!",
  icon: "🔢",
  minPlayers: 2,
  maxPlayers: 200,
  defaultConfig: {
    roundTimeLimit: 8,
    lobbyDuration: 30,
    countdownDuration: 3,
    resultDisplayDuration: 5,
  },
  componentPath: "@/components/game/numberGuess/NumberGuessGame",
});

// ─── 스피드클릭 (4주차+) ───
GAME_PLUGINS.set("speedClick", {
  type: "speedClick",
  name: "스피드클릭",
  description: "10초 동안 가장 많이 클릭한 사람이 승리!",
  icon: "⚡",
  minPlayers: 2,
  maxPlayers: 100,
  defaultConfig: {
    roundTimeLimit: 10,
    lobbyDuration: 30,
    countdownDuration: 3,
    resultDisplayDuration: 5,
  },
  componentPath: "@/components/game/speedClick/SpeedClickGame",
});

// ─── 레지스트리 API ───
export function getGamePlugin(type: GameType): GamePlugin | undefined {
  return GAME_PLUGINS.get(type);
}

export function getAllGamePlugins(): GamePlugin[] {
  return Array.from(GAME_PLUGINS.values());
}

export function isGameTypeValid(type: string): type is GameType {
  return GAME_PLUGINS.has(type as GameType);
}

export function getGameConfig(type: GameType) {
  const plugin = GAME_PLUGINS.get(type);
  if (!plugin) throw new Error(`Unknown game type: ${type}`);
  return {
    ...plugin.defaultConfig,
    maxParticipants: plugin.maxPlayers,
    minParticipants: plugin.minPlayers,
    requireTicket: true,
  };
}
