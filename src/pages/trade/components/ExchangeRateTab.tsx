import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axisTick, tooltipBoxStyle } from '../../../styles/chartTheme';
import { ALL_CURRENCIES, CURRENCY_INFO, MAIN_CURRENCIES, MONTHS, YEARS } from '../tradeData';
import { getRatesForYear, type RateTable } from '../useExchangeRates';
import TradeTrendChart from './TradeTrendChart';

const CHART_FONT = 'Plus Jakarta Sans, sans-serif';

interface ExchangeRateTabProps {
  rates: RateTable;            // 통화별 월 평균 환율 (부모가 한 번 불러서 내려줌)
  ratesLoading: boolean;
  ratesError: string;
  activeCurrency: string;
  onCurrencyChange: (currency: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

// 환율을 화면 글자로 (1452.374 → '1,452.37' , 0.0861 → '0.0861')
function formatRate(value: number) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: value < 10 ? 4 : 2 });
}

// 주요 통화 카드 1개 — 보기 전용 (고른 연도의 마지막 달 환율 + 전월 대비)
function CurrencyCard({ currency, rates }: { currency: string; rates: (number | null)[] }) {
  const info = CURRENCY_INFO[currency];

  // 값이 있는 마지막 달 찾기 (2026년처럼 연도 중간까지만 있으면 그 달)
  let last = -1;
  for (let i = 0; i < rates.length; i++) {
    if (rates[i] !== null) last = i;
  }
  const current = last >= 0 ? rates[last] : null;
  const prev = last >= 1 ? rates[last - 1] : null;
  // 전월 대비 변화율(%) — 전월 값이 없으면 null
  const change = current !== null && prev ? ((current - prev) / prev) * 100 : null;

  let changeClass = 'currency-card__change';
  if (change !== null && change > 0) changeClass += ' is-up';

  return (
    <div className="currency-card">
      <div className="currency-card__head">
        <span className="currency-card__code">{currency}</span>
        <span className="currency-card__name">{info?.name}</span>
        {change !== null && (
          <span className={changeClass}>
            {change > 0 ? '▲' : change < 0 ? '▼' : ''} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
      <p className="currency-card__rate">{current !== null ? formatRate(current) : '—'}</p>
      <p className="currency-card__unit">
        {info?.unit}{last >= 0 ? ` · ${last + 1}월 평균` : ' · 데이터 없음'}
      </p>
    </div>
  );
}

// "환율 동향 & 실거래가" 탭
// - 위 : 주요 통화 4개 카드 (보기 전용)
// - 가운데 : 연도 선택 + 통화 버튼 (환율 CSV 의 모든 통화)
// - 아래 반반 : 왼쪽 월별 수출입 추이 , 오른쪽 고른 통화의 월별 환율 추이 (둘 다 고른 연도)
// 고른 통화/연도는 부모(TradeAnalysis)가 보관 → 탭을 바꿔도 유지
export default function ExchangeRateTab({
  rates, ratesLoading, ratesError, activeCurrency, onCurrencyChange, selectedYear, onYearChange,
}: ExchangeRateTabProps) {
  const yearRates = getRatesForYear(rates, activeCurrency, selectedYear);
  // 그래프용 데이터 [{ month: '1월', rate: 1180.5 }, ...] (값이 없는 달은 null → 선이 끊김)
  const rateChartData = MONTHS.map((month, i) => ({ month, rate: yearRates[i] }));
  const hasRate = yearRates.some((rate) => rate !== null);
  const unit = CURRENCY_INFO[activeCurrency]?.unit ?? `원/${activeCurrency}`;

  return (
    <div>
      {/* 주요 4개국 통화 카드 (보기 전용) */}
      <div className="currency-grid">
        {MAIN_CURRENCIES.map((c) => (
          <CurrencyCard key={c} currency={c} rates={getRatesForYear(rates, c, selectedYear)} />
        ))}
      </div>

      {/* 연도 + 통화 버튼 */}
      <div className="rate-controls">
        <div className="year-picker">
          <label>연도</label>
          {/* select 의 값은 항상 글자라서 Number() 로 숫자로 바꿔서 전달 */}
          <select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>

        <div className="currency-chips">
          {ALL_CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => onCurrencyChange(c)}
              title={CURRENCY_INFO[c]?.name}
              className={activeCurrency === c ? 'currency-chip is-active' : 'currency-chip'}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {ratesError && <p className="rate-message is-error">{ratesError}</p>}

      {/* 반반 : 왼쪽 수출입 추이 , 오른쪽 환율 추이 */}
      <div className="trade-chart-grid">
        <div className="trade-chart-card">
          <TradeTrendChart year={selectedYear} />
        </div>

        <div className="trade-chart-card">
          <div className="trend-section">
            <div className="trend-section__head">
              <div>
                <p className="eyebrow">Exchange Rate</p>
                <h2 className="trend-section__title">
                  {activeCurrency} 환율 추이 ({selectedYear})
                </h2>
                <p className="trend-section__unit">
                  {CURRENCY_INFO[activeCurrency]?.name ?? activeCurrency} · 단위: {unit} · 월 평균 매매기준율
                </p>
              </div>
            </div>

            <div className="trend-section__accent" />

            {/* 불러오는 중 / 데이터 없음 안내 */}
            {(ratesLoading || !hasRate) && (
              <p className="rate-chart__empty">
                {ratesLoading && '환율 데이터를 불러오는 중입니다...'}
                {!ratesLoading && ratesError && '환율 데이터를 불러오지 못했습니다.'}
                {!ratesLoading && !ratesError && `${selectedYear}년 ${activeCurrency} 환율 데이터가 없습니다.`}
              </p>
            )}

            {/* Recharts 선 그래프 : data 배열의 month 를 x축, rate 를 선으로 그림 */}
            {!ratesLoading && hasRate && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rateChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,50,220,0.07)" vertical={false} />
                  <XAxis dataKey="month" tick={axisTick(11, CHART_FONT)} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={axisTick(11, CHART_FONT)}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                    domain={['auto', 'auto']}
                    tickFormatter={(val: number) => formatRate(val)}
                  />
                  <Tooltip
                    contentStyle={tooltipBoxStyle(12, 12, CHART_FONT)}
                    formatter={(val: any) => [typeof val === 'number' ? `${formatRate(val)} 원` : '—', activeCurrency]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name={activeCurrency}
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 3, fill: '#06b6d4' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
