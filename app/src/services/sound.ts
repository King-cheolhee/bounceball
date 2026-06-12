/**
 * WebAudio API 기반 즉석 SFX 합성기.
 * 외부 파일 없이 짧은 효과음을 모두 합성 생성.
 *
 * 백그라운드 전환 시 audioContext.suspend(), 복귀 시 resume() — 검수 요구사항.
 */
export type SfxName =
  | 'bounce'        // 바닥 튕김 "탁"
  | 'wall'          // 벽 충돌 "팡"
  | 'fragile'       // 부서지는 바닥 "쩍"
  | 'explosive'     // 폭발 발판 "퍽"
  | 'spike'         // 가시 "찌릭"
  | 'clear'         // 클리어 "띵"
  | 'gameover'      // 게임오버 "둥"
  | 'button'        // 버튼 "틱"
  | 'revive';       // 부활 "팟"

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private muted = false;

  private ensure(): AudioContext | null {
    if (this.muted || !this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.45;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value && this.ctx) {
      void this.ctx.suspend();
    } else if (value && this.ctx) {
      void this.ctx.resume();
    }
  }

  suspend() {
    this.muted = true;
    if (this.ctx) void this.ctx.suspend();
  }

  resumeAfterBackground() {
    this.muted = false;
    if (this.ctx && this.enabled) void this.ctx.resume();
  }

  /** 사용자 첫 인터랙션 시 호출 — 모바일 브라우저 오디오 활성화. */
  unlock() {
    this.ensure();
  }

  play(name: SfxName) {
    const ctx = this.ensure();
    if (!ctx || !this.masterGain) return;
    switch (name) {
      case 'bounce':
        this.tone(ctx, this.masterGain, 'sine', 360, 320, 0.06, 0.32);
        break;
      case 'wall':
        this.tone(ctx, this.masterGain, 'square', 220, 140, 0.08, 0.22);
        break;
      case 'fragile':
        this.noise(ctx, this.masterGain, 0.08, 0.22, 'highpass', 1800);
        break;
      case 'explosive':
        this.tone(ctx, this.masterGain, 'sawtooth', 140, 40, 0.18, 0.5);
        this.noise(ctx, this.masterGain, 0.18, 0.35, 'lowpass', 600);
        break;
      case 'spike':
        this.noise(ctx, this.masterGain, 0.14, 0.4, 'bandpass', 2400);
        break;
      case 'clear':
        this.tone(ctx, this.masterGain, 'triangle', 660, 660, 0.08, 0.35);
        setTimeout(() => this.tone(ctx, this.masterGain!, 'triangle', 880, 880, 0.14, 0.4), 90);
        setTimeout(() => this.tone(ctx, this.masterGain!, 'triangle', 1320, 1320, 0.22, 0.45), 200);
        break;
      case 'gameover':
        this.tone(ctx, this.masterGain, 'triangle', 220, 110, 0.45, 0.45);
        break;
      case 'button':
        this.tone(ctx, this.masterGain, 'sine', 720, 720, 0.04, 0.18);
        break;
      case 'revive':
        this.tone(ctx, this.masterGain, 'triangle', 440, 880, 0.25, 0.4);
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freqStart: number,
    freqEnd: number,
    duration: number,
    peak: number,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(
    ctx: AudioContext,
    dest: AudioNode,
    duration: number,
    peak: number,
    filterType: BiquadFilterType,
    filterFreq: number,
  ) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(dest);
    src.start(now);
    src.stop(now + duration + 0.02);
  }
}

export const sound = new SoundEngine();
