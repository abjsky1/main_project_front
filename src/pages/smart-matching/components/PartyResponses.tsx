import type { MatchItem, PartyResponse } from '../matchTypes';

const RESPONSE_LABEL: Record<PartyResponse, string> = { accepted: '수락', rejected: '거절', waiting: '대기 중' };

interface PartyResponsesProps {
  match: MatchItem;
  // onAccept: (party: PartyKey) => void;
  // onReject: (party: PartyKey) => void;   // 거절 사유 모달 열기
}

// 관리자 승인 후: 화주사 / 물류업체의 수락 현황
export default function PartyResponses({ match }: PartyResponsesProps) {
  return (
    <div>
      <p className="match-detail__title">쌍방 수락 현황</p>
      <div className="party-grid">
        {(['shipper', 'logistics'] as const).map((party) => {
          const p = match[party];
          const label = party === 'shipper' ? '화주사' : '물류업체';
          return (
            <div key={party} className="party-card">
              <div className="party-card__head">
                <span className="party-card__name">{label}: {p.companyName}</span>
                <span className={`response-badge response-badge--${p.response}`}>{RESPONSE_LABEL[p.response]}</span>
              </div>
              <p className="party-card__info">
                {p.contactName} · {p.phone}<br />{p.bizNumber}<br />{p.address}
              </p>
              {p.response === 'rejected' && p.rejectReason && (
                <p className="party-card__reason">거절 사유: {p.rejectReason}</p>
              )}
              {/* {p.response === 'waiting' && match.finalStatus === 'pending' && (
                <div className="party-card__actions">
                  <button onClick={() => onAccept(party)} className="party-accept-btn">수락</button>
                  <button onClick={() => onReject(party)} className="party-reject-btn">거절</button>
                </div>
              )} */}
            </div>
          );
        })}
      </div>

      {match.finalStatus === 'completed' && (
        <div className="final-result final-result--success">
          <p>🎉 매칭 최종 성사 — 감사 로그에 기록되었습니다</p>
        </div>
      )}
      {match.finalStatus === 'failed' && (
        <div className="final-result final-result--fail">
          <p>매칭 실패 — 거절 사유가 감사 로그에 기록되었습니다</p>
        </div>
      )}
    </div>
  );
}
