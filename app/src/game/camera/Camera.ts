import { CAMERA_FOLLOW_LERP, CAMERA_FOLLOW_X_OFFSET, VIEWPORT_HEIGHT } from '../../utils/constants';

export class Camera {
  x = 0;
  y = 0;
  viewportWidth = 1280;
  viewportHeight = VIEWPORT_HEIGHT;
  worldWidth = 1600;
  worldHeight = VIEWPORT_HEIGHT;

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

  follow(targetX: number) {
    const desired = this.clampX(targetX - this.viewportWidth * CAMERA_FOLLOW_X_OFFSET);
    this.x += (desired - this.x) * CAMERA_FOLLOW_LERP;
  }

  private clampX(x: number) {
    const max = Math.max(0, this.worldWidth - this.viewportWidth);
    return Math.max(0, Math.min(max, x));
  }
}
