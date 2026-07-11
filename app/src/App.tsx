import { useEffect, useState } from 'react';
import { SplashPage } from './pages/SplashPage';
import { MainMenuPage } from './pages/MainMenuPage';
import { SettingsPage } from './pages/SettingsPage';
import { GamePlayPage } from './pages/GamePlayPage';
import { RotatePrompt } from './components/RotatePrompt';
import { useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';
import { useUnlockStore } from './stores/unlockStore';
import { useViewportSize } from './hooks/useViewportSize';
import { getUserKeyForGame } from './services/auth';
import { sound } from './services/sound';
import { logEvent } from './services/analytics';
import { closeMiniApp, onTossBackEvent } from './services/sdk';
import { lockLandscape, syncSafeArea } from './services/screen';
import { ExitConfirmModal } from './components/ExitConfirmModal';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const hydrated = useGameStore((s) => s.hydrated);
  const hydrate = useGameStore((s) => s.hydrate);
  const goToScreen = useGameStore((s) => s.goToScreen);
  const startFromProgress = useGameStore((s) => s.startFromProgress);
  const startStage = useGameStore((s) => s.startStage);

  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const unlocksHydrated = useUnlockStore((s) => s.hydrated);
  const hydrateUnlocks = useUnlockStore((s) => s.hydrate);

  const viewport = useViewportSize();
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);

  // 진행 데이터, 설정, 해금, 유저키 hydrate
  useEffect(() => {
    void (async () => {
      await Promise.all([hydrate(), hydrateSettings(), hydrateUnlocks(), getUserKeyForGame()]);
      setReady(true);
      logEvent('app_ready');
    })();
  }, [hydrate, hydrateSettings, hydrateUnlocks]);

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

  // 가로 모드 고정 + Safe Area SDK 동기화 (토스 환경에서만 실제 동작)
  useEffect(() => {
    const unlockOrientation = lockLandscape();
    const unsubSafeArea = syncSafeArea();
    return () => {
      unlockOrientation();
      unsubSafeArea();
    };
  }, []);

  // 네이티브 뒤로가기 → 종료 확인 모달 (OS 뒤로가기에 의존하지 않고 확인 후 종료)
  useEffect(() => {
    return onTossBackEvent(() => setExitConfirm(true));
  }, []);

  // 스플래시 종료 + 데이터 준비 완료 → 메뉴로 (스플래시 이중 표시 버그 수정:
  // 기존에는 로딩용/화면용 스플래시가 따로 렌더되어 애니메이션이 두 번 재생됐음)
  useEffect(() => {
    if (ready && hydrated && settingsHydrated && unlocksHydrated && splashDone && screen === 'splash') {
      goToScreen('menu');
    }
  }, [ready, hydrated, settingsHydrated, unlocksHydrated, splashDone, screen, goToScreen]);

  // 모바일 기기(UA 기준)에서 세로일 때만 회전 프롬프트
  // (기존 OR 조건은 폭 900px 미만의 좁은 데스크톱 창까지 차단했음 — 수정)
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const needsRotation = isMobile && !viewport.isLandscape;

  const loading = !ready || !hydrated || !settingsHydrated || !unlocksHydrated;
  if (loading || (screen === 'splash' && !splashDone)) {
    return <SplashPage onDone={() => setSplashDone(true)} />;
  }

  return (
    <>
      {needsRotation && <RotatePrompt />}
      {!needsRotation && (
        <>
          {screen === 'menu' && (
            <MainMenuPage
              onStart={async () => {
                await startFromProgress();
              }}
              onSettings={() => goToScreen('settings')}
              onSelectStage={(n) => {
                void startStage(n);
              }}
            />
          )}
          {screen === 'settings' && (
            <SettingsPage onBack={() => goToScreen('menu')} />
          )}
          {screen === 'play' && <GamePlayPage onExit={() => goToScreen('menu')} />}
        </>
      )}

      {exitConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ExitConfirmModal onConfirm={() => void closeMiniApp()} onCancel={() => setExitConfirm(false)} />
        </div>
      )}
    </>
  );
}
