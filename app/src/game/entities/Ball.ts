import {
  BALL_RADIUS,
  HORIZONTAL_ACCELERATION,
  HORIZONTAL_FRICTION,
  TARGET_JUMP_HEIGHT,
  BASE_MAX_HORIZONTAL_SPEED,
  WALL_BOUNCE_DAMPING,
  WALL_KICK_SPEED_MULT,
  OVERSPEED_DECAY,
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

    if (input.left) this.velocity.x -= HORIZONTAL_ACCELERATION * dt;
    if (input.right) this.velocity.x += HORIZONTAL_ACCELERATION * dt;

    if (!input.left && !input.right) {
      this.velocity.x *= Math.pow(HORIZONTAL_FRICTION, dt * 60);
    }

    // 속도 제한 — 벽 반동으로 인한 초과 속도는 즉시 자르지 않고 서서히 감쇠
    // (원조 공튀기기: 벽 반동 직후가 가장 멀리 나는 순간)
    const max = this.maxHorizontalSpeed;
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
