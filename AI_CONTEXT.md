# AI_CONTEXT.md

> ⭐ **이 파일은 AI 코딩 도구(Cursor, Claude Code 등)에 프로젝트 시작 시 그대로 던지는 컨텍스트 파일입니다.**
> 같이 첨부할 파일: `GAME_DESIGN.md`, `TECHNICAL_SPEC.md`, `DEVELOPMENT_ROADMAP.md`

---

## 🎮 프로젝트: 탱탱볼해금 (Tangtangball)

### 한 줄 요약
**토스 앱인토스 미니앱**으로 출시할 **흑백 LCD 스타일의 미니멀 타이밍 퍼즐 게임**. 좌우로 자동 튕기는 공의 방향만 제어해 함정을 피하고 스테이지를 통과하는 캐주얼 게임.

### 영감
- 플래시 게임 "원조 공튀기기" (BOUND 기반)
- 클래식 LCD 게임, 게임보이 흑백 화면

---

## 🛠 기술 스택 (확정)

```
프레임워크   : React 18 + TypeScript 5+
번들러      : Vite
SDK         : @apps-in-toss/framework (2.x 필수)
상태 관리   : Zustand
게임 엔진   : HTML5 Canvas 2D (직접 구현, 외부 라이브러리 없음)
사운드      : Howler.js
폰트        : Pretendard (한글), Inter (영문/숫자)
스타일      : CSS Modules + CSS Variables
플랫폼      : 모바일 가로 모드 전용 (Android 7+, iOS 16+)
```

### 시작 명령
```bash
npx create-ait-app tangtangball
cd tangtangball
npm install zustand howler
npm install -D @types/howler
```

---

## 🎯 게임 메커니즘 핵심 (반드시 이해할 것)

### 코어 루프
1. **공은 자동으로 위아래로 튕긴다** (중력 + 반발력)
2. **플레이어 입력**: 화면 좌/우 반반 분할 터치
3. **관성 기반 좌우 이동**: 터치 떼면 점차 감속하여 제자리 바운스로 전환
4. **축 스크롤**: 공이 좌→우로 전진하며 카메라가 따라감
5. **함정 회피**: 구멍/가시/폭발 발판/부서지는 바닥을 피해 스테이지 끝까지 도달

### 공의 물리 (TECHNICAL_SPEC.md 참조)
- **중력**: 자동 낙하
- **자동 바운싱**: 바닥에 닿으면 자동 반사 (수직 운동)
- **수동 좌우 가속**: 터치 방향으로 가속
- **관성**: 터치 떼면 마찰력에 의해 감속
- **벽 반사**: 좌/우 벽에 부딪히면 자연스럽게 튕김

### 입력
- **화면 좌측 절반 터치** = 왼쪽으로 가속
- **화면 우측 절반 터치** = 오른쪽으로 가속
- **터치 떼기** = 관성 → 감속 → 제자리 바운스

### 스테이지 시스템
- **총 20 스테이지**
- **순차 진행형** (스테이지 선택 화면 없음)
- **스테이지당 3목숨**
- **목숨 모두 소진** → 게임오버 → "광고 보고 부활" 또는 "마지막 체크포인트로"
- **클리어** → 자동으로 다음 스테이지

### 체크포인트 시스템 ⭐
- **체크포인트 위치**: 1, 6, 11, 16 (5스테이지 단위)
- **저장 시점**: 스테이지 5, 10, 15 클리어 직후 자동
- **재시작 시**: 마지막 체크포인트부터 시작 (처음 1부터가 아님)
- **함수**: `onStageClear(clearedStage)`, `onGameOverReturnToCheckpoint()`

### 속도 곡선 (스테이지별 동적)
- **스테이지 1**: 바운스 주기 1.00초
- **스테이지 20**: 바운스 주기 0.40초
- **선형 보간**: `period = 1.00 - 0.03 * (stage - 1)`
- **점프 높이는 일정 유지** (h=300px), 중력/바운스속도/최대속도는 동적 계산
- 함수: `getBouncePeriod(stage)`, `getPhysicsForStage(stage)`, `ball.setStage(stage)`

### 스테이지 구성 요소
- **일반 바닥**: 무한 사용
- **부서지는 바닥**: 1회 밟으면 사라짐 (Stage 6부터 도입)
- **폭발 발판**: 밟는 즉시 사망 (Stage 11부터 도입)
- **구멍**: 빠지면 사망 (Stage 2부터)
- **가시**: 위에서 닿으면 사망 (Stage 4부터)
- **천장 가시**: 위로 튀어 닿으면 사망 (Stage 14부터)
- **벽**: 측면 반사

### 챕터 구성
| 챕터 | 스테이지 | 테마 | 바운스 주기 |
|----|----|----|----|
| 튜토리얼 | 1~5 | 조작 학습 | 1.00 → 0.88초 |
| 기본 | 6~10 | 부서지는 바닥 | 0.85 → 0.73초 |
| 응용 | 11~15 | 폭발 발판 + 천장가시 | 0.70 → 0.58초 |
| 마스터 | 16~20 | 극한 속도 | 0.54 → 0.40초 |

> 📌 스테이지별 상세 설계는 `STAGE_DESIGN.md` 참조

---

## 🎨 디자인 톤 (반드시 일관성 유지)

### 컬러
```css
--color-bg: #000000;   /* 배경 - 완전 검정 */
--color-fg: #FFFFFF;   /* 오브젝트 - 완전 흰색 */
```
- **단 두 가지 색만 사용**
- **모든 스테이지 동일 컬러**
- 그라데이션/알파 사용 금지 (LCD 느낌 보존, 단 UI 가독성용 알파는 허용)

### 형태
- 공: **완전한 원형**
- 바닥: 굵은 흰색 수평 라인 (2~4px)
- 가시: 위 방향 삼각형
- 벽: 굵은 흰색 수직 라인

### 폰트
- 게임 UI: **Inter** (영문/숫자) + **Pretendard** (한글)
- 게임은 레트로 톤이지만 **폰트는 세련된 모던 폰트로 대조감 부여**

### 사운드
- **고전 아날로그 효과음**: 탁/팡/띵 같은 단순 SFX
- **BGM 없음** (선택적으로 미니멀 환경음)
- Howler.js로 재생

---

## 💰 수익화 전략 (인앱 광고)

### 광고 배치 규칙 (20스테이지 기준)
```
[1~9 스테이지]   : 광고 완전히 없음 (튜토리얼/첫인상 보호)
[10, 15 클리어 직후]:
  • 전면 광고 1회 노출 (총 2회만, 체크포인트 직전 자연스러운 휴식)
[모든 스테이지 게임오버 시]:
  • 보상형 광고 옵션 (사용자 자발 시청, 목숨 +3)
```

### 전면 광고
- **노출 시점**: 스테이지 10, 15 클리어 직후 (총 2회만)
- **사전 로딩 필수**
- 다음 스테이지(=체크포인트 11, 16) 진입 직전

### 보상형 광고
- **노출 시점**: 게임오버 시 (사용자 선택)
- **시청 완료 시**: 목숨 3개 추가 + 같은 스테이지 처음부터
- **시청 거부 시**: 다시시도(같은 스테이지) 또는 메인메뉴(체크포인트로 이동)

### 광고 SDK 테스트 ID
```typescript
const INTERSTITIAL_TEST_ID = 'ait-ad-test-interstitial-id';
const REWARDED_TEST_ID = 'ait-ad-test-rewarded-id';
```

---

## ⚠️ 절대 금지 사항 (검수 반려 사유)

### 코드 레벨
- ❌ `eval()`, `Function()` 등 외부 코드 실행
- ❌ `window.location.replace()` 등 히스토리 조작 (자사 사이트 이동)
- ❌ SSR (서버 사이드 렌더링)
- ❌ iframe (YouTube 예외)
- ❌ `localStorage`, `sessionStorage` → **앱인토스 Storage SDK 사용**

### UX 레벨 (다크패턴)
- ❌ 게임 진입 즉시 바텀시트/광고/모달
- ❌ 예상치 못한 순간의 광고 노출
- ❌ 인트로/로딩/팝업 모달에 광고
- ❌ 모든 화면에서 사용자가 미니앱을 나갈 수 없는 구조
- ❌ CTA 버튼만 봐서 다음 행동을 예측할 수 없는 모호한 라벨

### 사양 레벨
- ❌ OS 뒤로가기 제스처 사용
- ❌ Safe Area / Dynamic Island 침범
- ❌ 다크 모드 (앱인토스 미지원, 라이트 모드 기준)

---

## ✅ 필수 준수 사항

### 검수 통과 필수
- ✅ **10초 이내 첫 화면 노출**
- ✅ **인게임 풀스크린 + Safe Area 준수**
- ✅ **가로 모드 강제** (`setDeviceOrientation('landscape')`)
- ✅ **CSR 또는 SSG만 사용** (Vite 기본 설정)
- ✅ **사운드 ON/OFF 사용자 직접 설정 가능**
- ✅ **백그라운드 전환 시 사운드 즉시 중지, 복귀 시 자동 재개**
- ✅ **인터랙션 반응 2초 이내**
- ✅ **광고 재생 중 음악 일시정지**

### SDK 필수 호출
```typescript
// 게임 진입 시
import {
  setDeviceOrientation,
  setScreenAwakeMode,
  getUserKeyForGame,
  getSafeAreaInsets
} from '@apps-in-toss/framework';

setDeviceOrientation('landscape');
setScreenAwakeMode(true);
const userKey = await getUserKeyForGame();
const safeArea = await getSafeAreaInsets();
```

### 데이터 저장 (앱인토스 Storage SDK)
```typescript
import { Storage } from '@apps-in-toss/framework';

await Storage.setItem('current_stage', '7');
const stage = await Storage.getItem('current_stage');
```

### 리더보드 (클리어 시점에만 호출)
```typescript
import { submitGameCenterLeaderBoardScore } from '@apps-in-toss/framework';

// 게임 시작이 아닌 종료(클리어) 후에 호출
await submitGameCenterLeaderBoardScore({ score: maxClearedStage });
```

---

## 📂 권장 폴더 구조

```
src/
├── pages/              # 화면 컴포넌트 (스플래시, 메뉴, 게임플레이, 설정 등)
├── game/               # 게임 코어 (Canvas 기반)
│   ├── engine/         # GameEngine, Renderer, InputHandler
│   ├── entities/       # Ball, Floor, Spike, Wall
│   ├── physics/        # Physics, Collision
│   ├── stages/         # StageLoader, stages.json
│   └── camera/         # Camera (축 스크롤)
├── components/         # UI 컴포넌트 (Button, Modal, Overlay 등)
├── stores/             # Zustand 상태 관리
├── services/           # 앱인토스 SDK 래퍼
├── hooks/              # 커스텀 훅
├── styles/             # CSS 변수, 글로벌 스타일
└── utils/              # 상수, 타입
```

---

## 🚀 개발 시작 순서 (우선순위)

### 가장 먼저
1. **Phase 0**: `npx create-ait-app tangtangball` → 빈 화면 샌드박스에서 노출 확인
2. **Phase 1**: 한 개의 테스트 스테이지에서 공 물리 + 좌우 입력 + 충돌 작동
3. **Phase 1**: 사망/클리어 판정 + 카메라 스크롤

### 그 다음
4. **Phase 2**: 화면 구조 (메인 메뉴 → 게임 → 게임오버 → 메인 메뉴)
5. **Phase 3**: **20 스테이지** 데이터 작성 + **속도 곡선** + **체크포인트 시스템**
6. **Phase 4**: SDK 연동 (Storage + 체크포인트, Leaderboard, Safe Area, 햅틱)
7. **Phase 5**: 광고 통합 (전면: 10/15 클리어 후, 보상형: 게임오버 시)

### 마지막
8. **Phase 6**: 게임 출시 체크리스트 점검 + 다양한 기기 테스트
9. **Phase 7**: 콘솔에서 검토 요청 → 출시

> 📌 상세 로드맵은 `DEVELOPMENT_ROADMAP.md` 참조
> 📌 스테이지 상세 설계는 `STAGE_DESIGN.md` 참조

---

## 🔑 핵심 코드 스니펫 (시작 시 그대로 활용)

### 1) 공의 관성 물리 (스테이지별 속도 적용)

```typescript
/** Stage 1 → 1.00초, Stage 20 → 0.40초 */
export function getBouncePeriod(stage: number): number {
  const t = Math.min((stage - 1) / 19, 1);
  return 1.00 - 0.60 * t;
}

/** 점프 높이 일정 유지, 속도만 빠르게 */
export function getPhysicsForStage(stage: number) {
  const period = getBouncePeriod(stage);
  const TARGET_HEIGHT = 300;
  const gravity = (8 * TARGET_HEIGHT) / (period * period);
  const bounceVelocity = -gravity * period / 2;
  const maxHorizontalSpeed = 300 * (1 + (stage - 1) * 0.05);
  return { gravity, bounceVelocity, maxHorizontalSpeed, period };
}

class Ball {
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };

  private gravity = 980;
  private bounceVelocity = -600;
  private maxHorizontalSpeed = 300;
  private readonly ACCELERATION = 600;
  private readonly FRICTION = 0.92;

  setStage(stage: number) {
    const p = getPhysicsForStage(stage);
    this.gravity = p.gravity;
    this.bounceVelocity = p.bounceVelocity;
    this.maxHorizontalSpeed = p.maxHorizontalSpeed;
  }

  update(dt: number, input: { left: boolean; right: boolean }) {
    this.velocity.y += this.gravity * dt;

    if (input.left)  this.velocity.x -= this.ACCELERATION * dt;
    if (input.right) this.velocity.x += this.ACCELERATION * dt;

    if (!input.left && !input.right) {
      this.velocity.x *= Math.pow(this.FRICTION, dt * 60);
    }

    this.velocity.x = Math.max(-this.maxHorizontalSpeed,
                                Math.min(this.maxHorizontalSpeed, this.velocity.x));

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  bounceOnFloor() { this.velocity.y = this.bounceVelocity; }
  bounceOnWall()  { this.velocity.x = -this.velocity.x * 0.8; }
}
```

### 2) 좌/우 분할 터치

```typescript
function useTouchInput() {
  const [input, setInput] = useState({ left: false, right: false });

  useEffect(() => {
    const update = (e: TouchEvent) => {
      const next = { left: false, right: false };
      for (const touch of Array.from(e.touches)) {
        if (touch.clientX < window.innerWidth / 2) next.left = true;
        else next.right = true;
      }
      setInput(next);
    };

    window.addEventListener('touchstart', update);
    window.addEventListener('touchend', update);
    window.addEventListener('touchcancel', update);

    return () => {
      window.removeEventListener('touchstart', update);
      window.removeEventListener('touchend', update);
      window.removeEventListener('touchcancel', update);
    };
  }, []);

  return input;
}
```

### 3) 스테이지 데이터 포맷

```json
{
  "id": 1,
  "name": "첫 발걸음",
  "bouncePeriod": 1.00,
  "width": 1600,
  "height": 720,
  "spawn": { "x": 100, "y": 400 },
  "goal": { "x": 1500, "y": 400 },
  "isCheckpointEnd": false,
  "elements": [
    { "type": "floor", "x": 0,    "y": 600, "width": 1600, "variant": "normal" },
    { "type": "spike", "x": 800,  "y": 580, "width": 40 }
  ]
}
```

**variant 종류**: `normal` | `fragile` (부서지는) | `explosive` (폭발)
**element type**: `floor` | `spike` | `ceiling_spike` | `wall`
**isCheckpointEnd**: `true`이면 클리어 시 다음 체크포인트 저장 (스테이지 5, 10, 15)

### 4) 체크포인트 저장 로직

```typescript
import { Storage } from '@apps-in-toss/framework';

const CHECKPOINTS = [1, 6, 11, 16];

/** 스테이지 클리어 시 호출 */
export async function onStageClear(clearedStage: number) {
  const nextStage = clearedStage + 1;

  await Storage.setItem('current_stage', String(nextStage));
  await Storage.setItem('max_cleared_stage', String(clearedStage));

  // 5, 10, 15 클리어 시 체크포인트 자동 저장
  if (CHECKPOINTS.includes(nextStage)) {
    await Storage.setItem('checkpoint_stage', String(nextStage));
  }
}

/** 게임오버 + 광고 거부 시 호출 */
export async function returnToCheckpoint(): Promise<number> {
  const checkpoint = await Storage.getItem('checkpoint_stage');
  const stage = checkpoint ? parseInt(checkpoint) : 1;
  await Storage.setItem('current_stage', String(stage));
  return stage;
}
```

---

## 📚 참고 문서 (앱인토스 공식)

### 가장 자주 볼 문서
- **SDK 한눈에 보기**: https://developers-apps-in-toss.toss.im/bedrock/reference/framework/시작하기/overview.html
- **게임 출시 체크리스트**: https://developers-apps-in-toss.toss.im/checklist/app-game.html
- **다크패턴 방지 정책**: https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.html
- **인앱 광고 개발 가이드**: https://developers-apps-in-toss.toss.im/ads/develop.html
- **서비스 오픈 정책**: https://developers-apps-in-toss.toss.im/intro/guide.html

### LLM 최적화 마크다운 (AI 도구가 더 잘 읽음)
- 전체 인덱스: https://developers-apps-in-toss.toss.im/llms.txt
- 풀 번들: https://developers-apps-in-toss.toss.im/llms-full.txt
- 각 페이지에서 `.html` → `.md`로 변경하면 마크다운 버전 접근

---

## 🤖 AI 어시스턴트에게 요청 시 팁

1. **"@AI_CONTEXT.md 참조해서 작업해줘"** 같은 식으로 컨텍스트 명시
2. 코드 작성 요청 시 **"앱인토스 검수 정책에 위배되지 않게"** 명시
3. SDK 함수 호출 시 **반드시 `@apps-in-toss/framework`에서 import**
4. 게임 물리 튜닝 시 **`GAME_DESIGN.md`의 메커니즘 섹션과 일치하는지 확인**
5. 디자인/UI 작업 시 **흑백 컬러 팔레트 절대 어기지 말 것**

---

## ⏱️ 예상 일정

- **MVP 완성**: 2~4주 (1인 개발 기준)
- **검수 시간**: 영업일 3일
- **출시**: 약 한 달 내

---

## 🎯 성공 기준 (KPI)

### 출시 직후 (1주)
- 정상 노출 확인
- 크래시 없이 첫 스테이지 클리어율 70% 이상
- 평균 세션 시간 3분 이상

### 출시 후 1개월
- DAU 확인 + 리텐션 분석
- 광고 노출 / 수익 측정
- 사용자 피드백 기반 개선 계획

---

## 📝 다음 액션 (지금 당장 할 일)

1. ✅ 이 문서 4개를 IDE 워크스페이스 루트에 배치
2. ✅ Cursor/Claude Code에서 이 컨텍스트 참조 설정
3. ✅ `npx create-ait-app tangtangball` 실행
4. ✅ Phase 0 체크리스트 시작
5. ✅ 앱인토스 콘솔에서 게임 등급 분류 신청 시작 (개발과 병행)

> **모든 결정은 이미 끝났습니다. 이제 코드만 작성하면 됩니다.** 🚀
