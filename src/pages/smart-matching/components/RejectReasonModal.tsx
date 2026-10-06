import type { ReactNode } from 'react';
import { REJECT_REASONS } from '../matchTypes';

// [TS] ReactNode = 글자나 JSX 등 화면에 그릴 수 있는 모든 것 (가이드 2-8)
interface RejectReasonModalProps {
  title: ReactNode;       // 예: '매칭 반려', '화주사 거절'
  description: string;    // 예: '반려 사유를 선택하세요'
  confirmLabel: string;   // 예: '반려 확인'
  selected: string;
  onSelect: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

// 반려/거절 사유를 고르는 모달
export default function RejectReasonModal({ title, description, confirmLabel, selected, onSelect, onCancel, onConfirm }: RejectReasonModalProps) {
  return (
    <div className="reason-modal">
      <div className="reason-modal__card">
        <h3 className="reason-modal__title">{title}</h3>
        <p className="reason-modal__desc">{description}</p>
        <div className="reason-modal__options">
          {REJECT_REASONS.map((r) => (
            <button key={r} onClick={() => onSelect(r)} className={selected === r ? 'reason-option is-selected' : 'reason-option'}>
              {r}
            </button>
          ))}
        </div>
        <div className="reason-modal__actions">
          <button onClick={onCancel} className="reason-modal__cancel">취소</button>
          {/* 사유를 고르기 전(selected 가 빈 글자)에는 확인 버튼 비활성화 */}
          <button onClick={onConfirm} className="reason-modal__confirm" disabled={!selected}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
