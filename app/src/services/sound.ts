/**
 * WebAudio API 기반 즉석 SFX 합성기.
 * 외부 파일 없이 짧은 효과음을 모두 합성 생성.
 *
 * 백그라운드 전환 시 audioContext.suspend(), 복귀 시 resume() — 검수 요구사항.
 * 단, 복귀 시 자동 resume은 하지 않는다(모바일 오디오 정책 + 사고 방지) —
 * 다음 사용자 입력으로 발생하는 play()/unlock()의 ensure()가 자연스럽게 재개한다.
 *
 * 콤보 시스템: play('bounce', { pitch }) 로 반음 단위 피치 상승을 지원한다.
 * 반복 피로 방지: 일부 효과음은 재생마다 ±5% 피치 랜덤.
 */
export type SfxName =
  | 'bounce'        // 바닥 튕김 "탁"
  | 'perfect'       // 퍼펙트 바운스 "탁+띵" (한 옥타브 위 배음)
  | 'comboBreak'    // 콤보 단절 (반음 하강 2음, 짧게)
  | 'wall'          // 벽 충돌 "팡"
  | 'fragile'       // 부서지는 바닥 "쩍"
  | 'explosive'     // 폭발 발판 "퍽"
  | 'spike'         // 가시 "찌릭"
  | 'whoosh'        // 근소실패 "휙"
  | 'collect'       // 부품(◆) 수집 "삑"
  | 'shield'        // 백업 셀 획득 "위잉"
  | 'shieldBreak'   // 백업 셀 소모 "퍼석"
  | 'checkpoint'    // 세이브 셀 (종소리형)
  | 'unlock'        // 해금 팡파레 (스킨/채널)
  | 'boot'          // 전원 복구 (엔딩 부팅음)
  | 'clear'         // 클리어 "띵" (5음 상승 아르페지오)
  | 'gameover'      // 게임오버 "둥"
  | 'button'        // 버튼 "틱"
  | 'revive';       // 부활 "팟"

export interface PlayOptions {
  /** 주파수 배수. 콤보 n이면 2^(n/12) 식으로 반음씩 상승 */
  pitch?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
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
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.16;
      this.bgmGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** BGM 엔진(music.ts)이 같은 AudioContext를 공유하기 위한 접근자. */
  bus(): { ctx: AudioContext; bgm: GainNode } | null {
    const ctx = this.ensure();
    if (!ctx || !this.bgmGain) return null;
    return { ctx, bgm: this.bgmGain };
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

  /**
   * 백그라운드 복귀. 여기서 ctx.resume()을 직접 호출하지 않는다 —
   * 게임은 일시정지 상태이므로 사용자가 버튼을 누를 때(ensure 경유) 재개된다.
   */
  resumeAfterBackground() {
    this.muted = false;
  }

  /** 사용자 첫 인터랙션 시 호출 — 모바일 브라우저 오디오 활성화.
   *  (게임의 '해금' 시스템과는 무관한 오디오 정책 해제용 함수) */
  unlock() {
    this.ensure();
  }

  play(name: SfxName, opts: PlayOptions = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.masterGain) return;
    const g = this.masterGain;
    const pitch = opts.pitch ?? 1;
    /** ±5% 랜덤 — 같은 소리의 반복 피로 방지 */
    const vary = () => 1 + (Math.random() * 2 - 1) * 0.05;

    switch (name) {
      case 'bounce':
        this.tone(ctx, g, 'sine', 360 * pitch * vary(), 320 * pitch, 0.06, 0.32);
        break;
      case 'perfect':
        this.tone(ctx, g, 'sine', 360 * pitch, 320 * pitch, 0.06, 0.3);
        this.tone(ctx, g, 'square', 720 * pitch, 720 * pitch, 0.08, 0.16);
        break;
      case 'comboBreak':
        this.tone(ctx, g, 'triangle', 392, 392, 0.07, 0.18);
        setTimeout(() => this.tone(ctx, g, 'triangle', 370, 370, 0.09, 0.15), 70);
        break;
      case 'wall':
        this.tone(ctx, g, 'square', 220 * vary(), 140, 0.08, 0.22);
        break;
      case 'fragile':
        this.noise(ctx, g, 0.08, 0.22, 'highpass', 1800);
        break;
      case 'explosive':
        this.tone(ctx, g, 'sawtooth', 140, 40, 0.18, 0.5);
        this.noise(ctx, g, 0.18, 0.35, 'lowpass', 600);
        break;
      case 'spike':
        this.noise(ctx, g, 0.14, 0.4, 'bandpass', 2400);
        break;
      case 'whoosh':
        this.noiseSweep(ctx, g, 0.09, 0.2, 2000, 6000);
        break;
      case 'collect':
        this.tone(ctx, g, 'square', 988, 988, 0.06, 0.2);
        setTimeout(() => this.tone(ctx, g, 'square', 1319, 1319, 0.09, 0.22), 60);
        break;
      case 'shield':
        this.tone(ctx, g, 'sine', 660, 990, 0.14, 0.28);
        break;
      case 'shieldBreak':
        this.noise(ctx, g, 0.12, 0.3, 'highpass', 900);
        this.tone(ctx, g, 'sawtooth', 520, 180, 0.16, 0.25);
        break;
      case 'checkpoint':
        // 종소리형: 기음 + 5도 배음 동시, 긴 감쇠 — "세이브 셀에 기록되었다"
        this.tone(ctx, g, 'sine', 880, 880, 0.8, 0.22);
        this.tone(ctx, g, 'sine', 1320, 1320, 0.8, 0.12);
        break;
      case 'unlock': {
        // 4음 상행 + 마지막 화음 — 해금 팡파레
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
          setTimeout(() => this.tone(ctx, g, 'square', f, f, 0.1, 0.22), i * 90);
        });
        setTimeout(() => {
          this.tone(ctx, g, 'square', 1047, 1047, 0.4, 0.18);
          this.tone(ctx, g, 'square', 1319, 1319, 0.4, 0.12);
        }, notes.length * 90);
        break;
      }
      case 'boot': {
        // 전원 복구: 저음 스윕 상승 + 3음 메이저 화음 (옛 게임기 부팅음)
        this.tone(ctx, g, 'triangle', 80, 440, 0.5, 0.3);
        setTimeout(() => {
          this.tone(ctx, g, 'square', 523, 523, 0.55, 0.18);
          this.tone(ctx, g, 'square', 659, 659, 0.55, 0.14);
          this.tone(ctx, g, 'square', 784, 784, 0.55, 0.14);
        }, 480);
        break;
      }
      case 'clear': {
        // '소리 문 열림' 개편 — 5음 상승 아르페지오 + 마지막 음 잔향
        const seq = [523, 659, 784, 1047, 1319];
        seq.forEach((f, i) => {
          const last = i === seq.length - 1;
          setTimeout(
            () => this.tone(ctx, g, 'triangle', f, f, last ? 0.5 : 0.09, last ? 0.4 : 0.3),
            i * 80,
          );
        });
        break;
      }
      case 'gameover':
        this.tone(ctx, g, 'triangle', 220, 110, 0.45, 0.45);
        break;
      case 'button':
        this.tone(ctx, g, 'sine', 720, 720, 0.04, 0.18);
        break;
      case 'revive':
        this.tone(ctx, g, 'triangle', 440, 880, 0.25, 0.4);
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

  /** 밴드패스 주파수가 스윕하는 노이즈 — 근소실패 "휙" 전용. */
  private noiseSweep(
    ctx: AudioContext,
    dest: AudioNode,
    duration: number,
    peak: number,
    freqStart: number,
    freqEnd: number,
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
    filter.type = 'bandpass';
    filter.Q.value = 2;
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(freqStart, now);
    filter.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(dest);
    src.start(now);
    src.stop(now + duration + 0.02);
  }
}

export const sound = new SoundEngine();
