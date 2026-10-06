import type { MatchItem } from '../matchTypes';
import PartyResponses from './PartyResponses';

// 일치(✓) / 부분 일치(⚠) 표시 — match 가 null 이면 '–'
function MatchBadge({ match }: { match: boolean | null }) {
  if (match === null) return <span className="compare-row__key">–</span>;
  if (match) return <span className="match-badge match-badge--yes">✓ 일치</span>;
  return <span className="match-badge match-badge--partial">⚠ 부분</span>;
}

// true → 'O' , false → 'X'
const ox = (v: boolean) => (v ? 'O' : 'X');

interface MatchDetailProps {
  match: MatchItem;
  onApprove: () => void;
  onAdminReject: () => void;                 // 관리자 반려 모달 열기

}

// 매칭 카드를 펼쳤을 때 보이는 상세 내용
export default function MatchDetail({ match, onApprove, onAdminReject }: MatchDetailProps) {
  // 객체 구조분해 : match.request, match.offer 를 짧게 request, offer 로 꺼내 쓰기
  const { request, offer } = match;

  // 세부 점수 5칸 (점수 / 만점)
  const scores = [
    { label: '노선', score: match.routeScore, max: 30 },
    { label: '가용 물량', score: match.capacityScore, max: 25 },
    { label: 'HS코드', score: match.itemScore, max: 20 },
    { label: '일정', score: match.scheduleScore, max: 15 },
    { label: '경험', score: match.experienceScore, max: 10 },
  ];

  // 왼쪽 "화주 요청 정보" 표의 줄들 { 항목 이름, 값 }
  const requestRows: { label: string; value: string }[] = [
    { label: '타겟 국가', value: request.country },
    { label: 'HS 코드', value: request.hsCode },
    { label: '구분', value: request.tradeType },
    { label: '운송방식', value: request.transport },
    { label: '출발지', value: request.departure },
    { label: '도착지', value: request.destination },
    { label: '물량', value: `${request.volume}t` },
    { label: '희망 일정', value: request.schedule },
    { label: '화물 조건', value: request.cargoType },
    { label: '냉장/냉동', value: ox(request.refrigeration) },
    { label: '위험물', value: ox(request.hazmat) },
    { label: '중량물', value: ox(request.heavy) },
    { label: '특수화물', value: ox(request.special) },
  ];

  // 오른쪽 "물류업체 제공 정보" 표의 줄들 { 항목 이름, 값, 요청과 일치 여부 }
  // matched 가 null 이면 일치 배지를 표시하지 않음
  const offerRows: { label: string; value: string; matched: boolean | null }[] = [
    { label: '서비스 국가', value: offer.country, matched: offer.country === request.country },
    { label: 'HS 코드', value: offer.hsCode, matched: offer.hsCode === request.hsCode },
    // 물류는 'SEA'/'AIR', 화주는 '해상'/'항공' 으로 표기가 달라서 "둘 다 해상인지"를 비교
    { label: '운송방식', value: offer.transport, matched: (offer.transport === 'SEA') === (request.transport === '해상') },
    // 화주 출발지 이름에서 '항' 글자를 빼고, 그 글자가 물류 출발지 이름에 들어 있는지 비교
    // (예: '부산항' → '부산' , 물류 출발지 '부산신항' 에 '부산' 이 들어 있으면 일치)
    { label: '출발지', value: offer.departure, matched: offer.departure.includes(request.departure.replace('항', '').replace('공항', '')) },
    { label: '도착지', value: offer.destination, matched: null },
    { label: '정기노선', value: ox(offer.regularRoute), matched: null },
    { label: '직항', value: ox(offer.directRoute), matched: null },
    { label: '리드타임', value: `${offer.leadTime}일`, matched: null },
    { label: '가용 일정', value: offer.availableDate, matched: null },
    { label: '가용 물량', value: `${offer.availableCapacity}t`, matched: offer.availableCapacity >= request.volume },
    { label: '냉장/냉동 취급', value: ox(offer.refrigeration), matched: offer.refrigeration === request.refrigeration },
    { label: '위험물 취급', value: ox(offer.hazmat), matched: offer.hazmat === request.hazmat },
    { label: '중량물 취급', value: ox(offer.heavy), matched: null },
    { label: '취급 경험', value: `${offer.experience}회`, matched: null },
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
              {requestRows.map((row) => (
                <div key={row.label} className="compare-row">
                  <span className="compare-row__key">{row.label}</span>
                  <span className="compare-row__value">{row.value}</span>
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
              {offerRows.map((row) => (
                <div key={row.label} className="compare-row">
                  <span className="compare-row__key">{row.label}</span>
                  <div className="compare-row__right">
                    <span className="compare-row__value">{row.value}</span>
                    {row.matched !== null && row.matched !== undefined && <MatchBadge match={row.matched} />}
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
          <PartyResponses match={match} />
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
