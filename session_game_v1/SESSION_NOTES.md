# 탱탱볼해금 — Session v1 스냅샷

> 저장일: 2026-05-19
> 원본 경로: `C:\()안티그래비티\탱탱볼해금\app\`
> 이 폴더는 Session v1 시점 코드 스냅샷입니다. 재진행할 때 그대로 복원 가능.

---

## 1. 진행 단계

- **1단계 — 브라우저 즉시 플레이 가능한 베이스 (지금 완료)**
  - Vite + React 18 + TypeScript + Canvas 2D
  - 앱인토스 SDK는 모두 mock (services 레이어에서 격리)
  - 20개 스테이지 데이터 + 체크포인트 + 광고 mock + WebAudio 사운드까지 모두 작동
  - `npx tsc --noEmit` 통과, `vite build` 성공 (188KB / gzip 60KB)

- **2단계 — 앱인토스 SDK 정식 연동 (미진행)**
  - `services/` 폴더의 5개 파일만 실제 SDK 호출로 교체
  - `main.tsx`에 `AppsInToss.registerApp` + `setDeviceOrientation('landscape')` + `setScreenAwakeMode(true)` 추가
  - 토스 콘솔 가입 + 게임 등급분류 신청 + 샌드박스 테스트

---

## 2. 재진행 방법

### A. 스냅샷에서 그대로 이어서 작업
```bash
cd "C:\()안티그래비티\탱탱볼해금\session_game_v1"
npm install
npm run dev
# → http://localhost:5173/
```

### B. 새 폴더로 복사 후 작업
```bash
# 예: app_v2로 복사
cp -r session_game_v1 app_v2
cd app_v2
npm install
npm run dev
```

---

## 3. 핵심 결정사항 (재개 시 참고)

| 항목 | 결정 |
|---|---|
| 위치 전략 | 문서(`탱탱볼해금/*.md`)와 코드(`app/`) 폴더 분리 |
| 1단계 SDK | mock 추상화 (`services/*.ts`) — 2단계에서 한 파일씩만 교체 |
| 사운드 | 외부 SFX 파일 없이 WebAudio API로 9종 즉석 합성 |
| 입력 | 모바일 좌/우 분할 터치 + PC `←`/`→` (또는 `A`/`D`) |
| 빌드 도구 | Vite 5 (앱인토스 권장과 동일) |
| 상태 관리 | Zustand 4 |
| 추가 의존성 | Howler.js 미설치 (사운드는 WebAudio 자체 구현) |

---

## 4. 폴더 구조 (스냅샷)

```
session_game_v1/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── public/                      # (현재 빈 폴더)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── styles/
    │   ├── variables.css
    │   └── global.css
    ├── utils/
    │   ├── constants.ts          # 게임 상수 (목숨, 카메라, 광고 스테이지 등)
    │   └── types.ts
    ├── services/                 # ⭐ SDK 추상화 레이어 (2단계에서 여기만 교체)
    │   ├── storage.ts            # localStorage → Storage.getItem/setItem
    │   ├── auth.ts               # 익명 UUID → getUserKeyForGame
    │   ├── ads.ts                # Mock 광고 → loadAppsInTossAdMob/showAppsInTossAdMob
    │   ├── leaderboard.ts        # 콘솔 로그 → submitGameCenterLeaderBoardScore
    │   ├── haptic.ts             # navigator.vibrate → generateHapticFeedback
    │   ├── sound.ts              # WebAudio 합성 SFX (그대로 유지)
    │   └── analytics.ts          # 콘솔 로그
    ├── stores/
    │   ├── gameStore.ts          # 화면/스테이지/목숨/광고 상태
    │   └── settingsStore.ts      # 사운드/햅틱 토글
    ├── hooks/
    │   ├── useViewportSize.ts
    │   └── useVisibilityPause.ts # 백그라운드 시 sound.suspend()
    ├── components/
    │   ├── Button.tsx
    │   ├── Overlay.tsx
    │   ├── HudHearts.tsx
    │   ├── PauseOverlay.tsx
    │   ├── GameOverOverlay.tsx
    │   ├── StageClearOverlay.tsx
    │   ├── MockAdOverlay.tsx
    │   └── RotatePrompt.tsx
    ├── pages/
    │   ├── SplashPage.tsx
    │   ├── MainMenuPage.tsx
    │   ├── SettingsPage.tsx
    │   └── GamePlayPage.tsx      # ⭐ 게임 메인 화면
    └── game/
        ├── engine/
        │   ├── GameEngine.ts     # 게임 루프, 페이즈(intro/playing/dying/cleared)
        │   ├── Renderer.ts       # Canvas 2D 렌더링
        │   └── InputHandler.ts   # 터치 + 키보드 통합
        ├── entities/
        │   └── Ball.ts           # 공 물리 + getBouncePeriod/getPhysicsForStage
        ├── physics/
        │   └── Collision.ts      # AABB+원 충돌 (바닥/가시/벽/구멍)
        ├── camera/
        │   └── Camera.ts         # 축 스크롤 + lerp 추적
        └── stages/
            ├── stages.ts         # 20개 스테이지 데이터 (헬퍼 함수)
            └── StageLoader.ts
```

---

## 5. 알려진 미세 이슈 / 향후 조정 후보 (선택)

- **물리 튜닝**: 마찰/가속도 베이스라인은 동작하지만 실제 플레이 감각에 따라 `constants.ts`의 `HORIZONTAL_ACCELERATION`, `HORIZONTAL_FRICTION` 조정 가능
- **스테이지 11~20 난이도**: 자체 플레이로 검증 안 됨. 너무 어려우면 폭발 발판 간격 늘리기
- **사운드**: WebAudio 합성 9종 작동 확인. 실제 SFX 파일로 교체 원할 시 `services/sound.ts`만 수정 (Howler 도입 가능)
- **`public/` 폴더**: 비어있음. 파비콘/SFX 파일 추후 추가
- **DEV 도구**: `import.meta.env.DEV` 조건으로 `]/[` 스테이지 점프 기능은 미구현 (필요 시 GamePlayPage 키보드 핸들러에 추가)
- **공유 리워드 / 인앱 결제**: MVP 범위 외 (가이드 7~8장에 따른 추후 작업)

---

## 6. 검수 안전장치 자체 점검 (Session v1 기준)

- ✅ `eval`/`Function`/`window.location.replace`/iframe 미사용
- ✅ SSR 미사용 (Vite SPA)
- ✅ Storage는 services 단일 추상화 레이어로 격리
- ✅ 진입 즉시 광고/바텀시트 노출 없음
- ✅ 모든 화면에 종료 경로 (메뉴 ↔ 게임, 일시정지/게임오버에서 메뉴 복귀)
- ✅ 사운드 ON/OFF 사용자 직접 설정
- ✅ 백그라운드 전환 시 사운드 즉시 suspend, 복귀 시 사용자 입력 후 resume
- ✅ 광고 사전 로딩 + 광고 중 음악 일시정지
- ✅ 가로 모드 안내(모바일 세로 시 RotatePrompt)
- ✅ Safe Area `env(safe-area-inset-*)` 모든 페이지 적용
- ⏳ 2단계에서 검증 필요: 실제 SDK 호출 (getUserKeyForGame, Storage, Ads), 게임 등급분류, 콘솔 등록

---

## 7. 다음 작업 시작점 후보

1. **Phase 2 시작**: 토스 콘솔 가입 → `npx create-ait-app` → `services/` 5개 파일을 실제 SDK 호출로 교체 → 샌드박스 테스트
2. **물리 튜닝 패스**: 본인이 직접 1~10 스테이지 플레이 후 피드백 → constants 조정
3. **사운드 SFX 파일 도입**: WebAudio 합성을 실제 SFX 파일로 교체 (Howler.js 추가)
4. **앱 등급분류 신청**: 게임물관리위원회 또는 오픈마켓 자체등급분류 (검수 병행 시간 절약)
5. **시각 효과 추가**: 공 모션 트레일, 사망 시 화면 깜빡임 강도 조정

---

## 8. 마지막 dev 서버 상태

- URL: http://localhost:5173/
- 빌드: 188 KB / gzip 60 KB
- TypeScript: 에러 0
- 의존성: react 18, react-dom 18, zustand 4 + vite 5 / typescript 5 (devDeps)
