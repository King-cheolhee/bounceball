import {
  CAMERA_DEADZONE_X,
  CAMERA_DEADZONE_Y,
  CAMERA_HARD_EDGE,
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  VIEWPORT_HEIGHT,
} from '../../utils/constants';

export class Camera {
  x = 0;
  y = 0;
  /**
   * 주의: viewportWidth/Height는 "월드 좌표" 단위다.
   * 렌더러가 scale = 화면높이/스테이지높이 로 확대하므로,
   * GameEngine.updateCameraViewport()가 화면px ÷ scale 값을 넣어준다.
   * (화면px를 그대로 넣으면 기기 크기에 따라 골 지점이 안 보이는 버그 발생 — 수정됨)
   */
  viewportWidth = 1280;
  viewportHeight = VIEWPORT_HEIGHT;
  worldWidth = 1600;
  worldHeight = VIEWPORT_HEIGHT;

  // 화면 흔들림 (월드 좌표 오프셋, render에서 더해짐)
  private shakeRemainMs = 0;
  private shakeDurMs = 0;
  private shakeAmp = 0;

  setViewport(w: number, h: number) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  setWorld(w: number, h: number) {
    this.worldWidth = w;
    this.worldHeight = h;
  }

  snapTo(targetX: number, targetY = 0) {
    this.x = this.clampX(targetX - this.viewportWidth * 0.5);
    this.y = this.clampY(targetY - this.viewportHeight * 0.5);
  }

  /** 데드존(카메라 윈도우) 추적 — 멀미 방지 (V2에서 중앙 고정 추적식에서 교체).
   *  공이 화면 중앙의 데드존 안에 있으면 카메라 정지. 벗어나면 공이 데드존
   *  가장자리로 "돌아오는 위치까지만" 부드럽게 이동한다 (중앙 복귀 없음 — 이동 최소화).
   *  지수 lerp는 dt 보정 — 프레임레이트가 달라도 따라오는 속도가 동일.
   *  세로 스크롤 맵(stage.height > 화면)을 위해 y도 같은 방식으로 따라간다. */
  follow(targetX: number, targetY: number, dt = 1 / 60) {
    const fx = 1 - Math.pow(1 - CAMERA_LERP_X, dt * 60);
    const fy = 1 - Math.pow(1 - CAMERA_LERP_Y, dt * 60);

    // 가로 데드존: 중앙 ±CAMERA_DEADZONE_X
    const halfW = this.viewportWidth * 0.5;
    const dzX = this.viewportWidth * CAMERA_DEADZONE_X;
    const centerX = this.x + halfW;
    if (targetX < centerX - dzX) {
      this.x += (this.clampX(targetX + dzX - halfW) - this.x) * fx;
    } else if (targetX > centerX + dzX) {
      this.x += (this.clampX(targetX - dzX - halfW) - this.x) * fx;
    }

    // 세로 데드존: 중앙 ±CAMERA_DEADZONE_Y — 점프 호(240px)가 밴드(432px)에 통째로
    // 들어가므로 평지 바운스 중에는 카메라가 위아래로 움직이지 않는다.
    const halfH = this.viewportHeight * 0.5;
    const dzY = this.viewportHeight * CAMERA_DEADZONE_Y;
    const centerY = this.y + halfH;
    if (targetY < centerY - dzY) {
      this.y += (this.clampY(targetY + dzY - halfH) - this.y) * fy;
    } else if (targetY > centerY + dzY) {
      this.y += (this.clampY(targetY - dzY - halfH) - this.y) * fy;
    }

    // 하드 가드: 고속 낙하·샤프트 등반에서 lerp가 뒤처져도 공이 화면 밖으로 못 나감.
    // 공이 가장자리 CAMERA_HARD_EDGE 비율 안쪽에 들어오면 그 경계선에 맞춰 즉시 보정.
    const edgeX = this.viewportWidth * CAMERA_HARD_EDGE;
    if (targetX < this.x + edgeX) {
      this.x = this.clampX(targetX - edgeX);
    } else if (targetX > this.x + this.viewportWidth - edgeX) {
      this.x = this.clampX(targetX - this.viewportWidth + edgeX);
    }
    const edgeY = this.viewportHeight * CAMERA_HARD_EDGE;
    if (targetY < this.y + edgeY) {
      this.y = this.clampY(targetY - edgeY);
    } else if (targetY > this.y + this.viewportHeight - edgeY) {
      this.y = this.clampY(targetY - this.viewportHeight + edgeY);
    }
  }

  /** 짧은 화면 흔들림. amp=진폭(px), durMs=지속시간. 감쇠 이징. */
  shake(amp: number, durMs: number) {
    // 더 강한 흔들림이 이미 진행 중이면 유지
    if (this.shakeRemainMs > 0 && this.shakeAmp * (this.shakeRemainMs / this.shakeDurMs) > amp) return;
    this.shakeAmp = amp;
    this.shakeDurMs = durMs;
    this.shakeRemainMs = durMs;
  }

  update(dtMs: number) {
    if (this.shakeRemainMs > 0) {
      this.shakeRemainMs = Math.max(0, this.shakeRemainMs - dtMs);
    }
  }

  get shakeOffsetX(): number {
    if (this.shakeRemainMs <= 0) return 0;
    const p = this.shakeRemainMs / this.shakeDurMs;
    return Math.sin(this.shakeRemainMs * 0.9) * this.shakeAmp * p;
  }

  get shakeOffsetY(): number {
    if (this.shakeRemainMs <= 0) return 0;
    const p = this.shakeRemainMs / this.shakeDurMs;
    return Math.cos(this.shakeRemainMs * 1.3) * this.shakeAmp * 0.6 * p;
  }

  private clampX(x: number) {
    const max = Math.max(0, this.worldWidth - this.viewportWidth);
    return Math.max(0, Math.min(max, x));
  }

  private clampY(y: number) {
    const max = Math.max(0, this.worldHeight - this.viewportHeight);
    return Math.max(0, Math.min(max, y));
  }
}
