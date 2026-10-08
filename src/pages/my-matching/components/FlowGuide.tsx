import type { Viewer } from './StageBadge';

// 새 매칭 흐름 4단계 (목록 페이지 위쪽 안내)
const FLOW = [
  { title: '자동 매칭', desc: '필수조건을 통과한 운송사를 점수순으로 추천' },
  { title: '화주 매칭 요청', desc: '화주가 운송사를 골라 매칭 요청' },
  { title: '운송사 수락', desc: '운송사가 요청을 수락 또는 거절' },
  { title: '관리자 최종 승인', desc: '둘 다 수락한 건만 관리자가 확인' },
];

// 보는 사람이 직접 하는 단계를 강조 (화주 = 2번째 , 운송사 = 3번째)
export default function FlowGuide({ viewer }: { viewer: Viewer }) {
  const myStep = viewer === 'shipper' ? 1 : 2;

  return (
    <ol className="mm-flow">
      {FLOW.map((step, index) => (
        <li key={step.title} className={index === myStep ? 'mm-flow__item is-mine' : 'mm-flow__item'}>
          <span className="mm-flow__num">{index + 1}</span>
          <div>
            <p className="mm-flow__title">
              {step.title}
              {index === myStep && <span className="mm-flow__me">내 차례</span>}
            </p>
            <p className="mm-flow__desc">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
