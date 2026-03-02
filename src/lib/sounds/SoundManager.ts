'use client';

type SoundName =
  | 'countdown-tick'
  | 'game-start'
  | 'click'
  | 'win-fanfare'
  | 'lose'
  | 'chat-pop'
  | 'prize-reveal'
  | 'ticket-get'
  | 'roulette-spin'
  | 'rps-select'
  | 'bgm-lobby'
  | 'bgm-battle'
  | 'bgm-winner';

const SOUND_CONFIG: Record<SoundName, { path: string; volume: number; loop?: boolean }> = {
  'countdown-tick': { path: '/sounds/game-start.wav', volume: 0.6 },
  'game-start': { path: '/sounds/game-start.wav', volume: 0.7 },
  'click': { path: '/sounds/click.wav', volume: 0.4 },
  'win-fanfare': { path: '/sounds/win-fanfare.wav', volume: 0.8 },
  'lose': { path: '/sounds/lose.wav', volume: 0.5 },
  'chat-pop': { path: '/sounds/chat-pop.wav', volume: 0.3 },
  'prize-reveal': { path: '/sounds/prize-reveal.wav', volume: 0.7 },
  'ticket-get': { path: '/sounds/ticket-get.wav', volume: 0.6 },
  'roulette-spin': { path: '/sounds/roulette-spin.wav', volume: 0.5 },
  'rps-select': { path: '/sounds/rps-select.wav', volume: 0.5 },
  'bgm-lobby': { path: '/sounds/bgm-lobby.mp3', volume: 0.25, loop: true },
  'bgm-battle': { path: '/sounds/bgm-battle.mp3', volume: 0.3, loop: true },
  'bgm-winner': { path: '/sounds/bgm-winner.mp3', volume: 0.35, loop: true },
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

  // 사용자 첫 인터랙션 시 오디오 잠금 해제
  private setupUnlock() {
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;

      // 무음 재생으로 오디오 컨텍스트 활성화
      const silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silent.volume = 0;
      silent.play().catch(() => {});

      // 대기 중인 BGM이 있으면 재생
      if (this._pendingBGM) {
        this.playBGM(this._pendingBGM);
        this._pendingBGM = null;
      }

      // 모든 프리로드된 사운드 활성화
      this.sounds.forEach((audio) => {
        audio.load();
      });

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

    if (!this._unlocked) return; // 잠금 해제 전에는 무시

    try {
      const audio = this.getOrCreate(name);
      if (!isBGM) {
        audio.currentTime = 0;
      }
      audio.play().catch(() => {});
    } catch {}
  }

  playBGM(name: SoundName) {
    if (typeof window === 'undefined' || !this._bgmEnabled) return;

    // 아직 잠금 해제 안 됐으면 대기
    if (!this._unlocked) {
      this._pendingBGM = name;
      return;
    }

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
      audio.volume = config.volume * this._masterVolume;
    });
  }

  preload(...names: SoundName[]) {
    names.forEach((name) => this.getOrCreate(name));
  }
}

export const soundManager = new SoundManager();
export type { SoundName };
