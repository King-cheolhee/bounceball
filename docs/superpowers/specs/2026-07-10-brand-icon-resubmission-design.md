# 탱탱볼해금 브랜드 아이콘 반려 대응 설계

> 작성일: 2026-07-10
> 상태: 사용자 방향 승인(권장안 A) · 구현 전 서면 검토

## 1. 목표

앱 정보 심사에서 승인된 브랜드 로고와 새 앱 번들의 브랜드 아이콘을 동일하게 맞춰, 반려된 `20260707-1` 대신 새 버전으로 앱인토스 검토를 다시 요청할 수 있게 한다.

## 2. 확인된 원인

- 앱인토스 콘솔의 승인 로고 URL은 `https://static.toss.im/appsintoss/50627/9b7c3904-d6fa-4ef2-99f7-462812372a9d.png`이다.
- 현재 `app/granite.config.ts`의 `brand.icon`은 로컬 상대경로 `logo.png`다.
- 반려된 `app/tangtangball.ait`에서도 `logo.png` 문자열이 확인된다.
- 앱인토스 공식 브랜딩 가이드는 콘솔에 올린 로고의 링크를 `brand.icon`에 동일하게 입력하도록 요구한다.

## 3. 검토한 접근

### A. 승인된 콘솔 로고 URL을 번들 설정에 사용 — 채택

`brand.icon`을 콘솔 승인 로고의 정적 URL로 바꾼다. 앱 정보는 건드리지 않고 반려 원인만 제거하는 최소 변경이다.

### B. 콘솔 로고를 기존 로컬 로고로 교체 — 제외

이미 승인된 앱 정보를 다시 바꾸게 되며 앱 정보 재검토 가능성과 브랜드 변경 위험이 생긴다.

### C. 별도 서버에 동일 로고 호스팅 — 제외

외부 호스팅 장애 지점이 추가되고, 콘솔에서 복사한 동일 링크를 사용하라는 공식 절차보다 불확실하다.

## 4. 변경 설계

변경 파일은 `app/granite.config.ts` 한 개다.

```ts
brand: {
  displayName: '탱탱볼해금',
  primaryColor: '#000000',
  icon: 'https://static.toss.im/appsintoss/50627/9b7c3904-d6fa-4ef2-99f7-462812372a9d.png',
},
```

아이콘 관련 주석도 로컬 파일 복사를 설명하는 현재 문구에서, 콘솔 승인 URL을 정본으로 사용한다는 설명으로만 고친다. 게임 코드, 스토어 이미지, 앱 정보, 광고 설정, 게임 동작은 변경하지 않는다.

## 5. 검증 설계

1. `app`에서 `npx tsc --noEmit` 실행
2. `npm run build` 실행
3. `npm run ait:build`로 새 `app/tangtangball.ait` 생성
4. 새 `.ait` 바이너리에서 승인된 정적 URL 문자열이 포함됐는지 확인
5. `git diff`로 승인 범위 밖 변경이 없는지 확인

`brand.icon`은 앱 셸과 내비게이션에서 쓰는 메타데이터이므로 게임 물리·저장 데이터·광고 로직에는 영향이 없다. 잘못되면 새 버전이 다시 반려되거나 토스 앱에서 브랜드 아이콘이 깨질 수 있으므로, 빌드 성공만으로 끝내지 않고 `.ait`의 실제 URL 포함 여부를 직접 확인한다.

## 6. 출시 경계

- 검증된 새 `.ait` 생성까지는 승인된 구현 범위다.
- 앱인토스 콘솔에 새 버전을 등록하는 것은 외부 변경이므로 업로드 직전에 대상 파일·버전 메모를 다시 확인한다.
- 프로젝트 세션문서의 안전 규칙에 따라 최종 `검토 요청`과 승인 후 `출시하기`는 사용자가 직접 클릭한다.

## 7. 근거

- 프로젝트: `탱탱볼해금_session_v8.md`, `app/granite.config.ts`
- 세컨드브레인: `Wiki/development/apps-in-toss-console-submission.md`, `submission-doc-code-truth-alignment.md`, `propagate-source-change-to-all-surfaces.md`
- 공식 문서: https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.html
