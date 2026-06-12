import { useEffect, useState } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
  isLandscape: boolean;
}

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    isLandscape: window.innerWidth > window.innerHeight,
  }));

  useEffect(() => {
    const update = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isLandscape: window.innerWidth >= window.innerHeight,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return size;
}
