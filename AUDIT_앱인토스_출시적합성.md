# 탱탱볼해금 — 앱인토스 출시 적합성 최종 감사 보고서

> 작성: 2026-06-13 · 방법: 멀티에이전트 워크플로우(40개 에이전트) — 7개 차원 코드 감사 → 차단/미충족 항목 적대적 재검증(검증 중 blocker 4건 하향, 1건 pass 상향) → 종합
> 기준 문서: `앱인토스_게임개발_가이드_정리.md`, `APPS_IN_TOSS_WORKFLOW.md` · 대상 코드: `app/` (Vite+React18+TS+Zustand 캔버스 물리게임)

---

## 1. 최종 출시 판정 — **조건부 가능 (차단항목 해결 시)**

**한 줄 근거:** 콘텐츠·다크패턴·보안·코드 품질은 위반이 없어 깨끗하나, 앱인토스 SDK 자체가 미설치(`app/package.json:11-22` — react/react-dom/zustand만 존재)라 콘솔 업로드·검수·등급분류가 원천적으로 불가능하다. 게임 자체에 정책적 결함은 없고, "토스에 올리기 위한 필수 연동·등록 절차"가 통째로 미완인 상태다.

> 쉽게 말하면: **게임은 잘 만들어졌고 규칙 위반도 없습니다.** 다만 토스 앱 안에 넣으려면 반드시 깔아야 하는 "토스 전용 부품(SDK)"을 아직 안 깔았고, 출시 신청에 필요한 서류(등급심의·로고·스크린샷·앱 이름 확정)가 하나도 준비되지 않았습니다. 이 두 가지만 끝내면 출시 가능합니다.

---

## 2. 출시 차단(Blocker) 항목 — 총 11건

해결 없이는 콘솔 등록·검수·출시가 불가능한 항목입니다. 우선순위 순(먼저 착수해야 다른 일이 풀리는 순서).

| # | 차원 | 항목 | 현 상태 | 수정노력 | 해야 할 일 |
|---|------|------|---------|----------|-----------|
| 1 | SDK | **앱인토스 SDK 자체 미설치 (Granite 미사용)** `granite-create-ait-app-setup` | 일반 Vite+React SPA. `app/src/main.tsx:1-13` 순수 `ReactDOM.createRoot`, `app/vite.config.ts:1-9` 표준 plugin-react, node_modules에 @apps-in-toss/@granite-js/@toss 부재 | large | `create-ait-app`으로 Granite 기반 재구성 또는 `@apps-in-toss/framework`(SDK 2.x) 도입 후 진입점 이식 |
| 2 | SDK | **SDK 2.x 미빌드 — 콘솔 업로드 불가** `sdk-2x-version` | SDK 1.x·2.x 모두 미설치. `app/package.json:11-22`. 오늘(2026-06-13)은 이미 1.x 업로드 차단일(2026-03-23) 이후 | large | SDK 2.x 최신 도입해 번들 생성. #1과 묶어 진행 |
| 3 | 데이터 | **유저 식별키 getUserKeyForGame 미연동** `user-key-identify-before-start` | 흐름은 정확(`app/src/App.tsx:34`에서 await). 그러나 함수는 SDK가 아닌 mock — `app/src/services/auth.ts:9-23`에서 `crypto.randomUUID()` 로컬 UUID 생성·localStorage 저장 | small | auth.ts의 로컬 UUID 로직을 실제 `getUserKeyForGame()` 호출로 교체(시그니처 동일이라 호출부 유지 가능) |
| 4 | 데이터/SDK | **네이티브 Storage 미사용 (재접속 데이터 유지 불보장)** `storage-native` / `persist-after-reopen-storage-medium` | `app/src/services/storage.ts:1-44` window.localStorage 래퍼 + 메모리 폴백. 폴백 시 종료하면 전량 소실 위험 | medium | storage.ts 내부 safeGet/Set/Remove를 SDK `Storage`로 교체(이미 async 인터페이스라 상위 호출부 수정 불필요) |
| 5 | SDK/데이터 | **게임 리더보드 submitGameCenterLeaderBoardScore 미연동** `leaderboard-submitGameCenterLeaderBoardScore` / `leaderboard-submit-on-end` | 호출 타이밍은 정확(`app/src/pages/GamePlayPage.tsx:93` 클리어 후). 그러나 `app/src/services/leaderboard.ts:7-11`은 DEV에서 console.info만, 운영 빌드는 완전 no-op | small | leaderboard.ts 본문을 실제 `submitGameCenterLeaderBoardScore({score})`로 교체. 콘솔에서 점수 단위·정렬 먼저 설정. (점수 개념 없는 게임이라 적용 여부는 사용자 결정 필요 — §5 참조) |
| 6 | UX | **미니앱 닫기 버튼 부재 (모든 화면에서 나갈 방법 없음)** `close-button-exit-every-screen` | `app/src/App.tsx:85`의 onExit는 미니앱 종료가 아닌 메뉴 화면 전환일 뿐. SDK 미설치라 토스 네이티브 내비바·닫기 브리지 없음 | medium | SDK 연동 후 닫기 동작 적용, 모든 화면(스플래시·메뉴·설정·플레이·오버레이)에서 이탈 동작 샌드박스 검증 |
| 7 | UX/보안 | **미니앱 종료 확인 모달 부재** `exit-confirm-modal` | 종료 훅(beforeunload 등) 없음. 존재하는 확인 UI는 `app/src/pages/MainMenuPage.tsx:147-182` '진행 데이터 초기화' 확인뿐(종료와 무관) | medium | SDK 연동 후 닫기/뒤로가기 시점에 종료 확인 모달 추가. #6과 묶어 처리 |
| 8 | 콘솔등록 | **appName(영문)·한글명 미확정** `appname-korean-name-decided` | 후보만 존재(`app/package.json:2` tangtangball / `app/index.html:13` 탱탱볼해금). 워크플로 §7-1 식별정보 칸 공란, 관련 문서 전부 미체크 to-do | trivial | 영문 appName(명사형 15자 이내)·한글명 확정. **등록 후 수정 불가**이므로 등록 직전 사용자 명시 확인 필수 |
| 9 | 콘솔등록 | **게임 등급분류 미신청** `game-rating-classification` | 신청 시작조차 안 됨. 모든 문서(AGENTS.md:83, DEVELOPMENT_ROADMAP.md:39/387, SESSION_V2.md:92)에 미체크 to-do. **1~2주 소요** | large | 오픈마켓 자체등급분류 또는 게임위 심의 결정·착수. **가장 먼저 시작**(소요기간 김). 등록자명=사업자명 일치 필수 |
| 10 | 콘솔등록 | **스토어 에셋(로고·썸네일·스크린샷) 0개** `store-assets-logo-thumbnail-screenshots` | `app/public/` 빈 디렉터리. 저장소 PNG는 .tmp/shot-*.png(960x432 QA 캡처)뿐이며 gitignore 대상·규격 불일치 | medium | 로고 600x600 PNG(불투명), 썸네일 1000x1000·1932x828, 스크린샷 세로 636x1048(3장+)·가로 1504x741(1장+) 제작. 가로 고정 게임이라 가로형 중요 |
| 11 | 콘솔등록 | **스토어 메타데이터(부제·키워드·상세설명) 미작성** `store-metadata-subtitle-keywords-description` | DEVELOPMENT_ROADMAP.md:390/256 미체크. 작성된 문안 없음 | small | 부제(느낌표·비속어 금지)·검색 키워드·상세설명 작성. 리더보드 점수 단위는 '도달 스테이지/정수/내림차순'으로 콘솔 설정 |

> **차단 항목 성격 구분:** #1~7은 **코드 연동 작업**(SDK 도입 후 자연 해결), #8~11은 **사용자·외부기관 작업**(개발자가 결정·제작·신청). 코드 결함은 없습니다 — 전부 "아직 안 한 연동·등록"입니다.

---

## 3. 비차단 미충족·부분충족 — 개선 권고

차단은 아니나 출시 전 또는 SDK 교체 시 함께 처리할 항목입니다.

| 차원 | 항목 | 상태 | 현상태 / 근거 | 권고 |
|------|------|------|--------------|------|
| SDK | Safe Area `safe-area` | partial | SDK API 아닌 CSS `env(safe-area-inset-*)`로 처리. `app/src/styles/variables.css:10-13`. 단 게임 캔버스 `app/src/pages/GamePlayPage.tsx:202-205`는 inset:0 풀스크린 | 실기기(iPhone 14 Pro+ 다이나믹아일랜드)에서 HUD·버튼 안 가리는지 확인. SDK 교체 시 값 보강 |
| SDK | 분석 analytics `analytics` | fail (비차단) | `app/src/services/analytics.ts:1-5` console.info만, 운영 빌드 no-op | SDK 행동기록 API로 내부 교체. 호출부(App.tsx:36, GamePlayPage 78/107/168) 배선 완료됨 |
| SDK | 권장기능(햅틱·방향·오디오포커스·시간) `recommended-haptic-orientation-audiofocus` | partial | 햅틱은 `app/src/services/haptic.ts:21-31` navigator.vibrate 자체구현(동작O), getServerTime·setScreenAwakeMode 미적용 | 권장 항목이라 즉시 반려 사유 아님. 몰입도·무결성 위해 SDK 함수 교체 권장 |
| 수익화 | 실제 광고 미연동(Mock) `ads-in-use` | fail (비차단) | `app/src/services/ads.ts:37-84` Mock 스텁, `app/src/components/MockAdOverlay.tsx` 가짜 카운트다운 | (A)광고 없이 출시: MockAdOverlay·트리거 제거 (B)광고 출시: 실제 SDK 교체. **MockAdOverlay 'SDK로 교체됩니다' 문구가 플레이어·검수자에 노출되므로 그대로 제출 금지** |
| 수익화 | 광고 사전로딩 `ads-preload` | partial | `app/src/pages/GamePlayPage.tsx:109-111` 사전로딩 호출 패턴 존재하나 Mock. showInterstitial/showRewarded는 현재 dead code(실렌더 경로와 단절) | 실제 SDK 교체 시 show 직전 isAdReady 게이팅 연결 |
| UX | 무음모드/오디오포커스 `sound-haptic-applied-and-silent-mode` | partial | 사운드·햅틱 적용 완료. iOS 무음스위치 감지 없음(`app/src/pages/SettingsPage.tsx:64` 안내문구만), `OnAudioFocusChanged` 미연동 | SDK 연동 시 오디오포커스 콜백 추가. iOS 무음스위치 ON 실기기 확인 |
| UX | 풀스크린·화면방향 `fullscreen-orientation` | partial | 풀스크린 구현. 방향은 RotatePrompt 안내(소프트)뿐, `setDeviceOrientation` 미사용 | SDK로 가로 고정 명시 적용 권장. 샌드박스 가로 고정 확인 |
| 보안 | OS 뒤로가기 비의존 + 이탈경로 `no-os-back-gesture-dependency` | partial | OS 뒤로가기 비의존(충족). 종료확인 모달·내비바 연동 미구현 | #6·#7과 함께 SDK 연동 시 처리 |
| 보안 | 메모리·누수 `no-network-memory-spike` | partial | rAF·타이머·리스너 cleanup 완비, 파티클 220개 하드캡. 결함 없음. WebAudio 장기누적·SDK後 네트워크만 미확인 | 실기기 10~20분 플레이 메모리 프로파일링 |
| 데이터 | 기기변경 유실방지 `device-change-loss-prevention` | fail (비차단) | 자체 서버 백업·동기화 없음, 식별자 기기별 로컬 UUID | 1차: SDK 유저키 의존(자체서버 불필요)+로컬 유실 고지. 추후: 유저키 기반 백엔드 동기화 |
| 데이터 | 게임 프로필 최초등록 `game-profile-first-time-registration` | fail (비차단) | 프로필 등록 흐름 전무(화면 splash/menu/play/settings 4개뿐) | 리더보드 켤 경우 프로필 필요 여부 콘솔 정책 확인. 1차 리더보드 제외 시 N/A로 격하 가능 |
| 콘솔등록 | 폰트 외부 CDN 의존 `font-cdn-self-hosting` | partial | `app/index.html:10-12` Pretendard(jsDelivr)·Inter(Google) CDN. system-ui 폴백 있어 깨지진 않음 | woff2 셀프호스팅·@font-face 번들 포함 권장(블로커 아님) |

> **적대적 검증 중 blocker 하향 4건:** 최초 blocker로 표기됐다 재검증으로 false 확정된 항목 — Safe Area(`safe-area`), 분석(`analytics`), 기기변경 유실방지(`device-change-loss-prevention`), 게임 프로필(`game-profile-first-time-registration`). 사유: 실제 출시 게이트인 가이드 §4 검수 체크리스트에 해당 항목이 없거나(분석·프로필), 결과 기준이지 SDK 방법 강제가 아니거나(Safe Area), IAP 전제 항목인데 결제가 없기 때문(기기변경). 또한 외부링크 항목(`no-external-link-or-self-app-install`)은 partial→**pass 상향**(요구사항 완전 충족, 폰트 CDN은 본 항목 사안 아님).

---

## 4. 이미 충족한 강점 (pass 항목)

게임 자체의 완성도와 정책 준수도는 높습니다. 별도 조치 불필요.

**콘텐츠·다크패턴 (전부 pass)**
- 출시 불가 콘텐츠 없음 — 추상 픽셀 플랫포머, 사행성·도박·NFT·금융·의료 무관 (`app/src/utils/story.ts:1-49`, `stages.ts:121-478`)
- 비사행성 수익화 — 스킨은 인게임 부품(◆) 확정가격(20/45/75) 구매, 가챠·랜덤박스 없음 (`app/src/utils/skins.ts:16-21`, `unlockStore.ts:46-57`)
- 외부링크·자사앱 설치 유도 0건, 생성형 AI 0건, 다크패턴(강제 바텀시트·뒤로가기 차단·예측못한 전면광고) 0건 (`app/src/App.tsx:55-89`, popstate/beforeunload grep 0건)

**UX·내비게이션**
- 10초 내 첫 화면 진입(스플래시 1100ms, localStorage 동기 hydrate) (`app/src/pages/SplashPage.tsx:10-12`)
- 사운드 On/Off 독립 토글 + 영속화 (`app/src/pages/SettingsPage.tsx:45-56`, `settingsStore.ts:29-37`)
- 백그라운드 전환 시 사운드 즉시 정지·복귀 (`app/src/hooks/useVisibilityPause.ts:9-23`, suspend 사유 Set 관리로 광고+백그라운드 중첩까지 안전)
- CTA 라벨 명확('게임 시작'/'광고 보고 부활하기 (+3)'/'메인 메뉴로 (체크포인트 복귀)') (`MainMenuPage.tsx:143-145`, `GameOverOverlay.tsx:19-21`)
- 진입 즉시 강제 모달 없음 (`GamePlayPage.tsx:279-360` 오버레이는 사용자 행동 결과로만 노출)

**보안·기술 제약 (대부분 pass)**
- eval·new Function·동적 외부 import 0건, history 조작 0건, iframe 0건, SSR 아님(순수 CSR), 다크모드 분기 0건, 핀치줌 비활성(`user-scalable=no`) (`app/index.html:5`, `vite.config.ts:1-9`)

**수익화·번들**
- 광고가 화면 전환 지점(스테이지 10·15 클리어 후)·자발적 부활에만 노출, 1~9 무광고 (`gameStore.ts:277-280`, `constants.ts:87`)
- 광고 중 음악 일시정지·종료 후 복귀 구현 (`GamePlayPage.tsx:139-146,183-189`)
- 배너광고·인앱결제 코드 전무(N/A)
- 번들 232KB(100MB 제한의 0.23%) (`app/dist` 측정)
- 외부 이미지·사운드 의존 0(전부 Canvas 절차 드로잉 + WebAudio 합성) (`sound.ts`, `music.ts`)

**데이터 영속**
- 진행/해금/스테이지기록/설정 키별 저장·복원, 초기화 시 해금·기록 보존 설계 (`storage.ts:71-236`, `gameStore.ts:77-86`) — 매체만 SDK로 바꾸면 그대로 사용 가능

---

## 5. 코드로 판단 불가(unknown) → 콘솔/실기기/사용자 결정 필요

| 항목 | 왜 코드로 판단 불가한가 | 누가 / 어떻게 |
|------|----------------------|--------------|
| 어뷰징(테마만 다른 동일핵심 다중앱) `abuse-theme-clone-multiapp` | 워크스페이스 단위 정책 — 단일 저장소만으론 판정 불가. 본 저장소는 단일 게임 확인 | **사용자**: 같은 콘솔 워크스페이스에 핵심기능 동일·테마만 다른 앱 중복 등록 안 하면 문제없음 |
| 수익화 차원 N/A 확정 `monetization-overall-na` | '광고 없이 출시'인지 '실제 광고 출시'인지 출시 전략 결정 사항 | **사용자**: 광고 수익화 여부 결정. 없이 출시 시 MockAdOverlay 제거 필수 |
| 리더보드 적용 여부 `leaderboard-*` | 탱탱볼해금은 점수 아닌 스테이지 진행형 게임 — 리더보드 디자인상 적용 결정 필요 | **사용자**: 리더보드 사용 여부 콘솔에서 확정 |
| 입력·전환 2초 이내 응답 `interaction-response-under-2s` | 실제 프레임/입력 지연은 런타임 측정 필요. 코드상 블로킹 요인 없음 | **실기기**: 저사양 Android 7에서 실측 |

---

## 6. 출시까지 단계별 로드맵 (SESSION_V2 Phase 4 연계)

SESSION_V2.md:92가 'Phase 4: 실제 SDK 교체·콘솔등록·등급분류(1~2주)'로 이미 인지한 잔여 작업과 정확히 일치합니다.

### 단계 0 — 즉시 착수(병행, 소요기간이 김)
- **게임 등급분류 신청** (Blocker #9) — 1~2주 소요. 가장 먼저 시작. 오픈마켓 자체등급 또는 게임위 심의 결정, 등록자명=사업자명 일치
- **appName·한글명 확정** (Blocker #8) — 사용자 결정. 등록 후 수정 불가
- **광고/리더보드/프로필 사용 여부 결정** — 사용자 의사결정(§5 표 참조)
- **산출물:** 등급분류 신청 접수증, 확정된 영문 appName + 한글명, 수익화·리더보드 정책 결정서

### 단계 1 — SDK 도입·연동 (Blocker #1~7 핵심)
1. `create-ait-app` 또는 `@apps-in-toss/framework`(2.x) 설치, Granite 진입점 구성 (#1, #2)
2. `services/` 5종 mock → 실제 SDK 교체:
   - auth.ts → `getUserKeyForGame()` (#3)
   - storage.ts → 네이티브 `Storage` (#4) — async 인터페이스라 상위 코드 무수정
   - leaderboard.ts → `submitGameCenterLeaderBoardScore()` (#5, 리더보드 채택 시)
   - ads.ts → 실제 광고 SDK 또는 제거(미수익화 시)
   - analytics.ts → 행동기록 API
3. 닫기 버튼·종료 확인 모달·네비바·Safe Area·setDeviceOrientation 연동 (#6, #7, 권고 다수)
- **산출물:** SDK 2.x로 빌드된 번들, mock 0건, 닫기·종료확인 동작

### 단계 2 — 스토어 에셋·메타데이터 제작 (Blocker #10, #11)
- 로고 600x600, 썸네일 1000x1000·1932x828, 스크린샷 세로 636x1048(3장+)·가로 1504x741(1장+)
- 부제·검색키워드·상세설명 작성, 리더보드 점수단위·정렬 콘솔 설정
- 폰트 셀프호스팅 전환(권고)
- **산출물:** 규격 충족 이미지 세트, 스토어 문안, 셀프호스팅 폰트

### 단계 3 — 샌드박스·실기기 검증
- 토스 샌드박스 + 실기기(Android 7+/iOS 16+): 모든 화면 닫기·이탈, 유저키 발급·재접속 데이터 유지, 가로 고정·풀스크린, Safe Area(다이나믹아일랜드), iOS 무음스위치, 광고 사전로딩·음악정지·복귀, 입력 2초 이내, 10~20분 메모리
- **산출물:** §4 검수 체크리스트 통과 기록

### 단계 4 — 콘솔 등록·검수 제출·출시
- 등급분류 증명 첨부, 식별정보·에셋·메타데이터 입력, 검수 제출 → 통과 후 출시
- **산출물:** 콘솔 등록 완료, 검수 통과, 출시

---

## 종합

**DONE_WITH_CONCERNS** — 7개 차원 감사·적대적 검증 완료. 게임 콘텐츠·다크패턴·보안·코드 품질은 위반 0건으로 우수하나, **출시 차단(Blocker) 11건**이 남아 있습니다. 핵심은 단 하나의 근본 원인 — **앱인토스 SDK 미설치**(`app/package.json:11-22`)에서 SDK 관련 7건이 파생되며, 나머지 4건은 콘솔 등록·등급분류·에셋·이름 확정이라는 **사용자/외부기관 행정 작업**입니다.

가장 큰 일정 리스크는 **게임 등급분류(1~2주)**이므로 코드 작업과 무관하게 **지금 즉시 신청**해야 합니다. SDK 교체 비용은 services 계층이 깔끔히 추상화돼 있어 대부분 small~medium이며(특히 storage·auth·leaderboard·analytics는 내부 구현만 교체), 진짜 large는 SDK 도입·Granite 셋업 자체뿐입니다.
