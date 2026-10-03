import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { axisTick } from '../../../styles/chartTheme';
import { MONTHLY_TRADE } from '../dashboardData';

// 그래프에 마우스를 올렸을 때 뜨는 말풍선
const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="chart-tooltip__row" style={{ color: entry.color }}>
          {entry.name}: {entry.value}억 달러
        </p>
      ))}
    </div>
  );
};

// 월별 수출입 추이 (막대: 수출/수입, 선: 무역수지)
export default function TradeTrendChart() {
  return (
    <div className="trend-section">
      <div className="trend-section__head">
        <div>
          <p className="eyebrow">Trade Trend</p>
          <h2 className="trend-section__title">수출입 추이 (2026)</h2>
          <p className="trend-section__unit">단위: 억 달러</p>
        </div>
        <div className="chart-legend">
          <span className="chart-legend__item">
            <span className="legend-box legend-box--export" />
            수출
          </span>
          <span className="chart-legend__item">
            <span className="legend-box legend-box--import" />
            수입
          </span>
          <span className="chart-legend__item">
            <span className="legend-line legend-line--balance" />
            무역수지
          </span>
        </div>
      </div>

      <div className="trend-section__accent" />

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={MONTHLY_TRADE} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,50,220,0.07)" vertical={false} />
          <XAxis dataKey="month" tick={axisTick(11)} axisLine={false} tickLine={false} />
          <YAxis yAxisId="bar" tick={axisTick(11)} axisLine={false} tickLine={false} domain={[0, 800]} />
          <YAxis yAxisId="line" orientation="right" tick={axisTick(11)} axisLine={false} tickLine={false} domain={[0, 150]} />
          <Tooltip content={<TrendTooltip />} />
          <Bar yAxisId="bar" dataKey="export" name="수출" fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.9} />
          <Bar yAxisId="bar" dataKey="import" name="수입" fill="#d1d5e8" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Line yAxisId="line" type="monotone" dataKey="balance" name="무역수지" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="trend-section__separator" />
    </div>
  );
}
