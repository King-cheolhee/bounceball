import {
  BALL_RADIUS,
  HORIZONTAL_ACCELERATION,
  HORIZONTAL_FRICTION,
  TARGET_JUMP_HEIGHT,
  BASE_MAX_HORIZONTAL_SPEED,
  WALL_BOUNCE_DAMPING,
  WALL_KICK_SPEED_MULT,
  OVERSPEED_DECAY,
  BRAKE_MULTIPLIER,
} from '../../utils/constants';
import type { GameInput } from '../../utils/types';

/** 스테이지 N의 바운스 주기 (초). Stage 1 → 0.9초(시작 템포 +10%), Stage 20 → 0.4초. */
export function getBouncePeriod(stage: number): number {
  const START = 0.9;
  const END = 0.4;
  const t = Math.min(Math.max((stage - 1) / 19, 0), 1);
  return START - (START - END) * t;
}

export function getPhysicsForStage(stage: number) {
  const period = getBouncePeriod(stage);
  const gravity = (8 * TARGET_JUMP_HEIGHT) / (period * period);
  const bounceVelocity = -(gravity * period) / 2;
  const maxHorizontalSpeed = BASE_MAX_HORIZONTAL_SPEED * (1 + (stage - 1) * 0.05);
  return { gravity, bounceVelocity, maxHorizontalSpeed, period };
}

export class Ball {
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };
  readonly radius = BALL_RADIUS;

  private gravity = 980;
  private bounceVelocity = -600;
  private maxHorizontalSpeed = BASE_MAX_HORIZONTAL_SPEED;

  setStage(stage: number) {
    const p = getPhysicsForStage(stage);
    this.gravity = p.gravity;
    this.bounceVelocity = p.bounceVelocity;
    this.maxHorizontalSpeed = p.maxHorizontalSpeed;
  }

  spawn(x: number, y: number) {
    this.position.x = x;
    this.position.y = y;
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  update(dt: number, input: GameInput) {
    this.velocity.y += this.gravity * dt;

    const max = this.maxHorizontalSpeed;
    // 가속은 상한(max)까지만 — 입력으로는 절대 max를 넘지 못한다.
    // (리뷰 확정 critical: 기존 코드는 가속이 무제한이라 821px/s까지 폭주해
    //  모든 구멍/벽 설계가 무너졌음). 반대 방향 입력은 2배 제동 — 벽타기 방향 전환.
    if (input.left) {
      const a = this.velocity.x > 0 ? HORIZONTAL_ACCELERATION * BRAKE_MULTIPLIER : HORIZONTAL_ACCELERATION;
      if (this.velocity.x > -max) {
        this.velocity.x = Math.max(-max, this.velocity.x - a * dt);
      }
    }
    if (input.right) {
      const a = this.velocity.x < 0 ? HORIZONTAL_ACCELERATION * BRAKE_MULTIPLIER : HORIZONTAL_ACCELERATION;
      if (this.velocity.x < max) {
        this.velocity.x = Math.min(max, this.velocity.x + a * dt);
      }
    }

    // 마찰은 "무입력 + 초과속이 아닐 때"만 — 벽 반동 초과속은 아래 감쇠 분기가 전담
    // (리뷰 확정 major: 마찰이 초과속에도 걸려 반동 보너스가 33ms 만에 사라졌음)
    if (!input.left && !input.right && Math.abs(this.velocity.x) <= max) {
      this.velocity.x *= Math.pow(HORIZONTAL_FRICTION, dt * 60);
    }

    // 벽 반동 초과 속도: max를 향해 서서히 감쇠 (체공 한 번 동안 대부분 유지)
    if (this.velocity.x > max) {
      this.velocity.x = Math.max(max, this.velocity.x * Math.pow(OVERSPEED_DECAY, dt * 120));
    } else if (this.velocity.x < -max) {
      this.velocity.x = Math.min(-max, this.velocity.x * Math.pow(OVERSPEED_DECAY, dt * 120));
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  bounceOnFloor(floorY: number) {
    this.position.y = floorY - this.radius;
    this.velocity.y = this.bounceVelocity;
  }

  bounceOnCeiling(ceilingY: number) {
    this.position.y = ceilingY + this.radius;
    if (this.velocity.y < 0) this.velocity.y = -this.velocity.y * 0.5;
  }

  bounceOnWall(side: 'left' | 'right', wallX: number) {
    this.position.x = side === 'left' ? wallX + this.radius : wallX - this.radius;
    this.velocity.x = -this.velocity.x * WALL_BOUNCE_DAMPING;
  }

  /**
   * 벽 반동 점프 — 벽 충돌 직후 반대 방향 입력 타이밍이 맞으면
   * 벽을 밟고 도약: 수평은 최고속도의 1.35배, 수직은 풀 점프.
   * 깊은 골은 양 벽을 지그재그로, 옆 벽면은 같은 벽을 되짚으며 타고 오른다.
   */
  wallKick(dir: 1 | -1) {
    this.velocity.x = dir * this.maxHorizontalSpeed * WALL_KICK_SPEED_MULT;
    this.velocity.y = this.bounceVelocity;
  }

  /** 보호막(백업 셀) 소모 시 위로 튕겨내기 — 위험 지대를 벗어나게 한다. */
  rebound() {
    this.velocity.y = this.bounceVelocity;
  }

  /** 천장 가시에서 보호막 소모 시 — 아래로 밀어내 가시 띠를 벗어나게 한다.
   *  (위로 튕기면 가시 안으로 더 들어가 무적 루프 후 사망 — 리뷰 확정 버그 수정) */
  reboundDown() {
    this.velocity.y = Math.abs(this.bounceVelocity) * 0.6;
  }
}
