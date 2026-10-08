import type { Stage } from '../myMatchingData';

type StepState = 'done' | 'current' | 'failed' | 'todo';   // 끝남 / 지금 단계 / 실패 / 아직

const STEP_NAMES = ['화주 매칭 요청', '운송사 수락', '관리자 최종 확인', '매칭 완료'];

// 진행 단계 → 4칸 각각의 상태
const STAGE_STEPS: Record<Stage, StepState[]> = {
  recommended:       ['current', 'todo', 'todo', 'todo'],
  shipperRejected:   ['failed', 'todo', 'todo', 'todo'],
  requested:         ['done', 'current', 'todo', 'todo'],
  logisticsRejected: ['done', 'failed', 'todo', 'todo'],
  adminReview:       ['done', 'done', 'current', 'todo'],
  adminRejected:     ['done', 'done', 'failed', 'todo'],
  completed:         ['done', 'done', 'done', 'done'],
};

// 상세 페이지 위쪽의 진행 상황 (① 화주 요청 → ② 운송사 수락 → ③ 관리자 확인 → ④ 완료)
export default function ProgressSteps({ stage }: { stage: Stage }) {
  const states = STAGE_STEPS[stage];

  return (
    <ol className="mm-steps">
      {STEP_NAMES.map((name, index) => (
        <li key={name} className={`mm-steps__item is-${states[index]}`}>
          <span className="mm-steps__dot">
            {states[index] === 'done' ? '✓' : states[index] === 'failed' ? '✕' : index + 1}
          </span>
          <span className="mm-steps__name">{name}</span>
        </li>
      ))}
    </ol>
  );
}
