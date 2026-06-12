export function RotatePrompt() {
  return (
    <div className="rotate-prompt" role="alert">
      <div className="rotate-prompt__icon" />
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '0.06em' }}>가로 모드로 회전해 주세요</div>
      <div style={{ fontSize: 13, opacity: 0.6 }}>이 게임은 가로 모드 전용입니다</div>
    </div>
  );
}
