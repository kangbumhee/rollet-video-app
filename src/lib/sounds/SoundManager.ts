'use client';

type SoundName =
  // ── 공통 UI ──
  | 'click' | 'pop-up' | 'whoosh'
  | 'chat-pop' | 'game-start' | 'prize-reveal' | 'ticket-get' | 'rps-select'
  // ── 타이머 ──
  | 'countdown-tick' | 'countdown-final'
  // ── 결과 ──
  | 'correct' | 'wrong' | 'win-fanfare' | 'lose'
  | 'combo' | 'new-record'
  // ── 그림 맞추기 ──
  | 'draw-stroke' | 'draw-correct'
  // ── 라인 러너 ──
  | 'line-run' | 'line-crash'
  // ── 라이어 투표 ──
  | 'vote-cast' | 'liar-reveal' | 'liar-caught'
  // ── 타이핑 배틀 ──
  | 'typing-key' | 'typing-complete'
  // ── 폭탄 돌리기 ──
  | 'bomb-tick' | 'bomb-pass' | 'explosion'
  // ── 가격 맞추기 ──
  | 'cash-register' | 'price-close' | 'price-far'
  // ── OX 서바이벌 ──
  | 'ox-select' | 'ox-survive' | 'ox-eliminate'
  // ── 탭 서바이벌 ──
  | 'tap-hit' | 'tap-frenzy' | 'tap-eliminate'
  // ── 눈치 게임 ──
  | 'nunchi-claim' | 'nunchi-clash' | 'nunchi-safe'
  // ── 순발력 터치 ──
  | 'target-appear' | 'target-hit' | 'target-miss'
  // ── 운명의 경매 / 무기 강화 / 빅 룰렛 ──
  | 'coin-flip' | 'card-flip' | 'slot-spin' | 'roulette-spin'
  // ── 운 기반 미니게임 ──
  | 'dice-roll' | 'horse-gallop'
  // ── BGM ──
  | 'bgm-lobby' | 'bgm-battle' | 'bgm-winner'
  | 'bgm-tension' | 'bgm-minigame';

// 새 효과음은 기존 파일을 재활용 매핑 (파일이 없으면 가장 유사한 기존 파일 사용)
// -> 나중에 실제 파일로 교체하면 됨
const SOUND_CONFIG: Record<SoundName, { path: string; volume: number; loop?: boolean }> = {
  // ── 공통 UI ──
  'click':              { path: '/sounds/click.wav', volume: 0.4 },
  'pop-up':             { path: '/sounds/pop-up.wav', volume: 0.5 },
  'whoosh':             { path: '/sounds/whoosh.wav', volume: 0.4 },
  'chat-pop':           { path: '/sounds/chat-pop.wav', volume: 0.3 },
  'game-start':         { path: '/sounds/game-start.wav', volume: 0.7 },
  'prize-reveal':       { path: '/sounds/prize-reveal.wav', volume: 0.7 },
  'ticket-get':         { path: '/sounds/ticket-get.wav', volume: 0.6 },
  'rps-select':         { path: '/sounds/rps-select.wav', volume: 0.5 },

  // ── 타이머 ──
  'countdown-tick':     { path: '/sounds/countdown-tick.wav', volume: 0.6 },
  'countdown-final':    { path: '/sounds/countdown-final.wav', volume: 0.7 },

  // ── 결과 ──
  'correct':            { path: '/sounds/correct.wav', volume: 0.6 },
  'wrong':              { path: '/sounds/wrong.wav', volume: 0.5 },
  'win-fanfare':        { path: '/sounds/win-fanfare.wav', volume: 0.8 },
  'lose':               { path: '/sounds/lose.wav', volume: 0.5 },
  'combo':              { path: '/sounds/combo.wav', volume: 0.6 },
  'new-record':         { path: '/sounds/new-record.wav', volume: 0.8 },

  // ── 그림 맞추기 ──
  'draw-stroke':        { path: '/sounds/click.wav', volume: 0.15 },
  'draw-correct':       { path: '/sounds/correct.wav', volume: 0.7 },

  // ── 라인 러너 ──
  'line-run':           { path: '/sounds/whoosh.wav', volume: 0.3 },
  'line-crash':         { path: '/sounds/explosion.wav', volume: 0.5 },

  // ── 라이어 투표 ──
  'vote-cast':          { path: '/sounds/click.wav', volume: 0.5 },
  'liar-reveal':        { path: '/sounds/prize-reveal.wav', volume: 0.6 },
  'liar-caught':        { path: '/sounds/win-fanfare.wav', volume: 0.6 },

  // ── 타이핑 배틀 ──
  'typing-key':         { path: '/sounds/click.wav', volume: 0.1 },
  'typing-complete':    { path: '/sounds/correct.wav', volume: 0.6 },

  // ── 폭탄 돌리기 ──
  'bomb-tick':          { path: '/sounds/bomb-tick.wav', volume: 0.5 },
  'bomb-pass':          { path: '/sounds/whoosh.wav', volume: 0.5 },
  'explosion':          { path: '/sounds/explosion.wav', volume: 0.6 },

  // ── 가격 맞추기 ──
  'cash-register':      { path: '/sounds/cash-register.wav', volume: 0.6 },
  'price-close':        { path: '/sounds/correct.wav', volume: 0.5 },
  'price-far':          { path: '/sounds/wrong.wav', volume: 0.4 },

  // ── OX 서바이벌 ──
  'ox-select':          { path: '/sounds/click.wav', volume: 0.5 },
  'ox-survive':         { path: '/sounds/correct.wav', volume: 0.6 },
  'ox-eliminate':       { path: '/sounds/lose.wav', volume: 0.5 },

  // ── 탭 서바이벌 ──
  'tap-hit':            { path: '/sounds/click.wav', volume: 0.2 },
  'tap-frenzy':         { path: '/sounds/combo.wav', volume: 0.5 },
  'tap-eliminate':      { path: '/sounds/lose.wav', volume: 0.5 },

  // ── 눈치 게임 ──
  'nunchi-claim':       { path: '/sounds/pop-up.wav', volume: 0.5 },
  'nunchi-clash':       { path: '/sounds/explosion.wav', volume: 0.5 },
  'nunchi-safe':        { path: '/sounds/correct.wav', volume: 0.5 },

  // ── 순발력 터치 ──
  'target-appear':      { path: '/sounds/pop-up.wav', volume: 0.3 },
  'target-hit':         { path: '/sounds/correct.wav', volume: 0.4 },
  'target-miss':        { path: '/sounds/wrong.wav', volume: 0.3 },

  // ── 운명의 경매 / 무기 강화 / 빅 룰렛 ──
  'coin-flip':          { path: '/sounds/coin-flip.wav', volume: 0.5 },
  'card-flip':          { path: '/sounds/card-flip.wav', volume: 0.5 },
  'slot-spin':          { path: '/sounds/slot-spin.wav', volume: 0.5 },
  'roulette-spin':      { path: '/sounds/roulette-spin.wav', volume: 0.5 },

  // ── 운 기반 미니게임 ──
  'dice-roll':          { path: '/sounds/click.wav', volume: 0.5 },
  'horse-gallop':       { path: '/sounds/whoosh.wav', volume: 0.4 },

  // ── BGM ──
  'bgm-lobby':          { path: '/sounds/bgm-lobby.mp3', volume: 0.25, loop: true },
  'bgm-battle':         { path: '/sounds/bgm-battle.mp3', volume: 0.3, loop: true },
  'bgm-winner':         { path: '/sounds/bgm-winner.mp3', volume: 0.35, loop: true },
  'bgm-tension':        { path: '/sounds/bgm-battle.mp3', volume: 0.35, loop: true },
  'bgm-minigame':       { path: '/sounds/bgm-battle.mp3', volume: 0.2, loop: true },
};

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private currentBGM: HTMLAudioElement | null = null;
  private currentBGMName: SoundName | null = null;
  private _sfxEnabled = true;
  private _bgmEnabled = true;
  private _masterVolume = 1;
  private _unlocked = false;
  private _pendingBGM: SoundName | null = null;

  get sfxEnabled() { return this._sfxEnabled; }
  get bgmEnabled() { return this._bgmEnabled; }
  get isUnlocked() { return this._unlocked; }

  constructor() {
    if (typeof window !== 'undefined') {
      this._sfxEnabled = localStorage.getItem('sfxEnabled') !== 'false';
      this._bgmEnabled = localStorage.getItem('bgmEnabled') !== 'false';
      this._masterVolume = parseFloat(localStorage.getItem('masterVolume') || '1');
      this.setupUnlock();
    }
  }

  private setupUnlock() {
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silent.volume = 0;
      silent.play().catch(() => {});
      if (this._pendingBGM) {
        this.playBGM(this._pendingBGM);
        this._pendingBGM = null;
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock, { once: false });
    document.addEventListener('touchstart', unlock, { once: false });
    document.addEventListener('keydown', unlock, { once: false });
  }

  private getOrCreate(name: SoundName): HTMLAudioElement {
    if (!this.sounds.has(name)) {
      const config = SOUND_CONFIG[name];
      if (!config) return new Audio();
      const audio = new Audio(config.path);
      audio.volume = config.volume * this._masterVolume;
      audio.loop = config.loop || false;
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
    return this.sounds.get(name)!;
  }

  play(name: SoundName) {
    if (typeof window === 'undefined') return;
    const isBGM = name.startsWith('bgm-');
    if (isBGM && !this._bgmEnabled) return;
    if (!isBGM && !this._sfxEnabled) return;
    if (!this._unlocked) return;
    try {
      const audio = this.getOrCreate(name);
      if (!isBGM) audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }

  playBGM(name: SoundName) {
    if (typeof window === 'undefined' || !this._bgmEnabled) return;
    if (!this._unlocked) { this._pendingBGM = name; return; }
    if (this.currentBGMName === name && this.currentBGM && !this.currentBGM.paused) return;
    this.stopBGM();
    try {
      const audio = this.getOrCreate(name);
      audio.currentTime = 0;
      audio.play().catch(() => {});
      this.currentBGM = audio;
      this.currentBGMName = name;
    } catch {}
  }

  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM.currentTime = 0;
      this.currentBGM = null;
      this.currentBGMName = null;
    }
    this._pendingBGM = null;
  }

  toggleSFX() {
    this._sfxEnabled = !this._sfxEnabled;
    localStorage.setItem('sfxEnabled', String(this._sfxEnabled));
    return this._sfxEnabled;
  }

  toggleBGM() {
    this._bgmEnabled = !this._bgmEnabled;
    localStorage.setItem('bgmEnabled', String(this._bgmEnabled));
    if (!this._bgmEnabled) this.stopBGM();
    return this._bgmEnabled;
  }

  setMasterVolume(vol: number) {
    this._masterVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('masterVolume', String(this._masterVolume));
    this.sounds.forEach((audio, key) => {
      const config = SOUND_CONFIG[key as SoundName];
      if (config) audio.volume = config.volume * this._masterVolume;
    });
  }

  preload(...names: SoundName[]) {
    names.forEach((name) => this.getOrCreate(name));
  }
}

export const soundManager = new SoundManager();
export type { SoundName };
