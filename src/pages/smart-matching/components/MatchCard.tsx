import type { MatchItem } from '../matchTypes';
import MatchDetail from './MatchDetail';

// 진행 상태 배지 (글자 + CSS 클래스)
function getStatusBadge(m: MatchItem) {
  if (m.finalStatus === 'completed') return { label: '매칭 성사', className: 'status-badge--completed' };
  if (m.finalStatus === 'failed') return { label: '매칭 실패', className: 'status-badge--failed' };
  if (m.adminStatus === 'rejected') return { label: '관리자 반려', className: 'status-badge--rejected' };
  if (m.adminStatus === 'approved') return { label: '쌍방 검토 중', className: 'status-badge--approved' };
  return { label: '검토 대기', className: 'status-badge--pending' };
}

interface MatchCardProps {
  match: MatchItem;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onAdminReject: () => void;
  
}

// 매칭 결과 카드 1개 (클릭하면 상세 펼침)
export default function MatchCard({ match, expanded, onToggle, onApprove, onAdminReject }: MatchCardProps) {
  const badge = getStatusBadge(match);

  return (
    <div className={expanded ? 'match-card is-expanded' : 'match-card'}>
      {/* 요약 줄 */}
      <div className="match-card__summary" onClick={onToggle}>
        {/* 점수 */}
        <div className="match-card__score">
          <span className="match-card__score-value">{match.totalScore}</span>
          <span className="match-card__score-label">점수</span>
        </div>

        {/* 회사 / 조건 요약 */}
        <div className="match-card__main">
          <div className="match-card__names">
            <span className="match-card__company">{match.shipper.companyName}</span>
            <span className="match-card__arrow">↔</span>
            <span className="match-card__company">{match.logistics.companyName}</span>
          </div>
          <p className="match-card__brief">
            {match.request.country} · HS {match.request.hsCode} · {match.request.transport} · {match.request.volume}t · {match.request.schedule}
          </p>
          <div className="match-card__factors">
            {match.matchFactors.slice(0, 3).map((f, i) => (
              <span key={i} className="factor-chip">{f}</span>
            ))}
            {match.matchFactors.length > 3 && (
              <span className="factor-chip factor-chip--more">+{match.matchFactors.length - 3}</span>
            )}
          </div>
        </div>

        {/* 상태 / 날짜 / 펼치기 */}
        <div className="match-card__side">
          <span className={`status-badge ${badge.className}`}>{badge.label}</span>
          <span className="match-card__date">{match.createdAt.split(' ')[0]}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="match-card__chevron">
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* 펼친 상세 */}
      {expanded && (
        <MatchDetail
          match={match}
          onApprove={onApprove}
          onAdminReject={onAdminReject}

        />
      )}
    </div>
  );
}
