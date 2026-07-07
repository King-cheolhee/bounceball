import { GAME_RATING } from '../utils/constants';

/**
 * 게임법 §33 전체이용가 등급 아이콘 (게임물관리위원회 공식 마크 색 = 초록).
 * 초기화면(메뉴)·설정 제작정보표에서 재사용. 접근성: 등급을 aria-label로 노출.
 */
export function RatingBadge({ size = 46 }: { size?: number }) {
  return (
    <div
      role="img"
      aria-label={`${GAME_RATING.rating} 게임물`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#1f9d55',
        color: '#fff',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1.04,
        textAlign: 'center',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.1)',
        flexShrink: 0,
      }}
    >
      <b aria-hidden style={{ fontSize: size * 0.32, fontWeight: 900 }}>전체</b>
      <span aria-hidden style={{ fontSize: size * 0.165, fontWeight: 700, letterSpacing: '-0.02em' }}>
        이용가
      </span>
    </div>
  );
}
