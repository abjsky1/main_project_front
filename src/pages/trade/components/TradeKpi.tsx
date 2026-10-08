import { useEffect, useState } from 'react';
import axios from 'axios';
import { YEARS, type KpiStat } from '../tradeData';
import StatCard from './StatCard';

// Spring TradestatusDto 응답 구조 (GET /api/cumulative/trade?year=2026)
interface TradestatusResponse {
  year: number;
  throughMonth: number;      // 몇 월까지 더한 값인지 (예: 8 → 1~8월 누적)

  expDlr: number;
  impDlr: number;
  balPayments: number;

  expDlrRate: number | null;
  impDlrRate: number | null;
  balPaymentsRate: number | null;
}

// Spring Service에서 이미 억 달러로 변환해서 반환
const AMOUNT_UNIT = '억 달러';

// 6932.34 → '6,932.3' (천 단위 쉼표 + 소수점 최대 1자리)
function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

interface TradeKpiProps {
  year: number;                         // 고른 연도 (부모가 보관 → 탭을 바꿔도 유지)
  onYearChange: (year: number) => void;
}

// 누적 무역 현황 (총 수출액 · 총 수입액 · 무역 수지) — 무역 데이터 분석 탭 줄 오른쪽
// 예전 첫 화면(무역 현황)에 있던 카드를 작게 옮김 + 연도 선택(2000~2026)
export default function TradeKpi({ year, onYearChange }: TradeKpiProps) {
  // 누적 무역 응답 (받기 전에는 null)
  const [trade, setTrade] = useState<TradestatusResponse | null>(null);

  // 연도가 바뀔 때마다 다시 조회
  useEffect(() => {
    // ignore : 응답이 오기 전에 화면을 떠나거나 연도가 바뀌면 true → 늦게 온 응답은 저장하지 않음 (가이드 3-4)
    let ignore = false;
    setTrade(null);

    async function fetchTrade() {
      try {
        const { data } = await axios.get<TradestatusResponse>('/api/cumulative/trade', { params: { year } });
        if (!ignore) setTrade(data);
      } catch (error) {
        if (!ignore) console.error('누적 무역 조회 실패:', error);
      }
    }

    fetchTrade();
    return () => { ignore = true; };
  }, [year]);

  // 응답을 받기 전에도 카드가 표시되도록 구성 — trade 가 없으면(로딩 중) '—' 표시
  const cards: KpiStat[] = [
    {
      label: '총 수출액',
      value: trade ? formatAmount(trade.expDlr) : '—',
      unit: AMOUNT_UNIT,
      change: trade?.expDlrRate ?? null,
      changeLabel: '전년 대비',
      accent: '#9333ea',
    },
    {
      label: '총 수입액',
      value: trade ? formatAmount(trade.impDlr) : '—',
      unit: AMOUNT_UNIT,
      change: trade?.impDlrRate ?? null,
      changeLabel: '전년 대비',
      accent: '#7c3aed',
    },
    {
      label: '무역 수지',
      value: trade ? (trade.balPayments > 0 ? '+' : '') + formatAmount(trade.balPayments) : '—',
      unit: AMOUNT_UNIT,
      change: trade?.balPaymentsRate ?? null,
      changeLabel: '전년 대비',
      accent: '#06b6d4',
    },
  ];

  return (
    <div className="trade-kpi">
      <div className="trade-kpi__head">
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="trade-kpi__year">
          {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <p className="eyebrow">
          누적 무역 현황{trade && trade.throughMonth < 12 ? ` (1~${trade.throughMonth}월)` : ''}
        </p>
      </div>

      <div className="trade-kpi__grid">
        {/* {...card} : card 객체의 칸들을 props 로 한 번에 넘김 (label={card.label} value={card.value} ... 와 같음) */}
        {cards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>
    </div>
  );
}
