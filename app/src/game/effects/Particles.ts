/**
 * 경량 파티클 + 파동 링 시스템 (월드 좌표, Canvas 직접 드로잉).
 * 흑백 원칙: 흰 사각 픽셀 파편 + 1px 동심원 파동. 알파 페이드 대신
 * 크기 축소·점멸로 소멸을 표현해 LCD 느낌을 유지한다.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number; // 남은 수명(초)
  maxLife: number;
  gravity: number;
  blink: boolean;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  speed: number; // px/s
}

export interface BurstOptions {
  count?: number;
  speed?: number; // 초기 속도 크기
  size?: number;
  life?: number;
  gravity?: number;
  upBias?: number; // 위쪽으로 쏠리는 정도 (0~1)
  blink?: boolean;
}

const MAX_PARTICLES = 220;

export class ParticleSystem {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private seed = 1;

  /** 결정적 의사난수 (Math.random 호출 최소화 목적 아님 — 테스트 재현성용). */
  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  burst(x: number, y: number, opts: BurstOptions = {}) {
    const count = opts.count ?? 6;
    const speed = opts.speed ?? 180;
    const size = opts.size ?? 4;
    const life = opts.life ?? 0.5;
    const gravity = opts.gravity ?? 700;
    const upBias = opts.upBias ?? 0.5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = this.rand() * Math.PI * 2;
      const mag = speed * (0.4 + this.rand() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * mag,
        vy: Math.sin(angle) * mag - speed * upBias,
        size: size * (0.6 + this.rand() * 0.8),
        life,
        maxLife: life,
        gravity,
        blink: opts.blink ?? false,
      });
    }
  }

  /** 바운스 지점에서 퍼지는 신호 파동(B안: 픽셀의 전기 신호). 콤보가 클수록 크게. */
  ring(x: number, y: number, maxR: number, speed = 240) {
    if (this.rings.length > 12) this.rings.shift();
    this.rings.push({ x, y, r: 2, maxR, speed });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += r.speed * dt;
      if (r.r >= r.maxR) this.rings.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, timeMs: number) {
    ctx.fillStyle = '#ffffff';
    for (const p of this.particles) {
      if (p.blink && Math.floor(timeMs / 60) % 2 === 0) continue;
      const t = p.life / p.maxLife;
      const s = Math.max(1, p.size * t);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (const r of this.rings) {
      // 파동은 커질수록 점선 간격이 벌어지며 사라지는 느낌
      const t = r.r / r.maxR;
      ctx.setLineDash([Math.max(2, 8 * (1 - t)), 4 + 10 * t]);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  clear() {
    this.particles = [];
    this.rings = [];
    this.seed = 1; // 결정성 보장 — 스테이지 로드마다 동일한 패턴
  }
}
