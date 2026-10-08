import { getStage, type MyMatchItem } from '../myMatchingData';
import ScoreBar from './ScoreBar';
import StageBadge from './StageBadge';

interface ShipperMatchTableProps {
  matches: MyMatchItem[];              // 고른 화물 조건의 추천 운송사 (점수 높은 순)
  onDetail: (matchId: number) => void; // [상세보기] → 상세 페이지로 이동
}

// 화주용 오른쪽 표 : 고른 화물 조건의 추천 운송사 순위
// (운송방식 · 출발지 → 도착지는 왼쪽 조건 목록에 있으니 표에서는 뺌)
export default function ShipperMatchTable({ matches, onDetail }: ShipperMatchTableProps) {
  return (
    <table className="mm-table mb-table">
      <thead>
        <tr>
          {['순위', '매칭 업체명', '매칭 적합도', '진행 상태', ''].map((h) => <th key={h}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {matches.map((m, index) => (
          <tr key={m.id}>
            <td className="mm-table__rank">{index + 1}</td>
            <td className="mm-table__company">{m.logistics.companyName}</td>
            <td><ScoreBar score={m.totalScore} /></td>
            <td><StageBadge stage={getStage(m)} viewer="shipper" /></td>
            <td className="mb-table__action"><button onClick={() => onDetail(m.id)} className="mm-detail-btn">상세보기</button></td>
          </tr>
        ))}
        {matches.length === 0 && (
          <tr><td colSpan={5} className="mb-table__empty">아직 추천된 운송사가 없습니다.</td></tr>
        )}
      </tbody>
    </table>
  );
}
