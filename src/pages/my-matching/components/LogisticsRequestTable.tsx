import { getStage, type MyMatchItem } from '../myMatchingData';
import ScoreBar from './ScoreBar';
import StageBadge from './StageBadge';

interface LogisticsRequestTableProps {
  matches: MyMatchItem[];              // 고른 운송 조건으로 받은 요청 (응답 필요가 위로)
  onDetail: (matchId: number) => void; // [상세보기] → 상세 페이지로 이동
}

// 운송사용 오른쪽 표 : 고른 운송 조건으로 화주가 보낸 매칭 요청
// (운송방식 · 출발지 → 도착지는 왼쪽 조건 목록에 있으니 표에서는 뺌)
export default function LogisticsRequestTable({ matches, onDetail }: LogisticsRequestTableProps) {
  return (
    <table className="mm-table mb-table">
      <thead>
        <tr>
          {['화주 업체명', '매칭 적합도', '물량 · 희망 일정', '진행 상태', ''].map((h) => <th key={h}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id}>
            <td className="mm-table__company">{m.shipper.companyName}</td>
            <td><ScoreBar score={m.totalScore} /></td>
            <td>{m.request.volume}t · {m.request.schedule}</td>
            <td><StageBadge stage={getStage(m)} viewer="logistics" /></td>
            <td className="mb-table__action"><button onClick={() => onDetail(m.id)} className="mm-detail-btn">상세보기</button></td>
          </tr>
        ))}
        {matches.length === 0 && (
          <tr><td colSpan={5} className="mb-table__empty">이 조건으로 받은 매칭 요청이 아직 없습니다.</td></tr>
        )}
      </tbody>
    </table>
  );
}
