import { Overlay } from './Overlay';
import { Button } from './Button';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 미니앱 종료 확인 모달 (앱인토스 검수 요건: 종료 시 확인 노출).
 * 인앱 닫기 버튼 또는 네이티브 뒤로가기에서 트리거된다.
 */
export function ExitConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <Overlay dim={0.85}>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.04em' }}>게임을 종료할까요?</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.55,
          marginTop: 10,
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: 280,
        }}
      >
        진행 상황은 저장되어 다음에 이어서 플레이할 수 있어요.
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Button onClick={onConfirm} variant="primary">
          종료
        </Button>
        <Button onClick={onCancel} variant="ghost">
          취소
        </Button>
      </div>
    </Overlay>
  );
}
