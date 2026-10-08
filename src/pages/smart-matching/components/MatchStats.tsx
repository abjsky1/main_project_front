import type { StageGroup } from '../../my-matching/myMatchingData';

// 상단 숫자 카드 필터 : 전체 + 진행 단계 분류 4가지
export type MatchFilter = 'all' | StageGroup;

interface MatchStatsProps {
  counts: Record<MatchFilter, number>;    // 카드마다 건수
  filter: MatchFilter;
  onFilterChange: (filter: MatchFilter) => void;
}

// 카드 5개 (순서대로) — 누르면 해당 상태만 아래 목록에 보기
export const STAT_CARDS: { key: MatchFilter; label: string; sub: string }[] = [
  { key: 'all', label: '전체', sub: '전체 매칭 건수' },
  { key: 'linked', label: '자동 매칭 연결', sub: '쌍방 검토 중' },
  { key: 'requested', label: '화주사만 승인', sub: '물류 매칭 수락 대기' },
  { key: 'completed', label: '최종 매칭 성사', sub: '운송사 수락 완료' },
  { key: 'failed', label: '최종 매칭 실패', sub: '화주 · 운송사 거절' },
];

// 상태별 개수 카드 5개
export default function MatchStats({ counts, filter, onFilterChange }: MatchStatsProps) {
  return (
    <div className="sm-stats">
      {STAT_CARDS.map((card) => (
        <button
          key={card.key}
          onClick={() => onFilterChange(card.key)}
          className={filter === card.key ? 'sm-stat is-active' : 'sm-stat'}
        >
          {/* tone-linked, tone-failed ... 처럼 상태별 글자색 클래스 */}
          <p className={`sm-stat__value tone-${card.key}`}>{counts[card.key]}</p>
          <p className="sm-stat__label">{card.label}</p>
          <p className="sm-stat__sub">{card.sub}</p>
        </button>
      ))}
    </div>
  );
}
