import { CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_X_OFFSET, VIEWPORT_HEIGHT } from '../../utils/constants';

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

  snapTo(targetX: number) {
    this.x = this.clampX(targetX - this.viewportWidth * CAMERA_FOLLOW_X_OFFSET);
  }

  /** dt 보정 지수 추적 — 프레임레이트가 달라도 따라오는 속도가 동일 */
  follow(targetX: number, dt = 1 / 60) {
    const desired = this.clampX(targetX - this.viewportWidth * CAMERA_FOLLOW_X_OFFSET);
    const factor = 1 - Math.pow(1 - CAMERA_FOLLOW_LERP, dt * 60);
    this.x += (desired - this.x) * factor;
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
}
