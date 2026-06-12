import type { GameInput } from '../../utils/types';

export class InputHandler {
  private state: GameInput = { left: false, right: false };
  private touchTargets = new Map<number, 'left' | 'right'>();
  private keys = { left: false, right: false };
  private element: HTMLElement | null = null;
  private disposed = false;
  private getWidth: () => number;

  constructor(getWidth: () => number) {
    this.getWidth = getWidth;
  }

  attach(element: HTMLElement) {
    this.element = element;
    element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    element.addEventListener('touchend', this.onTouchEnd, { passive: false });
    element.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('pointerleave', this.onPointerUp);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    this.disposed = true;
    if (this.element) {
      this.element.removeEventListener('touchstart', this.onTouchStart);
      this.element.removeEventListener('touchmove', this.onTouchMove);
      this.element.removeEventListener('touchend', this.onTouchEnd);
      this.element.removeEventListener('touchcancel', this.onTouchEnd);
      this.element.removeEventListener('pointerdown', this.onPointerDown);
      this.element.removeEventListener('pointerup', this.onPointerUp);
      this.element.removeEventListener('pointercancel', this.onPointerUp);
      this.element.removeEventListener('pointerleave', this.onPointerUp);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.element = null;
    this.touchTargets.clear();
    this.state = { left: false, right: false };
    this.keys = { left: false, right: false };
  }

  getInput(): GameInput {
    return {
      left: this.state.left || this.keys.left,
      right: this.state.right || this.keys.right,
    };
  }

  clear() {
    this.touchTargets.clear();
    this.state = { left: false, right: false };
    this.keys = { left: false, right: false };
  }

  private classify(x: number): 'left' | 'right' {
    return x < this.getWidth() / 2 ? 'left' : 'right';
  }

  private recompute() {
    let left = false;
    let right = false;
    for (const side of this.touchTargets.values()) {
      if (side === 'left') left = true;
      else right = true;
    }
    this.state = { left, right };
  }

  private onTouchStart = (e: TouchEvent) => {
    if (this.disposed) return;
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.touchTargets.set(touch.identifier, this.classify(touch.clientX));
    }
    this.recompute();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.disposed) return;
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.touchTargets.set(touch.identifier, this.classify(touch.clientX));
    }
    this.recompute();
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (this.disposed) return;
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      this.touchTargets.delete(touch.identifier);
    }
    this.recompute();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.disposed) return;
    if (e.pointerType === 'touch') return; // 터치는 위에서 처리
    this.touchTargets.set(e.pointerId, this.classify(e.clientX));
    this.recompute();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.disposed) return;
    if (e.pointerType === 'touch') return;
    this.touchTargets.delete(e.pointerId);
    this.recompute();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
  };

  private onBlur = () => {
    this.clear();
  };
}
