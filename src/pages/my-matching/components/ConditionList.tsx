import type { ConditionSummary } from '../myMatchingData';

interface ConditionListProps {
  conditions: ConditionSummary[];      // 날짜 빠른 순으로 정렬된 내 조건 목록
  selectedId: number | null;           // 지금 고른 조건 (오른쪽 표에 보여주는 조건)
  dateLabel: string;                   // 날짜 앞 글자 (화주 '희망' , 운송사 '운송 가능')
  countLabel: (count: number) => string;   // 오른쪽 작은 숫자 글자 (예: '추천 5곳')
  onSelect: (id: number) => void;
}

// 메인 페이지 "내 매칭" 왼쪽 : 내 매칭 조건 목록 (10줄 높이 , 넘치면 스크롤)
export default function ConditionList({ conditions, selectedId, dateLabel, countLabel, onSelect }: ConditionListProps) {
  return (
    <section className="mb-panel">
      <div className="mb-panel__head">
        <p className="eyebrow">내 매칭 조건</p>
        <span className="mb-panel__count">{conditions.length}건</span>
      </div>

      <div className="mb-panel__body">
        {/* 오른쪽 표의 머리글 줄과 높이를 맞춘 안내 줄 */}
        <p className="mb-list__sort">{dateLabel === '희망' ? '희망 일정' : '운송 가능일'} 빠른 순</p>

        <ul className="mb-list">
          {conditions.map((condition) => (
            <li key={condition.id}>
              <button
                onClick={() => onSelect(condition.id)}
                className={condition.id === selectedId ? 'mb-list__item is-selected' : 'mb-list__item'}
              >
                <span className="mb-list__text">
                  <span className="mb-list__route">{condition.departure} → {condition.destination}</span>
                  <span className="mb-list__meta">HS {condition.hsCode} · {dateLabel} {condition.date}</span>
                </span>
                <span className={condition.actionCount > 0 ? 'mb-list__badge is-action' : 'mb-list__badge'}>
                  {condition.actionCount > 0 ? `응답 필요 ${condition.actionCount}` : countLabel(condition.rows.length)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
