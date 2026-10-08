import type { Stage } from '../myMatchingData';

export type Viewer = 'shipper' | 'logistics';   // 화면을 보는 사람 (화주 / 운송사)

// 진행 단계 → 배지 글자 + 색 클래스 (보는 사람에 따라 글자가 조금 다름)
// [TS] Record<Stage, {...}> : 단계 이름마다 값을 적어 둔 객체 (가이드 2-8)
const STAGE_LABEL: Record<Stage, { shipper: string; logistics: string; tone: string }> = {
  recommended:       { shipper: '검토 대기',            logistics: '검토 대기',            tone: 'mm-badge--pending' },
  shipperRejected:   { shipper: '거절함',               logistics: '화주 거절',            tone: 'mm-badge--muted' },
  requested:         { shipper: '운송사 응답 대기',      logistics: '응답 필요',            tone: 'mm-badge--waiting' },
  logisticsRejected: { shipper: '운송사 거절',           logistics: '거절함',               tone: 'mm-badge--failed' },
  adminReview:       { shipper: '관리자 최종 확인 중',  logistics: '관리자 최종 확인 중',  tone: 'mm-badge--review' },
  completed:         { shipper: '매칭 완료',            logistics: '매칭 완료',            tone: 'mm-badge--completed' },
  adminRejected:     { shipper: '관리자 반려',           logistics: '관리자 반려',           tone: 'mm-badge--failed' },
};

// 진행 상태 배지
export default function StageBadge({ stage, viewer }: { stage: Stage; viewer: Viewer }) {
  const info = STAGE_LABEL[stage];
  // 운송사가 답해야 하는 요청은 눈에 띄는 색으로
  const tone = viewer === 'logistics' && stage === 'requested' ? 'mm-badge--action' : info.tone;

  return <span className={`mm-badge ${tone}`}>{viewer === 'shipper' ? info.shipper : info.logistics}</span>;
}
