import type { MatchItem, PartyKey } from '../matchTypes';
import PartyResponses from './PartyResponses';

// 일치(✓) / 부분 일치(⚠) 표시
const MatchBadge = ({ match }: { match: boolean | null }) =>
  match === null ? <span className="compare-row__key">–</span> :
  match ? <span className="match-badge match-badge--yes">✓ 일치</span> : <span className="match-badge match-badge--partial">⚠ 부분</span>;

const ox = (v: boolean) => (v ? 'O' : 'X');

interface MatchDetailProps {
  match: MatchItem;
  onApprove: () => void;
  onAdminReject: () => void;                 // 관리자 반려 모달 열기
  onPartyAccept: (party: PartyKey) => void;
  onPartyReject: (party: PartyKey) => void;  // 당사자 거절 모달 열기
}

// 매칭 카드를 펼쳤을 때 보이는 상세 내용
export default function MatchDetail({ match, onApprove, onAdminReject, onPartyAccept, onPartyReject }: MatchDetailProps) {
  const { request, offer } = match;

  const scores = [
    { label: '노선', score: match.routeScore, max: 30 },
    { label: '가용 물량', score: match.capacityScore, max: 25 },
    { label: 'HS코드', score: match.itemScore, max: 20 },
    { label: '일정', score: match.scheduleScore, max: 15 },
    { label: '경험', score: match.experienceScore, max: 10 },
  ];

  // [항목, 값]
  const requestRows: [string, string][] = [
    ['타겟 국가', request.country],
    ['HS 코드', request.hsCode],
    ['구분', request.tradeType],
    ['운송방식', request.transport],
    ['출발지', request.departure],
    ['도착지', request.destination],
    ['물량', `${request.volume}t`],
    ['희망 일정', request.schedule],
    ['화물 조건', request.cargoType],
    ['냉장/냉동', ox(request.refrigeration)],
    ['위험물', ox(request.hazmat)],
    ['중량물', ox(request.heavy)],
    ['특수화물', ox(request.special)],
  ];

  // [항목, 값, 요청과 일치 여부(null이면 표시 안 함)]
  const offerRows: [string, string, boolean | null][] = [
    ['서비스 국가', offer.country, offer.country === request.country],
    ['HS 코드', offer.hsCode, offer.hsCode === request.hsCode],
    ['운송방식', offer.transport, (offer.transport === 'SEA') === (request.transport === '해상')],
    ['출발지', offer.departure, offer.departure.includes(request.departure.replace('항', '').replace('공항', ''))],
    ['도착지', offer.destination, null],
    ['정기노선', ox(offer.regularRoute), null],
    ['직항', ox(offer.directRoute), null],
    ['리드타임', `${offer.leadTime}일`, null],
    ['가용 일정', offer.availableDate, null],
    ['가용 물량', `${offer.availableCapacity}t`, offer.availableCapacity >= request.volume],
    ['냉장/냉동 취급', ox(offer.refrigeration), offer.refrigeration === request.refrigeration],
    ['위험물 취급', ox(offer.hazmat), offer.hazmat === request.hazmat],
    ['중량물 취급', ox(offer.heavy), null],
    ['취급 경험', `${offer.experience}회`, null],
  ];

  return (
    <div className="match-detail">
      {/* 매칭 분석 요소 */}
      <div>
        <p className="match-detail__title">매칭 분석 요소</p>
        <div className="match-detail__factors">
          {match.matchFactors.map((f, i) => (
            <span key={i} className="factor-chip factor-chip--large">✓ {f}</span>
          ))}
        </div>
      </div>

      {/* 세부 점수 */}
      <div>
        <p className="match-detail__title">매칭 세부 점수</p>
        <div className="score-grid">
          {scores.map((item) => (
            <div key={item.label} className="score-item">
              <p className="score-item__label">{item.label}</p>
              <p className="score-item__value">
                {item.score}
                <span className="score-item__max">{' '}/ {item.max}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 요청 vs 제공 비교 */}
      <div>
        <p className="match-detail__title">요청 vs 제공 비교</p>
        <div className="compare-grid">
          {/* 화주 요청 */}
          <div className="compare-panel compare-panel--shipper">
            <p className="compare-panel__title">화주 요청 정보</p>
            <p className="compare-panel__company">{match.shipper.companyName}</p>
            <p className="compare-panel__contact">{match.shipper.contactName} · {match.shipper.phone}</p>
            <div className="compare-panel__rows">
              {requestRows.map(([k, v]) => (
                <div key={k} className="compare-row">
                  <span className="compare-row__key">{k}</span>
                  <span className="compare-row__value">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 물류업체 제공 */}
          <div className="compare-panel compare-panel--logistics">
            <p className="compare-panel__title">물류업체 제공 정보</p>
            <p className="compare-panel__company">{match.logistics.companyName}</p>
            <p className="compare-panel__contact">{match.logistics.contactName} · {match.logistics.phone}</p>
            <div className="compare-panel__rows">
              {offerRows.map(([k, v, matched]) => (
                <div key={k} className="compare-row">
                  <span className="compare-row__key">{k}</span>
                  <div className="compare-row__right">
                    <span className="compare-row__value">{v}</span>
                    {matched !== null && matched !== undefined && <MatchBadge match={matched} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 검토 대기: 관리자 승인 / 반려 */}
      {match.adminStatus === 'pending' && (
        <div className="review-section review-actions">
          <p className="review-actions__hint">관리자 검토 결과를 선택하세요</p>
          <button onClick={onApprove} className="approve-btn">매칭 승인 → 알림 발송</button>
          <button onClick={onAdminReject} className="reject-btn">반려</button>
        </div>
      )}

      {/* 승인됨: 알림 발송 안내 + 쌍방 수락 현황 */}
      {match.adminStatus === 'approved' && (
        <div className="review-section review-section--stack">
          <div className="notice-sent">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.5" stroke="#1a9e5c" />
              <path d="M4 8l3 3 5-6" stroke="#1a9e5c" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="notice-sent__text">
              <span className="notice-sent__strong">매칭 알림 발송 완료</span>
              <span className="notice-sent__sub">회사명 · 담당자 · 사업자번호 · 연락처 · 주소 · 매칭 노선 정보 전달됨</span>
            </div>
          </div>
          <PartyResponses match={match} onAccept={onPartyAccept} onReject={onPartyReject} />
        </div>
      )}

      {/* 관리자 반려 */}
      {match.adminStatus === 'rejected' && (
        <div className="review-section">
          <div className="admin-rejected">
            <p>관리자 반려 · 사유: {match.adminRejectReason || '미기재'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
