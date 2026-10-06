import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axisTick, tooltipBoxStyle } from '../../../styles/chartTheme';
import { CURRENCY_INFO, EXTRA_CURRENCIES, MAIN_CURRENCIES, MONTHS, YEARS, getRatesForYear } from '../tradeData';

const CHART_FONT = 'Plus Jakarta Sans, sans-serif';

interface ExchangeRateTabProps {
  activeCurrency: string;
  onCurrencyChange: (currency: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

// 주요 통화 카드 1개 (12월 환율 + 전월 대비)
// [TS] props 타입을 interface 대신 { ... } 로 바로 적은 것 (모양은 같음)
function CurrencyCard({ currency, year, active, onClick }: { currency: string; year: number; active: boolean; onClick: () => void }) {
  const info = CURRENCY_INFO[currency];
  const rates = getRatesForYear(currency, year);
  // 현재 = 12월(인덱스 11) 값 → 없으면 마지막 값 → 그것도 없으면 0
  const current = rates[11] ?? rates[rates.length - 1] ?? 0;
  // 전월 = 11월(인덱스 10) 값 → 없으면 현재 값
  const prev = rates[10] ?? current;
  // 전월 대비 변화율(%) 소수점 2자리 글자 (prev 가 0 이면 나눌 수 없으니 '0.00')
  const change = prev ? ((current - prev) / prev * 100).toFixed(2) : '0.00';
  const isUp = current >= prev;

  return (
    <button onClick={onClick} className={active ? 'currency-card is-active' : 'currency-card'}>
      <div className="currency-card__head">
        <span className="currency-card__code">{currency}</span>
        <span className={isUp ? 'currency-card__change is-up' : 'currency-card__change'}>
          {isUp ? '▲' : '▼'} {Math.abs(Number(change))}%
        </span>
      </div>
      <p className="currency-card__rate">{current.toLocaleString()}</p>
      <p className="currency-card__unit">{info.unit}</p>
    </button>
  );
}

// "환율 동향 & 실거래가" 탭
// 고른 통화/연도는 부모(TradeAnalysis)가 보관 → 탭을 바꿔도 유지
export default function ExchangeRateTab({ activeCurrency, onCurrencyChange, selectedYear, onYearChange }: ExchangeRateTabProps) {
  const yearRates = getRatesForYear(activeCurrency, selectedYear);
  // 그래프용 데이터 [{ month: '1월', rate: 1180.5 }, ...] (값이 없는 달은 0)
  const rateChartData = MONTHS.map((month, i) => ({ month, rate: yearRates[i] ?? 0 }));
  const unit = CURRENCY_INFO[activeCurrency]?.unit ?? `원/${activeCurrency}`;

  return (
    <div>
      {/* 연도 선택 */}
      <div className="year-picker">
        <label>연도</label>
        {/* select 의 값은 항상 글자라서 Number() 로 숫자로 바꿔서 전달 */}
        <select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))}>
          {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {/* 주요 4개국 통화 카드 */}
      <div className="currency-grid">
        {MAIN_CURRENCIES.map((c) => (
          <CurrencyCard key={c} currency={c} year={selectedYear} active={activeCurrency === c} onClick={() => onCurrencyChange(c)} />
        ))}
      </div>

      {/* 기타 통화 버튼 */}
      <div className="currency-chips">
        {EXTRA_CURRENCIES.map((c) => (
          <button key={c} onClick={() => onCurrencyChange(c)} className={activeCurrency === c ? 'currency-chip is-active' : 'currency-chip'}>
            {c}
          </button>
        ))}
      </div>

      {/* 환율 그래프 */}
      <div className="rate-chart">
        <div className="rate-chart__head">
          <p className="rate-chart__title">{activeCurrency} · {selectedYear}년 월별 환율 추이</p>
        </div>
        <p className="rate-chart__unit">{unit}</p>
        <div className="rate-chart__accent" />
        {/* Recharts 선 그래프 : data 배열의 month 를 x축, rate 를 선으로 그림 */}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rateChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f8" />
            <XAxis dataKey="month" tick={axisTick(11, CHART_FONT)} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick(11, CHART_FONT)} axisLine={false} tickLine={false} width={65} />
            <Tooltip contentStyle={tooltipBoxStyle(12, 12, CHART_FONT)} formatter={(val: any) => [`${val?.toLocaleString()} 원`, activeCurrency]} />
            <Line type="monotone" dataKey="rate" name={activeCurrency} stroke="#9333ea" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 월 평균 환율 */}
      <div className="monthly-rates">
        <p className="monthly-rates__title">
          {activeCurrency} — {CURRENCY_INFO[activeCurrency]?.name ?? activeCurrency} · {selectedYear}년 월 평균
        </p>
        <div className="monthly-rates__grid">
          {MONTHS.map((m, i) => (
            <div key={m} className="monthly-rates__cell">
              <p className="monthly-rates__month">{m}</p>
              <p className="monthly-rates__value">{yearRates[i]?.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
