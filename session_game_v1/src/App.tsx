import { useEffect, useState } from 'react';
import { SplashPage } from './pages/SplashPage';
import { MainMenuPage } from './pages/MainMenuPage';
import { SettingsPage } from './pages/SettingsPage';
import { GamePlayPage } from './pages/GamePlayPage';
import { RotatePrompt } from './components/RotatePrompt';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';
import { useViewportSize } from './hooks/useViewportSize';
import { getUserKeyForGame } from './services/auth';
import { sound } from './services/sound';
import { logEvent } from './services/analytics';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const hydrated = useGameStore((s) => s.hydrated);
  const hydrate = useGameStore((s) => s.hydrate);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const startFromProgress = useGameStore((s) => s.startFromProgress);

  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const viewport = useViewportSize();
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // 진행 데이터, 설정, 유저키 hydrate
  useEffect(() => {
    void (async () => {
      await Promise.all([hydrate(), hydrateSettings(), getUserKeyForGame()]);
      setReady(true);
      logEvent('app_ready');
    })();
  }, [hydrate, hydrateSettings]);

  // 사용자 첫 입력으로 오디오 활성화 (모바일 정책)
  useEffect(() => {
    const onFirst = () => {
      sound.unlock();
    };
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('keydown', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, []);

  // 큰 PC 화면이 아니고, 모바일이며 세로일 때만 회전 프롬프트
  const isMobile = viewport.width < 900 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const needsRotation = isMobile && !viewport.isLandscape;

  if (!ready || !hydrated || !settingsHydrated) {
    return <SplashPage onDone={() => setSplashDone(true)} />;
  }

  if (!splashDone && screen === 'splash') {
    return <SplashPage onDone={() => { setSplashDone(true); goToScreen('menu'); }} />;
  }

  return (
    <>
      {needsRotation && <RotatePrompt />}
      {!needsRotation && (
        <>
          {screen === 'splash' && <SplashPage onDone={() => goToScreen('menu')} />}
          {screen === 'menu' && (
            <MainMenuPage
              onStart={async () => {
                await startFromProgress();
              }}
              onSettings={() => goToScreen('settings')}
            />
          )}
          {screen === 'settings' && <SettingsPage onBack={() => goToScreen('menu')} />}
          {screen === 'play' && <GamePlayPage onExit={() => goToScreen('menu')} />}
        </>
      )}
    </>
  );
}
