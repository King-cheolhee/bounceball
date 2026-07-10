import { defineConfig } from '@apps-in-toss/web-framework/config';

/**
 * 앱인토스(Apps in Toss) WebView 미니앱 설정. `ait` CLI(ait dev/build/deploy)가 읽는다.
 * 일반 `npm run build`(vite)와는 무관 — 이 파일은 tsconfig include('src')에 포함되지 않아
 * tsc 타입체크 대상이 아니며, ait CLI가 자체 검증한다.
 *
 * ⚠️ 출시(콘솔 등록) 직전 사용자 최종 확인 필요 항목:
 *  - appName: 앱 스킴(intoss://tangtangball). **등록 후 수정 불가**. 사용자 확정(2026-06-14).
 *  - brand.icon: 앱인토스 콘솔에서 승인된 로고 URL과 동일해야 함.
 *  - brand.primaryColor: 앱 정체성 색(검은 배경) 기준 임시값.
 */
export default defineConfig({
  // 영문 appName (명사형, 15자 이내) — 등록 후 수정 불가. 사용자 확정(2026-06-14).
  appName: 'tangtangball',
  brand: {
    // 내비게이션 바에 노출되는 국문 이름
    displayName: '탱탱볼해금',
    // 브랜드 대표색 (검은 화면 정체성) — 샌드박스에서 확인 후 조정
    primaryColor: '#000000',
    // 앱 정보에서 승인된 로고 URL — 콘솔 로고를 바꾸면 이 값도 함께 갱신해야 함
    icon: 'https://static.toss.im/appsintoss/50627/9b7c3904-d6fa-4ef2-99f7-462812372a9d.png',
  },
  // 이 게임은 카메라/위치/연락처 등 별도 권한 요청이 없다
  permissions: [],
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      // ait CLI가 기존 Vite 명령을 래핑 — Vite+React 구조를 그대로 유지한다
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  // Vite 빌드 산출물 디렉터리
  outdir: 'dist',
});
