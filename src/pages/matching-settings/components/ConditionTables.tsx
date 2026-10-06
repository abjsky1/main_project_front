import type { ReactNode } from 'react';
import type { LogisticsCondition, ShipperCondition, TradeType } from '../matchingTypes';

// O(초록) / X(빨강) 표시
const BoolMark = ({ value }: { value: boolean }) =>
  value ? <span className="bool-mark--yes">O</span> : <span className="bool-mark--no">X</span>;

const TradeTypeBadge = ({ type }: { type: TradeType }) => (
  <span className={type === '수출' ? 'trade-type-badge is-export' : 'trade-type-badge'}>{type}</span>
);

// 표 카드 틀 (제목 + 가로 스크롤 표)
// children : <ConditionTableCard> 여는 태그와 닫는 태그 사이에 넣은 내용 (여기서는 표의 <tr> 줄들)
function ConditionTableCard({ count, headers, children }: { count: number; headers: string[]; children: ReactNode }) {
  return (
    <div className="condition-table-card">
      <div className="condition-table-card__head">
        <p>등록된 매칭 조건 ({count}건)</p>
      </div>
      <div className="condition-table-card__scroll">
        <table className="condition-table">
          <thead>
            <tr>
              {headers.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

// [TS] TableProps<T> : T 자리에 넣는 타입에 따라 rows 의 모양이 정해짐 (가이드 2-5)
//      TableProps<ShipperCondition> → rows 는 수출입기업 조건 배열
interface TableProps<T> {
  rows: T[];
  deleteDisabled: boolean;
  onDelete: (id: number) => void;
}

// 수출입기업 등록 조건 표
export function ShipperConditionTable({ rows, deleteDisabled, onDelete }: TableProps<ShipperCondition>) {
  return (
    <ConditionTableCard count={rows.length} headers={['타겟국가','HS코드','구분','운송','출발지','도착지','물량(t)','일정','화물','냉동','위험','중량','특수','']}>
      {rows.map((row) => (
        <tr key={row.id}>
          {/* 국가는 앞의 2개만 쉼표로 이어서 보여주고, 더 있으면 +개수 */}
          <td>{row.countries.slice(0, 2).join(', ')}{row.countries.length > 2 ? ` +${row.countries.length - 2}` : ''}</td>
          <td className="cell-mono cell-muted">{row.hsCode}</td>
          <td><TradeTypeBadge type={row.tradeType} /></td>
          <td>{row.transport}</td>
          <td className="cell-route">{row.departure}</td>
          <td className="cell-route">{row.destination}</td>
          <td className="cell-mono">{row.volume}</td>
          <td className="cell-mono">{row.schedule}</td>
          <td>{row.cargoType}</td>
          <td><BoolMark value={row.refrigeration} /></td>
          <td><BoolMark value={row.hazmat} /></td>
          <td><BoolMark value={row.heavy} /></td>
          <td><BoolMark value={row.special} /></td>
          <td><button disabled={deleteDisabled} onClick={() => onDelete(row.id)} className="condition-delete-btn">삭제</button></td>
        </tr>
      ))}
    </ConditionTableCard>
  );
}

// 물류업체 등록 조건 표
export function LogisticsConditionTable({ rows, deleteDisabled, onDelete }: TableProps<LogisticsCondition>) {
  return (
    <ConditionTableCard count={rows.length} headers={['타겟국가','구분','운송','출발','도착','리드타임','운송가능일','물량(t)','정기','직항','일반','냉동','위험','중량','특수','HS코드','경험','']}>
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{row.countries.slice(0, 1).join(', ')}{row.countries.length > 1 ? ` +${row.countries.length - 1}` : ''}</td>
          <td><TradeTypeBadge type={row.tradeType} /></td>
          <td className="cell-transport">{row.transport}</td>
          <td className="cell-route">{row.departure}</td>
          <td className="cell-route">{row.destination}</td>
          <td className="cell-mono">{row.leadTime}일</td>
          <td className="cell-mono">{row.availableDate}</td>
          <td className="cell-mono">{row.availableCapacity}</td>
          <td><BoolMark value={row.regularRoute} /></td>
          <td><BoolMark value={row.directRoute} /></td>
          <td><BoolMark value={row.general} /></td>
          <td><BoolMark value={row.refrigeration} /></td>
          <td><BoolMark value={row.hazmat} /></td>
          <td><BoolMark value={row.heavy} /></td>
          <td><BoolMark value={row.special} /></td>
          <td className="cell-mono cell-muted">{row.hsCode}</td>
          <td>{row.experience}회</td>
          <td><button disabled={deleteDisabled} onClick={() => onDelete(row.id)} className="condition-delete-btn">삭제</button></td>
        </tr>
      ))}
    </ConditionTableCard>
  );
}
