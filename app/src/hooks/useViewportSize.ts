import { useEffect, useState } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
  isLandscape: boolean;
}

// 실제 "보이는 영역"(visualViewport) 기준 크기.
// 토스 웹뷰에서 상단 바가 생기거나 사라질 때 innerWidth/innerHeight는
// 갱신이 늦거나 값이 다를 수 있어 visualViewport를 우선 사용한다.
function readSize(): ViewportSize {
  const vv = window.visualViewport;
  const width = vv ? Math.round(vv.width) : window.innerWidth;
  const height = vv ? Math.round(vv.height) : window.innerHeight;
  return { width, height, isLandscape: width >= height };
}

// 웹뷰가 화면 구성 변화(상단 바 등장 등)로 페이지를 아래로 민 상태를 원위치.
// 이 앱은 스크롤이 전면 차단이라 밀린 화면을 사용자가 손으로 되돌릴 수 없다 —
// 밀림이 감지되는 즉시 코드로 복구해야 버튼 위치가 어긋나지 않는다.
function resetScrollOffset() {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  const el = document.scrollingElement;
  if (el && (el.scrollTop !== 0 || el.scrollLeft !== 0)) {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(readSize);

  useEffect(() => {
    const update = () => {
      resetScrollOffset();
      setSize((prev) => {
        const next = readSize();
        return prev.width === next.width && prev.height === next.height ? prev : next;
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    // 밀림은 크기 변화 없이 스크롤만 발생할 수도 있어 scroll도 감시한다.
    window.addEventListener('scroll', update, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('scroll', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, []);

  return size;
}
