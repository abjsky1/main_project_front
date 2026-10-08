import { getStage, type MyMatchItem } from '../myMatchingData';
import ScoreBar from './ScoreBar';
import StageBadge from './StageBadge';

interface LogisticsRequestListProps {
  matches: MyMatchItem[];              // 로그인한 운송사가 받은 요청만 (부모가 걸러서 넘겨줌)
  onDetail: (matchId: number) => void; // [상세보기] → 상세 페이지로 이동
}

// 운송사용 "내 매칭" 목록 : 화주가 보낸 매칭 요청 (답해야 하는 요청이 위로)
export default function LogisticsRequestList({ matches, onDetail }: LogisticsRequestListProps) {
  // 응답이 필요한 요청(requested)을 먼저 , 나머지는 원래 순서대로
  const needResponse = matches.filter((m) => getStage(m) === 'requested');
  const others = matches.filter((m) => getStage(m) !== 'requested');
  const sorted = [...needResponse, ...others];

  return (
    <section className="mm-condition">
      <div className="mm-condition__head">
        <div>
          <p className="eyebrow">받은 매칭 요청</p>
          <p className="mm-condition__route">화주가 보낸 요청 {matches.length}건</p>
          <p className="mm-condition__meta">수락하면 관리자 최종 확인으로 넘어가고, 관리자가 승인하면 매칭이 완료됩니다.</p>
        </div>
        {needResponse.length > 0 && <span className="mm-condition__count is-action">응답 필요 {needResponse.length}건</span>}
      </div>

      <div className="mm-table-wrap">
        <table className="mm-table">
          <thead>
            <tr>
              {['화주 업체명', '매칭 적합도', '운송방식', '출발지 → 도착지', '물량 · 희망 일정', '진행 상태', ''].map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.id}>
                <td className="mm-table__company">{m.shipper.companyName}</td>
                <td><ScoreBar score={m.totalScore} /></td>
                <td>{m.request.transport}</td>
                <td>{m.request.departure} → {m.request.destination}</td>
                <td>{m.request.volume}t · {m.request.schedule}</td>
                <td><StageBadge stage={getStage(m)} viewer="logistics" /></td>
                <td><button onClick={() => onDetail(m.id)} className="mm-detail-btn">상세보기</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
