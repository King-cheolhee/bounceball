# Agent Instructions — 탱탱볼해금 (Tangtangball)

> 이 문서는 AI 코딩 도구(Claude Code 등)가 이 프로젝트에서 작업할 때 따라야 할 규칙이다.
> (구버전: 범용 3-layer 자동화 템플릿이었으나 이 프로젝트와 무관해 2026-06-12 게임 개발용으로 재작성됨)

## 프로젝트 개요

- **무엇**: 토스 앱인토스 미니앱용 흑백 LCD 스타일 공튀기기 게임 (가로 모드 전용)
- **스토리**: B안 「마지막 픽셀 '도트'」 — 꺼져가는 게임기 속 마지막 픽셀이 코어 셀까지 가서 기기를 다시 켠다 (`app/src/utils/story.ts`)
- **작업본**: `app/` (정본). `session_game_v1/`은 2026-05-19 백업 스냅샷 — **수정 금지, 삭제는 사용자 승인 필요**
- **기술 스택**: Vite 5 + React 18 + TypeScript 5(strict) + Canvas 2D + Zustand + WebAudio(절차 합성, 외부 오디오 파일 0개)
- **기획 문서**: GAME_DESIGN.md, STAGE_DESIGN.md, TECHNICAL_SPEC.md, DEVELOPMENT_ROADMAP.md, 앱인토스_게임개발_가이드_정리.md

## 절대 규칙 (검수 반려 사유 — 어기면 출시 불가)

1. `eval()` / `new Function()` / 동적 외부 JS 로딩 금지
2. `history.pushState/replaceState`, `window.location.replace` 직접 조작 금지
3. SSR 금지 — CSR만 (Vite 기본 유지)
4. iframe 금지
5. `localStorage` 직접 호출 금지 — 반드시 `services/storage.ts` 추상화 경유 (Phase 4에서 앱인토스 Storage SDK로 교체됨)
6. SDK는 `@apps-in-toss/framework` **2.x만** 사용 (1.x 등록 불가)
7. 다크 모드 분기 금지 — 흑백 디자인 고정
8. 진입 즉시 광고·바텀시트·모달 금지. 전면 광고는 **스테이지 10·15 클리어 직후 2회만**, 1~9는 완전 무광고

## 게임 디자인 절대 원칙

1. **2색 비주얼**: `#000000` 배경 + `#FFFFFF` 오브젝트만. 그라데이션 금지. 알파는 UI 가독성·연출용 최소한만
2. **이미지 에셋 0개**: 모든 그래픽은 Canvas 절차 드로잉, 모든 소리는 WebAudio 합성 (`services/sound.ts`, `services/music.ts`)
3. **점프 높이 300px 고정**: 난이도는 바운스 주기(1.00초→0.40초)로만 상승. 천장 가시는 y=248 기준(점프 정점에서만 닿음 — 수평 타이밍 회피)
4. **게임 오브젝트는 React 컴포넌트 금지** — Canvas 직접 드로잉. React는 메뉴/오버레이/HUD만
5. **스킨·해금은 외형만** — 밸런스에 영향 주는 해금 금지 (공정성 원칙)
6. **조작은 좌/우 분할 탭 유지** — 멀티터치는 후속 입력 우선

## 아키텍처 핵심

- `services/` — SDK 추상화 레이어 (storage·ads·auth·leaderboard·haptic·analytics·sound·music). **mock→실 SDK 교체는 이 폴더 파일 단위로만**. 게임 로직에서 SDK 직접 호출 금지
- `game/` — 엔진(물리·충돌·카메라·렌더·입력·파티클). 충돌은 **스윕(swept) 방식** — 단순 겹침 검사로 되돌리면 후반 스테이지에서 터널링 재발
- 카메라 뷰포트는 **월드 좌표 단위** (`GameEngine.updateCameraViewport()` 참고). 화면 px를 직접 넣으면 기기별 깨짐
- `stores/` — Zustand (gameStore: 진행/목숨/광고, unlockStore: 부품◆/스킨, settingsStore: 설정)
- 해금 데이터(부품/스킨)는 진행 초기화(reset)에도 유지된다 — 의도된 설계

## 검증 워크플로우 (코드 수정 후 필수)

```bash
cd app
npx tsc --noEmit   # 타입 체크
npm run build      # 프로덕션 빌드 (tsc -b + vite build)
npm run dev        # 로컬 실행 (--host) — 실제 플레이 확인
```

- 수정 후 최소 tsc + build를 돌리고 결과를 보고할 것
- 물리·충돌·스테이지 데이터를 바꿨으면 브라우저에서 실제 플레이로 확인할 것
- 작동 상태를 작은 단위로 git 커밋 (파괴적 git 명령은 사용자 승인 필요)

## 작업 원칙 (구버전에서 계승)

1. **기존 도구 먼저 확인** — 새 코드를 쓰기 전에 `services/`, `utils/`, `game/`에 이미 있는지 확인
2. **Self-anneal** — 오류를 만나면: 고친다 → 테스트한다 → 배운 것을 관련 문서/주석에 남긴다
3. **모르면 묻기** — 추측으로 구현하지 않는다. 기획 모순을 발견하면 사용자에게 보고
4. **문서 갱신** — 기획이 코드와 달라지면 어느 쪽이 정본인지 확인 후 문서를 갱신 (정본: 코드의 `getBouncePeriod()` 공식, CHECKPOINTS 상수)

## 남은 작업 (Phase 4+, 사용자 결정 필요 항목 포함)

- [ ] 앱인토스 콘솔 가입·앱 등록 (`appName`은 등록 후 수정 불가 — 사용자 확정 필요)
- [ ] mock → 실제 SDK 교체 (storage/ads/auth/leaderboard — `services/` 파일 단위)
- [ ] 게임 등급분류 신청 (1~2주 소요 — 개발과 병행 권장)
- [ ] 폰트 셀프호스팅 전환 (현재 CDN — 웹뷰 차단 시 시스템 폰트 폴백)
- [ ] 스테이지 11~20 실기기 플레이 난이도 검증
- [ ] 샌드박스 + 실기기(Android 7+ / iOS 16+) 테스트
