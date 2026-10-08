import { getStage, type MyMatchItem } from '../myMatchingData';
import ScoreBar from './ScoreBar';
import StageBadge from './StageBadge';

interface ShipperMatchListProps {
  matches: MyMatchItem[];              // 로그인한 화주의 매칭만 (부모가 걸러서 넘겨줌)
  onDetail: (matchId: number) => void; // [상세보기] → 상세 페이지로 이동
}

// 화주용 "내 매칭" 목록 : 내 화물 조건마다 추천 운송사 표를 하나씩
export default function ShipperMatchList({ matches, onDetail }: ShipperMatchListProps) {
  // 화물 조건 번호 목록 (중복 없이 , 나온 순서대로)
  const conditionIds: number[] = [];
  for (const m of matches) {
    if (!conditionIds.includes(m.conditionId)) conditionIds.push(m.conditionId);
  }

  return (
    <div className="mm-groups">
      {conditionIds.map((conditionId) => {
        // 이 조건의 추천 운송사들 (점수 높은 순)
        // [...배열].sort : 복사본을 정렬 (원본 배열은 그대로)
        const group = [...matches.filter((m) => m.conditionId === conditionId)].sort((a, b) => b.totalScore - a.totalScore);
        const request = group[0].request;   // 같은 조건이라 화물 정보는 모두 같음

        return (
          <section key={conditionId} className="mm-condition">
            {/* 내 화물 조건 요약 */}
            <div className="mm-condition__head">
              <div>
                <p className="eyebrow">내 화물 조건 #{conditionId}</p>
                <p className="mm-condition__route">{request.departure} → {request.destination}</p>
                <p className="mm-condition__meta">
                  {request.tradeType} · {request.transport} · {request.country} · HS {request.hsCode} · {request.volume}t · 희망 {request.schedule}
                </p>
              </div>
              <span className="mm-condition__count">추천 운송사 {group.length}곳</span>
            </div>

            {/* 추천 운송사 표 */}
            <div className="mm-table-wrap">
              <table className="mm-table">
                <thead>
                  <tr>
                    {['순위', '매칭 업체명', '매칭 적합도', '운송방식', '출발지 → 도착지', '진행 상태', ''].map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {group.map((m, index) => (
                    <tr key={m.id}>
                      <td className="mm-table__rank">{index + 1}</td>
                      <td className="mm-table__company">{m.logistics.companyName}</td>
                      <td><ScoreBar score={m.totalScore} /></td>
                      <td>{m.offer.transport === 'SEA' ? '해상' : '항공'}</td>
                      <td>{m.offer.departure} → {m.offer.destination}</td>
                      <td><StageBadge stage={getStage(m)} viewer="shipper" /></td>
                      <td><button onClick={() => onDetail(m.id)} className="mm-detail-btn">상세보기</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
