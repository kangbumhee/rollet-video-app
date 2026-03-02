'use client';

type SoundName =
  // 기존
  | 'countdown-tick' | 'countdown-final'
  | 'game-start' | 'click'
  | 'win-fanfare' | 'lose'
  | 'chat-pop' | 'prize-reveal' | 'ticket-get'
  | 'roulette-spin' | 'rps-select'
  // 새로 추가
  | 'correct' | 'wrong'
  | 'coin-flip' | 'dice-roll' | 'slot-spin' | 'card-flip'
  | 'combo' | 'new-record'
  | 'bomb-tick' | 'explosion'
  | 'horse-gallop' | 'cash-register'
  | 'whoosh' | 'pop-up'
  // BGM
  | 'bgm-lobby' | 'bgm-battle' | 'bgm-winner' | 'bgm-minigame';

const SOUND_CONFIG: Record<SoundName, { path: string; volume: number; loop?: boolean }> = {
  // 기존 SFX
  'countdown-tick':   { path: '/sounds/countdown-tick.wav', volume: 0.6 },
  'countdown-final':  { path: '/sounds/countdown-final.wav', volume: 0.7 },
  'game-start':       { path: '/sounds/game-start.wav', volume: 0.7 },
  'click':            { path: '/sounds/click.wav', volume: 0.4 },
  'win-fanfare':      { path: '/sounds/win-fanfare.wav', volume: 0.8 },
  'lose':             { path: '/sounds/lose.wav', volume: 0.5 },
  'chat-pop':         { path: '/sounds/chat-pop.wav', volume: 0.3 },
  'prize-reveal':     { path: '/sounds/prize-reveal.wav', volume: 0.7 },
  'ticket-get':       { path: '/sounds/ticket-get.wav', volume: 0.6 },
  'roulette-spin':    { path: '/sounds/roulette-spin.wav', volume: 0.5 },
  'rps-select':       { path: '/sounds/rps-select.wav', volume: 0.5 },

  // 새 SFX
  'correct':          { path: '/sounds/correct.wav', volume: 0.6 },
  'wrong':            { path: '/sounds/wrong.wav', volume: 0.5 },
  'coin-flip':        { path: '/sounds/coin-flip.wav', volume: 0.5 },
  'dice-roll':        { path: '/sounds/dice-roll.wav', volume: 0.5 },
  'slot-spin':        { path: '/sounds/slot-spin.wav', volume: 0.5 },
  'card-flip':        { path: '/sounds/card-flip.wav', volume: 0.4 },
  'combo':            { path: '/sounds/combo.wav', volume: 0.6 },
  'new-record':       { path: '/sounds/new-record.wav', volume: 0.8 },
  'bomb-tick':        { path: '/sounds/bomb-tick.wav', volume: 0.5 },
  'explosion':        { path: '/sounds/explosion.wav', volume: 0.6 },
  'horse-gallop':     { path: '/sounds/horse-gallop.wav', volume: 0.4 },
  'cash-register':    { path: '/sounds/cash-register.wav', volume: 0.6 },
  'whoosh':           { path: '/sounds/whoosh.wav', volume: 0.4 },
  'pop-up':           { path: '/sounds/pop-up.wav', volume: 0.5 },

  // BGM
  'bgm-lobby':        { path: '/sounds/bgm-lobby.mp3', volume: 0.25, loop: true },
  'bgm-battle':       { path: '/sounds/bgm-battle.mp3', volume: 0.3, loop: true },
  'bgm-winner':       { path: '/sounds/bgm-winner.mp3', volume: 0.35, loop: true },
  'bgm-minigame':     { path: '/sounds/bgm-battle.mp3', volume: 0.2, loop: true }, // battle을 재사용 (나중에 별도 파일 교체)
};

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private currentBGM: HTMLAudioElement | null = null;
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
      this.sounds.forEach((audio) => { audio.load(); });
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
    this.stopBGM();
    try {
      const audio = this.getOrCreate(name);
      audio.currentTime = 0;
      audio.play().catch(() => {});
      this.currentBGM = audio;
    } catch {}
  }

  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM.currentTime = 0;
      this.currentBGM = null;
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
