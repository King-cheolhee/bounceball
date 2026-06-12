/**
 * 절차 생성 칩튠 BGM 엔진 — 외부 오디오 파일 0개.
 *
 * 해금 시스템과 직결: 챕터 보스(5/10/15) 클리어 시 사운드 칩 채널이 복구되어
 * 레이어가 한 겹씩 쌓인다 (0=무음 → 1=베이스 → 2=+아르페지오 → 3=+비트).
 * 스토리 B안: 죽어가던 게임기의 사운드 칩이 되살아나는 과정.
 *
 * 구현: MDN lookahead 스케줄러 패턴 — setInterval(25ms)로 깨어나
 * currentTime + 0.12초 범위의 노트를 선행 예약. 16스텝 루프.
 * 템포는 스테이지가 깊어질수록 빨라진다 (CPU 클럭 상승의 내러티브).
 */
import { sound } from './sound';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;
const STEPS = 16;

// A 마이너 펜타토닉 기반 16스텝 패턴 (0 = 쉼표)
const BASS_PATTERN: number[] = [55, 0, 0, 55, 0, 65.41, 0, 55, 82.41, 0, 0, 55, 0, 98, 65.41, 0];
const ARP_PATTERN: number[] = [220, 0, 261.63, 0, 329.63, 0, 440, 0, 329.63, 0, 261.63, 0, 220, 0, 329.63, 0];
// 하이햇: 1 = 약, 2 = 강
const HAT_PATTERN: number[] = [2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 0, 1, 2];

class MusicEngine {
  private timer: number | null = null;
  private step = 0;
  private nextNoteTime = 0;
  private layers = 0;
  private bpm = 104;
  private playing = false;

  /** 게임 플레이 진입/스테이지 전환 시 호출. layers=0이면 루프는 돌지만 무음. */
  start(layers: number, stage: number) {
    this.layers = layers;
    this.bpm = 96 + stage * 2; // Stage 1 = 98bpm → Stage 20 = 136bpm
    if (this.playing) return;
    const bus = sound.bus();
    if (!bus) return; // 사운드 꺼짐/뮤트 — 다음 start에서 재시도
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = bus.ctx.currentTime + 0.05;
    this.timer = window.setInterval(this.scheduler, LOOKAHEAD_MS);
  }

  setProgress(layers: number, stage: number) {
    this.layers = layers;
    this.bpm = 96 + stage * 2;
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  private scheduler = () => {
    const bus = sound.bus();
    if (!bus) return;
    const { ctx, bgm } = bus;
    const stepDur = 60 / this.bpm / 4; // 16분음표
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      this.scheduleStep(ctx, bgm, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % STEPS;
    }
  };

  private scheduleStep(ctx: AudioContext, dest: AudioNode, step: number, time: number, stepDur: number) {
    if (this.layers >= 1) {
      const f = BASS_PATTERN[step];
      if (f > 0) this.note(ctx, dest, 'triangle', f, time, stepDur * 1.8, 0.5);
    }
    if (this.layers >= 2) {
      const f = ARP_PATTERN[step];
      if (f > 0) this.note(ctx, dest, 'square', f, time, stepDur * 0.9, 0.16);
    }
    if (this.layers >= 3) {
      const accent = HAT_PATTERN[step];
      if (accent > 0) this.hat(ctx, dest, time, accent === 2 ? 0.14 : 0.07);
    }
  }

  private note(
    ctx: AudioContext,
    dest: AudioNode,
    type: OscillatorType,
    freq: number,
    time: number,
    duration: number,
    peak: number,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(dest);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  private hat(ctx: AudioContext, dest: AudioNode, time: number, peak: number) {
    const duration = 0.04;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter).connect(gain).connect(dest);
    src.start(time);
    src.stop(time + duration + 0.01);
  }
}

export const music = new MusicEngine();
