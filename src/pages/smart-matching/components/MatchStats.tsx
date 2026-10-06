import type { MatchItem, StatusFilter } from '../matchTypes';

interface MatchStatsProps {
  matches: MatchItem[];
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

// 상태별 개수 카드 5개 (누르면 해당 상태만 보기)
export default function MatchStats({ matches, filter, onFilterChange }: MatchStatsProps) {
  // 개수 = filter 로 조건에 맞는 카드만 남긴 배열의 length
  const stats: { key: StatusFilter; label: string; value: number }[] = [
    { key: 'all', label: '전체', value: matches.length },
    { key: 'pending', label: '검토 대기', value: matches.filter((m) => m.adminStatus === 'pending').length },
    { key: 'approved', label: '쌍방 검토 중', value: matches.filter((m) => m.adminStatus === 'approved' && m.finalStatus === 'pending').length },
    { key: 'completed', label: '최종 성사', value: matches.filter((m) => m.finalStatus === 'completed').length },
    { key: 'failed', label: '실패', value: matches.filter((m) => m.finalStatus === 'failed').length },
  ];

  return (
    <div className="sm-stats">
      {stats.map((s) => (
        <button key={s.key} onClick={() => onFilterChange(s.key)} className={filter === s.key ? 'sm-stat is-active' : 'sm-stat'}>
          {/* tone-pending, tone-failed ... 처럼 상태별 글자색 클래스 */}
          <p className={`sm-stat__value tone-${s.key}`}>{s.value}</p>
          <p className="sm-stat__label">{s.label}</p>
        </button>
      ))}
    </div>
  );
}
