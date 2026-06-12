# TECHNICAL_SPEC.md

> **탱탱볼해금** — 기술 명세서
> 본 문서는 게임 개발에 사용할 기술 스택, 폴더 구조, 핵심 구현 방식을 정의합니다.

---

## 1. 기술 스택

### 1.1 핵심 스택

| 영역 | 선택 | 버전 | 비고 |
|----|----|----|----|
| **프레임워크** | React | 18+ | 앱인토스 공식 권장 |
| **언어** | TypeScript | 5+ | 타입 안전성 |
| **번들러** | Vite | 5+ | 앱인토스 공식 템플릿 |
| **SDK** | @apps-in-toss/framework | 최신 (2.x) | **SDK 2.x 필수** (2026-03-23 이후 1.x 빌드 불가) |
| **스타일** | CSS Modules | - | 흑백 UI라 외부 CSS 프레임워크 불필요 |
| **상태 관리** | Zustand | 4+ | 가벼움, SDK와 충돌 없음 |
| **게임 엔진** | HTML5 Canvas 2D | Native | 추가 라이브러리 없이 직접 구현 |
| **사운드** | Howler.js | 2+ | 모바일 호환성 우수 |
| **폰트** | Pretendard, Inter | Web | 무료 라이선스 |

### 1.2 개발 도구

| 영역 | 선택 |
|----|----|
| **린터** | ESLint + Prettier |
| **타입 체크** | TypeScript strict mode |
| **테스트** | (MVP 단계에서는 생략, 추후 Vitest) |
| **모니터링** | Sentry (앱인토스 권장) |

### 1.3 초기 프로젝트 생성

```bash
npx create-ait-app tangtangball
cd tangtangball
npm install zustand howler
npm install -D @types/howler
npm run dev
```

---

## 2. 프로젝트 구조

```
tangtangball/
├── public/
│   ├── sounds/              # 효과음 파일 (탁탁/팡/띵 등)
│   └── fonts/               # Pretendard, Inter 폰트 파일
├── src/
│   ├── App.tsx              # 루트 컴포넌트 (라우팅)
│   ├── main.tsx             # 진입점 (AppsInToss.registerApp)
│   │
│   ├── pages/               # 화면 단위 컴포넌트
│   │   ├── SplashPage.tsx
│   │   ├── MainMenuPage.tsx
│   │   ├── GamePlayPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── LeaderboardPage.tsx
│   │
│   ├── game/                # 게임 코어 로직 (Canvas 기반)
│   │   ├── engine/
│   │   │   ├── GameEngine.ts        # 게임 루프 (requestAnimationFrame)
│   │   │   ├── Renderer.ts          # Canvas 2D 렌더링
│   │   │   └── InputHandler.ts      # 터치 입력 처리
│   │   ├── entities/
│   │   │   ├── Ball.ts              # 공 (관성 물리)
│   │   │   ├── Floor.ts             # 바닥 (일반/부서지는/폭발)
│   │   │   ├── Spike.ts             # 가시
│   │   │   └── Wall.ts              # 벽
│   │   ├── physics/
│   │   │   ├── Physics.ts           # 중력/관성 시뮬레이션
│   │   │   └── Collision.ts         # 충돌 감지
│   │   ├── stages/
│   │   │   ├── StageLoader.ts       # 스테이지 데이터 로드
│   │   │   └── stages.json          # 스테이지 정의 데이터
│   │   └── camera/
│   │       └── Camera.ts            # 축 스크롤 카메라
│   │
│   ├── components/          # UI 컴포넌트
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── HeartIcon.tsx
│   │   └── overlays/
│   │       ├── PauseOverlay.tsx
│   │       ├── GameOverOverlay.tsx
│   │       └── StageClearOverlay.tsx
│   │
│   ├── stores/              # Zustand 상태 관리
│   │   ├── gameStore.ts             # 현재 스테이지, 목숨, 점수
│   │   ├── settingsStore.ts         # 사운드/햅틱 설정
│   │   └── adStore.ts               # 광고 카운터 (5스테이지 단위)
│   │
│   ├── services/            # 앱인토스 SDK 래퍼
│   │   ├── storage.ts               # Storage SDK 래핑
│   │   ├── ads.ts                   # 광고 SDK 래핑
│   │   ├── auth.ts                  # getUserKeyForGame
│   │   ├── leaderboard.ts           # 게임 센터 SDK
│   │   ├── analytics.ts             # 로깅
│   │   └── haptic.ts                # 햅틱 진동
│   │
│   ├── hooks/               # 커스텀 훅
│   │   ├── useGameLoop.ts
│   │   ├── useSound.ts
│   │   ├── useSafeArea.ts
│   │   └── useTouchInput.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   └── variables.css            # CSS 변수 (컬러/폰트)
│   │
│   └── utils/
│       ├── constants.ts             # 게임 상수 (중력, 마찰력 등)
│       └── types.ts                 # 공통 타입 정의
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── ait.config.ts            # 앱인토스 설정 파일
```

---

## 3. 핵심 구현 가이드

### 3.1 게임 루프 (Canvas 기반)

```typescript
// src/game/engine/GameEngine.ts
class GameEngine {
  private lastTime = 0;
  private rafId: number | null = null;

  start() {
    const loop = (time: number) => {
      const deltaTime = (time - this.lastTime) / 1000; // 초 단위
      this.lastTime = time;

      this.update(deltaTime);
      this.render();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number) {
    // 물리 업데이트
    // 충돌 감지
    // 카메라 이동
  }

  private render() {
    // Canvas 2D drawing
  }
}
```

> 💡 **60 FPS 목표** — `requestAnimationFrame` 기반 가변 delta time 사용

### 3.2 공의 관성 물리 (스테이지별 속도 적용)

```typescript
// src/game/entities/Ball.ts

/**
 * 스테이지별 바운스 주기 계산 (선형 보간)
 * Stage 1 → 1.00초, Stage 20 → 0.40초
 */
export function getBouncePeriod(stage: number): number {
  const START = 1.00;
  const END = 0.40;
  const t = Math.min((stage - 1) / 19, 1); // 0 ~ 1 클램프
  return START - (START - END) * t;
}

/**
 * 바운스 주기로부터 물리 상수 계산
 * 점프 최대 높이는 일정하게 유지 (h = (g * T²) / 8)
 */
export function getPhysicsForStage(stage: number) {
  const period = getBouncePeriod(stage);
  const TARGET_HEIGHT = 300; // px, 점프 최대 높이 고정값
  
  const gravity = (8 * TARGET_HEIGHT) / (period * period);
  const bounceVelocity = -gravity * period / 2;
  const maxHorizontalSpeed = 300 * (1 + (stage - 1) * 0.05); // 5%/스테이지 증가
  
  return { gravity, bounceVelocity, maxHorizontalSpeed, period };
}

class Ball {
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };

  // 스테이지별로 동적으로 설정됨 (생성자 또는 setStage로)
  private gravity = 980;
  private bounceVelocity = -600;
  private maxHorizontalSpeed = 300;
  
  // 입력 응답성 (스테이지 무관)
  private readonly ACCELERATION = 600;
  private readonly FRICTION = 0.92;

  setStage(stage: number) {
    const physics = getPhysicsForStage(stage);
    this.gravity = physics.gravity;
    this.bounceVelocity = physics.bounceVelocity;
    this.maxHorizontalSpeed = physics.maxHorizontalSpeed;
  }

  update(dt: number, input: { left: boolean; right: boolean }) {
    // 중력
    this.velocity.y += this.gravity * dt;

    // 좌우 입력
    if (input.left)  this.velocity.x -= this.ACCELERATION * dt;
    if (input.right) this.velocity.x += this.ACCELERATION * dt;

    // 입력 없으면 관성 마찰 (프레임 독립적)
    if (!input.left && !input.right) {
      this.velocity.x *= Math.pow(this.FRICTION, dt * 60);
    }

    // 최대 속도 제한
    this.velocity.x = Math.max(-this.maxHorizontalSpeed,
                                Math.min(this.maxHorizontalSpeed, this.velocity.x));

    // 위치 업데이트
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  bounceOnFloor() {
    this.velocity.y = this.bounceVelocity;
  }

  bounceOnWall() {
    this.velocity.x = -this.velocity.x * 0.8; // 80% 반사
  }
}
```

> ⚠️ **물리 상수는 게임 테스트하며 튜닝 필요**. 위 값은 시작 베이스라인.

### 3.3 터치 입력 (좌/우 분할)

```typescript
// src/hooks/useTouchInput.ts
function useTouchInput() {
  const [input, setInput] = useState({ left: false, right: false });

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const next = { ...input };
      for (const touch of Array.from(e.touches)) {
        const isLeft = touch.clientX < window.innerWidth / 2;
        if (isLeft) next.left = true;
        else next.right = true;
      }
      setInput(next);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // touches는 현재 화면에 남은 손가락만. 모두 떨어졌으면 비어있음
      const next = { left: false, right: false };
      for (const touch of Array.from(e.touches)) {
        const isLeft = touch.clientX < window.innerWidth / 2;
        if (isLeft) next.left = true;
        else next.right = true;
      }
      setInput(next);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return input;
}
```

### 3.4 스테이지 데이터 포맷

```json
// src/game/stages/stages.json
{
  "stages": [
    {
      "id": 1,
      "name": "Stage 1",
      "width": 2000,
      "height": 720,
      "spawn": { "x": 100, "y": 400 },
      "goal": { "x": 1900, "y": 0 },
      "elements": [
        { "type": "floor", "x": 0,    "y": 600, "width": 800,  "variant": "normal" },
        { "type": "gap",   "x": 800,  "y": 600, "width": 200 },
        { "type": "floor", "x": 1000, "y": 600, "width": 600,  "variant": "normal" },
        { "type": "spike", "x": 1100, "y": 580, "width": 40 },
        { "type": "floor", "x": 1600, "y": 600, "width": 400,  "variant": "fragile" }
      ]
    }
  ]
}
```

**변형(variant) 종류**:
- `normal`: 일반 바닥
- `fragile`: 부서지는 바닥 (1회용)
- `explosive`: 폭발 발판 (즉사)

### 3.5 가로 모드 강제 + Safe Area

```typescript
// src/main.tsx
import { AppsInToss } from '@apps-in-toss/framework';
import {
  setDeviceOrientation,
  setScreenAwakeMode
} from '@apps-in-toss/framework';

// 게임 진입 시
setDeviceOrientation('landscape');
setScreenAwakeMode(true); // 화면 항상 켜짐 (방치 방지)
```

```typescript
// src/hooks/useSafeArea.ts
import { getSafeAreaInsets } from '@apps-in-toss/framework';

function useSafeArea() {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    getSafeAreaInsets().then(setInsets);
  }, []);

  return insets;
}
```

> ⚠️ Dynamic Island, 노치 영역을 침범하지 않도록 UI 요소 배치 시 항상 Safe Area 고려

---

## 4. 앱인토스 SDK 연동

### 4.1 필수 SDK 기능

| 기능 | 함수 | 위치 |
|----|----|----|
| **앱 등록** | `AppsInToss.registerApp` | `main.tsx` |
| **유저 식별** | `getUserKeyForGame` | `services/auth.ts` |
| **저장소** | `Storage.getItem/setItem` | `services/storage.ts` |
| **화면 방향** | `setDeviceOrientation` | 게임 진입 시 |
| **화면 켜짐** | `setScreenAwakeMode` | 게임 진입 시 |
| **Safe Area** | `getSafeAreaInsets` | UI 컴포넌트 |
| **햅틱** | `generateHapticFeedback` | 충돌 피드백 |
| **오디오 포커스** | `OnAudioFocusChanged` | 백그라운드 전환 |
| **서버 시간** | `getServerTime` | 일일 데이터 검증 (향후) |

### 4.2 광고 SDK

```typescript
// src/services/ads.ts
import {
  loadAppsInTossAdMob,
  showAppsInTossAdMob
} from '@apps-in-toss/framework';

// 테스트 ID (개발 단계 필수)
const INTERSTITIAL_TEST_ID = 'ait-ad-test-interstitial-id';
const REWARDED_TEST_ID = 'ait-ad-test-rewarded-id';

// 전면 광고: 사전 로딩 → 표시
export async function showInterstitial() {
  await loadAppsInTossAdMob({
    adType: 'interstitial',
    adUnitId: INTERSTITIAL_TEST_ID,
  });
  await showAppsInTossAdMob({ adType: 'interstitial' });
}

// 보상형 광고
export async function showRewarded(): Promise<boolean> {
  try {
    await loadAppsInTossAdMob({
      adType: 'rewarded',
      adUnitId: REWARDED_TEST_ID,
    });
    const result = await showAppsInTossAdMob({ adType: 'rewarded' });
    return result.rewarded === true;
  } catch {
    return false;
  }
}
```

> ⚠️ **운영 ID는 콘솔에서 발급받아 환경변수로 관리**. 테스트 ID로 운영 시 제재 가능.

### 4.3 리더보드 (게임 센터)

```typescript
// src/services/leaderboard.ts
import { submitGameCenterLeaderBoardScore } from '@apps-in-toss/framework';

export async function submitScore(stageNumber: number) {
  // 점수 = 최고 클리어 스테이지 번호
  await submitGameCenterLeaderBoardScore({ score: stageNumber });
}
```

> ⚠️ **게임 시작이 아닌 게임 종료(클리어) 후에 호출** (앱인토스 규정)

### 4.4 저장소 (체크포인트 포함)

```typescript
// src/services/storage.ts
import { Storage } from '@apps-in-toss/framework';

const CHECKPOINTS = [1, 6, 11, 16];

export interface ProgressData {
  currentStage: number;
  checkpointStage: number;
  maxClearedStage: number;
}

export async function loadProgress(): Promise<ProgressData> {
  const current = await Storage.getItem('current_stage');
  const checkpoint = await Storage.getItem('checkpoint_stage');
  const max = await Storage.getItem('max_cleared_stage');
  return {
    currentStage: current ? parseInt(current) : 1,
    checkpointStage: checkpoint ? parseInt(checkpoint) : 1,
    maxClearedStage: max ? parseInt(max) : 0,
  };
}

export async function saveProgress(data: Partial<ProgressData>) {
  if (data.currentStage !== undefined) {
    await Storage.setItem('current_stage', String(data.currentStage));
  }
  if (data.checkpointStage !== undefined) {
    await Storage.setItem('checkpoint_stage', String(data.checkpointStage));
  }
  if (data.maxClearedStage !== undefined) {
    await Storage.setItem('max_cleared_stage', String(data.maxClearedStage));
  }
}

/**
 * 스테이지 클리어 후 호출.
 * 5, 10, 15 클리어 시 다음 체크포인트(6, 11, 16) 자동 저장.
 */
export async function onStageClear(clearedStage: number) {
  const nextStage = clearedStage + 1;
  
  // 체크포인트 갱신 (스테이지 5, 10, 15 클리어 시)
  if (CHECKPOINTS.includes(nextStage)) {
    await saveProgress({
      currentStage: nextStage,
      checkpointStage: nextStage,
      maxClearedStage: clearedStage,
    });
  } else {
    await saveProgress({
      currentStage: nextStage,
      maxClearedStage: clearedStage,
    });
  }
}

/**
 * 게임오버 시 호출 (광고 거부 또는 메인메뉴 이동).
 * 마지막 체크포인트로 currentStage 되돌림.
 */
export async function onGameOverReturnToCheckpoint() {
  const { checkpointStage } = await loadProgress();
  await saveProgress({ currentStage: checkpointStage });
  return checkpointStage;
}
```

---

## 5. 성능 가이드라인

### 5.1 렌더링 최적화
- **Canvas 직접 그리기**: React 컴포넌트로 게임 오브젝트를 렌더링하지 말 것
- **오프스크린 캐싱**: 정적 요소(스테이지 배경)는 별도 캔버스에 미리 그려 합성
- **드로우콜 최소화**: 같은 색의 도형은 path를 묶어 한 번에 그리기
- **불필요한 리렌더 방지**: 게임 캔버스와 UI를 별도 컴포넌트로 분리

### 5.2 메모리 관리
- 스테이지 전환 시 이전 스테이지 객체 명시적 해제
- 사운드 인스턴스는 Howler가 자동 관리하나, 게임 종료 시 `Howler.unload()` 호출

### 5.3 로딩 최적화
- **10초 이내 첫 화면 노출 필수** (앱인토스 검수)
- 초기 진입 시 1스테이지 데이터만 로드, 나머지는 점진적 로드
- 사운드는 첫 SFX 재생 시점에 로드 (Lazy)

### 5.4 검수 요구사항 충족
- 스크롤/터치/화면 전환 반응 **2초 이내**
- 네트워크/메모리 사용량 비정상 급증 없음
- 외부 코드 실행 함수 (`eval` 등) **사용 금지**
- SSR 사용 금지 (CSR만 사용 — Vite 기본 설정)

---

## 6. 보안 & 검수 안전장치

### 6.1 절대 사용 금지
- ❌ `eval()`, `Function()` 등 외부 코드 실행
- ❌ `window.location.replace()` 등 히스토리 조작
- ❌ 서버 사이드 렌더링 (SSR)
- ❌ iframe (단, YouTube 영상은 예외)
- ❌ `localStorage`, `sessionStorage` (앱인토스 Storage SDK 사용)

### 6.2 필수 준수
- ✅ mTLS 인증서 (서버 통신 시) — MVP에서는 자체 서버 없음, 향후 적용
- ✅ 권한 요청 시 사용자 동의 먼저
- ✅ HTTPS만 사용

### 6.3 모니터링
- **Sentry 연동** (앱인토스 권장)
- 게임 크래시 자동 리포팅
- 사용자 행동 로깅 (`Analytics` SDK 활용)

---

## 7. 빌드 & 배포

### 7.1 개발/테스트
```bash
npm run dev              # 로컬 개발 서버
npm run sandbox          # 앱인토스 샌드박스 앱에서 테스트
```

### 7.2 빌드
```bash
npm run build            # 프로덕션 빌드 (Vite)
npm run pack             # .ait 번들 생성 (deploymentId 포함)
```

### 7.3 검수 요청
1. 앱인토스 콘솔에서 번들 업로드
2. 검토 요청 → 영업일 기준 3일 소요
3. 반려 시 사유 확인 후 재요청

### 7.4 용량 제한
- 압축 해제 기준 **100MB 이하** 필수
- 사운드/이미지 리소스는 CDN 또는 외부 스토리지 활용 권장 (MVP 범위 외)

---

## 8. 환경 변수

```bash
# .env.local (Git ignore)
VITE_AD_INTERSTITIAL_ID=ait-ad-test-interstitial-id
VITE_AD_REWARDED_ID=ait-ad-test-rewarded-id
VITE_APP_NAME=tangtangball
VITE_ENV=development
```

> 운영 환경에서는 앱인토스 콘솔에서 발급받은 실제 광고 ID로 교체

---

## 9. 디바이스 지원

- **Android 7 이상** 또는 **iOS 16 이상** (앱인토스 정책)
- **만 19세 이상** 사용자 (앱인토스 정책)
- **다크 모드 미지원** — 라이트 모드 기준 (단, 게임 자체가 흑백이라 영향 없음)
- **가로 모드 전용** (`setDeviceOrientation('landscape')`)

---

## 10. 외부 의존성 라이선스

| 패키지 | 라이선스 | 비고 |
|----|----|----|
| React | MIT | - |
| TypeScript | Apache-2.0 | - |
| Vite | MIT | - |
| Zustand | MIT | - |
| Howler.js | MIT | - |
| @apps-in-toss/framework | (앱인토스 약관) | TDS 사용권 제한적 |
| Pretendard | OFL-1.1 | 상업 사용 가능 |
| Inter | OFL-1.1 | 상업 사용 가능 |
| SFX 파일 | CC0 / CC-BY (예정) | 사용 전 라이선스 확인 필수 |
