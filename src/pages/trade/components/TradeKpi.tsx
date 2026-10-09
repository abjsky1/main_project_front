import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { YEARS, type KpiStat } from '../tradeData';

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

// 전년 대비 증감률 → 배지 글자 + 색 클래스 (증가 ▲ 빨강 / 감소 ▼ 초록 / 0 / 비교 데이터 없음 —)
// toFixed(1) : 소수점 1자리 글자로 (52.9 → '52.9')
function changeBadge(change: number | null) {
  if (change === null) return { text: '—', className: 'kpi-strip__change' };
  if (change > 0) return { text: `▲ ${change.toFixed(1)}%`, className: 'kpi-strip__change is-up' };
  if (change < 0) return { text: `▼ ${Math.abs(change).toFixed(1)}%`, className: 'kpi-strip__change is-down' };
  return { text: '0.0%', className: 'kpi-strip__change' };
}

interface TradeKpiProps {
  year: number;                         // 고른 연도 (부모가 보관 → 탭을 바꿔도 유지)
  onYearChange: (year: number) => void;
}

// 누적 무역 현황 요약 띠 (조건 검색 탭 , 탭 바로 아래)
//  [연도 · 누적 기간] | 총 수출액 | 총 수입액 | 무역 수지   ← 얇은 한 줄
// 예전 첫 화면(무역 현황)의 카드 3개를 한 줄로 줄인 것 + 연도 선택(2000~2026)
export default function TradeKpi({ year, onYearChange }: TradeKpiProps) {
  // 누적 무역 응답 (받기 전에는 null)
  const [trade, setTrade] = useState<TradestatusResponse | null>(null);

  // 연도 목록이 열려 있는지 + 바깥 클릭 판단용 ref (matching-settings/CountrySelect 와 같은 방식)
  // 기본 <select> 는 목록 높이를 CSS 로 줄일 수 없어서 직접 만든 드롭다운 사용
  const [yearOpen, setYearOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement>(null);
  const yearMenuRef = useRef<HTMLUListElement>(null);

  // 바깥을 클릭하면 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 목록을 열면 고른 연도가 목록 가운데에 보이도록 스크롤 위치 맞추기
  useEffect(() => {
    const menu = yearMenuRef.current;
    if (!yearOpen || !menu) return;
    const selected = menu.querySelector<HTMLLIElement>('.is-selected');
    if (selected) menu.scrollTop = selected.offsetTop - (menu.clientHeight - selected.offsetHeight) / 2;
  }, [yearOpen]);

  const selectYear = (y: number) => {
    onYearChange(y);
    setYearOpen(false);
  };

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

  // 응답을 받기 전에도 칸이 표시되도록 구성 — trade 가 없으면(로딩 중) '—' 표시
  const items: KpiStat[] = [
    { label: '총 수출액', value: trade ? formatAmount(trade.expDlr) : '—', unit: AMOUNT_UNIT, change: trade?.expDlrRate ?? null },
    { label: '총 수입액', value: trade ? formatAmount(trade.impDlr) : '—', unit: AMOUNT_UNIT, change: trade?.impDlrRate ?? null },
    {
      label: '무역 수지',
      value: trade ? (trade.balPayments > 0 ? '+' : '') + formatAmount(trade.balPayments) : '—',
      unit: AMOUNT_UNIT,
      change: trade?.balPaymentsRate ?? null,
    },
  ];

  // 누적 기간 글자 : 12월까지면 '연간 누적' , 아니면 '1~8월 누적'
  let period = '누적';
  if (trade) period = trade.throughMonth >= 12 ? '연간 누적' : `1~${trade.throughMonth}월 누적`;

  return (
    <section className="kpi-strip" aria-label="누적 무역 현황">
      {/* 첫 칸 : 연도 선택 + 누적 기간 */}
      <div className="kpi-strip__period">
        <div ref={yearRef} className="kpi-strip__year">
          <button
            type="button"
            onClick={() => setYearOpen(!yearOpen)}
            onKeyDown={(e) => { if (e.key === 'Escape') setYearOpen(false); }}
            className="kpi-strip__year-trigger"
            aria-label="연도"
            aria-haspopup="listbox"
            aria-expanded={yearOpen}
          >
            {year}년
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={yearOpen ? 'kpi-strip__year-chevron is-open' : 'kpi-strip__year-chevron'}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* 연도 목록 : 몇 개만 보이고 나머지는 스크롤 */}
          {yearOpen && (
            <ul ref={yearMenuRef} className="kpi-strip__year-menu" role="listbox" aria-label="연도">
              {YEARS.map((y) => (
                <li
                  key={y}
                  role="option"
                  aria-selected={y === year}
                  onClick={() => selectYear(y)}
                  className={y === year ? 'kpi-strip__year-option is-selected' : 'kpi-strip__year-option'}
                >
                  {y}년
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="kpi-strip__period-text">{period} · 전년 대비</p>
      </div>

      {/* 나머지 3칸 : 총 수출액 · 총 수입액 · 무역 수지 */}
      {items.map((item) => {
        const badge = changeBadge(item.change);
        return (
          <div key={item.label} className="kpi-strip__item">
            <p className="kpi-strip__label">{item.label}</p>
            <p className="kpi-strip__value">
              {item.value}
              <span className="kpi-strip__unit">{item.unit}</span>
              <span className={badge.className}>{badge.text}</span>
            </p>
          </div>
        );
      })}
    </section>
  );
}
